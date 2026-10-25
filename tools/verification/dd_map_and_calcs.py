#!/usr/bin/env python3
"""Dead Drop — analytical verification utilities (NOT a game simulation).

Produces:
  1. assets/sample_map_alpha.json          — concrete 48-node city map (content data)
  2. scripts/balance_calc_results.json     — closed-form calculations + feasibility checks

These are deterministic, closed-form checks used to sanity-check parameters in
04-balance-sim.md. They are NOT Monte-Carlo simulations of play.
"""
import json, itertools, math, os
from collections import deque

OUT_DOCS = "/home/z/my-project/download/dead-drop/assets"
OUT_CALC = "/home/z/my-project/scripts/balance_calc_results.json"
os.makedirs(OUT_DOCS, exist_ok=True)

# ---------------------------------------------------------------- map build
DISTRICTS = {
    "D1": "Harbor", "D2": "Old Town", "D3": "Market", "D4": "Rail Yard",
}
nodes = []
for d in ["D1", "D2", "D3", "D4"]:
    for i in range(1, 13):
        nodes.append({"id": f"{d}-{i:02d}", "district": d})

def nid(d, i): return f"{d}-{i:02d}"

edges = []  # (a, b, type)  type in F(oot) T(ram) M(etro)
def add(a, b, t):
    edges.append({"a": a, "b": b, "type": t})

# Foot: ring of 12 + two chords per district
for d in ["D1", "D2", "D3", "D4"]:
    ring = [nid(d, i) for i in range(1, 13)]
    for i in range(12):
        add(ring[i], ring[(i + 1) % 12], "F")
    add(ring[0], ring[5], "F")   # chord 1
    add(ring[3], ring[9], "F")   # chord 2

# Tram: 4 edges per boundary, in a district cycle D1-D2-D3-D4-D1
TRAM_BOUNDARIES = [("D1", "D2"), ("D2", "D3"), ("D3", "D4"), ("D4", "D1")]
TRAM_LINKS = [(1, 2), (4, 5), (7, 8), (10, 11)]
for (da, db) in TRAM_BOUNDARIES:
    for (ia, ib) in TRAM_LINKS:
        add(nid(da, ia), nid(db, ib), "T")

# Metro: one hub per district, hub cycle + 2 spokes per hub
HUBS = {"D1": nid("D1", 6), "D2": nid("D2", 6), "D3": nid("D3", 6), "D4": nid("D4", 6)}
hub_ids = [HUBS["D1"], HUBS["D2"], HUBS["D3"], HUBS["D4"]]
for i in range(4):
    add(hub_ids[i], hub_ids[(i + 1) % 4], "M")
SPOKES = {"D1": [1, 11], "D2": [2, 12], "D3": [3, 9], "D4": [4, 8]}
for d, spokes in SPOKES.items():
    for s in spokes:
        add(HUBS[d], nid(d, s), "M")

# drop candidates (16: 4 per district, spread around each ring) and gates (2)
DROP_CANDIDATES = [nid("D1", 3), nid("D1", 10), nid("D1", 1), nid("D1", 7),
                   nid("D2", 4), nid("D2", 9), nid("D2", 12), nid("D2", 6),
                   nid("D3", 2), nid("D3", 11), nid("D3", 5), nid("D3", 9),
                   nid("D4", 5), nid("D4", 12), nid("D4", 3), nid("D4", 8)]
GATES = [nid("D1", 8), nid("D4", 2)]
SAFEHOUSES = [nid("D2", 7), nid("D3", 6)]

# ------------------------------------------------------------- graph checks
adj = {n["id"]: [] for n in nodes}
for e in edges:
    adj[e["a"]].append((e["b"], e["type"]))
    adj[e["b"]].append((e["a"], e["type"]))

def connected():
    seen = {nodes[0]["id"]}; q = deque([nodes[0]["id"]])
    while q:
        u = q.popleft()
        for (v, _) in adj[u]:
            if v not in seen:
                seen.add(v); q.append(v)
    return len(seen) == len(nodes)

graph_checks = {
    "node_count": len(nodes),
    "edge_count": len(edges),
    "connected": connected(),
    "edge_type_counts": {t: sum(1 for e in edges if e["type"] == t) for t in "FTM"},
    "min_degree": min(len(v) for v in adj.values()),
    "max_degree": max(len(v) for v in adj.values()),
}

# ------------------------------------------------- feasibility: minimal days
SP_MAX = 14
COST = {"F": 1, "T": 2, "M": 3, "HOLD": 1}

def min_completion_days(drops, gate, start, sp_max=None):
    """BFS over (node, sp, drop_progress). Day count = number of moves.
    Fugitive must visit drops in order, then END a day on the gate."""
    if sp_max is None:
        sp_max = SP_MAX
    start_state = (start, sp_max, 0)
    seen = {start_state}
    q = deque([(start_state, 0)])
    while q:
        (node, sp, prog), days = q.popleft()
        if prog == len(drops) and node == gate:
            return days
        if days > 14:
            continue
        moves = [(v, COST[t]) for (v, t) in adj[node]]
        moves.append((node, COST["HOLD"]))  # Hold
        for (v, c) in moves:
            if sp - c < 0:
                continue
            nprog = prog
            if prog < len(drops) and v == drops[prog]:
                nprog = prog + 1
            st = (v, sp - c, nprog)
            if st not in seen:
                seen.add(st)
                q.append((st, days + 1))
    return None

