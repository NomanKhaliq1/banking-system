import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseService";

export async function POST(req: Request) {
  try {
    const { transactionId, reason } = await req.json();
    if (!transactionId) {
      return NextResponse.json({ error: "transactionId is required" }, { status: 400 });
    }
    const supabase = createSupabaseServiceRoleClient();

    const { error } = await supabase
      .from("transaction_flags")
      .insert({ transaction_id: transactionId, reason, status: "OPEN" });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    await supabase
      .from("audit_log")
      .insert({ action: "flag_transaction", target_account: null, reason, amount: null, actor_role: "admin" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
