  /* ============================================================
   SECORA — DASHBOARD
   Complete production-safe dashboard controller
   ============================================================

   IMPORTANT ARCHITECTURE

   supabase.js
        ↓
   window.secoraSupabase
        ↓
   dashboard.js
        ↓
   Auth / Courses / Modules / Lessons / Progress
        ↓
   ORIGIN / CORE / BLACKLINE

   SECURITY RULE:
   The Supabase API key belongs ONLY in supabase.js.
   This file intentionally contains NO API key.

   ============================================================ */

(() => {
  "use strict";

  /* ============================================================
     GLOBAL CONFIGURATION
     ============================================================ */

  const TRACKS = {
    fundamentals: {
      key: "fundamentals",
      title: "SECORA ORIGIN",
      kicker: "FOUNDATION",
      description:
        "Build the essential cybersecurity foundations required to understand the digital battlefield.",
      product: null
    },

    intermediate: {
      key: "intermediate",
      title: "SECORA CORE",
      kicker: "PROFESSIONAL",
      description:
        "Move beyond fundamentals into professional security concepts, operations and methodology.",
      product: "core"
    },

    advanced: {
      key: "advanced",
      title: "SECORA BLACKLINE",
      kicker: "ADVANCED",
      description:
        "Advanced offensive, defensive, intelligence and security engineering knowledge.",
      product: "blackline"
    }
  };


  /* ============================================================
     SUPABASE CLIENT
     ============================================================ */

  let SUPABASE = null;


  function getSupabaseClient() {
    if (
      window.secoraSupabase &&
      typeof window.secoraSupabase.auth === "object"
    ) {
      return window.secoraSupabase;
    }

    if (
      window.supabaseClient &&
      typeof window.supabaseClient.auth === "object"
    ) {
      return window.supabaseClient;
    }

    return null;
  }


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
    return parent.querySelector(selector);
  };


  const $$ = (
    selector,
    parent = document
  ) => {
    return Array.from(
      parent.querySelectorAll(selector)
    );
  };


  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function setText(
    id,
    value
  ) {
    const element =
      document.getElementById(id);

    if (element) {
      element.textContent =
        value;
    }
  }


  /* ============================================================
     INITIALIZATION
     ============================================================ */

  document.addEventListener(
    "DOMContentLoaded",
    init,
    { once: true }
  );


  async function init() {

    try {

      /* --------------------------------------------------------
         SUPABASE
         -------------------------------------------------------- */

      SUPABASE =
        getSupabaseClient();


      if (!SUPABASE) {

        console.error(
          "SECORA: Supabase client was not found."
        );

        showDashboardError(
          "SECORA database client is unavailable. Check that supabase.js loads before dashboard.js."
        );

        return;
      }


      /* --------------------------------------------------------
         AUTHENTICATION
         -------------------------------------------------------- */

      const authenticated =
        await ensureAuthenticated();


      if (!authenticated) {
        return;
      }


      /* --------------------------------------------------------
         GLOBAL UI
         -------------------------------------------------------- */

      bindGlobalEvents();

      renderUser();

      renderDate();


      /* --------------------------------------------------------
         LOAD DATA
         -------------------------------------------------------- */

      await loadPlatformData();


      /* --------------------------------------------------------
         RENDER
         -------------------------------------------------------- */

      renderStats();

      renderCourses();

      renderAccessCenter();

      setupSearch();

      setupRedeemButtons();

      setupPurchaseButtons();

      setupAccessTrackButtons();


      /* --------------------------------------------------------
         FINAL STATE
         -------------------------------------------------------- */

      state.initialized =
        true;


      console.log(
        "SECORA: Dashboard initialized successfully."
      );

    } catch (error) {

      console.error(
        "SECORA dashboard initialization error:",
        error
      );

      showDashboardError(
        "Something went wrong while loading your SECORA dashboard."
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
          "SECORA session error:",
          error
        );

        redirectToLogin();

        return false;
      }


      const session =
        data?.session;


      if (!session?.user) {

        redirectToLogin();

        return false;
      }


      state.user =
        session.user;


      return true;

    } catch (error) {

      console.error(
        "SECORA authentication error:",
        error
      );

      redirectToLogin();

      return false;
    }
  }


  function redirectToLogin() {

    window.location.replace(
      "index.html"
    );
  }


  /* ============================================================
     GLOBAL EVENTS
     ============================================================ */

  function bindGlobalEvents() {

    const logoutButton =
      document.getElementById(
        "logoutBtn"
      );


    if (logoutButton) {

      logoutButton.addEventListener(
        "click",
        handleLogout
      );
    }


    /*
     * Sidebar course navigation
     */

    $$(
      'a[href="#courses"]'
    ).forEach(
      link => {

        link.addEventListener(
          "click",
          () => {

            const target =
              document.getElementById(
                "courses"
              );

            if (target) {

              window.setTimeout(
                () => {

                  target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                  });

                },
                0
              );
            }

          }
        );

      }
    );
  }


  /* ============================================================
     LOGOUT
     ============================================================ */

  async function handleLogout(event) {

    if (event) {
      event.preventDefault();
    }


    const button =
      document.getElementById(
        "logoutBtn"
      );


    if (button) {

      button.disabled =
        true;

      button.textContent =
        "Logging out...";
    }


    try {

      const {
        error
      } =
        await SUPABASE.auth.signOut();


      if (error) {

        throw error;
      }


      window.location.replace(
        "index.html"
      );

    } catch (error) {

      console.error(
        "SECORA logout error:",
        error
      );


      if (button) {

        button.disabled =
          false;

        button.textContent =
          "Logout";
      }

      alert(
        "Unable to log out right now. Please try again."
      );
    }
  }


  /* ============================================================
     USER INTERFACE
     ============================================================ */

  function renderUser() {

    const user =
      state.user;


    if (!user) {
      return;
    }


    const metadata =
      user.user_metadata ||
      {};


    const displayName =
      metadata.full_name ||
      metadata.name ||
      metadata.user_name ||
      user.email?.split("@")[0] ||
      "Learner";


    const email =
      user.email ||
      "";


    /* ----------------------------------------------------------
       MAIN GREETING
       ---------------------------------------------------------- */

    setText(
      "userGreeting",
      `Welcome back, ${displayName}.`
    );


    /* ----------------------------------------------------------
       SIDEBAR NAME
       ---------------------------------------------------------- */

    setText(
      "userName",
      displayName
    );


    /* ----------------------------------------------------------
       TOPBAR NAME
       ---------------------------------------------------------- */

    setText(
      "topUserName",
      displayName
    );


    /* ----------------------------------------------------------
       EMAIL
       ---------------------------------------------------------- */

    setText(
      "userEmail",
      email
    );


    /* ----------------------------------------------------------
       AVATAR
       ---------------------------------------------------------- */

    const avatarUrl =
      metadata.avatar_url ||
      metadata.picture ||
      "";


    const avatarElements =
      $$(
        "#userAvatar, #topUserAvatar"
      );


    avatarElements.forEach(
      avatar => {

        if (
          avatar.tagName ===
          "IMG"
        ) {

          if (avatarUrl) {

            avatar.src =
              avatarUrl;

            avatar.alt =
              displayName;

            avatar.style.display =
              "";

          } else {

            avatar.removeAttribute(
              "src"
            );

            avatar.alt =
              "";

          }

        }

      }
    );
  }


  /* ============================================================
     DATE
     ============================================================ */

  function renderDate() {

    setText(
      "currentDate",
      new Date().toLocaleDateString(
        "en-IN",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        }
      )
    );
  }


  /* ============================================================
     LOAD PLATFORM DATA
     ============================================================ */

  async function loadPlatformData() {

    /*
     * We intentionally do NOT let optional queries destroy
     * the entire dashboard.
     *
     * Courses are the primary requirement.
     * Modules, lessons and progress are loaded afterwards.
     */


    /* ----------------------------------------------------------
       COURSES
       ---------------------------------------------------------- */

    let coursesResult =
      await SUPABASE
        .from("courses")
        .select(`
          id,
          title,
          slug,
          description,
          level,
          track,
          published,
          created_at
        `)
        .eq(
          "published",
          true
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        );


    /*
     * Compatibility fallback:
     *
     * If the current database does not expose track,
     * load the original course fields and infer the track
     * from the course slug.
     */

    if (
      coursesResult.error
    ) {

      console.warn(
        "SECORA: Course query with track failed. Retrying without track.",
        coursesResult.error
      );


      coursesResult =
        await SUPABASE
          .from("courses")
          .select(`
            id,
            title,
            slug,
            description,
            level,
            published,
            created_at
          `)
          .eq(
            "published",
            true
          )
          .order(
            "created_at",
            {
              ascending: true
            }
          );


      if (
        coursesResult.error
      ) {

        throw coursesResult.error;
      }
    }


    state.courses =
      (coursesResult.data || [])
        .map(
          course => ({
            ...course,

            track:
              normalizeTrack(
                course.track ||
                inferTrackFromSlug(
                  course.slug
                )
              )
          })
        );


    /*
     * Render course structure immediately.
     *
     * This prevents the old "Loading courses..."
     * dead state when an optional query fails.
     */

    renderCourses();


    /* ----------------------------------------------------------
       COURSE IDS
       ---------------------------------------------------------- */

    const courseIds =
      state.courses.map(
        course =>
          course.id
      );


    /* ----------------------------------------------------------
       MODULES
       ---------------------------------------------------------- */

    if (courseIds.length) {

      const {
        data,
        error
      } =
        await SUPABASE
          .from("modules")
          .select(`
            id,
            course_id,
            title,
            description,
            position,
            created_at
          `)
          .in(
            "course_id",
            courseIds
          )
          .order(
            "position",
            {
              ascending: true
            }
          );


      if (error) {

        console.warn(
          "SECORA: Modules could not be loaded.",
          error
        );

        state.modules =
          [];

      } else {

        state.modules =
          data || [];
      }

    } else {

      state.modules =
        [];
    }


    /* ----------------------------------------------------------
       LESSONS
       ---------------------------------------------------------- */

    const moduleIds =
      state.modules.map(
        module =>
          module.id
      );


    if (moduleIds.length) {

      const {
        data,
        error
      } =
        await SUPABASE
          .from("lessons")
          .select(`
            id,
            module_id,
            title,
            slug,
            position,
            duration_minutes,
            published,
            created_at
          `)
          .in(
            "module_id",
            moduleIds
          )
          .eq(
            "published",
            true
          )
          .order(
            "position",
            {
              ascending: true
            }
          );


      if (error) {

        console.warn(
          "SECORA: Lessons could not be loaded.",
          error
        );

        state.lessons =
          [];

      } else {

        state.lessons =
          data || [];
      }

    } else {

      state.lessons =
        [];
    }


    /* ----------------------------------------------------------
       USER PROGRESS
       ---------------------------------------------------------- */

    const lessonIds =
      state.lessons.map(
        lesson =>
          lesson.id
      );


    if (
      lessonIds.length &&
      state.user?.id
    ) {

      const {
        data,
        error
      } =
        await SUPABASE
          .from("lesson_progress")
          .select(`
            lesson_id,
            completed,
            completed_at,
            last_opened_at
          `)
          .eq(
            "user_id",
            state.user.id
          )
          .in(
            "lesson_id",
            lessonIds
          );


      if (error) {

        console.warn(
          "SECORA: Progress could not be loaded.",
          error
        );

        state.progress =
          [];

      } else {

        state.progress =
          data || [];
      }

    } else {

      state.progress =
        [];
    }


    /* ----------------------------------------------------------
       ACCESS / ENTITLEMENTS
       ---------------------------------------------------------- */

    await loadAccessState();


    /* ----------------------------------------------------------
       FINAL RENDER
       ---------------------------------------------------------- */

    renderStats();

    renderCourses();

    renderAccessCenter();
  }


  /* ============================================================
     ACCESS STATE
     ============================================================ */

  async function loadAccessState() {

    /*
     * ORIGIN is always free.
     */

    state.accessByTrack.fundamentals =
      true;


    /*
     * Load the user's entitlements.
     *
     * Failure here must NOT break the dashboard.
     */

    if (!state.user?.id) {
      return;
    }


    const {
      data,
      error
    } =
      await SUPABASE
        .from("user_entitlements")
        .select(`
          id,
          product_id,
          status,
          granted_at,
          expires_at,
          source
        `)
        .eq(
          "user_id",
          state.user.id
        );


    if (error) {

      console.warn(
        "SECORA: Entitlements could not be loaded.",
        error
      );

      return;
    }


    state.entitlements =
      data || [];


    if (!state.entitlements.length) {
      return;
    }


    /*
     * Load products separately.
     */

    const productIds =
      state.entitlements
        .map(
          entitlement =>
            entitlement.product_id
        )
        .filter(Boolean);


    if (!productIds.length) {
      return;
    }


    const {
      data: products,
      error: productsError
    } =
      await SUPABASE
        .from("products")
        .select(`
          id,
          code,
          name,
           access_mode
        `)
        .in(
          "id",
          productIds
        );


    if (productsError) {

      console.warn(
        "SECORA: Products could not be loaded.",
        productsError
      );

      return;
    }


    state.products =
      products || [];


    /*
     * Map active entitlements to tracks.
     */

    state.entitlements.forEach(
      entitlement => {

        if (
          String(
            entitlement.status ||
            ""
          ).toLowerCase() !==
          "active"
        ) {

          return;
        }


        /*
         * Lifetime entitlement:
         * expires_at = NULL
         */

        if (
          entitlement.expires_at &&
          new Date(
            entitlement.expires_at
          ) < new Date()
        ) {

          return;
        }


        const product =
          state.products.find(
            item =>
              item.id ===
              entitlement.product_id
          );


        if (!product) {
          return;
        }


        const code =
          String(
            product.code ||
            ""
          ).toLowerCase();


        if (code === "core") {

          state.accessByTrack.intermediate =
            true;
        }


        if (code === "blackline") {

          state.accessByTrack.advanced =
            true;
        }

      }
    );


    /*
     * Owner detection.
     *
     * We use the existing server-side owner function
     * instead of assuming a profiles.role column exists.
     *
     * Failure simply means normal user access.
     */

    try {

      const {
        data: ownerResult,
        error: ownerError
      } =
        await SUPABASE
          .rpc(
            "is_secora_owner"
          );


      if (!ownerError) {

        state.isOwner =
          ownerResult === true ||
          ownerResult === "true";

      }

    } catch (error) {

      console.warn(
        "SECORA: Owner check unavailable.",
        error
      );

    }


    /*
     * Owner receives administrative access to protected
     * learning tracks.
     */

    if (state.isOwner) {

      state.accessByTrack.intermediate =
        true;

      state.accessByTrack.advanced =
        true;
    }
  }


  /* ============================================================
     TRACK NORMALIZATION
     * ============================================================ */

  function normalizeTrack(track) {

    const value =
      String(
        track ||
        ""
      )
        .trim()
        .toLowerCase();


    if (
      value === "intermediate" ||
      value === "core"
    ) {

      return "intermediate";
    }


    if (
      value === "advanced" ||
      value === "blackline"
    ) {

      return "advanced";
    }


    return "fundamentals";
  }


  /* ============================================================
     TRACK FALLBACK
     ============================================================ */

  function inferTrackFromSlug(slug) {

    const value =
      String(
        slug ||
        ""
      )
        .trim()
        .toLowerCase();


    const coreCourses = [
      "cybersecurity-intermediate",
      "ethical-hacking-fundamentals",
      "web-application-security",
      "security-operations-soc",
      "vulnerability-assessment-management",
      "cryptography-secure-communication",
      "reconnaissance-information-gathering",
      "network-security",
      "identity-access-management",
      "application-api-security"
    ];


    const blacklineKeywords = [
      "adversary-tradecraft",
      "advanced-reconnaissance",
      "advanced-penetration",
      "active-directory",
      "identity-attack",
      "advanced-web",
      "vulnerability-research",
      "malware-analysis",
      "advanced-security-operations",
      "cloud-attack",
      "cyber-threat-intelligence",
      "detection-engineering",
      "digital-forensics",
      "incident-response",
      "network-detection",
      "purple-team",
      "security-architecture",
      "threat-hunting",
      "threat-intelligence",
      "threat-modeling"
    ];


    if (
      blacklineKeywords.some(
        keyword =>
          value.includes(keyword)
      )
    ) {

      return "advanced";
    }


    if (
      coreCourses.includes(
        value
      )
    ) {

      return "intermediate";
    }


    if (
      value.includes(
        "core"
      )
    ) {

      return "intermediate";
    }


    if (
      value.includes(
        "blackline"
      )
    ) {

      return "advanced";
    }


    return "fundamentals";
  }


  /* ============================================================
     BUILD COURSE DATA
     ============================================================ */

  function buildCourseData() {

    return state.courses.map(
      course => {

        const courseModules =
          state.modules.filter(
            module =>
              module.course_id ===
              course.id
          );


        const moduleIds =
          courseModules.map(
            module =>
              module.id
          );


        const courseLessons =
          state.lessons.filter(
            lesson =>
              moduleIds.includes(
                lesson.module_id
              )
          );


        const lessonIds =
          courseLessons.map(
            lesson =>
              lesson.id
          );


        const courseProgress =
          state.progress.filter(
            item =>
              lessonIds.includes(
                item.lesson_id
              )
          );


        const completed =
          courseProgress.filter(
            item =>
              item.completed === true
          ).length;


        const total =
          courseLessons.length;


        const percentage =
          total === 0
            ? 0
            : Math.round(
                (
                  completed /
                  total
                ) * 100
              );


        return {
          ...course,

          track:
            normalizeTrack(
              course.track ||
              inferTrackFromSlug(
                course.slug
              )
            ),

          modules:
            courseModules,

          lessons:
            courseLessons,

          completed,

          total,

          percentage
        };
      }
    );
  }


  /* ============================================================
     DASHBOARD STATISTICS
     ============================================================ */

  function renderStats() {

    const courseData =
      buildCourseData();


    const totalLessons =
      state.lessons.length;


    const completedLessons =
      state.progress.filter(
        item =>
          item.completed === true
      ).length;


    const startedCourses =
      courseData.filter(
        course =>
          course.lessons.some(
            lesson =>
              state.progress.some(
                progress =>
                  progress.lesson_id ===
                  lesson.id
              )
          )
      ).length;


    const overallProgress =
      totalLessons === 0
        ? 0
        : Math.round(
            (
              completedLessons /
              totalLessons
            ) * 100
          );


    setText(
      "coursesStarted",
      startedCourses
    );


    setText(
      "completedLessons",
      completedLessons
    );


    setText(
      "overallProgress",
      `${overallProgress}%`
    );


    /*
     * Compatibility with older stat markup.
     */

    const statValues =
      $$(".stat-card strong");


    if (statValues[0]) {
      statValues[0].textContent =
        startedCourses;
    }


    if (statValues[1]) {
      statValues[1].textContent =
        completedLessons;
    }


    if (statValues[2]) {
      statValues[2].textContent =
        `${overallProgress}%`;
    }
  }


  /* ============================================================
     RENDER COURSES
     ============================================================ */

  function renderCourses() {

    const container =
      $(".course-grid");


    if (!container) {
      return;
    }


    const courseData =
      buildCourseData();


    container.classList.add(
      "course-track-layout"
    );


    container.innerHTML =
      "";


    const trackOrder = [
      "fundamentals",
      "intermediate",
      "advanced"
    ];


    trackOrder.forEach(
      trackKey => {

        const courses =
          courseData.filter(
            course =>
              normalizeTrack(
                course.track
              ) ===
              trackKey
          );


        const section =
          createTrackSection(
            trackKey,
            courses
          );


        container.appendChild(
          section
        );
      }
    );


    if (!courseData.length) {

      const empty =
        document.createElement(
          "div"
        );


      empty.className =
        "course-empty";


      empty.innerHTML = `
        <strong>
          No published courses available.
        </strong>

        <span>
          SECORA curriculum will appear here once published.
        </span>
      `;


      container.appendChild(
        empty
      );
    }
  }


  /* ============================================================
     CREATE TRACK SECTION
     ============================================================ */

  function createTrackSection(
    trackKey,
    courses
  ) {

    const config =
      TRACKS[
        trackKey
      ];


    const accessible =
      Boolean(
        state.accessByTrack[
          trackKey
        ]
      );


    const section =
      document.createElement(
        "section"
      );


    section.className =
      `course-track course-track-${trackKey}`;


    section.dataset.track =
      trackKey;


    /* ----------------------------------------------------------
       TRACK HEADING
       ---------------------------------------------------------- */

    const heading =
      document.createElement(
        "div"
      );


    heading.className =
      "track-heading";


    heading.innerHTML = `
      <div class="track-heading-copy">

        <span class="track-kicker">
          ${escapeHTML(
            config.kicker
          )}
        </span>

        <h2>
          ${escapeHTML(
            config.title
          )}
        </h2>

        <p>
          ${escapeHTML(
            config.description
          )}
        </p>

      </div>

      <div class="track-heading-meta">

        <span class="track-course-count">
          ${courses.length}
          ${courses.length === 1
            ? "course"
            : "courses"}
        </span>

        ${
          accessible
            ? `
              <span class="track-access-badge unlocked">
                ACCESS GRANTED
              </span>
            `
            : `
              <button
                type="button"
                class="track-access-button"
                data-track-access="${escapeHTML(
                  trackKey
                )}"
              >
                Unlock
                <span>→</span>
              </button>
            `
        }

      </div>
    `;


    section.appendChild(
      heading
    );


    /* ----------------------------------------------------------
       COURSE GRID
       ---------------------------------------------------------- */

    const grid =
      document.createElement(
        "div"
      );


    grid.className =
      "track-course-grid";


    if (!courses.length) {

      grid.innerHTML = `
        <article class="empty-track-card">

          <span class="empty-track-label">
            COMING SOON
          </span>

          <strong>
            More ${escapeHTML(
              config.title
            )}
          </strong>

          <p>
            This learning track is being prepared for SECORA.
          </p>

        </article>
      `;

    } else {

      courses.forEach(
        course => {

          grid.appendChild(
            createCourseCard(
              course,
              accessible
            )
          );

        }
      );
    }


    section.appendChild(
      grid
    );


    return section;
  }


  /* ============================================================
     CREATE COURSE CARD
     ============================================================ */

  function createCourseCard(
    course,
    trackAccessible
  ) {

    const card =
      document.createElement(
        "article"
      );


    card.className =
      "course-card";


    card.dataset.course =
      course.slug || "";


    card.dataset.track =
      course.track || "fundamentals";


    const level =
      String(
        course.level ||
        "beginner"
      ).toUpperCase();


    const trackLabel =
      course.track ===
      "fundamentals"
        ? "ORIGIN"
        : course.track ===
          "intermediate"
          ? "CORE"
          : "BLACKLINE";


    const duration =
      getCourseDuration(
        course
      );


    card.innerHTML = `

      <div class="course-card-top">

        <span class="course-level">
          ${escapeHTML(
            level
          )}
        </span>

        <span class="course-percentage">
          ${course.percentage}%
        </span>

      </div>


      <span class="course-track-label">
        ${escapeHTML(
          trackLabel
        )}
      </span>


      <h3>
        ${escapeHTML(
          course.title
        )}
      </h3>


      <p>
        ${escapeHTML(
          course.description ||
          "Structured cybersecurity learning designed for progressive skill development."
        )}
      </p>


      <div class="course-card-meta">

        <span>
          ${course.total}
          ${course.total === 1
            ? "LESSON"
            : "LESSONS"}
        </span>

        <span>
          ${course.completed}
          COMPLETED
        </span>

      </div>


      <div class="course-progress">

        <div
          class="course-progress-bar"
          style="width:${course.percentage}%"
        ></div>

      </div>


      <div class="course-card-footer">

        <span class="course-card-time">
          ${escapeHTML(
            duration
          )}
        </span>

        ${
          trackAccessible
            ? `
              <a
                href="course.html?slug=${encodeURIComponent(
                  course.slug
                )}"
                class="course-explore"
              >
                Explore →
              </a>
            `
            : `
              <button
                type="button"
                class="course-explore course-locked"
                data-course-lock="${escapeHTML(
                  course.track
                )}"
              >
                Locked →
              </button>
            `
        }

      </div>

    `;


    return card;
  }


  /* ============================================================
     COURSE DURATION
     ============================================================ */

  function getCourseDuration(
    course
  ) {

    const totalMinutes =
      (course.lessons || [])
        .reduce(
          (
            total,
            lesson
          ) =>
            total +
            Number(
              lesson.duration_minutes ||
              0
            ),
          0
        );


    if (
      totalMinutes <= 0
    ) {

      return "~ self-paced";
    }


    if (
      totalMinutes < 60
    ) {

      return `~ ${Math.round(
        totalMinutes
      )} min`;
    }


    const hours =
      totalMinutes /
      60;


    if (
      Number.isInteger(
        hours
      )
    ) {

      return `~ ${hours} hours`;
    }


    return `~ ${hours.toFixed(
      1
    )} hours`;
  }


  /* ============================================================
     ACCESS CENTER
     ============================================================ */

  function renderAccessCenter() {

    updateAccessCard(
      "core",
      state.accessByTrack.intermediate
    );


    updateAccessCard(
      "blackline",
      state.accessByTrack.advanced
    );
  }


  function updateAccessCard(
    product,
    unlocked
  ) {

    const card =
      document.querySelector(
        `[data-access-product="${product}"]`
      );


    if (!card) {
      return;
    }


    if (unlocked) {

      card.classList.add(
        "is-unlocked"
      );


      const status =
        card.querySelector(
          ".secora-access-status"
        );


      if (status) {

        status.textContent =
          "ACCESS UNLOCKED";
      }


      /*
       * Disable redeem controls once access exists.
       */

      const input =
        card.querySelector(
          ".secora-redeem-input, .access-redeem-input"
        );


      if (input) {

        input.disabled =
          true;
      }


      const redeemButton =
        card.querySelector(
          `[data-redeem-product="${product}"]`
        );


      if (redeemButton) {

        redeemButton.disabled =
          true;

        redeemButton.textContent =
          "Unlocked";
      }


    } else {

      card.classList.remove(
        "is-unlocked"
      );


      const status =
        card.querySelector(
          ".secora-access-status"
        );


      if (status) {

        status.textContent =
          "LIFETIME ACCESS";
      }
    }
  }


  /* ============================================================
     REDEEM BUTTONS
     ============================================================ */

  function setupRedeemButtons() {

    const buttons =
      $$(
        "[data-redeem-product]"
      );


    buttons.forEach(
      button => {

        if (
          button.dataset.secoraBound ===
          "true"
        ) {
          return;
        }


        button.dataset.secoraBound =
          "true";


        button.addEventListener(
          "click",
          async () => {

            const product =
              button.dataset.redeemProduct;


            await handleRedeem(
              product,
              button
            );

          }
        );
      }
    );


    /*
     * ENTER key inside redeem fields.
     */

    const inputs =
      $$(
        ".secora-redeem-input, .access-redeem-input"
      );


    inputs.forEach(
      input => {

        if (
          input.dataset.secoraBound ===
          "true"
        ) {
          return;
        }


        input.dataset.secoraBound =
          "true";


        input.addEventListener(
          "input",
          () => {

            input.value =
              input.value
                .toUpperCase()
                .replace(
                  /\s+/g,
                  ""
                );

          }
        );


        input.addEventListener(
          "keydown",
          async event => {

            if (
              event.key !==
              "Enter"
            ) {
              return;
            }


            event.preventDefault();


            let product =
              null;


            if (
              input.id ===
              "coreRedeemCode"
            ) {

              product =
                "core";

            } else if (
              input.id ===
              "blacklineRedeemCode"
            ) {

              product =
                "blackline";
            }


            /*
             * Fallback:
             * Find product from parent access card.
             */

            if (!product) {

              const card =
                input.closest(
                  "[data-access-product]"
                );


              product =
                card?.dataset?.accessProduct ||
                null;
            }


            if (!product) {
              return;
            }


            const button =
              document.querySelector(
                `[data-redeem-product="${product}"]`
              );


            if (button) {

              await handleRedeem(
                product,
                button
              );
            }

          }
        );
      }
    );
  }


  /* ============================================================
     REDEEM
     ============================================================ */

  async function handleRedeem(
    product,
    button
  ) {

    if (!SUPABASE) {
      return;
    }


    if (!state.user) {

      showAccessFeedback(
        product,
        "Please sign in before redeeming an access code.",
        "error"
      );

      return;
    }


    const input =
      document.querySelector(
        `#${product === "core"
          ? "coreRedeemCode"
          : "blacklineRedeemCode"}`
      ) ||
      document.querySelector(
        `[data-access-product="${product}"] .secora-redeem-input`
      ) ||
      document.querySelector(
        `[data-access-product="${product}"] .access-redeem-input`
      );


    const code =
      input?.value?.trim() ||
      "";


    if (!code) {

      showAccessFeedback(
        product,
        "Enter your access code first.",
        "error"
      );

      input?.focus();

      return;
    }


    /*
     * UX validation only.
     *
     * Security is enforced by the database RPC.
     */

    const expectedPrefix =
      product === "core"
        ? "SECORA-CORE-"
        : "SECORA-BL-";


    if (
      !code
        .toUpperCase()
        .startsWith(
          expectedPrefix
        )
    ) {

      showAccessFeedback(
        product,
        `Enter a valid ${product === "core"
          ? "SECORA CORE"
          : "SECORA BLACKLINE"} access code.`,
        "error"
      );

      input?.focus();

      return;
    }


    setRedeemLoading(
      button,
      true
    );


    showAccessFeedback(
      product,
      "Verifying access code...",
      "info"
    );


    try {

      const {
        data,
        error
      } =
        await SUPABASE
          .rpc(
            "redeem_secora_code",
            {
              redeem_code_input:
                code
            }
          );


      if (error) {

        throw error;
      }


      /*
       * RPC returns JSONB.
       */

      const result =
        Array.isArray(data)
          ? data[0]
          : data;


      if (
        result &&
        result.success === false
      ) {

        throw new Error(
          result.message ||
          "Unable to redeem this access code."
        );
      }


      /*
       * Refresh session first.
       */

      await SUPABASE.auth.getSession();


      /*
       * Update local access state immediately.
       */

      if (
        product === "core"
      ) {

        state.accessByTrack.intermediate =
          true;

      } else if (
        product === "blackline"
      ) {

        state.accessByTrack.advanced =
          true;
      }


      showAccessFeedback(
        product,
        "Access unlocked successfully.",
        "success"
      );


      if (input) {
        input.value =
          "";
      }


      updateAccessCard(
        product,
        true
      );


      /*
       * Re-render the course sections so locked cards
       * become available immediately.
       */

      renderCourses();

      renderAccessCenter();


      /*
       * Re-bind access buttons because renderCourses()
       * replaces their DOM.
       */

      setupAccessTrackButtons();


    } catch (error) {

      console.error(
        "SECORA redeem error:",
        error
      );


      showAccessFeedback(
        product,
        translateRedeemError(
          error
        ),
        "error"
      );

    } finally {

      /*
       * Do not re-enable an already-unlocked product.
       */

      if (
        !state.accessByTrack[
          product === "core"
            ? "intermediate"
            : "advanced"
        ]
      ) {

        setRedeemLoading(
          button,
          false
        );

      }
    }
  }


  /* ============================================================
     REDEEM ERROR TRANSLATION
     ============================================================ */

  function translateRedeemError(
    error
  ) {

    const raw =
      String(
        error?.message ||
        error?.details ||
        error?.hint ||
        "Unable to redeem this access code."
      );


    const message =
      raw.toLowerCase();


    if (
      message.includes(
        "not authenticated"
      ) ||
      message.includes(
        "auth.uid"
      ) ||
      message.includes(
        "authentication"
      )
    ) {

      return "Please sign in before redeeming an access code.";
    }


    if (
      message.includes(
        "invalid access code"
      ) ||
      message.includes(
        "code not found"
      ) ||
      message.includes(
        "does not exist"
      )
    ) {

      return "This access code is invalid.";
    }


    if (
      message.includes(
        "inactive"
      ) ||
      message.includes(
        "not active"
      )
    ) {

      return "This access code is no longer active.";
    }


    if (
      message.includes(
        "expired"
      )
    ) {

      return "This access code has expired.";
    }


    if (
      message.includes(
        "redemption limit"
      ) ||
      message.includes(
        "maximum"
      ) ||
      message.includes(
        "fully redeemed"
      )
    ) {

      return "This access code has already been redeemed.";
    }


    if (
      message.includes(
        "already redeemed"
      )
    ) {

      return "You have already redeemed this access code.";
    }


    if (
      message.includes(
        "already have"
      ) ||
      message.includes(
        "entitlement"
      )
    ) {

      return "You already have access to this SECORA product.";
    }


    if (
      message.includes(
        "permission denied"
      ) ||
      message.includes(
        "row-level security"
      )
    ) {

      return "Access verification was blocked. Please sign in again and try once more.";
    }


    return raw;
  }


  /* ============================================================
     ACCESS FEEDBACK
     ============================================================ */

  function showAccessFeedback(
    product,
    message,
    type = "info"
  ) {

    const card =
      document.querySelector(
        `[data-access-product="${product}"]`
      );


    if (!card) {
      return;
    }


    const feedback =
      card.querySelector(
        ".secora-redeem-feedback"
      );


    if (!feedback) {
      return;
    }


    feedback.textContent =
      message;


    feedback.classList.remove(
      "success",
      "error",
      "info"
    );


    feedback.classList.add(
      type
    );
  }


  /* ============================================================
     REDEEM BUTTON LOADING
     ============================================================ */

  function setRedeemLoading(
    button,
    loading
  ) {

    if (!button) {
      return;
    }


    if (loading) {

      button.disabled =
        true;

      button.classList.add(
        "is-loading"
      );


      if (
        !button.dataset.originalText
      ) {

        button.dataset.originalText =
          button.textContent.trim();
      }


      button.textContent =
        "Checking...";


    } else {

      button.disabled =
        false;

      button.classList.remove(
        "is-loading"
      );


      if (
        button.dataset.originalText
      ) {

        button.textContent =
          button.dataset.originalText;


        delete button.dataset.originalText;
      }
    }
  }


  /* ============================================================
     PURCHASE BUTTONS
     ============================================================ */

  function setupPurchaseButtons() {

    const buttons =
      $$(
        "[data-purchase-product]"
      );


    buttons.forEach(
      button => {

        if (
          button.dataset.secoraBound ===
          "true"
        ) {
          return;
        }


        button.dataset.secoraBound =
          "true";


        button.addEventListener(
          "click",
          () => {

            const product =
              button.dataset.purchaseProduct;


            showPurchaseComingSoon(
              product
            );

          }
        );
      }
    );
  }


  function showPurchaseComingSoon(
    product
  ) {

    const productName =
      product === "core"
        ? "SECORA CORE"
        : "SECORA BLACKLINE";


    showAccessFeedback(
      product,
      `${productName} checkout is being prepared. Use an access code if you already have one.`,
      "info"
    );
  }


  /* ============================================================
     ACCESS TRACK BUTTONS
     ============================================================ */

  function setupAccessTrackButtons() {

    $$(
      "[data-track-access]"
    ).forEach(
      button => {

        if (
          button.dataset.secoraBound ===
          "true"
        ) {
          return;
        }


        button.dataset.secoraBound =
          "true";


        button.addEventListener(
          "click",
          () => {

            focusAccessProduct(
              button.dataset.trackAccess
            );

          }
        );
      }
    );


    $$(
      "[data-course-lock]"
    ).forEach(
      button => {

        if (
          button.dataset.secoraBound ===
          "true"
        ) {
          return;
        }


        button.dataset.secoraBound =
          "true";


        button.addEventListener(
          "click",
          () => {

            focusAccessProduct(
              button.dataset.courseLock
            );

          }
        );
      }
    );
  }


  /* ============================================================
     FOCUS ACCESS PRODUCT
     ============================================================ */

  function focusAccessProduct(
    track
  ) {

    const product =
      track === "intermediate"
        ? "core"
        : track === "advanced"
          ? "blackline"
          : null;


    if (!product) {
      return;
    }


    const card =
      document.querySelector(
        `[data-access-product="${product}"]`
      );


    if (!card) {
      return;
    }


    card.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });


    window.setTimeout(
      () => {

        const input =
          card.querySelector(
            ".secora-redeem-input, .access-redeem-input"
          );


        if (
          input &&
          !input.disabled
        ) {

          input.focus();
        }

      },
      450
    );
  }


  /* ============================================================
     SEARCH
     ============================================================ */

  function setupSearch() {

    const input =
      $("#searchInput");


    if (!input) {
      return;
    }


    if (
      input.dataset.secoraBound ===
      "true"
    ) {
      return;
    }


    input.dataset.secoraBound =
      "true";


    input.addEventListener(
      "input",
      () => {

        filterCourses(
          input.value
            .trim()
            .toLowerCase()
        );

      }
    );


    /*
     * Ctrl + K / Cmd + K
     */

    document.addEventListener(
      "keydown",
      event => {

        const modifier =
          event.ctrlKey ||
          event.metaKey;


        if (
          modifier &&
          event.key.toLowerCase() ===
          "k"
        ) {

          event.preventDefault();

          input.focus();

          input.select();
        }

      }
    );
  }


  /* ============================================================
     FILTER COURSES
     ============================================================ */

  function filterCourses(
    query
  ) {

    const cards =
      $$(".course-card");


    cards.forEach(
      card => {

        if (!query) {

          card.style.display =
            "";

          return;
        }


        const text =
          card.textContent
            .toLowerCase();


        card.style.display =
          text.includes(query)
            ? ""
            : "none";

      }
    );


    /*
     * Hide a track when all of its actual course cards
     * are filtered out.
     */

    $$(".course-track")
      .forEach(
        section => {

          const actualCards =
            $$(".course-card", section);


          if (!actualCards.length) {

            section.style.display =
              "";

            return;
          }


          const visibleCards =
            actualCards.filter(
              card =>
                card.style.display !==
                "none"
            );


          section.style.display =
            visibleCards.length
              ? ""
              : "none";
        }
      );
  }


  /* ============================================================
     DASHBOARD ERROR
     ============================================================ */

  function showDashboardError(
    message
  ) {

    const grid =
      $(".course-grid");


    if (!grid) {
      return;
    }


    grid.innerHTML = `

      <div class="course-empty">

        <h3>
          Unable to load your dashboard
        </h3>

        <p>
          ${escapeHTML(
            message ||
            "Please refresh the page and try again."
          )}
        </p>

        <button
          type="button"
          class="course-explore"
          onclick="window.location.reload()"
        >
          Refresh Dashboard →
        </button>

      </div>

    `;
  }


  /* ============================================================
     SUPABASE AUTH STATE LISTENER
     ============================================================ */

  function setupAuthStateListener() {

    if (!SUPABASE) {
      return;
    }


    SUPABASE.auth.onAuthStateChange(
      (
        event,
        session
      ) => {

        if (
          event ===
          "SIGNED_OUT"
        ) {

          window.location.replace(
            "index.html"
          );

          return;
        }


        if (
          event ===
          "SIGNED_IN" &&
          session?.user
        ) {

          state.user =
            session.user;

          renderUser();
        }

      }
    );
  }


  /*
   * Start auth listener after the client is ready.
   */

  const originalInit =
    init;


  /*
   * The listener is intentionally registered only once
   * after DOM initialization.
   */

  window.setTimeout(
    () => {

      try {

        const client =
          getSupabaseClient();


        if (client) {

          SUPABASE =
            client;


          setupAuthStateListener();
        }

      } catch (error) {

        console.warn(
          "SECORA auth listener setup:",
          error
        );

      }

    },
    0
  );
