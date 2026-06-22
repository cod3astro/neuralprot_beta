"""
================================================================================
NeuralProt — Master 498-Dimensional Protein Shape Extractor
================================================================================
What this script does:
1. It opens our master group assignment list and our single giant sequence file.
2. It loops through all 373 of your balanced model folders one by one.
3. It converts long text chains of protein letters into 498 specific physical 
   numbers (fractions, electrical charges, flexibility scores, and patterns).
4. It saves a clean 'features.npy' number grid inside each model's folder.
"""

import itertools
import json
import math
import os
import pickle
import numpy as np

# ── 1. CONFIGURATION PATHS ────────────────────────────────────────────────────
ASSIGNMENT_PATH = "C:/Users/USER/Documents/cod3astro/ML_AI/NeuralProt_Beta/data/processed/go_group_assignment_v3.json"
PROCESSED_DIR = "C:/Users/USER/Documents/cod3astro/ML_AI/NeuralProt_Beta/data/processed/processed_data"
# This is the single giant letter storage file our previous script created
BIG_SEQUENCE_PKL = os.path.join(PROCESSED_DIR, "sequences.pkl")

TOTAL_FEATURES = 498

# ── 2. THE BIOLOGICAL ALPHABET & DICTIONARIES ─────────────────────────────────
AA_LIST = list("ACDEFGHIKLMNPQRSTVWY")
AA_SET = set(AA_LIST)

# Weight values for each individual protein letter
AA_MW = {
    "A": 89.09,
    "C": 121.16,
    "D": 133.10,
    "E": 147.13,
    "F": 165.19,
    "G": 75.03,
    "H": 155.16,
    "I": 131.17,
    "K": 146.19,
    "L": 131.17,
    "M": 149.21,
    "N": 132.12,
    "P": 115.13,
    "Q": 146.15,
    "R": 174.20,
    "S": 105.09,
    "T": 119.12,
    "V": 117.15,
    "W": 204.23,
    "Y": 181.19,
}

# Water-loving vs water-hating scores (Kyte-Doolittle)
AA_HYDRO = {
    "A": 1.8,
    "C": 2.5,
    "D": -3.5,
    "E": -3.5,
    "F": 2.8,
    "G": -0.4,
    "H": -3.2,
    "I": 4.5,
    "K": -3.9,
    "L": 3.8,
    "M": 1.9,
    "N": -3.5,
    "P": -1.6,
    "Q": -3.5,
    "R": -4.5,
    "S": -0.8,
    "T": -0.7,
    "V": 4.2,
    "W": -0.9,
    "Y": -1.3,
}

# Unstable chemical pairing weights
INSTABILITY_WEIGHTS = {
    ("G", "G"): 13.34,
    ("G", "D"): 1.0,
    ("G", "E"): 1.0,
    ("G", "H"): 1.0,
    ("G", "N"): 1.0,
    ("G", "Q"): 1.0,
    ("G", "R"): 1.0,
    ("G", "S"): 1.0,
    ("G", "T"): 1.0,
    ("A", "A"): 1.0,
    ("A", "D"): 1.0,
    ("A", "E"): 1.0,
    ("A", "H"): 1.0,
    ("A", "K"): 1.0,
    ("A", "N"): 1.0,
    ("A", "Q"): 1.0,
    ("A", "R"): 1.0,
    ("A", "S"): 1.0,
    ("A", "T"): 1.0,
    ("C", "K"): 1.0,
    ("D", "G"): 1.0,
    ("E", "E"): 1.0,
    ("E", "K"): 1.0,
    ("E", "N"): 1.0,
    ("E", "Q"): 1.0,
    ("E", "R"): 1.0,
    ("E", "S"): 1.0,
    ("F", "K"): 1.0,
    ("H", "H"): 1.0,
    ("H", "K"): 1.0,
    ("H", "N"): 1.0,
    ("H", "Q"): 1.0,
    ("H", "R"): 1.0,
    ("H", "S"): 1.0,
    ("I", "F"): 1.0,
    ("I", "K"): 1.0,
    ("I", "L"): 1.0,
    ("I", "N"): 1.0,
    ("I", "Q"): 1.0,
    ("I", "R"): 1.0,
    ("I", "S"): 1.0,
    ("K", "E"): 1.0,
    ("K", "K"): 1.0,
    ("K", "N"): 1.0,
    ("K", "P"): 1.0,
    ("K", "Q"): 1.0,
    ("K", "R"): 1.0,
    ("K", "S"): 1.0,
    ("L", "F"): 1.0,
    ("L", "K"): 1.0,
    ("L", "N"): 1.0,
    ("L", "Q"): 1.0,
    ("L", "R"): 1.0,
    ("L", "S"): 1.0,
    ("M", "K"): 1.0,
    ("N", "D"): 1.0,
    ("N", "G"): 1.0,
    ("N", "N"): 1.0,
    ("P", "K"): 1.0,
    ("Q", "D"): 1.0,
    ("Q", "E"): 1.0,
    ("Q", "H"): 1.0,
    ("Q", "K"): 1.0,
    ("Q", "N"): 1.0,
    ("Q", "Q"): 1.0,
    ("Q", "R"): 1.0,
    ("Q", "S"): 1.0,
    ("R", "H"): 1.0,
    ("R", "K"): 1.0,
    ("R", "N"): 1.0,
    ("R", "Q"): 1.0,
    ("R", "R"): 1.0,
    ("R", "S"): 1.0,
    ("S", "D"): 1.0,
    ("S", "E"): 1.0,
    ("S", "N"): 1.0,
    ("S", "S"): 1.0,
    ("T", "K"): 1.0,
    ("V", "K"): 1.0,
    ("W", "K"): 1.0,
    ("Y", "K"): 1.0,
}

