#!/usr/bin/env python3
"""
Dead Drop — M2 Week-2 pre-flight: engine fixture emitter (verification tool, NOT game code).

Emits the engine package's L1 acceptance fixtures (09-testing §1 / m2/M2-execution-plan.md W2
task 4), computed by the SAME pinned machinery as `dd_m2_aud003_constraints.py` (the M2 W1
oracle): per-config gate values for every configuration passing the pinned conjunction
C2 ∧ C3-A ∧ C4 over the full ordered 2208-space of map_alpha v1.2.0 (24-pool).

Core functions are copied verbatim from dd_m2_aud003_constraints.py (module docstring there
pins the semantics; m2/aud003-constraint-analysis.md §1/§6 is the normative rationale). The
only deltas are:
  - pools are read from the CURRENT v1.2.0 map (24 candidates) instead of the 16-pool snapshot;
  - a `c4_margin_days` field (min k ∈ {1,2,3} reaching the case gate affordably — C5 report
    field, aud003 §6) is added per config;
  - everything is cross-asserted against the committed `m2_aud003_recount_results.json`:
    pass count == 115 AND the pass-key set is IDENTICAL, or the script exits 1.

Outputs (written into the engine package so the fixtures travel with the code):
  packages/engine/fixtures/valid-configs.json     — 115 configs with measured gate values
  packages/engine/fixtures/regression-cases.json  — the four paper-verified constants (handoff §3)

Pure stdlib. Exits non-zero on any failed gate (no silent fudging).
"""
import json
import heapq
import itertools
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MAP_PATH = REPO / "assets" / "sample_map_alpha.json"
RECOUNT_PATH = REPO / "tools" / "verification" / "m2_aud003_recount_results.json"
OUT_DIR = REPO / "packages" / "engine" / "fixtures"

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
pool = list(mp["drop_candidates"])
gates = list(mp["gates"])
safehouses = list(mp["safehouses"])

LADDER_NEED = 24


def fail(msg):
    print(f"[SANITY-GATE FAILURE] {msg}", file=sys.stderr)
    sys.exit(1)


# ------------------------------------------------------- sanity (v1.2.0 gates)
def sanity():
    if mp["version"] != "1.2.0":
        fail(f"emitter is defined on map v1.2.0 (24-pool); this asset declares v{mp['version']}")
    if len(nodes) != 48 or len(mp["edges"]) != 84:
        fail("map structure 48/84")
    from collections import Counter
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
    if len(pool) != 24:
        fail(f"expected the widened 24-pool, found {len(pool)}")
    if not (set(pool) | set(gates) | set(safehouses) <= set(nodes)):
        fail("pool ids not on map")
    for a, b in itertools.combinations([pool, gates, safehouses], 2):
        if set(a) & set(b):
            fail(f"pool overlap {set(a) & set(b)}")
    print("[sanity] map v1.2.0 OK (48/84 = 56F+16T+12M, connected, deg 2-7, pools disjoint, 24 candidates)")


# ------------------------------------------------------- core (verbatim port)
def min_days(sh, d1, d2, gate, cap=CASE_DAYS):
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


def cheapest_drop2(sh, d1, d2, memo=None):
    if memo is None:
        memo = {}
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
        level1 = []
        for m, t in adj[sh]:
            r = step(sh, 0, 0, 0, (m, COST[t]))
            if r:
                level1.append((r, (m,), False))
        r = step(sh, 0, 0, 0, "H")
        if r:
            level1.append((r, ("H",), True))
        level = level1
        for _ in range(2):
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
            tri = acts
            rec = out.setdefault(tri, {"spent": INF, "spent_h": INF, "hold_free": not had_h})
            if not had_h:
                rec["hold_free"] = True
                rec["spent"] = min(rec["spent"], spent)
            rec["spent_h"] = min(rec["spent_h"], spent)
        return out

    return expand


def eval_config(sh, d1, d2, gate):
    """Per-config evaluation (pinned reading only — C3-A + case-gate C4).
    Returns None if C2 fails; otherwise the C5-shaped record."""
    md = min_days(sh, d1, d2, gate)
    if md is None or not (5 <= md <= 7):
        return None
    layers = backward_dp(d1, d2, gate)
    mdays = forward_costs(sh, d1, d2, gate)
    fin = [d for d in range(1, CASE_DAYS + 1) if mdays[d] < INF]
    if not fin or fin[0] != md:
        fail(f"min_days(BFS)={md} vs forward DP first completion day {fin[:1]} for {(sh, d1, d2, gate)}")
    Mstar = min(mdays[1:])

    exp = openings3(d1, d2)(sh)
    c3a = 0
    for tri, rec in exp.items():
        d = 0
        pos = sh
        for a in tri:
            if a != "H":
                pos = a
            if d < 2 and pos == (d1 if d == 0 else d2):
                d += 1
        v3, drops3 = pos, d
        spent = rec["spent"]
        if rec["hold_free"]:
            for k in range(0, CASE_DAYS - 2):
                b = layers[k].get((v3, drops3), INF)
                if b < INF and spent + b == Mstar:
                    c3a += 1
                    break

    c2cost = cheapest_drop2(sh, d1, d2)
    if c2cost is None:
        fail(f"in-band config with no affordable drop-2 route: {(sh, d1, d2, gate)}")
    remaining = SP_BUDGET - c2cost
    c4_case = False
    c4_margin = None
    for k in (1, 2, 3):
        b = layers[k].get((d2, 2), INF)
        if b <= remaining:
            c4_case = True
            c4_margin = k
            break
    return {
        "key": f"{sh}|{d1}|{d2}|{gate}",
        "safehouse": sh, "drop1": d1, "drop2": d2, "gate": gate,
        "min_days": md,
        "min_cost_sp": Mstar,
        "n_prefixes": c3a,
        "cheapest_drop2_sp": c2cost,
        "c4_case": c4_case,
        "c4_margin_days": c4_margin,
        "passes": c3a >= 3 and c4_case,
    }


