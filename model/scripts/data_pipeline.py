"""
================================================================================
NeuralProt — Master Protein Data Organizer (Data Prep Pipeline v3.3)
================================================================================
What this script does:
1. It reads our master job list groups and our raw protein sequence files.
2. It makes sure every protein gets credit for its broad parent jobs.
3. It converts text jobs into clean number grids (1s and 0s) that the AI 
   can easily read.
4. It saves these small grids into safe Windows folders so training can start.
"""

import json
import os
import pickle
import numpy as np

# ── 1. FILE PATH CONFIGURATIONS ───────────────────────────────────────────────
# These are the exact locations of your files on your computer.
TSV_PATH = "C:/Users/USER/Documents/cod3astro/ML_AI/NeuralProt_Beta/data/raw/uniprotkb_AND_reviewed_true_AND_protein_2025_12_27.tsv"
FASTA_PATH = "C:/Users/USER/Documents/cod3astro/ML_AI/NeuralProt_Beta/data/raw/uniprotkb_AND_reviewed_true_AND_protein_2025_12_27.fasta"
GO_DICT_PATH = "C:/Users/USER/Documents/cod3astro/ML_AI/NeuralProt_Beta/data/processed/go_dict.json"
ASSIGNMENT_PATH = "C:/Users/USER/Documents/cod3astro/ML_AI/NeuralProt_Beta/data/processed/go_group_assignment_v3.json"
OUTPUT_DIR = "C:/Users/USER/Documents/cod3astro/ML_AI/NeuralProt_Beta/data/processed/processed_data"

# Column locations inside your spreadsheet file
GO_COL_IDX = 5  # Column 6: Holds the text list of jobs
ACCESSION_COL = 0  # Column 1: Holds the unique protein ID name


# ── 2. DATA LOADING ASSISTANTS ────────────────────────────────────────────────


def load_go_dict(path):
    """Opens our master job file and reads all valid active jobs."""
    print(f"Loading master job dictionary from {path} ...")
    with open(path, "r") as f:
        go_dict = json.load(f)
    print(f"Loaded {len(go_dict):,} active jobs.")
    return go_dict


def load_dynamic_group_assignments(path):
    """Loads our custom 378 model groups blueprint that we made in Step 2."""
    print(f"Loading group blueprints from {path} ...")
    with open(path, "r") as f:
        data = json.load(f)
    groups = data["groups"]
    broad_grandparents = data.get("broad_grandparents_zero_train", [])
    print(f"Found {len(groups)} total model groups to process.")
    print(
        f"Skipping {len(broad_grandparents)} broad grandparent jobs (handled by free rules)."
    )
    return groups


def extract_ancestor_cache(go_dict):
    """FIXED: Instead of doing a slow mathematical calculation loop, this

    instantly pulls out the 'ancestors' list we already saved in Step 1!
    """
    print("Extracting pre-saved family trees from your dictionary file...")
    cache = {}
    for go_id, details in go_dict.items():
        # Read the pre-calculated family list directly
        cache[go_id] = set(details.get("ancestors", []))
    print(f"Family tree cache successfully loaded for {len(cache):,} terms.")
    return cache


def propagate_labels(go_ids, go_dict, ancestor_cache):
    """The True Path Rule: Gives a protein credit for all broad parent jobs

    implied by its specific jobs.
    """
    propagated = set(go_ids)
    for go_id in go_ids:
        ancestors = ancestor_cache.get(go_id, set())
        propagated.update(ancestors)
    # Only keep jobs that are active and recognized
    return propagated & go_dict.keys()


# ── 3. FILE PARSERS (SPREADSHEETS AND LETTERS) ────────────────────────────────


def parse_tsv(tsv_path, go_col_idx, accession_col):
    """Reads your spreadsheet file to link each protein ID name to its list of

    jobs.
    """
    print(f"\nParsing spreadsheet records from {tsv_path} ...")
    protein_go = {}
    rows_read = 0

    with open(tsv_path, "r", encoding="utf-8") as f:
        for i, line in enumerate(f):
            # Skip the very first header line and any blank lines
            if i == 0 or line.startswith("#") or not line.strip():
                continue
            parts = line.strip().split("\t")
            if len(parts) <= max(go_col_idx, accession_col):
                continue

            accession = parts[accession_col].strip()
            raw_go = parts[go_col_idx].strip()

            if not accession or not raw_go:
                continue

            # Split the jobs text by semicolons and clean them up
            go_ids = {g.strip() for g in raw_go.split(";") if g.strip()}
            protein_go[accession] = go_ids
            rows_read += 1

    print(f"Successfully matched {rows_read:,} proteins to their jobs.")
    return protein_go


def parse_fasta(fasta_path):
    """Reads your raw text sequence file to capture the long single-letter

    chains of each protein.
    """
    print(f"\nParsing text sequence strings from {fasta_path} ...")
    sequences = {}
    current_id = None
    current_seq = []

    with open(fasta_path, "r") as f:
        for line in f:
            line = line.strip()
            if line.startswith(">"):
                # Save the previous protein before starting a new one
                if current_id:
                    sequences[current_id] = "".join(current_seq)
                header = line[1:]
                parts = header.split("|")
                # Extract the short ID name between the bars
                current_id = (
                    parts[1]
                    if len(parts) >= 2
                    else parts[0].split()[0]
                )
                current_seq = []
            else:
                # Add the letters to the current chain
                current_seq.append(line)

        # Catch the very last protein chain in the file
        if current_id:
            sequences[current_id] = "".join(current_seq)

    print(f"Loaded {len(sequences):,} protein sequence letter strings.")

    # Save these clean chains into a fast pickle file for later
    sequences_pkl = os.path.join(OUTPUT_DIR, "sequences.pkl")
    with open(sequences_pkl, "wb") as f:
        pickle.dump(sequences, f)

    return sequences


