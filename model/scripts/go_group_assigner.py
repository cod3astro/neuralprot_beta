"""
================================================================================
NeuralProt — Family Box Splitter (Bottom-Up Tree Splitter v3.2)
================================================================================
What this script does:
1. It reads our clean master job list and counts how often each job appears in
   our real protein data file.
2. It throws away very rare jobs that appear fewer than 10 times because they
   are too small for the AI to learn.
3. It starts from the deepest, most specific twigs of the tree and groups them
   into standard training boxes (size 15 to 100).
4. If lonely jobs are left over, it lines them up near their closest biological 
   cousins and chops them into safe fallback drawers of 50 items max.
"""

import json
from collections import defaultdict

# ── 1. CONFIGURATION SETTINGS ─────────────────────────────────────────────────
GO_DICT_PATH = "C:/Users/USER/Documents/cod3astro/ML_AI/NeuralProt_Beta/data/processed/go_dict.json"
DATASET_PATH = "C:/Users/USER/Documents/cod3astro/ML_AI/NeuralProt_Beta/data/raw/uniprotkb_AND_reviewed_true_AND_protein_2025_12_27.tsv"
SAVE_PATH = "C:/Users/USER/Documents/cod3astro/ML_AI/NeuralProt_Beta/data/processed/go_group_assignment_v3.json"
GO_COL_IDX = 5

# Strict rules for making training boxes:
MIN_TERM_FREQ = 10  # Drop jobs that appear less than this many times total
MAX_GROUP_SIZE = 100  # A standard AI training box cannot hold more than 100 jobs
MIN_GROUP_SIZE = 15  # A standard AI training box must have at least 15 jobs
FALLBACK_CHUNKS = 50  # Leftover cousin boxes can only hold up to 50 jobs max


# ── 2. DATA LOADING & TREE TOOLS ───────────────────────────────────────────────


def load_go_dict():
    """Opens our saved master job JSON file from the hard drive."""
    with open(GO_DICT_PATH, "r") as f:
        return json.load(f)


def calculate_node_depths(go_dict):
    """Calculates how far down the family tree each job sits.

    Root terms are at depth 0. Deep, specific twigs will have high depth numbers 
    like 8 or 10.
    """
    depth_cache = {}

    def get_depth(go_id):
        if go_id in depth_cache:
            return depth_cache[go_id]
        term = go_dict.get(go_id)
        if not term or not term.get("parents"):
            return 0
        # Your depth is 1 step deeper than your deepest parent
        d = 1 + max(get_depth(p) for p in term["parents"])
        depth_cache[go_id] = d
        return d

    for go_id in go_dict:
        get_depth(go_id)
    return depth_cache


def build_descendant_map(go_dict):
    """Builds a master list for every single job showing all of its children,

    grandchildren, and great-grandchildren below it.
    """
    descendants = defaultdict(set)
    for go_id, term in go_dict.items():
        for parent in term.get("parents", []):
            descendants[parent].add(go_id)

    expanded = defaultdict(set)

    def collect(node):
        if node in expanded:
            return expanded[node]
        kids = descendants[node]
        all_desc = set(kids)
        for k in kids:
            all_desc.update(collect(k))
        expanded[node] = all_desc
        return all_desc

    for go_id in go_dict:
        collect(go_id)
    return expanded


def read_raw_dataset_stats(go_dict):
    """Scans your real protein dataset to count how many times each job appears.

    It drops any 'ghost tags' that show up less than our minimum limit (10).
    """
    print("Scanning real protein rows to count job frequencies...")
    raw_counts = defaultdict(int)

    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("#") or not line.strip():
                continue
            parts = line.strip().split("\t")
            if len(parts) <= GO_COL_IDX:
                continue
            for raw in parts[GO_COL_IDX].split(";"):
                raw = raw.strip()
                if raw in go_dict:
                    raw_counts[raw] += 1

    # Filter out the extremely rare jobs
    rare_dropped = sum(1 for k, v in raw_counts.items() if v < MIN_TERM_FREQ)
    survived = {k for k, v in raw_counts.items() if v >= MIN_TERM_FREQ}
    return raw_counts, rare_dropped, survived


def build_ancestor_cache(go_dict):
    """A helper function that looks up all parents and grandparents for our

    jobs.
    """
    cache = {}

    def get_ancestors(go_id):
        if go_id in cache:
            return cache[go_id]
        ancestors = set()
        term = go_dict.get(go_id)
        if term:
            for parent in term.get("parents", []):
                ancestors.add(parent)
                ancestors.update(get_ancestors(parent))
        cache[go_id] = ancestors
        return ancestors

    for go_id in go_dict:
        get_ancestors(go_id)
    return cache


# ── 3. MAIN SCRIPT CONTROLLER ─────────────────────────────────────────────────


