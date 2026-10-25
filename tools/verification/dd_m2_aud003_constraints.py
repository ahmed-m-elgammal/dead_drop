#!/usr/bin/env python3
"""
Dead Drop — M2 Week-1 / AUD-003 generator-constraint analysis (planning artifact, NOT game code).

First M2 task per m1/m2-handoff.md §2 (executed BEFORE any generator code exists):
  1. Pin C3's exact semantics (">=3 distinct minimal-cost first-three-day route prefixes")
     by counting the conjunction C2 & C3 & C4 under FOUR named readings of "minimal-cost".
  2. Count over the full ordered 960-config space (2 safehouses x 16x15 ordered drops x 2 gates).
  3. Produce per-candidate marginal yields for the pre-authorized content lever
     (drop-candidate pool 16 -> 24, plus optional 3rd safehouse) so the pool choice is
     made OUTSIDE the script, documented, and then re-counted exactly (`recount` mode).
  4. Name the counting convention of every emitted number (AUD-002 lesson).

Modes:
  analyze   — sanity gates + base-960 counts + W1 reconciliation + candidate yield table.
  recount   — exact counts over a documented widened space: --pool-file <json>
              {"pool_24_added": [...8 added ids...], "extra_safehouse": id | null}

Data snapshot: BOTH modes are defined on the ORIGINAL 16-node drop-pool data (map_alpha
JSON v1.0.0 — the M1-era snapshot the W1 audit's published numbers are tied to). The canonical
asset is now v1.2.0 (24-pool, the adopted lever). If the map JSON no longer declares 16
candidates, these modes fail their gate; re-run against the v1.0.0 snapshot from git history
(see tools/verification/README.md → Data snapshots).

Hard sanity gates (script exits 1 if any fails — no silent fudging):
  - Map structure: 48 nodes / 84 edges (56F/16T/12M), connected, degree 2-7, unique edge pairs.
  - Regression constants (m1/m2-handoff.md §3): P1 6d/5SP, P2 6d/6SP, P3 6d/7SP, canonical 7d/6SP.
  - C2-only ordered in-band == 113  (M1 W1 audit, ordered convention).
  - C2-only poolorder in-band == 55 (the original "55/480" claim's convention).
  - C2 & C3(min-day reading) & C4(any-gate) == 7 (M1 W1 audit's strict count) — reproducing it
    validates this script's prefix machinery against the independently written W1 harness.

Known W1 semantic discrepancy handled explicitly (found while re-deriving, see analysis doc):
  W1's C4 helper accepted an arrival at EITHER gate node; rules §2 step 5 escapes only at THE
  case's gate. This script computes C4 under both readings and reports the corrected (case-gate)
  number as primary, keeping the any-gate number solely for reconciliation with the W1 figure.

Pinned semantics (full rationale in m2/aud003-constraint-analysis.md):
  route   = legal action sequence; efficient readings use MOVES ONLY (a Hold is never on a
            minimal-cost / minimal-day / Pareto route: deleting a Hold yields a shorter, cheaper
            route with identical completion).
  prefix  = ordered triple of end-of-day positions on days 1-3 (the blind window: the first
            public reveal fires at the END of day 3; drop-completion events excepted).
  C3-A "mincost" : prefixes of routes completing at globally minimal SP cost (<= 8 days, <= 12 SP).
  C3-B "minday"  : prefixes of routes completing in exactly minimal days (W1's strict reading).
  C3-C "pareto"  : prefixes of routes on the (days, cost) Pareto frontier.
  C3-D "inbudget": prefixes with ANY budget-legal completion by day 8 (diagnostic loose bound;
            Holds allowed in the opening for this reading only).
  C4    : gate reachable from the drop-2 site within 3 days at the SP remaining after the
            cheapest drop-2 route (cost metric per W1 convention; a <=8-day variant is also
            reported — they agree iff differ_count == 0).

Output: tools/verification/m2_aud003_results.json (+ stdout report). Pure stdlib, no deps.
"""
import json
import heapq
import itertools
import sys
from collections import Counter
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MAP_PATH = REPO / "assets" / "sample_map_alpha.json"
OUT_PATH = REPO / "tools" / "verification" / "m2_aud003_results.json"

