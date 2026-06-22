"""
================================================================================
NeuralProt — Master Job List Parser (GO .obo Parser)
================================================================================
What this script does:
1. It reads a giant text file ('go-basic.obo') that holds every known protein 
   job and how they connect like a family tree.
2. It fixes old, broken job names so they point to new, correct names.
3. It makes sure that if a protein does a specific job, it also gets credit 
   for the broader "parent" jobs (The True Path Rule).
4. It saves a clean, fast-loading summary file so our next scripts do not 
   have to do this slow work again.
"""

from collections import defaultdict
import json

# ── 1. FILE LOCATIONS (CONFIG) ────────────────────────────────────────────────
# Change these paths to match where you keep your files on your computer.
OBO_PATH = "C:/Users/USER/Documents/cod3astro/ML_AI/NeuralProt_Beta/data/raw/go-basic.obo"
DATASET_PATH = "C:/Users/USER/Documents/cod3astro/ML_AI/NeuralProt_Beta/data/raw/uniprotkb_AND_reviewed_true_AND_protein_2025_12_27.tsv"

# This is the column number in your Excel/TSV file where the jobs are written.
# 0 means column 1, 5 means column 6. Double-check your file to be sure!
GO_COL_IDX = 5


# ── 2. THE TEXT FILE READER ───────────────────────────────────────────────────


def parse_obo(filepath):
    """This function opens the giant job list file and reads it line by line.

    It builds two things:
    - A dictionary (a master checklist) of all valid, active jobs.
    - An alternate ID map (a rerouting list) that catches old, retired job names
      and points them to the new, correct names.
    """
    go_dict = {}
    alt_id_map = {}  # Rerouting list for old names

    print(f"Opening the master job list file: {filepath}")

    with open(filepath, "r") as f:
        current = None  # This holds the single job box we are currently writing down

        for line in f:
            line = line.strip()

            # Every time we see '[Term]', it means a new job block is starting
            if line == "[Term]":
                current = {
                    "name": "",
                    "namespace": "",
                    "parents": [],
                    "alt_ids": [],
                    "is_obsolete": False,
                }
                continue

            # A blank line or a new section means we are done with the current job box
            if line == "" or line.startswith("["):
                if current and "id" in current:
                    go_id = current["id"]
                    go_dict[go_id] = current
                    # Link any old names to this current correct ID
                    for alt in current["alt_ids"]:
                        alt_id_map[alt] = go_id
                current = None
                continue

            # If the computer wanders outside a job block, ignore the text
            if current is None:
                continue

            # Now we look for specific pieces of information inside the job block:
            if line.startswith("id:"):
                # Example line -> id: GO:0000001
                current["id"] = line.split("id:")[1].strip()

            elif line.startswith("name:"):
                # Example line -> name: mitochondrial repair
                current["name"] = line.split("name:")[1].strip()

            elif line.startswith("namespace:"):
                # Example line -> namespace: biological_process
                current["namespace"] = line.split("namespace:")[1].strip()

            elif line.startswith("is_a:"):
                # Example line -> is_a: GO:0000002 ! broad process description
                # We only want the ID part before the '!' exclamation mark
                parent_id = line.split("is_a:")[1].strip().split(" ")[0]
                current["parents"].append(parent_id)

            elif line.startswith("alt_id:"):
                # Example line -> alt_id: GO:0009999 (an old name)
                alt = line.split("alt_id:")[1].strip()
                current["alt_ids"].append(alt)

            elif line.startswith("is_obsolete:"):
                # Example line -> is_obsolete: true (this means the job is retired/dead)
                val = line.split("is_obsolete:")[1].strip()
                current["is_obsolete"] = val == "true"

        # Catch the very last job if the file ends without a blank line
        if current and "id" in current:
            go_id = current["id"]
            go_dict[go_id] = current
            for alt in current["alt_ids"]:
                alt_id_map[alt] = go_id

    # Toss out dead, retired jobs so our AI model doesn't waste time trying to learn them
    before_filter = len(go_dict)
    go_dict = {k: v for k, v in go_dict.items() if not v["is_obsolete"]}
    removed = before_filter - len(go_dict)

    print(f"Read {before_filter:,} total jobs from the file.")
    print(f"Removed {removed:,} retired jobs that we cannot use.")
    print(f"Keeping {len(go_dict):,} active jobs for training.")
    print(f"Set up {len(alt_id_map):,} automated name-fix rerouters.")

    return go_dict, alt_id_map


# ── 3. CLIMBING THE FAMILY TREE (ANCESTORS) ───────────────────────────────────


