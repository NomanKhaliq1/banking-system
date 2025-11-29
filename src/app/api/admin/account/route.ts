import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseService";

export async function POST(req: Request) {
  try {
    const { account, action, limit, reason } = await req.json();
    if (!account || typeof account !== "string") {
      return NextResponse.json({ error: "account is required" }, { status: 400 });
    }
    if (!action || typeof action !== "string") {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();

    if (action === "freeze") {
      const { error } = await supabase.rpc("freeze_account", {
        p_account: account.trim(),
        p_reason: reason || null,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (action === "unfreeze") {
      const { error } = await supabase.rpc("unfreeze_account", {
        p_account: account.trim(),
        p_reason: reason || null,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (action === "limit") {
      const numericLimit = Number(limit);
      if (Number.isNaN(numericLimit) || numericLimit <= 0) {
        return NextResponse.json({ error: "Invalid limit" }, { status: 400 });
      }
      const { error } = await supabase.rpc("set_limit", {
        p_account: account.trim(),
        p_limit: numericLimit,
        p_reason: reason || null,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
