## PulsePay Rebuild Plan (Realtime Banking Model)

### A. Data model (pool-first)
- [ ] A1. Rebuild schema: `bank_pool` (single row master balance + reserve), `accounts` (balance, frozen, freeze_reason, daily_limit, kyc_status), `transactions` (debits/credits, pool_delta, status), `notifications`, `audit_log`.
- [ ] A2. Add RPCs: `allocate_from_pool`, `return_to_pool`, `transfer_between_users` (enforce freeze/limits/pool), `freeze_account`, `unfreeze_account`, `set_limit`, `notify_user`, `admin_adjust_pool`.
- [ ] A3. Enforce integrity: balances derived from pool (pool total = reserve - sum outstanding), block transfers when pool insufficient, all writes recorded to audit_log with actor and reason.

### B. Realtime foundation
- [ ] B1. Supabase realtime channels for accounts, transactions, notifications, and admin events; optimistic UI with rollback on failure.
- [ ] B2. In-app toast/alert stream for transfers, freezes, limits, and pool changes—no page reload.
- [ ] B3. Presence/heartbeat to show active sessions and to reflect freeze instantly on user dashboard.

### C. User experience (fresh UI)
- [ ] C1. New dashboard: live balance card (available vs held), activity feed, quick transfer, beneficiaries, and limit banner.
- [ ] C2. Freeze awareness: blocking state on inputs, clear reason, CTA to contact support; same surfaced on failed transfer attempts.
- [ ] C3. Notifications center: realtime list plus badge, mark-as-read, optional sound/vibrate hook.

### D. Admin console (modern)
- [ ] D1. Pool controls: view total/reserve, top-up, drain, adjust; show pool-to-user allocation chart.
- [ ] D2. Account controls: freeze/unfreeze with reason, set limits, manual credit/debit (logged), KYC status, search/filter.
- [ ] D3. Oversight: transaction flags, anomaly indicators (rapid spend, large withdrawals), audit log stream, KPI cards.

### E. Docs and verification
- [ ] E1. README and env: setup, realtime notes, pool model explanation, freeze workflows.
- [ ] E2. Manual runbook: seed pool, create users, allocate funds, transfer, freeze/unfreeze, observe notifications; capture expected balances and pool deltas.