def get_all_ancestors(go_id, go_dict, cache=None):
    """This function climbs up the family tree to find all parents, grandparents,

    and great-grandparents for a single job.

    Think of it like tracing your family roots. If a job is 'baking a cake',
    its parent is 'cooking', and its grandparent is 'making food'.
    """
    if cache is None:
        cache = {}

    # Speed saver: If we already looked up this job's family before, don't do it again!
    if go_id in cache:
        return cache[go_id]

    ancestors = set()
    term = go_dict.get(go_id)

    if term:
        for parent in term["parents"]:
            ancestors.add(parent)
            # Recursively climb higher up the tree using this parent
            ancestors.update(get_all_ancestors(parent, go_dict, cache))

    # Save the answers in our speed-saver box (cache)
    cache[go_id] = ancestors
    return ancestors


def build_ancestor_cache(go_dict):
    """This runs the family tree climber for every single job in our list.

    This is the slowest part of the script and takes 10-30 seconds.
    """
    print("\nBuilding the master family tree history...")
    print("This takes 10 to 30 seconds, please wait...")

    cache = {}
    for go_id in go_dict:
        get_all_ancestors(go_id, go_dict, cache)

    print(f"Done! Found family trees for {len(cache):,} jobs.")
    return cache


# ── 4. THE TRUE PATH RULE (LABEL PROPAGATION) ─────────────────────────────────


def propagate_labels(go_ids, go_dict, ancestor_cache):
    """This implements the 'True Path Rule'.

    If a protein does a specific job (like 'baking a chocolate cake'), this
    function automatically adds the broader terms ('cooking' and 'making
    food').
    If you forget this step, your AI model will fail because it will get
    punished for guessing the broad terms correctly.
    """
    propagated = set(go_ids)

    for go_id in go_ids:
        ancestors = ancestor_cache.get(go_id, set())
        propagated.update(ancestors)

    # Throw away any old or ghost IDs that sneaked into the family tree
    return propagated & go_dict.keys()


# ── 5. COUNTING AND CHECKING HELPERS ──────────────────────────────────────────


def get_namespace_distribution(go_dict):
    """A simple counter to sort jobs into three main rooms (categories):

    1. Biological Process (What the whole factory is doing)
    2. Molecular Function (What specific tool is being used)
    3. Cellular Component (Where inside the cell things are happening)
    """
    counts = defaultdict(int)
    for term in go_dict.values():
        counts[term["namespace"]] += 1

    print("\n── Number of Jobs per Category ──────────────────────────────────")
    for ns, count in sorted(counts.items()):
        print(f"  {ns:<35} {count:>6,} jobs")

    return counts


def get_top_level_groups(go_dict, ancestor_cache, min_size=100):
    """Finds the main big branches directly under the three master roots.

    We use these big branches as the walls/boundaries for our AI models.
    """
    roots = {
        "GO:0008150": "biological_process",
        "GO:0003674": "molecular_function",
        "GO:0005575": "cellular_component",
    }

    print(f"\nLooking for large family branches with at least {min_size} child terms...")

    groups = {}
    for go_id, term in go_dict.items():
        # A branch is 'top-level' if its direct parent is one of the three roots
        if any(root in term["parents"] for root in roots):
            descendants = [
                t for t in go_dict if go_id in ancestor_cache.get(t, set())
            ]
            size = len(descendants)
            if size >= min_size:
                groups[go_id] = {
                    "name": term["name"],
                    "namespace": term["namespace"],
                    "size": size,
                }

    print(f"Found {len(groups)} big family branches.")
    print(f"\n── Big Family Branches (Size >= {min_size}) ──────────────────")
    print(f"  {'GO ID':<15} {'Children':>8}  {'Category':<30} Name")
    print(f"  {'-'*14} {'-'*8}  {'-'*29} {'-'*30}")
    for gid, info in sorted(groups.items(), key=lambda x: -x[1]["size"]):
        print(
            f"  {gid:<15} {info['size']:>8,}  {info['namespace']:<30} {info['name']}"
        )

    return groups


def filter_by_dataset(go_dict, alt_id_map, dataset_path, go_col_idx):
    """This opens your real protein dataset file and checks which jobs actually

    show up in your real-world data.

    Not every job in the master tree is used by your proteins, so this lets us
    see our true working list.
    """
    print(f"\nReading real protein list from: {dataset_path}")
    dataset_go_terms = set()
    rows_read = 0

    with open(dataset_path, "r") as f:
        for line in f:
            if line.startswith("#") or not line.strip():
                continue  # Ignore comments and empty blank lines

            parts = line.strip().split("\t")
            if len(parts) <= go_col_idx:
                continue  # Broken row with missing data — skip it

            rows_read += 1
            raw_ids = parts[go_col_idx].split(";")

            for raw in raw_ids:
                raw = raw.strip()
                if not raw:
                    continue
                # Fix old name if it's broken
                canonical = alt_id_map.get(raw, raw)
                if canonical in go_dict:
                    dataset_go_terms.add(canonical)

    total_active = len(go_dict)
    covered = len(dataset_go_terms)

    print(f"Successfully read {rows_read:,} protein rows from your file.")
    print(f"Your data contains {covered:,} unique, active jobs.")
    print(
        f"That covers {covered / total_active * 100:.1f}% of the master dictionary."
    )

    if covered < 1000:
        print(
            "⚠️ WARNING: Found very few jobs! Your GO_COL_IDX number might be wrong."
        )

    return dataset_go_terms


