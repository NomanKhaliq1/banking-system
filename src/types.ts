export interface Account {
  id: string;
  full_name: string | null;
  account_number: string;
  balance: number;
  held_amount: number;
  is_frozen: boolean;
  freeze_reason: string | null;
  daily_limit: number;
  kyc_status: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  from_account: string | null;
  to_account: string | null;
  from_user: string | null;
  to_user: string | null;
  from_name?: string | null;
  to_name?: string | null;
  amount: number;
  pool_delta: number;
  status: string;
  reference: string | null;
  created_at: string;
}

export interface Beneficiary {
  id: string;
  owner_id: string;
  name: string;
  account_number: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  account_number: string | null;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  target_account: string | null;
  amount: number | null;
  reason: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}
