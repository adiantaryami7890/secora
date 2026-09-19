 // =========================================================
// SECORA
// DYNAMIC DASHBOARD
// V0.4.2
//
// LEARNING TRACK ARCHITECTURE
// SECORA ORIGIN → SECORA CORE → SECORA BLACKLINE
//
// Existing authentication, courses, modules, lessons,
// progress and navigation are preserved.
// ========================================================


document.addEventListener(
  "DOMContentLoaded",
  async () => {


    // =====================================================
    // AUTHENTICATION
    // =====================================================

    const {
      data: {
        session
      },
      error: sessionError
    } =
      await secoraSupabase
        .auth
        .getSession();


    if (
      sessionError ||
      !session
    ) {

      window.location.replace(
        "index.html"
      );

      return;

    }


    const user =
      session.user;


    // =====================================================
    // USER INTERFACE
    // =====================================================

    setupUserInterface(
      user
    );


    // =====================================================
    // LOAD PLATFORM DATA
    // =====================================================

    try {

      const data =
        await loadPlatformData(
          user.id
        );


      // ---------------------------------------------------
      // STATISTICS
      // ---------------------------------------------------

      renderDashboardStats(
        data
      );


      // ---------------------------------------------------
      // CONTINUE LEARNING
      // ---------------------------------------------------

      renderContinueLearning(
        data
      );


      // ---------------------------------------------------
      // COURSES
      // ---------------------------------------------------

      renderCourses(
        data
      );


    } catch (error) {

      console.error(
        "Secora dashboard error:",
        error
      );


      showDashboardError();

    }


    // =====================================================
    // LOGOUT
    // =====================================================

    const logoutButton =
      document.getElementById(
        "logoutBtn"
      );


    if (
      logoutButton
    ) {

      logoutButton.addEventListener(
        "click",
        async () => {

          logoutButton.disabled =
            true;


          logoutButton.textContent =
            "Logging out...";


          const {
            error
          } =
            await secoraSupabase
              .auth
              .signOut();


          if (error) {

            console.error(
              "Logout error:",
              error
            );


            logoutButton.disabled =
              false;


            logoutButton.textContent =
              "Logout";


            return;

          }


          window.location.replace(
            "index.html"
          );

        }
      );

    }

  }
);



// =========================================================
// USER INTERFACE
// =========================================================


function setupUserInterface(
  user
) {

  const metadata =
    user.user_metadata ||
    {};


  const displayName =
    metadata.full_name ||
    metadata.name ||
    user.email?.split("@")[0] ||
    "Learner";


  // -------------------------------------------------------
  // MAIN GREETING
  // -------------------------------------------------------

  const greeting =
    document.getElementById(
      "userGreeting"
    );


  if (
    greeting
  ) {

    greeting.textContent =
      `Welcome back, ${displayName}.`;

  }


  // -------------------------------------------------------
  // SIDEBAR NAME
  // -------------------------------------------------------

  const userName =
    document.getElementById(
      "userName"
    );


  if (
    userName
  ) {

    userName.textContent =
      displayName;

  }


  // -------------------------------------------------------
  // TOPBAR NAME
  // -------------------------------------------------------

  const topUserName =
    document.getElementById(
      "topUserName"
    );


  if (
    topUserName
  ) {

    topUserName.textContent =
      displayName;

  }


  // -------------------------------------------------------
  // EMAIL
  // -------------------------------------------------------

  const userEmail =
    document.getElementById(
      "userEmail"
    );


  if (
    userEmail
  ) {

    userEmail.textContent =
      user.email ||
      "";

  }


  // -------------------------------------------------------
  // AVATAR
  // -------------------------------------------------------

  const avatarUrl =
    metadata.avatar_url ||
    metadata.picture ||
    "";


  const avatarElements =
    document.querySelectorAll(
      "#userAvatar, #topUserAvatar"
    );


  avatarElements.forEach(
    avatar => {

      if (
        avatar.tagName ===
        "IMG"
      ) {

        if (
          avatarUrl
        ) {

          avatar.src =
            avatarUrl;

          avatar.alt =
            displayName;

          avatar.style.display =
            "";

        } else {

          avatar.style.display =
            "grid";

          avatar.removeAttribute(
            "src"
          );

          avatar.alt =
            "";

        }

      }

    }
  );


  // -------------------------------------------------------
  // DATE
  // -------------------------------------------------------

  const dateElement =
    document.getElementById(
      "currentDate"
    );


  if (
    dateElement
  ) {

    dateElement.textContent =
      new Date().toLocaleDateString(
        "en-IN",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        }
      );

  }

}