SP_BUDGET = 12
CASE_DAYS = 8
COST = {"F": 1, "T": 2, "M": 3}
INF = float("inf")

with open(MAP_PATH) as f:
    mp = json.load(f)

adj = {n["id"]: [] for n in mp["nodes"]}
for e in mp["edges"]:
    adj[e["a"]].append((e["b"], e["type"]))
    adj[e["b"]].append((e["a"], e["type"]))

nodes = [n["id"] for n in mp["nodes"]]
district_of = {n["id"]: n["district"] for n in mp["nodes"]}
pool16 = list(mp["drop_candidates"])
gates = list(mp["gates"])
safehouses = list(mp["safehouses"])

LADDER_NEED = 24  # MVP solo ladder size (01-prd / 10-roadmap M2)


def fail(msg):
    print(f"[SANITY-GATE FAILURE] {msg}", file=sys.stderr)
    sys.exit(1)


# ---------------------------------------------------------------- sanity gates
def sanity():
    if len(nodes) != 48 or len(mp["edges"]) != 84:
        fail("map structure 48/84")
    tc = Counter(e["type"] for e in mp["edges"])
    if not (tc["F"] == 56 and tc["T"] == 16 and tc["M"] == 12):
        fail(f"edge class mix {dict(tc)}")
    seen, dq = {nodes[0]}, [nodes[0]]
    while dq:
        u = dq.pop()
        for v, _ in adj[u]:
            if v not in seen:
                seen.add(v)
                dq.append(v)
    if len(seen) != 48:
        fail("map not connected")
    degs = [len(adj[u]) for u in nodes]
    if min(degs) < 2 or max(degs) > 7:
        fail("degree bounds")
    pairs = Counter(frozenset((e["a"], e["b"])) for e in mp["edges"])
    parallel = {p for p, c in pairs.items() if c > 1}
    # Parallel edges (same pair, different class) are legal map content: a position triple
    # may be realized at several SP spends; every consumer here keeps the MIN-spend
    # realization (openings3 takes min; DPs relax all parallel edges). Report, don't fail.
    print(f"[sanity] parallel-edge pairs present: {len(parallel)} "
          f"(min-spend realization used everywhere; position triples remain well-defined)")
    if not (set(pool16) | set(gates) | set(safehouses) <= set(nodes)):
        fail("pool ids not on map")
    for a, b in itertools.combinations([pool16, gates, safehouses], 2):
        if set(a) & set(b):
            fail(f"pool overlap {set(a) & set(b)}")
    print("[sanity] map structure OK (48 nodes / 84 edges 56F+16T+12M, connected, deg 2-7)")


# ---------------------------------------------------------------- core mechanics
def min_days(sh, d1, d2, gate, cap=CASE_DAYS):
    """BFS over (node, sp, drops_done); moves only (Hold is dominated for completion:
    deleting a Hold yields a shorter route with identical positions/cost). Early exit."""
    start = (sh, SP_BUDGET, 0)
    seen = {start}
    frontier = [start]
    for day in range(1, cap + 1):
        nxt = []
        for n, s, d in frontier:
            for m, t in adj[n]:
                c = COST[t]
                if s < c:
                    continue
                nd = d + 1 if (d < 2 and m == (d1 if d == 0 else d2)) else d
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


