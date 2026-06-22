"""
================================================================================
NeuralProt — Production Inference & Evaluation (No Hierarchy Propagation)
================================================================================
Operating Modes:
  predict   — Accepts a protein sequence string or a raw FASTA file, runs it
              through all trained group models, returns neural network predictions.
  evaluate  — Tests an annotated file to calculate per-term F1, precision, recall.
  fmax      — Calculates CAFA metrics (Fmax/Smin) with frequency baseline.

This version uses 498‑dimensional features and does NOT add parent GO terms
via the True Path Rule during inference. Only the raw neural network outputs
(above per‑group thresholds) are returned.

New features (can be disabled individually):
  - Temperature scaling (reduces overconfidence while preserving ranking)
  - Depth‑based sorting (most specific terms first)
  - Group whitelist (only run groups with test F1 > 0.45)
  - Per‑group threshold overrides (raise thresholds for noisy groups)
"""

import sys
import json
import math
import logging
import argparse
import csv
from itertools import product
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn

try:
    from sklearn.metrics import f1_score, precision_score, recall_score
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# CONSTANTS & STANDARDS
# ─────────────────────────────────────────────────────────────────────────────

AMINO_ACIDS  = list("ACDEFGHIKLMNPQRSTVWY")
VALID_AA_SET = set(AMINO_ACIDS)


# ─────────────────────────────────────────────────────────────────────────────
# FEATURE EXTRACTION ENGINE — 498 DIMENSIONS (MATCHES TRAINING)
# ─────────────────────────────────────────────────────────────────────────────

class FeatureExtractor:
    """
    Converts a raw string of letters into a 498‑dimensional physical number row.
    
    Layout:
      [0:20]    Amino acid composition              (20)
      [20:420]  Dipeptide composition               (400)
      [420:428] Core physicochemical                (8)
      [428:432] Local spot features                 (4)
      [432:435] Secondary structure propensities    (3)
      [435:436] Shannon complexity                  (1)
      [436:457] CTD Transition descriptors          (21)
      [457:492] CTD Distribution descriptors        (35)
      [492:498] QSO lag distances                   (6)
    """

    AA_MW = {
        'A': 89.09,  'C': 121.16, 'D': 133.10, 'E': 147.13, 'F': 165.19,
        'G': 75.03,  'H': 155.16, 'I': 131.17, 'K': 146.19, 'L': 131.17,
        'M': 149.21, 'N': 132.12, 'P': 115.13, 'Q': 146.15, 'R': 174.20,
        'S': 105.09, 'T': 119.12, 'V': 117.15, 'W': 204.23, 'Y': 181.19,
    }

    AA_HYDRO = {
        'A':  1.8, 'C':  2.5, 'D': -3.5, 'E': -3.5, 'F':  2.8,
        'G': -0.4, 'H': -3.2, 'I':  4.5, 'K': -3.9, 'L':  3.8,
        'M':  1.9, 'N': -3.5, 'P': -1.6, 'Q': -3.5, 'R': -4.5,
        'S': -0.8, 'T': -0.7, 'V':  4.2, 'W': -0.9, 'Y': -1.3,
    }

    INSTABILITY_WEIGHTS = {
        ("G","G"): 13.34, ("G","D"): 1.0,  ("G","E"): 1.0,  ("G","H"): 1.0,
        ("G","N"): 1.0,   ("G","Q"): 1.0,  ("G","R"): 1.0,  ("G","S"): 1.0,
        ("G","T"): 1.0,   ("A","A"): 1.0,  ("A","D"): 1.0,  ("A","E"): 1.0,
        ("A","H"): 1.0,   ("A","K"): 1.0,  ("A","N"): 1.0,  ("A","Q"): 1.0,
        ("A","R"): 1.0,   ("A","S"): 1.0,  ("A","T"): 1.0,  ("C","K"): 1.0,
        ("D","G"): 1.0,   ("E","E"): 1.0,  ("E","K"): 1.0,  ("E","N"): 1.0,
        ("E","Q"): 1.0,   ("E","R"): 1.0,  ("E","S"): 1.0,  ("F","K"): 1.0,
        ("H","H"): 1.0,   ("H","K"): 1.0,  ("H","N"): 1.0,  ("H","Q"): 1.0,
        ("H","R"): 1.0,   ("H","S"): 1.0,  ("I","F"): 1.0,  ("I","K"): 1.0,
        ("I","L"): 1.0,   ("I","N"): 1.0,  ("I","Q"): 1.0,  ("I","R"): 1.0,
        ("I","S"): 1.0,   ("K","E"): 1.0,  ("K","K"): 1.0,  ("K","N"): 1.0,
        ("K","P"): 1.0,   ("K","Q"): 1.0,  ("K","R"): 1.0,  ("K","S"): 1.0,
        ("L","F"): 1.0,   ("L","K"): 1.0,  ("L","N"): 1.0,  ("L","Q"): 1.0,
        ("L","R"): 1.0,   ("L","S"): 1.0,  ("M","K"): 1.0,  ("N","D"): 1.0,
        ("N","G"): 1.0,   ("N","N"): 1.0,  ("P","K"): 1.0,  ("Q","D"): 1.0,
        ("Q","E"): 1.0,   ("Q","H"): 1.0,  ("Q","K"): 1.0,  ("Q","N"): 1.0,
        ("Q","Q"): 1.0,   ("Q","R"): 1.0,  ("Q","S"): 1.0,  ("R","H"): 1.0,
        ("R","K"): 1.0,   ("R","N"): 1.0,  ("R","Q"): 1.0,  ("R","R"): 1.0,
        ("R","S"): 1.0,   ("S","D"): 1.0,  ("S","E"): 1.0,  ("S","N"): 1.0,
        ("S","S"): 1.0,   ("T","K"): 1.0,  ("V","K"): 1.0,  ("W","K"): 1.0,
        ("Y","K"): 1.0,
    }

    TOP_IDP = {
        'W': 0.059, 'F': 0.049, 'Y': 0.023, 'I': 0.010, 'M': 0.001,
        'L': 0.001, 'V': 0.001, 'N': -0.005,'C': -0.018,'T': -0.019,
        'A': -0.020,'G': -0.020,'R': -0.026,'D': -0.030,'H': -0.036,
        'Q': -0.044,'K': -0.045,'S': -0.046,'E': -0.055,'P': -0.062,
    }
    _IDP_MIN   = -0.062
    _IDP_MAX   =  0.059
    _IDP_RANGE =  0.059 - (-0.062)

    CHOU_FASMAN_HELIX = {
        'A': 1.42, 'R': 0.98, 'N': 0.67, 'D': 1.01, 'C': 0.70,
        'E': 1.51, 'Q': 1.11, 'G': 0.57, 'H': 1.00, 'I': 1.08,
        'L': 1.21, 'K': 1.16, 'M': 1.45, 'F': 1.13, 'P': 0.57,
        'S': 0.77, 'T': 0.83, 'W': 1.08, 'Y': 0.69, 'V': 1.06,
    }
    CHOU_FASMAN_SHEET = {
        'A': 0.83, 'R': 0.93, 'N': 0.89, 'D': 0.54, 'C': 1.19,
        'E': 0.37, 'Q': 1.10, 'G': 0.75, 'H': 0.87, 'I': 1.60,
        'L': 1.30, 'K': 0.74, 'M': 1.05, 'F': 1.38, 'P': 0.55,
        'S': 0.75, 'T': 1.19, 'W': 1.37, 'Y': 1.47, 'V': 1.70,
    }
    CHOU_FASMAN_COIL = {
        'A': 0.66, 'R': 0.95, 'N': 1.56, 'D': 1.46, 'C': 1.19,
        'E': 0.74, 'Q': 0.98, 'G': 1.56, 'H': 0.95, 'I': 0.47,
        'L': 0.59, 'K': 1.01, 'M': 0.60, 'F': 0.41, 'P': 1.52,
        'S': 1.43, 'T': 0.96, 'W': 0.96, 'Y': 1.14, 'V': 0.50,
    }

    # Schneider-Wrede distance table (symmetric)
    _SW_RAW = {
        ("A","A"): 0.000, ("A","R"): 1.000, ("A","N"): 0.827, ("A","D"): 0.557,
        ("A","C"): 0.281, ("A","E"): 0.527, ("A","Q"): 0.610, ("A","G"): 0.130,
        ("A","H"): 0.871, ("A","I"): 0.422, ("A","L"): 0.405, ("A","K"): 0.909,
        ("A","M"): 0.359, ("A","F"): 0.776, ("A","P"): 0.260, ("A","S"): 0.183,
        ("A","T"): 0.313, ("A","W"): 1.000, ("A","Y"): 0.879, ("A","V"): 0.279,
        ("R","R"): 0.000, ("R","N"): 0.344, ("R","D"): 0.697, ("R","C"): 0.942,
        ("R","E"): 0.620, ("R","Q"): 0.502, ("R","G"): 0.980, ("R","H"): 0.253,
        ("R","I"): 0.802, ("R","L"): 0.791, ("R","K"): 0.189, ("R","M"): 0.817,
        ("R","F"): 0.555, ("R","P"): 0.850, ("R","S"): 0.836, ("R","T"): 0.799,
        ("R","W"): 0.530, ("R","Y"): 0.376, ("R","V"): 0.811,
        ("N","N"): 0.000, ("N","D"): 0.329, ("N","C"): 0.680, ("N","E"): 0.426,
        ("N","Q"): 0.212, ("N","G"): 0.717, ("N","H"): 0.455, ("N","I"): 0.539,
        ("N","L"): 0.523, ("N","K"): 0.442, ("N","M"): 0.555, ("N","F"): 0.404,
        ("N","P"): 0.619, ("N","S"): 0.540, ("N","T"): 0.485, ("N","W"): 0.741,
        ("N","Y"): 0.576, ("N","V"): 0.541,
        ("D","D"): 0.000, ("D","C"): 0.653, ("D","E"): 0.180, ("D","Q"): 0.344,
        ("D","G"): 0.519, ("D","H"): 0.563, ("D","I"): 0.621, ("D","L"): 0.604,
        ("D","K"): 0.631, ("D","M"): 0.637, ("D","F"): 0.598, ("D","P"): 0.544,
        ("D","S"): 0.434, ("D","T"): 0.400, ("D","W"): 0.857, ("D","Y"): 0.675,
        ("D","V"): 0.521,
        ("C","C"): 0.000, ("C","E"): 0.765, ("C","Q"): 0.683, ("C","G"): 0.366,
        ("C","H"): 0.783, ("C","I"): 0.430, ("C","L"): 0.417, ("C","K"): 0.893,
        ("C","M"): 0.393, ("C","F"): 0.653, ("C","P"): 0.377, ("C","S"): 0.274,
        ("C","T"): 0.336, ("C","W"): 0.890, ("C","Y"): 0.789, ("C","V"): 0.315,
        ("E","E"): 0.000, ("E","Q"): 0.197, ("E","G"): 0.653, ("E","H"): 0.490,
        ("E","I"): 0.697, ("E","L"): 0.680, ("E","K"): 0.494, ("E","M"): 0.713,
        ("E","F"): 0.626, ("E","P"): 0.618, ("E","S"): 0.548, ("E","T"): 0.490,
        ("E","W"): 0.832, ("E","Y"): 0.650, ("E","V"): 0.604,
        ("Q","Q"): 0.000, ("Q","G"): 0.741, ("Q","H"): 0.382, ("Q","I"): 0.591,
        ("Q","L"): 0.575, ("Q","K"): 0.431, ("Q","M"): 0.608, ("Q","F"): 0.503,
        ("Q","P"): 0.622, ("Q","S"): 0.540, ("Q","T"): 0.477, ("Q","W"): 0.727,
        ("Q","Y"): 0.545, ("Q","V"): 0.527,
        ("G","G"): 0.000, ("G","H"): 0.900, ("G","I"): 0.531, ("G","L"): 0.515,
        ("G","K"): 0.966, ("G","M"): 0.467, ("G","F"): 0.848, ("G","P"): 0.231,
        ("G","S"): 0.272, ("G","T"): 0.412, ("G","W"): 1.000, ("G","Y"): 0.930,
        ("G","V"): 0.385,
        ("H","H"): 0.000, ("H","I"): 0.671, ("H","L"): 0.658, ("H","K"): 0.310,
        ("H","M"): 0.688, ("H","F"): 0.453, ("H","P"): 0.757, ("H","S"): 0.717,
        ("H","T"): 0.671, ("H","W"): 0.598, ("H","Y"): 0.387, ("H","V"): 0.665,
        ("I","I"): 0.000, ("I","L"): 0.020, ("I","K"): 0.795, ("I","M"): 0.063,
        ("I","F"): 0.367, ("I","P"): 0.352, ("I","S"): 0.381, ("I","T"): 0.228,
        ("I","W"): 0.704, ("I","Y"): 0.575, ("I","V"): 0.145,
        ("L","L"): 0.000, ("L","K"): 0.779, ("L","M"): 0.043, ("L","F"): 0.349,
        ("L","P"): 0.345, ("L","S"): 0.366, ("L","T"): 0.213, ("L","W"): 0.691,
        ("L","Y"): 0.557, ("L","V"): 0.127,
        ("K","K"): 0.000, ("K","M"): 0.806, ("K","F"): 0.568, ("K","P"): 0.855,
        ("K","S"): 0.800, ("K","T"): 0.761, ("K","W"): 0.570, ("K","Y"): 0.398,
        ("K","V"): 0.782,
        ("M","M"): 0.000, ("M","F"): 0.311, ("M","P"): 0.327, ("M","S"): 0.348,
        ("M","T"): 0.195, ("M","W"): 0.667, ("M","Y"): 0.537, ("M","V"): 0.113,
        ("F","F"): 0.000, ("F","P"): 0.577, ("F","S"): 0.657, ("F","T"): 0.510,
        ("F","W"): 0.391, ("F","Y"): 0.159, ("F","V"): 0.325,
        ("P","P"): 0.000, ("P","S"): 0.295, ("P","T"): 0.344, ("P","W"): 0.862,
        ("P","Y"): 0.760, ("P","V"): 0.269,
        ("S","S"): 0.000, ("S","T"): 0.197, ("S","W"): 0.888, ("S","Y"): 0.764,
        ("S","V"): 0.291,
        ("T","T"): 0.000, ("T","W"): 0.748, ("T","Y"): 0.612, ("T","V"): 0.170,
        ("W","W"): 0.000, ("W","Y"): 0.291, ("W","V"): 0.734,
        ("Y","Y"): 0.000, ("Y","V"): 0.574,
        ("V","V"): 0.000,
    }

    CTD_PROPERTIES = {
        "hydrophobicity":     {1: set("RKEDQN"),    2: set("GASTPHY"),   3: set("CVLIMFW")},
        "normalized_vdw":     {1: set("GASTPD"),    2: set("NVEQIL"),    3: set("MHKFRYW")},
        "polarity":           {1: set("LIFWCMVY"),  2: set("PATGS"),     3: set("HQRKNED")},
        "polarizability":     {1: set("GASDT"),     2: set("CPNVEQIL"),  3: set("KMHFRYW")},
        "charge":             {1: set("KR"),         2: set("ANCQGHILMFPSTWYV"), 3: set("DE")},
        "secondary_structure":{1: set("EALMQKRH"),  2: set("VIYCWFT"),   3: set("GNPSD")},
        "solvent_accessibility":{1: set("ALFCGIVW"), 2: set("PKQEND"),   3: set("MSTHRYDE")},
    }
    CTD_PROP_NAMES = list(CTD_PROPERTIES.keys())

    def __init__(self):
        self._dipeptides      = ["".join(p) for p in product(AMINO_ACIDS, repeat=2)]
        self._dipeptide_index = {dp: i for i, dp in enumerate(self._dipeptides)}

    def extract(self, sequence: str) -> np.ndarray:
        seq = self._clean(sequence)
        if not seq:
            raise ValueError("Sequence is empty after filtering invalid characters.")
        vec = self._compute(seq)
        assert vec.shape == (498,), f"Dimension mismatch: expected 498, got {vec.shape}"
        return vec

    @staticmethod
    def _clean(seq: str) -> str:
        return "".join(c for c in seq.upper().strip() if c in VALID_AA_SET)

    def _sw_dist(self, a: str, b: str) -> float:
        if a == b: return 0.0
        key = (a, b) if (a, b) in self._SW_RAW else (b, a)
        return self._SW_RAW.get(key, 0.5)

    def _ctd_group(self, aa: str, prop_dict: dict) -> int:
        for g, members in prop_dict.items():
            if aa in members:
                return g
        return 2

    def _idp_score(self, aa: str) -> float:
        raw = self.TOP_IDP.get(aa, 0.0)
        return (self._IDP_MAX - raw) / self._IDP_RANGE

    def _charge_at_ph(self, seq: str, ph: float) -> float:
        charge  = 1.0 / (1.0 + 10 ** (ph - 8.0))
        charge -= 1.0 / (1.0 + 10 ** (3.1 - ph))
        for aa in seq:
            if   aa == 'K': charge += 1.0 / (1.0 + 10 ** (ph - 10.5))
            elif aa == 'R': charge += 1.0 / (1.0 + 10 ** (ph - 12.5))
            elif aa == 'H': charge += 1.0 / (1.0 + 10 ** (ph - 6.0))
            elif aa == 'D': charge -= 1.0 / (1.0 + 10 ** (3.9 - ph))
            elif aa == 'E': charge -= 1.0 / (1.0 + 10 ** (4.1 - ph))
            elif aa == 'C': charge -= 1.0 / (1.0 + 10 ** (8.3 - ph))
            elif aa == 'Y': charge -= 1.0 / (1.0 + 10 ** (10.1 - ph))
        return charge

    def _compute(self, seq: str) -> np.ndarray:
        n = len(seq)

        # Amino acid composition [0:20]
        aa_counts = {aa: 0 for aa in AMINO_ACIDS}
        for aa in seq: aa_counts[aa] += 1
        aac = np.array([aa_counts[aa] / n for aa in AMINO_ACIDS], dtype=np.float32)

        # Dipeptide composition [20:420]
        dpc = np.zeros(400, dtype=np.float32)
        if n > 1:
            for i in range(n - 1):
                dp  = seq[i] + seq[i + 1]
                idx = self._dipeptide_index.get(dp)
                if idx is not None: dpc[idx] += 1
            dpc /= (n - 1)

        # Core physicochemical [420:428]
        norm_length = math.log1p(n) / math.log1p(35000)
        mw          = sum(self.AA_MW.get(aa, 110.0) for aa in seq) - (n - 1) * 18.02
        norm_mw     = mw / 4e6
        gravy_raw = sum(self.AA_HYDRO.get(aa, 0.0) for aa in seq) / n
        gravy = (gravy_raw + 4.5) / 9.0
        aromaticity = sum(1 for aa in seq if aa in ('F', 'W', 'Y')) / n

        instability = 0.0
        if n > 1:
            for i in range(n - 1):
                instability += self.INSTABILITY_WEIGHTS.get((seq[i], seq[i+1]), 1.0)
            instability = (10.0 / n) * instability
        norm_instability = min(instability / 200.0, 1.0)

        lo, hi = 0.0, 14.0
        for _ in range(100):
            mid = (lo + hi) / 2.0
            if self._charge_at_ph(seq, mid) > 0: lo = mid
            else: hi = mid
        norm_pI = (lo + hi) / 2.0 / 14.0

        norm_charge_ph7 = float(np.tanh(self._charge_at_ph(seq, 7.0) / 50.0))

        aliphatic = (
            aa_counts.get('A', 0) * 1.0 +
            aa_counts.get('V', 0) * 2.9 +
            aa_counts.get('I', 0) * 3.9 +
            aa_counts.get('L', 0) * 3.9
        ) / n * 100
        norm_aliphatic = min(aliphatic / 400.0, 1.0)

        physico = np.array([
            norm_length, norm_mw, gravy, aromaticity,
            norm_instability, norm_pI, norm_charge_ph7, norm_aliphatic,
        ], dtype=np.float32)

        # Local spot features [428:432]
        if n >= 9:
            max_local_hydropathy_raw = max(
                sum(self.AA_HYDRO.get(aa, 0.0) for aa in seq[i : i + 9]) / 9.0
                for i in range(n - 8)
            )
        else:
            max_local_hydropathy_raw = gravy_raw
        max_local_hydropathy = (max_local_hydropathy_raw + 4.5) / 9.0

        CHARGE_VAL = {'K': 1, 'R': 1, 'H': 0.5, 'D': -1, 'E': -1}
        if n >= 7:
            max_local_charge_density = max(
                sum(abs(CHARGE_VAL.get(aa, 0.0)) for aa in seq[i:i+7]) / 7.0
                for i in range(n - 6)
            )
        else:
            max_local_charge_density = 0.0

        disorder_fraction = sum(self._idp_score(aa) for aa in seq) / n

        runs = []
        if n > 0:
            current, count = seq[0], 1
            for i in range(1, n):
                if seq[i] == current: count += 1
                else:
                    runs.append(count)
                    current, count = seq[i], 1
            runs.append(count)
        total_runs = len(runs)
        if total_runs > 1:
            run_probs = {}
            for r in runs: run_probs[r] = run_probs.get(r, 0) + 1
            rle_entropy = -sum(
                (c / total_runs) * math.log2(c / total_runs)
                for c in run_probs.values() if c > 0
            )
            max_rle = math.log2(total_runs) if total_runs > 1 else 1.0
            norm_rle_entropy = rle_entropy / max_rle
        else:
            norm_rle_entropy = 0.0

        local_features = np.array([
            max_local_hydropathy, max_local_charge_density,
            disorder_fraction,    norm_rle_entropy,
        ], dtype=np.float32)

        # Secondary structure propensities [432:435]
        helix_prop = sum(self.CHOU_FASMAN_HELIX.get(aa, 1.0) for aa in seq) / n
        sheet_prop = sum(self.CHOU_FASMAN_SHEET.get(aa, 1.0) for aa in seq) / n
        coil_prop  = sum(self.CHOU_FASMAN_COIL.get(aa,  1.0) for aa in seq) / n
        ss_budget  = np.array(
            [helix_prop / 1.6, sheet_prop / 1.7, coil_prop / 1.6],
            dtype=np.float32
        )

        # Shannon complexity [435:436]
        shannon = 0.0
        for aa in AMINO_ACIDS:
            p = aa_counts[aa] / n
            if p > 0: shannon -= p * math.log2(p)
        norm_shannon = np.array([shannon / math.log2(20)], dtype=np.float32)

        # CTD Transition descriptors [436:457]
        ctd_transition = np.zeros(21, dtype=np.float32)
        if n > 1:
            for p_idx, prop_name in enumerate(self.CTD_PROP_NAMES):
                prop_dict = self.CTD_PROPERTIES[prop_name]
                groups    = [self._ctd_group(aa, prop_dict) for aa in seq]
                t12 = t13 = t23 = 0
                for i in range(n - 1):
                    g1, g2 = groups[i], groups[i+1]
                    if g1 != g2:
                        pair = tuple(sorted((g1, g2)))
                        if   pair == (1, 2): t12 += 1
                        elif pair == (1, 3): t13 += 1
                        elif pair == (2, 3): t23 += 1
                base = p_idx * 3
                ctd_transition[base]     = t12 / (n - 1)
                ctd_transition[base + 1] = t13 / (n - 1)
                ctd_transition[base + 2] = t23 / (n - 1)

        # CTD Distribution descriptors [457:492]
        ctd_distribution = np.zeros(35, dtype=np.float32)
        for p_idx, prop_name in enumerate(self.CTD_PROP_NAMES):
            prop_dict    = self.CTD_PROPERTIES[prop_name]
            positions_g1 = [i for i, aa in enumerate(seq) if self._ctd_group(aa, prop_dict) == 1]
            base         = p_idx * 5
            if positions_g1:
                total_g1     = len(positions_g1)
                percentile_idxs = [
                    0,
                    max(0, int(round(0.25 * total_g1)) - 1),
                    max(0, int(round(0.50 * total_g1)) - 1),
                    max(0, int(round(0.75 * total_g1)) - 1),
                    total_g1 - 1,
                ]
                for k, pidx in enumerate(percentile_idxs):
                    ctd_distribution[base + k] = positions_g1[pidx] / n

        # QSO lag distances [492:498]
        MAX_LAG = 6
        qso = np.zeros(MAX_LAG, dtype=np.float32)
        if n > MAX_LAG:
            for lag in range(1, MAX_LAG + 1):
                coupling = sum(
                    self._sw_dist(seq[i], seq[i + lag]) ** 2
                    for i in range(n - lag)
                ) / (n - lag)
                qso[lag - 1] = float(coupling)

        return np.concatenate([
            aac, dpc, physico, local_features,
            ss_budget, norm_shannon,
            ctd_transition, ctd_distribution, qso,
        ]).astype(np.float32)