// =========================================================
// LOAD PLATFORM DATA
// =========================================================


async function loadPlatformData(
  userId
) {


  // =======================================================
  // COURSES
  // =======================================================

  const {
    data: courses,
    error: coursesError
  } =
    await secoraSupabase
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


  if (
    coursesError
  ) {

    throw coursesError;

  }


  // =======================================================
  // OWNER / ACCESS STATE
  // =======================================================

  let profile = null;


  const {
    data: profileData,
    error: profileError
  } =
    await secoraSupabase
      .from("profiles")
      .select(`
        id,
        role
      `)
      .eq(
        "id",
        userId
      )
      .maybeSingle();


  if (
    profileError
  ) {

    console.warn(
      "Secora profile access check:",
      profileError
    );

  }


  profile =
    profileData ||
    null;


  // =======================================================
  // MODULES
  // =======================================================

  const courseIds =
    (
      courses ||
      []
    ).map(
      course =>
        course.id
    );


  let modules = [];


  if (
    courseIds.length
  ) {

    const {
      data,
      error
    } =
      await secoraSupabase
        .from("modules")
        .select(`
          id,
          course_id,
          title,
          description,
          position
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


    if (
      error
    ) {

      throw error;

    }


    modules =
      data ||
      [];

  }



  // =======================================================
  // LESSONS
  // =======================================================

  const moduleIds =
    modules.map(
      module =>
        module.id
    );


  let lessons = [];


  if (
    moduleIds.length
  ) {

    const {
      data,
      error
    } =
      await secoraSupabase
        .from("lessons")
        .select(`
          id,
          module_id,
          title,
          slug,
          position,
          duration_minutes,
          published
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


    if (
      error
    ) {

      throw error;

    }


    lessons =
      data ||
      [];

  }



  // =======================================================
  // USER PROGRESS
  // =======================================================

  const lessonIds =
    lessons.map(
      lesson =>
        lesson.id
    );


  let progress = [];


  if (
    lessonIds.length
  ) {

    const {
      data,
      error
    } =
      await secoraSupabase
        .from("lesson_progress")
        .select(`
          lesson_id,
          completed,
          completed_at,
          last_opened_at
        `)
        .eq(
          "user_id",
          userId
        )
        .in(
          "lesson_id",
          lessonIds
        );


    if (
      error
    ) {

      throw error;

    }


    progress =
      data ||
      [];

  }


  return {

    courses:
      courses ||
      [],

    modules,

    lessons,

    progress,

    profile,

    isOwner:
      String(
        profile?.role ||
        ""
      ).toLowerCase() ===
      "owner"

  };

}



// =========================================================
// BUILD COURSE DATA
// =========================================================


function buildCourseData(
  data
) {

  const {
    courses,
    modules,
    lessons,
    progress
  } =
    data;


  return courses.map(
    course => {


      // ---------------------------------------------------
      // COURSE MODULES
      // ---------------------------------------------------

      const courseModules =
        modules.filter(
          module =>
            module.course_id ===
            course.id
        );


      // ---------------------------------------------------
      // COURSE MODULE IDS
      // ---------------------------------------------------

      const moduleIds =
        courseModules.map(
          module =>
            module.id
        );


      // ---------------------------------------------------
      // COURSE LESSONS
      // ---------------------------------------------------

      const courseLessons =
        lessons.filter(
          lesson =>
            moduleIds.includes(
              lesson.module_id
            )
        );


      // ---------------------------------------------------
      // LESSON IDS
      // ---------------------------------------------------

      const courseLessonIds =
        courseLessons.map(
          lesson =>
            lesson.id
        );


      // ---------------------------------------------------
      // COURSE PROGRESS
      // ---------------------------------------------------

      const courseProgress =
        progress.filter(
          item =>
            courseLessonIds.includes(
              item.lesson_id
            )
        );


      // ---------------------------------------------------
      // COMPLETED
      // ---------------------------------------------------

      const completed =
        courseProgress.filter(
          item =>
            item.completed ===
            true
        ).length;


      // ---------------------------------------------------
      // TOTAL
      // ---------------------------------------------------

      const total =
        courseLessons.length;


      // ---------------------------------------------------
      // PERCENTAGE
      // ---------------------------------------------------

      const percentage =
        total === 0
          ? 0
          : Math.round(
              (
                completed /
                total
              ) * 100
            );


      // ---------------------------------------------------
      // TRACK
      // ---------------------------------------------------

      const track =
        normalizeTrack(
          course.track
        );


      const isOwner =
        data.isOwner ===
        true;


      const isOrigin =
        track ===
        "fundamentals";


      // ---------------------------------------------------
      // DASHBOARD ACCESS PRESENTATION
      // ---------------------------------------------------
      //
      // ORIGIN:
      // Open to authenticated users.
      //
      // CORE:
      // Visible but presented as locked.
      //
      // BLACKLINE:
      // Visible but presented as locked.
      //
      // OWNER:
      // Presentation lock bypassed.
      //
      // IMPORTANT:
      // This is NOT the real security boundary.
      // Supabase RLS is the real security boundary.
      // ---------------------------------------------------

      const hasDashboardAccess =
        isOwner ||
        isOrigin;


      return {

        ...course,

        track,

        modules:
          courseModules,

        lessons:
          courseLessons,

        completed,

        total,

        percentage,

        isOwner,

        hasDashboardAccess

      };

    }
  );

}



// =========================================================
// NORMALIZE TRACK
// =========================================================


function normalizeTrack(
  track
) {

  const value =
    String(
      track ||
      "fundamentals"
    )
      .trim()
      .toLowerCase();


  if (
    value ===
    "intermediate"
  ) {

    return "intermediate";

  }


  if (
    value ===
    "advanced"
  ) {

    return "advanced";

  }


  return "fundamentals";

}



// =========================================================
// DASHBOARD STATISTICS
// =========================================================


function renderDashboardStats(
  data
) {

  const courseData =
    buildCourseData(
      data
    );


  const totalLessons =
    data.lessons.length;


  const completedLessons =
    data.progress.filter(
      item =>
        item.completed ===
        true
    ).length;


  const startedCourses =
    courseData.filter(
      course =>
        course.lessons.some(
          lesson =>
            data.progress.some(
              item =>
                item.lesson_id ===
                lesson.id
            )
        )
    ).length;


  const overallPercentage =
    totalLessons === 0
      ? 0
      : Math.round(
          (
            completedLessons /
            totalLessons
          ) * 100
        );


  // -------------------------------------------------------
  // MODERN IDs
  // -------------------------------------------------------

  setText(
    "completedLessons",
    completedLessons
  );


  setText(
    "coursesStarted",
    startedCourses
  );


  setText(
    "overallProgress",
    `${overallPercentage}%`
  );


  // -------------------------------------------------------
  // LEGACY STAT CARD SUPPORT
  // -------------------------------------------------------

  const statValues =
    document.querySelectorAll(
      ".stat-card strong"
    );


  if (
    statValues.length >=
    1
  ) {

    statValues[0].textContent =
      startedCourses;

  }


  if (
    statValues.length >=
    2
  ) {

    statValues[1].textContent =
      completedLessons;

  }


  if (
    statValues.length >=
    3
  ) {

    statValues[2].textContent =
      `${overallPercentage}%`;

  }

}



// =========================================================
// CONTINUE LEARNING
// =========================================================


function renderContinueLearning(
  data
) {

  const {
    lessons,
    progress
  } =
    data;


  // -------------------------------------------------------
  // FIND OPENED LESSONS
  // -------------------------------------------------------

  const openedLessons =
    lessons
      .map(
        lesson => {

          const record =
            progress.find(
              item =>
                item.lesson_id ===
                lesson.id
            );


          if (
            !record?.last_opened_at
          ) {

            return null;

          }


          return {

            lesson,

            progress:
              record

          };

        }
      )
      .filter(
        Boolean
      );


  // -------------------------------------------------------
  // NOTHING OPENED
  // -------------------------------------------------------

  if (
    !openedLessons.length
  ) {

    renderEmptyContinueLearning();

    return;

  }


  // -------------------------------------------------------
  // SORT MOST RECENT
  // -------------------------------------------------------

  openedLessons.sort(
    (
      a,
      b
    ) =>
      new Date(
        b.progress.last_opened_at
      ) -
      new Date(
        a.progress.last_opened_at
      )
  );


  const current =
    openedLessons[0];


  const lesson =
    current.lesson;


  const module =
    data.modules.find(
      item =>
        item.id ===
        lesson.module_id
    );


  const course =
    data.courses.find(
      item =>
        item.id ===
        module?.course_id
    );


  if (
    !course
  ) {

    return;

  }


  // -------------------------------------------------------
  // EXISTING CONTINUE ELEMENTS
  // -------------------------------------------------------

  setText(
    "continueCourse",
    course.title
  );


  setText(
    "continueLesson",
    lesson.title
  );


  setText(
    "continueModule",
    module?.title ||
    ""
  );


  const continueButton =
    document.getElementById(
      "continueBtn"
    );


  if (
    continueButton
  ) {

    continueButton.href =
      `lesson.html?slug=${encodeURIComponent(
        lesson.slug
      )}`;

  }


  // -------------------------------------------------------
  // CREATE CONTINUE CARD IF NECESSARY
  // -------------------------------------------------------

  if (
    !document.querySelector(
      ".continue-learning"
    )
  ) {

    createContinueCard(
      course,
      module,
      lesson,
      current.progress
    );

  }

}



// =========================================================
// CREATE CONTINUE CARD
// =========================================================


function createContinueCard(
  course,
  module,
  lesson,
  progress
) {

  const courseGrid =
    document.querySelector(
      ".course-grid"
    );


  if (
    !courseGrid
  ) {

    return;

  }


  const card =
    document.createElement(
      "section"
    );


  card.className =
    "continue-learning";


  const status =
    progress.completed
      ? "Completed"
      : "In progress";


  card.innerHTML = `

    <div class="continue-content">

      <span class="continue-eyebrow">
        CONTINUE LEARNING
      </span>

      <h2>
        ${escapeHTML(
          lesson.title
        )}
      </h2>

      <p class="continue-course">
        ${escapeHTML(
          course.title
        )}
      </p>

      <p class="continue-module">
        ${escapeHTML(
          module?.title ||
          ""
        )}
      </p>

    </div>


    <div class="continue-action">

      <span class="continue-status">
        ${status}
      </span>

      <a
        href="lesson.html?slug=${encodeURIComponent(
          lesson.slug
        )}"
        class="continue-button"
      >
        Continue →
      </a>

    </div>

  `;


  courseGrid.parentNode.insertBefore(
    card,
    courseGrid
  );

}



// =========================================================
// EMPTY CONTINUE STATE
// =========================================================


function renderEmptyContinueLearning() {

  const existing =
    document.querySelector(
      ".continue-learning"
    );


  if (
    existing
  ) {

    existing.remove();

  }

}



// =========================================================
// RENDER COURSES
// =========================================================
//
// The course database controls the cards.
// Nothing is hard-coded.
//
// Courses are grouped into:
//
// SECORA ORIGIN
// SECORA CORE
// SECORA BLACKLINE
// =========================================================


function renderCourses(
  data
) {

  const grid =
    document.querySelector(
      ".course-grid"
    );


  if (
    !grid
  ) {

    return;

  }


  const courseData =
    buildCourseData(
      data
    );


  grid.classList.add(
    "course-track-layout"
  );


  const grouped = {

    fundamentals:
      [],

    intermediate:
      [],

    advanced:
      []

  };


  courseData.forEach(
    course => {

      const track =
        normalizeTrack(
          course.track
        );


      grouped[
        track
      ].push(
        course
      );

    }
  );


  // -------------------------------------------------------
  // SORT TRACK COURSES
  // -------------------------------------------------------

  Object.keys(
    grouped
  ).forEach(
    track => {

      grouped[
        track
      ].sort(
        (
          a,
          b
        ) => {

          return (
            new Date(
              a.created_at ||
              0
            ) -
            new Date(
              b.created_at ||
              0
            )
          );

        }
      );

    }
  );


  // -------------------------------------------------------
  // RENDER ALL TRACKS
  // -------------------------------------------------------

  grid.innerHTML = `

    ${createTrackSection(
      "fundamentals",
      grouped.fundamentals
    )}

    ${createTrackSection(
      "intermediate",
      grouped.intermediate
    )}

    ${createTrackSection(
      "advanced",
      grouped.advanced
    )}

  `;

}



// =========================================================
// CREATE TRACK SECTION
// =========================================================
//
// IMPORTANT DESIGN RULE:
//
// CORE and BLACKLINE get ONE unlock control beside the
// section heading.
//
// Individual cards do NOT receive an unlock/access tab.
// They contain only a small lock mark.
// =========================================================


function createTrackSection(
  track,
  courses
) {

  const config =
    getTrackConfig(
      track
    );


  const courseMarkup =
    courses.length
      ? courses
          .map(
            course =>
              createCourseCard(
                course
              )
          )
          .join("")
      : createEmptyTrack();


  const showUnlock =
    track !==
    "fundamentals" &&
    courses.some(
      course =>
        course.hasDashboardAccess !==
        true
    );


  return `

    <section
      class="course-track course-track-${track}"
      data-track="${track}"
    >

      <header class="course-track-header">

        <div class="course-track-heading">

          <span class="course-track-index">
            ${config.index}
          </span>

          <div>

            <span class="course-track-eyebrow">
              ${config.eyebrow}
            </span>

            <h2>
              ${config.title}
            </h2>

            <p>
              ${config.description}
            </p>

          </div>

        </div>


        <div class="course-track-actions">

          ${
            showUnlock
              ? `
                <button
                  type="button"
                  class="track-unlock-button"
                  data-unlock-track="${escapeHTML(
                    track
                  )}"
                >

                  <span class="track-unlock-label">
                    UNLOCK ${config.eyebrow}
                  </span>

                  <span class="track-unlock-arrow">
                    →
                  </span>

                </button>
              `
              : ""
          }


          <span class="course-track-count">

            ${courses.length}

            ${courses.length === 1
              ? "COURSE"
              : "COURSES"}

          </span>

        </div>

      </header>


      <div class="course-track-grid">

        ${courseMarkup}

      </div>

    </section>

  `;

}



