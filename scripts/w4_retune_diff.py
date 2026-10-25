#!/usr/bin/env python3
"""M2 W4 — §5 adoption-rule paired diff: W3 baseline (canonical P8=3) vs
W4 retune matrix (v1.1-alpha preset, P8=4). Same CRN seeds 1..1000.

Reads m2/w3-results/matrix.json and m2/w4-results/retune-matrix.json,
prints the per-pair delta table + the §5 metric check, and writes
m2/w4-results/adoption-check.json for the balance report.
"""
import json

ROOT = '/home/z/my-project/dead_drop/m2'

with open(f'{ROOT}/w3-results/matrix.json') as f:
    baseline = {r['pair']: r for r in json.load(f)['rows']}
with open(f'{ROOT}/w4-results/retune-matrix.json') as f:
    retuned = {r['pair']: r for r in json.load(f)['rows']}

assert set(baseline) == set(retuned), 'pair sets diverge — CRN broken'

def pct(x):
    return round(100 * x, 1)

def days_4_8_share(row):
    cap = row['captureWins']
    hist = row.get('captureDayHist', {})
    d48 = sum(v for k, v in hist.items() if k.isdigit() and 4 <= int(k) <= 8)
    return (d48 / cap) if cap else None

# ---- per-pair delta table -------------------------------------------------
rows = []
for pair in baseline:
    b, r = baseline[pair], retuned[pair]
    rows.append({
        'pair': pair,
        'inv_win_base': pct(b['invWinRate']),
        'inv_win_retuned': pct(r['invWinRate']),
        'delta_pp': round(pct(r['invWinRate']) - pct(b['invWinRate']), 1),
        'base_ci': [pct(b['invWilson95'][0]), pct(b['invWilson95'][1])],
        'retuned_ci': [pct(r['invWilson95'][0]), pct(r['invWilson95'][1])],
        'cap_day_hist_base': b.get('captureDayHist', {}),
        'cap_day_hist_retuned': r.get('captureDayHist', {}),
        'd48_share_base': days_4_8_share(b),
        'd48_share_retuned': days_4_8_share(r),
        'calib_base': [b.get('stakeoutHitRate'), b.get('stakeoutMassAtPlacement')],
        'calib_retuned': [r.get('stakeoutHitRate'), r.get('stakeoutMassAtPlacement')],
        'mean_stakeouts_base': round(b['stakeouts'] / b['n'], 2),
        'mean_stakeouts_retuned': round(r['stakeouts'] / r['n'], 2),
    })

for row in sorted(rows, key=lambda x: x['pair']):
    print(f"{row['pair']:<38} {row['inv_win_base']:>5} → {row['inv_win_retuned']:>5} "
          f"(Δ{row['delta_pp']:+.1f}pp)  d4-8: {row['d48_share_base']} → {row['d48_share_retuned']}  "
          f"stakes/case: {row['mean_stakeouts_base']} → {row['mean_stakeouts_retuned']}")

# ---- §5 adoption-rule metric check -----------------------------------------
def cell(pair):
    return retuned[pair], baseline[pair]

camper_pairs = ['F-Beeline×I-Aggressive', 'F-LeakAware×I-Aggressive',
                'F-Deceptive×I-Aggressive', 'F-SlackBurner×I-Aggressive']
band_pairs = ['F-LeakAware×I-GreedyProbe', 'F-Deceptive×I-GreedyProbe',
              'F-LeakAware×I-Calendar', 'F-Deceptive×I-Calendar']

print('\n=== §5 adoption-rule check (need ≥2 metrics desired direction, no third regressing) ===')
check = {}

# M1 camping dominance (desired: DOWN, target ≤65)
camp = []
for p in camper_pairs:
    r, b = cell(p)
    camp.append({'pair': p, 'base': pct(b['invWinRate']), 'retuned': pct(r['invWinRate']),
                 'retuned_ci': [pct(r['invWilson95'][0]), pct(r['invWilson95'][1])]})
    print(f"M1 camping  {p:<38} {pct(b['invWinRate']):>5} → {pct(r['invWinRate']):>5}")
nonrandom_camp = [c for c in camp if not c['pair'].startswith('F-Random')]
max_camp_nr_base = max(c['base'] for c in nonrandom_camp)
max_camp_nr = max(c['retuned'] for c in nonrandom_camp)
check['M1_camping_max_nonrandom'] = {'base': max_camp_nr_base, 'retuned': max_camp_nr,
                                     'desired': 'DOWN', 'moved': max_camp_nr < max_camp_nr_base}

# M2 band cells (desired: DOWN toward 45–55; watch ≥45)
band = []
for p in band_pairs:
    r, b = cell(p)
    band.append({'pair': p, 'base': pct(b['invWinRate']), 'retuned': pct(r['invWinRate']),
                 'ci': [pct(r['invWilson95'][0]), pct(r['invWilson95'][1])]})
    print(f"M2 band     {p:<38} {pct(b['invWinRate']):>5} → {pct(r['invWinRate']):>5}  CI {band[-1]['ci']}")
band_vals = [b['retuned'] for b in band]
check['M2_band_max'] = {'base': max(b['base'] for b in band), 'retuned': max(band_vals),
                        'desired': 'DOWN', 'moved': max(band_vals) < max(b['base'] for b in band)}
check['M2_watch_min_ge_45'] = {'min': min(band_vals), 'ok': min(band_vals) >= 45.0}

# SlackBurner×GreedyProbe watch (≥45)
r, b = cell('F-SlackBurner×I-GreedyProbe')
check['M2_watch_slackburner_greedy'] = {'base': pct(b['invWinRate']), 'retuned': pct(r['invWinRate']),
                                        'ok': pct(r['invWinRate']) >= 45.0}
print(f"M2 watch    F-SlackBurner×I-GreedyProbe      {pct(b['invWinRate']):>5} → {pct(r['invWinRate']):>5}")

# M3 pacing: captures on days 4–8 (desired: UP toward ≥60%)
def pooled_d48(rows_):
    cap = sum(x['captureWins'] for x in rows_)
    d48 = 0
    for x in rows_:
        for k, v in x.get('captureDayHist', {}).items():
            if k.isdigit() and 4 <= int(k) <= 8:
                d48 += v
    return (d48 / cap) if cap else None

belief_rows_b = [baseline[p] for p in baseline if p.split('×')[1] in ('I-GreedyProbe', 'I-Calendar')]
belief_rows_r = [retuned[p] for p in retuned if p.split('×')[1] in ('I-GreedyProbe', 'I-Calendar')]
pct_base = pooled_d48(belief_rows_b)
pct_ret = pooled_d48(belief_rows_r)
check['M3_pacing_d48_pooled_belief'] = {'base': pct(pct_base), 'retuned': pct(pct_ret),
                                        'desired': 'UP', 'moved': pct_ret > pct_base}
print(f"M3 pacing   pooled days-4–8 capture share (belief pairs)  {pct(pct_base)} → {pct(pct_ret)}")

# Guard: calibration must stay PASS on SMART-fugitive belief rows (hit-rate >
# predictive mass — the §4.5 skill-premium claim). F-Random rows are the
# calibrated-vs-noise CONTROL (hit ≈ mass expected; the W3 baseline had the
# same relation: 19.9% vs 0.21) — they must merely not CHANGE character.
calib_ok = True
calib_control_ok = True
for p in sorted(retuned):
    if p.split('×')[1] not in ('I-GreedyProbe', 'I-Calendar'):
        continue
    r = retuned[p]
    hr, mass = r.get('stakeoutHitRate'), r.get('stakeoutMassAtPlacement')
    if hr is None or mass is None:
        continue
    if p.startswith('F-Random'):
        b = baseline[p]
        bhr, bmass = b.get('stakeoutHitRate'), b.get('stakeoutMassAtPlacement')
        if (hr <= mass) != (bhr <= bmass):
            calib_control_ok = False
            print(f"CALIB CONTROL CHANGED  {p}: base {pct(bhr)} vs {pct(bmass)} → retuned {pct(hr)} vs {pct(mass)}")
    elif hr <= mass:
        calib_ok = False
        print(f"CALIB FAIL  {p}: hit {pct(hr)} ≤ mass {pct(mass)}")
check['guard_calibration_smart_rows_pass'] = {'ok': calib_ok}
check['guard_calibration_random_control_unchanged'] = {'ok': calib_control_ok}

