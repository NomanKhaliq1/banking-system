"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BalanceCard } from "@/components/BalanceCard";
import { TransferForm } from "@/components/TransferForm";
import { TransactionRow } from "@/components/TransactionRow";
import { Beneficiaries } from "@/components/Beneficiaries";
import { NotificationPanel } from "@/components/NotificationPanel";
import { useSupabase } from "@/lib/useSupabase";
import { Account, Transaction, Notification } from "@/types";

export default function DashboardPage() {
  const supabase = useSupabase();
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | undefined>();
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "live" | "error">(
    "connecting",
  );

  const fetchData = useMemo(
    () => async () => {
      setError(null);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: accountRow, error: accountError } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", user.id)
        .single();

      if (accountError || !accountRow) {
        setError(accountError?.message ?? "Account not found.");
        setLoading(false);
        return;
      }

      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .or(`from_user.eq.${user.id},to_user.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(50);

      const { data: notifData } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (txError) {
        setError(txError.message);
      } else {
        setTransactions((txData || []) as Transaction[]);
      }

      setAccount({
        ...accountRow,
        balance: Number(accountRow.balance),
        held_amount: Number(accountRow.held_amount || 0),
      });
      setNotifications((notifData || []) as Notification[]);
      setLoading(false);
    },
    [router, supabase],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!account) return;
    const channel = supabase
      .channel(`dashboard-${account.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "accounts", filter: `id=eq.${account.id}` },
        (payload) => {
          const next = payload.new as Account;
          setAccount({
            ...next,
            balance: Number((next as any).balance),
            held_amount: Number((next as any).held_amount || 0),
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `from_user=eq.${account.id}` },
        (payload) => {
          const txn = payload.new as Transaction;
          setTransactions((prev) => [txn, ...prev].slice(0, 80));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `to_user=eq.${account.id}` },
        (payload) => {
          const txn = payload.new as Transaction;
          setTransactions((prev) => [txn, ...prev].slice(0, 80));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${account.id}` },
        (payload) => {
          const notif = payload.new as Notification;
          setNotifications((prev) => [notif, ...prev].slice(0, 50));
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeStatus("live");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setRealtimeStatus("error");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [account, supabase]);

  const handleTransfer = async ({
    toAcc,
    amount,
    reference,
  }: {
    toAcc: string;
    amount: number;
    reference?: string;
  }) => {
    if (!account) {
      return { success: false, message: "Account not loaded yet." };
    }
    if (account.is_frozen) {
      return { success: false, message: `Account frozen: ${account.freeze_reason || "contact support"}` };
    }
    const lookupRes = await fetch(`/api/lookup-account?account=${encodeURIComponent(toAcc)}`);
    if (!lookupRes.ok) {
      return { success: false, message: "Receiver not found." };
    }

    const { error: rpcError } = await supabase.rpc("transfer_between_users", {
      p_to_account: toAcc,
      p_amount: amount,
      p_reference: reference || null,
    });

    if (rpcError) {
      return { success: false, message: rpcError.message };
    }
    return { success: true };
  };

  const markNotificationRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16">
        <p className="text-slate-200">Loading your dashboard...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16">
        <p className="text-red-400">{error}</p>
      </main>
    );
  }

  if (!account) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Dashboard</p>
          <h1 className="text-3xl font-bold text-white">Hey, {account.full_name || "Banker"}</h1>
          <p className="text-sm text-slate-300">Live banking, no reloads. Stay in the flow.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200">
          <span
            className={`h-2 w-2 rounded-full ${
              realtimeStatus === "live" ? "bg-emerald-400" : realtimeStatus === "error" ? "bg-red-500" : "bg-amber-400"
            }`}
          />
          {realtimeStatus === "live" ? "Realtime: live" : realtimeStatus === "error" ? "Realtime issue" : "Connecting..."}
        </div>
      </div>

      <BalanceCard account={account} />

      {account.is_frozen && (
        <div className="rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-amber-50">
          Transfers are blocked while frozen. Reason: {account.freeze_reason || "not provided"}.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <TransferForm onTransfer={handleTransfer} selectedAccount={selectedAccount} />
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/30">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Live activity</p>
              <p className="text-xs text-slate-400">Newest first</p>
            </div>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {transactions.length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 px-4 py-3 text-sm text-slate-300">
                  No transactions yet. Send a transfer to get started.
                </p>
              )}
              {transactions.map((txn) => (
                <TransactionRow key={txn.id} txn={txn} accountNumber={account.account_number} />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <Beneficiaries ownerId={account.id} onSelect={(acc) => setSelectedAccount(acc)} />
          <NotificationPanel notifications={notifications} onMarkRead={markNotificationRead} />
        </div>
      </div>
    </main>
  );
}
