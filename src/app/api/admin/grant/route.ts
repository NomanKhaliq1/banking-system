import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseService";

export async function POST(req: Request) {
  try {
    const { account, amount, reason } = await req.json();
    if (!account || typeof account !== "string") {
      return NextResponse.json({ error: "account is required" }, { status: 400 });
    }
    const num = Number(amount);
    if (Number.isNaN(num) || num <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();
    // Call base allocator to avoid overload ambiguity on admin_grant_from_pool.
    const { error } = await supabase.rpc("allocate_from_pool", {
      p_account: account.trim(),
      p_amount: num,
      p_reason: reason || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
