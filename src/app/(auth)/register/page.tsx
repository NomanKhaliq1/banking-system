"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/lib/useSupabase";
import { generateAccountNumber } from "@/lib/account";

export default function RegisterPage() {
  const supabase = useSupabase();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
    setSuccess(null);
    setLoading(true);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const userId = signUpData.user?.id;
    if (!userId) {
      setError("User not found after signup.");
      setLoading(false);
      return;
    }

    const accountNumber = generateAccountNumber();
    const profileRes = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, fullName, accountNumber }),
    });
    if (!profileRes.ok) {
      const body = await profileRes.json().catch(() => ({}));
      // If profile already exists, continue (user re-submitted after partial success).
      if (body.error && !String(body.error).toLowerCase().includes("duplicate")) {
        setError(body.error || "Failed to create profile.");
        setLoading(false);
        return;
      }
    }

    // If Supabase returned a session (email confirmation off), go to dashboard.
    if (signUpData.session) {
      setLoading(false);
      router.push("/dashboard");
      return;
    }

    // Email confirmation flow: profile is created via service role. Ask user to verify email then login.
    setSuccess("Account created. Please verify the email we just sent you, then log in.");
    setLoading(false);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Register</p>
        <h1 className="text-3xl font-bold text-white">Create your PulsePay account</h1>
        <p className="mt-2 text-sm text-slate-300">
          Sign up and we will create your PulsePay profile with a unique account number.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/30">
        <div className="space-y-2">
          <label className="text-sm text-slate-200">Full name</label>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-cyan-400/60 focus:border-cyan-400/70 focus:ring-2"
            placeholder="Ayesha Khan"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
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
            placeholder="At least 6 characters"
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
        {success && (
          <p className="rounded-lg border border-green-500/50 bg-green-500/10 px-3 py-2 text-sm text-green-200">
            {success}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-400/30 transition hover:shadow-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create account"}
        </button>
        <p className="text-center text-sm text-slate-300">
          Already have an account?{" "}
          <Link href="/login" className="text-cyan-300 underline-offset-4 hover:underline">
            Login
          </Link>
        </p>
      </form>
    </main>
  );
}
