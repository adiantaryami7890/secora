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
        "Build the essential cybersecurity foundations required to understand modern security.",
      product: null
    },

    intermediate: {
      key: "intermediate",
      title: "SECORA CORE",
      kicker: "DEEP DIVE",
      description:
        "Move beyond the fundamentals and develop practical cybersecurity knowledge.",
      product: "core"
    },

    advanced: {
      key: "advanced",
      title: "SECORA BLACKLINE",
      kicker: "ADVANCED",
      description:
        "Advanced cybersecurity concepts for deeper offensive and defensive understanding.",
      product: "blackline"
    }
  };

  const COURSE_TABLE = "courses";
  const MODULE_TABLE = "modules";
  const LESSON_TABLE = "lessons";
  const PROGRESS_TABLE = "lesson_progress";

  let SUPABASE = null;

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
     BASIC HELPERS
     ============================================================ */

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $$(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDuration(minutes) {
    const total = Number(minutes);

    if (!Number.isFinite(total) || total <= 0) {
      return "";
    }

    if (total < 60) {
      return `${Math.round(total)} min`;
    }

    const hours = Math.floor(total / 60);
    const mins = Math.round(total % 60);

    if (mins === 0) {
      return `${hours} hr`;
    }

    return `${hours} hr ${mins} min`;
  }

  function getTrackFromCourse(course) {
    const track =
      normalize(course?.track) ||
      normalize(course?.track_key) ||
      normalize(course?.category) ||
      normalize(course?.level);

    if (track === "fundamentals" || track === "origin") {
      return "fundamentals";
    }

    if (track === "intermediate" || track === "core") {
      return "intermediate";
    }

    if (track === "advanced" || track === "blackline") {
      return "advanced";
    }

    return "fundamentals";
  }

  function getTrackAccess(trackKey) {
    if (trackKey === "fundamentals") {
      return true;
    }

    if (state.isOwner) {
      return true;
    }

    return state.accessByTrack[trackKey] === true;
  }

  function getCourseId(course) {
    return course?.id ?? null;
  }

  function getCourseProgress(courseId) {
    if (!courseId) {
      return 0;
    }

    const courseLessons = state.lessons.filter(
      lesson => String(lesson.course_id) === String(courseId)
    );

    if (!courseLessons.length) {
      return 0;
    }

    const completed = courseLessons.filter(lesson => {
      const row = state.progress.find(
        item => String(item.lesson_id) === String(lesson.id)
      );

      return (
        row &&
        (
          row.completed === true ||
          row.is_completed === true ||
          normalize(row.status) === "completed"
        )
      );
    }).length;

    return Math.round((completed / courseLessons.length) * 100);
  }

  function getCourseDuration(course) {
    if (!course) {
      return "";
    }

    if (course.duration_minutes !== undefined && course.duration_minutes !== null) {
      return formatDuration(course.duration_minutes);
    }

    if (course.duration !== undefined && course.duration !== null) {
      const duration = Number(course.duration);

      if (Number.isFinite(duration)) {
        return formatDuration(duration);
      }

      return String(course.duration);
    }

    const courseLessons = state.lessons.filter(
      lesson => String(lesson.course_id) === String(course.id)
    );

    if (!courseLessons.length) {
      return "";
    }

    const totalMinutes = courseLessons.reduce((sum, lesson) => {
      const value =
        Number(lesson.duration_minutes) ||
        Number(lesson.duration) ||
        0;

      return sum + value;
    }, 0);

    return totalMinutes > 0 ? formatDuration(totalMinutes) : "";
  }

  /* ============================================================
     AUTH
     ============================================================ */

  async function loadUser() {
    if (!SUPABASE) {
      return null;
    }

    try {
      const {
        data,
        error
      } = await SUPABASE.auth.getUser();

      if (error) {
        console.warn("SECORA: Could not load authenticated user.", error);
        state.user = null;
        return null;
      }

      state.user = data?.user || null;

      return state.user;
    } catch (error) {
      console.warn("SECORA: Authentication lookup failed.", error);
      state.user = null;
      return null;
    }
  }

  function getUserDisplayName(user) {
    if (!user) {
      return "Learner";
    }

    const metadata = user.user_metadata || {};

    const candidates = [
      metadata.full_name,
      metadata.name,
      metadata.display_name,
      metadata.username,
      metadata.user_name,
      user.email ? user.email.split("@")[0] : ""
    ];

    const value = candidates.find(
      item => String(item || "").trim().length > 0
    );

    if (!value) {
      return "Learner";
    }

    return String(value)
      .trim()
      .replace(/\b\w/g, character => character.toUpperCase());
  }

  function renderUserIdentity() {
    const name = getUserDisplayName(state.user);

    const selectors = [
      "[data-user-name]",
      "#userName",
      "#profileName",
      ".user-name",
      ".profile-name"
    ];

    selectors.forEach(selector => {
      $$(selector).forEach(element => {
        element.textContent = name;
      });
    });

    const greetingElements = [
      "[data-user-greeting]",
      "#welcomeGreeting",
      ".welcome-greeting"
    ];

    greetingElements.forEach(selector => {
      $$(selector).forEach(element => {
        element.textContent = `Welcome back, ${name}`;
      });
    });
  }

  /* ============================================================
     ACCESS STATE
     ============================================================ */

  async function loadAccessState() {
    state.accessByTrack.fundamentals = true;
    state.accessByTrack.intermediate = false;
    state.accessByTrack.advanced = false;

    state.entitlements = [];
    state.products = [];
    state.isOwner = false;

    if (!state.user?.id) {
      return;
    }

    /*
      ------------------------------------------------------------
      OWNER CHECK
      ------------------------------------------------------------

      Preserve the existing owner-access architecture.

      The owner check is intentionally performed independently
      from entitlement loading so an owner is not accidentally
      treated as locked simply because they have no entitlement
      rows.
      ------------------------------------------------------------
    */

    try {
      const {
        data: ownerResult,
        error: ownerError
      } = await SUPABASE.rpc("is_secora_owner");

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

    if (state.isOwner) {
      state.accessByTrack.intermediate = true;
      state.accessByTrack.advanced = true;
    }

    /*
      ------------------------------------------------------------
      LOAD USER ENTITLEMENTS
      ------------------------------------------------------------
    */

    const {
      data,
      error
    } = await SUPABASE
      .from("user_entitlements")
      .select(`
        id,
        product_id,
        status,
        granted_at,
        expires_at,
        source
      `)
      .eq("user_id", state.user.id);

    if (error) {
      console.warn(
        "SECORA: Entitlements could not be loaded.",
        error
      );

      return;
    }

    state.entitlements = data || [];

    if (!state.entitlements.length) {
      return;
    }

    const productIds = state.entitlements
      .map(entitlement => entitlement.product_id)
      .filter(Boolean);

    if (!productIds.length) {
      return;
    }

    /*
      ------------------------------------------------------------
      IMPORTANT FIX

      Actual products schema:

        id
        code
        name
        access_mode
        description
        created_at

      There is NO "title" column.

      The previous query requested "title", causing Supabase
      to reject the products query. That meant CORE entitlement
      existed in the database but dashboard access was reset
      to locked after refresh.

      Keep the real schema here.
      ------------------------------------------------------------
    */

    const {
      data: products,
      error: productsError
    } = await SUPABASE
      .from("products")
      .select(`
        id,
        code,
        name,
        access_mode
      `)
      .in("id", productIds);

    if (productsError) {
      console.warn(
        "SECORA: Products could not be loaded.",
        productsError
      );

      return;
    }

    state.products = products || [];

    /*
      ------------------------------------------------------------
      MAP ACTIVE ENTITLEMENTS → TRACK ACCESS
      ------------------------------------------------------------
    */

    state.entitlements.forEach(entitlement => {
      if (
        normalize(entitlement.status) !== "active"
      ) {
        return;
      }

      if (
        entitlement.expires_at &&
        new Date(entitlement.expires_at) < new Date()
      ) {
        return;
      }

      const product = state.products.find(
        item =>
          String(item.id) === String(entitlement.product_id)
      );

      if (!product) {
        return;
      }

      const code = normalize(product.code);

      if (code === "core") {
        state.accessByTrack.intermediate = true;
      }

      if (code === "blackline") {
        state.accessByTrack.advanced = true;
      }
    });

    /*
      Owner access always remains active.
    */

    if (state.isOwner) {
      state.accessByTrack.intermediate = true;
      state.accessByTrack.advanced = true;
    }
  }

  /* ============================================================
     LOAD COURSES
     ============================================================ */

  async function loadCourses() {
    if (!SUPABASE) {
      return;
    }

    try {
      const {
        data,
        error
      } = await SUPABASE
        .from(COURSE_TABLE)
        .select("*")
        .order("position", {
          ascending: true
        });

      if (error) {
        console.warn(
          "SECORA: Courses could not be loaded.",
          error
        );

        state.courses = [];
        return;
      }

      state.courses = safeArray(data);
    } catch (error) {
      console.warn(
        "SECORA: Course loading failed.",
        error
      );

      state.courses = [];
    }
  }

  /* ============================================================
     LOAD MODULES
     ============================================================ */

  async function loadModules() {
    if (!SUPABASE) {
      return;
    }

    try {
      const {
        data,
        error
      } = await SUPABASE
        .from(MODULE_TABLE)
        .select("*")
        .order("position", {
          ascending: true
        });

      if (error) {
        console.warn(
          "SECORA: Modules could not be loaded.",
          error
        );

        state.modules = [];
        return;
      }

      state.modules = safeArray(data);
    } catch (error) {
      console.warn(
        "SECORA: Module loading failed.",
        error
      );

      state.modules = [];
    }
  }

  /* ============================================================
     LOAD LESSONS
     ============================================================ */

  async function loadLessons() {
    if (!SUPABASE) {
      return;
    }

    try {
      const {
        data,
        error
      } = await SUPABASE
        .from(LESSON_TABLE)
        .select("*")
        .order("position", {
          ascending: true
        });

      if (error) {
        console.warn(
          "SECORA: Lessons could not be loaded.",
          error
        );

        state.lessons = [];
        return;
      }

      state.lessons = safeArray(data);
    } catch (error) {
      console.warn(
        "SECORA: Lesson loading failed.",
        error
      );

      state.lessons = [];
    }
  }

  /* ============================================================
     LOAD PROGRESS
     ============================================================ */

  async function loadProgress() {
    if (!SUPABASE || !state.user?.id) {
      state.progress = [];
      return;
    }

    try {
      const {
        data,
        error
      } = await SUPABASE
        .from(PROGRESS_TABLE)
        .select("*")
        .eq("user_id", state.user.id);

      if (error) {
        console.warn(
          "SECORA: Progress could not be loaded.",
          error
        );

        state.progress = [];
        return;
      }

      state.progress = safeArray(data);
    } catch (error) {
      console.warn(
        "SECORA: Progress loading failed.",
        error
      );

      state.progress = [];
    }
  }

  /* ============================================================
     COURSE CARD ACCESS
     ============================================================ */

  function updateCourseCard(card, course) {
    if (!card || !course) {
      return;
    }

    const trackKey =
      card.dataset.track ||
      getTrackFromCourse(course);

    const unlocked = getTrackAccess(trackKey);

    card.dataset.access = unlocked
      ? "granted"
      : "locked";

    card.classList.toggle(
      "is-locked",
      !unlocked
    );

    card.classList.toggle(
      "is-unlocked",
      unlocked
    );

    /*
      ------------------------------------------------------------
      ACCESS BUTTON
      ------------------------------------------------------------
    */

    const exploreButton =
      $(".course-explore", card);

    const lockedCaption =
      $(".course-locked-caption", card);

    if (exploreButton) {
      exploreButton.textContent =
        unlocked
          ? "ACCESS →"
          : "UNLOCK →";

      exploreButton.setAttribute(
        "aria-disabled",
        unlocked ? "false" : "true"
      );
    }

    if (lockedCaption) {
      lockedCaption.textContent =
        unlocked
          ? ""
          : "UNLOCK →";
    }

    /*
      ------------------------------------------------------------
      DURATION
      ------------------------------------------------------------
    */

    const durationElement =
      $(".course-card-time", card);

    if (durationElement) {
      const duration =
        getCourseDuration(course);

      if (duration) {
        durationElement.textContent =
          duration;
      }
    }

    /*
      ------------------------------------------------------------
      PROGRESS
      ------------------------------------------------------------
    */

    const progress =
      getCourseProgress(course.id);

    card.dataset.progress =
      String(progress);

    const progressElements = [
      ".course-progress-value",
      "[data-course-progress]",
      ".course-card-progress"
    ];

    progressElements.forEach(selector => {
      $$(selector, card).forEach(element => {
        element.textContent =
          `${progress}%`;
      });
    });

    const progressBars = [
      ".course-progress-fill",
      "[data-progress-fill]"
    ];

    progressBars.forEach(selector => {
      $$(selector, card).forEach(element => {
        element.style.width =
          `${progress}%`;
      });
    });
  }

  /* ============================================================
     RENDER ACCESS STATE
     ============================================================ */

  function renderAccessState() {
    const cards = $$(".course-card");

    cards.forEach(card => {
      const courseId =
        card.dataset.courseId ||
        card.dataset.id;

      let course = null;

      if (courseId) {
        course = state.courses.find(
          item =>
            String(item.id) ===
            String(courseId)
        );
      }

      if (!course) {
        const titleElement =
          $(".course-card-title", card);

        const title =
          normalize(
            titleElement?.textContent
          );

        course = state.courses.find(
          item =>
            normalize(item.title) ===
              title ||
            normalize(item.name) ===
              title
        );
      }

      const trackKey =
        card.dataset.track ||
        (course
          ? getTrackFromCourse(course)
          : "fundamentals");

      const unlocked =
        getTrackAccess(trackKey);

      card.dataset.access =
        unlocked
          ? "granted"
          : "locked";

      card.classList.toggle(
        "is-locked",
        !unlocked
      );

      card.classList.toggle(
        "is-unlocked",
        unlocked
      );

      const action =
        $(".course-explore", card);

      if (action) {
        action.textContent =
          unlocked
            ? "ACCESS →"
            : "UNLOCK →";
      }

      const locked =
        $(".course-locked-caption", card);

      if (locked) {
        locked.textContent =
          unlocked
            ? ""
            : "UNLOCK →";
      }

      if (course) {
        updateCourseCard(
          card,
          course
        );
      }
    });
  }

  /* ============================================================
     COURSE TRACK RENDERING
     ============================================================ */

  function renderTrackVisibility() {
    $$(".course-track").forEach(trackElement => {
      const trackKey =
        trackElement.dataset.track;

      if (!trackKey) {
        return;
      }

      const accessible =
        getTrackAccess(trackKey);

      trackElement.dataset.access =
        accessible
          ? "granted"
          : "locked";

      trackElement.classList.toggle(
        "is-locked",
        !accessible
      );
    });
  }

  /* ============================================================
     CONTINUE LEARNING
     ============================================================ */

  function getLastIncompleteLesson() {
    if (!state.lessons.length) {
      return null;
    }

    for (const lesson of state.lessons) {
      const progress =
        state.progress.find(
          item =>
            String(item.lesson_id) ===
            String(lesson.id)
        );

      const completed =
        progress &&
        (
          progress.completed === true ||
          progress.is_completed === true ||
          normalize(progress.status) ===
            "completed"
        );

      if (!completed) {
        const course =
          state.courses.find(
            item =>
              String(item.id) ===
              String(lesson.course_id)
          );

        if (!course) {
          continue;
        }

        const trackKey =
          getTrackFromCourse(course);

        if (!getTrackAccess(trackKey)) {
          continue;
        }

        return {
          lesson,
          course
        };
      }
    }

    return null;
  }

  function renderContinueLearning() {
    const target =
      $("[data-continue-learning]") ||
      $(".continue-learning");

    if (!target) {
      return;
    }

    const item =
      getLastIncompleteLesson();

    if (!item) {
      return;
    }

    const {
      lesson,
      course
    } = item;

    target.dataset.lessonId =
      String(lesson.id);

    target.dataset.courseId =
      String(course.id);

    const title =
      $(".continue-learning-title", target);

    if (title) {
      title.textContent =
        lesson.title ||
        "Continue Learning";
    }

    const courseTitle =
      $(".continue-learning-course", target);

    if (courseTitle) {
      courseTitle.textContent =
        course.title ||
        course.name ||
        "";
    }

    const button =
      $(".continue-learning-button", target);

    if (button) {
      button.onclick = () => {
        openLesson(
          lesson,
          course
        );
      };
    }
  }

  /* ============================================================
     LESSON NAVIGATION
     ============================================================ */

  function openLesson(lesson, course) {
    if (!lesson) {
      return;
    }

    const courseId =
      course?.id ||
      lesson.course_id;

    const trackKey =
      course
        ? getTrackFromCourse(course)
        : "fundamentals";

    if (!getTrackAccess(trackKey)) {
      return;
    }

    const lessonId =
      lesson.id;

    const url =
      `lesson.html?lesson=${encodeURIComponent(
        lessonId
      )}&course=${encodeURIComponent(
        courseId || ""
      )}`;

    window.location.href =
      url;
  }

  function setupCourseCardActions() {
    $$(".course-card").forEach(card => {
      const action =
        $(".course-explore", card);

      if (!action) {
        return;
      }

      action.addEventListener(
        "click",
        event => {
          event.preventDefault();

          const courseId =
            card.dataset.courseId ||
            card.dataset.id;

          let course =
            state.courses.find(
              item =>
                String(item.id) ===
                String(courseId)
            );

          if (!course) {
            const title =
              normalize(
                $(".course-card-title", card)
                  ?.textContent
              );

            course =
              state.courses.find(
                item =>
                  normalize(item.title) ===
                    title ||
                  normalize(item.name) ===
                    title
              );
          }

          const trackKey =
            card.dataset.track ||
            (
              course
                ? getTrackFromCourse(course)
                : "fundamentals"
            );

          if (!getTrackAccess(trackKey)) {
            handleUnlock(trackKey);
            return;
          }

          if (!course) {
            return;
          }

          const firstLesson =
            state.lessons.find(
              lesson =>
                String(lesson.course_id) ===
                String(course.id)
            );

          if (firstLesson) {
            openLesson(
              firstLesson,
              course
            );
            return;
          }

          const url =
            `course.html?id=${encodeURIComponent(
              course.id
            )}`;

          window.location.href =
            url;
        }
      );
    });
  }

  /* ============================================================
     UNLOCK HANDLER
     ============================================================ */

  function handleUnlock(trackKey) {
    const track =
      TRACKS[trackKey];

    if (!track) {
      return;
    }

    /*
      Existing unlock navigation remains intentionally
      non-destructive. No database operation is performed here.
    */

    const unlockUrl =
      `unlock.html?product=${encodeURIComponent(
        track.product || trackKey
      )}`;

    window.location.href =
      unlockUrl;
  }

  /* ============================================================
     COURSE CARD DECORATION / COUNTERS
     ============================================================ */

  function renderCourseCounts() {
    Object.keys(TRACKS).forEach(trackKey => {
      const trackElement =
        document.querySelector(
          `.course-track[data-track="${trackKey}"]`
        );

      if (!trackElement) {
        return;
      }

      const courses =
        state.courses.filter(
          course =>
            getTrackFromCourse(course) ===
            trackKey
        );

      const countElements = [
        "[data-course-count]",
        ".course-count"
      ];

      countElements.forEach(selector => {
        $$(selector, trackElement).forEach(
          element => {
            element.textContent =
              String(courses.length);
          }
        );
      });
    });
  }

  /* ============================================================
     DASHBOARD STATS
     ============================================================ */

  function renderDashboardStats() {
    const totalCourses =
      state.courses.length;

    const totalLessons =
      state.lessons.length;

    const completedLessons =
      state.lessons.filter(lesson => {
        const progress =
          state.progress.find(
            item =>
              String(item.lesson_id) ===
              String(lesson.id)
          );

        return (
          progress &&
          (
            progress.completed === true ||
            progress.is_completed === true ||
            normalize(progress.status) ===
              "completed"
          )
        );
      }).length;

    const overallProgress =
      totalLessons > 0
        ? Math.round(
            (completedLessons /
              totalLessons) *
              100
          )
        : 0;

    const mappings = {
      courses: totalCourses,
      lessons: totalLessons,
      completed: completedLessons,
      progress: overallProgress
    };

    Object.entries(mappings).forEach(
      ([key, value]) => {
        $$(
          `[data-stat="${key}"]`
        ).forEach(element => {
          element.textContent =
            String(value);
        });
      }
    );
  }

  /* ============================================================
     ACTIVE NAVIGATION
     ============================================================ */

  function setupActiveNavigation() {
    const currentPath =
      window.location.pathname
        .split("/")
        .pop()
        .toLowerCase();

    const links =
      $$("a[href]");

    links.forEach(link => {
      const href =
        link.getAttribute("href");

      if (!href) {
        return;
      }

      if (
        href.startsWith("#") ||
        href.startsWith("http") ||
        href.startsWith("mailto:")
      ) {
        return;
      }

      const cleanHref =
        href
          .split("?")[0]
          .split("#")[0]
          .split("/")
          .pop()
          .toLowerCase();

      const matches =
        cleanHref === currentPath;

      link.classList.toggle(
        "active",
        matches
      );

      link.setAttribute(
        "aria-current",
        matches
          ? "page"
          : "false"
      );
    });
  }

  /* ============================================================
     MOBILE NAVIGATION
     ============================================================ */

  function setupMobileNavigation() {
    const menuButton =
      $(
        "[data-mobile-menu]"
      ) ||
      $(
        ".mobile-menu-button"
      ) ||
      $("#mobileMenuButton");

    const sidebar =
      $(".sidebar") ||
      $("#sidebar");

    if (!menuButton || !sidebar) {
      return;
    }

    menuButton.addEventListener(
      "click",
      () => {
        const open =
          sidebar.classList.toggle(
            "is-open"
          );

        menuButton.setAttribute(
          "aria-expanded",
          open
            ? "true"
            : "false"
        );
      }
    );
  }

  /* ============================================================
     AUTH LISTENER
     ============================================================ */

  function setupAuthListener() {
    if (!SUPABASE) {
      return;
    }

    SUPABASE.auth.onAuthStateChange(
      async (event, session) => {
        state.user =
          session?.user ||
          null;

        renderUserIdentity();

        if (
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED"
        ) {
          await loadAccessState();
          await loadProgress();

          renderAccessState();
          renderTrackVisibility();
          renderContinueLearning();
          renderDashboardStats();
        }

        if (event === "SIGNED_OUT") {
          state.user = null;

          state.entitlements = [];
          state.products = [];
          state.progress = [];

          state.accessByTrack = {
            fundamentals: true,
            intermediate: false,
            advanced: false
          };

          state.isOwner = false;

          renderAccessState();
          renderTrackVisibility();
          renderDashboardStats();
        }
      }
    );
  }

  /* ============================================================
     SUPABASE INITIALIZATION
     ============================================================ */

  function getSupabaseClient() {
    if (
      window.secoraSupabase &&
      typeof window.secoraSupabase
        .from === "function"
    ) {
      return window.secoraSupabase;
    }

    if (
      window.supabaseClient &&
      typeof window.supabaseClient
        .from === "function"
    ) {
      return window.supabaseClient;
    }

    if (
      window.supabase &&
      typeof window.supabase
        .from === "function"
    ) {
      return window.supabase;
    }

    return null;
  }

  async function waitForSupabase(
    attempts = 50,
    delay = 100
  ) {
    for (
      let index = 0;
      index < attempts;
      index++
    ) {
      const client =
        getSupabaseClient();

      if (client) {
        return client;
      }

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            delay
          )
      );
    }

    return null;
  }

  /* ============================================================
     PAGE VISIBILITY REFRESH
     ============================================================ */

  function setupVisibilityRefresh() {
    document.addEventListener(
      "visibilitychange",
      async () => {
        if (
          document.visibilityState !==
          "visible"
        ) {
          return;
        }

        if (!SUPABASE || !state.user?.id) {
          return;
        }

        await loadUser();
        await loadAccessState();
        await loadProgress();

        renderUserIdentity();
        renderAccessState();
        renderTrackVisibility();
        renderContinueLearning();
        renderDashboardStats();
      }
    );
  }

  /* ============================================================
     WINDOW FOCUS REFRESH
     ============================================================ */

  function setupWindowFocusRefresh() {
    let lastRefresh =
      0;

    window.addEventListener(
      "focus",
      async () => {
        const now =
          Date.now();

        /*
          Prevent excessive requests when
          focus fires repeatedly.
        */

        if (
          now - lastRefresh <
          5000
        ) {
          return;
        }

        lastRefresh =
          now;

        if (
          !SUPABASE ||
          !state.user?.id
        ) {
          return;
        }

        await loadAccessState();
        await loadProgress();

        renderAccessState();
        renderTrackVisibility();
        renderContinueLearning();
        renderDashboardStats();
      }
    );
  }

  /* ============================================================
     MAIN INITIALIZATION
     ============================================================ */

  async function initialize() {
    if (state.initialized) {
      return;
    }

    SUPABASE =
      await waitForSupabase();

    if (!SUPABASE) {
      console.warn(
        "SECORA: Supabase client was not found."
      );

      renderUserIdentity();

      return;
    }

    state.initialized =
      true;

    await loadUser();

    renderUserIdentity();

    /*
      Load independent data.
    */

    await Promise.all([
      loadCourses(),
      loadModules(),
      loadLessons()
    ]);

    /*
      Access must be resolved before rendering
      course lock state.
    */

    await loadAccessState();

    /*
      User progress is loaded after authentication.
    */

    await loadProgress();

    /*
      Final dashboard rendering.
    */

    renderCourseCounts();
    renderAccessState();
    renderTrackVisibility();
    renderContinueLearning();
    renderDashboardStats();

    setupCourseCardActions();
    setupActiveNavigation();
    setupMobileNavigation();
    setupAuthListener();
    setupVisibilityRefresh();
    setupWindowFocusRefresh();
  }

  /* ============================================================
     PUBLIC DEBUG STATE
     ============================================================ */

  /*
    Keep the existing SECORA state available for
    debugging from the browser console without exposing
    credentials or secrets.
  */

  window.SECORA_DASHBOARD =
    window.SECORA_DASHBOARD || {};

  window.SECORA_DASHBOARD.state =
    state;

  window.SECORA_DASHBOARD.refresh =
    async function refreshDashboard() {
      if (!SUPABASE) {
        SUPABASE =
          await waitForSupabase();
      }

      if (!SUPABASE) {
        return;
      }

      await loadUser();
      await loadAccessState();
      await loadProgress();

      renderUserIdentity();
      renderAccessState();
      renderTrackVisibility();
      renderContinueLearning();
      renderDashboardStats();
    };

  /* ============================================================
     START
     ============================================================ */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      {
        once: true
      }
    );
  } else {
    initialize();
  }

})();
