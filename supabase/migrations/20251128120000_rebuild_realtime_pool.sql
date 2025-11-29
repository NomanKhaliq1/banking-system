-- Rebuild schema for pool-first realtime banking model
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Drop legacy tables if they exist
drop table if exists beneficiaries cascade;
drop table if exists transactions cascade;
drop table if exists admin_audit cascade;
drop table if exists transaction_flags cascade;
drop table if exists profiles cascade;
drop table if exists bank_pool cascade;
drop table if exists notifications cascade;
drop table if exists audit_log cascade;
drop table if exists accounts cascade;

-- Master pool (single row)
create table bank_pool (
  id int primary key default 1 check (id = 1),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  reserve_amount numeric(14,2) not null default 0 check (reserve_amount >= 0),
  updated_at timestamptz not null default now()
);

insert into bank_pool (id, total_amount, reserve_amount)
values (1, 4000000, 0)
on conflict (id) do nothing;

-- Accounts (user ledger)
create table accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  account_number text not null unique,
  full_name text,
  balance numeric(14,2) not null default 0 check (balance >= 0),
  held_amount numeric(14,2) not null default 0 check (held_amount >= 0),
  is_frozen boolean not null default false,
  freeze_reason text,
  daily_limit numeric(14,2) not null default 50000 check (daily_limit > 0),
  kyc_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index accounts_account_number_idx on accounts(account_number);

create or replace function set_accounts_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger trg_accounts_updated_at
before update on accounts
for each row
execute function set_accounts_updated_at();

-- Beneficiaries
create table beneficiaries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references accounts(id) on delete cascade,
  name text not null,
  account_number text not null,
  created_at timestamptz not null default now()
);

create index beneficiaries_owner_idx on beneficiaries(owner_id);

