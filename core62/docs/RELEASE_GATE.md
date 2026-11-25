# 62.5–62.6 — Hardening and parity gate

Production baseline 61.8.1; main unchanged. Fixed transfer classification across projections and dashboard, strict immutable status contracts, validated month, bounded shadow history, canonical sync operation ordering, sparse arrays and payload limits, stale acknowledgement state, exact halalah presentation and external CSS theme tokens. Removed unused imports and unreachable queue-full branch; kept production index and tests. No destructive legacy cleanup before feature parity.

Reran 124 prior pure JS assertions and 17 new assertions, including 100000, 250000, 500000 synthetic rows per stress run against actual extracted legacy aggregation and 2000 seeded synthetic batches. New tests are source-level and projection-level, not a full migration. Prior Node crypto evidence remains separate.

## Release blockers
- Full legacy feature inventory/migration and original-record-to-projection parity; current UI is synthetic lab only.
- Real Chromium/WebKit, actual IndexedDB reopen/concurrent transactions/quota/recovery and iPhone PWA checks.
- Authenticated cloud transport, durable queue, server replay protection and conflict tests.
- Backup coverage of IndexedDB and cloud; real migration rollback rehearsal. Existing production data must never be overwritten before all gates.

Decision: HOLD, no main merge. No actual user data touched. Run node core62/tests/hardening.test.mjs and the previous test files independently.