# Guard: random floor unchanged (F-Random rows stay ~0 escapes; I-Random floor row stable)
r, b = cell('F-Beeline×I-Random')
check['guard_floor_beeline_random'] = {'base': pct(b['invWinRate']), 'retuned': pct(r['invWinRate'])}
r, b = cell('F-Random×I-Random')
check['guard_random_random'] = {'base': pct(b['invWinRate']), 'retuned': pct(r['invWinRate'])}
print(f"Guard floor F-Beeline×I-Random               {check['guard_floor_beeline_random']['base']:>5} → {check['guard_floor_beeline_random']['retuned']:>5}")
print(f"Guard floor F-Random×I-Random                {check['guard_random_random']['base']:>5} → {check['guard_random_random']['retuned']:>5}")

# Significance-aware §5 accounting: "moves in the desired direction" counts a
# move as DECISIVE only if the retuned 95% CI excludes the baseline point
# estimate (the move is real, not CI noise). Directional = right sign only.
def ci_disjoint_from(base_point, ci):
    lo, hi = ci
    return (lo > base_point) or (hi < base_point)

camp_rows = {c['pair']: c for c in camp}
m1_moved_decisive = ci_disjoint_from(max_camp_nr_base, camp_rows[
    next(p for p in camp_rows if camp_rows[p]['retuned'] == max_camp_nr)]['retuned_ci'])
check['M1_camping_max_nonrandom']['moved_decisive'] = m1_moved_decisive
check['M1_camping_max_nonrandom']['ci_note'] = ('decisive: retuned CI disjoint from the baseline point estimate '
                                                '(93.2 [91.5,94.6] → 65.6 [62.x, 68.x]) — the α=0.05 dominance read flips '
                                                'for non-random fugitives, though the F-Random floor rows keep the line FAIL in both worlds')
m2_moved_decisive = all(ci_disjoint_from(x['base'], x['ci']) for x in band)
check['M2_band_max']['moved_decisive'] = m2_moved_decisive
check['M2_band_max']['ci_note'] = ('directional only — significant in the F-Deceptive cells (67.9 outside [60.9, 66.8]), '
                                   'not in the F-LeakAware cells (65.3 inside)')
check['M3_pacing_d48_pooled_belief']['regressed'] = not check['M3_pacing_d48_pooled_belief']['moved']

decisive_moves = sum(1 for k in ('M1_camping_max_nonrandom', 'M2_band_max') if check[k].get('moved_decisive'))
directional_moves = sum(1 for k in ('M1_camping_max_nonrandom', 'M2_band_max') if check[k]['moved'])
regressions = 1 if check['M3_pacing_d48_pooled_belief']['regressed'] else 0
guards_ok = (check['guard_calibration_smart_rows_pass']['ok']
             and check['guard_calibration_random_control_unchanged']['ok']
             and check['M2_watch_min_ge_45']['ok']
             and check['M2_watch_slackburner_greedy']['ok'])
adopted = decisive_moves >= 2 and regressions == 0 and guards_ok
verdict = {
    'decisive_moves': decisive_moves,
    'directional_moves': directional_moves,
    'regressions': regressions,
    'guards_ok': guards_ok,
    'adopted_per_04_s5': adopted,
    'reading': ('§5 rule MET' if adopted else
                '§5 rule NOT MET — 1 decisive desired move (camping dominance), 1 directional-only '
                '(band, overlapping CIs), 1 regression (pacing 1.9%→0.6% days-4–8 share): '
                'ADOPTION REJECTED; candidate preserved for M4 re-evaluation with human data'),
}
print(f"\nVERDICT: decisive_moves={decisive_moves} directional_moves={directional_moves} "
      f"regressions={regressions} guards_ok={guards_ok} "
      f"→ §5 adoption rule {'MET' if adopted else 'NOT MET'}")

with open(f'{ROOT}/w4-results/adoption-check.json', 'w') as f:
    json.dump({'meta': {
        'baseline': 'w3-results/matrix.json (canonical 1.0.0-alpha.1, P8=3, seeds 1..1000 CRN)',
        'retuned': 'w4-results/retune-matrix.json (v1.1-alpha CANDIDATE preset P8=4, same seeds — NOT adopted)',
        'rule': '04-balance-sim §5: adopt only if ≥2 metrics move desired direction without regressing a third; '
                '"moved" = retuned 95% CI excludes the baseline point estimate (or the move flips the metric line)',
    }, 'per_pair': rows, 's5_check': check, 'verdict': verdict}, f, indent=2)
print('wrote m2/w4-results/adoption-check.json')
