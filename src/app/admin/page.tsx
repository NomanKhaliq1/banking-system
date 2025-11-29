"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/lib/useSupabase";
import { Account, AuditEntry } from "@/types";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

type FlagEntry = {
  id: string;
  transaction_id: string;
  reason: string | null;
  status: string;
  created_at: string;
};

export default function AdminPage() {
  const supabase = useSupabase();
  const [poolAmount, setPoolAmount] = useState<string>("");
  const [poolStatus, setPoolStatus] = useState<string>("");
  const [grantAccount, setGrantAccount] = useState("");
  const [grantAmount, setGrantAmount] = useState<string>("");
  const [grantReason, setGrantReason] = useState("");
  const [grantStatus, setGrantStatus] = useState<string>("");
  const [adjustAccount, setAdjustAccount] = useState("");
  const [adjustAmount, setAdjustAmount] = useState<string>("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustStatus, setAdjustStatus] = useState<string>("");
  const [freezeAccount, setFreezeAccount] = useState("");
  const [freezeAction, setFreezeAction] = useState<"freeze" | "unfreeze">("freeze");
  const [freezeReason, setFreezeReason] = useState("");
  const [freezeStatus, setFreezeStatus] = useState("");
  const [limitAccount, setLimitAccount] = useState("");
  const [limitAmount, setLimitAmount] = useState("50000");
  const [limitReason, setLimitReason] = useState("");
  const [limitStatus, setLimitStatus] = useState("");
  const [flagTxnId, setFlagTxnId] = useState("");
  const [flagReason, setFlagReason] = useState("");
  const [flagStatus, setFlagStatus] = useState("");
  const [summary, setSummary] = useState<{
    poolTotal: number;
    reserveAmount: number;
    totalUsers: number;
    totalBalances: number;
    frozenUsers: number;
  } | null>(null);
  const [profiles, setProfiles] = useState<Account[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [flags, setFlags] = useState<FlagEntry[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [usersExpanded, setUsersExpanded] = useState(false);
  const [auditExpanded, setAuditExpanded] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [userActionStatus, setUserActionStatus] = useState("");

  const fetchOverview = async () => {
    setLoadingOverview(true);
    const res = await fetch("/api/admin/overview", { cache: "no-store" });
    if (!res.ok) {
      setLoadingOverview(false);
      return;
    }
    const body = await res.json();
    const normalizedProfiles = (body.profiles || []).map((p: Account) => ({
      ...p,
      balance: Number(p.balance),
      held_amount: Number(p.held_amount || 0),
      daily_limit: p.daily_limit != null ? Number(p.daily_limit) : null,
    }));

    setSummary({
      poolTotal: Number(body.poolTotal ?? 0),
      reserveAmount: Number(body.reserveAmount ?? 0),
      totalUsers: body.totalUsers ?? 0,
      totalBalances: Number(body.totalBalances ?? 0),
      frozenUsers: body.frozenUsers ?? 0,
    });
    if (body.poolTotal != null) {
      setPoolAmount(String(body.poolTotal));
    }
    const sorted = normalizedProfiles.sort(
      (a: Account, b: Account) => Number(b.balance) - Number(a.balance),
    );
    setProfiles(sorted);
    setAudit(body.audit || []);
    setFlags(body.flags || []);
    setLoadingOverview(false);
  };

  const handleSetPool = async () => {
    setPoolStatus("");
    const num = Number(poolAmount);
    if (Number.isNaN(num) || num < 0) {
      setPoolStatus("Invalid amount");
      return;
    }
    const { error } = await supabase.rpc("admin_set_pool_total", { p_amount: num });
    if (error) {
      setPoolStatus(error.message);
    } else {
      setPoolStatus("Pool updated");
    }
    fetchOverview();
  };

  const handleGrant = async () => {
    setGrantStatus("");
    const num = Number(grantAmount);
    if (Number.isNaN(num) || num <= 0) {
      setGrantStatus("Invalid amount");
      return;
    }
    const res = await fetch("/api/admin/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account: grantAccount.trim(),
        amount: num,
        reason: grantReason || null,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      setGrantStatus(body.error || "Error");
    } else {
      setGrantStatus("Granted successfully");
      setGrantAccount("");
      setGrantAmount("");
      setGrantReason("");
    }
    fetchOverview();
  };

  const handleAdjust = async () => {
    setAdjustStatus("");
    const num = Number(adjustAmount);
    if (Number.isNaN(num) || num === 0) {
      setAdjustStatus("Amount must be non-zero (use + for credit, - for debit)");
      return;
    }
    const res = await fetch("/api/admin/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account: adjustAccount.trim(),
        amount: num,
        reason: adjustReason || null,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      setAdjustStatus(body.error || "Error");
    } else {
      setAdjustStatus("Adjusted successfully");
      setAdjustAccount("");
      setAdjustAmount("");
      setAdjustReason("");
    }
    fetchOverview();
  };

  const handleFreeze = async () => {
    setFreezeStatus("");
    if (!freezeAccount.trim()) {
      setFreezeStatus("Account required");
      return;
    }
    const res = await fetch("/api/admin/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account: freezeAccount.trim(),
        action: freezeAction,
        reason: freezeReason || null,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      setFreezeStatus(body.error || "Error");
    } else {
      setFreezeStatus(`${freezeAction === "freeze" ? "Frozen" : "Unfrozen"} successfully`);
      setFreezeReason("");
    }
    fetchOverview();
  };

  const handleLimit = async () => {
    setLimitStatus("");
    if (!limitAccount.trim()) {
      setLimitStatus("Account required");
      return;
    }
    const num = Number(limitAmount);
    if (Number.isNaN(num) || num <= 0) {
      setLimitStatus("Invalid limit");
      return;
    }
    const res = await fetch("/api/admin/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account: limitAccount.trim(),
        action: "limit",
        limit: num,
        reason: limitReason || null,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      setLimitStatus(body.error || "Error");
    } else {
      setLimitStatus("Limit updated");
      setLimitReason("");
    }
    fetchOverview();
  };

  const handleFlag = async () => {
    setFlagStatus("");
    if (!flagTxnId) {
      setFlagStatus("Transaction ID required");
      return;
    }
    const res = await fetch("/api/admin/flag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId: flagTxnId, reason: flagReason }),
    });
    const body = await res.json();
    if (!res.ok) {
      setFlagStatus(body.error || "Error");
    } else {
      setFlagStatus("Flagged");
      setFlagTxnId("");
      setFlagReason("");
    }
    fetchOverview();
  };

  const handleVerifyKyc = async (accountNumber: string) => {
    setUserActionStatus("");
    const res = await fetch("/api/admin/kyc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account: accountNumber, status: "verified" }),
    });
    const body = await res.json();
    if (!res.ok) {
      setUserActionStatus(body.error || "Failed to update KYC");
    } else {
      setUserActionStatus(`KYC set to verified for ${accountNumber}`);
      fetchOverview();
    }
  };

  useEffect(() => {
    fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Admin</p>
        <h1 className="text-4xl font-bold text-white">Bank pool control panel</h1>
        <p className="text-sm text-slate-300">
          Centralized control: set pool total, move funds to/from users, and monitor balances.
        </p>
      </div>

      {summary && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/30">
            <p className="text-xs uppercase tracking-[0.15em] text-cyan-300">Pool available</p>
            <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(summary.poolTotal)}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/30">
            <p className="text-xs uppercase tracking-[0.15em] text-cyan-300">Reserve</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {formatCurrency(summary.reserveAmount)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/30">
            <p className="text-xs uppercase tracking-[0.15em] text-cyan-300">Bank total</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {formatCurrency(summary.poolTotal + summary.totalBalances + summary.reserveAmount)}
            </p>
            <p className="text-xs text-slate-400">User balances: {formatCurrency(summary.totalBalances)}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/30">
            <p className="text-xs uppercase tracking-[0.15em] text-cyan-300">Total users</p>
            <p className="mt-2 text-2xl font-semibold text-white">{summary.totalUsers}</p>
            <p className="text-xs text-slate-400">Frozen: {summary.frozenUsers}</p>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/30">
        <h2 className="text-lg font-semibold text-white">Set pool total</h2>
        <p className="text-xs text-slate-400">Define the current bank pool. This overwrites existing pool.</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-400/60 focus:border-cyan-400/70 focus:ring-2"
            value={poolAmount}
            onChange={(e) => setPoolAmount(e.target.value)}
            placeholder="Total pool amount"
          />
          <button
            onClick={handleSetPool}
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-400/30 transition hover:shadow-cyan-300/40"
          >
            Save
          </button>
        </div>
        {poolStatus && <p className="mt-2 text-sm text-cyan-200">{poolStatus}</p>}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/30">
        <h2 className="text-lg font-semibold text-white">Grant from pool</h2>
        <p className="text-xs text-slate-400">Move funds from pool to a user (credits user, debits pool).</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <input
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-400/60 focus:border-cyan-400/70 focus:ring-2"
            placeholder="Account number"
            value={grantAccount}
            onChange={(e) => setGrantAccount(e.target.value)}
          />
          <input
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-400/60 focus:border-cyan-400/70 focus:ring-2"
            placeholder="Amount"
            value={grantAmount}
            onChange={(e) => setGrantAmount(e.target.value)}
          />
          <input
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-400/60 focus:border-cyan-400/70 focus:ring-2"
            placeholder="Reason (optional)"
            value={grantReason}
            onChange={(e) => setGrantReason(e.target.value)}
          />
          <button
            onClick={handleGrant}
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-400/30 transition hover:shadow-cyan-300/40"
          >
            Grant
          </button>
        </div>
        {grantStatus && <p className="mt-2 text-sm text-cyan-200">{grantStatus}</p>}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/30">
        <h2 className="text-lg font-semibold text-white">Adjust user balance (+/-)</h2>
        <p className="text-xs text-slate-400">
          Positive amount = credit from pool. Negative amount = debit back to pool. User balance cannot go below 0; pool cannot go negative.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <input
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-400/60 focus:border-cyan-400/70 focus:ring-2"
            placeholder="Account number"
            value={adjustAccount}
            onChange={(e) => setAdjustAccount(e.target.value)}
          />
          <input
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-400/60 focus:border-cyan-400/70 focus:ring-2"
            placeholder="Amount (use - for debit)"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
          />
          <input
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-400/60 focus:border-cyan-400/70 focus:ring-2"
            placeholder="Reason (optional)"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
          />
          <button
            onClick={handleAdjust}
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-400/30 transition hover:shadow-cyan-300/40"
          >
            Adjust
          </button>
        </div>
        {adjustStatus && <p className="mt-2 text-sm text-cyan-200">{adjustStatus}</p>}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/30">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Account controls</h2>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <input
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-400/60 focus:border-cyan-400/70 focus:ring-2"
            placeholder="Account number"
            value={freezeAccount}
            onChange={(e) => setFreezeAccount(e.target.value)}
          />
          <select
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-400/60 focus:border-cyan-400/70 focus:ring-2"
            value={freezeAction}
            onChange={(e) => setFreezeAction(e.target.value as "freeze" | "unfreeze")}
          >
            <option value="freeze">Freeze</option>
            <option value="unfreeze">Unfreeze</option>
          </select>
          <input
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-400/60 focus:border-cyan-400/70 focus:ring-2"
            placeholder="Reason (optional)"
            value={freezeReason}
            onChange={(e) => setFreezeReason(e.target.value)}
          />
          <button
            onClick={handleFreeze}
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-400/30 transition hover:shadow-cyan-300/40"
          >
            Apply
          </button>
        </div>
        {freezeStatus && <p className="mt-2 text-sm text-cyan-200">{freezeStatus}</p>}
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <input
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-400/60 focus:border-cyan-400/70 focus:ring-2"
            placeholder="Account number"
            value={limitAccount}
            onChange={(e) => setLimitAccount(e.target.value)}
          />
          <input
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-400/60 focus:border-cyan-400/70 focus:ring-2"
            placeholder="Per-transaction limit"
            value={limitAmount}
            onChange={(e) => setLimitAmount(e.target.value)}
          />
          <input
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-400/60 focus:border-cyan-400/70 focus:ring-2"
            placeholder="Reason (optional)"
            value={limitReason}
            onChange={(e) => setLimitReason(e.target.value)}
          />
          <button
            onClick={handleLimit}
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-400/30 transition hover:shadow-cyan-300/40"
          >
            Set limit
          </button>
        </div>
        {limitStatus && <p className="mt-2 text-sm text-cyan-200">{limitStatus}</p>}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/30">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Flag transactions</h2>
          <button
            onClick={fetchOverview}
            className="text-xs text-cyan-300 underline-offset-4 hover:underline"
          >
            Refresh
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Mark a transaction for review. Flags are read-only indicators (no reversal here).
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <input
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-400/60 focus:border-cyan-400/70 focus:ring-2"
            placeholder="Transaction ID"
            value={flagTxnId}
            onChange={(e) => setFlagTxnId(e.target.value)}
          />
          <input
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-400/60 focus:border-cyan-400/70 focus:ring-2"
            placeholder="Reason"
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
          />
          <button
            onClick={handleFlag}
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-400/30 transition hover:shadow-cyan-300/40"
          >
            Flag
          </button>
        </div>
        {flagStatus && <p className="mt-2 text-sm text-cyan-200">{flagStatus}</p>}
        <div className="mt-4 max-h-64 overflow-y-auto rounded-lg border border-slate-800">
          <table className="min-w-full text-sm text-slate-100">
            <thead className="bg-slate-900/80 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Txn</th>
                <th className="px-3 py-2 text-left">Reason</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">When</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((f) => (
                <tr key={f.id} className="border-t border-slate-800">
                  <td className="px-3 py-2">{f.transaction_id}</td>
                  <td className="px-3 py-2 text-slate-300">{f.reason || "-"}</td>
                  <td className="px-3 py-2">{f.status}</td>
                  <td className="px-3 py-2 text-right text-slate-400">
                    {new Date(f.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {flags.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-center text-slate-400">
                    No flags yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/30">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Users</h2>
          <div className="flex items-center gap-2 text-xs">
            <input
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 outline-none ring-cyan-400/60 focus:border-cyan-400/70 focus:ring-2"
              placeholder="Search name/account"
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                setUserPage(1);
              }}
            />
            <button
              onClick={() => setUsersExpanded((prev) => !prev)}
              className="rounded-md border border-slate-700 px-2 py-1 text-slate-200 hover:border-cyan-300/70 hover:text-cyan-200"
            >
              {usersExpanded ? "Collapse" : "Fullscreen"}
            </button>
            <button
              onClick={fetchOverview}
              className="text-cyan-300 underline-offset-4 hover:underline"
            >
              Refresh
            </button>
          </div>
        </div>
        {userActionStatus && <p className="mt-2 text-sm text-cyan-200">{userActionStatus}</p>}
        <div
          className={`mt-3 rounded-lg border border-slate-800 ${
            usersExpanded ? "max-h-none" : "max-h-72"
          } overflow-y-auto`}
        >
          <table className="min-w-full text-sm text-slate-100">
            <thead className="bg-slate-900/80 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Account</th>
                <th className="px-3 py-2 text-right">Balance</th>
                <th className="px-3 py-2 text-right">Held</th>
                <th className="px-3 py-2 text-right">Limit</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">KYC</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles
                .filter((p) => {
                  if (!userSearch.trim()) return true;
                  const q = userSearch.toLowerCase();
                  return (
                    (p.full_name || "").toLowerCase().includes(q) || p.account_number.toLowerCase().includes(q)
                  );
                })
                .slice((userPage - 1) * 10, userPage * 10)
                .map((p) => (
                  <tr key={p.id} className="border-t border-slate-800">
                    <td className="px-3 py-2">{p.full_name || "Unknown"}</td>
                    <td className="px-3 py-2">{p.account_number}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(Number(p.balance))}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(Number(p.held_amount || 0))}</td>
                    <td className="px-3 py-2 text-right">
                      {p.daily_limit != null ? formatCurrency(Number(p.daily_limit)) : "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-300">
                      {p.is_frozen ? `Frozen${p.freeze_reason ? ` (${p.freeze_reason})` : ""}` : "Active"}
                    </td>
                    <td className="px-3 py-2 text-slate-300">{p.kyc_status?.toUpperCase() || "-"}</td>
                    <td className="px-3 py-2">
                      {p.kyc_status?.toLowerCase() !== "verified" ? (
                        <button
                          className="text-xs text-cyan-300 underline-offset-4 hover:underline"
                          onClick={() => handleVerifyKyc(p.account_number)}
                        >
                          Verify
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-300">Verified</span>
                      )}
                    </td>
                  </tr>
                ))}
              {profiles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-3 text-center text-slate-400">
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <div>
            Page {userPage} of {Math.max(1, Math.ceil(profiles.filter((p) => {
              if (!userSearch.trim()) return true;
              const q = userSearch.toLowerCase();
              return (
                (p.full_name || "").toLowerCase().includes(q) || p.account_number.toLowerCase().includes(q)
              );
            }).length / 10))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUserPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-slate-700 px-2 py-1 text-slate-200 hover:border-cyan-300/70 hover:text-cyan-200"
            >
              Prev
            </button>
            <button
              onClick={() =>
                setUserPage((p) =>
                  Math.min(
                    Math.max(1, Math.ceil(
                      profiles.filter((pr) => {
                        if (!userSearch.trim()) return true;
                        const q = userSearch.toLowerCase();
                        return (
                          (pr.full_name || "").toLowerCase().includes(q) ||
                          pr.account_number.toLowerCase().includes(q)
                        );
                      }).length / 10
                    )),
                    p + 1,
                  ),
                )
              }
              className="rounded-md border border-slate-700 px-2 py-1 text-slate-200 hover:border-cyan-300/70 hover:text-cyan-200"
            >
              Next
            </button>
          </div>
        </div>
        {loadingOverview && <p className="mt-2 text-xs text-slate-400">Refreshing...</p>}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/30">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Audit log (last 20)</h2>
          <div className="flex items-center gap-2 text-xs">
            <input
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 outline-none ring-cyan-400/60 focus:border-cyan-400/70 focus:ring-2"
              placeholder="Search action/account"
              value={auditSearch}
              onChange={(e) => {
                setAuditSearch(e.target.value);
                setAuditPage(1);
              }}
            />
            <button
              onClick={() => setAuditExpanded((prev) => !prev)}
              className="rounded-md border border-slate-700 px-2 py-1 text-slate-200 hover:border-cyan-300/70 hover:text-cyan-200"
            >
              {auditExpanded ? "Collapse" : "Fullscreen"}
            </button>
            <button
              onClick={fetchOverview}
              className="text-cyan-300 underline-offset-4 hover:underline"
            >
              Refresh
            </button>
          </div>
        </div>
        <div
          className={`mt-3 rounded-lg border border-slate-800 ${
            auditExpanded ? "max-h-none" : "max-h-72"
          } overflow-y-auto`}
        >
          <table className="min-w-full text-sm text-slate-100">
            <thead className="bg-slate-900/80 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Action</th>
                <th className="px-3 py-2 text-left">Account</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Details</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-right">When</th>
              </tr>
            </thead>
            <tbody>
              {audit
                .filter((a) => {
                  if (!auditSearch.trim()) return true;
                  const q = auditSearch.toLowerCase();
                  return (
                    a.action.toLowerCase().includes(q) ||
                    (a.target_account || "").toLowerCase().includes(q) ||
                    (a.reason || "").toLowerCase().includes(q)
                  );
                })
                .slice((auditPage - 1) * 10, auditPage * 10)
                .map((a) => {
                  const matchedProfile = profiles.find((p) => p.account_number === a.target_account);
                  const meta = (a as any).metadata || {};
                  const fromAcc = meta.from as string | undefined;
                  const toAcc = meta.to as string | undefined;
                  const fromName = profiles.find((p) => p.account_number === fromAcc)?.full_name;
                  const toName = profiles.find((p) => p.account_number === toAcc)?.full_name;
                  const detail =
                    fromAcc && toAcc
                      ? `${fromAcc}${fromName ? ` (${fromName})` : ""} → ${toAcc}${
                          toName ? ` (${toName})` : ""
                        }`
                      : a.reason || "-";
                  return (
                    <tr key={a.id} className="border-t border-slate-800">
                      <td className="px-3 py-2">{a.action}</td>
                      <td className="px-3 py-2">{a.target_account || "-"}</td>
                      <td className="px-3 py-2 text-slate-300">{matchedProfile?.full_name || "-"}</td>
                      <td className="px-3 py-2 text-slate-300">{detail}</td>
                      <td className="px-3 py-2 text-right">
                        {a.amount != null ? formatCurrency(Number(a.amount)) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-400">
                        {new Date(a.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              {audit.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-center text-slate-400">
                    No audit entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <div>
            Page {auditPage} of {Math.max(1, Math.ceil(audit.filter((a) => {
              if (!auditSearch.trim()) return true;
              const q = auditSearch.toLowerCase();
              return (
                a.action.toLowerCase().includes(q) ||
                (a.target_account || "").toLowerCase().includes(q) ||
                (a.reason || "").toLowerCase().includes(q)
              );
            }).length / 10))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-slate-700 px-2 py-1 text-slate-200 hover:border-cyan-300/70 hover:text-cyan-200"
            >
              Prev
            </button>
            <button
              onClick={() =>
                setAuditPage((p) =>
                  Math.min(
                    Math.max(1, Math.ceil(
                      audit.filter((a) => {
                        if (!auditSearch.trim()) return true;
                        const q = auditSearch.toLowerCase();
                        return (
                          a.action.toLowerCase().includes(q) ||
                          (a.target_account || "").toLowerCase().includes(q) ||
                          (a.reason || "").toLowerCase().includes(q)
                        );
                      }).length / 10
                    )),
                    p + 1,
                  ),
                )
              }
              className="rounded-md border border-slate-700 px-2 py-1 text-slate-200 hover:border-cyan-300/70 hover:text-cyan-200"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
