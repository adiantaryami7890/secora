 // =========================================================
// SECORA — SUPABASE CLIENT
// =========================================================

const SUPABASE_URL =
  "https://iadfckatnldoruoksvtx.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_1neR34ctfRRQut-DO3QZqA_ci07ddhF";

const secoraSupabase =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );
