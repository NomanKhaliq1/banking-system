# PulsePay Live

Realtime, pool-first banking demo built with Next.js 14, TypeScript, Tailwind, and Supabase. All balances are derived from a central bank pool; freezes, limits, notifications, and transfers stream without page reloads.

## Setup

1) Install deps
```
npm install
```

2) Env (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3) Push schema
```
npx supabase db push
```

4) Dev
```
npm run dev
```

## Schema highlights
- `bank_pool` — single-row master pool (total + reserve).
- `accounts` — balances, held_amount, frozen + reason, per-transaction limit, KYC state.
- `transactions` — debits/credits with `pool_delta` to reconcile against the pool.
- `notifications` — realtime alerts for transfers, freezes, limits.
- `audit_log` — admin/user actions.
- `beneficiaries`, `transaction_flags` — quick transfers + oversight.

## RPC surface
- `transfer_between_users(p_to_account, p_amount, p_reference?)` (alias: `perform_transfer`)
- `allocate_from_pool(p_account, p_amount, p_reason?)` (alias: `admin_grant_from_pool`)
- `return_to_pool(p_account, p_amount, p_reason?)`
- `admin_set_pool_total(p_amount, p_reason?)`, `admin_adjust_pool(p_amount, p_reason?)`
- `admin_adjust_user_balance(p_account, p_amount, p_reason?)`
- `freeze_account`, `unfreeze_account`, `set_limit`
- `notify_user` (internal helper for inserts to `notifications`)

## Realtime streams
- Accounts: balance, freeze, limit updates.
- Transactions: inserts for both sender/receiver.
- Notifications: in-app alerts (badge + list).

## Manual walk-through
1) Seed pool (admin panel) and create two users.
2) Allocate funds from pool to each account.
3) Transfer between users; observe live balances and notifications.
4) Freeze one account; verify dashboard locks and notifications show reason.
5) Adjust limits, return funds to pool, and inspect audit + flags.