# Generate all 400 possible two-letter combinations
ALL_DIPEPTIDES = ["".join(p) for p in itertools.product(AA_LIST, repeat=2)]
DIPEPTIDE_IDX = {dp: i for i, dp in enumerate(ALL_DIPEPTIDES)}

# Master scale for floppy wet-spaghetti zones (TOP-IDP scale)
TOP_IDP = {
    "W": 0.059,
    "F": 0.049,
    "Y": 0.023,
    "I": 0.010,
    "M": 0.001,
    "L": 0.001,
    "V": 0.001,
    "N": -0.005,
    "C": -0.018,
    "T": -0.019,
    "A": -0.020,
    "G": -0.020,
    "R": -0.026,
    "D": -0.030,
    "H": -0.036,
    "Q": -0.044,
    "K": -0.045,
    "S": -0.046,
    "E": -0.055,
    "P": -0.062,
}
_idp_min = -0.062
_idp_max = 0.059
_idp_range = _idp_max - _idp_min


def idp_score(aa):
    """Calculates wet-spaghetti floppy score from 0 to 1."""
    raw = TOP_IDP.get(aa, 0.0)
    return (_idp_max - raw) / _idp_range


# Chou-Fasman shape rules (Helix spirals, Flat sheets, Curly coils)
CHOU_FASMAN_HELIX = {
    "A": 1.42,
    "R": 0.98,
    "N": 0.67,
    "D": 1.01,
    "C": 0.70,
    "E": 1.51,
    "Q": 1.11,
    "G": 0.57,
    "H": 1.00,
    "I": 1.08,
    "L": 1.21,
    "K": 1.16,
    "M": 1.45,
    "F": 1.13,
    "P": 0.57,
    "S": 0.77,
    "T": 0.83,
    "W": 1.08,
    "Y": 0.69,
    "V": 1.06,
}
CHOU_FASMAN_SHEET = {
    "A": 0.83,
    "R": 0.93,
    "N": 0.89,
    "D": 0.54,
    "C": 1.19,
    "E": 0.37,
    "Q": 1.10,
    "G": 0.75,
    "H": 0.87,
    "I": 1.60,
    "L": 1.30,
    "K": 0.74,
    "M": 1.05,
    "F": 1.38,
    "P": 0.55,
    "S": 0.75,
    "T": 1.19,
    "W": 1.37,
    "Y": 1.47,
    "V": 1.70,
}
CHOU_FASMAN_COIL = {
    "A": 0.66,
    "R": 0.95,
    "N": 1.56,
    "D": 1.46,
    "C": 1.19,
    "E": 0.74,
    "Q": 0.98,
    "G": 1.56,
    "H": 0.95,
    "I": 0.47,
    "L": 0.59,
    "K": 1.01,
    "M": 0.60,
    "F": 0.41,
    "P": 1.52,
    "S": 1.43,
    "T": 0.96,
    "W": 0.96,
    "Y": 1.14,
    "V": 0.50,
}

