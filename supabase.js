 // ============================================================
// SECORA — SUPABASE CLIENT
// ============================================================

const SUPABASE_URL =
  "https://iadfckatnldoruoksvtx.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_1neR34ctfRRQut-D03QZqA_ci07ddhF";


/*
 * Create the Supabase client.
 */
const secoraSupabase =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


/*
 * Expose the client globally.
 *
 * dashboard.js
 * course.js
 * lesson.js
 * and other SECORA frontend files
 * can use:
 *
 * window.secoraSupabase
 */
window.secoraSupabase =
  secoraSupabase;
