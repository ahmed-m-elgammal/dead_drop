# M1 Session Files — Transcription Workflow (Weeks 2–3)

**Status:** tooling ready (W2) · **Feeds:** triage-log.md, ruleset freeze tally, M2 regression fixtures.

This directory holds the *transcribed record* of the paper-playtest sessions defined in
[`../playtest-protocol.md`](../playtest-protocol.md). The templates are pre-filled with everything
that is known in advance (public case config, deliberately-exercised rulings, sheet structure).
**Every data cell stays empty until a physical session has actually happened.**

## Fabrication guard (hard rule)

No session result may be written, inferred, "reconstructed", or simulated into these files.
A session file is created by *transcribing paper sheets after the table session*, never by
anticipating outcomes. If a template cell cannot be filled, it stays visibly empty — an empty
cell is honest, an invented one poisons the freeze evidence and the M2 fixtures.

## Files

| File | Purpose | Created when |
|---|---|---|
| `s1-case-template.md` | Session S1 shell — Case **P1** ×2, Partner B, exercises **AUD-004** (Hold-collects-drop) | copy → `s1-transcript.md` at session time |
| `s2-case-template.md` | Session S2 shell — Case **P2** ×2, Partner B, engineers **§9.13** (SP = 0 forced Hold) | copy → `s2-transcript.md` at session time |
| `s3-case-template.md` | Session S3 shell — Case **P3** ×2, Partner C, free play | Week 3 (built then, per plan) |
| `triage-log.md` | Dispute registry across all sessions (classes a/b/c) | row appended during each 30-min triage |

## Workflow per session (mirrors protocol §2)

1. **Before:** print the kit — the **print pack v2** (`../kit/print/`: read-first, day mat,
   duplex role sheets, case record, disputes/survey, facilitator run sheet) + `../kit/map_print.html`
   (v1 markdown cards remain the canonical text source); confirm the facilitator-only par data stays
   quarantined (the run sheet carries it — keep it off the table); copy the template to
   `s{n}-transcript.md`.
2. **At the table:** run the two case legs (roles swapped); record events on paper Sheets C/D/E/F —
   *not* on a laptop.
3. **Immediately after (transcription, ≤30 min):** transcribe both legs into the transcript file,
   verbatim, including messy notes; disputes go in word-for-word.
4. **Triage (30 min):** classify each dispute row into class **(a)** rules-text bug → patch
   `03-rules.md`, bump `ruleset_version` patch level, note in `../w1-rules-audit.md` §6 registry;
   **(b)** ambiguity → clarify wording only; **(c)** design smell → no change, log for M4.
   Append every row to `triage-log.md`.
5. **Close:** fill the tally line in the transcript; mark the engineered-state verification
   section (hit / missed + evidence quote). No parameter discussion, ever, during M1.

## Naming and linking conventions

- Transcript files: `s{n}-transcript.md`; dispute IDs inside them: `S{n}-{row}` (e.g. `S1-03`),
  reused as the row key in `triage-log.md`.
- Rules changes born from triage bump `03-rules.md` `ruleset_version` (patch level) and land in
  the change log (03-rules §11) + the W1 audit §6 registry — the audit file is the single registry.
- Engineered states (AUD-004 in S1, §9.13 in S2) must produce **observation rows** in the
  transcript's verification section even when no dispute arose: the M1 exit line needs evidence
  the rulings were *exercised*, not just read.

## What these files feed downstream (long-term hooks)

- **Freeze note (W3):** tally table (cases per role per partner) + zero-open-disputes check.
- **M2 regression fixtures (09-testing §1):** the four constants — P1 6d/5SP, P2 6d/6SP,
  P3 6d/7SP, canonical 7d/6SP — plus any session-discovered legal route variants worth pinning.
- **M4 instruments:** Sheet F uses the same 1–5 scales as the M4 protocol (04-balance-sim §7);
  class-(c) smells are queued verbatim as M4 playtest questions, tagged `feeling-not-data`.