# Schneider-Wrede far-away letter links table
_SW_RAW = {
    ("A", "A"): 0.000,
    ("A", "R"): 1.000,
    ("A", "N"): 0.827,
    ("A", "D"): 0.557,
    ("A", "C"): 0.281,
    ("A", "E"): 0.527,
    ("A", "Q"): 0.610,
    ("A", "G"): 0.130,
    ("A", "H"): 0.871,
    ("A", "I"): 0.422,
    ("A", "L"): 0.405,
    ("A", "K"): 0.909,
    ("A", "M"): 0.359,
    ("A", "F"): 0.776,
    ("A", "P"): 0.260,
    ("A", "S"): 0.183,
    ("A", "T"): 0.313,
    ("A", "W"): 1.000,
    ("A", "Y"): 0.879,
    ("A", "V"): 0.279,
    ("R", "R"): 0.000,
    ("R", "N"): 0.344,
    ("R", "D"): 0.697,
    ("R", "C"): 0.942,
    ("R", "E"): 0.620,
    ("R", "Q"): 0.502,
    ("R", "G"): 0.980,
    ("R", "H"): 0.253,
    ("R", "I"): 0.802,
    ("R", "L"): 0.791,
    ("R", "K"): 0.189,
    ("R", "M"): 0.817,
    ("R", "F"): 0.555,
    ("R", "P"): 0.850,
    ("R", "S"): 0.836,
    ("R", "T"): 0.799,
    ("R", "W"): 0.530,
    ("R", "Y"): 0.376,
    ("R", "V"): 0.811,
    ("N", "N"): 0.000,
    ("N", "D"): 0.329,
    ("N", "C"): 0.680,
    ("N", "E"): 0.426,
    ("N", "Q"): 0.212,
    ("N", "G"): 0.717,
    ("N", "H"): 0.455,
    ("N", "I"): 0.539,
    ("N", "L"): 0.523,
    ("N", "K"): 0.442,
    ("N", "M"): 0.555,
    ("N", "F"): 0.404,
    ("N", "P"): 0.619,
    ("N", "S"): 0.540,
    ("N", "T"): 0.485,
    ("N", "W"): 0.741,
    ("N", "Y"): 0.576,
    ("N", "V"): 0.541,
    ("D", "D"): 0.000,
    ("D", "C"): 0.653,
    ("D", "E"): 0.180,
    ("D", "Q"): 0.344,
    ("D", "G"): 0.519,
    ("D", "H"): 0.563,
    ("D", "I"): 0.621,
    ("D", "L"): 0.604,
    ("D", "K"): 0.631,
    ("D", "M"): 0.637,
    ("D", "F"): 0.598,
    ("D", "P"): 0.544,
    ("D", "S"): 0.434,
    ("D", "T"): 0.400,
    ("D", "W"): 0.857,
    ("D", "Y"): 0.675,
    ("D", "V"): 0.521,
    ("C", "C"): 0.000,
    ("C", "E"): 0.765,
    ("C", "Q"): 0.683,
    ("C", "G"): 0.366,
    ("C", "H"): 0.783,
    ("C", "I"): 0.430,
    ("C", "L"): 0.417,
    ("C", "K"): 0.893,
    ("C", "M"): 0.393,
    ("C", "F"): 0.653,
    ("C", "P"): 0.377,
    ("C", "S"): 0.274,
    ("C", "T"): 0.336,
    ("C", "W"): 0.890,
    ("C", "Y"): 0.789,
    ("C", "V"): 0.315,
    ("E", "E"): 0.000,
    ("E", "Q"): 0.197,
    ("E", "G"): 0.653,
    ("E", "H"): 0.490,
    ("E", "I"): 0.697,
    ("E", "L"): 0.680,
    ("E", "K"): 0.494,
    ("E", "M"): 0.713,
    ("E", "F"): 0.626,
    ("E", "P"): 0.618,
    ("E", "S"): 0.548,
    ("E", "T"): 0.490,
    ("E", "W"): 0.832,
    ("E", "Y"): 0.650,
    ("E", "V"): 0.604,
    ("Q", "Q"): 0.000,
    ("Q", "G"): 0.741,
    ("Q", "H"): 0.382,
    ("Q", "I"): 0.591,
    ("Q", "L"): 0.575,
    ("Q", "K"): 0.431,
    ("Q", "M"): 0.608,
    ("Q", "F"): 0.503,
    ("Q", "P"): 0.622,
    ("Q", "S"): 0.540,
    ("Q", "T"): 0.477,
    ("Q", "W"): 0.727,
    ("Q", "Y"): 0.545,
    ("Q", "V"): 0.527,
    ("G", "G"): 0.000,
    ("G", "H"): 0.900,
    ("G", "I"): 0.531,
    ("G", "L"): 0.515,
    ("G", "K"): 0.966,
    ("G", "M"): 0.467,
    ("G", "F"): 0.848,
    ("G", "P"): 0.231,
    ("G", "S"): 0.272,
    ("G", "T"): 0.412,
    ("G", "W"): 1.000,
    ("G", "Y"): 0.930,
    ("G", "V"): 0.385,
    ("H", "H"): 0.000,
    ("H", "I"): 0.671,
    ("H", "L"): 0.658,
    ("H", "K"): 0.310,
    ("H", "M"): 0.688,
    ("H", "F"): 0.453,
    ("H", "P"): 0.757,
    ("H", "S"): 0.717,
    ("H", "T"): 0.671,
    ("H", "W"): 0.598,
    ("H", "Y"): 0.387,
    ("H", "V"): 0.665,
    ("I", "I"): 0.000,
    ("I", "L"): 0.020,
    ("I", "K"): 0.795,
    ("I", "M"): 0.063,
    ("I", "F"): 0.367,
    ("I", "P"): 0.352,
    ("I", "S"): 0.381,
    ("I", "T"): 0.228,
    ("I", "W"): 0.704,
    ("I", "Y"): 0.575,
    ("I", "V"): 0.145,
    ("L", "L"): 0.000,
    ("L", "K"): 0.779,
    ("L", "M"): 0.043,
    ("L", "F"): 0.349,
    ("L", "P"): 0.345,
    ("L", "S"): 0.366,
    ("L", "T"): 0.213,
    ("L", "W"): 0.691,
    ("L", "Y"): 0.557,
    ("L", "V"): 0.127,
    ("K", "K"): 0.000,
    ("K", "M"): 0.806,
    ("K", "F"): 0.568,
    ("K", "P"): 0.855,
    ("K", "S"): 0.800,
    ("K", "T"): 0.761,
    ("K", "W"): 0.570,
    ("K", "Y"): 0.398,
    ("K", "V"): 0.782,
    ("M", "M"): 0.000,
    ("M", "F"): 0.311,
    ("M", "P"): 0.327,
    ("M", "S"): 0.348,
    ("M", "T"): 0.195,
    ("M", "W"): 0.667,
    ("M", "Y"): 0.537,
    ("M", "V"): 0.113,
    ("F", "F"): 0.000,
    ("F", "P"): 0.577,
    ("F", "S"): 0.657,
    ("F", "T"): 0.510,
    ("F", "W"): 0.391,
    ("F", "Y"): 0.159,
    ("F", "V"): 0.325,
    ("P", "P"): 0.000,
    ("P", "S"): 0.295,
    ("P", "T"): 0.344,
    ("P", "W"): 0.862,
    ("P", "Y"): 0.760,
    ("P", "V"): 0.269,
    ("S", "S"): 0.000,
    ("S", "T"): 0.197,
    ("S", "W"): 0.888,
    ("S", "Y"): 0.764,
    ("S", "V"): 0.291,
    ("T", "T"): 0.000,
    ("T", "W"): 0.748,
    ("T", "Y"): 0.612,
    ("T", "V"): 0.170,
    ("W", "W"): 0.000,
    ("W", "Y"): 0.291,
    ("W", "V"): 0.734,
    ("Y", "Y"): 0.000,
    ("Y", "V"): 0.574,
    ("V", "V"): 0.000,
}


