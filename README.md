# NeuralProt Beta

**A research-grade protein function prediction engine powered by 375 neural network model groups and 498-dimensional biophysical feature vectors.**

NeuralProt takes a raw amino acid sequence and returns a ranked list of Gene Ontology (GO) term predictions, the biological functions the protein is likely to perform. It was built to be scientifically rigorous, practically usable, and fast enough for real research workflows without requiring a GPU.

> **Live demo:** [neuralprot-beta.vercel.app](https://neuralprot-beta.vercel.app)
> **API:** Hosted on Hugging Face Spaces

---

## Table of Contents

- [What It Does](#what-it-does)
- [How It Works](#how-it-works)
  - [Step 1 — Feature Extraction](#step-1--feature-extraction-498-dimensions)
  - [Step 2 — Model Group Routing](#step-2--model-group-routing)
  - [Step 3 — Neural Network Voting](#step-3--neural-network-voting)
  - [Step 4 — Hierarchy Safety Gate](#step-4--hierarchy-safety-gate)
  - [Step 5 — Result Delivery](#step-5--result-delivery)
- [Model Performance](#model-performance)
- [Project Structure](#project-structure)
- [Frontend](#frontend)
  - [Tech Stack](#frontend-tech-stack)
  - [Pages](#pages)
  - [Model Quality Filter](#model-quality-filter)
- [Backend](#backend)
  - [Tech Stack](#backend-tech-stack)
  - [API Endpoints](#api-endpoints)
  - [Environment Variables](#environment-variables)
- [Models](#models)
  - [Architecture](#model-architecture)
  - [Training](#training)
  - [File Structure Per Group](#file-structure-per-model-group)
  - [What to Push to GitHub](#what-to-push-to-github)
- [Deployment](#deployment)
  - [Frontend — Vercel](#frontend--vercel)
  - [Backend and Models — Hugging Face Spaces](#backend-and-models--hugging-face-spaces)
- [Local Development](#local-development)
  - [Frontend Setup](#frontend-setup)
  - [Backend Setup](#backend-setup)
- [Evaluation](#evaluation)
- [Contributing](#contributing)
- [License](#license)

---

## What It Does

You paste an amino acid sequence (or upload a FASTA file). NeuralProt:

1. Extracts 498 biophysical features from the sequence
2. Routes those features through up to 375 specialised neural networks
3. Each network votes on whether its GO terms apply to this protein
4. A biological hierarchy gate propagates confirmed child terms to their parents
5. Returns a ranked, enriched list of GO term predictions with confidence scores

Each prediction carries a GO term ID (linkable to QuickGO/AmiGO), a human-readable function name, a namespace badge (Biological Process, Molecular Function, or Cellular Component), and an animated confidence bar.

---

## How It Works

### Step 1 — Feature Extraction (498 Dimensions)

Every amino acid sequence is converted into a fixed-length 498-dimensional numerical vector before any model sees it. This representation captures the sequence's biophysical shape without requiring alignment or a pre-trained language model.

The 498 features break down into three groups:

| Feature Group | Count | What It Captures |
|---|---|---|
| Amino acid composition | 20 | Fraction of each of the 20 standard amino acids in the sequence |
| Dipeptide frequencies | 400 | Frequency of every possible two-amino-acid pair (20 × 20) |
| Physicochemical properties | 78 | Molecular weight, hydrophobicity, isoelectric point, charge distribution, secondary structure propensities, and more |

This approach is CPU-friendly, deterministic, and requires no external database lookups at inference time.

### Step 2 — Model Group Routing

Rather than training one massive model to predict all GO terms simultaneously, NeuralProt uses **Dynamic Tree Splitting** — an automated process that grouped the 38,560+ GO terms in the ontology into 375 biologically coherent clusters based on annotation co-occurrence patterns in the training data.

Each cluster became one model group. Groups tend to contain GO terms that are biologically related, for example, one group covers all kinase-related molecular function terms, another covers terms related to ion channel activity. This means each model only needs to learn a focused, manageable prediction task rather than the entire annotation space.

The routing is implicit: at inference time, the feature vector is passed to every loaded model group in parallel. There is no explicit routing step, every group independently decides whether its terms apply.

### Step 3 — Neural Network Voting

Each of the 375 model groups contains a trained multilayer perceptron (MLP) that takes the 498-dimensional feature vector as input and outputs a probability for each GO term in its group. Terms whose probability exceeds the group's optimised decision threshold are included in the prediction.

Decision thresholds were tuned per group on a held-out validation set to maximise F1 score for that group's specific annotation patterns.

### Step 4 — Hierarchy Safety Gate

The Gene Ontology is a directed acyclic graph. If a protein is predicted to perform a specific child function (e.g. "protein serine/threonine kinase activity"), it is biologically required to also perform its parent functions (e.g. "kinase activity", "transferase activity").

NeuralProt enforces this through a **75% confidence threshold hierarchy gate**: any child GO term predicted with confidence ≥ 0.75 automatically propagates its prediction upward through the GO graph to all ancestor terms. These propagated predictions are labelled "Hierarchy Tree Rule" in the results and always carry a 1.0000 confidence score — they are biological laws, not model guesses.

### Step 5 — Result Delivery

Results are sorted by GO term specificity (depth in the ontology graph) first, then by confidence score. The API response includes GO names, namespaces, confidence scores, prediction source (Neural Network AI vs Hierarchy Tree Rule), and the count of model groups that participated.

---

## Model Performance

Performance was evaluated using CAFA-standard metrics on a held-out test set.

| Metric | Value |
|---|---|
| Total model groups | 375 |
| Average test F1 across all groups | 0.6154 |
| Best single group F1 | **0.9437** (purine nucleotide metabolic process) |
| Groups with F1 ≥ 0.70 | 96 |
| Groups with F1 ≥ 0.50 | 306 |
| Groups with F1 ≥ 0.30 | 370 |
| GO terms covered | 38,560+ |
| Feature dimensions | 498 |

The three prediction presets directly reflect these tiers:

| Preset | F1 Threshold | Groups Active | Use Case |
|---|---|---|---|
| Broad | ≥ 0.30 | 370 | Exploratory research, novel proteins |
| Balanced | ≥ 0.50 | 306 | General-purpose annotation |
| Strict | ≥ 0.70 | 96 | Publication-grade annotation of well-studied families |

---

## Project Structure

```
neuralprot-beta/
├── frontend/                    # React + Vite application
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Predict.jsx      # Main prediction page
│   │   │   ├── Compare.jsx      # Side-by-side protein comparison
│   │   │   ├── Evaluate.jsx     # Fmax/Smin evaluation desk
│   │   │   ├── Docs.jsx         # Interactive documentation
│   │   │   └── About.jsx        # Project origins
│   │   ├── components/
│   │   │   ├── prediction/
│   │   │   │   ├── SequenceInput.jsx
│   │   │   │   ├── LoadingNarrator.jsx
│   │   │   │   ├── ResultsPanel.jsx
│   │   │   │   ├── GOTermCard.jsx
│   │   │   │   └── ConfidenceBar.jsx
│   │   │   └── layout/
│   │   │       ├── Navbar.jsx
│   │   │       └── ThemeToggle.jsx
│   │   ├── hooks/
│   │   │   └── usePrediction.js
│   │   └── utils/
│   │       ├── sortResults.js
│   │       └── goTermLink.js
│   ├── .env.local               # VITE_API_URL=http://127.0.0.1:8000
│   └── package.json
│
├── backend/
│   ├── neuralprot_backend.py    # FastAPI application
│   ├── neuralprot_inference.py  # Feature extraction + model registry
│   ├── requirements.txt
│   └── models/                  # NOT pushed to GitHub (see below)
│       ├── model_f1_scores.json
│       ├── go_dict.json
│       ├── {group_name}_best.pt
│       └── {group_name}_terms.json
│
└── README.md
```

---

## Frontend

### Frontend Tech Stack

| Technology | Version | Role |
|---|---|---|
| React | 18 | UI framework |
| Vite | 5 | Build tool and dev server |
| Tailwind CSS | 3 | Utility-first styling |
| Motion (Framer Motion) | latest | All animations and transitions |
| Recharts | latest | Bar charts in the Evaluate page |
| Lucide React | latest | All icons |
| React Router v6 | 6 | Client-side routing |

Dark and light mode are supported via Tailwind's `class` strategy. The user's theme preference is persisted to `localStorage` and restored on page load.

All API calls use `import.meta.env.VITE_API_URL` never a hardcoded IP address.

### Pages

**Predict (Home)** — The main prediction interface. Accepts a single amino acid sequence or a batch FASTA file. Shows an animated loading narrator while waiting for results, then displays GO term predictions split into two panels: Neural Network AI predictions and Hierarchy Tree Rule confirmations.

**Compare** — Split-screen interface for running two proteins side by side. Shows shared GO terms with dual confidence bars, and separate panels for functions unique to each protein.

**Evaluate** — Academic validation desk. Upload a training annotation file, a test FASTA file, and a test annotation file. Returns Fmax and Smin scores with a chart comparing NeuralProt against a flat frequency baseline.

**Docs** — Interactive documentation covering the 498-feature architecture, dynamic tree splitting, focal loss training, and the 75% hierarchy safety gate. Each complex term links to an external resource.

**About** — Project history and links to CAFA, Gene Ontology Consortium, and UniProt.

### Model Quality Filter

The prediction page exposes a three-way model quality filter that controls which model groups participate in each prediction. The selection is sent to the backend as `f1_threshold` in the POST body. All 375 models remain loaded in memory at all times, switching presets costs nothing and requires no server restart.

```
Broad    (F1 ≥ 0.30) — 370 models — Maximum coverage
Balanced (F1 ≥ 0.50) — 306 models — General purpose
Strict   (F1 ≥ 0.70) —  96 models — Highest confidence
```

---

## Backend

### Backend Tech Stack

| Technology | Role |
|---|---|
| FastAPI | Web framework and API routing |
| PyTorch | Neural network inference |
| huggingface_hub | Model download from HF Hub at startup |
| Pydantic | Request validation |
| Uvicorn | ASGI server |

### API Endpoints

#### `GET /health`
Returns server status and the count of loaded model groups.

```json
{
  "status": "ok",
  "models_loaded": 375
}
```

#### `POST /predict/sequence`
Predict GO term functions for a single amino acid sequence.

**Request body:**
```json
{
  "sequence": "MKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQAPILSRVGDGTQDNLSGAEKAVQVKVKALPDAQFEVVHSLAKWKRQTLGQHDFSAGEGLYTHMKALRPDEDRLSPLHSVYVDQWDWERVMGDGERQFSTLKSTVEAIWAGIKATEAAVSEEFGLAPFLPDQIHFVHSQELLSRYPDLDAKGRERAIAKDLGAVFLVGIGGKLSDGHRHDVRAPDYDDWSTPSELGHAGLNGDILVWNPVLEDAFELSSMGIRVDADTLKHQLALTGDEDRLELEWHQALLRGEMPQTIGGGIGQSRLTMLLLQLPHIGQVQAGVWPAAVRESVPSLL",
  "f1_threshold": 0.50,
  "top_n": 500,
  "min_confidence": 0.0
}
```

**Response:**
```json
{
  "n_predictions": 47,
  "showing": 47,
  "modelsUsed": 306,
  "f1_threshold": 0.5,
  "predictions": [
    {
      "go_term": "GO:0004672",
      "go_name": "protein kinase activity",
      "namespace": "molecular_function",
      "confidence": 0.8913,
      "threshold": 0.87,
      "predicted_by": "Neural Network AI",
      "group": "protein_kinase_activity_GO_0004672"
    }
  ]
}
```

#### `POST /predict/fasta`
Batch prediction for multiple sequences. Accepts a `.fasta` or `.fa` file upload via `multipart/form-data`.

#### `POST /fmax`
CAFA-standard Fmax and Smin evaluation. Accepts three file uploads: training annotations TSV, test sequences FASTA, and test annotations TSV.

#### `POST /evaluate`
Per-term F1 evaluation on an annotated test set.

#### `GET /go_dict`
Returns the full GO term dictionary (38,560+ terms with names, namespaces, and ancestor lists).

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Frontend | Full URL of the backend API. Set in `.env.local` for local dev, in Vercel dashboard for production. |
| `HF_REPO_ID` | Backend | Hugging Face repository ID where models are stored (e.g. `yourusername/neuralprot-models`). Required when `MODELS_DIR` is not set. |
| `HF_TOKEN` | Backend (optional) | HF access token. Required only for private repositories. |
| `MODELS_DIR` | Backend (optional) | Absolute path to a local models directory. When set, skips the Hugging Face download entirely. Use this for local development. |
| `GO_DICT_PATH` | Backend (optional) | Absolute path to `go_dict.json`. If not set, the backend looks for it inside the models directory. |

---

## Models

### Model Architecture

Every model group uses the same `NeuralProtMLP` architecture — a multilayer perceptron with:

- **Input layer:** 498 neurons (one per biophysical feature)
- **Hidden layers:** Two hidden layers with batch normalisation, dropout regularisation, and ReLU activations
- **Output layer:** One neuron per GO term in the group, with sigmoid activation (multi-label classification)

The number of output neurons varies per group — it equals the number of GO terms that group is responsible for predicting.

### Training

Models were trained with **Focal Loss** to address the severe class imbalance inherent in GO annotation data. Most GO terms are positive for only a small fraction of proteins in any training set. Focal Loss down-weights easy negative examples and focuses the model's learning signal on the difficult, informative cases.

Decision thresholds were optimised per group on a held-out validation set by sweeping threshold values and selecting the one that maximised F1 score on the validation data. These optimised thresholds are stored in each group's metadata and applied at inference time.

### File Structure Per Model Group

Each of the 375 model groups produces four files during training:

| File | Size | Purpose | Push to GitHub? |
|---|---|---|---|
| `{group}_best.pt` | ~4 MB | Best model weights by validation F1. **Required for inference.** | ✅ Yes (via HF) |
| `{group}_terms.json` | ~1 KB | List of GO terms this model predicts. **Required for inference.** | ✅ Yes (via HF) |
| `{group}_log.json` | ~12 KB | Training history, metrics per epoch. Useful for debugging, not needed at runtime. | ⚠️ Optional |
| `{group}_resume.pt` | ~12 MB | Full training checkpoint including optimiser state. Only needed to resume training. | ❌ No |

**Total inference-required storage** (`_best.pt` + `_terms.json` for all 375 groups): approximately **1.5 GB**.

### What to Push to GitHub

The models folder should **not** be committed directly to your GitHub repository. The combined size of all `_best.pt` files (~1.5 GB) far exceeds GitHub's file size limits and would make the repository unusable.

The correct setup:

```
GitHub repo  →  source code only (frontend, backend Python files, requirements)
Hugging Face Dataset/Model repo  →  all _best.pt and _terms.json files
```

Files to exclude from GitHub (add to `.gitignore`):

```gitignore
# Model weights — hosted on Hugging Face
backend/models/*.pt
backend/models/*.json
!backend/models/model_f1_scores.json   # keep this one — it's tiny and needed locally

# Resume checkpoints — only needed for retraining
backend/models/*_resume.pt

# Training logs — optional
backend/models/*_log.json
```

At runtime on Hugging Face Spaces, the backend downloads all model files automatically via `huggingface_hub.snapshot_download()` on first startup. The `HF_REPO_ID` environment variable tells it where to look.

---

## Deployment

### Frontend — Vercel

The frontend is a standard Vite/React SPA and deploys to Vercel in under two minutes.

**Steps:**

1. Push your repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and import the repository.
3. Set the root directory to `frontend/` (or wherever your `package.json` lives).
4. Add one environment variable in the Vercel dashboard:
   ```
   VITE_API_URL = https://your-hf-space-name.hf.space
   ```
5. Deploy. Vercel handles builds automatically on every push to `main`.

**Cost:** Free on Vercel's Hobby plan for personal projects.

### Backend and Models — Hugging Face Spaces

Hugging Face Spaces supports Docker-based deployments and provides enough free compute to run a FastAPI server with models loaded in memory.

**Step 1 — Upload your models to a Hugging Face Dataset repo:**

```bash
pip install huggingface_hub

python3 -c "
from huggingface_hub import HfApi
api = HfApi()

# Create the repo (run once)
api.create_repo('your-username/neuralprot-models', repo_type='dataset', private=False)

# Upload all model files
api.upload_folder(
    folder_path='backend/models',
    repo_id='your-username/neuralprot-models',
    repo_type='dataset',
    ignore_patterns=['*_resume.pt', '*_log.json']
)
"
```

**Step 2 — Create a Hugging Face Space:**

Create a new Space at [huggingface.co/new-space](https://huggingface.co/new-space). Choose:
- SDK: **Docker**
- Hardware: **CPU Basic** (free) or CPU Upgrade (paid, faster cold start)

**Step 3 — Add a `Dockerfile` to your backend folder:**

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY neuralprot_backend.py .
COPY neuralprot_inference.py .

EXPOSE 7860

CMD ["uvicorn", "neuralprot_backend:app", "--host", "0.0.0.0", "--port", "7860"]
```

**Step 4 — Set Space secrets (environment variables):**

In your Space settings under "Repository secrets":
```
HF_REPO_ID = your-username/neuralprot-models
HF_TOKEN   = hf_...  (only if your model repo is private)
```

**Step 5 — Update your CORS allowed origins** in `neuralprot_backend.py`:

```python
ALLOWED_ORIGINS = [
    "https://your-app.vercel.app",
    "http://localhost:5173",
]
```

On first startup, the backend will download all ~1.5 GB of model files from your Hugging Face dataset repo. This takes a few minutes on a cold start. After the first download, Hugging Face Spaces caches the files so subsequent restarts are much faster.

**Free tier limits on Hugging Face Spaces (CPU Basic):**
- 2 vCPU, 16 GB RAM — sufficient to hold all 375 models in memory
- The Space will sleep after inactivity. First request after sleep triggers a cold start (model download + load), which can take 3–5 minutes on a free tier.
- No persistent storage between restarts on the free tier — models re-download each cold start.

**If cold starts are too slow:** Consider using a Hugging Face Space with a persistent `/data` volume (available on paid tiers), or pre-warming the Space by pinging `/health` on a schedule.

---

## Local Development

### Frontend Setup

```bash
# Clone the repository
git clone https://github.com/your-username/neuralprot-beta.git
cd neuralprot-beta/frontend

# Install dependencies
npm install

# Create a local environment file
echo "VITE_API_URL=http://127.0.0.1:8000" > .env.local

# Start the development server
npm run dev
```

The frontend will be available at `neuralprot-beta.vercel.app`.

### Backend Setup

```bash
cd neuralprot-beta/backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables for local development
# Option A — use a local models directory (recommended for dev)
export MODELS_DIR="/absolute/path/to/your/models/folder"

# Option B — download from Hugging Face every startup
export HF_REPO_ID="your-username/neuralprot-models"

# Start the backend
uvicorn neuralprot_backend:app --host 127.0.0.1 --port 8000 --reload
```

The API will be available at `http://127.0.0.1:8000`. Interactive API docs at `http://127.0.0.1:8000/docs`.

**requirements.txt** should include at minimum:

```
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
torch>=2.2.0
numpy>=1.26.0
pydantic>=2.0.0
huggingface_hub>=0.22.0
python-multipart>=0.0.9
```

---

## Evaluation

NeuralProt uses two CAFA-standard evaluation metrics:

**Fmax** — the maximum F-measure across all decision thresholds, where F-measure is the harmonic mean of precision and recall. Higher is better (max 1.0).

**Smin** — the minimum semantic distance between predicted and true annotations, weighted by Information Content of each GO term. Lower is better (min 0.0).

To run an evaluation through the web interface, go to the Evaluate page and upload:
- `train_annotations.tsv` — annotation file used during training (provides the frequency baseline)
- `test_proteins.fasta` — FASTA file of held-out test proteins
- `test_annotations.tsv` — ground-truth annotations for the test proteins

The interface reports Fmax and Smin for NeuralProt alongside a flat frequency baseline, and shows the percentage improvement over baseline.

---

## Contributing

Pull requests are welcome. For significant changes, please open an issue first to discuss what you would like to change.

When contributing to the model or inference code, please ensure:
- `get_group_probs()` remains filter-free (used by the evaluator, must run all groups)
- `predict_single()` continues to accept and respect the `min_f1` parameter
- The `_load_whitelist()` method loads all groups at startup (runtime filtering only)
- No F1 scores are hardcoded in the inference file — `model_f1_scores.json` is the single source of truth

---

## License

This project is released under the MIT License. See `LICENSE` for details.

The Gene Ontology data used in this project is provided by the [Gene Ontology Consortium](http://geneontology.org/) under a [Creative Commons CC BY 4.0 License](https://creativecommons.org/licenses/by/4.0/).

---

*Built for the research community.*