/* ============================================================
   SECORA — OWNER ACCESS OVERRIDE
   ------------------------------------------------------------
   Owner:
   securehubtech@gmail.com

   This patch does NOT replace the existing access system.
   It simply guarantees that the SECORA owner account receives
   CORE + BLACKLINE access even when the owner has no entitlement
   or redeem-code record.
   ============================================================ */

const secoraOriginalLoadAccessState =
  loadAccessState;

loadAccessState = async function () {

  /* ----------------------------------------------------------
     Run the existing access / entitlement system first.
     ---------------------------------------------------------- */

  await secoraOriginalLoadAccessState();


  /* ----------------------------------------------------------
     Detect the SECORA owner.
     ---------------------------------------------------------- */

  const ownerEmail =
    "securehubtech@gmail.com";

  const currentEmail =
    String(
      state.user?.email || ""
    )
      .trim()
      .toLowerCase();


  const isOwnerAccount =
    currentEmail ===
    ownerEmail;


  /* ----------------------------------------------------------
     Owner override.
     ---------------------------------------------------------- */

  if (isOwnerAccount) {

    state.isOwner =
      true;

    state.accessByTrack.fundamentals =
      true;

    state.accessByTrack.intermediate =
      true;

    state.accessByTrack.advanced =
      true;


    console.log(
      "SECORA: OWNER ACCOUNT DETECTED"
    );

    console.log(
      "SECORA: ORIGIN = UNLOCKED"
    );

    console.log(
      "SECORA: CORE = UNLOCKED"
    );

    console.log(
      "SECORA: BLACKLINE = UNLOCKED"
    );
  }
};
})();
/* ============================================================
   SECORA — SIDEBAR ACTIVE NAVIGATION
   Moves the Aurora active state when a sidebar item is clicked
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const sidebarNavItems = document.querySelectorAll(
    ".navigation .nav-item"
  );

  sidebarNavItems.forEach((item) => {
    item.addEventListener("click", () => {

      /* Remove active state from every sidebar navigation item */
      sidebarNavItems.forEach((navItem) => {
        navItem.classList.remove("active");
      });

      /* Add active state to the clicked item */
      item.classList.add("active");
    });
  });
});
/* ============================================================
   SECORA — ACCESS STATE HOTFIX
   ============================================================

   PURPOSE:
   Fix CORE / BLACKLINE becoming locked again after refresh.

   ROOT CAUSE:
   The existing dashboard access loader requests:

       products → id, code, name, title

   But the real SECORA products table contains:

       id, code, name, access_mode, description, ...

   There is NO "title" column.

   This override independently reloads the authenticated user's
   entitlements using the real schema and repairs the rendered
   course cards.

   IMPORTANT:
   - Does NOT modify Supabase data.
   - Does NOT bypass RLS.
   - Does NOT grant access.
   - Only reflects an entitlement that already exists.
   - ORIGIN remains free.
   - CORE requires an active CORE entitlement.
   - BLACKLINE requires an active BLACKLINE entitlement.

   ============================================================ */