// =========================================================
// TRACK CONFIGURATION
// =========================================================


function getTrackConfig(
  track
) {

  const configurations = {

    fundamentals: {

      index:
        "01",

      eyebrow:
        "ORIGIN",

      title:
        "SECORA ORIGIN",

      description:
        "Understand the Digital Battlefield"

    },


    intermediate: {

      index:
        "02",

      eyebrow:
        "CORE",

      title:
        "SECORA CORE",

      description:
        "Learn How Systems Are Attacked and Defended"

    },


    advanced: {

      index:
        "03",

      eyebrow:
        "BLACKLINE",

      title:
        "SECORA BLACKLINE",

      description:
        "Think Like the Adversary. Defend Like the Expert."

    }

  };


  return (
    configurations[
      track
    ] ||
    configurations.fundamentals
  );

}



// =========================================================
// EMPTY TRACK
// =========================================================


function createEmptyTrack() {

  return `

    <div class="course-track-empty">

      <span class="course-track-empty-index">
        —
      </span>

      <div>

        <strong>
          Courses coming soon
        </strong>

        <p>
          New learning material is being prepared
          for this learning stage.
        </p>

      </div>

    </div>

  `;

}



// =========================================================
// CREATE COURSE CARD
// =========================================================
//
// PREMIUM ACCESS PRESENTATION
//
// ORIGIN:
// Open.
//
// CORE:
// Visible, but locked for normal users.
//
// BLACKLINE:
// Visible, but locked for normal users.
//
// Individual cards contain ONLY a small lock mark.
// The unlock action lives at the track/header level.
// =========================================================


