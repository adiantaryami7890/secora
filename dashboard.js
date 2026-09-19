 /* ============================================================
   SECORA DASHBOARD
   dashboard.js
   Compatible with:
   - home.html
   - dashboard.css
   - Supabase Auth
   - SECORA ORIGIN / CORE / BLACKLINE
   - Redeem Code System
   - User Entitlements
   ============================================================ */

(() => {
  "use strict";

  /* ============================================================
     CONFIGURATION
     ============================================================ */

  const SUPABASE = window.secoraSupabase;

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

  const $ = (selector, parent = document) => {
    return parent.querySelector(selector);
  };

  const $$ = (selector, parent = document) => {
    return Array.from(parent.querySelectorAll(selector));
  };

  const escapeHTML = (value) => {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };


  /* ============================================================
     INITIALIZATION
     ============================================================ */

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      if (!SUPABASE) {
        showDashboardError(
          "SECORA could not initialize its database connection."
        );
        return;
      }

      bindGlobalEvents();

      await ensureAuthenticated();

      await loadPlatformData();

      renderUser();

      renderDate();

      renderStats();

      renderCourses();

      renderAccessCenter();

      setupSearch();

      setupRedeemButtons();

      setupPurchaseButtons();

      setupAccessTrackButtons();

      state.initialized = true;

    } catch (error) {
      console.error("SECORA dashboard initialization error:", error);

      showDashboardError(
        "Something went wrong while loading your SECORA dashboard."
      );
    }
  }


  /* ============================================================
     AUTHENTICATION
     ============================================================ */

  async function ensureAuthenticated() {
    const {
      data,
      error
    } = await SUPABASE.auth.getSession();

    if (error) {
      console.error("Session error:", error);
      redirectToLogin();
      return;
    }

    if (!data?.session?.user) {
      redirectToLogin();
      return;
    }

    state.user = data.session.user;
  }


  function redirectToLogin() {
    window.location.href = "index.html";
  }


  /* ============================================================
     LOAD PLATFORM DATA
     ============================================================ */

  async function loadPlatformData() {

    const userId = state.user.id;

    /*
     * Load courses.
     */
    const coursesResult = await SUPABASE
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
      .eq("published", true)
      .order("track", {
        ascending: true
      })
      .order("created_at", {
        ascending: true
      });

    if (coursesResult.error) {
      throw coursesResult.error;
    }

    state.courses = (coursesResult.data || []).map(course => ({
      ...course,
      track: normalizeTrack(course.track)
    }));


    /*
     * Load modules.
     *
     * RLS decides which modules the authenticated user can
     * actually see. We intentionally do not bypass that policy.
     */
    const modulesResult = await SUPABASE
      .from("modules")
      .select(`
        id,
        course_id,
        title,
        description,
        position,
        created_at
      `)
      .order("position", {
        ascending: true
      });

    if (modulesResult.error) {
      throw modulesResult.error;
    }

    state.modules = modulesResult.data || [];


    /*
     * Load lessons.
     *
     * Again, database RLS remains the authority.
     */
    const lessonsResult = await SUPABASE
      .from("lessons")
      .select(`
        id,
        module_id,
        title,
        slug,
        content,
        position,
        duration_minutes,
        published,
        created_at
      `)
      .eq("published", true)
      .order("position", {
        ascending: true
      });

    if (lessonsResult.error) {
      throw lessonsResult.error;
    }

    state.lessons = lessonsResult.data || [];


    /*
     * Load current user's progress.
     */
    const progressResult = await SUPABASE
      .from("lesson_progress")
      .select(`
        id,
        user_id,
        lesson_id,
        completed,
        completed_at,
        last_opened_at
      `)
      .eq("user_id", userId);

    if (progressResult.error) {
      throw progressResult.error;
    }

    state.progress = progressResult.data || [];


    /*
     * Load products.
     *
     * This is intentionally handled defensively because the
     * dashboard must continue working even if product RLS
     * prevents direct client reads.
     */
    const productsResult = await SUPABASE
      .from("products")
      .select(`
        id,
        code,
        name,
        description
      `);

    if (!productsResult.error) {
      state.products = productsResult.data || [];
    } else {
      console.warn(
        "Products could not be loaded:",
        productsResult.error.message
      );

      state.products = [];
    }


    /*
     * Load user's entitlements.
     */
    const entitlementResult = await SUPABASE
      .from("user_entitlements")
      .select(`
        id,
        user_id,
        product_id,
        status,
        source,
        payment_reference,
        granted_at,
        expires_at,
        metadata
      `)
      .eq("user_id", userId);

    if (!entitlementResult.error) {
      state.entitlements = entitlementResult.data || [];
    } else {
      console.warn(
        "Entitlements could not be loaded:",
        entitlementResult.error.message
      );

      state.entitlements = [];
    }


    /*
     * Owner detection.
     *
     * Do NOT depend on a profiles.role column.
     *
     * The project already has the secure owner function:
     * public.is_secora_owner()
     *
     * We use it when available.
     */
    try {

      const ownerResult = await SUPABASE.rpc("is_secora_owner");

      if (!ownerResult.error) {
        state.isOwner = Boolean(ownerResult.data);
      }

    } catch (ownerError) {

      console.warn(
        "Owner status could not be determined:",
        ownerError
      );

      state.isOwner = false;
    }


    /*
     * ORIGIN is always available.
     */
    state.accessByTrack.fundamentals = true;


    /*
     * Owner can access every commercial track.
     */
    if (state.isOwner) {

      state.accessByTrack.intermediate = true;

      state.accessByTrack.advanced = true;

    } else {

      /*
       * Normal users receive access based on active entitlements.
       */
      state.accessByTrack.intermediate =
        hasProductAccess("core");

      state.accessByTrack.advanced =
        hasProductAccess("blackline");
    }
  }


  /* ============================================================
     TRACK NORMALIZATION
     ============================================================ */

  function normalizeTrack(track) {

    const value = String(track || "")
      .trim()
      .toLowerCase();

    if (
      value === "advanced" ||
      value === "blackline"
    ) {
      return "advanced";
    }

    if (
      value === "intermediate" ||
      value === "core"
    ) {
      return "intermediate";
    }

    return "fundamentals";
  }


  /* ============================================================
     PRODUCT ACCESS
     ============================================================ */

  function hasProductAccess(productCode) {

    const product = state.products.find(
      item =>
        String(item.code || "").toLowerCase() ===
        String(productCode).toLowerCase()
    );

    /*
     * If products are not readable through the browser,
     * attempt a metadata/product-code match from entitlement.
     */
    if (!product) {

      return state.entitlements.some(entitlement => {

        if (entitlement.status !== "active") {
          return false;
        }

        if (entitlement.expires_at) {

          const expiry =
            new Date(entitlement.expires_at).getTime();

          if (
            Number.isFinite(expiry) &&
            expiry <= Date.now()
          ) {
            return false;
          }
        }

        const metadata = entitlement.metadata || {};

        return String(metadata.product_code || "")
          .toLowerCase() ===
          String(productCode).toLowerCase();

      });
    }


    return state.entitlements.some(entitlement => {

      if (
        entitlement.product_id !== product.id
      ) {
        return false;
      }

      if (
        entitlement.status !== "active"
      ) {
        return false;
      }

      if (entitlement.expires_at) {

        const expiry =
          new Date(entitlement.expires_at).getTime();

        if (
          Number.isFinite(expiry) &&
          expiry <= Date.now()
        ) {
          return false;
        }
      }

      return true;
    });
  }


  /* ============================================================
     USER UI
     ============================================================ */

  function renderUser() {

    if (!state.user) {
      return;
    }

    const metadata =
      state.user.user_metadata || {};

    const email =
      state.user.email || "";

    const displayName =
      metadata.full_name ||
      metadata.name ||
      metadata.display_name ||
      email.split("@")[0] ||
      "Learner";

    const avatarURL =
      metadata.avatar_url ||
      metadata.picture ||
      "";


    const greetingName =
      getFirstName(displayName);


    setText(
      "#userName",
      displayName
    );

    setText(
      "#topUserName",
      displayName
    );

    setText(
      "#userEmail",
      email
    );

    setText(
      "#userGreeting",
      `Welcome back, ${greetingName}.`
    );


    setAvatar(
      "#userAvatar",
      avatarURL,
      displayName
    );

    setAvatar(
      "#topUserAvatar",
      avatarURL,
      displayName
    );
  }


  function getFirstName(name) {

    const clean =
      String(name || "")
        .trim();

    if (!clean) {
      return "Learner";
    }

    return clean.split(/\s+/)[0];
  }


  function setText(selector, value) {

    const element = $(selector);

    if (element) {
      element.textContent = value;
    }
  }


  function setAvatar(selector, url, name) {

    const element = $(selector);

    if (!element) {
      return;
    }

    if (url) {

      element.src = url;

      element.alt = `${name} avatar`;

      element.style.display = "block";

    } else {

      element.removeAttribute("src");

      element.alt = "";

      element.style.display = "none";
    }
  }


  /* ============================================================
     DATE
     ============================================================ */

  function renderDate() {

    const element =
      $("#currentDate");

    if (!element) {
      return;
    }

    const now =
      new Date();

    const formatted =
      new Intl.DateTimeFormat(
        undefined,
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        }
      ).format(now);

    element.textContent =
      formatted;
  }


  /* ============================================================
     STATS
     ============================================================ */

  function renderStats() {

    const totalCourses =
      state.courses.length;

    const completedLessons =
      state.progress.filter(
        item => item.completed === true
      ).length;

    const totalLessons =
      state.lessons.length;

    const startedCourseIds =
      new Set();

    state.progress.forEach(progressItem => {

      const lesson =
        state.lessons.find(
          item =>
            item.id === progressItem.lesson_id
        );

      if (!lesson) {
        return;
      }

      const module =
        state.modules.find(
          item =>
            item.id === lesson.module_id
        );

      if (!module) {
        return;
      }

      startedCourseIds.add(
        module.course_id
      );
    });


    const coursesStarted =
      startedCourseIds.size;


    let overallProgress = 0;

    if (totalLessons > 0) {

      overallProgress =
        Math.round(
          (
            completedLessons /
            totalLessons
          ) * 100
        );
    }


    setText(
      "#coursesStarted",
      coursesStarted || 0
    );

    setText(
      "#completedLessons",
      completedLessons || 0
    );

    setText(
      "#overallProgress",
      `${overallProgress}%`
    );


    /*
     * If the user has no activity yet, showing 0 courses is
     * more accurate than pretending every visible course was
     * started.
     */
    void totalCourses;
  }


  /* ============================================================
     COURSE RENDERING
     ============================================================ */

  function renderCourses() {

    const container =
      $(".course-grid");

    if (!container) {
      return;
    }

    container.innerHTML = "";


    const trackOrder = [
      "fundamentals",
      "intermediate",
      "advanced"
    ];


    trackOrder.forEach(trackKey => {

      const trackCourses =
        state.courses.filter(
          course =>
            normalizeTrack(course.track) ===
            trackKey
        );


      const section =
        createTrackSection(
          trackKey,
          trackCourses
        );

      container.appendChild(section);
    });


    if (!state.courses.length) {

      const empty =
        document.createElement("div");

      empty.className =
        "course-empty";

      empty.innerHTML = `
        <strong>No courses available yet.</strong>
        <span>SECORA curriculum will appear here once published.</span>
      `;

      container.appendChild(empty);
    }
  }


  function createTrackSection(
    trackKey,
    courses
  ) {

    const track =
      TRACKS[trackKey];


    const wrapper =
      document.createElement("section");

    wrapper.className =
      `course-track course-track-${trackKey}`;

    wrapper.dataset.track =
      trackKey;


    const accessible =
      state.accessByTrack[trackKey];


    const heading =
      document.createElement("div");

    heading.className =
      "track-heading";


    heading.innerHTML = `
      <div class="track-heading-copy">

        <span class="track-kicker">
          ${escapeHTML(
            trackKey === "fundamentals"
              ? "FOUNDATION"
              : trackKey === "intermediate"
                ? "PROFESSIONAL"
                : "ADVANCED"
          )}
        </span>

        <h2>
          ${escapeHTML(track.title)}
        </h2>

        <p>
          ${escapeHTML(track.description)}
        </p>

      </div>

      <div class="track-heading-meta">

        <span class="track-course-count">
          ${courses.length}
          ${courses.length === 1 ? "course" : "courses"}
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
                data-track-access="${escapeHTML(trackKey)}"
              >
                Unlock
                <span>→</span>
              </button>
            `
        }

      </div>
    `;


    wrapper.appendChild(
      heading
    );


    const grid =
      document.createElement("div");

    grid.className =
      "track-course-grid";


    if (!courses.length) {

      grid.innerHTML = `
        <article class="empty-track-card">

          <span class="empty-track-label">
            COMING SOON
          </span>

          <strong>
            More ${escapeHTML(track.title)}
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


    wrapper.appendChild(
      grid
    );


    return wrapper;
  }


  /* ============================================================
     COURSE CARD
     ============================================================ */

  function createCourseCard(
    course,
    trackAccessible
  ) {

    const card =
      document.createElement("article");

    card.className =
      "course-card";


    const courseLessons =
      getCourseLessons(
        course.id
      );


    const courseProgress =
      calculateCourseProgress(
        course.id
      );


    const isLocked =
      !trackAccessible;


    const progressText =
      courseLessons.length
        ? `${courseProgress}% complete`
        : "Curriculum loading";


    const level =
      course.level ||
      (
        course.track === "advanced"
          ? "Advanced"
          : course.track === "intermediate"
            ? "Intermediate"
            : "Beginner"
      );


    card.innerHTML = `

      <div class="course-card-visual">

        ${
          course.thumbnail_url
            ? `
              <img
                src="${escapeHTML(course.thumbnail_url)}"
                alt=""
                loading="lazy"
              >
            `
            : `
              <div class="course-visual-placeholder">
                <span>
                  ${escapeHTML(
                    course.track === "advanced"
                      ? "03"
                      : course.track === "intermediate"
                        ? "02"
                        : "01"
                  )}
                </span>
              </div>
            `
        }

        <div class="course-card-overlay"></div>

        ${
          isLocked
            ? `
              <span class="course-lock-badge">
                LOCKED
              </span>
            `
            : `
              <span class="course-open-badge">
                AVAILABLE
              </span>
            `
        }

      </div>


      <div class="course-card-body">

        <div class="course-card-meta">

          <span>
            ${escapeHTML(level)}
          </span>

          <span>
            ${courseLessons.length} lessons
          </span>

        </div>


        <h3>
          ${escapeHTML(course.title)}
        </h3>


        <p>
          ${escapeHTML(
            course.description ||
            "Structured cybersecurity learning."
          )}
        </p>


        <div class="course-progress">

          <div class="course-progress-top">

            <span>
              ${escapeHTML(progressText)}
            </span>

            <strong>
              ${courseProgress}%
            </strong>

          </div>

          <div class="course-progress-bar">

            <span
              style="width:${courseProgress}%"
            ></span>

          </div>

        </div>


        ${
          isLocked
            ? `
              <button
                type="button"
                class="course-action locked-course-action"
                data-course-lock="${escapeHTML(course.track)}"
              >
                <span>
                  Unlock track
                </span>
                <i>→</i>
              </button>
            `
            : `
              <a
                class="course-action"
                href="course.html?slug=${encodeURIComponent(course.slug)}"
              >
                <span>
                  Open course
                </span>
                <i>→</i>
              </a>
            `
        }

      </div>
    `;


    return card;
  }


  /* ============================================================
     COURSE / LESSON HELPERS
     ============================================================ */

  function getCourseModules(courseId) {

    return state.modules
      .filter(
        module =>
          module.course_id === courseId
      )
      .sort(
        (a, b) =>
          Number(a.position || 0) -
          Number(b.position || 0)
      );
  }


  function getCourseLessons(courseId) {

    const modules =
      getCourseModules(courseId);

    const moduleIds =
      new Set(
        modules.map(
          module => module.id
        )
      );

    return state.lessons
      .filter(
        lesson =>
          moduleIds.has(
            lesson.module_id
          )
      )
      .sort(
        (a, b) =>
          Number(a.position || 0) -
          Number(b.position || 0)
      );
  }


  function calculateCourseProgress(courseId) {

    const lessons =
      getCourseLessons(courseId);

    if (!lessons.length) {
      return 0;
    }

    const lessonIds =
      new Set(
        lessons.map(
          lesson => lesson.id
        )
      );

    const completed =
      state.progress.filter(
        progressItem =>
          lessonIds.has(
            progressItem.lesson_id
          ) &&
          progressItem.completed === true
      ).length;


    return Math.round(
      (
        completed /
        lessons.length
      ) * 100
    );
  }


  /* ============================================================
     ACCESS CENTER
     ============================================================ */

  function renderAccessCenter() {

    updateAccessProductUI(
      "core"
    );

    updateAccessProductUI(
      "blackline"
    );
  }


  function updateAccessProductUI(
    productCode
  ) {

    const trackKey =
      productCode === "core"
        ? "intermediate"
        : "advanced";


    const card =
      document.querySelector(
        `[data-access-product="${productCode}"]`
      );


    if (!card) {
      return;
    }


    const unlocked =
      Boolean(
        state.accessByTrack[trackKey]
      );


    card.classList.toggle(
      "is-unlocked",
      unlocked
    );


    const statusText =
      $(".access-status-text", card);

    const statusDot =
      $(".access-status-dot", card);


    if (unlocked) {

      if (statusText) {
        statusText.textContent =
          "UNLOCKED";
      }

      if (statusDot) {
        statusDot.classList.add(
          "active"
        );
      }

      markAccessCardUnlocked(
        card
      );

    } else {

      if (statusText) {
        statusText.textContent =
          "LIFETIME";
      }

      if (statusDot) {
        statusDot.classList.remove(
          "active"
        );
      }
    }
  }


  function markAccessCardUnlocked(
    card
  ) {

    if (!card) {
      return;
    }


    const feedback =
      $(".access-feedback", card);

    if (feedback) {

      feedback.textContent =
        "Access is active on this account.";

      feedback.className =
        "access-feedback success";
    }


    const redeemButton =
      $(".access-redeem-button", card);

    if (redeemButton) {

      redeemButton.disabled =
        true;

      redeemButton.innerHTML = `
        <span>
          Unlocked
        </span>

        <i aria-hidden="true">
          ✓
        </i>
      `;
    }


    const input =
      $(".access-redeem-input", card);

    if (input) {
      input.disabled = true;
      input.value = "";
      input.placeholder =
        "ACCESS ACTIVE";
    }


    const purchaseButton =
      $(".access-purchase-button", card);

    if (purchaseButton) {

      purchaseButton.disabled =
        true;

      purchaseButton.innerHTML = `
        <span>
          Access Active
        </span>

        <small>
          UNLOCKED
        </small>
      `;
    }
  }


  /* ============================================================
     REDEEM BUTTONS
     ============================================================ */

  function setupRedeemButtons() {

    $$("[data-redeem-product]")
      .forEach(button => {

        button.addEventListener(
          "click",
          async () => {

            const product =
              button.dataset.redeemProduct;

            await handleSecoraRedeem(
              product,
              button
            );
          }
        );
      });


    /*
     * Enter key support.
     */
    [
      "#coreRedeemCode",
      "#blacklineRedeemCode"
    ].forEach(selector => {

      const input =
        $(selector);

      if (!input) {
        return;
      }


      input.addEventListener(
        "keydown",
        event => {

          if (
            event.key !== "Enter"
          ) {
            return;
          }

          event.preventDefault();

          const product =
            selector === "#coreRedeemCode"
              ? "core"
              : "blackline";


          const button =
            document.querySelector(
              `[data-redeem-product="${product}"]`
            );


          if (button) {
            button.click();
          }
        }
      );


      input.addEventListener(
        "input",
        () => {

          input.value =
            input.value
              .toUpperCase()
              .replace(/\s+/g, "");
        }
      );
    });
  }


  async function handleSecoraRedeem(
    product,
    button
  ) {

    const normalizedProduct =
      String(product || "")
        .trim()
        .toLowerCase();


    if (
      normalizedProduct !== "core" &&
      normalizedProduct !== "blackline"
    ) {
      return;
    }


    const inputId =
      normalizedProduct === "core"
        ? "#coreRedeemCode"
        : "#blacklineRedeemCode";


    const feedbackId =
      normalizedProduct === "core"
        ? "#coreRedeemFeedback"
        : "#blacklineRedeemFeedback";


    const input =
      $(inputId);

    const feedback =
      $(feedbackId);


    if (!input || !feedback) {
      return;
    }


    const rawCode =
      input.value.trim();


    if (!rawCode) {

      setFeedback(
        feedback,
        "Enter your access code.",
        "error"
      );

      input.focus();

      return;
    }


    const expectedPrefix =
      normalizedProduct === "core"
        ? "SECORA-CORE-"
        : "SECORA-BL-";


    const normalizedCode =
      rawCode
        .toUpperCase()
        .replace(/\s+/g, "");


    /*
     * Product-specific validation.
     *
     * This is UX validation only.
     * The database function remains the actual authority.
     */
    if (
      !normalizedCode.startsWith(
        expectedPrefix
      )
    ) {

      setFeedback(
        feedback,
        `This does not look like a SECORA ${
          normalizedProduct === "core"
            ? "CORE"
            : "BLACKLINE"
        } code.`,
        "error"
      );

      input.focus();

      return;
    }


    if (
      state.accessByTrack[
        normalizedProduct === "core"
          ? "intermediate"
          : "advanced"
      ]
    ) {

      setFeedback(
        feedback,
        "This account already has access.",
        "success"
      );

      return;
    }


    const originalHTML =
      button.innerHTML;


    button.disabled =
      true;

    button.classList.add(
      "is-loading"
    );


    button.innerHTML = `
      <span>
        Verifying
      </span>

      <i class="redeem-spinner" aria-hidden="true">
        ◌
      </i>
    `;


    setFeedback(
      feedback,
      "Securely verifying your code...",
      "loading"
    );


    try {

      const {
        data,
        error
      } = await SUPABASE.rpc(
        "redeem_secora_code",
        {
          redeem_code_input:
            normalizedCode
        }
      );


      if (error) {
        throw error;
      }


      const result =
        Array.isArray(data)
          ? data[0]
          : data;


      if (
        !result ||
        result.success !== true
      ) {

        const message =
          translateRedeemError(
            result?.message ||
            result?.error ||
            "The access code could not be redeemed."
          );


        setFeedback(
          feedback,
          message,
          "error"
        );

        return;
      }


      /*
       * Update local state immediately.
       */
      const trackKey =
        normalizedProduct === "core"
          ? "intermediate"
          : "advanced";


      state.accessByTrack[
        trackKey
      ] = true;


      /*
       * Add the newly-created entitlement
       * locally so the UI is immediately
       * consistent without a full reload.
       */
      if (result.entitlement_id) {

        state.entitlements.push({
          id: result.entitlement_id,
          user_id: state.user.id,
          product_id: result.product_id || null,
          status: "active",
          source: "redeem_code",
          payment_reference: null,
          granted_at: new Date().toISOString(),
          expires_at: null,
          metadata: {
            product_code:
              normalizedProduct
          }
        });
      }


      setFeedback(
        feedback,
        `SECORA ${
          normalizedProduct === "core"
            ? "CORE"
            : "BLACKLINE"
        } access unlocked successfully.`,
        "success"
      );


      updateAccessProductUI(
        normalizedProduct
      );


      /*
       * Re-render course cards because
       * locked cards can now become available.
       */
      renderCourses();


      /*
       * Rebind unlock buttons because renderCourses()
       * replaces the course-card DOM.
       */
      setupAccessTrackButtons();


    } catch (error) {

      console.error(
        "SECORA redeem error:",
        error
      );


      setFeedback(
        feedback,
        translateRedeemError(
          error?.message
        ),
        "error"
      );

    } finally {

      button.disabled =
        false;

      button.classList.remove(
        "is-loading"
      );


      if (
        state.accessByTrack[
          normalizedProduct === "core"
            ? "intermediate"
            : "advanced"
        ]
      ) {

        button.disabled =
          true;

        button.innerHTML = `
          <span>
            Unlocked
          </span>

          <i aria-hidden="true">
            ✓
          </i>
        `;

      } else {

        button.innerHTML =
          originalHTML;
      }
    }
  }


  function translateRedeemError(
    message
  ) {

    const text =
      String(
        message ||
        "Unable to redeem this code."
      ).trim();


    const lower =
      text.toLowerCase();


    if (
      lower.includes(
        "already redeemed"
      )
    ) {

      return (
        "This code has already been redeemed."
      );
    }


    if (
      lower.includes(
        "invalid"
      ) ||
      lower.includes(
        "not found"
      )
    ) {

      return (
        "This access code is invalid or does not exist."
      );
    }


    if (
      lower.includes(
        "expired"
      )
    ) {

      return (
        "This access code has expired."
      );
    }


    if (
      lower.includes(
        "inactive"
      )
    ) {

      return (
        "This access code is no longer active."
      );
    }


    if (
      lower.includes(
        "maximum"
      ) ||
      lower.includes(
        "redemption"
      )
    ) {

      return (
        "This access code has reached its redemption limit."
      );
    }


    if (
      lower.includes(
        "already have"
      ) ||
      lower.includes(
        "already has"
      ) ||
      lower.includes(
        "entitlement"
      )
    ) {

      return (
        "This account already has access to this product."
      );
    }


    if (
      lower.includes(
        "permission"
      ) ||
      lower.includes(
        "execute"
      ) ||
      lower.includes(
        "not authorized"
      )
    ) {

      return (
        "Your account is not currently authorized to redeem this code."
      );
    }


    return text ||
      "Unable to redeem this access code.";
  }


  function setFeedback(
    element,
    message,
    type
  ) {

    if (!element) {
      return;
    }


    element.textContent =
      message || "";


    element.className =
      `access-feedback ${type || ""}`;
  }


  /* ============================================================
     PURCHASE BUTTONS
     ============================================================ */

  function setupPurchaseButtons() {

    $$("[data-purchase-product]")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const product =
              button.dataset.purchaseProduct;

            handlePurchaseClick(
              product,
              button
            );
          }
        );
      });
  }


  function handlePurchaseClick(
    product,
    button
  ) {

    const normalizedProduct =
      String(product || "")
        .trim()
        .toLowerCase();


    const trackKey =
      normalizedProduct === "core"
        ? "intermediate"
        : normalizedProduct === "blackline"
          ? "advanced"
          : null;


    if (!trackKey) {
      return;
    }


    if (
      state.accessByTrack[
        trackKey
      ]
    ) {

      showInlinePurchaseMessage(
        button,
        "Access already active."
      );

      return;
    }


    /*
     * Cashfree backend checkout is intentionally
     * not fabricated on the frontend.
     *
     * When the secure Vercel backend/API is connected,
     * this function becomes the checkout entry point.
     */
    showInlinePurchaseMessage(
      button,
      "Secure checkout is being connected."
    );
  }


  function showInlinePurchaseMessage(
    button,
    message
  ) {

    if (!button) {
      return;
    }


    const originalHTML =
      button.innerHTML;


    button.disabled =
      true;


    button.innerHTML = `
      <span>
        ${escapeHTML(message)}
      </span>
    `;


    window.setTimeout(
      () => {

        /*
         * Do not re-enable an actually unlocked product.
         */
        const product =
          button.dataset.purchaseProduct;

        const trackKey =
          product === "core"
            ? "intermediate"
            : "advanced";


        if (
          state.accessByTrack[
            trackKey
          ]
        ) {

          return;
        }


        button.disabled =
          false;

        button.innerHTML =
          originalHTML;

      },
      2600
    );
  }


  /* ============================================================
     ACCESS TRACK BUTTONS
     ============================================================ */

  function setupAccessTrackButtons() {

    $$("[data-track-access]")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const track =
              button.dataset.trackAccess;

            focusAccessProduct(
              track
            );
          }
        );
      });


    $$("[data-course-lock]")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const track =
              button.dataset.courseLock;

            focusAccessProduct(
              track
            );
          }
        );
      });
  }


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
          $(".access-redeem-input", card);

        if (input && !input.disabled) {
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


    input.addEventListener(
      "input",
      () => {

        const query =
          input.value
            .trim()
            .toLowerCase();


        filterCourses(
          query
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
          event.key.toLowerCase() === "k"
        ) {

          event.preventDefault();

          input.focus();

          input.select();
        }
      }
    );
  }


  function filterCourses(
    query
  ) {

    const cards =
      $$(".course-card");


    cards.forEach(card => {

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
    });


    /*
     * Hide track sections when every
     * course card inside them is filtered.
     */
    $$(".course-track")
      .forEach(section => {

        const visibleCards =
          $$(".course-card", section)
            .filter(
              card =>
                card.style.display !== "none"
            );


        const hasEmptyState =
          $(".empty-track-card", section);


        if (hasEmptyState) {

          section.style.display =
            query ? "none" : "";

          return;
        }


        section.style.display =
          visibleCards.length
            ? ""
            : "none";
      });
  }


  /* ============================================================
     GLOBAL EVENTS
     ============================================================ */

  function bindGlobalEvents() {

    const logoutButton =
      $("#logoutBtn");


    if (logoutButton) {

      logoutButton.addEventListener(
        "click",
        handleLogout
      );
    }


    /*
     * Settings currently has no separate page.
     * Prevent an empty navigation action.
     */
    const settings =
      $("#settingsLink");


    if (settings) {

      settings.addEventListener(
        "click",
        event => {

          event.preventDefault();

          showDashboardToast(
            "Profile and account settings are coming soon."
          );
        }
      );
    }


    /*
     * Notification button.
     */
    const notificationButton =
      $(".icon-button");


    if (notificationButton) {

      notificationButton.addEventListener(
        "click",
        () => {

          showDashboardToast(
            "No new notifications."
          );
        }
      );
    }


    /*
     * Course navigation links.
     */
    $$(".nav-item[href='#courses']")
      .forEach(link => {

        link.addEventListener(
          "click",
          event => {

            const target =
              $("#courses");

            if (!target) {
              return;
            }

            event.preventDefault();

            target.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });
          }
        );
      });
  }


  /* ============================================================
     LOGOUT
     ============================================================ */

  async function handleLogout(
    event
  ) {

    if (event) {
      event.preventDefault();
    }


    const button =
      $("#logoutBtn");


    if (button) {

      button.disabled =
        true;

      button.style.opacity =
        "0.6";
    }


    try {

      const {
        error
      } =
        await SUPABASE.auth.signOut();


      if (error) {
        throw error;
      }


      window.location.href =
        "index.html";

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );


      if (button) {

        button.disabled =
          false;

        button.style.opacity =
          "";
      }


      showDashboardToast(
        "Could not log out. Please try again."
      );
    }
  }


  /* ============================================================
     TOAST
     ============================================================ */

  function showDashboardToast(
    message
  ) {

    let toast =
      $("#secoraDashboardToast");


    if (!toast) {

      toast =
        document.createElement(
          "div"
        );

      toast.id =
        "secoraDashboardToast";

      toast.className =
        "secora-dashboard-toast";


      document.body.appendChild(
        toast
      );
    }


    toast.textContent =
      message;


    toast.classList.add(
      "show"
    );


    window.clearTimeout(
      toast._hideTimer
    );


    toast._hideTimer =
      window.setTimeout(
        () => {

          toast.classList.remove(
            "show"
          );

        },
        3000
      );
  }


  /* ============================================================
     ERROR STATE
  ============================================================ */

  function showDashboardError(
    message
  ) {

    const container =
      $(".course-grid");


    if (!container) {
      return;
    }


    container.innerHTML = `
      <div class="course-empty dashboard-error">

        <strong>
          SECORA dashboard could not load.
        </strong>

        <span>
          ${escapeHTML(message)}
        </span>

        <button
          type="button"
          class="secondary-button"
          id="retryDashboardButton"
        >
          Retry
        </button>

      </div>
    `;


    const retry =
      $("#retryDashboardButton");


    if (retry) {

      retry.addEventListener(
        "click",
        () => {

          window.location.reload();

        }
      );
    }
  }


  /* ============================================================
     SUPABASE AUTH STATE LISTENER
  ============================================================ */

  if (SUPABASE) {

    SUPABASE.auth.onAuthStateChange(
      (
        event,
        session
      ) => {

        if (
          event === "SIGNED_OUT" ||
          !session?.user
        ) {

          if (
            window.location.pathname
              .toLowerCase()
              .includes("home.html")
          ) {

            window.location.href =
              "index.html";
          }
        }
      }
    );
  }

})();
