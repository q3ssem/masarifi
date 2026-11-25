# Engine comparison — verified source and test evidence, 2026-11-25
Old production: main b6b03894d2ebf166d0e255b8587859a3bd12aedf (61.8.1). New verified baseline: RC3.5 de7cf51a84856bdf5f04f0060fcc6b28978d3435, CI 45619256928. RC3.6 polish pending CI.
| Dimension | 61.8.1 source | 62 local |
|---|---|---|
| Structure | 956,883-byte index.html, inline JS/CSS, five script tags | 30 reachable JS modules, separate UI/domain/schedule/journal/crypto/reporting |
| Money | Number-based computations, parseFloat and Math.round observed; no claim every legacy calculation is incorrect | Integer SAR minor units and checked BigInt aggregation; invalid/overflow operations blocked |
| Persistence | persistLocal writes JSON state to localStorage; IndexedDB snapshot facility; encrypted backup AES-GCM/PBKDF2 250,000 iterations | AES-GCM-256 encrypted IndexedDB journal, PBKDF2-SHA256 600,000 iterations, CAS generation, previous revision and quarantine, session-only autosave secret |
| Offline | Six shell assets, skipWaiting, navigation network-first and cached fallback | Scope-isolated cache, hash-verified shell, normal waiting and rejected corrupt update |
| QA | Main tree has no test or workflow files; historical legacy tests may exist outside this tree | 47 unit test files, two browser engines, 1,344 geometry checks, 224 screenshots, four historical upgrades and nine negative package tests in RC3.5 |
| Size | Static root assets 1,062,049 bytes including icons, worker, manifest (excludes zero-byte .nojekyll) | RC3.5 manifest assets 317,098 bytes including icons and worker; about 70% smaller; excludes generated README/build manifest. ZIP 182,087 bytes |
| Performance | No apples-to-apples timed old-engine benchmark available | RC3.5 CI synthetic 20,000 journal commands: build 3,287 ms, replay 3,742 ms, view/search 349 ms over 19,980 rows |
| Security | Encrypted backup exists; ordinary local JSON state not encrypted by persistLocal; no meta CSP in old index | Packaged client connect-src none, encrypted journal, strict commands, local-only, no financial API; not formal security audit |
| Maintenance | Monolithic index and shared mutable state | Explicit contracts, replayable audit, isolated regressions, deterministic distribution, separate local/cloud boundaries |
No measured old/new speed multiplier, battery claim, or absolute guarantee. Stronger encryption is intentionally CPU-intensive; full journal encryption/replay can cost more than plain JSON. New local app does not assert full legacy feature parity; real v2 migration is unapproved, cloud and internet features deferred. Keep old data and backup intact; test exact candidate on separate origin on physical iPhone before publication. No main merge authorized.
