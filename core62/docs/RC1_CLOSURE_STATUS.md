# RC1 closure status — LOCAL ONLY / AUTOMATED PASS / HOLD physical acceptance

## Governing scope — owner-approved
The owner explicitly requires a local-only version now; all Internet-dependent features are deferred. This section supersedes earlier historical release gates below. No cloud sync, online account, server-side financial storage, remote backup, live bank connection, live exchange-rate service, network-dependent notifications or production financial server is required for RC1. Do not add such features during closure. Preserve the separated experimental cloud code outside the release package.

Local application scope: financial engine, accounts, expenses/income, obligations, installments, budgets, goals, assets, reports, encrypted IndexedDB, local autosave, manual encrypted backup/restore, and offline PWA operation. Manual import/export is local. Static asset delivery for first installation or later application updates is distinct from Internet-dependent financial features; it must not carry financial data or require a financial backend.

## Active local exit gates
- Latest local package CI: unit, Chromium and WebKit all pass, including offline writes, reload, encrypted restore and application upgrade without losing local data.
- No cloud interface or transport in the packaged client; no financial network API; manifest cloudSync false.
- Local feature integrity, regression, keyboard/accessibility and both layouts. Document unsupported legacy features rather than claiming complete parity.
- Physical iPhone: installation, reopening offline, local save, encrypted export/restore, upgrade, storage pressure/interruption. Browser emulation is not physical-device proof.
- Fresh-install engineering approval and old-data migration approval are distinct. Actual legacy migration remains prohibited until an independently exported real backup is reconciled and unsupported fields are addressed. Never use private data in CI or commit it.
- Explicit release decision after evidence is available; no merge to main, no deployment, no releaseAuthorized change without approval.

Baseline main: b6b03894d2ebf166d0e255b8587859a3bd12aedf.
RC1.17 verified all jobs in run 45598543717. RC1.18 commit aa8388d3b5ccf85ee03ef6a495e98a6ba725f281: unit PASS, browser checks pending in run 45600614780 at scope update.
Current decision: RC1.19 automated engineering gate PASS. Full local RC1 closure remains HOLD pending physical iPhone acceptance and final local feature/visual review. Real-data migration is separately unapproved. Internet features are not blockers.

## Historical engineering evidence (not current scope)

## RC1.11 development follow-up
RC1.10 run 45595358973 passed unit, Chromium and WebKit. RC1.11 adds bounded project budgets with explicit existing-expense links, equal bill allocation by halalah (reference only; no debts/refunds), and manual SAR SMS amount extraction requiring confirmation. Raw SMS is not stored. Existing expense references must be detached before editing/voiding. No automatic SMS access, comprehensive bank formats, refunds or legacy parity claimed. CI pending for RC1.11. Real backup, production deployment, physical device/offline PWA, remaining advanced feature parity are still release blockers.

## RC1.12 offline candidate
Packaged build adds a manifest, local icons and versioned integrity-checked service worker shell. Only static allowlisted assets are cached; the sync API and financial records never enter the shell cache. Worker updates use the normal waiting lifecycle, not forced activation. The reference runtime redirects / to /app/index.html. Added separate Chromium/WebKit packaged offline tests with encrypted vault restore. Latest CI required. Actual iPhone PWA installation, upgrades, storage eviction and crash rehearsal remain unverified. No deployment or main changes.

## RC1.13 subscription lifecycle
Added journal-backed inclusive stop date and atomic price renewal at an existing due date for open-ended subscriptions. Renewal preserves the previous schedule and creates a successor without overlapping occurrences; existing materialized obligations cannot be removed. UI disallows retroactive stop/renew. SMS review rejects explicitly signed amounts before currency token extraction. New synthetic regression tests; latest CI pending. Finite-term contract renewal, comprehensive refund semantics, actual backup and device/production gates remain open.

RC1.12 run 45596475155: unit and Chromium PASS; WebKit standard UI PASS (672 responsive checks), offline reload FAIL (`WebKit encountered an internal error` under Playwright setOffline). Changed packaged offline test to stop the actual HTTP origin, assert it is unreachable, reload and restore encrypted data, and confirm API failure. This is a different real-network-cut scenario, not proof that the original WebKit emulation failure was fixed. Keep physical iOS offline and install/upgrade gate open even if this passes. Latest CI pending.

## RC1.14 final audit increment
Added explicit partial/full refund linkage to an existing expense, cumulative cap, audited reversal and gross cash reporting with a separate refund metric. Existing expense remains gross; refund does not reduce category budgets or project totals automatically. Refunds are journal-backed; legacy refund mapping remains blocked. Added private read-only legacy audit CLI combining strict preview, replay and independent monthly reconciliation; no real backup was used. Latest CI required. WebKit physical offline, production hosting and actual source-data validation remain open.

