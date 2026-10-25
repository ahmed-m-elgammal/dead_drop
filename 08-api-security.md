# 08 — API Contracts & Security Requirements

**Status:** contract draft for M5 (MP) — documented now so the MVP's local engine bindings use the same shapes. REST + JSON. All endpoints versioned under `/v1`. The binding rule: **the server never trusts the client**; the engine is the only resolver.

## 1. Conventions

- Auth: `Authorization: Bearer <token>` (email-OTP session token at M5; OAuth provider tokens later). Solo MVP endpoints are local-only (no API).
- **Idempotency:** every mutating request carries `Idempotency-Key: <uuid>`; duplicates return the original response with `X-Idempotent-Replay: true` (24 h window).
- Errors: HTTP status + envelope `{ "error": { "code": string, "message": string, "details": object|null } }`. Codes are stable strings (§5).
- All payloads snake_case; timestamps ISO-8601 UTC; node IDs are map strings.

## 2. Core endpoints

| Method & path | Purpose | Notes |
|---|---|---|
| `POST /v1/cases` | Create case: `{mode: casual\|ranked}` or join queue result | Ranked goes through matchmaking; casual creates a case and returns a share/invite token |
| `GET /v1/cases/{id}` | Role-scoped case view (§4) | The single read model; safe to poll |
| `POST /v1/cases/{id}/fugitive-action` | `{type: "move", to: "D2-08"} \| {type: "hold"}` | Only while `phase=FUGITIVE_TURN` and caller is the Fugitive |
| `POST /v1/cases/{id}/investigator-action` | `{probes: ["D2-08"], stakeout: "D1-07"\|null}` (atomic bundle) | Caps enforced server-side (≤2 probes, ≤1 stakeout, no stakeout day 8) |
| `POST /v1/cases/{id}/forfeit` | `{confirm: true}` | Either role; one-tap confirm lives client-side |
| `POST /v1/queue` / `DELETE /v1/queue` (M6) | Enqueue role; cancel | Matchmaker pairs cross-queue |
| `GET /v1/me` | Profile, two ratings, active cases | |
| `GET /v1/notifications` | Cursor-paged list | Push supplements, never replaces |
| `POST /v1/push-subscriptions` | Web Push subscription blob | Per device |

**Atomic investigator bundle:** probes + stakeout are submitted as one action so a partially-applied phase is impossible (rule §5.3 caps are checked as a unit).

## 3. Role-scoped case views (the hidden-info wall)

The same case renders two different views. The server enforces this; it is not a UI concern.

```jsonc
// GET /v1/cases/{id} — as INVESTIGATOR (during play)
{
  "case_id": "…", "mode": "ranked", "ruleset_version": "1.0.0-alpha",
  "map_id": "map_alpha", "day": 4, "phase": "FUGITIVE_TURN",
  "config": { "safehouse": "D2-07", "drops": ["D2-09","D1-10"], "gate": "D1-08",
              "stamina_budget": 12, "intel_budget": 10, "reveal_schedule": {"district_days":[3,6],"transit_days":[4]} },
  "public_log": [ {"day":3,"event":"district_reveal","district":"D2"},
                  {"day":4,"event":"transit_reveal","class":"F"} ],
  "private_log": [ {"day":1,"event":"probe","node":"D2-08","result":"miss"},
                   {"day":2,"event":"stakeout_armed","node":"D1-07"},
                   {"day":2,"event":"stakeout_resolved","result":"miss"} ],
  "my_state": { "intel_remaining": 6, "probes_today": 0, "stakeout_armed": null },
  "deadline_utc": "2026-11-03T21:00:00Z", "opponent_connected_recently": true
  // NOTE: no fugitive position, route, stamina, drops state, or armed-stakeout echo to Fugitive
}
```

```jsonc
// GET /v1/cases/{id} — as FUGITIVE (during play): same shape minus
// "private_log" (probe/stakeout data is never included), plus "my_state" =
// { position, stamina, holds_used, drops_collected }.
// After verdict: both views gain "full_log" with the true route and all actions.
```

Hard rules (tested, not promised — 09-testing §4):
1. Investigator-facing responses contain **no** fugitive position/route/stamina/drops fields until `verdict != null`.
2. Fugitive-facing responses contain **no** probe or stakeout fields until `verdict != null`.
3. `public_log` is identical for both roles at all times.

## 4. Submission & idempotency semantics

- Every mutation keyed by `Idempotency-Key` (unique index with player + case scope). Retries after timeout are safe.
- Deadline enforcement: server rejects actions past `deadline_utc` with `DEADLINE_PASSED`; the cron worker applies the miss/forfeit state machine (07-architecture §5). A client racing the deadline may receive either success or `DEADLINE_PASSED` — never a double-apply.
- Validation order: auth → case exists → caller is participant → phase/actor match → deadline → schema → engine legality → budget/caps → apply.

## 5. Error codes (stable)

`UNAUTHENTICATED`, `FORBIDDEN_NOT_PARTICIPANT`, `CASE_NOT_FOUND`, `CASE_ENDED`, `NOT_YOUR_PHASE`, `DEADLINE_PASSED`, `INVALID_ACTION` (engine legality), `BUDGET_EXCEEDED`, `DAILY_CAP_EXCEEDED`, `RATE_LIMITED`, `VALIDATION_FAILED`, `IDEMPOTENCY_CONFLICT`.

## 6. Security requirements

| Area | Requirement |
|---|---|
| Transport | HTTPS only; HSTS; no mixed content (PWA install requires it anyway) |
| Auth sessions | 90-day rotating refresh; revoke-all on password/provider change; no JWTs in localStorage for MP (httpOnly cookie + CSRF token on mutations) |
| Authorization | Every case endpoint checks participant-ness server-side; case IDs are UUIDv7 (unguessable) but IDOR protection is mandatory regardless |
| Hidden-info wall | §3 rules enforced by a serializer unit-tested against both roles' views (the #1 security test in the suite) |
| Rate limits | 60 req/min/IP general; 10 case-actions/min/player (generous — the game is turn-based); queue endpoints 5/min |
| Input validation | Zod schemas on every route; map node IDs validated against the case's map version (reject unknown IDs) |
| Cheating surface | Server-authoritative resolution (no client state trust); unique case seeds; stakeout secrecy (A13); post-case anomaly flags (A12) with human-review-friendly dump |
| Privacy (GDPR/CCPA posture) | Solo MVP: skill model & markers **on-device only**; analytics opt-out; no third-party trackers. MP: collect email + handle + timezone; DPA with push/hosting vendors; account + all case data deletable in-app ≤30 days; data export endpoint; player-model data stays on-device even after accounts exist |
| Payments (M7, future) | No card data touches our servers (store IAP / provider checkout); receipts validated server-side; no randomized paid items (policy constraint from research phase) |

## 7. Versioning & compatibility

- `/v1` frozen at M5 release; additive changes only within `v1` (new optional fields); breaking changes → `/v2` with dual-running.
- `ruleset_version` travels with every case; the API returns it in every view so clients can load matching engine code for replay rendering.
