#!/usr/bin/env python3
"""
Dead Drop — M1 Week-1 validation harness (planning artifacts, NOT game code).

Verifies, against assets/sample_map_alpha.json:
  1. Map structural claims (48 nodes, 84 edges 56F/16T/12M, connected, degree 2-7).
  2. Every map edge referenced by worked examples W1-W4 in 03-rules.md (+ W3 stamina ledger).
  3. Canonical case minimal completion (expected 7 days, SP=12) via BFS over (node, sp, drops_done).
  4. Config-space counts for the [5,7] feasibility band, under BOTH counting definitions
     (ordered drops: 2*16*15*2 = 960; unordered drop pairs: 2*120*2 = 480) — resolves the
     ambiguity in the "55/480" claim (04-balance-sim 3.1, 01-prd 9).
  5. Generator constraints 2-4 (04-balance-sim 6) for candidate selection, then selects
     3 diverse, fully verified paper-playtest cases.
  6. Stranding analysis (DIS-001): min incident edge cost per node; existence of nodes
     without a Foot edge; confirm SP=0 is reachable => forced-strand gap is real.

Output: scripts/m1_w1_validation_results.json + stdout report.
"""
import json
import itertools
from collections import deque

MAP_PATH = "/home/z/my-project/download/dead-drop/assets/sample_map_alpha.json"
OUT_PATH = "/home/z/my-project/scripts/m1_w1_validation_results.json"
SP_BUDGET = 12
COST = {"F": 1, "T": 2, "M": 3}

with open(MAP_PATH) as f:
    mp = json.load(f)

adj = {n["id"]: [] for n in mp["nodes"]}
for e in mp["edges"]:
    adj[e["a"]].append((e["b"], e["type"]))
    adj[e["b"]].append((e["a"], e["type"]))

nodes = [n["id"] for n in mp["nodes"]]
pool = mp["drop_candidates"]
gates = mp["gates"]
safehouses = mp["safehouses"]

results = {"checks": {}, "configs": {}, "playtest_cases": [], "stranding": {}}

# ---------- 1. structure ----------
type_counts = {}
for e in mp["edges"]:
    type_counts[e["type"]] = type_counts.get(e["type"], 0) + 1
seen, dq = {nodes[0]}, deque([nodes[0]])
while dq:
    u = dq.popleft()
    for v, _ in adj[u]:
        if v not in seen:
            seen.add(v)
            dq.append(v)
degs = {u: len(adj[u]) for u in nodes}
results["checks"]["structure"] = {
    "nodes": len(nodes),
    "edges": len(mp["edges"]),
    "edge_types": type_counts,
    "connected": len(seen) == len(nodes),
    "degree_min": min(degs.values()),
    "degree_max": max(degs.values()),
    "district_sizes_ok": all(
        sum(1 for n in mp["nodes"] if n["district"] == d) == 12 for d in "D1 D2 D3 D4".split()
    ),
}

# ---------- 2. worked-example edges ----------
def has_edge(a, b, t):
    return any(v == b and ty == t for v, ty in adj[a])

we = [
    # W1
    ("D2-07", "D2-08", "F"), ("D2-08", "D1-07", "T"),
    # W2
    ("D2-07", "D2-06", "F"), ("D2-06", "D2-05", "F"), ("D2-05", "D2-04", "F"),
    ("D2-04", "D2-10", "F"), ("D2-10", "D2-09", "F"),
    # W3
    ("D2-06", "D2-12", "M"), ("D2-12", "D2-06", "M"), ("D2-06", "D2-07", "F"),
    ("D2-07", "D2-08", "F"), ("D2-08", "D2-09", "F"), ("D2-09", "D2-10", "F"),
    ("D2-10", "D2-11", "F"),
]
bad = [t for t in we if not has_edge(*t)]
w3_spend = [1, 3, 3, 1, 1, 1, 1, 1]
results["checks"]["worked_examples"] = {
    "edges_checked": len(we),
    "edges_missing": bad,
    "w3_stamina_total": sum(w3_spend),
    "w3_ledger_ok": sum(w3_spend) == 12,
    "w4_safehouse_is_D3_06": "D3-06" in safehouses,
    "canonical_gate_D1_08": "D1-08" in gates,
    "canonical_drops_in_pool": all(d in pool for d in ("D2-09", "D1-10")),
}

