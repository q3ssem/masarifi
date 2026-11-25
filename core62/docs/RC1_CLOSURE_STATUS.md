# RC1 closure status — HOLD
Baseline 61.8.1 main b6b03894d2ebf166d0e255b8587859a3bd12aedf; classic and unified interfaces preserved.
Verified: run 45591648027 passed all jobs including atomic pay-now; 45592698629 passed all jobs including typed wishlist and wealth references; BNPL run 45592866973 unit and Chromium passed at last check. Future-record run 45593051546 new suite passed, older rejection assertion failed because behavior changed; updated to require planned status, added future recurring ambiguity guard and browser future/cancel test. Latest CI must pass before approval.
Open release gates:
- Production cloud hostname/TLS, provisioned identities, durable volume and backup, rate limiting, security/device rehearsal. Local reference runtime tested but not hosted.
- Real v2 backup read-only preview with six-bucket per-month reconciliation, wallet/asset and investment reconciliation, user acceptance of explicit assumed/month-only classification. Unknown active preferences, audit history, currency rates, complex links, sales basis, and fuzzy recurring matches still blocked; no full legacy migration claim.
- Feature parity: templates/project budgets, advanced budget transfers and subscriptions/renewals, SMS import, split bills/refunds, reminders, reporting variations, linked purchase editing, true asset reconciliation, language/accessibility and offline PWA/install/upgrade. Existing new UI is not pixel-identical; manual device comparison remains.
- Journal cap 20,000 and mixed history performance, browser persistence and quota/crash behavior remain device gates.
No data or main changes. Do not advance RC2 as fully approved until release authority explicitly accepts scope and gates are closed.

## RC1.11 development follow-up
RC1.10 run 45595358973 passed unit, Chromium and WebKit. RC1.11 adds bounded project budgets with explicit existing-expense links, equal bill allocation by halalah (reference only; no debts/refunds), and manual SAR SMS amount extraction requiring confirmation. Raw SMS is not stored. Existing expense references must be detached before editing/voiding. No automatic SMS access, comprehensive bank formats, refunds or legacy parity claimed. CI pending for RC1.11. Real backup, production deployment, physical device/offline PWA, remaining advanced feature parity are still release blockers.

## RC1.12 offline candidate
Packaged build adds a manifest, local icons and versioned integrity-checked service worker shell. Only static allowlisted assets are cached; the sync API and financial records never enter the shell cache. Worker updates use the normal waiting lifecycle, not forced activation. The reference runtime redirects / to /app/index.html. Added separate Chromium/WebKit packaged offline tests with encrypted vault restore. Latest CI required. Actual iPhone PWA installation, upgrades, storage eviction and crash rehearsal remain unverified. No deployment or main changes.
