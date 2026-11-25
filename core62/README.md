# Masarifi 62.0.0-alpha.1 — Core foundation

Baseline: 61.8.1, commit b6b03894d2ebf166d0e255b8587859a3bd12aedf. Branch work/masarifi-62-core. Main remains production. No legacy UI, service worker, localStorage, server, or sync changes. All test data synthetic. Core modules are pure ES modules, no framework/dependency, no DOM or storage access. Run `node core62/tests/core.test.mjs` from repo root.

## Engines and contracts
- Money: signed safe integer halalah; strict decimal input; BigInt aggregation, explicit overflow. Dates are calendar dates YYYY-MM-DD, not UTC timestamps.
- Ledger & Safety Sentinel: confirmed / assumed / planned separate; duplicates identified by [id,date,status,kind], counted for legacy comparability, flagged as incomplete. Invalid rows are rejected, overflow bucket is null. No automatic deletion, guessing or repair. Never use incomplete totals for decisions.
- Scenario Radar: supplied opening cash as of date plus planned flows only; explicit income/outflow stress basis points, conservative per-event rounding, overdue items moved to as-of day and counted; daily closing balance, not intraday minimum. Forecast is hypothetical, not bank balance. Caller must supply complete schedule and correct opening balance.
- Envelope Lens: category + calendar month, confirmed spent, planned and estimated separately. No netting of refunds/transfers yet; assumes ledger negative entries represent expenses for that category.
- Shadow Parity Gate: converts existing ledgerMonth output (id,d,a,status,kind,category) using 61.8.1 rounding; compares all six cent buckets, status counts, row count and valid count with independent legacy analysis. No write path, even if parity passes. Not full record migration; the original records, IDs, recurrence metadata, wallet, debts, history and preferences must remain intact.

## Next gates (not executed)
1. Run both cores against actual 61.8.1 ledgerMonth fixtures from all feature families, date boundaries, wallet transfers, recurring income, debts, installments, associations and refunds. Validate global identity and rounding rules, not only totals.
2. Map the legacy storage schema, all metadata, audit and sync queues; implement versioned migration, snapshots, rollback and conflict-safe transaction boundaries with no destructive cleanup. No production write before proof.
3. Extract existing UI and six gradient themes, route via application commands/selectors; preserve offline behavior and all prior tests. Test real iOS Safari/PWA and cloud sync; only then consider replacing main.

## Evidence
31/31 assertions executed against the same function definitions in the JS execution environment. Synthetic aggregation of 100,000 rows: 288 ms in that run (not an iPhone benchmark). Stored Node test runner provides reproducibility; no claim of device or production parity. Main deployment untouched.
