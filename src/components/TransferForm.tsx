"use client";

import { useEffect, useState } from "react";

interface Props {
  onTransfer: (payload: { toAcc: string; amount: number; reference?: string }) => Promise<{
    success: boolean;
    message?: string;
  }>;
  selectedAccount?: string;
}

export function TransferForm({ onTransfer, selectedAccount }: Props) {
  const [toAcc, setToAcc] = useState(selectedAccount ?? "");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lookupName, setLookupName] = useState<string | null>(null);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "found" | "not_found">(
    "idle",
  );

  const handleLookup = async (account: string) => {
    if (!account || account.length < 4) {
      setLookupName(null);
      setLookupStatus("idle");
      return;
    }
    setLookupStatus("loading");
    const res = await fetch(`/api/lookup-account?account=${encodeURIComponent(account)}`);
    if (!res.ok) {
      setLookupName(null);
      setLookupStatus("not_found");
      return;
    }
    const body = (await res.json()) as { full_name: string | null; account_number: string };
    setLookupName(body.full_name || "Unknown name");
    setLookupStatus("found");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }
    if (lookupStatus === "not_found") {
      setError("Receiver account not found.");
      return;
    }
    setSubmitting(true);
    const result = await onTransfer({ toAcc, amount: numericAmount, reference });
    setSubmitting(false);

    if (!result.success) {
      setError(result.message ?? "Transfer failed.");
      return;
    }
    setSuccess("Transfer sent.");
    setToAcc("");
    setAmount("");
    setReference("");
  };

  useEffect(() => {
    if (selectedAccount && selectedAccount !== toAcc) {
      setToAcc(selectedAccount);
      handleLookup(selectedAccount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Transfer</p>
          <p className="text-lg font-semibold text-white">Send money</p>
        </div>
      </div>
      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm text-slate-200">To Account</label>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-400/60 focus:border-cyan-400/70 focus:ring-2"
            placeholder="77xxxxxxxx"
            value={toAcc}
            onChange={(e) => {
              const next = e.target.value.trim();
              setToAcc(next);
              handleLookup(next);
            }}
            required
          />
          {lookupStatus === "loading" && (
            <p className="text-xs text-slate-400">Checking receiver...</p>
          )}
          {lookupStatus === "found" && lookupName && (
            <p className="text-xs text-green-400">
              Receiver: <span className="font-semibold text-white">{lookupName}</span>
            </p>
          )}
          {lookupStatus === "not_found" && (
            <p className="text-xs text-red-400">No user found for this account.</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-200">Amount</label>
          <input
            type="number"
            min="1"
            step="0.01"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-400/60 focus:border-cyan-400/70 focus:ring-2"
            placeholder="100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-200">Reference (optional)</label>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-400/60 focus:border-cyan-400/70 focus:ring-2"
            placeholder="For lunch"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-green-400">{success}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-400/30 transition hover:shadow-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