# ------------------------------------------------------- regression constants
def regression_constants():
    cases = {
        "P1": ("D2-07", ("D2-06", "D1-10"), "D1-08", 6, 5),
        "P2": ("D3-06", ("D3-05", "D4-03"), "D4-02", 6, 6),
        "P3": ("D3-06", ("D2-06", "D1-10"), "D1-08", 6, 7),
        "canonical": ("D2-07", ("D2-09", "D1-10"), "D1-08", 7, 6),
    }
    out = []
    for name, (sh, drops, gate, want_d, want_c) in cases.items():
        md = min_days(sh, drops[0], drops[1], gate)
        c2 = cheapest_drop2(sh, drops[0], drops[1])
        if md != want_d or c2 != want_c:
            fail(f"{name}: got {md}d/{c2}SP, handoff says {want_d}d/{want_c}SP")
        out.append({"case": name, "safehouse": sh, "drops": list(drops), "gate": gate,
                    "min_days": md, "cheapest_drop2_sp": c2})
    print("[sanity] regression constants OK: P1 6d/5SP · P2 6d/6SP · P3 6d/7SP · canonical 7d/6SP")
    return out


# ------------------------------------------------------- main
def main():
    sanity()
    constants = regression_constants()

    evals = []
    space = 0
    c2_only = 0
    for sh in safehouses:
        for d1, d2 in itertools.permutations(pool, 2):
            for g in gates:
                space += 1
                r = eval_config(sh, d1, d2, g)
                if r:
                    c2_only += 1
                    if r["passes"]:
                        evals.append(r)

    passes = [r for r in evals if r["passes"]]
    print(f"[emit] space={space} · C2-only in-band (ordered, 24-pool): {c2_only} "
          f"[new fact, convention named: ordered drops, v1.2.0 pool] · pinned passes: {len(passes)}")

    # ---- cross-check against the committed recount (independent run, M2 W1)
    recount = json.load(open(RECOUNT_PATH))
    ref = recount["counts"]["C3-A"]["pass_configs"]
    got = [r["key"] for r in passes]
    if len(got) != 115:
        fail(f"pinned pass count {len(got)} != 115")
    if set(got) != set(ref):
        only_got = sorted(set(got) - set(ref))[:5]
        only_ref = sorted(set(ref) - set(got))[:5]
        fail(f"pass-set mismatch vs recount JSON: only-here {only_got}… only-ref {only_ref}…")
    if recount["counts"]["C3-A"]["C2&C3&C4_case"] != 115 or space != 2208:
        fail("recount meta inconsistency")
    print("[crosscheck] pass set IDENTICAL to m2_aud003_recount_results.json (115/115, order aside)")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    valid = {
        "meta": {
            "generator": "dd_m2_emit_fixtures.py",
            "date": "2026-10-25",
            "map": f"{mp['map_id']} v{mp['version']}",
            "ruleset": "1.0.0-alpha.1",
            "space": "ordered: 2 safehouses x 24x23 distinct drops x 2 gates = 2208",
            "reading": "C3-A (globally minimal-SP-cost completing routes, days 1-3 end-position "
                       "prefixes >= 3) + case-gate C4 — pinned per m2/aud003-constraint-analysis.md §1/§6",
            "c2_only_in_band_ordered_24pool": c2_only,
            "crosscheck": {
                "against": "tools/verification/m2_aud003_recount_results.json (independent M2-W1 run)",
                "pass_count": len(got),
                "pass_set_identical": True,
            },
            "usage": "L1 fixture for @dead-drop/engine: the TS feasibility gate must reproduce "
                     "every record here exactly (dual-language reconciliation).",
        },
        "pass_count": len(got),
        "configs": sorted(evals, key=lambda r: (not r["passes"], r["key"])),
    }
    out1 = OUT_DIR / "valid-configs.json"
    with open(out1, "w") as f:
        json.dump(valid, f, indent=1)
    print(f"[done] wrote {out1} ({len(got)} passing configs with measured gate values)")

    reg = {
        "meta": {
            "generator": "dd_m2_emit_fixtures.py",
            "date": "2026-10-25",
            "source": "m1/m2-handoff.md §3 (paper-verified constants); oracle "
                      "tools/verification/dd_m1_w1_validation.py",
            "usage": "L1 fixture: engine BFS/Dijkstra must reproduce min_days and "
                     "cheapest_drop2_sp for every case exactly.",
        },
        "cases": constants,
    }
    out2 = OUT_DIR / "regression-cases.json"
    with open(out2, "w") as f:
        json.dump(reg, f, indent=1)
    print(f"[done] wrote {out2} (4 regression constants)")


if __name__ == "__main__":
    main()
