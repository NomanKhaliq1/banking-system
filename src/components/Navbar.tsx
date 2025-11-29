"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Session } from "@supabase/supabase-js";
import { useSupabase } from "@/lib/useSupabase";

export function Navbar() {
  const supabase = useSupabase();
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, nextSession) => setSession(nextSession));

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
    if (pathname !== "/") {
      router.push("/login");
    }
  };

  return (
    <nav className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-lg font-semibold text-white">
          PulsePay Live
        </Link>
        <div className="flex items-center gap-2 text-sm">
          {session ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-full px-3 py-1 font-medium text-slate-100 transition hover:text-cyan-200"
              >
                Dashboard
              </Link>
              <Link
                href="/admin"
                className="rounded-full px-3 py-1 font-medium text-slate-100 transition hover:text-amber-200"
              >
                Admin
              </Link>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="rounded-full border border-slate-700 px-3 py-1 font-medium text-slate-100 transition hover:border-cyan-400/80 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-3 py-1 font-medium text-slate-100 transition hover:text-cyan-200"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-cyan-400 px-3 py-1 font-semibold text-slate-950 shadow-lg shadow-cyan-400/30 transition hover:shadow-cyan-300/40"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