results_cases = {}
best = None
# search a few drop triples to find one whose minimal completion path is >= 6 days (tight but fair)
for combo in itertools.combinations(range(len(DROP_CANDIDATES)), 3):
    drops = [DROP_CANDIDATES[i] for i in combo]
    for gate in GATES:
        for start in SAFEHOUSES:
            m = min_completion_days(drops, gate, start)
            if m is not None and (best is None or m > best[0]):
                best = (m, drops, gate, start)

m_days, drops_best, gate_best, start_best = best
results_cases["extreme_case_found"] = {
    "drops_ordered": drops_best, "gate": gate_best, "safehouse_start": start_best,
    "minimal_completion_days": m_days,
}
# a deliberately loose case for contrast
loose = min_completion_days([DROP_CANDIDATES[0], DROP_CANDIDATES[1], DROP_CANDIDATES[2]], GATES[1], SAFEHOUSES[0])
results_cases["loose_example_min_days_at_SP14"] = loose

# --- parameter sensitivity sweep: stamina budget vs feasibility on canonical cases
CANON = ([DROP_CANDIDATES[0], DROP_CANDIDATES[2], DROP_CANDIDATES[4]], GATES[0], SAFEHOUSES[0])
sweep = {}
for sp in (12, 14, 16, 18, 20, 22):
    sweep[str(sp)] = min_completion_days(CANON[0], CANON[1], CANON[2], sp_max=sp)
results_cases["stamina_sweep_min_days_canonical_case"] = {
    "drops": CANON[0], "gate": CANON[1], "start": CANON[2], "results_by_sp": sweep,
}

# --- generator headroom: how many (triple, gate, start) cases have minimal days in [6,8] at SP=16?
qualifying = []
total = 0
for combo in itertools.combinations(range(len(DROP_CANDIDATES)), 3):
    drops = [DROP_CANDIDATES[i] for i in combo]
    for gate in GATES:
        for start in SAFEHOUSES:
            total += 1
            m = min_completion_days(drops, gate, start, sp_max=16)
            if m is not None and 6 <= m <= 8:
                qualifying.append({"drops": drops, "gate": gate, "start": start, "min_days": m})
results_cases["generator_headroom_SP16"] = {
    "total_candidate_cases": total,
    "qualifying_min_days_6_to_8": len(qualifying),
    "example_qualifying": qualifying[0] if qualifying else None,
}

# --- MVP case shape: 2 ordered drops + gate. Headroom at SP=12, min days in [5,7]
qual2 = []
total2 = 0
for combo in itertools.combinations(range(len(DROP_CANDIDATES)), 2):
    drops = [DROP_CANDIDATES[i] for i in combo]
    for gate in GATES:
        for start in SAFEHOUSES:
            total2 += 1
            m = min_completion_days(drops, gate, start, sp_max=12)
            if m is not None and 5 <= m <= 7:
                qual2.append({"drops": drops, "gate": gate, "start": start, "min_days": m})
results_cases["generator_headroom_2drops_SP12"] = {
    "total_candidate_cases": total2,
    "qualifying_min_days_5_to_7": len(qual2),
    "example_qualifying": qual2[0] if qual2 else None,
}

# --- stamina sweep for a friendly 2-drop case
C2 = ([DROP_CANDIDATES[3], DROP_CANDIDATES[1]], GATES[0], SAFEHOUSES[0])
sweep2 = {}
for sp in (8, 10, 12, 14):
    sweep2[str(sp)] = min_completion_days(C2[0], C2[1], C2[2], sp_max=sp)
results_cases["stamina_sweep_2drop_case"] = {
    "drops": C2[0], "gate": C2[1], "start": C2[2], "results_by_sp": sweep2,
}

# ------------------------------------------- closed-form information algebra
def h(bits_list):
    return -sum(p * math.log2(p) for p in bits_list)

info = {}
H0 = math.log2(48)
info["H0_bits_uniform_48"] = round(H0, 3)
info["probe_hit_prob_uniform"] = round(1 / 48, 4)
info["probe_hit_prob_after_district"] = round(1 / 12, 4)
info["bits_removed_by_district_reveal"] = round(H0 - math.log2(12), 3)
info["max_bits_removed_by_transit_reveal"] = round(math.log2(3), 3)
info["blind_probes_needed_expected"] = 24  # 48/2 under uniform posterior, 2 probes/day -> 12 days > 8-day case
info["stakeout_capture_prob_at_max_posterior_0p5"] = 0.5
info["stakeout_vs_probes_tradeoff"] = "1 stakeout = 3 IP = 3 probes; capture needs posterior mass p* at predicted node; info-first play raises p* before committing"

# ------------------------------------------- write outputs
map_json = {
    "map_id": "map_alpha",
    "version": "1.0.0",
    "districts": DISTRICTS,
    "nodes": nodes,
    "edges": edges,
    "drop_candidates": DROP_CANDIDATES,
    "gates": GATES,
    "safehouses": SAFEHOUSES,
    "notes": "Content data for prototype. Travel = 1 day per edge; stamina cost by edge type F=1 T=2 M=3, Hold=1.",
}
with open(os.path.join(OUT_DOCS, "sample_map_alpha.json"), "w") as f:
    json.dump(map_json, f, indent=1)

out = {"graph_checks": graph_checks, "case_checks": results_cases, "info_calcs": info}
with open(OUT_CALC, "w") as f:
    json.dump(out, f, indent=1)
print(json.dumps(out, indent=1))