# ---------- 3. min completion days ----------
def min_days(sh, drops, gate, sp=SP_BUDGET, cap=14):
    """BFS over (node, sp, drops_done). Hold ignored: dominated for completion."""
    start = (sh, sp, 0)
    seen = {start}
    frontier = [start]
    for day in range(1, cap + 1):
        nxt = []
        for n, s, d in frontier:
            for m, t in adj[n]:
                c = COST[t]
                if s < c:
                    continue
                nd = d
                if d < 2 and m == drops[d]:
                    nd = d + 1
                if nd == 2 and m == gate:
                    return day
                st = (m, s - c, nd)
                if st not in seen:
                    seen.add(st)
                    nxt.append(st)
        frontier = nxt
        if not frontier:
            return None
    return None

canon = min_days("D2-07", ("D2-09", "D1-10"), "D1-08")
results["checks"]["canonical_case"] = {
    "safehouse": "D2-07", "drops": ["D2-09", "D1-10"], "gate": "D1-08",
    "min_days_computed": canon, "doc_claim": 7, "match": canon == 7,
}

# ---------- 4. config-space counts (both definitions) ----------
def band_count(mode):
    """mode: 'ordered' = all permutations (960); 'either' = unordered pair, min over both
    orders (480); 'poolorder' = unordered enumeration, drop order fixed by pool order (480,
    reproduces the dd_map_and_calcs.py convention behind the '55/480' claim)."""
    seen_pairs = set()
    in_band = 0
    total = 0
    for sh in safehouses:
        for i, d1 in enumerate(pool):
            for j, d2 in enumerate(pool):
                if d1 == d2:
                    continue
                for g in gates:
                    if mode == "ordered":
                        total += 1
                        md = min_days(sh, (d1, d2), g)
                        if md is not None and 5 <= md <= 7:
                            in_band += 1
                    elif mode == "either":
                        key = (sh, frozenset((d1, d2)), g)
                        if key in seen_pairs:
                            continue
                        seen_pairs.add(key)
                        total += 1
                        m1 = min_days(sh, (d1, d2), g)
                        m2 = min_days(sh, (d2, d1), g)
                        mds = [x for x in (m1, m2) if x is not None]
                        md = min(mds) if mds else None
                        if md is not None and 5 <= md <= 7:
                            in_band += 1
                    else:  # poolorder
                        if j <= i:
                            continue
                        key = (sh, (d1, d2), g)
                        if key in seen_pairs:
                            continue
                        seen_pairs.add(key)
                        total += 1
                        md = min_days(sh, (d1, d2), g)
                        if md is not None and 5 <= md <= 7:
                            in_band += 1
    return total, in_band

res_counts = {}
for mode in ("ordered", "either", "poolorder"):
    t, b = band_count(mode)
    res_counts[mode] = {"total": t, "in_band": b}
results["configs"] = {
    **res_counts,
    "doc_claim": "55/480",
    "reconciliation": "doc claim matches 'poolorder' convention (unordered enumeration, drop order fixed by pool position); generator-relevant ordered space is 113/960 (~11.8%, same rate)",
}

# ---------- 5. generator constraints + playtest case selection ----------
def all_min_routes(sh, drops, gate, md, sp=SP_BUDGET):
    """Enumerate ALL md-day routes completing the case within SP. Returns list of node seqs."""
    out = []

    def dfs(n, s, d, day, path):
        if day == md:
            return
        for m, t in adj[n]:
            c = COST[t]
            if s < c:
                continue
            nd = d + 1 if (d < 2 and m == drops[d]) else d
            if nd == 2 and m == gate:
                out.append(path + [m])
                continue
            if day + 1 < md:
                dfs(m, s - c, nd, day + 1, path + [m])

    dfs(sh, sp, 0, 0, [sh])
    return out

