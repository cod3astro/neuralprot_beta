"""
================================================================================
NeuralProt — Production FastAPI Web Application Server Backend
================================================================================
Deployment modes:
  - If MODELS_DIR is set: use local models (development / custom).
  - Else: download models from Hugging Face Hub (set HF_REPO_ID).
  - GO_DICT_PATH can be set; if not, it will also be taken from the downloaded repo.

All environment variables:
  - MODELS_DIR (optional) : local path to models folder
  - GO_DICT_PATH (optional) : local path to go_dict.json
  - HF_REPO_ID (required if MODELS_DIR not set) : Hugging Face repo ID (e.g., "username/neuralprot-models")
  - HF_TOKEN (optional) : for private repos
"""

import os
import json
import uuid
import tempfile
import logging
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Hugging Face integration ──────────────────────────────────────────────────
try:
    from huggingface_hub import snapshot_download
    HF_AVAILABLE = True
except ImportError:
    HF_AVAILABLE = False
    snapshot_download = None

# ── IMPORT OUR REFACTORED INFERENCE ENGINE ────────────────────────────────────
from neuralprot_inference import (
    FeatureExtractor,
    ModelRegistry,
    NeuralProtEvaluator,
    FmaxEngine,
    FrequencyBaseline,
    load_fasta,
    load_annotations_tsv,
    propagate_annotations,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── 1. ENVIRONMENT WORKSPACE PATHS ────────────────────────────────────────────
# If MODELS_DIR is set, use it; otherwise download from Hugging Face Hub
HF_REPO_ID = os.environ.get("HF_REPO_ID", "")  # e.g., "myusername/neuralprot-models"
MODELS_DIR_ENV = os.environ.get("MODELS_DIR", "")
GO_DICT_PATH_ENV = os.environ.get("GO_DICT_PATH", "")

# Allowed origins for CORS (your frontend addresses)
ALLOWED_ORIGINS = [
    "https://neuralprot.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
]

# ── 2. APPLICATION SITE SETUP ─────────────────────────────────────────────────
app = FastAPI(
    title="NeuralProt API Engine",
    description="Live production API endpoint server for predicting protein functions using 373 balanced neural networks.",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── 3. SERVER STARTUP (LOADS EVERYTHING INTO RAM ONCE) ────────────────────────
extractor = None
registry  = None
go_dict   = {}
models_dir = None

@app.on_event("startup")
def startup():
    global extractor, registry, go_dict, models_dir

    # ── Step A: Determine where models live ──────────────────────────────────
    if MODELS_DIR_ENV:
        models_dir = MODELS_DIR_ENV
        logger.info(f"Using local models directory: {models_dir}")
    else:
        if not HF_AVAILABLE:
            raise RuntimeError(
                "huggingface_hub not installed. Install it with: pip install huggingface-hub"
            )
        if not HF_REPO_ID:
            raise RuntimeError(
                "HF_REPO_ID environment variable not set and MODELS_DIR not provided."
            )
        logger.info(f"Downloading models from Hugging Face Hub: {HF_REPO_ID}")
        try:
            # Download only .pt and .json files (weights + metadata)
            models_dir = snapshot_download(
                repo_id=HF_REPO_ID,
                allow_patterns=["*.pt", "*.json"],
                local_dir_use_symlinks=False,   # copies files instead of symlinks
                token=os.environ.get("HF_TOKEN", None),
            )
            logger.info(f"Models downloaded to: {models_dir}")
        except Exception as e:
            raise RuntimeError(f"Failed to download models from Hugging Face Hub: {e}")

    # ── Step B: Locate go_dict.json ──────────────────────────────────────────
    if GO_DICT_PATH_ENV:
        go_dict_path = GO_DICT_PATH_ENV
    else:
        # Try to find go_dict.json inside the downloaded models folder
        candidate = os.path.join(models_dir, "go_dict.json")
        if os.path.exists(candidate):
            go_dict_path = candidate
        else:
            # Fallback: look in the parent directory (if models were downloaded inside a subfolder)
            parent = Path(models_dir).parent
            candidate2 = parent / "go_dict.json"
            if candidate2.exists():
                go_dict_path = str(candidate2)
            else:
                logger.warning("go_dict.json not found; predictions will lack names and depth sorting.")
                go_dict_path = None

    # ── Step C: Load the GO dictionary ──────────────────────────────────────
    if go_dict_path and os.path.exists(go_dict_path):
        with open(go_dict_path) as f:
            go_dict = json.load(f)
        logger.info(f"✓ GO dictionary loaded: {len(go_dict):,} active terms.")
    else:
        logger.warning("⚠️ go_dict.json not found! Predictions will show IDs only.")

    # ── Step D: Initialise the feature extractor ─────────────────────────────
    logger.info("Initializing 498-dimensional biophysics feature extractor...")
    extractor = FeatureExtractor()

    # ── Step E: Load the model registry ──────────────────────────────────────
    logger.info(f"Loading master model brains from: {models_dir}")
    registry = ModelRegistry(models_dir, go_dict=go_dict)

    print("\n" + "=" * 65)
    print(f"🚀 NEURALPROT BACKEND ONLINE: {len(registry.groups)} MODEL GROUPS READY TO SERVE!")
    print(f"   Models from: {models_dir}")
    print("=" * 65 + "\n")


# ── 4. DISK FILE CLEANUP HELPERS ──────────────────────────────────────────────
def save_upload(upload: UploadFile) -> str:
    """Saves an incoming web file into a temporary holding box path safely."""
    suffix = Path(upload.filename).suffix or ".tmp"
    tmp_path = os.path.join(tempfile.gettempdir(), f"web_upload_{uuid.uuid4().hex}{suffix}")
    with open(tmp_path, "wb") as f:
        f.write(upload.file.read())
    return tmp_path

def cleanup(*paths):
    """Deletes temporary files so your hard drive storage stays clean."""
    for p in paths:
        if p and os.path.exists(p):
            os.remove(p)


# ── 5. INPUT DATA SCHEMAS ─────────────────────────────────────────────────────
class SequenceRequest(BaseModel):
    sequence: str
    top_n: Optional[int] = 500
    # Minimum F1 a model group must have to run for this request.
    f1_threshold: Optional[float] = 0.30
    # Optional minimum confidence for individual predictions
    min_confidence: Optional[float] = 0.0


# ── 6. LIVE REST ENDPOINTS ────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Returns a quick status check to show if the server is healthy and alive."""
    return {
        "status": "ok",
        "models_loaded": len(registry.groups) if registry else 0,
        "groups": sorted(registry.groups.keys()) if registry else [],
    }

@app.get("/go_dict")
def get_go_dict():
    """Return the full GO dictionary (for depth calculations on the frontend)."""
    return go_dict


@app.post("/predict/sequence")
def predict_sequence(request: SequenceRequest):
    """Accepts a single string of letters and returns a sorted list of predictions."""
    if not registry:
        raise HTTPException(status_code=503, detail="Models are not initialized.")

    sequence = request.sequence.strip()
    if not sequence:
        raise HTTPException(status_code=400, detail="Error: Input sequence cannot be empty!")

    try:
        features = extractor.extract(sequence)

        # Clamp the user-chosen threshold to a valid range
        min_f1 = max(0.0, min(float(request.f1_threshold or 0.30), 1.0))

        # Run prediction with the chosen F1 filter
        predictions = registry.predict_single(
            features,
            go_dict=go_dict,
            parent_gate_thresh=0.75,
            min_f1=min_f1,
        )

        # ── Apply confidence filter (if requested) ────────────────────────────
        min_conf = request.min_confidence or 0.0
        if min_conf > 0:
            predictions = [p for p in predictions if p["confidence"] >= min_conf]

        # Count how many groups actually ran
        models_used = sum(
            1 for meta in registry.groups.values()
            if meta.get("f1_score", 1.0) >= min_f1
        )

        # Enrich with GO names and namespaces
        for pred in predictions:
            pred["go_name"]   = go_dict.get(pred["go_term"], {}).get("name", "Unknown Function")
            pred["namespace"] = go_dict.get(pred["go_term"], {}).get("namespace", "Unknown")

        # Sort deepest (most specific) terms first
        predictions = registry.sort_by_specificity(predictions, go_dict)

        top = predictions[:request.top_n] if request.top_n else predictions

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "n_predictions": len(predictions),
        "showing":       len(top),
        "modelsUsed":    models_used,
        "f1_threshold":  min_f1,
        "predictions":   top,
    }


@app.post("/predict/fasta")
async def predict_fasta(fasta_file: UploadFile = File(...), top_n: int = Form(500)):
    """Accepts an uploaded FASTA text file and handles multi-protein predictions."""
    if not registry:
        raise HTTPException(status_code=503, detail="Models are not initialized.")

    fasta_path = save_upload(fasta_file)
    try:
        sequences_map = load_fasta(fasta_path)
    except Exception as e:
        cleanup(fasta_path)
        raise HTTPException(status_code=400, detail=f"Invalid FASTA file formatting: {e}")

    results = {}
    errors = {}

    for pid, seq in sequences_map.items():
        try:
            features = extractor.extract(seq)
            predictions = registry.predict_single(features, go_dict=go_dict, parent_gate_thresh=0.75)

            for pred in predictions:
                pred["go_name"]   = go_dict.get(pred["go_term"], {}).get("name", "Unknown Function")
                pred["namespace"] = go_dict.get(pred["go_term"], {}).get("namespace", "Unknown")

            # Sort by specificity
            predictions = registry.sort_by_specificity(predictions, go_dict)

            top = predictions[:top_n]
            results[pid] = {
                "n_predictions": len(predictions),
                "predictions": top,
            }
        except ValueError as e:
            errors[pid] = str(e)

    cleanup(fasta_path)
    return {
        "n_sequences": len(sequences_map),
        "n_succeeded": len(results),
        "n_failed": len(errors),
        "results": results,
        "errors": errors,
    }


# ===== OPTIONAL: Keep evaluation endpoints if you need them =====
# (They are not required for basic prediction, but can be kept as is)

@app.post("/evaluate")
async def evaluate(
    fasta_file: UploadFile = File(...),
    data_tsv: UploadFile = File(...),
    propagate: bool = Form(True),
    go_col: str = Form("Gene Ontology IDs"),
):
    """Per-term F1 evaluation on an annotated test set (kept for compatibility)."""
    if not registry:
        raise HTTPException(status_code=503, detail="Models not loaded.")

    fasta_path = save_upload(fasta_file)
    tsv_path = save_upload(data_tsv)

    try:
        sequences_map = load_fasta(fasta_path)
        annotations_map = load_annotations_tsv(tsv_path, go_col=go_col)

        if propagate and go_dict:
            annotations_map = propagate_annotations(annotations_map, go_dict)

        matched_ids = [pid for pid in sequences_map if pid in annotations_map]
        if not matched_ids:
            raise HTTPException(
                status_code=400,
                detail="No protein IDs overlap between FASTA and TSV."
            )

        sequences = [sequences_map[pid] for pid in matched_ids]
        annotations = [annotations_map[pid] for pid in matched_ids]

        import numpy as np
        from sklearn.metrics import f1_score, precision_score, recall_score

        evaluator = NeuralProtEvaluator(registry, go_dict=go_dict)
        feature_matrix = np.stack([extractor.extract(seq) for seq in sequences])
        group_probs = registry.get_group_probs(feature_matrix)

        all_term_rows = []
        group_summaries = {}

        for group, meta in registry.groups.items():
            probs = group_probs[group]
            go_terms = meta["go_terms"]
            threshold = meta["threshold"]
            y_pred = (probs >= threshold).astype(int)

            y_true = np.zeros_like(y_pred, dtype=int)
            for i, ann_set in enumerate(annotations):
                for j, go_term in enumerate(go_terms):
                    if go_term in ann_set:
                        y_true[i, j] = 1

            term_rows = []
            valid_f1s = []

            for j, go_term in enumerate(go_terms):
                support = int(y_true[:, j].sum())
                row = {
                    "go_term": go_term,
                    "go_name": go_dict.get(go_term, {}).get("name", ""),
                    "namespace": go_dict.get(go_term, {}).get("namespace", ""),
                    "group": group,
                    "support": support,
                    "f1": None,
                    "precision": None,
                    "recall": None,
                    "threshold": threshold,
                }
                if support > 0:
                    yt = y_true[:, j]
                    yp = y_pred[:, j]
                    row["f1"] = round(float(f1_score(yt, yp, zero_division=0)), 4)
                    row["precision"] = round(float(precision_score(yt, yp, zero_division=0)), 4)
                    row["recall"] = round(float(recall_score(yt, yp, zero_division=0)), 4)
                    valid_f1s.append(row["f1"])
                term_rows.append(row)

            macro_f1 = round(float(np.mean(valid_f1s)), 4) if valid_f1s else 0.0
            group_summaries[group] = {
                "macro_f1": macro_f1,
                "n_terms_in_model": len(go_terms),
                "n_terms_with_support": len(valid_f1s),
                "threshold": threshold,
            }
            all_term_rows.extend(term_rows)

        valid_all = [r for r in all_term_rows if r["f1"] is not None]
        overall_macro = round(float(np.mean([r["f1"] for r in valid_all])), 4) if valid_all else 0.0

        return {
            "n_proteins_evaluated": len(sequences),
            "n_matched_ids": len(matched_ids),
            "overall_macro_f1": overall_macro,
            "n_terms_f1_above_0.7": sum(1 for r in valid_all if r["f1"] >= 0.7),
            "n_terms_f1_above_0.5": sum(1 for r in valid_all if r["f1"] >= 0.5),
            "group_summary": group_summaries,
            "per_term_results": all_term_rows,
        }

    finally:
        cleanup(fasta_path, tsv_path)


@app.post("/fmax")
async def fmax_evaluation(
    fasta_file: UploadFile = File(...),
    test_tsv: UploadFile = File(...),
    train_tsv: UploadFile = File(...),
    propagate: bool = Form(True),
    go_col: str = Form("Gene Ontology IDs"),
):
    """Fmax and Smin evaluation (kept for compatibility)."""
    if not registry:
        raise HTTPException(status_code=503, detail="Models not loaded.")

    fasta_path = save_upload(fasta_file)
    test_path = save_upload(test_tsv)
    train_path = save_upload(train_tsv)

    try:
        import numpy as np

        sequences_map = load_fasta(fasta_path)
        test_annotations = load_annotations_tsv(test_path, go_col=go_col)
        train_annotations = load_annotations_tsv(train_path, go_col=go_col)

        if propagate and go_dict:
            test_annotations = propagate_annotations(test_annotations, go_dict)
            train_annotations = propagate_annotations(train_annotations, go_dict)

        matched_ids = [pid for pid in sequences_map if pid in test_annotations]
        if not matched_ids:
            raise HTTPException(status_code=400, detail="No overlapping IDs between FASTA and test TSV.")

        sequences = [sequences_map[pid] for pid in matched_ids]
        test_ann_list = [test_annotations[pid] for pid in matched_ids]
        train_ann_list = list(train_annotations.values())

        engine = FmaxEngine()
        feature_matrix = np.stack([extractor.extract(seq) for seq in sequences])
        group_probs = registry.get_group_probs(feature_matrix)

        group_results = {}

        for group, meta in registry.groups.items():
            probs = group_probs[group]
            go_terms = meta["go_terms"]

            y_true = np.zeros((len(sequences), len(go_terms)), dtype=int)
            for i, ann_set in enumerate(test_ann_list):
                for j, t in enumerate(go_terms):
                    if t in ann_set:
                        y_true[i, j] = 1

            ic_table = engine.build_ic_table(train_ann_list, go_terms)

            dp_results = engine.sweep(
                prob_matrix=probs,
                y_true_matrix=y_true,
                go_terms=go_terms,
                ic_table=ic_table,
            )

            baseline = FrequencyBaseline(train_ann_list, go_terms)
            baseline.fit()
            bl_results = baseline.evaluate(
                test_annotations=test_ann_list,
                go_terms=go_terms,
                engine=engine,
                ic_table=ic_table,
            )

            group_results[group] = {
                "NeuralProt": {
                    "fmax": dp_results["fmax"],
                    "fmax_threshold": dp_results["fmax_threshold"],
                    "fmax_precision": dp_results["fmax_precision"],
                    "fmax_recall": dp_results["fmax_recall"],
                    "smin": dp_results["smin"],
                },
                "baseline": {
                    "fmax": bl_results["fmax"],
                    "smin": bl_results["smin"],
                },
                "fmax_gain_over_baseline": round(dp_results["fmax"] - bl_results["fmax"], 4),
                "smin_improvement": round(bl_results["smin"] - dp_results["smin"], 4),
                "n_test_proteins": len(matched_ids),
                "n_go_terms": len(go_terms),
            }

        all_fmax = [r["NeuralProt"]["fmax"] for r in group_results.values()]
        all_smin = [r["NeuralProt"]["smin"] for r in group_results.values()]
        overall_fmax = round(float(np.mean(all_fmax)), 4)
        overall_smin = round(float(np.mean(all_smin)), 4)

        return {
            "overall_macro_fmax": overall_fmax,
            "overall_macro_smin": overall_smin,
            "n_groups_evaluated": len(group_results),
            "n_groups_beating_baseline": sum(1 for r in group_results.values() if r["fmax_gain_over_baseline"] > 0),
            "group_results": group_results,
        }

    finally:
        cleanup(fasta_path, test_path, train_path)