function createCourseCard(
  course
) {

  const level =
    String(
      course.level ||
      "beginner"
    ).toUpperCase();


  const track =
    normalizeTrack(
      course.track
    );


  const trackLabel =
    track ===
    "fundamentals"
      ? "ORIGIN"
      : track ===
        "intermediate"
        ? "CORE"
        : "BLACKLINE";


  const isLocked =
    course.hasDashboardAccess !==
    true;


  return `

    <article
      class="course-card${isLocked
        ? " course-card-locked"
        : " course-card-unlocked"}"
      data-course="${escapeHTML(
        course.slug
      )}"
      data-track="${escapeHTML(
        track
      )}"
      data-access="${isLocked
        ? "locked"
        : "granted"}"
    >

      ${
        isLocked
          ? `
            <span
              class="course-lock-mark"
              aria-label="${escapeHTML(
                trackLabel
              )} access required"
              title="${escapeHTML(
                trackLabel
              )} access required"
            >

              <span
                class="access-lock-icon"
                aria-hidden="true"
              ></span>

            </span>
          `
          : ""
      }


      <div class="course-card-top">

        <span class="course-level">
          ${escapeHTML(
            level
          )}
        </span>


        ${
          isLocked
            ? `
              <span
                class="course-restricted-dot"
                aria-hidden="true"
              ></span>
            `
            : `
              <span class="course-percentage">
                ${course.percentage}%
              </span>
            `
        }

      </div>


      <span class="course-track-label">
        ${trackLabel}
      </span>


      <h3>
        ${escapeHTML(
          course.title
        )}
      </h3>


      <p>
        ${escapeHTML(
          course.description ||
          ""
        )}
      </p>


      ${
        isLocked
          ? `
            <div
              class="course-card-locked-space"
              aria-hidden="true"
            >

              <span></span>

              <span></span>

            </div>
          `
          : `
            <div class="course-card-meta">

              <span>
                ${course.total}

                LESSON${course.total === 1
                  ? ""
                  : "S"}
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
          `
      }


      <div class="course-card-footer">

        <span class="course-card-time">

          ${
            isLocked
              ? "Premium learning path"
              : getCourseDuration(
                  course
                )
          }

        </span>


        ${
          isLocked
            ? `
              <span class="course-locked-caption">
                ACCESS RESTRICTED
              </span>
            `
            : `
              <a
                href="course.html?slug=${encodeURIComponent(
                  course.slug
                )}"
                class="course-explore"
              >
                Explore →
              </a>
            `
        }

      </div>


    </article>

  `;

}