def _sw_dist(a, b):
    if a == b:
        return 0.0
    key = (a, b) if (a, b) in _SW_RAW else (b, a)
    return _SW_RAW.get(key, 0.5)


# CTD property groupings (chemical category splits)
CTD_PROPERTIES = {
    "hydrophobicity": {
        1: set("RKEDQN"),
        2: set("GASTPHY"),
        3: set("CVLIMFW"),
    },
    "normalized_vdw": {
        1: set("GASTPD"),
        2: set("NVEQIL"),
        3: set("MHKFRYW"),
    },
    "polarity": {
        1: set("LIFWCMVY"),
        2: set("PATGS"),
        3: set("HQRKNED"),
    },
    "polarizability": {
        1: set("GASDT"),
        2: set("CPNVEQIL"),
        3: set("KMHFRYW"),
    },
    "charge": {
        1: set("KR"),
        2: set("ANCQGHILMFPSTWYV"),
        3: set("DE"),
    },
    "secondary_structure": {
        1: set("EALMQKRH"),
        2: set("VIYCWFT"),
        3: set("GNPSD"),
    },
    "solvent_accessibility": {
        1: set("ALFCGIVW"),
        2: set("PKQEND"),
        3: set("MSTHRYDE"),
    },
}
CTD_PROP_NAMES = list(CTD_PROPERTIES.keys())


