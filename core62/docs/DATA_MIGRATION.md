# 62.1 alpha — Data Vault / Shadow migration

Baseline legacy source: b6b03894d2ebf166d0e255b8587859a3bd12aedf. Verified source locations: index.html lines 1956–1975 (persistLocal), 2076–2088 (cloud cache, pending queue, conflicts), 1869 (IndexedDB snapshot store), 4345–4346 (cloud transaction metadata), 5934–5950 (monthly ledger and financial analysis). Legacy local key: masarifi.v2. Scope: read-only local snapshot, no production write, no UI integration. All test data synthetic.

## Inventory
- Raw primary payload: expenses, incomes, insts, debts, goals, fixeds, budget, cats, cbud, rates, prefs, audit59. Nested wallet, recurring entries and unknown fields remain in original JSON text.
- Other masarifi.* local preferences: capture as exact strings, exclude other namespaces. Stop on known cloud identity, queue, cache, conflict, revocation or transaction metadata keys. This conservative guard may block previously connected accounts; does not establish authenticated cloud state.
- IndexedDB masarifi-snap: not captured. Cloud identity and data are not migrated. No auth credentials, network, telemetry or external transfer. Snapshot is sensitive and stays in caller memory; do not log/persist it.

## Guarantees and boundaries
Double-read capture checks source consistency but is not atomic across tabs. Stage re-reads source and compares exact sorted key/value pairs. Revision compare-and-swap and rollback apply to the in-memory shadow store only; not a browser transaction or durable backup. Rollback creates a new revision; no source data is rewritten. Strict shape failures block instead of filling missing fields with defaults. Unknown fields are preserved without normalization. Future production migration needs cross-tab serialization, durable IndexedDB snapshot and restore, actual old/new ledger fixtures, record-level parity, and rollback drills. No production write path exists. Memory history is a prototype; needs bounds and durable design before integration.

## Reproduce
node core62/tests/data-shadow.test.mjs
node core62/tests/core.test.mjs

New tests: 28/28, function definitions executed in JS environment, including raw snapshot of 100,000 synthetic rows in 76 ms. Stored test runner not separately executed with Node. No actual user data, real iOS, sync, or full migration tested.
