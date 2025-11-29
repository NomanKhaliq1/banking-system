"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/lib/useSupabase";

export default function LoginPage() {
  const supabase = useSupabase();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/dashboard");
      }
    });
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      const message =
        signInError.message &&
        signInError.message.toLowerCase().includes("email not confirmed")
          ? "Email not confirmed. Please verify the link sent to your email, then login."
          : signInError.message || "Invalid login credentials.";
      setError(message);
      setLoading(false);
      return;
    }

    // Check if profile exists
    if (data.user) {
      const { data: profile } = await supabase.from("accounts").select("id").eq("id", data.user.id).single();

      if (!profile) {
        // Account missing! Attempt recovery.
        console.log("Account missing for user, attempting recovery...");
        const res = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: data.user.id, fullName: "Recovered User" }), // We don't have name here, use placeholder
        });
        if (!res.ok) {
          console.error("Failed to recover profile");
          setError("Login successful, but failed to load account. Please contact support.");
          setLoading(false);
          return;
        }
      }
    }

    setLoading(false);
    router.push("/dashboard");
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Login</p>
        <h1 className="text-3xl font-bold text-white">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-300">Access your PulsePay dashboard.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/30">
        <div className="space-y-2">
          <label className="text-sm text-slate-200">Email</label>
          <input
            type="email"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-400/60 focus:border-cyan-400/70 focus:ring-2"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-200">Password</label>
          <input
            type="password"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-400/60 focus:border-cyan-400/70 focus:ring-2"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && (
          <p className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-400/30 transition hover:shadow-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
        <p className="text-center text-sm text-slate-300">
          New here?{" "}
          <Link href="/register" className="text-cyan-300 underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </main>
  );
}