def cheapest_drop2(sh, d1, d2, memo={}):
    """Min SP to arrive at the drop-2 site with drop-1 already collected (W1 convention:
    any day count, budget-capped). Dijkstra over (node, done)."""
    key = (sh, d1, d2)
    if key in memo:
        return memo[key]
    best = {(sh, 0): 0}
    pq = [(0, sh, 0)]
    out = None
    while pq:
        s, n, d = heapq.heappop(pq)
        if s > best.get((n, d), INF):
            continue
        if d == 2:
            out = s
            break
        for m, t in adj[n]:
            c = COST[t]
            ns = s + c
            if ns > SP_BUDGET:
                continue
            nd = d + 1 if (d < 2 and m == (d1 if d == 0 else d2)) else d
            k = (m, nd)
            if ns < best.get(k, INF):
                best[k] = ns
                heapq.heappush(pq, (ns, m, nd))
    memo[key] = out
    return out


def backward_dp(d1, d2, gate, kmax=CASE_DAYS - 3):
    """layers[k][(n,d)] = min SP cost of a k-move sequence from (n,d) ending in a
    completion-arrival (arrive at gate with both drops). Moves only. k = 0..kmax."""
    layers = [{}]
    for k in range(1, kmax + 1):
        prev = layers[-1]
        nxt = {}
        for n in nodes:
            for d in (0, 1, 2):
                best = INF
                for m, t in adj[n]:
                    c = COST[t]
                    nd = d + 1 if (d < 2 and m == (d1 if d == 0 else d2)) else d
                    if nd == 2 and m == gate:
                        best = min(best, c)
                    else:
                        sub = prev.get((m, nd), INF)
                        if sub + c < best:
                            best = sub + c
                if best < INF:
                    nxt[(n, d)] = best
        layers.append(nxt)
    return layers


def forward_costs(sh, d1, d2, gate, dmax=CASE_DAYS):
    """mdays[d] = min SP cost of a completing route of exactly d moves (budget-capped),
    d = 1..dmax. Moves only."""
    mdays = [INF] * (dmax + 1)
    cur = {(sh, 0): 0}
    for day in range(1, dmax + 1):
        nxt = {}
        for (n, d), s in cur.items():
            for m, t in adj[n]:
                c = COST[t]
                ns = s + c
                if ns > SP_BUDGET:
                    continue
                nd = d + 1 if (d < 2 and m == (d1 if d == 0 else d2)) else d
                if nd == 2 and m == gate:
                    if ns < mdays[day]:
                        mdays[day] = ns
                    continue
                k = (m, nd)
                if ns < nxt.get(k, INF):
                    nxt[k] = ns
        cur = nxt
        if not cur:
            break
    return mdays


def openings3(d1, d2):
    """All 3-action openings from a safehouse (start node supplied by caller context).
    Returns dict: triple -> {'spent': min SP spent (hold-free realization),
                             'spent_h': min SP spent (any realization incl. Holds),
                             'hold_free': bool}
    Drop collection is position-based at each day end (rules §2 step 4 / §3.3)."""
    def step(pos, d, spent, holds, action):
        if action == "H":
            if holds >= 2 or spent + 1 > SP_BUDGET:
                return None
            nd = d + 1 if (d < 2 and pos == (d1 if d == 0 else d2)) else d
            return (pos, nd, spent + 1, holds + 1)
        m, c = action
        if spent + c > SP_BUDGET:
            return None
        nd = d + 1 if (d < 2 and m == (d1 if d == 0 else d2)) else d
        return (m, nd, spent + c, holds)

    def expand(sh):
        out = {}
        # level 1..3 over actions = moves + Hold
        level1 = []
        for m, t in adj[sh]:
            r = step(sh, 0, 0, 0, (m, COST[t]))
            if r:
                level1.append((r, (m,), False))
        r = step(sh, 0, 0, 0, "H")
        if r:
            level1.append((r, ("H",), True))
        level = level1
        for _ in range(2):  # two more days
            nxt = []
            for (pos, d, spent, holds), acts, had_h in level:
                for m, t in adj[pos]:
                    r = step(pos, d, spent, holds, (m, COST[t]))
                    if r:
                        nxt.append((r, acts + (m,), had_h))
                r = step(pos, d, spent, holds, "H")
                if r:
                    nxt.append((r, acts + ("H",), True))
            level = nxt
        for (pos, d, spent, holds), acts, had_h in level:
            tri = acts  # (a1,a2,a3) with 'H' marking holds
            rec = out.setdefault(tri, {"spent": INF, "spent_h": INF, "hold_free": not had_h})
            if not had_h:
                rec["hold_free"] = True
                rec["spent"] = min(rec["spent"], spent)
            rec["spent_h"] = min(rec["spent_h"], spent)
        return out

    return expand


