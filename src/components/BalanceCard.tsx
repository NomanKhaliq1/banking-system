import { Account } from "@/types";

interface Props {
  account: Account;
}

export function BalanceCard({ account }: Props) {
  const available = Math.max(0, Number(account.balance) - Number(account.held_amount || 0));
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Available</p>
          <p className="mt-2 text-4xl font-semibold text-white">
            ${available.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Held: ${Number(account.held_amount || 0).toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Account</p>
          <p className="mt-2 font-mono text-sm text-slate-100">{account.account_number}</p>
          <span className="mt-2 inline-flex items-center justify-end rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
            {account.kyc_status?.toUpperCase() || "PENDING"}
          </span>
        </div>
      </div>
      {account.is_frozen && (
        <div className="mt-4 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Frozen: {account.freeze_reason || "Contact support for details"}
        </div>
      )}
    </div>
  );
}
