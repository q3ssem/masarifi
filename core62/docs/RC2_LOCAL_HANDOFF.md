# RC2 — local development entry
Owner direction: rigorous review and development now; avoid further delay. All Internet-dependent functionality remains deferred.
- RC1 frozen engineering baseline: eb987964a5e4bfda0e09546d7b1b829ad95632a7; CI 45601184443 success; artifact 15015711851.
- RC2.0 change: prevent UI confirmation of future-dated existing expense/income edits, transfers, settlements, pay-occurrence, contributions, investments and asset valuations. Future ordinary entries remain planned; future schedules remain allowed. Historical journal replay remains unchanged, because it must be deterministic and must not depend on the device clock. A browser regression exercises future edit rejection, unchanged save state and original date.
- Priority: P0 financial data loss/corruption/double-counting; P1 misleading balances, impossible confirmations and blocked local workflows; P2 clarity and visual issues. No scope expansion, no cloud or automatic bank integration.
- Release gates: physical iPhone installation/upgrade/offline/storage, visual review, independent legacy migration evidence (only for actual migration), and explicit release approval. Browser screenshots are supporting evidence, not physical testing.
- All three CI jobs must pass before RC2.0 is considered an automated candidate; no release or main change.