-- Transactions
create table transactions (
  id uuid primary key default gen_random_uuid(),
  from_account text,
  to_account text,
  from_user uuid references accounts(id),
  to_user uuid references accounts(id),
  from_name text,
  to_name text,
  amount numeric(14,2) not null check (amount > 0),
  reference text,
  status text not null default 'posted',
  pool_delta numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create index transactions_from_idx on transactions(from_account);
create index transactions_to_idx on transactions(to_account);
create index transactions_created_idx on transactions(created_at desc);

-- Transaction flags
create table transaction_flags (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references transactions(id) on delete cascade,
  reason text,
  status text not null default 'OPEN',
  created_at timestamptz not null default now()
);

create index transaction_flags_tx_idx on transaction_flags(transaction_id);

-- Notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references accounts(id) on delete cascade,
  account_number text,
  type text not null default 'info',
  title text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications(user_id, is_read);

-- Audit log
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_role text,
  action text not null,
  target_account text,
  amount numeric(14,2),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_action_idx on audit_log(action);
create index audit_log_created_idx on audit_log(created_at desc);

-- Notify helper
create or replace function notify_user(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text default 'info',
  p_meta jsonb default '{}'::jsonb,
  p_account text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into notifications (user_id, account_number, type, title, message, metadata)
  values (p_user_id, p_account, coalesce(p_type, 'info'), p_title, p_message, coalesce(p_meta, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

-- Transfer between users (pool-neutral)
create or replace function transfer_between_users(
  p_to_account text,
  p_amount numeric,
  p_reference text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from accounts%rowtype;
  v_to accounts%rowtype;
  v_tx uuid := gen_random_uuid();
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select * into v_from from accounts where id = auth.uid() for update;
  if not found then
    raise exception 'Account not found for current user';
  end if;
  if v_from.is_frozen then
    raise exception 'Account frozen: %', coalesce(v_from.freeze_reason, '');
  end if;
  if p_amount > v_from.daily_limit then
    raise exception 'Transfer exceeds limit of %', v_from.daily_limit;
  end if;
  if v_from.balance < p_amount then
    raise exception 'Insufficient funds';
  end if;

  select * into v_to from accounts where account_number = p_to_account for update;
  if not found then
    raise exception 'Destination account not found';
  end if;
  if v_to.is_frozen then
    raise exception 'Destination is frozen: %', coalesce(v_to.freeze_reason, '');
  end if;

  update accounts set balance = balance - p_amount where id = v_from.id;
  update accounts set balance = balance + p_amount where id = v_to.id;

  insert into transactions (
    id, from_account, to_account, from_user, to_user, from_name, to_name,
    amount, reference, status, pool_delta
  )
  values (
    v_tx, v_from.account_number, v_to.account_number, v_from.id, v_to.id,
    v_from.full_name, v_to.full_name, p_amount, p_reference, 'posted', 0
  );

  insert into audit_log (actor_id, actor_role, action, target_account, amount, reason, metadata)
  values (v_from.id, 'user', 'transfer', v_to.account_number, p_amount, p_reference,
          jsonb_build_object('from', v_from.account_number, 'to', v_to.account_number));

  perform notify_user(
    v_to.id,
    'Incoming transfer',
    format('Received %s from %s', p_amount, coalesce(v_from.full_name, 'Unknown')),
    'transfer',
    jsonb_build_object('tx_id', v_tx, 'amount', p_amount),
    v_to.account_number
  );

  return v_tx;
end;
$$;

-- Move funds from pool to user
create or replace function allocate_from_pool(
  p_account text,
  p_amount numeric,
  p_reason text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target accounts%rowtype;
  v_pool bank_pool%rowtype;
  v_tx uuid := gen_random_uuid();
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select * into v_target from accounts where account_number = p_account for update;
  if not found then
    raise exception 'Account not found';
  end if;
  if v_target.is_frozen then
    raise exception 'Account frozen: %', coalesce(v_target.freeze_reason, '');
  end if;

  select * into v_pool from bank_pool where id = 1 for update;
  if v_pool.total_amount < p_amount then
    raise exception 'Pool insufficient';
  end if;

  update bank_pool set total_amount = total_amount - p_amount, updated_at = now() where id = 1;
  update accounts set balance = balance + p_amount where id = v_target.id;

  insert into transactions (
    id, from_account, to_account, to_user, to_name,
    amount, reference, status, pool_delta
  )
  values (
    v_tx, 'POOL', v_target.account_number, v_target.id, v_target.full_name,
    p_amount, coalesce(p_reason, 'pool allocation'), 'posted', -p_amount
  );

  insert into audit_log (actor_role, action, target_account, amount, reason, metadata)
  values ('admin', 'allocate_from_pool', v_target.account_number, p_amount, p_reason, '{}'::jsonb);

  perform notify_user(
    v_target.id,
    'Funds added',
    format('%s credited from pool', p_amount),
    'credit',
    jsonb_build_object('tx_id', v_tx, 'amount', p_amount),
    v_target.account_number
  );

  return v_tx;
end;
$$;

-- Move funds back to pool
create or replace function return_to_pool(
  p_account text,
  p_amount numeric,
  p_reason text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source accounts%rowtype;
  v_tx uuid := gen_random_uuid();
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select * into v_source from accounts where account_number = p_account for update;
  if not found then
    raise exception 'Account not found';
  end if;
  if v_source.balance < p_amount then
    raise exception 'Insufficient user funds';
  end if;

  update accounts set balance = balance - p_amount where id = v_source.id;
  update bank_pool set total_amount = total_amount + p_amount, updated_at = now() where id = 1;

  insert into transactions (
    id, from_account, from_user, from_name, to_account, amount, reference, status, pool_delta
  )
  values (
    v_tx, v_source.account_number, v_source.id, v_source.full_name, 'POOL',
    p_amount, coalesce(p_reason, 'return to pool'), 'posted', p_amount
  );

  insert into audit_log (actor_role, action, target_account, amount, reason, metadata)
  values ('admin', 'return_to_pool', v_source.account_number, p_amount, p_reason, '{}'::jsonb);

  return v_tx;
end;
$$;

-- Adjust pool directly
create or replace function admin_adjust_pool(
  p_amount numeric,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;
  if p_amount is null then
    raise exception 'amount required';
  end if;

  update bank_pool
  set total_amount = total_amount + p_amount, updated_at = now()
  where id = 1;

  insert into audit_log (actor_role, action, amount, reason, metadata)
  values ('admin', 'adjust_pool', p_amount, p_reason, '{}'::jsonb);
end;
$$;

-- Ensure legacy perform_transfer signature is removed before redefining
drop function if exists perform_transfer(text, numeric, text);

create or replace function admin_set_pool_total(
  p_amount numeric,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current numeric;
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;
  if p_amount is null or p_amount < 0 then
    raise exception 'Invalid amount';
  end if;

  select total_amount into v_current from bank_pool where id = 1 for update;
  update bank_pool set total_amount = p_amount, updated_at = now() where id = 1;

  insert into audit_log (actor_role, action, amount, reason, metadata)
  values ('admin', 'set_pool_total', p_amount, p_reason, jsonb_build_object('previous', v_current));
end;
$$;

create or replace function admin_grant_from_pool(
  p_account text,
  p_amount numeric,
  p_reason text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return allocate_from_pool(p_account, p_amount, p_reason);
end;
$$;

create or replace function perform_transfer(
  p_to_acc text,
  p_amount numeric,
  p_reference text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return transfer_between_users(p_to_acc, p_amount, p_reference);
end;
$$;

-- Freeze / unfreeze / limit
create or replace function freeze_account(p_account text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row accounts%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;
  select * into v_row from accounts where account_number = p_account;
  if not found then
    raise exception 'Account not found';
  end if;

  update accounts set is_frozen = true, freeze_reason = p_reason where account_number = p_account;
  insert into audit_log (actor_role, action, target_account, reason) values ('admin', 'freeze', p_account, p_reason);
  perform notify_user(
    v_row.id,
    'Account frozen',
    coalesce(p_reason, 'Your account has been frozen.'),
    'freeze',
    '{}'::jsonb,
    p_account
  );
end;
$$;

create or replace function unfreeze_account(p_account text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row accounts%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;
  select * into v_row from accounts where account_number = p_account;
  if not found then
    raise exception 'Account not found';
  end if;

  update accounts set is_frozen = false, freeze_reason = null where account_number = p_account;
  insert into audit_log (actor_role, action, target_account, reason) values ('admin', 'unfreeze', p_account, p_reason);
  perform notify_user(
    v_row.id,
    'Account active',
    'Your account has been unfrozen.',
    'unfreeze',
    '{}'::jsonb,
    p_account
  );
end;
$$;

create or replace function set_limit(p_account text, p_limit numeric, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;
  if p_limit is null or p_limit <= 0 then
    raise exception 'Invalid limit';
  end if;
  update accounts set daily_limit = p_limit where account_number = p_account;
  insert into audit_log (actor_role, action, target_account, amount, reason)
  values ('admin', 'set_limit', p_account, p_limit, p_reason);
end;
$$;

-- Admin adjust user balance (+/-) with pool sync
create or replace function admin_adjust_user_balance(
  p_account text,
  p_amount numeric,
  p_reason text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row accounts%rowtype;
  v_tx uuid := gen_random_uuid();
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;
  if p_amount is null or p_amount = 0 then
    raise exception 'Amount cannot be zero';
  end if;

  select * into v_row from accounts where account_number = p_account for update;
  if not found then
    raise exception 'Account not found';
  end if;
  if v_row.is_frozen then
    raise exception 'Account frozen: %', coalesce(v_row.freeze_reason, '');
  end if;

  if p_amount > 0 then
    return allocate_from_pool(p_account, p_amount, p_reason);
  end if;

  if v_row.balance < abs(p_amount) then
    raise exception 'Insufficient funds for debit';
  end if;

  update accounts set balance = balance + p_amount where id = v_row.id;
  update bank_pool set total_amount = total_amount - p_amount, updated_at = now() where id = 1;

  insert into transactions (
    id, from_account, to_account, from_user, amount, reference, status, pool_delta
  ) values (
    v_tx, v_row.account_number, 'POOL', v_row.id, abs(p_amount), coalesce(p_reason, 'debit to pool'), 'posted', abs(p_amount)
  );

  insert into audit_log (actor_role, action, target_account, amount, reason)
  values ('admin', 'debit_user_to_pool', v_row.account_number, p_amount, p_reason);

  return v_tx;
end;
$$;

-- Policies
alter table accounts enable row level security;
alter table beneficiaries enable row level security;
alter table transactions enable row level security;
alter table notifications enable row level security;
alter table audit_log enable row level security;
alter table bank_pool enable row level security;
alter table transaction_flags enable row level security;

create policy "accounts self select" on accounts for select using (id = auth.uid());
create policy "accounts self update name" on accounts for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "beneficiaries self select" on beneficiaries for select using (owner_id = auth.uid());
create policy "beneficiaries self insert" on beneficiaries for insert with check (owner_id = auth.uid());
create policy "beneficiaries self delete" on beneficiaries for delete using (owner_id = auth.uid());

create policy "transactions visible to participant" on transactions for select
  using (from_user = auth.uid() or to_user = auth.uid());

create policy "notifications visible to owner" on notifications for select using (user_id = auth.uid());
create policy "notifications update own" on notifications for update using (user_id = auth.uid());

create policy "audit none" on audit_log for select using (false);
create policy "bank_pool none" on bank_pool for select using (false);
create policy "flags none" on transaction_flags for select using (false);

-- Supabase realtime configuration (optional: expose)
comment on table transactions is 'Realtime stream for transaction feed';
comment on table accounts is 'Realtime stream for account balances/freeze';
comment on table notifications is 'Realtime stream for in-app alerts';
