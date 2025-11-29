"use client";

import { useEffect, useState } from "react";
import { Beneficiary } from "@/types";
import { useSupabase } from "@/lib/useSupabase";

interface Props {
  ownerId: string;
  onSelect: (account: string) => void;
}

export function Beneficiaries({ ownerId, onSelect }: Props) {
  const supabase = useSupabase();
  const [list, setList] = useState<Beneficiary[]>([]);
  const [account, setAccount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "found" | "not_found">(
    "idle",
  );
  const [resolvedName, setResolvedName] = useState<string>("");

  const fetchList = async () => {
    const { data, error: err } = await supabase
      .from("beneficiaries")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });
    if (err) {
      setError(err.message);
    } else {
      setList(data || []);
      setError(null);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: insertError } = await supabase.from("beneficiaries").insert({
      owner_id: ownerId,
      name: resolvedName || "Unknown",
      account_number: account.trim(),
    });
    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setAccount("");
    setResolvedName("");
    setLookupStatus("idle");
    fetchList();
  };

  const handleLookup = async (acc: string) => {
    if (!acc || acc.length < 4) {
      setLookupStatus("idle");
      setResolvedName("");
      return;
    }
    setLookupStatus("loading");
    const res = await fetch(`/api/lookup-account?account=${encodeURIComponent(acc)}`);
    if (!res.ok) {
      setLookupStatus("not_found");
      setResolvedName("");
      return;
    }
    const body = (await res.json()) as { full_name: string | null; account_number: string };
    setResolvedName(body.full_name || "Unknown");
    setLookupStatus("found");
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/30">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Beneficiaries</p>
      </div>
      <form onSubmit={handleAdd} className="mt-3 space-y-3">
        <input
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-400/60 focus:border-cyan-400/70 focus:ring-2"
          placeholder="Account number (77xxxxxxxx)"
          value={account}
          onChange={(e) => {
            const next = e.target.value.trim();
            setAccount(next);
            handleLookup(next);
          }}
          required
        />
        {lookupStatus === "loading" && (
          <p className="text-xs text-slate-400">Looking up name...</p>
        )}
        {lookupStatus === "found" && (
          <p className="text-xs text-green-400">Name: {resolvedName}</p>
        )}
        {lookupStatus === "not_found" && (
          <p className="text-xs text-red-400">No profile found for this account.</p>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={
            loading ||
            !account ||
            lookupStatus === "loading" ||
            lookupStatus === "not_found" ||
            account.length < 4
          }
          className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 border border-slate-700 transition hover:border-cyan-400/80 disabled:opacity-60"
        >
          {loading ? "Saving..." : "Add"}
        </button>
      </form>
      <div className="mt-4 space-y-2">
        {list.map((b) => (
          <button
            key={b.id}
            onClick={() => onSelect(b.account_number)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-left text-sm text-slate-100 transition hover:border-cyan-400/80"
          >
            <span className="block font-semibold">{b.name}</span>
            <span className="block text-xs text-slate-400">{b.account_number}</span>
          </button>
        ))}
        {list.length === 0 && (
          <p className="text-xs text-slate-400">No beneficiaries yet. Add one to quick-fill.</p>
        )}
      </div>
    </div>
  );
}