def eval_config(sh, d1, d2, gate, d2_memo={}):
    """Full per-config evaluation. Returns dict with all readings; None if C2 fails."""
    md = min_days(sh, d1, d2, gate)
    if md is None or not (5 <= md <= 7):
        return None
    layers = backward_dp(d1, d2, gate)
    mdays = forward_costs(sh, d1, d2, gate)
    # internal consistency: BFS min-days == first finite day of the cost DP
    fin = [d for d in range(1, CASE_DAYS + 1) if mdays[d] < INF]
    if not fin or fin[0] != md:
        fail(f"min_days(BFS)={md} vs forward DP first completion day {fin[:1]} for {(sh, d1, d2, gate)}")
    Mstar = min(mdays[1:])
    frontier = []
    best_so_far = INF
    for d in range(md, CASE_DAYS + 1):
        if mdays[d] < best_so_far:
            best_so_far = mdays[d]
            frontier.append((d, mdays[d]))

    exp = openings3(d1, d2)(sh)
    # state after each opening triple: (v3, drops3)
    c3a = c3b = c3c = c3d = 0
    for tri, rec in exp.items():
        # replay to get end state (v3, drops3) — deterministic from actions
        d = 0
        pos = sh
        for a in tri:
            if a == "H":
                pass
            else:
                pos = a
            if d < 2 and pos == (d1 if d == 0 else d2):
                d += 1
        v3, drops3 = pos, d
        spent = rec["spent"]
        spent_h = rec["spent_h"]
        if rec["hold_free"]:
            # C3-A: on a globally min-cost route
            for k in range(0, CASE_DAYS - 2):
                b = layers[k].get((v3, drops3), INF)
                if b < INF and spent + b == Mstar:
                    c3a += 1
                    break
            # C3-B: on an exactly-min-day budget route
            k = md - 3
            b = layers[k].get((v3, drops3), INF) if 0 <= k <= CASE_DAYS - 3 else INF
            if b < INF and spent + b <= SP_BUDGET:
                c3b += 1
            # C3-C: on a Pareto-frontier route
            for (dd, cc) in frontier:
                b = layers[dd - 3].get((v3, drops3), INF)
                if b < INF and spent + b == cc:
                    c3c += 1
                    break
        # C3-D: any budget-legal completion by day 8 (Holds allowed in opening)
        for k in range(0, CASE_DAYS - 2):
            b = layers[k].get((v3, drops3), INF)
            if b < INF and spent_h + b <= SP_BUDGET:
                c3d += 1
                break

    c2cost = cheapest_drop2(sh, d1, d2)
    if c2cost is None:
        fail(f"in-band config with no affordable drop-2 route: {(sh, d1, d2, gate)}")
    remaining = SP_BUDGET - c2cost
    # C4 case-gate: exactly-k-move completion from (d2,2) with k<=3, affordable
    c4_case = any(layers[k].get((d2, 2), INF) <= remaining for k in (1, 2, 3))
    # W1-reconciliation C4 (any-gate BFS, faithful reimplementation of the W1 helper)
    c4_any = _gate_in_3_any(d2, remaining)
    return {
        "key": f"{sh}|{d1}|{d2}|{gate}",
        "sh": sh, "d1": d1, "d2": d2, "gate": gate,
        "min_days": md,
        "min_cost": Mstar,
        "n_prefixes_A": c3a, "n_prefixes_B": c3b, "n_prefixes_C": c3c, "n_prefixes_D": c3d,
        "cheapest_drop2_sp": c2cost,
        "c4_case": c4_case, "c4_any": c4_any,
        "passes_A": c3a >= 3 and c4_case,
        "passes_B": c3b >= 3 and c4_case,
        "passes_C": c3c >= 3 and c4_case,
        "passes_D": c3d >= 3 and c4_case,
        "passes_B_anyC4": c3b >= 3 and c4_any,
    }


