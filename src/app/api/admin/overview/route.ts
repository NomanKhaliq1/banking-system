import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseService";

// Always fetch fresh admin data after mutations.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createSupabaseServiceRoleClient();

    const { data: pool, error: poolError } = await supabase
      .from("bank_pool")
      .select("total_amount, reserve_amount")
      .maybeSingle();

    if (poolError) {
      return NextResponse.json({ error: poolError.message }, { status: 400 });
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("accounts")
      .select(
        `
        id,
        full_name,
        account_number,
        balance,
        held_amount,
        is_frozen,
        freeze_reason,
        daily_limit,
        kyc_status,
        created_at
        `,
      )
      .order("balance", { ascending: false });

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 400 });
    }

    const totalUsers = profiles?.length || 0;
    const totalBalances = profiles?.reduce((sum, p) => sum + Number(p.balance || 0), 0) || 0;
    const frozenUsers = profiles?.filter((p) => p.is_frozen)?.length || 0;

    const { data: audits } = await supabase
      .from("audit_log")
      .select("id, action, target_account, amount, reason, actor_id, actor_role, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(30);

    const { data: flags } = await supabase
      .from("transaction_flags")
      .select("id, transaction_id, reason, status, created_at")
      .order("created_at", { ascending: false })
      .limit(30);

    return NextResponse.json({
      poolTotal: pool?.total_amount ?? 0,
      reserveAmount: pool?.reserve_amount ?? 0,
      totalUsers,
      totalBalances,
      frozenUsers,
      profiles: profiles || [],
      audit: audits || [],
      flags: flags || [],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
