import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseService";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const account = searchParams.get("account");

  if (!account || account.trim().length === 0) {
    return NextResponse.json({ error: "account is required" }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("full_name, account_number")
    .eq("account_number", account)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    account_number: data.account_number,
    full_name: data.full_name,
  });
}