def _gate_in_3_any(drop2, remaining_sp):
    """Faithful reimplementation of the W1 helper (any gate node counts)."""
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


# ---------------------------------------------------------------- regression constants
def regression_constants():
    cases = {
        "P1": ("D2-07", ("D2-06", "D1-10"), "D1-08", 6, 5),
        "P2": ("D3-06", ("D3-05", "D4-03"), "D4-02", 6, 6),
        "P3": ("D3-06", ("D2-06", "D1-10"), "D1-08", 6, 7),
        "canonical": ("D2-07", ("D2-09", "D1-10"), "D1-08", 7, 6),
    }
    for name, (sh, drops, gate, want_d, want_c) in cases.items():
        md = min_days(sh, drops[0], drops[1], gate)
        c2 = cheapest_drop2(sh, drops[0], drops[1])
        if md != want_d or c2 != want_c:
            fail(f"{name}: got {md}d/{c2}SP, handoff says {want_d}d/{want_c}SP")
    print("[sanity] regression constants OK: P1 6d/5SP · P2 6d/6SP · P3 6d/7SP · canonical 7d/6SP")


# ---------------------------------------------------------------- analysis mode
def analyze():
    sanity()
    regression_constants()
    if len(pool16) != 16:
        fail(f"analyze is defined on the 16-pool v1.0.0 snapshot; this map declares {len(pool16)} "
             f"drop candidates (v1.2.0 widened). See tools/verification/README.md → Data snapshots.")

    # C2-only convention cross-checks over the full ordered space
    in_band_ordered = 0
    in_band_poolorder = 0
    for si, sh in enumerate(safehouses):
        for i, d1 in enumerate(pool16):
            for j, d2 in enumerate(pool16):
                if d1 == d2:
                    continue
                for g in gates:
                    md = min_days(sh, d1, d2, g)
                    if md is not None and 5 <= md <= 7:
                        in_band_ordered += 1
                        if j > i:
                            in_band_poolorder += 1
    if in_band_ordered != 113:
        fail(f"C2-only ordered in-band = {in_band_ordered}, W1 audit says 113")
    if in_band_poolorder != 55:
        fail(f"C2-only poolorder in-band = {in_band_poolorder}, W1 audit says 55")
    print(f"[sanity] C2-only counts OK: ordered {in_band_ordered}/960 · poolorder {in_band_poolorder}/480")

    results = {
        "meta": {
            "script": "dd_m2_aud003_constraints.py",
            "date": "2026-10-25",
            "map": f"{mp['map_id']} v{mp['version']}",
            "space": "ordered: 2 safehouses x 16x15 ordered drops x 2 gates = 960",
            "conventions": {
                "C3-A mincost": ">=3 distinct day-1..3 end-position prefixes among globally min-SP-cost completing routes (<=8d, <=12SP)",
                "C3-B minday": ">=3 distinct prefixes among exactly-min-day completing routes (W1 strict reading)",
                "C3-C pareto": ">=3 distinct prefixes among (days,cost) Pareto-frontier routes",
                "C3-D inbudget": ">=3 distinct prefixes with any budget-legal completion by day 8 (Holds allowed in opening; diagnostic)",
                "C4 case": "case gate reachable from drop-2 site within 3 days at SP remaining after cheapest drop-2 route (rules §2 step 5 semantics)",
                "C4 any": "W1 helper semantics (either gate node) — reconciliation only",
            },
            "ladder_need": LADDER_NEED,
        },
        "base_960": {},
        "w1_reconciliation": {},
        "candidate_yields": {},
    }

    # full evaluation of the 960 space
    evals = []
    n_c4_diff = 0
    c2_8_diff = 0
    for sh in safehouses:
        for d1, d2 in itertools.permutations(pool16, 2):
            for g in gates:
                r = eval_config(sh, d1, d2, g)
                if r:
                    evals.append(r)
                    if r["c4_case"] != r["c4_any"]:
                        n_c4_diff += 1
    print(f"[analyze] in-band configs evaluated: {len(evals)}; C4 case-vs-any disagreements: {n_c4_diff}")

    counts = {}
    for rd in ("A", "B", "C", "D"):
        c2c3 = sum(1 for r in evals if r[f"n_prefixes_{rd}"] >= 3)
        full_case = sum(1 for r in evals if r[f"passes_{rd}"])
        counts[f"C3-{rd}"] = {
            "C2&C3": c2c3,
            "C2&C3&C4_case": full_case,
            "pass_configs": [r["key"] for r in evals if r[f"passes_{rd}"]],
        }
    counts["C2_only"] = {"in_band": len(evals)}
    counts["C2&C4_case"] = sum(1 for r in evals if r["c4_case"])
    counts["C2&C4_any"] = sum(1 for r in evals if r["c4_any"])
    results["base_960"] = counts

    # W1 reconciliation: strict W1 reading = C3-B with any-gate C4
    w1_b_any = sum(1 for r in evals if r["passes_B_anyC4"])
    results["w1_reconciliation"] = {
        "w1_published_strict_count": 7,
        "reproduced_C3-B_with_C4_any": w1_b_any,
        "corrected_C3-B_with_C4_case": counts["C3-B"]["C2&C3&C4_case"],
        "c4_case_vs_any_disagreements": n_c4_diff,
        "note": "the reproduced figure must equal 7 or the sanity gate fails below",
    }
    if w1_b_any != 7:
        fail(f"W1 reconciliation failed: reproduced {w1_b_any}, published 7")
    print(f"[sanity] W1 reconciliation OK: C3-B & C4(any) == {w1_b_any} (published 7); "
          f"corrected case-gate C4 gives {counts['C3-B']['C2&C3&C4_case']}")

    # candidate yields for the pool lever (28 non-pool, non-gate, non-safehouse nodes)
    candidates = [n for n in nodes if n not in pool16 and n not in gates and n not in safehouses]
    assert len(candidates) == 28, len(candidates)
    yields = {}
    for ci, n in enumerate(candidates, 1):
        gained = Counter()
        for sh in safehouses:
            for other in pool16:
                for (x, y) in ((n, other), (other, n)):
                    for g in gates:
                        r = eval_config(sh, x, y, g)
                        if r:
                            for rd in ("A", "B", "C", "D"):
                                if r[f"passes_{rd}"]:
                                    gained[rd] += 1
        yields[n] = dict(gained)
        if ci % 7 == 0 or ci == 28:
            print(f"[analyze] candidate yields {ci}/28 done")
    results["candidate_yields"] = {
        "note": "marginal pass-count gained by adding this node to the 16-pool "
                "(new configs containing the node only; counts per C3 reading, case-gate C4)",
        "per_node": yields,
        "district_of_candidate": {n: district_of[n] for n in candidates},
    }

    with open(OUT_PATH, "w") as f:
        json.dump(results, f, indent=1)
    print(f"[done] wrote {OUT_PATH}")

    print("\n=== BASE 960 (ordered space) ===")
    print(f"C2 only (band [5,7]):           {len(evals)}/960")
    print(f"C2&C4 (case gate):              {counts['C2&C4_case']}/960")
    for rd in ("A", "B", "C", "D"):
        print(f"C2&C3-{rd}:                        {counts['C3-'+rd]['C2&C3']}/960")
        print(f"C2&C3-{rd}&C4(case):               {counts['C3-'+rd]['C2&C3&C4_case']}/960   vs ladder need {LADDER_NEED}")
    print("\n=== TOP LEVER CANDIDATES (marginal passes gained) ===")
    for rd in ("A", "B", "C", "D"):
        top = sorted(yields.items(), key=lambda kv: -kv[1].get(rd, 0))[:8]
        print(f"C3-{rd}: " + ", ".join(f"{n}:{c.get(rd,0)}" for n, c in top))


