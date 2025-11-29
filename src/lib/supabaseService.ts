import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const createSupabaseServiceRoleClient = () => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase URL or service role key is missing. Check your environment variables.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: {
      // Ensure server-side Supabase reads bypass any HTTP cache.
      fetch: (input, init) => fetch(input as RequestInfo, { ...(init as RequestInit), cache: "no-store" }),
    },
  });
};
