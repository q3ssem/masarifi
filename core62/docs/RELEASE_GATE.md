# 62.5–62.6 — Hardening and parity gate

Production baseline 61.8.1; main unchanged. Fixed transfer classification across projections and dashboard, strict immutable status contracts, validated month, bounded shadow history, canonical sync operation ordering, sparse arrays and payload limits, stale acknowledgement state, exact halalah presentation and external CSS theme tokens. Removed unused imports and unreachable queue-full branch; kept production index and tests. No destructive legacy cleanup before feature parity.

Reran 124 prior pure JS assertions and 17 new assertions, including 100000, 250000, 500000 synthetic rows per stress run against actual extracted legacy aggregation and 2000 seeded synthetic batches. New tests are source-level and projection-level, not a full migration. Prior Node crypto evidence remains separate.

## Release blockers
- Full legacy feature inventory/migration and original-record-to-projection parity; current UI is synthetic lab only.
- Real Chromium/WebKit, actual IndexedDB reopen/concurrent transactions/quota/recovery and iPhone PWA checks.
- Authenticated cloud transport, durable queue, server replay protection and conflict tests.
- Backup coverage of IndexedDB and cloud; real migration rollback rehearsal. Existing production data must never be overwritten before all gates.

Decision: HOLD, no main merge. No actual user data touched. Run node core62/tests/hardening.test.mjs and the previous test files independently.

## Runtime follow-up
Re-executed the Node v22.16.0 Web Crypto suite: 7/7 passed, verified matching blobs 01ef8cea03c40f59d0e177e8bfeca22d1abdf58a and 440ecba7f75dbc87a12865afb3d88eb3383fb865. Chromium 144.0.7559.96 launched; navigation to local test fixture was rejected with ERR_BLOCKED_BY_ADMINISTRATOR (also on an intercepted synthetic fixture). No browser assertions executed. IndexedDB, actual rendering, cross-tab and crash/quota gates remain NOT EXECUTED. Source files for the vault matched blobs 8f9b2b35a350f0cefe832920219766e952420012 and 6ca7df3e46168ea63d65e96b2789b874a85eeb54. Release decision remains HOLD.
