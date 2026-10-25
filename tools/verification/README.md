# Verification Scripts (offline, deterministic)

**Status:** kept for M2 regression reuse · **Language:** pure Python 3 (stdlib only — no
dependencies, by project constraint) · **These are verification tools, not simulations.**
No balance simulation has been run anywhere in this project (04-balance-sim §4 is the M2 plan).

| File | Purpose | Output |
|---|---|---|
| `dd_map_and_calcs.py` | Planning-phase analysis: generated map_alpha v1.1 (48 nodes / 84 edges), BFS feasibility search, closed-form information algebra. Source of the original [computed] claims. | stdout + `balance_calc_results.json` |
| `dd_m1_w1_validation.py` | M1 Week-1 **independent** verification harness — re-derives every mechanical claim from `assets/sample_map_alpha.json` (the declared source of truth), deliberately NOT a re-run of `dd_map_and_calcs.py`. | stdout + `m1_w1_validation_results.json` |
| `dd_m1_kit_map.py` | Generates the printable paper-prototype map (A4-landscape HTML/SVG) from the canonical JSON. | `m1/kit/map_print.html` |
| `balance_calc_results.json` | Raw planning-phase results (feasibility counts, information algebra). | — |
| `m1_w1_validation_results.json` | Raw Week-1 verification results (map structure, 14/14 worked-example edges, stamina ledger, counting conventions). | — |

## Re-running

```bash
python3 dd_m1_w1_validation.py   # expects assets/sample_map_alpha.json at the repo-relative path
```

## Conventions worth knowing (from the M1 audit, AUD-002)

Feasibility counts are **counting-convention dependent**: "55/480" = unordered drop enumeration
with order fixed by pool position; the generator-relevant ordered space is 113/960 (~11.8%, same
rate). Any M2 code that recounts must name its convention in its output.

## M2 reuse contract

`dd_m1_w1_validation.py` doubles as the regression harness for the paper-playtest constants
(P1 6d/5SP, P2 6d/6SP, P3 6d/7SP, canonical 7d/6SP). When the M2 engine lands, the same constants
must be asserted by engine fixtures (09-testing §1) — the script remains the independent oracle.
