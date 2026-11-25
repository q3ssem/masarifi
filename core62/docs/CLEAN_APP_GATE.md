# Masarifi 62.6.4 Alpha 3 — clean workspace application

Entry: core62/app/index.html (isolated HTTP origin required; no file://). One controller for six sections, 16 operation choices, six gradient theme IDs, light/dark. All code imports clean core modules only; theme CSS reused from the new-core demo, not legacy 61.8.1. No old UI/JS imported. Browser syntax checked (app JS); real browser DOM, responsive layout and end-to-end flows have not been executed. All session mutations in memory, no durable or cloud connection. Not a release candidate.

## Feature parity inventory
| Area | Status |
|---|---|
| Income and expense create/edit/void | Clean command implementation and UI |
| Accounts, internal transfer, archive | Clean command implementation and UI |
| Debt, installments, associations, fixed and BNPL | Unified obligation + monthly occurrence model; legacy-specific repayment/association distribution and historical estimates not yet matched |
| Recurring income and subscriptions | Explicit monthly rules and settlement, no auto-confirmation |
| Budgets and goals | Per-month category budgets; goal progress/contributions; not automatically linked to cash |
| Investments, assets, net wealth | Explicit valuation, trade basis and profit; no cash linkage, IRR, FX, targets or risk analytics parity |
| Search | Arabic normalization, confirmed ledger in workspace; full cross-family search still missing |
| Reports, exports, calendar, SMS import, split bills, refunds, renewals, settings, languages | Incomplete or not migrated |
| Backup/restore | Tested isolated crypto module from earlier phase; not connected to this workspace |
| Persistent storage and sync | Isolated prior modules exist, not wired to clean workspace; actual server auth and durable transaction tests missing |
| Real legacy migration | NOT EXECUTED; no production writes |

## Decision
HOLD. Main 61.8.1 stays intact. Legacy file and bridge stay as reference on development branch only; final clean app must not load them. Next gates: complete feature inventory and rebuild missing workflows; durable encrypted state + migration adapter; verify record-level parity, browser/device and authenticated cloud; only then remove legacy runtime from candidate. No deletion of reference or evidence. No data lost in this change because production untouched, not a guarantee of future migration.

## Alpha 4 integrity follow-up
Workspace asset IDs guarded across holdings, assets and accounts in both creation orders; 27/27 current workspace tests pass in source-level JS execution. A static clean-dependency gate and branch-only Node CI workflow were added; CI execution status must be checked separately. No deployment job. No production change.