// =========================================================
// COURSE CARD CLICK SUPPORT
// =========================================================


document.addEventListener(
  "click",
  event => {

    const card =
      event.target.closest(
        ".course-card"
      );


    if (
      !card ||
      card.classList.contains(
        "course-card-locked"
      )
    ) {

      return;

    }


    const link =
      card.querySelector(
        ".course-explore"
      );


    if (
      !link ||
      event.target.closest(
        "a"
      )
    ) {

      return;

    }


    window.location.href =
      link.href;

  }
);



// =========================================================
// TRACK-LEVEL UNLOCK REQUEST
// =========================================================
//
// One compact control per premium track.
//
// Cashfree / redeem-code routing will be connected here
// when the entitlement system is finalized.
// =========================================================


document.addEventListener(
  "click",
  event => {

    const unlockButton =
      event.target.closest(
        ".track-unlock-button"
      );


    if (
      !unlockButton
    ) {

      return;

    }


    const track =
      unlockButton.dataset.unlockTrack ||
      "intermediate";


    console.info(
      `SECORA ${track.toUpperCase()} unlock requested.`
    );


    unlockButton.classList.add(
      "is-requested"
    );


    window.setTimeout(
      () => {

        unlockButton.classList.remove(
          "is-requested"
        );

      },
      650
    );

  }
);



