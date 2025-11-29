import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-16">
      <header className="grid items-center gap-8 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="flex flex-col gap-4">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">PulsePay Realtime</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
            Pool-first banking that never reloads.
          </h1>
          <p className="max-w-2xl text-lg text-slate-200/80">
            Live balances, freeze signals, notifications, and admin controls driven by Supabase
            realtime. Money moves instantly; the UI keeps up.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/register"
              className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-400/30 transition hover:shadow-cyan-300/40"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:text-cyan-100"
            >
              Login
            </Link>
            <Link
              href="/admin"
              className="rounded-full px-4 py-2 text-sm font-semibold text-slate-100 transition hover:text-amber-200"
            >
              Admin console
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-black/30">
          <p className="text-xs uppercase tracking-[0.15em] text-cyan-300">Live stack</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-100">
            <li>Pool-first ledger (bank_pool + accounts)</li>
            <li>Realtime streams: accounts, transactions, notifications</li>
            <li>Freeze reasons & limits enforced in RPC</li>
            <li>Next.js 14 App Router + Supabase Auth/RLS</li>
          </ul>
        </div>
      </header>

      <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl shadow-black/30 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-900/80 p-5 border border-slate-800">
          <p className="text-xs font-semibold text-cyan-300 uppercase tracking-[0.15em]">
            Realtime UX
          </p>
          <p className="mt-3 text-sm text-slate-200/80">
            Balances, transfers, freezes, and notifications stream without page loads.
          </p>
        </div>
        <div className="rounded-xl bg-slate-900/80 p-5 border border-slate-800">
          <p className="text-xs font-semibold text-cyan-300 uppercase tracking-[0.15em]">
            Pool aware
          </p>
          <p className="mt-3 text-sm text-slate-200/80">
            Every credit/debit reconciles against the bank pool with audit entries.
          </p>
        </div>
        <div className="rounded-xl bg-slate-900/80 p-5 border border-slate-800">
          <p className="text-xs font-semibold text-cyan-300 uppercase tracking-[0.15em]">
            Admin ready
          </p>
          <p className="mt-3 text-sm text-slate-200/80">
            Freeze/unfreeze, limits, pool set, allocations, anomaly flags—no SQL required.
          </p>
        </div>
      </section>
    </main>
  );
}