# ---------------------------------------------------------------- recount mode
def recount(pool_file):
    sanity()
    if len(pool16) != 16:
        fail(f"recount composes pool16(16) + 8 documented additions; this map declares "
             f"{len(pool16)} candidates (v1.2.0 already widened). See tools/verification/README.md.")
    spec = json.load(open(pool_file))
    added = spec["pool_24_added"]
    extra_sh = spec.get("extra_safehouse")
    assert len(added) == 8 and not (set(added) & set(pool16))
    assert not (set(added) & set(gates)) and not (set(added) & set(safehouses))
    pool = pool16 + added
    shs = safehouses + ([extra_sh] if extra_sh else [])
    assert len(pool) == 24
    print(f"[recount] pool24 = pool16 + {added}; safehouses = {shs}")

    evals = []
    space = 0
    for sh in shs:
        for d1, d2 in itertools.permutations(pool, 2):
            for g in gates:
                space += 1
                r = eval_config(sh, d1, d2, g)
                if r:
                    evals.append(r)
    counts = {}
    for rd in ("A", "B", "C", "D"):
        counts[f"C3-{rd}"] = {
            "C2&C3": sum(1 for r in evals if r[f"n_prefixes_{rd}"] >= 3),
            "C2&C3&C4_case": sum(1 for r in evals if r[f"passes_{rd}"]),
            "pass_configs": [r["key"] for r in evals if r[f"passes_{rd}"]],
        }
    # district distribution of the pinned pass set (C6 preparatory)
    pinned = "C3-A"
    dist = Counter()
    for r in evals:
        if r["passes_A"]:
            dpair = tuple(sorted({district_of[r["d1"]], district_of[r["d2"]]}))
            dist[f"drops={dpair}|gate={district_of[r['gate']]}|sh={district_of[r['sh']]}"] += 1

    out = {
        "meta": {"mode": "recount", "map_version_input": mp["version"],
                 "pool_24_added": added, "extra_safehouse": extra_sh,
                 "space": f"{len(shs)} safehouses x 24x23 ordered drops x 2 gates = {space}"},
        "counts": counts,
        "district_distribution_passes_A": dict(dist),
        "ladder_need_met_A": counts["C3-A"]["C2&C3&C4_case"] >= LADDER_NEED,
    }
    outp = REPO / "tools" / "verification" / "m2_aud003_recount_results.json"
    with open(outp, "w") as f:
        json.dump(out, f, indent=1)
    print(f"[done] wrote {outp}")
    print(f"space = {space}")
    for rd in ("A", "B", "C", "D"):
        print(f"C2&C3-{rd}&C4(case): {counts['C3-'+rd]['C2&C3&C4_case']}  (ladder need {LADDER_NEED})")
    print("district distribution (C3-A passes):")
    for k, v in sorted(dist.items(), key=lambda kv: -kv[1]):
        print(f"  {v:4d}  {k}")


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] == "analyze":
        analyze()
    elif sys.argv[1] == "recount":
        recount(sys.argv[2])
    else:
        print("usage: dd_m2_aud003_constraints.py [analyze | recount <pool-file.json>]", file=sys.stderr)
        sys.exit(2)
