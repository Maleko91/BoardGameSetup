import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const supabaseReady = Boolean(supabaseUrl && supabaseAnonKey);

// Phase 2.8: Throw immediately in production if configuration is missing
if (!supabaseReady && import.meta.env.PROD) {
  throw new Error(
    "Missing required environment variables: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY. " +
    "The app cannot function without a Supabase connection."
  );
}

export const supabase: SupabaseClient | null = supabaseReady
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
