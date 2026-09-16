 // =========================================================
// SECORA — SUPABASE CONFIGURATION
// =========================================================

// Load Supabase from CDN dynamically
(function () {

  const SUPABASE_URL =
    "https://iadfckatnldoruoksvtx.supabase.co";

  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_1neR34ctfRRQut-DO3QZqA_ci07ddhF";


  // -------------------------------------------------------
  // Create Supabase client after library loads
  // -------------------------------------------------------

  function initializeSupabase() {

    if (typeof window.supabase === "undefined") {

      console.error(
        "Secora: Supabase library failed to load."
      );

      return;

    }


    window.secoraSupabase =
      window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
      );


    console.log(
      "Secora: Supabase initialized successfully."
    );

  }


  // -------------------------------------------------------
  // Load Supabase JS library
  // -------------------------------------------------------

  const script =
    document.createElement("script");


  script.src =
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";


  script.onload =
    initializeSupabase;


  script.onerror =
    function () {

      console.error(
        "Secora: Could not load Supabase CDN."
      );

    };


  document.head.appendChild(script);

})();
