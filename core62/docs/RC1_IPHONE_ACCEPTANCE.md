# RC1 local-only physical iPhone acceptance
Use a separate static HTTPS test origin, not the existing production origin or existing financial data. Use synthetic entries only. Record iOS version, device model, package version and commit, date, PASS/FAIL and concise evidence for each item. Do not record pass without performing the step.

| ID | Procedure | Pass condition |
|---|---|---|
| I01 | Open candidate in Safari and add to Home Screen | Launches standalone; Arabic layout and local-only notice visible |
| I02 | Create test wallet and a 12.34 SAR expense, save encrypted | Saved confirmation; correct balance |
| I03 | Close and reopen; unlock with wrong then correct password | Wrong password rejected; correct one restores same balance |
| I04 | Enable airplane mode and reopen installed app | Opens offline; existing encrypted vault unlocks |
| I05 | Add 1.01 SAR expense offline, save, close, reopen | Both records restored; net expense 13.35 SAR |
| I06 | Export encrypted backup to Files and restore in a separate test context | Same records and amounts; no cloud or financial API |
| I07 | With an unsaved synthetic edit, attempt to close | Record whether iOS warns; do not rely on this event for persistence |
| I08 | Publish a new test package to the same test origin, reconnect, close/reopen | New app shell activates; saved vault intact |
| I09 | Switch both layouts and themes, portrait/landscape, use VoiceOver | Controls labelled, focus sensible, no clipping; record visual issues |
| I10 | In a disposable test context only, simulate storage pressure/interruption and restore backup if needed | No false saved claim; previous committed data or manual backup recoverable |

Local engineering approval and real legacy migration approval are separate. No private backup in CI. The browser test suite does not substitute for these physical tests. No production release or main merge without approval.