def _ctd_group(aa, prop_dict):
    for g, members in prop_dict.items():
        if aa in members:
            return g
    return 2


def _charge_at_ph(seq, ph):
    charge = 0.0
    charge += 1.0 / (1.0 + 10 ** (ph - 8.0))
    charge -= 1.0 / (1.0 + 10 ** (3.1 - ph))
    for aa in seq:
        if aa == "K":
            charge += 1.0 / (1.0 + 10 ** (ph - 10.5))
        elif aa == "R":
            charge += 1.0 / (1.0 + 10 ** (ph - 12.5))
        elif aa == "H":
            charge += 1.0 / (1.0 + 10 ** (ph - 6.0))
        elif aa == "D":
            charge -= 1.0 / (1.0 + 10 ** (3.9 - ph))
        elif aa == "E":
            charge -= 1.0 / (1.0 + 10 ** (4.1 - ph))
        elif aa == "C":
            charge -= 1.0 / (1.0 + 10 ** (8.3 - ph))
        elif aa == "Y":
            charge -= 1.0 / (1.0 + 10 ** (10.1 - ph))
    return charge


# ── 3. THE 498-DIMENSIONAL CALCULATOR MATH ─────────────────────────────────────


def compute_features(seq):
    """Converts one text sequence string into 498 structured physical numbers."""
    seq = seq.upper()
    seq = "".join(aa for aa in seq if aa in AA_SET)

    if len(seq) == 0:
        return np.zeros(TOTAL_FEATURES, dtype=np.float32)

    n = len(seq)

    # Box 1: Single-letter fractions [0:20]
    aa_counts = {aa: 0 for aa in AA_LIST}
    for aa in seq:
        aa_counts[aa] += 1
    aac = np.array([aa_counts[aa] / n for aa in AA_LIST], dtype=np.float32)

    # Box 2: Two-letter adjacent pair fractions [20:420]
    dpc = np.zeros(400, dtype=np.float32)
    if n > 1:
        for i in range(n - 1):
            dp = seq[i] + seq[i + 1]
            if dp in DIPEPTIDE_IDX:
                dpc[DIPEPTIDE_IDX[dp]] += 1
        dpc /= n - 1

    # Box 3: Core physical features [420:428]
    norm_length = np.log1p(n) / np.log1p(35000)
    mw = sum(AA_MW.get(aa, 110.0) for aa in seq) - (n - 1) * 18.02
    norm_mw = mw / 4e6
    # FIX: Shrink the screaming megaphone number down to a soft 0 to 1 scale
    gravy_raw = sum(AA_HYDRO.get(aa, 0.0) for aa in seq) / n
    gravy = (gravy_raw + 4.5) / 9.0
    aromaticity = sum(1 for aa in seq if aa in ("F", "W", "Y")) / n

    instability = 0.0
    if n > 1:
        for i in range(n - 1):
            instability += INSTABILITY_WEIGHTS.get((seq[i], seq[i + 1]), 1.0)
        instability = (10.0 / n) * instability
    norm_instability = min(instability / 200.0, 1.0)

    lo, hi = 0.0, 14.0
    for _ in range(100):
        mid = (lo + hi) / 2.0
        if _charge_at_ph(seq, mid) > 0:
            lo = mid
        else:
            hi = mid
    norm_pI = (lo + hi) / 2.0 / 14.0

    norm_charge_ph7 = float(np.tanh(_charge_at_ph(seq, 7.0) / 50.0))

    aliphatic = (
        (
            aa_counts.get("A", 0) * 1.0
            + aa_counts.get("V", 0) * 2.9
            + aa_counts.get("I", 0) * 3.9
            + aa_counts.get("L", 0) * 3.9
        )
        / n
        * 100
    )
    norm_aliphatic = min(aliphatic / 400.0, 1.0)

    physico = np.array(
        [
            norm_length,
            norm_mw,
            gravy,
            aromaticity,
            norm_instability,
            norm_pI,
            norm_charge_ph7,
            norm_aliphatic,
        ],
        dtype=np.float32,
    )

    # Box 4: Local Spot Features [428:432]
    if n >= 9:
        max_local_hydropathy_raw = max(
            sum(AA_HYDRO.get(aa, 0.0) for aa in seq[i : i + 9]) / 9.0
            for i in range(n - 8)
        )
    else:
        max_local_hydropathy_raw = gravy_raw
    max_local_hydropathy = (max_local_hydropathy_raw + 4.5) / 9.0

    CHARGE_VAL = {"K": 1, "R": 1, "H": 0.5, "D": -1, "E": -1}
    if n >= 7:
        max_local_charge_density = max(
            sum(abs(CHARGE_VAL.get(aa, 0.0)) for aa in seq[i : i + 7]) / 7.0
            for i in range(n - 6)
        )
    else:
        max_local_charge_density = 0.0

    disorder_fraction = sum(idp_score(aa) for aa in seq) / n

    runs = []
    if n > 0:
        current = seq[0]
        count = 1
        for i in range(1, n):
            if seq[i] == current:
                count += 1
            else:
                runs.append(count)
                current = seq[i]
                count = 1
        runs.append(count)
    total_runs = len(runs)
    if total_runs > 1:
        run_probs = {}
        for r in runs:
            run_probs[r] = run_probs.get(r, 0) + 1
        rle_entropy = -sum(
            (c / total_runs) * math.log2(c / total_runs)
            for c in run_probs.values()
            if c > 0
        )
        max_rle_entropy = math.log2(total_runs) if total_runs > 1 else 1.0
        norm_rle_entropy = rle_entropy / max_rle_entropy
    else:
        norm_rle_entropy = 0.0

    local_features = np.array(
        [
            max_local_hydropathy,
            max_local_charge_density,
            disorder_fraction,
            norm_rle_entropy,
        ],
        dtype=np.float32,
    )

    # Box 5: Shape structure budgets [432:435]
    helix_prop = sum(CHOU_FASMAN_HELIX.get(aa, 1.0) for aa in seq) / n
    sheet_prop = sum(CHOU_FASMAN_SHEET.get(aa, 1.0) for aa in seq) / n
    coil_prop = sum(CHOU_FASMAN_COIL.get(aa, 1.0) for aa in seq) / n
    ss_budget = np.array(
        [helix_prop / 1.6, sheet_prop / 1.7, coil_prop / 1.6], dtype=np.float32
    )

    # Box 6: Shannon letter-mix complexity score [435:436]
    shannon = 0.0
    for aa in AA_LIST:
        p = aa_counts[aa] / n
        if p > 0:
            shannon -= p * math.log2(p)
    norm_shannon = np.array([shannon / math.log2(20)], dtype=np.float32)

    # Box 7: CTD Transition descriptors [436:457]
    ctd_transition = np.zeros(21, dtype=np.float32)
    if n > 1:
        for p_idx, prop_name in enumerate(CTD_PROP_NAMES):
            prop_dict = CTD_PROPERTIES[prop_name]
            groups = [_ctd_group(aa, prop_dict) for aa in seq]
            t12 = t13 = t23 = 0
            for i in range(n - 1):
                g1, g2 = groups[i], groups[i + 1]
                if g1 != g2:
                    pair = tuple(sorted((g1, g2)))
                    if pair == (1, 2):
                        t12 += 1
                    elif pair == (1, 3):
                        t13 += 1
                    elif pair == (2, 3):
                        t23 += 1
            base = p_idx * 3
            ctd_transition[base] = t12 / (n - 1)
            ctd_transition[base + 1] = t13 / (n - 1)
            ctd_transition[base + 2] = t23 / (n - 1)

    # Box 8: CTD Distribution descriptors [457:492]
    ctd_distribution = np.zeros(35, dtype=np.float32)
    for p_idx, prop_name in enumerate(CTD_PROP_NAMES):
        prop_dict = CTD_PROPERTIES[prop_name]
        positions_g1 = [
            i for i, aa in enumerate(seq) if _ctd_group(aa, prop_dict) == 1
        ]
        base = p_idx * 5
        if len(positions_g1) == 0:
            pass
        else:
            total_g1 = len(positions_g1)
            percentile_idxs = [
                0,
                max(0, int(round(0.25 * total_g1)) - 1),
                max(0, int(round(0.50 * total_g1)) - 1),
                max(0, int(round(0.75 * total_g1)) - 1),
                total_g1 - 1,
            ]
            for k, pidx in enumerate(percentile_idxs):
                ctd_distribution[base + k] = positions_g1[pidx] / n

    # Box 9: QSO lag distance values [492:498]
    MAX_LAG = 6
    qso = np.zeros(MAX_LAG, dtype=np.float32)
    if n > MAX_LAG:
        for lag in range(1, MAX_LAG + 1):
            coupling = (
                sum(
                    _sw_dist(seq[i], seq[i + lag]) ** 2 for i in range(n - lag)
                )
                / (n - lag)
            )
            qso[lag - 1] = float(coupling)

    return np.concatenate(
        [
            aac,
            dpc,
            physico,
            local_features,
            ss_budget,
            norm_shannon,
            ctd_transition,
            ctd_distribution,
            qso,
        ]
    ).astype(np.float32)


