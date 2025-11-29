import { Transaction } from "@/types";
import { formatDistanceToNow } from "date-fns";
import clsx from "clsx";

interface Props {
  txn: Transaction;
  accountNumber: string;
}

export function TransactionRow({ txn, accountNumber }: Props) {
  const isCredit = txn.to_account === accountNumber;
  const isDebit = txn.from_account === accountNumber;
  const counterpartyName = isCredit
    ? txn.from_name || txn.from_account || "Unknown"
    : txn.to_name || txn.to_account || "Unknown";

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-white">
          {isCredit ? "Incoming" : isDebit ? "Outgoing" : txn.status}
        </p>
        <p className="text-xs text-slate-400">
          With: {counterpartyName} • Ref: {txn.reference ? txn.reference : "—"} •{" "}
          {formatDistanceToNow(new Date(txn.created_at), { addSuffix: true })}
        </p>
        <p className="text-xs text-slate-500">
          From {txn.from_account || "—"} → To {txn.to_account || "—"}
        </p>
      </div>
      <div className="text-right">
        <p
          className={clsx("text-lg font-semibold", {
            "text-green-400": isCredit,
            "text-red-400": isDebit,
            "text-slate-200": !isCredit && !isDebit,
          })}
        >
          {isCredit ? "+" : isDebit ? "-" : ""}
          ${Number(txn.amount).toLocaleString()}
        </p>
        <p className="text-xs text-slate-400">
          {isCredit ? "Credit" : isDebit ? "Debit" : txn.status}
        </p>
        {txn.pool_delta !== 0 && (
          <p className="text-[11px] text-cyan-300">
            Pool Δ {txn.pool_delta > 0 ? "+" : ""}
            {Number(txn.pool_delta).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
