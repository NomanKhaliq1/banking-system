import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseService";

export async function POST(req: Request) {
  try {
    const { account, status } = await req.json();
    if (!account || typeof account !== "string") {
      return NextResponse.json({ error: "account is required" }, { status: 400 });
    }
    if (!status || typeof status !== "string") {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();
    const { error } = await supabase
      .from("accounts")
      .update({ kyc_status: status })
      .eq("account_number", account.trim());

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await supabase.from("audit_log").insert({
      actor_role: "admin",
      action: "set_kyc",
      target_account: account.trim(),
      amount: null,
      reason: status,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