// =========================================================
// COURSE DURATION
// =========================================================


function getCourseDuration(
  course
) {

  if (
    !course.total
  ) {

    return "No lessons";

  }


  const totalMinutes =
    course.lessons.reduce(
      (
        total,
        lesson
      ) => {

        return (
          total +
          (
            Number(
              lesson.duration_minutes
            ) ||
            0
          )
        );

      },
      0
    );


  if (
    !totalMinutes
  ) {

    return `${course.total} lessons`;

  }


  const hours =
    totalMinutes /
    60;


  if (
    hours <
    1
  ) {

    return `~ ${Math.round(
      totalMinutes
    )} min`;

  }


  return `~ ${formatHours(
    hours
  )}`;

}



// =========================================================
// FORMAT HOURS
// =========================================================


function formatHours(
  hours
) {

  if (
    hours <
    1
  ) {

    return `${Math.round(
      hours * 60
    )} min`;

  }


  if (
    Number.isInteger(
      hours
    )
  ) {

    return `${hours} hours`;

  }


  return `${hours.toFixed(
    1
  )} hours`;

}



// =========================================================
// TEXT HELPER
// =========================================================


function setText(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );


  if (
    element
  ) {

    element.textContent =
      value;

  }

}



// =========================================================
// DASHBOARD ERROR
// =========================================================


function showDashboardError() {

  const grid =
    document.querySelector(
      ".course-grid"
    );


  if (
    !grid
  ) {

    return;

  }


  grid.innerHTML = `

    <div class="course-empty">

      <h3>
        Unable to load your dashboard
      </h3>

      <p>
        Please refresh the page and try again.
      </p>

    </div>

  `;

}



// =========================================================
// HTML SAFETY
// =========================================================


function escapeHTML(
  value
) {

  return String(
    value ?? ""
  )

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}
/* =========================================================
   SECORA ACCESS CENTER
   CORE / BLACKLINE Redeem + Purchase UI
   Paste at the VERY BOTTOM of dashboard.js
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  setupRedeemButtons();
});

/* =========================================================
   REDEEM BUTTON SETUP
   ========================================================= */

function setupRedeemButtons() {
  const redeemButtons = document.querySelectorAll(
    "[data-redeem-product]"
  );

  if (!redeemButtons.length) return;

  redeemButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const product = button.dataset.redeemProduct;
      await handleSecoraRedeem(product, button);
    });
  });

  /* Allow ENTER inside redeem inputs */
  const redeemInputs = document.querySelectorAll(
    ".secora-redeem-input"
  );

  redeemInputs.forEach((input) => {
    input.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter") return;

      event.preventDefault();

      const product = input.id === "coreRedeemCode"
        ? "core"
        : input.id === "blacklineRedeemCode"
          ? "blackline"
          : null;

      if (!product) return;

      const button = document.querySelector(
        `[data-redeem-product="${product}"]`
      );

      if (button) {
        await handleSecoraRedeem(product, button);
      }
    });

    /* Automatically normalize code formatting */
    input.addEventListener("input", () => {
      input.value = input.value
        .toUpperCase()
        .replace(/\s+/g, "");
    });
  });

  setupPurchaseButtons();
}

/* =========================================================
   REDEEM HANDLER
   ========================================================= */

async function handleSecoraRedeem(product, button) {
  const input =
    product === "core"
      ? document.getElementById("coreRedeemCode")
      : document.getElementById("blacklineRedeemCode");

  const feedback =
    product === "core"
      ? document.getElementById("coreRedeemFeedback")
      : document.getElementById("blacklineRedeemFeedback");

  if (!input || !feedback || !button) return;

  const rawCode = input.value.trim();
  const normalizedCode = rawCode.toLowerCase();

  clearRedeemFeedback(feedback);

  /* ---------------------------------------------------------
     Frontend validation
     --------------------------------------------------------- */

  if (!rawCode) {
    showRedeemFeedback(
      feedback,
      "Enter your access code.",
      "error"
    );

    input.focus();
    return;
  }

  if (product === "core") {
    if (!rawCode.startsWith("SECORA-CORE-")) {
      showRedeemFeedback(
        feedback,
        "This code does not match the SECORA CORE format.",
        "error"
      );

      input.focus();
      return;
    }
  }

  if (product === "blackline") {
    if (!rawCode.startsWith("SECORA-BL-")) {
      showRedeemFeedback(
        feedback,
        "This code does not match the SECORA BLACKLINE format.",
        "error"
      );

      input.focus();
      return;
    }
  }

  /* ---------------------------------------------------------
     Loading state
     --------------------------------------------------------- */

  setRedeemLoading(button, true);

  showRedeemFeedback(
    feedback,
    "Verifying access code…",
    "info"
  );

  try {
    if (
      typeof secoraSupabase === "undefined" ||
      !secoraSupabase
    ) {
      throw new Error(
        "SECORA authentication service is unavailable."
      );
    }

    /* -------------------------------------------------------
       Secure server-side redemption RPC

       The database function is the authority.
       Frontend validation above is UX only.
       ------------------------------------------------------- */

    const { data, error } =
      await secoraSupabase.rpc(
        "redeem_secora_code",
        {
          redeem_code_input: normalizedCode
        }
      );

    if (error) {
      throw error;
    }

    /*
      RPC returns JSONB.
      Expected success structure includes:
      {
        success: true,
        product_code: "core" / "blackline",
        ...
      }
    */

    const result =
      Array.isArray(data)
        ? data[0]
        : data;

    if (!result || result.success !== true) {
      throw new Error(
        result?.message ||
        "The access code could not be redeemed."
      );
    }

    /* -------------------------------------------------------
       Verify returned product matches selected card
       ------------------------------------------------------- */

    const returnedProduct =
      String(
        result.product_code ||
        result.product ||
        ""
      ).toLowerCase();

    if (
      returnedProduct &&
      returnedProduct !== product
    ) {
      throw new Error(
        "This code belongs to a different SECORA product."
      );
    }

    /* -------------------------------------------------------
       Success
       ------------------------------------------------------- */

    showRedeemFeedback(
      feedback,
      product === "core"
        ? "SECORA CORE unlocked successfully."
        : "SECORA BLACKLINE unlocked successfully.",
      "success"
    );

    input.value = "";

    markAccessCardUnlocked(product);

    /*
      Give the database/UI a moment to finish before refreshing.
      The refresh ensures course visibility reflects the new
      entitlement immediately.
    */

    setTimeout(() => {
      window.location.reload();
    }, 1200);

  } catch (error) {
    console.error(
      "SECORA redemption error:",
      error
    );

    const message =
      translateRedeemError(error);

    showRedeemFeedback(
      feedback,
      message,
      "error"
    );

  } finally {
    setRedeemLoading(button, false);
  }
}

/* =========================================================
   ERROR TRANSLATION
   ========================================================= */