RC1.14 follow-up: overview and reports distinguish refund cash from ordinary income; unified all-period gross inflow is explicitly labelled. Added executable synthetic CLI match/mismatch/source-preservation test. User-owned data remains untouched. Final release gate remains HOLD until latest CI, physical iOS, independently exported actual data and production hosting are verified.

## RC1.15 targeted parity
RC1.14 run 45597293495 passed all three jobs. Added dated, append-only asset valuations used as-of the report date, without generating cash movements or duplicate assets. Added narrowly scoped linked BNPL description correction preserving amount, account, category, provider, first-payment identity and schedule; financial restructuring remains deliberately blocked. Latest CI pending. Actual migration, physical iOS and production environment remain release blockers.

## RC1.16 reconciliation and closure
RC1.15 unit job passed in run 45597743459; browser results were still pending when this increment was prepared. Added normalized non-transfer row identity reconciliation (id/date/status/kind/amount/category) as a separate aggregate diagnostic and optional strict CLI mode. No fuzzy automatic remap. Exact identity does not prove notes, account links, transfers, or investment parity. Legacy UI preview exposes the six cash buckets and an explicit synthetic-only confirmation; blocked projections cannot be applied. Actual legacy backup and independently exported source rows are still required. No main merge or data change. Latest CI required.

## RC1.17 — local-only scope approved by owner
RC1.16 run 45598014460 passed unit, Chromium, WebKit. Owner explicitly deferred cloud synchronization: production financial server, hosted identities and cloud restore are removed from RC1 exit criteria. The app's sync UI and network imports are removed, CSP prohibits application network connections, release manifest marks cloudSync false and graph/build forbid journal-sync. Offline packaged tests run on a static-only server with no vault API. Browser backup transfer now uses encrypted download/import across independent contexts. Historical sync backend and its unit tests remain in repository for future work, excluded from local package. Static HTTPS origin still needed for initial PWA installation/updates; no financial server. Latest CI required. Real legacy backup/independent reconciliation, physical iPhone, local storage eviction/upgrade, and final feature scope acceptance remain open. No main merge or real data changes.

## RC1.18 — local lifecycle verification
RC1.17 run 45598543717 passed all jobs, including static-only offline and encrypted portable backup restore. Cache names now include service-worker scope; activation only cleans same-scope versions. Missing shell assets may be restored online only after verifying their build hash. Browser test adds a second isolated build, verifies waiting/activation without losing vault data, keeps unrelated-scope cache intact, stops the static origin and records/saves/reloads a new offline transaction. Existing beforeunload guard is registered only while changes are unsaved; iOS may ignore this event. Old unscoped pre-RC caches are intentionally not deleted automatically because ownership is ambiguous. Latest CI pending; real migration, device testing and scope acceptance remain open. No deployment or data changes.

## RC1.19 — local closure QA
RC1.18 run 45600614780 completed SUCCESS for all three jobs, including two-package upgrade and offline write/reload. Removed obsolete cloud wording from the notice, added navigation aria-controls, keyboard quick-entry and visible-control naming checks, and a browser guard against fetch/XHR/WebSocket/EventSource traffic. These are basic accessibility checks, not full WCAG certification or visual review. Added physical iPhone acceptance checklist. Latest CI pending. Local engineering candidate only; physical device evidence and real migration approval remain distinct and unverified. No main changes or deployment.

## RC1.19 verified evidence freeze
Tested commit eb987964a5e4bfda0e09546d7b1b829ad95632a7; Actions run 45601184443: all 3 jobs completed success. 45 *.test.mjs files passed (including retained reference/legacy tests, not 45 individual assertions); 672 responsive layout checks per browser, 1,344 total automated checks, not visual inspection. Both browser jobs passed keyboard/label/network regression, independent encrypted backup restore, static-only package upgrade and offline write/reload. Build: 39 assets, 304743 bytes, 30 reachable JS modules; artifact 15015711851 (14-day retention). Mixed synthetic journal: 20,000 commands, 2,120 ms build and 2,186 ms replay on CI, 3,466,045 bytes; not physical-device performance. See RC1_LOCAL_EVIDENCE.json. No source or runtime changes in this evidence-only commit. Full RC1 closure and production release are not authorized. Physical acceptance checklist RC1_IPHONE_ACCEPTANCE.md is unexecuted. The application is a test candidate, not a production release. Remaining legacy-specific unsupported fields and actual-data reconciliation must not be presented as approved migration.
