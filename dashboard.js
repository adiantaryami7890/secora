 /* ============================================================
   SECORA DASHBOARD
   dashboard.js
   RESTORED + HARDENED VERSION

   Compatible with:
   - SECORA home.html
   - SECORA dashboard.css
   - Supabase Auth
   - SECORA ORIGIN
   - SECORA CORE
   - SECORA BLACKLINE
   - Redeem Code System
   - User Entitlements

   IMPORTANT:
   Courses are rendered independently from optional data.
   A failure in progress/modules/products/entitlements
   must NEVER prevent the course cards from appearing.
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


  const TRACK_ORDER = [
    "fundamentals",
    "intermediate",
    "advanced"
  ];


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

    initialized: false,

    loading: false

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


  function setText(
    selector,
    value
  ) {

    const element =
      $(selector);

    if (element) {

      element.textContent =
        value;

    }

  }


  /* ============================================================
     START APPLICATION
     ============================================================ */

  document.addEventListener(
    "DOMContentLoaded",
    init
  );


  async function init() {

    if (
      state.loading ||
      state.initialized
    ) {

      return;

    }


    state.loading =
      true;


    /*
     * Bind UI immediately.
     */
    bindGlobalEvents();

    setupSearch();

    setupRedeemButtons();

    setupPurchaseButtons();

    setupAccessTrackButtons();


    /*
     * Supabase must exist.
     */
    if (!SUPABASE) {

      console.error(
        "SECORA: Supabase client was not found."
      );

      showDashboardError(
        "SECORA database client is unavailable. Check supabase.js."
      );

      state.loading =
        false;

      return;

    }


    try {

      /*
       * Authentication is essential.
       */
      const authenticated =
        await ensureAuthenticated();


      if (!authenticated) {

        state.loading =
          false;

        return;

      }


      /*
       * Render user immediately.
       */
      renderUser();

      renderDate();


      /*
       * ORIGIN should always exist.
       */
      state.accessByTrack.fundamentals =
        true;


      /*
       * Load the most important thing FIRST:
       * COURSES.
       *
       * Once courses arrive, render the dashboard.
       */
      const coursesLoaded =
        await loadCourses();


      if (!coursesLoaded) {

        state.loading =
          false;

        return;

      }


      /*
       * Render courses immediately.
       *
       * This is the critical fix.
       *
       * Optional database queries below can fail without
       * preventing ORIGIN / CORE / BLACKLINE from appearing.
       */
      renderStats();

      renderCourses();

      renderAccessCenter();


      /*
       * Now load secondary data independently.
       */
      await loadOptionalPlatformData();


      /*
       * Refresh the UI using whatever optional data
       * successfully loaded.
       */
      renderStats();

      renderCourses();

      renderAccessCenter();

      setupAccessTrackButtons();


      state.initialized =
        true;

    } catch (error) {

      console.error(
        "SECORA dashboard fatal error:",
        error
      );


      /*
       * Only show a full dashboard error when the
       * essential initialization itself failed.
       */
      showDashboardError(
        "SECORA could not load the dashboard. Check the browser console for the exact database error."
      );

    } finally {

      state.loading =
        false;

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

    window.location.href =
      "index.html";

  }


  /* ============================================================
     LOAD COURSES
     ============================================================ */

  async function loadCourses() {

    /*
     * First attempt:
     * full current courses schema.
     */
    let result =
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
          "created_at",
          {
            ascending: true
          }
        );


    /*
     * If the track column causes a schema error,
     * automatically fall back to the older schema.
     */
    if (result.error) {

      console.warn(
        "SECORA: Primary courses query failed. Trying compatibility query.",
        result.error
      );


      result =
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
        !result.error &&
        Array.isArray(result.data)
      ) {

        state.courses =
          result.data.map(
            course => ({

              ...course,

              /*
               * Old schema fallback:
               *
               * Existing ORIGIN courses are assigned
               * to fundamentals.
               */
              track:
                inferTrackFromCourse(
                  course
                )

            })
          );

        console.warn(
          "SECORA: Courses loaded using compatibility mode."
        );

        return true;

      }

    }


    if (result.error) {

      console.error(
        "SECORA COURSES QUERY FAILED:",
        result.error
      );


      showDashboardError(
        `Courses could not be loaded: ${
          result.error.message ||
          "Unknown database error"
        }`
      );


      return false;

    }


    state.courses =
      (result.data || [])
        .map(
          course => ({

            ...course,

            track:
              normalizeTrack(
                course.track
              )

          })
        );


    console.log(
      "SECORA: Courses loaded:",
      state.courses.length
    );


    return true;

  }


  /* ============================================================
     OPTIONAL PLATFORM DATA
     ============================================================ */

  async function loadOptionalPlatformData() {

    /*
     * Run independently.
     *
     * One failure does not stop the others.
     */
    await Promise.allSettled([

      loadModules(),

      loadLessons(),

      loadProgress(),

      loadProducts(),

      loadEntitlements(),

      loadOwnerStatus()

    ]);


    /*
     * ORIGIN is always free.
     */
    state.accessByTrack.fundamentals =
      true;


    /*
     * Determine commercial access.
     */
    if (state.isOwner) {

      state.accessByTrack.intermediate =
        true;

      state.accessByTrack.advanced =
        true;

    } else {

      state.accessByTrack.intermediate =
        hasProductAccess(
          "core"
        );

      state.accessByTrack.advanced =
        hasProductAccess(
          "blackline"
        );

    }

  }


  /* ============================================================
     MODULES
     ============================================================ */

  async function loadModules() {

    const result =
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
        .order(
          "position",
          {
            ascending: true
          }
        );


    if (result.error) {

      console.warn(
        "SECORA modules query failed:",
        result.error
      );

      state.modules =
        [];

      return false;

    }


    state.modules =
      result.data || [];


    return true;

  }


  /* ============================================================
     LESSONS
     ============================================================ */

  async function loadLessons() {

    const result =
      await SUPABASE
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


    if (result.error) {

      console.warn(
        "SECORA lessons query failed:",
        result.error
      );

      state.lessons =
        [];

      return false;

    }


    state.lessons =
      result.data || [];


    return true;

  }


  /* ============================================================
     PROGRESS
     ============================================================ */

  async function loadProgress() {

    if (!state.user?.id) {

      return false;

    }


    const result =
      await SUPABASE
        .from("lesson_progress")
        .select(`
          id,
          user_id,
          lesson_id,
          completed,
          completed_at,
          last_opened_at
        `)
        .eq(
          "user_id",
          state.user.id
        );


    if (result.error) {

      console.warn(
        "SECORA progress query failed:",
        result.error
      );

      state.progress =
        [];

      return false;

    }


    state.progress =
      result.data || [];


    return true;

  }


  /* ============================================================
     PRODUCTS
     ============================================================ */

  async function loadProducts() {

    const result =
      await SUPABASE
        .from("products")
        .select(`
          id,
          code,
          name,
          description
        `);


    if (result.error) {

      console.warn(
        "SECORA products query failed:",
        result.error
      );

      state.products =
        [];

      return false;

    }


    state.products =
      result.data || [];


    return true;

  }


  /* ============================================================
     ENTITLEMENTS
     ============================================================ */

  async function loadEntitlements() {

    if (!state.user?.id) {

      return false;

    }


    const result =
      await SUPABASE
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
        .eq(
          "user_id",
          state.user.id
        );


    if (result.error) {

      console.warn(
        "SECORA entitlement query failed:",
        result.error
      );

      state.entitlements =
        [];

      return false;

    }


    state.entitlements =
      result.data || [];


    return true;

  }


  /* ============================================================
     OWNER STATUS
     ============================================================ */

  async function loadOwnerStatus() {

    try {

      const result =
        await SUPABASE.rpc(
          "is_secora_owner"
        );


      if (result.error) {

        console.warn(
          "SECORA owner check failed:",
          result.error
        );

        state.isOwner =
          false;

        return false;

      }


      state.isOwner =
        Boolean(
          result.data
        );


      return true;

    } catch (error) {

      console.warn(
        "SECORA owner check exception:",
        error
      );

      state.isOwner =
        false;

      return false;

    }

  }


  /* ============================================================
     TRACK NORMALIZATION
     ============================================================ */

  function normalizeTrack(
    track
  ) {

    const value =
      String(
        track || ""
      )
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
     TRACK FALLBACK
     ============================================================ */

  function inferTrackFromCourse(
    course
  ) {

    const text =
      `${course?.slug || ""} ${
        course?.title || ""
      }`
        .toLowerCase();


    /*
     * Known ORIGIN courses.
     */
    const originNames = [

      "cybersecurity-fundamentals",

      "networking-fundamentals",

      "linux-fundamentals",

      "windows-fundamentals"

    ];


    if (
      originNames.some(
        name =>
          text.includes(name)
      )
    ) {

      return "fundamentals";

    }


    /*
     * Known CORE course patterns.
     */
    const corePatterns = [

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


    if (
      corePatterns.some(
        name =>
          text.includes(name)
      )
    ) {

      return "intermediate";

    }


    /*
     * Advanced / BLACKLINE patterns.
     */
    const advancedPatterns = [

      "adversary",

      "advanced-reconnaissance",

      "advanced-penetration",

      "active-directory",

      "privileged-access",

      "advanced-web",

      "vulnerability-research",

      "malware-analysis",

      "advanced-security",

      "cloud-attack",

      "cyber-threat",

      "detection-engineering",

      "digital-forensics",

      "incident-response",

      "network-detection",

      "purple-team",

      "zero-trust",

      "threat-hunting",

      "threat-intelligence",

      "threat-modeling"

    ];


    if (
      advancedPatterns.some(
        name =>
          text.includes(name)
      )
    ) {

      return "advanced";

    }


    /*
     * Safe default.
     */
    return "fundamentals";

  }


  /* ============================================================
     PRODUCT ACCESS
     ============================================================ */

  function hasProductAccess(
    productCode
  ) {

    const normalizedCode =
      String(
        productCode || ""
      )
        .trim()
        .toLowerCase();


    /*
     * First try the products table.
     */
    const product =
      state.products.find(
        item =>
          String(
            item.code || ""
          )
            .trim()
            .toLowerCase() ===
          normalizedCode
      );


    /*
     * If product table could not be read,
     * use entitlement metadata.
     */
    if (!product) {

      return state.entitlements.some(
        entitlement => {

          if (
            entitlement.status !==
            "active"
          ) {

            return false;

          }


          if (
            entitlement.expires_at
          ) {

            const expiry =
              new Date(
                entitlement.expires_at
              ).getTime();


            if (
              Number.isFinite(
                expiry
              ) &&
              expiry <= Date.now()
            ) {

              return false;

            }

          }


          const metadata =
            entitlement.metadata ||
            {};


          return String(
            metadata.product_code ||
            ""
          )
            .trim()
            .toLowerCase() ===
          normalizedCode;

        }
      );

    }


    /*
     * Product was found.
     */
    return state.entitlements.some(
      entitlement => {

        if (
          entitlement.product_id !==
          product.id
        ) {

          return false;

        }


        if (
          entitlement.status !==
          "active"
        ) {

          return false;

        }


        if (
          entitlement.expires_at
        ) {

          const expiry =
            new Date(
              entitlement.expires_at
            ).getTime();


          if (
            Number.isFinite(
              expiry
            ) &&
            expiry <= Date.now()
          ) {

            return false;

          }

        }


        return true;

      }
    );

  }


  /* ============================================================
     USER UI
     ============================================================ */

  function renderUser() {

    if (!state.user) {

      return;

    }


    const metadata =
      state.user.user_metadata ||
      {};


    const email =
      state.user.email ||
      "";


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


    const firstName =
      getFirstName(
        displayName
      );


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
      `Welcome back, ${firstName}.`
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


  function getFirstName(
    name
  ) {

    const clean =
      String(
        name || ""
      ).trim();


    if (!clean) {

      return "Learner";

    }


    return clean.split(
      /\s+/
    )[0];

  }


  function setAvatar(
    selector,
    url,
    name
  ) {

    const element =
      $(selector);


    if (!element) {

      return;

    }


    if (url) {

      element.src =
        url;

      element.alt =
        `${name} avatar`;

      element.style.display =
        "block";

    } else {

      element.removeAttribute(
        "src"
      );

      element.alt =
        "";

      element.style.display =
        "none";

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


    element.textContent =
      new Intl.DateTimeFormat(
        undefined,
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        }
      ).format(
        now
      );

  }


  /* ============================================================
     STATS
     ============================================================ */

  function renderStats() {

    const completedLessons =
      state.progress.filter(
        item =>
          item.completed === true
      ).length;


    const totalLessons =
      state.lessons.length;


    const startedCourseIds =
      new Set();


    state.progress.forEach(
      progressItem => {

        const lesson =
          state.lessons.find(
            item =>
              item.id ===
              progressItem.lesson_id
          );


        if (!lesson) {

          return;

        }


        const module =
          state.modules.find(
            item =>
              item.id ===
              lesson.module_id
          );


        if (!module) {

          return;

        }


        startedCourseIds.add(
          module.course_id
        );

      }
    );


    const coursesStarted =
      startedCourseIds.size;


    let overallProgress =
      0;


    if (
      totalLessons > 0
    ) {

      overallProgress =
        Math.round(
          (
            completedLessons /
            totalLessons
          ) *
          100
        );

    }


    setText(
      "#coursesStarted",
      coursesStarted
    );


    setText(
      "#completedLessons",
      completedLessons
    );


    setText(
      "#overallProgress",
      `${overallProgress}%`
    );

  }


  /* ============================================================
     RENDER COURSES
     ============================================================ */

  function renderCourses() {

    const container =
      $(".course-grid");


    if (!container) {

      console.error(
        "SECORA: .course-grid not found in home.html."
      );

      return;

    }


    /*
     * Always rebuild from current state.
     */
    container.innerHTML =
      "";


    TRACK_ORDER.forEach(
      trackKey => {

        const courses =
          state.courses.filter(
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


    /*
     * This should almost never happen, but provide
     * a useful empty state instead of a blank page.
     */
    if (
      state.courses.length === 0
    ) {

      const empty =
        document.createElement(
          "div"
        );


      empty.className =
        "course-empty";


      empty.innerHTML = `
        <strong>
          No published courses found.
        </strong>

        <span>
          Check the SECORA courses table and published status.
        </span>
      `;


      container.appendChild(
        empty
      );

    }

  }


  /* ============================================================
     TRACK SECTION
     ============================================================ */

  function createTrackSection(
    trackKey,
    courses
  ) {

    const track =
      TRACKS[
        trackKey
      ];


    const wrapper =
      document.createElement(
        "section"
      );


    wrapper.className =
      `course-track course-track-${trackKey}`;


    wrapper.dataset.track =
      trackKey;


    const accessible =
      Boolean(
        state.accessByTrack[
          trackKey
        ]
      );


    const heading =
      document.createElement(
        "div"
      );


    heading.className =
      "track-heading";


    heading.innerHTML = `

      <div class="track-heading-copy">

        <span class="track-kicker">
          ${
            trackKey ===
            "fundamentals"
              ? "FOUNDATION"
              : trackKey ===
                "intermediate"
                ? "PROFESSIONAL"
                : "ADVANCED"
          }
        </span>


        <h2>
          ${escapeHTML(
            track.title
          )}
        </h2>


        <p>
          ${escapeHTML(
            track.description
          )}
        </p>

      </div>


      <div class="track-heading-meta">

        <span class="track-course-count">

          ${courses.length}

          ${
            courses.length === 1
              ? "course"
              : "courses"
          }

        </span>


        ${
          accessible

            ? `

              <span
                class="track-access-badge unlocked"
              >
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

                <span>
                  →
                </span>

              </button>

            `
        }

      </div>

    `;


    wrapper.appendChild(
      heading
    );


    const grid =
      document.createElement(
        "div"
      );


    grid.className =
      "track-course-grid";


    if (
      courses.length === 0
    ) {

      grid.innerHTML = `

        <article
          class="empty-track-card"
        >

          <span
            class="empty-track-label"
          >
            COMING SOON
          </span>


          <strong>
            More ${escapeHTML(
              track.title
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
      document.createElement(
        "article"
      );


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


    const level =
      course.level ||
      (
        normalizeTrack(
          course.track
        ) ===
        "advanced"
          ? "Advanced"
          : normalizeTrack(
              course.track
            ) ===
            "intermediate"
            ? "Intermediate"
            : "Beginner"
      );


    const courseNumber =
      normalizeTrack(
        course.track
      ) === "advanced"
        ? "03"
        : normalizeTrack(
            course.track
          ) === "intermediate"
          ? "02"
          : "01";


    card.innerHTML = `

      <div
        class="course-card-visual"
      >

        ${
          course.thumbnail_url

            ? `

              <img
                src="${escapeHTML(
                  course.thumbnail_url
                )}"
                alt=""
                loading="lazy"
              >

            `

            : `

              <div
                class="course-visual-placeholder"
              >

                <span>
                  ${courseNumber}
                </span>

              </div>

            `
        }


        <div
          class="course-card-overlay"
        ></div>


        ${
          isLocked

            ? `

              <span
                class="course-lock-badge"
              >
                LOCKED
              </span>

            `

            : `

              <span
                class="course-open-badge"
              >
                AVAILABLE
              </span>

            `
        }

      </div>


      <div
        class="course-card-body"
      >

        <div
          class="course-card-meta"
        >

          <span>
            ${escapeHTML(
              level
            )}
          </span>


          <span>
            ${courseLessons.length}
            ${
              courseLessons.length === 1
                ? "lesson"
                : "lessons"
            }
          </span>

        </div>


        <h3>
          ${escapeHTML(
            course.title
          )}
        </h3>


        <p>
          ${escapeHTML(
            course.description ||
            "Structured cybersecurity learning."
          )}
        </p>


        <div
          class="course-progress"
        >

          <div
            class="course-progress-top"
          >

            <span>
              ${
                courseLessons.length
                  ? `${courseProgress}% complete`
                  : "Curriculum available"
              }
            </span>


            <strong>
              ${courseProgress}%
            </strong>

          </div>


          <div
            class="course-progress-bar"
          >

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
                data-course-lock="${escapeHTML(
                  normalizeTrack(
                    course.track
                  )
                )}"
              >

                <span>
                  Unlock track
                </span>

                <i>
                  →
                </i>

              </button>

            `

            : `

              <a
                class="course-action"
                href="course.html?slug=${encodeURIComponent(
                  course.slug
                )}"
              >

                <span>
                  Open course
                </span>

                <i>
                  →
                </i>

              </a>

            `
        }

      </div>

    `;


    return card;

  }


  /* ============================================================
     COURSE MODULE / LESSON HELPERS
     ============================================================ */

  function getCourseModules(
    courseId
  ) {

    return state.modules
      .filter(
        module =>
          module.course_id ===
          courseId
      )
      .sort(
        (
          a,
          b
        ) =>
          Number(
            a.position || 0
          ) -
          Number(
            b.position || 0
          )
      );

  }


  function getCourseLessons(
    courseId
  ) {

    const modules =
      getCourseModules(
        courseId
      );


    const moduleIds =
      new Set(
        modules.map(
          module =>
            module.id
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
        (
          a,
          b
        ) =>
          Number(
            a.position || 0
          ) -
          Number(
            b.position || 0
          )
      );

  }


  function calculateCourseProgress(
    courseId
  ) {

    const lessons =
      getCourseLessons(
        courseId
      );


    if (
      lessons.length === 0
    ) {

      return 0;

    }


    const lessonIds =
      new Set(
        lessons.map(
          lesson =>
            lesson.id
        )
      );


    const completed =
      state.progress.filter(
        progressItem =>
          lessonIds.has(
            progressItem.lesson_id
          ) &&
          progressItem.completed ===
          true
      ).length;


    return Math.round(
      (
        completed /
        lessons.length
      ) *
      100
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
        state.accessByTrack[
          trackKey
        ]
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

        <i>
          ✓
        </i>

      `;

    }


    const input =
      $(".access-redeem-input", card);


    if (input) {

      input.disabled =
        true;

      input.value =
        "";

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
     REDEEM SYSTEM
     ============================================================ */

  function setupRedeemButtons() {

    $$(
      "[data-redeem-product]"
    )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            async () => {

              await handleSecoraRedeem(
                button.dataset.redeemProduct,
                button
              );

            }
          );

        }
      );


    [
      "#coreRedeemCode",
      "#blacklineRedeemCode"

    ].forEach(
      selector => {

        const input =
          $(selector);


        if (!input) {

          return;

        }


        input.addEventListener(
          "keydown",
          event => {

            if (
              event.key !==
              "Enter"
            ) {

              return;

            }


            event.preventDefault();


            const product =
              selector ===
              "#coreRedeemCode"
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
                .replace(
                  /\s+/g,
                  ""
                );

          }
        );

      }
    );

  }


  async function handleSecoraRedeem(
    product,
    button
  ) {

    const normalizedProduct =
      String(
        product || ""
      )
        .trim()
        .toLowerCase();


    if (
      normalizedProduct !==
        "core" &&
      normalizedProduct !==
        "blackline"
    ) {

      return;

    }


    const input =
      $(
        normalizedProduct ===
        "core"
          ? "#coreRedeemCode"
          : "#blacklineRedeemCode"
      );


    const feedback =
      $(
        normalizedProduct ===
        "core"
          ? "#coreRedeemFeedback"
          : "#blacklineRedeemFeedback"
      );


    if (
      !input ||
      !feedback
    ) {

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
      normalizedProduct ===
      "core"
        ? "SECORA-CORE-"
        : "SECORA-BL-";


    const normalizedCode =
      rawCode
        .toUpperCase()
        .replace(
          /\s+/g,
          ""
        );


    if (
      !normalizedCode.startsWith(
        expectedPrefix
      )
    ) {

      setFeedback(
        feedback,
        `This does not look like a SECORA ${
          normalizedProduct ===
          "core"
            ? "CORE"
            : "BLACKLINE"
        } code.`,
        "error"
      );


      input.focus();

      return;

    }


    const trackKey =
      normalizedProduct ===
      "core"
        ? "intermediate"
        : "advanced";


    if (
      state.accessByTrack[
        trackKey
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

      <i>
        ◌
      </i>

    `;


    setFeedback(
      feedback,
      "Securely verifying your code...",
      "loading"
    );


    try {

      const result =
        await SUPABASE.rpc(
          "redeem_secora_code",
          {
            redeem_code_input:
              normalizedCode
          }
        );


      if (
        result.error
      ) {

        throw result.error;

      }


      const data =
        Array.isArray(
          result.data
        )
          ? result.data[0]
          : result.data;


      if (
        !data ||
        data.success !==
          true
      ) {

        throw new Error(
          data?.message ||
          data?.error ||
          "The access code could not be redeemed."
        );

      }


      state.accessByTrack[
        trackKey
      ] = true;


      /*
       * Add local entitlement state.
       */
      if (
        data.entitlement_id
      ) {

        state.entitlements.push({

          id:
            data.entitlement_id,

          user_id:
            state.user.id,

          product_id:
            data.product_id ||
            null,

          status:
            "active",

          source:
            "redeem_code",

          payment_reference:
            null,

          granted_at:
            new Date().toISOString(),

          expires_at:
            null,

          metadata: {

            product_code:
              normalizedProduct

          }

        });

      }


      setFeedback(
        feedback,
        `SECORA ${
          normalizedProduct ===
          "core"
            ? "CORE"
            : "BLACKLINE"
        } access unlocked successfully.`,
        "success"
      );


      updateAccessProductUI(
        normalizedProduct
      );


      /*
       * Re-render cards so locked courses become
       * available immediately.
       */
      renderCourses();


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

      button.classList.remove(
        "is-loading"
      );


      if (
        state.accessByTrack[
          trackKey
        ]
      ) {

        button.disabled =
          true;


        button.innerHTML = `

          <span>
            Unlocked
          </span>

          <i>
            ✓
          </i>

        `;

      } else {

        button.disabled =
          false;


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


    return (
      text ||
      "Unable to redeem this access code."
    );

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
      `access-feedback ${
        type || ""
      }`;

  }


  /* ============================================================
     PURCHASE BUTTONS
     ============================================================ */

  function setupPurchaseButtons() {

    $$(
      "[data-purchase-product]"
    )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              handlePurchaseClick(
                button.dataset.purchaseProduct,
                button
              );

            }
          );

        }
      );

  }


  function handlePurchaseClick(
    product,
    button
  ) {

    const normalizedProduct =
      String(
        product || ""
      )
        .trim()
        .toLowerCase();


    const trackKey =
      normalizedProduct ===
      "core"
        ? "intermediate"
        : normalizedProduct ===
          "blackline"
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
     * Cashfree backend is intentionally not
     * fabricated in frontend code.
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
        ${escapeHTML(
          message
        )}
      </span>

    `;


    window.setTimeout(
      () => {

        const product =
          button.dataset
            .purchaseProduct;


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

    $$(
      "[data-track-access]"
    )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              focusAccessProduct(
                button.dataset
                  .trackAccess
              );

            }
          );

        }
      );


    $$(
      "[data-course-lock]"
    )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              focusAccessProduct(
                button.dataset
                  .courseLock
              );

            }
          );

        }
      );

  }


  function focusAccessProduct(
    track
  ) {

    const product =
      track ===
      "intermediate"
        ? "core"
        : track ===
          "advanced"
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

      behavior:
        "smooth",

      block:
        "center"

    });


    window.setTimeout(
      () => {

        const input =
          $(
            ".access-redeem-input",
            card
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


    document.addEventListener(
      "keydown",
      event => {

        if (
          (
            event.ctrlKey ||
            event.metaKey
          ) &&
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
          text.includes(
            query
          )
            ? ""
            : "none";

      }
    );


    $$(".course-track")
      .forEach(
        section => {

          const visibleCards =
            $$(".course-card", section)
              .filter(
                card =>
                  card.style.display !==
                  "none"
              );


          const emptyTrack =
            $(
              ".empty-track-card",
              section
            );


          if (emptyTrack) {

            section.style.display =
              query
                ? "none"
                : "";

            return;

          }


          section.style.display =
            visibleCards.length
              ? ""
              : "none";

        }
      );

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


    $$(".nav-item[href='#courses']")
      .forEach(
        link => {

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

                behavior:
                  "smooth",

                block:
                  "start"

              });

            }
          );

        }
      );

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
        "SECORA logout error:",
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
     DASHBOARD ERROR
     ============================================================ */

  function showDashboardError(
    message
  ) {

    const container =
      $(".course-grid");


    if (!container) {

      console.error(
        "SECORA dashboard error:",
        message
      );

      return;

    }


    container.innerHTML = `

      <div
        class="course-empty dashboard-error"
      >

        <strong>
          SECORA dashboard could not load.
        </strong>


        <span>
          ${escapeHTML(
            message
          )}
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
     AUTH STATE LISTENER
     ============================================================ */

  if (SUPABASE) {

    SUPABASE.auth.onAuthStateChange(
      (
        event,
        session
      ) => {

        if (
          event ===
          "SIGNED_OUT"
        ) {

          window.location.href =
            "index.html";

          return;

        }


        /*
         * If the session disappears while the user
         * is on the dashboard, return to login.
         */
        if (
          !session?.user
        ) {

          window.location.href =
            "index.html";

        }

      }
    );

  }


})();
