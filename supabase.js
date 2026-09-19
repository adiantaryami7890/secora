 // ============================================================
// SECORA — SUPABASE CLIENT
// ============================================================
// IMPORTANT:
// Keep the Supabase publishable key ONLY in this file.
// dashboard.js, auth.js and login.js use the client created here.
// ============================================================

"use strict";

const SUPABASE_URL =
  "https://iadfckatnldoruoksvtx.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_1neR34ctfRRQut-DO3QZqA_ci07ddhF";


// ============================================================
// VERIFY SUPABASE LIBRARY
// ============================================================

if (!window.supabase) {

  console.error(
    "SECORA ERROR: Supabase JavaScript library was not loaded."
  );

  window.secoraSupabase = null;
  window.supabaseClient = null;

} else {

  try {

    // ==========================================================
    // CREATE SINGLE SECORA SUPABASE CLIENT
    // ==========================================================

    const secoraSupabase =
      window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
      );


    // ==========================================================
    // GLOBAL CLIENT
    // ==========================================================

    window.secoraSupabase =
      secoraSupabase;


    // Compatibility alias
    window.supabaseClient =
      secoraSupabase;


    // ==========================================================
    // DEBUG INFORMATION
    // ==========================================================

    console.log(
      "SECORA: Supabase client initialized successfully."
    );

    console.log(
      "SECORA: Supabase project:",
      SUPABASE_URL
    );


  } catch (error) {

    console.error(
      "SECORA ERROR: Supabase client initialization failed.",
      error
    );

    window.secoraSupabase = null;
    window.supabaseClient = null;
  }
}