# ── 4. FIXED BATCH EXTRACTION ENGINE ──────────────────────────────────────────


def compute_and_save_features(group_name, processed_dir, shared_sequences):
    """FIXED: Uses our single giant master memory box to load letters instantly!"""
    safe_name = group_name.replace(":", "_")
    group_dir = os.path.join(processed_dir, safe_name)

    acc_path = os.path.join(group_dir, "accessions.json")
    feat_path = os.path.join(group_dir, "features.npy")

    # If the group folder doesn't exist, skip it safely
    if not os.path.exists(acc_path):
        return

    # ── RESUME CHECK: If the file already exists, skip this group entirely ──
    if os.path.exists(feat_path):
        print(f"  {safe_name:<60} → Already done. Skipping.")
        return

    with open(acc_path) as f:
        accessions = json.load(f)

    n = len(accessions)
    features = np.zeros((n, TOTAL_FEATURES), dtype=np.float32)

    for i, acc in enumerate(accessions):
        features[i] = compute_features(shared_sequences.get(acc, ""))

    np.save(feat_path, features)
    print(f"  {safe_name:<60} → features.npy  shape: {features.shape}")


# ── 5. THE MISSING ENGINE LOOP CONTROLLER ──────────────────────────────────────


def main():
    print("=" * 60)
    print("NeuralProt — 498-Dimensional Feature Extraction Pipeline")
    print("=" * 60)

    # Safety Check: Verify our data files are in place
    if not os.path.exists(BIG_SEQUENCE_PKL):
        print(f"❌ CRITICAL ERROR: Could not find '{BIG_SEQUENCE_PKL}'!")
        print("Please rerun your data preparation script first.")
        return

    print("Loading giant master sequence file into memory... Please wait...")
    with open(BIG_SEQUENCE_PKL, "wb" if False else "rb") as f:
        shared_sequences = pickle.load(f)
    print(f"Success! Master memory box loaded with {len(shared_sequences):,} strings.")

    print(f"Loading group assignment lists from {ASSIGNMENT_PATH}...")
    with open(ASSIGNMENT_PATH, "r") as f:
        data = json.load(f)
    train_groups = list(data["groups"].keys())

    print(f"\nExtracting physical number matrices for {len(train_groups)} groups...")
    
    # Run the feature extractor loop over every single assigned folder box
    total = len(train_groups)
    for idx, group_name in enumerate(train_groups, 1):
        print(f"[{idx}/{total}]", end=" ")
        compute_and_save_features(group_name, PROCESSED_DIR, shared_sequences)

    print(f"\n{'='*60}")
    print("Feature calculation complete!")
    print("All folders now contain their final 'features.npy' grids.")
    print("Next step: Run your script to start training your PyTorch layers!")
    print("=" * 60)


if __name__ == "__main__":
    main()