def main():
    print("=" * 60)
    print("NeuralProt — Bottom-Up Tree Splitter (Running...)")
    print("=" * 60)

    # Load all our pre-calculated tools and data maps
    go_dict = load_go_dict()
    depth_map = calculate_node_depths(go_dict)
    descendant_map = build_descendant_map(go_dict)
    ancestor_cache = build_ancestor_cache(go_dict)

    # Find out which jobs are frequent enough to use
    raw_counts, total_rare_dropped, valid_terms = read_raw_dataset_stats(
        go_dict
    )

    # Leaf-Packing Strategy: Sort jobs so that the deepest twigs are processed first
    sorted_terms = sorted(
    valid_terms,
    key=lambda x: (depth_map.get(x, 0), x),  # depth first, then GO ID alphabetically
    reverse=True

    )

    assigned_terms = set()
    groups = {}

    print("\nClimbing tree from the bottom up to build standard groups...")
    for go_id in sorted_terms:
        # Get all children of this branch that are valid
        branch_descendants = descendant_map[go_id] & valid_terms
        # Filter out children that already got taken by a deeper model box
        unassigned_here = {
            d for d in branch_descendants if d not in assigned_terms
        }

        if go_id in valid_terms and go_id not in assigned_terms:
            unassigned_here.add(go_id)

        # Check if the size of this box fits our strict rules
        count = len(unassigned_here)
        if MIN_GROUP_SIZE <= count <= MAX_GROUP_SIZE:
            # We replace both spaces AND colons to prevent Windows folder crashes!
            safe_go_id = go_id.replace(":", "_")
            group_name = (
                f"{go_dict[go_id]['name'].replace(' ', '_')}_{safe_go_id}"
            )

            groups[group_name] = list(unassigned_here)
            assigned_terms.update(unassigned_here)

    # ── 4. FALLBACK PHASE FOR LONELY LEFTOVERS ────────────────────────────────
    leftovers = valid_terms - assigned_terms
    print(f"Processing {len(leftovers)} total unassigned leftover terms...")

    # Separate broad top-level grandparents from small lonely twigs
    big_grandparents = set()
    lonely_twigs = set()
    for go_id in leftovers:
        has_active_children = any(
            d in valid_terms for d in descendant_map[go_id]
        )
        if has_active_children:
            big_grandparents.add(go_id)
        else:
            lonely_twigs.add(go_id)

    print(
        f"  -> Found {len(big_grandparents)} Broad Grandparents (Handled automatically via code loop)"
    )
    print(
        f"  -> Found {len(lonely_twigs)} Lonely Twigs that need fallback boxes"
    )

    # Sort the lonely twigs into their 3 main functional rooms
    namespace_twigs = defaultdict(list)
    for go_id in lonely_twigs:
        ns = go_dict[go_id]["namespace"]
        namespace_twigs[ns].append(go_id)

    fallback_group_count = 0
    total_fallback_terms = 0

    print("\nClustering lonely terms by biological cousins into boxes of 50...")
    for ns, terms in namespace_twigs.items():
        # Cousin Alignment Trick: Sort terms by alphabetical string of their ancestors
        # This forces biological close cousins to sit right next to each other!
        sorted_by_cousin = sorted(
            terms, key=lambda x: ("".join(sorted(list(ancestor_cache[x]))), x)
)

        # Chop the lined-up cousins into clean boxes of 50 items max
        for i in range(0, len(sorted_by_cousin), FALLBACK_CHUNKS):
            chunk = sorted_by_cousin[i : i + FALLBACK_CHUNKS]
            fallback_name = f"Fallback_{ns}_{i // FALLBACK_CHUNKS + 1}"

            groups[fallback_name] = chunk
            assigned_terms.update(chunk)
            fallback_group_count += 1
            total_fallback_terms += len(chunk)

    # ── 5. FINAL ACCOUNTING VERIFICATION ──────────────────────────────────────
    total_grouped = sum(
        len(v) for k, v in groups.items() if not k.startswith("Fallback_")
    )

    print("\n" + "─" * 50)
    print("── Final Accounting Breakdown with Fallbacks ──")
    print("─" * 50)
    print(
        f"Standard Focused Model Groups Built:  {len(groups) - fallback_group_count}"
    )
    print(f"Labels Grouped in Standard Models:    {total_grouped:,} terms")
    print(f"Cousin Fallback Model Groups Built:   {fallback_group_count}")
    print(f"Labels Grouped in Fallback Models:    {total_fallback_terms:,} terms")
    print(f"Broad Grandparent Labels Checked Out: {len(big_grandparents):,} terms")
    print(
        f"Rare Ghost Tags Erased (Freq < {MIN_TERM_FREQ}):   {total_rare_dropped:,} terms"
    )
    print(
        f"Verification Sum: {total_grouped + total_fallback_terms + len(big_grandparents) + total_rare_dropped:,} / Raw Unique: {len(raw_counts):,}"
    )
    print("─" * 50)

    # Save our final blueprint assignment maps to disk
    output = {
        "groups": groups,
        "broad_grandparents_zero_train": list(big_grandparents),
        "min_freq": MIN_TERM_FREQ,
    }
    with open(SAVE_PATH, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nConfiguration successfully written to {SAVE_PATH}")


if __name__ == "__main__":
    main()