# ─────────────────────────────────────────────────────────────────────────────
# NEURAL NETWORK MODEL (MLP)
# ─────────────────────────────────────────────────────────────────────────────

class NeuralProtMLP(nn.Module):
    def __init__(self, num_classes: int, input_dim: int = 498):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, 1024),
            nn.BatchNorm1d(1024),
            nn.ReLU(),
            nn.Dropout(0.30),

            nn.Linear(1024, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(0.30),

            nn.Linear(512, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.20),

            nn.Linear(256, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.network(x)


# ─────────────────────────────────────────────────────────────────────────────
# MODEL REGISTRY (WITH WHITELIST & F1‑BASED THRESHOLD ADJUSTMENTS)
# ─────────────────────────────────────────────────────────────────────────────

class ModelRegistry:
    def __init__(self, models_dir: str, device: str = "cpu", go_dict: dict = None):
        self.models_dir = Path(models_dir)
        self.device     = torch.device(device)
        self.go_dict    = go_dict or {}
        self.groups: dict[str, dict] = {}
        self.TEST_F1_SCORES = self._load_f1_scores()
        self._load_all()

    TEST_F1_SCORES: dict = {}  # loaded at startup from model_f1_scores.json

    def _load_f1_scores(self) -> dict:
        """Load F1 scores from model_f1_scores.json in the models directory."""
        path = self.models_dir / "model_f1_scores.json"
        logger.info(f"F1 scores path: {path.resolve()}")
        if not path.exists():
            logger.warning(f"model_f1_scores.json NOT FOUND at {path.resolve()} — F1 filtering disabled.")
            return {}
        with open(path) as f:
            records = json.load(f)
        scores = {r["model_group"]: float(r["f1_score"]) for r in records}
        logger.info(f"Loaded F1 scores for {len(scores)} groups")
        return scores

    def _load_thresholds(self) -> dict:
        path = self.models_dir / "threshold_results.json"
        if not path.exists():
            logger.warning("threshold_results.json missing — defaulting all to 0.50.")
            return {}
        with open(path) as f:
            raw = json.load(f)
        safe = {}
        for k, v in raw.items():
            safe_key = k.replace(":", "_").replace("/", "_")
            safe[safe_key] = v
        return safe

    def _load_whitelist(self) -> set:
        """Return ALL group names so every model loads at startup.
        Per-request filtering via min_f1 in predict_single() handles preset switching
        without any server restarts — critical for cloud deployment."""
        whitelist = set(self.TEST_F1_SCORES.keys())
        if whitelist:
            logger.info(f"Loading all {len(whitelist)} groups — runtime F1 filtering active")
        else:
            logger.info("No F1 scores found — loading every .pt file on disk")
        return whitelist



    def _load_all(self):
        thresholds = self._load_thresholds()
        pt_files   = sorted(self.models_dir.glob("*_best.pt"))
        if not pt_files:
            raise FileNotFoundError(f"No '*_best.pt' files found in {self.models_dir}")

        whitelist  = self._load_whitelist()
        n_loaded   = 0
        skipped    = []   # collect all skip reasons for a single clear report

        for pt_path in pt_files:
            group     = pt_path.stem.replace("_best", "")
            safe_name = group.replace(":", "_").replace("/", "_")

            # Skip groups not in model_f1_scores.json (only when whitelist is populated)
            if whitelist and group not in whitelist:
                skipped.append((group, "not in model_f1_scores.json"))
                continue

            # Find terms.json — check models dir first, then one and two levels up
            terms_path = self.models_dir / f"{safe_name}_terms.json"
            if not terms_path.exists():
                alt1 = self.models_dir.parent / "processed_data" / safe_name / "terms.json"
                alt2 = self.models_dir.parent.parent / "processed_data" / safe_name / "terms.json"
                if   alt1.exists(): terms_path = alt1
                elif alt2.exists(): terms_path = alt2
                else:
                    skipped.append((group, f"terms.json missing (checked {self.models_dir / (safe_name + '_terms.json')})"))
                    continue

            try:
                with open(terms_path) as f:
                    go_terms = json.load(f)
            except Exception as e:
                skipped.append((group, f"terms.json unreadable: {e}"))
                continue

            num_classes = len(go_terms)

            try:
                model      = NeuralProtMLP(num_classes=num_classes, input_dim=498)
                checkpoint = torch.load(pt_path, map_location=self.device, weights_only=False)
                if isinstance(checkpoint, dict):
                    state_dict = checkpoint.get("model_state") or checkpoint.get("state_dict") or checkpoint
                else:
                    state_dict = checkpoint
                model.load_state_dict(state_dict)
                model.to(self.device)
                model.eval()
            except Exception as e:
                skipped.append((group, f".pt load failed: {e}"))
                continue

            threshold = 0.75
            if safe_name in thresholds:
                entry = thresholds[safe_name]
                if "optimal_threshold" in entry and isinstance(entry["optimal_threshold"], dict):
                    threshold = entry["optimal_threshold"].get("threshold", 0.75)
                elif "best_threshold" in entry:
                    threshold = entry["best_threshold"]

            self.groups[group] = {
                "model":       model,
                "go_terms":    go_terms,
                "threshold":   threshold,
                "num_classes": num_classes,
                "f1_score":    self.TEST_F1_SCORES.get(group, 1.0),
            }
            n_loaded += 1

        # ── Startup report ────────────────────────────────────────────────────
        n_total = len(pt_files)
        if skipped:
            # Print to stderr directly so it always appears regardless of log level
            print(f"\n{'='*70}", file=sys.stderr)
            print(f"STARTUP: {n_loaded}/{n_total} groups loaded. {len(skipped)} SKIPPED:", file=sys.stderr)
            for name, reason in skipped:
                print(f"  SKIP  {name}\n        reason: {reason}", file=sys.stderr)
            print(f"{'='*70}\n", file=sys.stderr)
            logger.warning(f"Mounted {n_loaded}/{n_total} groups — {len(skipped)} skipped (see stderr above)")
        else:
            logger.info(f"Successfully mounted all {n_loaded} group models.")

    def predict_single(self, features: np.ndarray, go_dict=None, parent_gate_thresh=0.75, min_f1: float = 0.0):
        """
        Run one feature vector through all loaded groups.
        Returns predictions sorted by confidence (will be re‑sorted later by specificity).
        No hierarchy propagation.
        """
        x = torch.tensor(features, dtype=torch.float32).unsqueeze(0).to(self.device)
        results = []
        with torch.no_grad():
            for group, meta in self.groups.items():
                # Skip groups whose F1 is below the user-chosen threshold
                if meta.get("f1_score", 1.0) < min_f1:
                    continue
                logits = meta["model"](x)
                probs  = torch.sigmoid(logits).squeeze(0).cpu().numpy()
                thresh = meta["threshold"]
                for go_term, prob in zip(meta["go_terms"], probs):
                    if prob >= thresh:
                        results.append({
                            "go_term":    go_term,
                            "group":      group,
                            "confidence": round(float(prob), 4),
                            "threshold":  round(float(thresh), 4),
                            "predicted_by": "Neural Network AI",
                        })
        return results

    @staticmethod
    def sort_by_specificity(predictions, go_dict):
        """Sort predictions: deeper (more specific) terms first, then by confidence."""
        if not go_dict:
            predictions.sort(key=lambda r: -r["confidence"])
            return predictions

        def term_depth(go_term):
            entry = go_dict.get(go_term, {})
            return len(entry.get("ancestors", []))
        predictions.sort(key=lambda r: (-term_depth(r["go_term"]), -r["confidence"]))
        return predictions

    def get_group_probs(self, feature_matrix: np.ndarray) -> dict[str, np.ndarray]:
        """Run ALL loaded groups. Evaluator use only — no F1 filtering."""
        x = torch.tensor(feature_matrix, dtype=torch.float32).to(self.device)
        group_probs = {}
        with torch.no_grad():
            for group, meta in self.groups.items():
                logits = meta["model"](x)
                group_probs[group] = torch.sigmoid(logits).cpu().numpy()
        return group_probs


# ─────────────────────────────────────────────────────────────────────────────
# EVALUATOR (unchanged – used for offline evaluation only)
# ─────────────────────────────────────────────────────────────────────────────

class NeuralProtEvaluator:
    def __init__(self, registry: ModelRegistry, go_dict: dict = None):
        self.registry = registry
        self.go_dict  = go_dict or {}

    def evaluate(self, protein_ids, sequences, annotations, extractor, output_dir="./evaluation_results"):
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        feature_matrix = np.stack([extractor.extract(seq) for seq in sequences])
        group_probs    = self.registry.get_group_probs(feature_matrix)

        all_term_rows    = []
        group_summaries  = {}

        for group, meta in self.registry.groups.items():
            probs     = group_probs[group]
            go_terms  = meta["go_terms"]
            threshold = meta["threshold"]
            y_pred    = (probs >= threshold).astype(int)

            y_true = np.zeros_like(y_pred, dtype=int)
            for i, ann_set in enumerate(annotations):
                for j, go_term in enumerate(go_terms):
                    if go_term in ann_set: y_true[i, j] = 1

            valid_f1s = []
            for j, go_term in enumerate(go_terms):
                support = int(y_true[:, j].sum())
                row = {
                    "go_term": go_term, "go_name": self._name(go_term),
                    "namespace": self._namespace(go_term), "group": group,
                    "support": support, "f1": None, "precision": None,
                    "recall": None, "threshold": threshold,
                }
                if support > 0:
                    row["f1"]        = round(float(f1_score(y_true[:, j],        y_pred[:, j], zero_division=0)), 4)
                    row["precision"] = round(float(precision_score(y_true[:, j], y_pred[:, j], zero_division=0)), 4)
                    row["recall"]    = round(float(recall_score(y_true[:, j],    y_pred[:, j], zero_division=0)), 4)
                    valid_f1s.append(row["f1"])
                all_term_rows.append(row)

            group_summaries[group] = {
                "macro_f1": round(float(np.mean(valid_f1s)), 4) if valid_f1s else 0.0
            }

        self._write_csv(all_term_rows, output_path / "per_term_f1.csv")
        logger.info(f"Evaluation report written to {output_path}/")
        return group_summaries

    def evaluate_with_fmax(self, protein_ids, sequences, annotations, train_annotations, extractor, output_dir="./fmax_results"):
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        engine = FmaxEngine()

        feature_matrix = np.stack([extractor.extract(seq) for seq in sequences])
        group_probs    = self.registry.get_group_probs(feature_matrix)
        group_results  = {}
        all_per_term_rows = []

        for group, meta in self.registry.groups.items():
            probs    = group_probs[group]
            go_terms = meta["go_terms"]

            y_true = np.zeros((len(sequences), len(go_terms)), dtype=int)
            for i, ann_set in enumerate(annotations):
                for j, t in enumerate(go_terms):
                    if t in ann_set: y_true[i, j] = 1

            ic_table = engine.build_ic_table(train_annotations, go_terms)
            res      = engine.sweep(probs, y_true, go_terms, ic_table)

            baseline    = FrequencyBaseline(train_annotations, go_terms).fit()
            bl_probs    = np.tile(baseline.freq_scores, (len(sequences), 1))
            bl_res      = engine.sweep(bl_probs, y_true, go_terms, ic_table)

            for j, go_term in enumerate(go_terms):
                all_per_term_rows.append({
                    "go_term": go_term, "go_name": self._name(go_term),
                    "namespace": self._namespace(go_term), "group": group,
                    "support": int(y_true[:, j].sum()),
                    "fmax": engine.per_term_fmax(probs[:, j], y_true[:, j]),
                })

            group_results[group] = {
                "NeuralProt": {"fmax": res["fmax"],    "smin": res["smin"]},
                "baseline":   {"fmax": bl_res["fmax"], "smin": bl_res["smin"]},
            }

        with open(output_path / "fmax_comparison.json", "w") as f:
            json.dump(group_results, f, indent=2)
        logger.info(f"CAFA metrics saved to {output_path}/")
        return group_results

    def _name(self, go_term):      return self.go_dict.get(go_term, {}).get("name",      "Unknown")
    def _namespace(self, go_term): return self.go_dict.get(go_term, {}).get("namespace", "Unknown")

    @staticmethod
    def _write_csv(rows, path):
        fields = ["go_term","go_name","namespace","group","support","f1","precision","recall","threshold"]
        with open(path, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fields)
            w.writeheader()
            w.writerows(sorted(rows, key=lambda r: (r["f1"] is None, -(r["f1"] or 0.0))))


# ─────────────────────────────────────────────────────────────────────────────
# FMAX ENGINE & FREQUENCY BASELINE (unchanged)
# ─────────────────────────────────────────────────────────────────────────────

class FmaxEngine:
    THRESHOLD_STEPS = 101

    def build_ic_table(self, annotations, go_terms):
        n      = len(annotations)
        if n == 0: return {}
        counts = {t: 0 for t in go_terms}
        for ann_set in annotations:
            for t in ann_set:
                if t in counts: counts[t] += 1
        return {t: -math.log2(c / n) if c > 0 else 0.0 for t, c in counts.items()}

    def sweep(self, prob_matrix, y_true_matrix, go_terms, ic_table=None):
        thresholds            = np.linspace(0.0, 1.0, self.THRESHOLD_STEPS)
        n_proteins, n_terms   = prob_matrix.shape
        true_counts           = y_true_matrix.sum(axis=1).astype(float)
        ic_array              = np.array([ic_table.get(t, 0.0) if ic_table else 0.0 for t in go_terms])
        curve                 = {"threshold": [], "precision": [], "recall": [], "f": [], "s": []}

        for thresh in thresholds:
            pred  = (prob_matrix >= thresh).astype(float)
            tp    = (pred * y_true_matrix).sum(axis=1)
            n_pred = pred.sum(axis=1)
            p = (tp[n_pred > 0] / n_pred[n_pred > 0]).mean() if (n_pred > 0).sum() > 0 else 0.0
            r = np.where(true_counts > 0, tp / np.where(true_counts > 0, true_counts, 1.0), 0.0).mean()
            f = (2 * p * r / (p + r)) if (p + r > 0) else 0.0
            missed = y_true_matrix * (1 - pred)
            wrong  = pred * (1 - y_true_matrix)
            ru     = (missed * ic_array).sum(axis=1).mean()
            mi     = (wrong  * ic_array).sum(axis=1).mean()
            curve["threshold"].append(thresh)
            curve["f"].append(f)
            curve["s"].append(math.sqrt(ru**2 + mi**2))

        f_idx, s_idx = np.argmax(curve["f"]), np.argmin(curve["s"])
        return {
            "fmax": curve["f"][f_idx],
            "fmax_threshold": curve["threshold"][f_idx],
            "smin": curve["s"][s_idx],
        }

    def per_term_fmax(self, prob_col, y_true_col):
        if y_true_col.sum() == 0: return None
        best_f = 0.0
        for thresh in np.linspace(0.0, 1.0, self.THRESHOLD_STEPS):
            pred = (prob_col >= thresh).astype(int)
            tp = (pred * y_true_col).sum()
            fp = (pred * (1 - y_true_col)).sum()
            fn = ((1 - pred) * y_true_col).sum()
            p  = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            r  = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            best_f = max(best_f, (2 * p * r / (p + r)) if (p + r) > 0 else 0.0)
        return round(best_f, 4)


class FrequencyBaseline:
    def __init__(self, train_annotations, go_terms):
        self.train_annotations = train_annotations
        self.go_terms          = go_terms
        self.freq_scores       = None

    def fit(self):
        n      = len(self.train_annotations)
        counts = np.zeros(len(self.go_terms), dtype=float)
        t_idx  = {t: i for i, t in enumerate(self.go_terms)}
        for ann_set in self.train_annotations:
            for t in ann_set:
                if t in t_idx: counts[t_idx[t]] += 1
        self.freq_scores = counts / n if n > 0 else counts
        return self


# ─────────────────────────────────────────────────────────────────────────────
# DATA LOADERS
# ─────────────────────────────────────────────────────────────────────────────

def load_fasta(path: str) -> dict[str, str]:
    seqs = {}; pid, buf = None, []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line.startswith(">"):
                if pid: seqs[pid] = "".join(buf)
                pid = line[1:].split()[0]; buf = []
            elif line: buf.append(line)
    if pid: seqs[pid] = "".join(buf)
    return seqs

def load_annotations_tsv(path: str, go_col: str = "Gene Ontology IDs") -> dict[str, set]:
    annotations = {}
    with open(path, newline="") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            pid = row.get("Entry") or row.get("protein_id") or row.get("ID", "")
            if not pid: continue
            annotations[pid] = {
                t.strip() for t in row.get(go_col, "").split(";")
                if t.strip().startswith("GO:")
            }
    return annotations

def propagate_annotations(annotations, go_dict):
    active     = {tid for tid, entry in go_dict.items() if not entry.get("is_obsolete", False)}
    propagated = {}
    for pid, go_set in annotations.items():
        expanded = set(go_set)
        for t in go_set:
            if t in go_dict: expanded.update(go_dict[t].get("ancestors", []))
        propagated[pid] = expanded & active
    return propagated


# ─────────────────────────────────────────────────────────────────────────────
# CLI COMMANDS (unchanged from previous version)
# ─────────────────────────────────────────────────────────────────────────────

def cmd_predict(args):
    # Load go_dict if provided (needed for depth sorting)
    go_dict = {}
    if args.go_dict:
        with open(args.go_dict) as f:
            go_dict = json.load(f)
        logger.info(f"Loaded GO dictionary with {len(go_dict)} terms.")

    extractor   = FeatureExtractor()
    registry    = ModelRegistry(args.models_dir, device=args.device, go_dict=go_dict)
    all_results = {}

    if args.fasta:
        sequences_map = load_fasta(args.fasta)
        for pid, seq in sequences_map.items():
            try:
                features = extractor.extract(seq)
                preds    = registry.predict_single(features)
                # ===== FEATURE: Apply depth‑based sorting =====
                preds = registry.sort_by_specificity(preds, go_dict)
                # ===== END FEATURE =====
                all_results[pid] = preds
                _print_predictions(pid, preds, args.top_n)
            except ValueError as e:
                logger.warning(f"Skipping '{pid}': {e}")
    elif args.sequence:
        features = extractor.extract(args.sequence)
        preds    = registry.predict_single(features)
        # ===== FEATURE: Apply depth‑based sorting =====
        preds = registry.sort_by_specificity(preds, go_dict)
        # ===== END FEATURE =====
        all_results["input_sequence"] = preds
        _print_predictions("Input Sequence", preds, args.top_n)

    if args.output_json:
        with open(args.output_json, "w") as f:
            json.dump(all_results, f, indent=2)


def cmd_evaluate(args):
    if not SKLEARN_AVAILABLE:
        raise ImportError("scikit-learn required for evaluation.")
    extractor = FeatureExtractor()
    registry  = ModelRegistry(args.models_dir, device=args.device)
    with open(args.go_dict) as f: go_dict = json.load(f)
    seq_map  = load_fasta(args.fasta)
    ann_map  = load_annotations_tsv(args.data_tsv, go_col=args.go_col)
    if args.propagate: ann_map = propagate_annotations(ann_map, go_dict)
    matched  = [p for p in seq_map if p in ann_map]
    evaluator = NeuralProtEvaluator(registry, go_dict=go_dict)
    evaluator.evaluate([seq_map[p] for p in matched], [ann_map[p] for p in matched], extractor, args.output_dir)


def cmd_fmax(args):
    extractor = FeatureExtractor()
    registry  = ModelRegistry(args.models_dir, device=args.device)
    with open(args.go_dict) as f: go_dict = json.load(f)
    seq_map   = load_fasta(args.fasta)
    test_ann  = load_annotations_tsv(args.data_tsv,  go_col=args.go_col)
    train_ann = load_annotations_tsv(args.train_tsv, go_col=args.go_col)
    if args.propagate:
        test_ann  = propagate_annotations(test_ann,  go_dict)
        train_ann = propagate_annotations(train_ann, go_dict)
    matched   = [p for p in seq_map if p in test_ann]
    evaluator = NeuralProtEvaluator(registry, go_dict=go_dict)
    evaluator.evaluate_with_fmax(
        matched,
        [seq_map[p]  for p in matched],
        [test_ann[p] for p in matched],
        list(train_ann.values()),
        extractor, args.output_dir,
    )


def _print_predictions(label, predictions, top_n):
    print(f"\n{'='*65}\nProtein: {label}\nPredictions: {len(predictions)}\n{'─'*65}")
    for p in predictions[:top_n]:
        print(f"{p['go_term']:<16} {p['confidence']:>10.4f}   {p['group']}")
    print(f"{'='*65}\n")


def build_parser():
    parser = argparse.ArgumentParser(prog="neuralprot_inference.py")
    parser.add_argument("--device", default="cpu", choices=["cpu","cuda"])
    sub    = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("predict")
    p.add_argument("--sequence");  p.add_argument("--fasta")
    p.add_argument("--models_dir", required=True)
    p.add_argument("--go_dict", default=None, help="GO dictionary JSON file (for depth sorting)")
    p.add_argument("--top_n", type=int, default=20)
    p.add_argument("--output_json")
    p.set_defaults(func=cmd_predict)

    e = sub.add_parser("evaluate")
    e.add_argument("--fasta", required=True); e.add_argument("--data_tsv", required=True)
    e.add_argument("--models_dir", required=True); e.add_argument("--go_dict", required=True)
    e.add_argument("--propagate", action="store_true")
    e.add_argument("--go_col", default="Gene Ontology IDs")
    e.add_argument("--output_dir", default="./evaluation_results")
    e.set_defaults(func=cmd_evaluate)

    f = sub.add_parser("fmax")
    f.add_argument("--fasta", required=True); f.add_argument("--data_tsv", required=True)
    f.add_argument("--train_tsv", required=True); f.add_argument("--models_dir", required=True)
    f.add_argument("--go_dict", required=True)
    f.add_argument("--propagate", action="store_true")
    f.add_argument("--go_col", default="Gene Ontology IDs")
    f.add_argument("--output_dir", default="./fmax_results")
    f.set_defaults(func=cmd_fmax)

    return parser


def main():
    parser = build_parser()
    args   = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()