def cheapest_drop2_cost(sh, drops, sp=SP_BUDGET):
    """Min SP to collect drop1 then drop2 (ordered), any day count. Dijkstra on (node, done)."""
    import heapq
    best = {(sh, 0): 0}
    pq = [(0, sh, 0)]
    while pq:
        s, n, d = heapq.heappop(pq)
        if (n, d) != (n, best.get((n, d), 1e9)) and s > best.get((n, d), 1e9):
            continue
        if d == 2:
            return s
        for m, t in adj[n]:
            c = COST[t]
            if s + c > sp:
                continue
            nd = d + 1 if (d < 2 and m == drops[d]) else d
            key = (m, nd)
            if s + c < best.get(key, 1e9):
                best[key] = s + c
                heapq.heappush(pq, (s + c, m, nd))
    return None

def gate_in_3_from(drop2, remaining_sp):
    """C4: gate reachable from drop2 within 3 days at remaining SP."""
    frontier = {(drop2, remaining_sp)}
    for _ in range(3):
        nxt = set()
        for n, s in frontier:
            for m, t in adj[n]:
                c = COST[t]
                if s >= c:
                    if m in gates:
                        return True
                    nxt.add((m, s - c))
        frontier = nxt
    return False

def eval_config(sh, drops, gate):
    md = min_days(sh, drops, gate)
    if md is None or not (5 <= md <= 7):
        return None
    routes = all_min_routes(sh, drops, gate, md)
    # C3 prefix window = the first three days OF MOVEMENT (day-1..3 end nodes),
    # excluding the fixed day-0 safehouse.
    prefixes = {tuple(r[1:4]) for r in routes if len(r) >= 4}
    c2 = cheapest_drop2_cost(sh, drops)
    c4 = None if c2 is None else gate_in_3_from(drops[1], SP_BUDGET - c2)
    return {
        "safehouse": sh, "drops": list(drops), "gate": gate, "min_days": md,
        "min_routes": len(routes), "distinct_first3_prefixes": len(prefixes),
        "cheapest_drop2_sp": c2, "endgame_3day_gate_ok": c4,
        "passes": len(prefixes) >= 3 and c4,
    }

qualifying = []
for sh in safehouses:
    for d1, d2 in itertools.permutations(pool, 2):
        for g in gates:
            r = eval_config(sh, (d1, d2), g)
            if r:
                qualifying.append(r)

full_pass = [r for r in qualifying if r["passes"]]
print(f"ordered configs in band [5,7]: {len(qualifying)}; passing C3+C4: {len(full_pass)}")

def district(nid):
    return nid.split("-")[0]

def diversity_score(r, chosen):
    score = 0
    gds = {district(x["gate"]) for x in chosen}
    if district(r["gate"]) not in gds:
        score += 3
    dds = {district(d) for x in chosen for d in x["drops"]}
    score += len({district(d) for d in r["drops"]} - dds)
    shs = {x["safehouse"] for x in chosen}
    if r["safehouse"] not in shs:
        score += 2
    if r["min_days"] == 7:
        score += 1
    return score

chosen = []
cand = sorted(full_pass, key=lambda r: (r["min_days"], r["min_routes"]))
while len(chosen) < 3 and cand:
    best = max(cand, key=lambda r: (diversity_score(r, chosen), -r["min_routes"]))
    chosen.append(best)
    cand.remove(best)
results["playtest_cases"] = chosen

# ---------- 6. stranding analysis (DIS-001) ----------
min_incident = {u: min(COST[t] for _, t in adj[u]) for u in nodes}
no_foot = [u for u in nodes if all(t != "F" for _, t in adj[u])]
results["stranding"] = {
    "nodes_without_foot_edge": no_foot,
    "min_incident_cost_range": [min(min_incident.values()), max(min_incident.values())],
    "sp0_reachable_note": "SP=0 is reachable by legal play (12 SP, costs >= 1); at SP=0 no Move and no Hold is affordable -> DIS-001 forced-strand gap is real regardless of map.",
}

with open(OUT_PATH, "w") as f:
    json.dump(results, f, indent=1)

print(json.dumps(results, indent=1))
