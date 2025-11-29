import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseService";

export async function POST(req: Request) {
  try {
    const { userId, fullName, accountNumber } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();
    let attempts = 0;
    const maxAttempts = 3;
    let currentAccountNumber = accountNumber;

    while (attempts < maxAttempts) {
      if (!currentAccountNumber || attempts > 0) {
        const random = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join("");
        currentAccountNumber = `77${random}`;
      }

      const { error } = await supabase
        .from("accounts")
        .upsert(
          {
            id: userId,
            full_name: fullName || null,
            account_number: currentAccountNumber,
          },
          { onConflict: "id" },
        );

      if (!error) {
        await supabase
          .from("transactions")
          .update({ from_name: fullName || null })
          .eq("from_account", currentAccountNumber);
        await supabase
          .from("transactions")
          .update({ to_name: fullName || null })
          .eq("to_account", currentAccountNumber);

        return NextResponse.json({ ok: true, accountNumber: currentAccountNumber });
      }

      if (
        error.message.includes("duplicate key value violates unique constraint") &&
        error.message.includes("account_number")
      ) {
        attempts++;
        continue;
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to generate unique account number after multiple attempts" },
      { status: 500 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    console.error("API Error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