# ── 4. BOX BUILDING AND SAVING MATRIX OPERATIONS ───────────────────────────────


def build_and_save_group(
    group_name,
    group_go_terms,
    protein_go,
    sequences,
    go_dict,
    ancestor_cache,
    output_dir,
):
    """Takes one single model group, collects all proteins that can do those

    jobs, builds a grid of 1s and 0s, and saves it to a safe Windows folder.
    """
    group_go_set = set(group_go_terms)
    go_term_list = sorted(group_go_terms)
    term_to_idx = {t: i for i, t in enumerate(go_term_list)}
    n_terms = len(go_term_list)

    accessions = []
    label_matrix = []

    # Filter out proteins belonging to this box
    for accession, raw_go_ids in protein_go.items():
        if not (raw_go_ids & group_go_set):
            continue
        if accession not in sequences:
            continue

        # Fill in missing broad family jobs automatically
        propagated = propagate_labels(raw_go_ids, go_dict, ancestor_cache)
        relevant_terms = propagated & group_go_set
        if not relevant_terms:
            continue

        # Create a row of zeros for this protein
        vec = np.zeros(n_terms, dtype=np.float32)
        for term in relevant_terms:
            # Change the zero to a 1 if the protein does this specific job
            vec[term_to_idx[term]] = 1.0

        accessions.append(accession)
        label_matrix.append(vec)

    # Balance Control Rule: If a box has fewer than 50 proteins, do not train an AI model on it
    if len(accessions) < 50:
        return None

    label_matrix = np.array(label_matrix, dtype=np.float32)
    n_proteins = label_matrix.shape[0]

    # Calculate weights to make sure rare jobs don't get ignored by the AI layers
    pos_counts = label_matrix.sum(axis=0) + 1e-6
    neg_counts = n_proteins - pos_counts
    pos_weights = np.clip(neg_counts / pos_counts, 1.0, 10000.0)

    label_density = float(label_matrix.mean())
    max_weight = float(pos_weights.max())

    # THE WINDOWS NAME FIX: Swap illegal colons for safe underscores
    safe_group_name = group_name.replace(":", "_")
    group_dir = os.path.join(output_dir, safe_group_name)

    # SAFETY CHECK: Warn if the path is dangerously close to the 260 Windows limit
    if len(group_dir) > 240:
        print(
            f"⚠️ WARNING: Path length ({len(group_dir)} letters) is near the Windows 260 limit! Consider moving your project folder closer to C:/"
        )

    os.makedirs(group_dir, exist_ok=True)

    # Save our clean data matrices and configuration lists to the hard drive
    np.savez_compressed(
        os.path.join(group_dir, "labels.npz"), labels=label_matrix
    )
    np.save(os.path.join(group_dir, "pos_weights.npy"), pos_weights)

    with open(os.path.join(group_dir, "terms.json"), "w") as f:
        json.dump(go_term_list, f)

    with open(os.path.join(group_dir, "accessions.json"), "w") as f:
        json.dump(accessions, f)

    with open(os.path.join(group_dir, "metadata.json"), "w") as f:
        json.dump(
            {
                "n_proteins": n_proteins,
                "n_terms": n_terms,
                "label_density": label_density,
                "max_pos_weight": max_weight,
            },
            f,
            indent=2,
        )

    return group_dir


# ── 5. MAIN CONTROLLER PIPELINE ───────────────────────────────────────────────


def main():
    print("=" * 60)
    print("NeuralProt — Dynamic Data Preparation Pipeline (Running...)")
    print("=" * 60)

    # Make sure our output storage folder exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Load all our pre-calculated tools and files
    go_dict = load_go_dict(GO_DICT_PATH)
    group_data = load_dynamic_group_assignments(ASSIGNMENT_PATH)

    # FIXED: This step now runs instantly using our saved data!
    ancestor_cache = extract_ancestor_cache(go_dict)

    protein_go = parse_tsv(TSV_PATH, GO_COL_IDX, ACCESSION_COL)
    sequences = parse_fasta(FASTA_PATH)

    print(f"\nProcessing all assigned groups sequentially...")
    saved_count = 0
    skipped_count = 0

    # Walk through each box in our blueprint one by one
    for group_name, group_terms in group_data.items():
        group_dir = build_and_save_group(
            group_name,
            group_terms,
            protein_go,
            sequences,
            go_dict,
            ancestor_cache,
            OUTPUT_DIR,
        )
        if group_dir:
            saved_count += 1
        else:
            skipped_count += 1

    print(f"\n{'='*60}")
    print("Data compilation complete.")
    print(f"  Successfully processed and saved: {saved_count} groups")
    print(f"  Skipped due to small sample sizes: {skipped_count} groups")
    print(
        "\nNext step: Run your feature_extractor.py to generate your 498-dimensional shape metrics!"
    )
    print("=" * 60)


if __name__ == "__main__":
    main()