def report_group_coverage(groups, dataset_go_terms, go_dict, ancestor_cache):
    """Shows us a clean table of how many jobs inside each big family branch

    actually appear inside your real protein dataset.
    """
    print("\n── Dataset Coverage per Big Branch ─────────────────────────────")
    print(f"  {'GO ID':<15} {'Total':>6}  {'In Dataset':>10}  {'Coverage':>8}  Name")
    print(f"  {'-'*14} {'-'*6}  {'-'*10}  {'-'*8}  {'-'*30}")

    results = []
    for gid, info in groups.items():
        descendants = {
            t for t in go_dict if gid in ancestor_cache.get(t, set())
        }
        in_dataset = descendants & dataset_go_terms
        coverage = len(in_dataset) / len(descendants) * 100 if descendants else 0

        results.append(
            {
                "go_id": gid,
                "name": info["name"],
                "namespace": info["namespace"],
                "total": len(descendants),
                "in_dataset": len(in_dataset),
                "coverage": coverage,
            }
        )

    for r in sorted(results, key=lambda x: -x["in_dataset"]):
        print(
            f"  {r['go_id']:<15} {r['total']:>6,}  "
            f"{r['in_dataset']:>10,}  {r['coverage']:>7.1f}%  {r['name']}"
        )

    return results


# ── 6. SAVING TO DISK (FIXED WORKFLOW) ─────────────────────────────────────────


def save_go_dict(
    go_dict,
    ancestor_cache,
    path="C:/Users/USER/Documents/cod3astro/ML_AI/NeuralProt_Beta/data/processed/go_dict.json",
):
    """Saves our processed checklist into a clean JSON file on the hard drive.

    This version keeps every single original detail exactly as your old code did,
    but cleanly adds the pre-calculated family tree list at the end.
    """
    print(f"\nSaving master dictionary to: {path} ...")

    serializable = {}
    for k, v in go_dict.items():
        # Turn the family tree set into a simple list of words
        all_ancestors = list(ancestor_cache.get(k, set()))

        # We build the exact same layout your original script expected,
        # plus our new fast-loading ancestor list.
        serializable[k] = {
            "name": v["name"],
            "namespace": v["namespace"],
            "parents": list(v["parents"]),
            "alt_ids": list(v["alt_ids"]),
            "is_obsolete": v["is_obsolete"],
            "id": v.get("id", k),
            "ancestors": all_ancestors,  # This is now clean and fixed!
        }

    with open(path, "w") as f:
        json.dump(serializable, f)

    print(f"Success! Saved {len(go_dict):,} jobs with complete family histories.")
    print("Downstream grouping and training scripts can now load this instantly.")


# ── 7. MAIN CONTROLLER ────────────────────────────────────────────────────────


def main():
    print("=" * 60)
    print("NeuralProt — GO Ontology Parser (Ready to Run)")
    print("=" * 60)

    # Step 1: Read the master text file and fix retired names
    go_dict, alt_id_map = parse_obo(OBO_PATH)

    # Step 2: Print out how the jobs are split across the 3 main categories
    get_namespace_distribution(go_dict)

    # Step 3: Run the slow step to build the full family tree link lookups
    ancestor_cache = build_ancestor_cache(go_dict)

    # Step 4: Map out the major high-level branches
    groups = get_top_level_groups(go_dict, ancestor_cache, min_size=100)

    # Step 5: Read our real protein file and see what we cover
    if DATASET_PATH:
        dataset_go_terms = filter_by_dataset(
            go_dict, alt_id_map, DATASET_PATH, GO_COL_IDX
        )
        report_group_coverage(groups, dataset_go_terms, go_dict, ancestor_cache)
    else:
        print("\nNo DATASET_PATH provided. Skipping real data checks.")

    # Step 6: Save the results (including the fixed ancestor list) to disk
    save_go_dict(go_dict, ancestor_cache)

    print("\n" + "=" * 60)
    print("Parser finished perfectly. Send over the next file when you are ready!")
    print("=" * 60)


if __name__ == "__main__":
    main()