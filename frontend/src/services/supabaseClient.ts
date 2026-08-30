import { createClient, type Session } from "@supabase/supabase-js";

const useMockApi =
  ((import.meta.env["VITE_USE_MOCK_API"] as string | undefined) ?? "true") !== "false";
const supabaseUrl = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ?? "";
const supabasePublishableKey =
  (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined) ?? "";

export const supabase =
  !useMockApi && supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export async function getSupabaseSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}
