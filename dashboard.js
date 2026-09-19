 /* ============================================================
   SECORA DASHBOARD
   dashboard.js
   Fixed / Hardened Version

   Compatible with:
   - home.html
   - dashboard.css
   - supabase.js
   - Supabase Auth
   - SECORA ORIGIN / CORE / BLACKLINE
   - Redeem Code System
   - User Entitlements
   ============================================================ */

(() => {
  "use strict";


  /* ============================================================
     SUPABASE
  ============================================================ */

  const SUPABASE =
    window.secoraSupabase ||
    window.supabaseClient ||
    null;


  /* ============================================================
     TRACK CONFIGURATION
  ============================================================ */

  const TRACKS = {

    fundamentals: {
      key: "fundamentals",
      title: "SECORA ORIGIN",
      subtitle: "Cybersecurity Fundamentals",
      description:
        "Build the essential foundations required to understand modern cybersecurity.",
      access: "free"
    },

    intermediate: {
      key: "intermediate",
      title: "SECORA CORE",
      subtitle: "Professional Security",
      description:
        "Move beyond fundamentals into professional security concepts, operations and methodology.",
      access: "core"
    },

    advanced: {
      key: "advanced",
      title: "SECORA BLACKLINE",
      subtitle: "Advanced Security",
      description:
        "Advanced offensive, defensive, intelligence and security engineering knowledge.",
      access: "blackline"
    }

  };


  /* ============================================================
     APPLICATION STATE
  ============================================================ */

  const state = {

    user: null,

    courses: [],

    modules: [],

    lessons: [],

    progress: [],

    entitlements: [],

    products: [],

    accessByTrack: {

      fundamentals: true,

      intermediate: false,

      advanced: false

    },

    isOwner: false,

    initialized: false

  };


  /* ============================================================
     DOM HELPERS
  ============================================================ */

  const $ = (
    selector,
    parent = document
  ) => {

    return parent.querySelector(
      selector
    );

  };


  const $$ = (
    selector,
    parent = document
  ) => {

    return Array.from(
      parent.querySelectorAll(
        selector
      )
    );

  };


  function escapeHTML(value) {

    return String(
      value ?? ""
    )

      .replace(
        /&/g,
        "&amp;"
      )

      .replace(
        /</g,
        "&lt;"
      )

      .replace(
        />/g,
        "&gt;"
      )

      .replace(
        /"/g,
        "&quot;"
      )

      .replace(
        /'/g,
        "&#039;"
      );

  }


  /* ============================================================
     INITIALIZATION
  ============================================================ */

  document.addEventListener(
    "DOMContentLoaded",
    init
  );


  async function init() {

    try {

      /*
       * STEP 1
       * Verify Supabase client.
       */
      if (!SUPABASE) {

        console.error(
          "SECORA: Supabase client was not found.",
          {
            expected:
              "window.secoraSupabase"
          }
        );

        showDashboardError(
          "SECORA could not find the Supabase client. Check supabase.js."
        );

        return;
      }


      /*
       * STEP 2
       * Bind static UI events.
       */
      bindGlobalEvents();


      /*
       * STEP 3
       * Verify authentication.
       */
      const authenticated =
        await ensureAuthenticated();


      if (!authenticated) {
        return;
      }


      /*
       * STEP 4
       * Load database information.
       *
       * This function is now defensive.
       * One optional database failure will NOT destroy
       * the entire dashboard.
       */
      await loadPlatformData();


      /*
       * STEP 5
       * Render UI.
       */
      renderUser();

      renderDate();

      renderStats();

      renderCourses();

      renderAccessCenter();


      /*
       * STEP 6
       * Activate interactions.
       */
      setupSearch();

      setupRedeemButtons();

      setupPurchaseButtons();

      setupAccessTrackButtons();


      state.initialized = true;


      console.info(
        "SECORA dashboard initialized successfully."
      );


    } catch (error) {

      console.error(
        "SECORA dashboard initialization error:",
        error
      );


      showDashboardError(
        "SECORA encountered an unexpected dashboard error. Open the browser console for details."
      );

    }

  }


  /* ============================================================
     AUTHENTICATION
  ============================================================ */

  async function ensureAuthenticated() {

    try {

      const {
        data,
        error
      } =
        await SUPABASE.auth.getSession();


      if (error) {

        console.error(
          "SECORA authentication/session error:",
          error
        );

        showDashboardError(
          `Authentication error: ${error.message}`
        );

        return false;
      }


      if (
        !data ||
        !data.session ||
        !data.session.user
      ) {

        redirectToLogin();

        return false;
      }


      state.user =
        data.session.user;


      return true;

    } catch (error) {

      console.error(
        "SECORA session exception:",
        error
      );

      showDashboardError(
        "Unable to verify your SECORA session."
      );

      return false;

    }

  }


  function redirectToLogin() {

    window.location.href =
      "index.html";

  }


  /* ============================================================
     PLATFORM DATA
  ============================================================ */

  async function loadPlatformData() {

    const userId =
      state.user.id;


    /*
     * ----------------------------------------------------------
     * COURSES
     * ----------------------------------------------------------
     *
     * This is the most important query.
     */
    try {

      const {
        data,
        error
      } =
        await SUPABASE

          .from("courses")

          .select(`
            id,
            title,
            slug,
            description,
            level,
            thumbnail_url,
            published,
            track,
            created_at
          `)

          .eq(
            "published",
            true
          )

          .order(
            "track",
            {
              ascending: true
            }
          )

          .order(
            "created_at",
            {
              ascending: true
            }
          );


      if (error) {

        console.error(
          "SECORA courses query failed:",
          error
        );

        throw error;
      }


      state.courses =
        (data || []).map(
          course => ({

            ...course,

            track:
              normalizeTrack(
                course.track
              )

          })
        );


      console.info(
        `SECORA: loaded ${state.courses.length} courses.`
      );


    } catch (error) {

      state.courses = [];


      console.error(
        "SECORA COURSES ERROR:",
        error
      );


      /*
       * Do not silently hide the actual database error.
       */
      state.databaseErrors =
        state.databaseErrors || [];


      state.databaseErrors.push({
        table: "courses",
        message:
          error?.message ||
          "Unknown courses query error"
      });

    }


    /*
     * ----------------------------------------------------------
     * MODULES
     * ----------------------------------------------------------
     */

    try {

      const {
        data,
        error
      } =
        await SUPABASE
