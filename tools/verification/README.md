# Verification Scripts (offline, deterministic)

**Status:** kept for M2 regression reuse · **Language:** pure Python 3 (stdlib only — no
dependencies, by project constraint) · **These are verification tools, not simulations.**
No balance simulation has been run anywhere in this project (04-balance-sim §4 is the M2 plan).

| File | Purpose | Output |
|---|---|---|
| `dd_map_and_calcs.py` | Planning-phase analysis: generated map_alpha v1.1 (48 nodes / 84 edges), BFS feasibility search, closed-form information algebra. Source of the original [computed] claims. | stdout + `balance_calc_results.json` |
| `dd_m1_w1_validation.py` | M1 Week-1 **independent** verification harness — re-derives every mechanical claim from `assets/sample_map_alpha.json` (the declared source of truth), deliberately NOT a re-run of `dd_map_and_calcs.py`. | stdout + `m1_w1_validation_results.json` |
| `dd_m1_kit_map.py` | Generates the printable paper-prototype map (A4-landscape HTML/SVG) from the canonical JSON. | `m1/kit/map_print.html` |
| `dd_m2_aud003_constraints.py` | **M2 W1 / AUD-003**: pins generator-constraint semantics; counts C2∧C3∧C4 under four named C3 readings; W1 reconciliation; candidate yields for the pool lever; exact widened-space recount. Modes: `analyze` (16-pool snapshot) / `recount <pool-file>`. | stdout + `m2_aud003_results.json`, `m2_aud003_recount_results.json` |
| `m2_aud003_results.json` | Raw base-960 counts + per-candidate lever yields (conventions named in `meta`). | — |
| `m2_aud003_recount_results.json` | Raw pool-24 recount (2208-space): 115/2208 pass under the pinned reading; district distribution. | — |
| `m2_aud003_pool24.json` | The lever's selection record: 8 added nodes + the selection rule (choice made outside the script, auditable). | — |
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

## Data snapshots (important since map v1.2.0)

The canonical map asset (`assets/sample_map_alpha.json`) was bumped to **v1.2.0** at M2 W1:
drop-candidate pool 16→24 (the pre-authorized content lever; see `m2/aud003-constraint-analysis.md`
§4 and the JSON's `notes` field). Consequences for the scripts here:

- `dd_m2_aud003_constraints.py` (`analyze` and `recount`) is defined on the **v1.0.0 16-pool
  snapshot** and gates on it — it fails loudly if handed the widened map. To re-run it, check out
  the v1.0.0 asset from git history (the commit before the v1.2.0 bump) and point the script at
  it; all its published numbers (8/960 base, 115/2208 widened, W1 reconciliation 7) were produced
  on that snapshot and are recorded in the result JSONs' `meta`.
- `dd_m1_w1_validation.py` and `m1_w1_validation_results.json` are M1-era artifacts tied to the
  v1.0.0 snapshot; they are kept byte-for-byte as provenance (its C4 helper's either-gate laxity
  is documented in `m1/w1-rules-audit.md` §8 — do not silently patch). Its four regression
  constants are pool-independent and were re-verified on v1.2.0 by the M2 script's sanity gate.
- `m1/kit/map_print.html` shows 16 drop-candidate glyphs (v1.0.0 data) and remains valid for the
  paper-playtest cases P1–P3 (all 16-pool members); regenerate only if a future case uses a
  v1.2.0-added candidate.