function translateRedeemError(error) {
  const rawMessage =
    String(
      error?.message ||
      error?.details ||
      error?.hint ||
      "Unable to redeem this code."
    );

  const message =
    rawMessage.toLowerCase();

  if (
    message.includes("not authenticated") ||
    message.includes("auth.uid") ||
    message.includes("authentication")
  ) {
    return "Please sign in before redeeming an access code.";
  }

  if (
    message.includes("invalid access code") ||
    message.includes("code not found") ||
    message.includes("does not exist")
  ) {
    return "This access code is invalid.";
  }

  if (
    message.includes("inactive") ||
    message.includes("not active")
  ) {
    return "This access code is no longer active.";
  }

  if (
    message.includes("expired")
  ) {
    return "This access code has expired.";
  }

  if (
    message.includes("redemption limit") ||
    message.includes("maximum") ||
    message.includes("fully redeemed") ||
    message.includes("already been redeemed")
  ) {
    return "This access code has already been redeemed.";
  }

  if (
    message.includes("already redeemed")
  ) {
    return "You have already redeemed this access code.";
  }

  if (
    message.includes("already have") ||
    message.includes("entitlement")
  ) {
    return "You already have access to this SECORA product.";
  }

  if (
    message.includes("permission denied") ||
    message.includes("row-level security")
  ) {
    return "Access verification was blocked. Please sign in again and try once more.";
  }

  return rawMessage;
}

/* =========================================================
   FEEDBACK UI
   ========================================================= */

function showRedeemFeedback(
  element,
  message,
  type = "info"
) {
  if (!element) return;

  element.textContent = message;

  element.classList.remove(
    "success",
    "error",
    "info"
  );

  element.classList.add(type);
}

function clearRedeemFeedback(element) {
  if (!element) return;

  element.textContent = "";

  element.classList.remove(
    "success",
    "error",
    "info"
  );
}

/* =========================================================
   LOADING STATE
   ========================================================= */

function setRedeemLoading(button, loading) {
  if (!button) return;

  if (loading) {
    button.disabled = true;
    button.classList.add("is-loading");
    button.dataset.originalText =
      button.textContent;
  } else {
    button.disabled = false;
    button.classList.remove("is-loading");

    if (button.dataset.originalText) {
      button.textContent =
        button.dataset.originalText;

      delete button.dataset.originalText;
    }
  }
}

/* =========================================================
   UNLOCKED CARD STATE
   ========================================================= */

function markAccessCardUnlocked(product) {
  const card = document.querySelector(
    `[data-access-product="${product}"]`
  );

  if (!card) return;

  card.classList.add("is-unlocked");

  const status =
    card.querySelector(
      ".secora-access-status"
    );

  if (status) {
    status.textContent =
      "ACCESS UNLOCKED";
  }
}

/* =========================================================
   PURCHASE BUTTONS
   =========================================================

   Cashfree is intentionally NOT connected here yet.

   These buttons remain visual placeholders until the secure
   server-side Cashfree integration is implemented.

   Never place Cashfree secret credentials in this file.
   ========================================================= */

function setupPurchaseButtons() {
  const purchaseButtons =
    document.querySelectorAll(
      "[data-purchase-product]"
    );

  purchaseButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const product =
        button.dataset.purchaseProduct;

      /*
        Payment integration will be added later.

        Future flow:

        User
          ↓
        Purchase button
          ↓
        SECORA backend
          ↓
        Cashfree order creation
          ↓
        Cashfree checkout
          ↓
        Cashfree webhook
          ↓
        Payment verification
          ↓
        Supabase entitlement
          ↓
        Product unlocked
      */

      showPurchaseComingSoon(product);
    });
  });
}

function showPurchaseComingSoon(product) {
  const card = document.querySelector(
    `[data-access-product="${product}"]`
  );

  if (!card) return;

  const feedback =
    card.querySelector(
      ".secora-redeem-feedback"
    );

  if (!feedback) return;

  const productName =
    product === "core"
      ? "SECORA CORE"
      : "SECORA BLACKLINE";

  showRedeemFeedback(
    feedback,
    `${productName} purchases will be available soon. Use an access code if you already have one.`,
    "info"
  );
}

/* =========================================================
   OPTIONAL ACCESS STATE CHECK
   =========================================================

   This helper can be used later when the dashboard starts
   loading entitlement data directly.

   It does NOT replace database/RLS security.
   ========================================================= */

async function setAccessProductState(
  product,
  unlocked
) {
  const card = document.querySelector(
    `[data-access-product="${product}"]`
  );

  if (!card) return;

  if (unlocked) {
    markAccessCardUnlocked(product);
  } else {
    card.classList.remove("is-unlocked");

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