(() => {

  "use strict";


  /* ==========================================================
     WAIT UNTIL THE EXISTING DASHBOARD HAS FINISHED RENDERING
     ========================================================== */

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      /*
       * Give the existing SECORA dashboard controller time
       * to authenticate, load courses and render cards.
       */
      window.setTimeout(
        () => {

          secoraRefreshAccessState();

        },
        700
      );

    },
    {
      once: true
    }
  );


  /* ==========================================================
     MAIN ACCESS REFRESH
     ========================================================== */

  async function secoraRefreshAccessState() {

    try {

      /*
       * Find the existing SECORA Supabase client.
       */

      const supabase =
        window.secoraSupabase ||
        window.supabaseClient;


      if (
        !supabase ||
        !supabase.auth
      ) {

        console.warn(
          "SECORA ACCESS HOTFIX: Supabase client unavailable."
        );

        return;

      }


      /* ======================================================
         GET CURRENT AUTHENTICATED SESSION
         ====================================================== */

      const {
        data: sessionData,
        error: sessionError
      } =
        await supabase.auth.getSession();


      if (
        sessionError ||
        !sessionData?.session?.user
      ) {

        console.warn(
          "SECORA ACCESS HOTFIX: No authenticated session."
        );

        return;

      }


      const user =
        sessionData.session.user;


      /* ======================================================
         LOAD USER ENTITLEMENTS
         ====================================================== */

      const {
        data: entitlements,
        error: entitlementError
      } =
        await supabase
          .from("user_entitlements")
          .select(`
            id,
            product_id,
            status,
            granted_at,
            expires_at,
            source
          `)
          .eq(
            "user_id",
            user.id
          );


      if (entitlementError) {

        console.error(
          "SECORA ACCESS HOTFIX: Could not load entitlements.",
          entitlementError
        );

        return;

      }


      const activeEntitlements =
        (entitlements || [])
          .filter(
            entitlement => {

              /*
               * Only ACTIVE entitlements count.
               */

              if (
                String(
                  entitlement.status ||
                  ""
                ).toLowerCase() !==
                "active"
              ) {

                return false;

              }


              /*
               * Lifetime entitlement:
               *
               * expires_at = NULL
               */

              if (
                !entitlement.expires_at
              ) {

                return true;

              }


              /*
               * Time-limited entitlement.
               */

              return (
                new Date(
                  entitlement.expires_at
                ).getTime() >
                Date.now()
              );

            }
          );


      /* ======================================================
         NO ENTITLEMENTS
         ====================================================== */

      if (
        !activeEntitlements.length
      ) {

        console.info(
          "SECORA ACCESS HOTFIX: No active paid entitlement."
        );

        /*
         * ORIGIN remains free.
         *
         * CORE / BLACKLINE stay locked.
         */

        return;

      }


      /* ======================================================
         COLLECT PRODUCT IDS
         ====================================================== */

      const productIds =
        activeEntitlements
          .map(
            entitlement =>
              entitlement.product_id
          )
          .filter(Boolean);


      if (
        !productIds.length
      ) {

        return;

      }


      /* ======================================================
         LOAD PRODUCTS
         ======================================================

         IMPORTANT:

         We intentionally request ONLY columns that actually
         exist in SECORA's products table.

         NO "title".
         */

      const {
        data: products,
        error: productsError
      } =
        await supabase
          .from("products")
          .select(`
            id,
            code,
            name,
            access_mode
          `)
          .in(
            "id",
            productIds
          );


      if (productsError) {

        console.error(
          "SECORA ACCESS HOTFIX: Could not load products.",
          productsError
        );

        return;

      }


      /* ======================================================
         RESOLVE ACCESS
         ====================================================== */

      let hasCore =
        false;

      let hasBlackline =
        false;


      activeEntitlements.forEach(
        entitlement => {

          const product =
            (products || [])
              .find(
                item =>
                  item.id ===
                  entitlement.product_id
              );


          if (!product) {

            return;

          }


          const code =
            String(
              product.code ||
              ""
            )
              .trim()
              .toLowerCase();


          if (
            code ===
            "core"
          ) {

            hasCore =
              true;

          }


          if (
            code ===
            "blackline"
          ) {

            hasBlackline =
              true;

          }

        }
      );


      /* ======================================================
         REPAIR RENDERED COURSE CARDS
         ====================================================== */

      if (hasCore) {

        secoraUnlockRenderedTrack(
          "intermediate"
        );

      }


      if (hasBlackline) {

        secoraUnlockRenderedTrack(
          "advanced"
        );

      }


      /* ======================================================
         LOG FINAL STATE
         ====================================================== */

      console.info(
        "SECORA ACCESS HOTFIX:",
        {
          userId: user.id,
          core: hasCore,
          blackline: hasBlackline
        }
      );

    }
    catch (error) {

      console.error(
        "SECORA ACCESS HOTFIX ERROR:",
        error
      );

    }

  }


  /* ==========================================================
     UNLOCK RENDERED TRACK
     ========================================================== */

  function secoraUnlockRenderedTrack(
    track
  ) {

    const cards =
      document.querySelectorAll(
        `.course-card[data-track="${track}"]`
      );


    if (
      !cards.length
    ) {

      console.warn(
        `SECORA ACCESS HOTFIX: No ${track} course cards found.`
      );

      return;

    }


    cards.forEach(
      card => {

        /* ====================================================
           REMOVE LOCKED STATE
           ==================================================== */

        card.classList.remove(
          "course-card-locked"
        );

        card.classList.add(
          "course-card-unlocked"
        );


        card.dataset.access =
          "granted";


        /* ====================================================
           REMOVE LOCK VISUAL
           ==================================================== */

        const lockMark =
          card.querySelector(
            ".course-lock-mark"
          );


        if (
          lockMark
        ) {

          lockMark.remove();

        }


        const restrictedDot =
          card.querySelector(
            ".course-restricted-dot"
          );


        if (
          restrictedDot
        ) {

          restrictedDot.remove();

        }


        /* ====================================================
           RESTORE COURSE CONTENT AREA
           ==================================================== */

        const lockedSpace =
          card.querySelector(
            ".course-card-locked-space"
          );


        if (
          lockedSpace
        ) {

          lockedSpace.remove();

        }


        /* ====================================================
           RESTORE COURSE ACTION
           ==================================================== */

        const footer =
          card.querySelector(
            ".course-card-footer"
          );


        if (
          !footer
        ) {

          return;

        }


        const lockedCaption =
          footer.querySelector(
            ".course-locked-caption"
          );


        if (
          lockedCaption
        ) {

          /*
           * Replace the restricted caption with the real
           * course access action.
           */

          const slug =
            card.dataset.course;


          const accessLink =
            document.createElement(
              "a"
            );


          accessLink.href =
            `course.html?slug=${encodeURIComponent(
              slug || ""
            )}`;


          accessLink.className =
            "course-explore";


          accessLink.textContent =
            "ACCESS →";


          lockedCaption.replaceWith(
            accessLink
          );

        }


        /* ====================================================
           UPDATE ACCESS ATTRIBUTE
           ==================================================== */

        card.setAttribute(
          "data-access",
          "granted"
        );

      }
    );


    /*
     * Some existing click handlers ignore locked cards.
     * Since we removed course-card-locked above, normal
     * course-card navigation can work again.
     */

    console.info(
      `SECORA ACCESS HOTFIX: ${cards.length} ${track} course card(s) unlocked.`
    );

  }

})();
