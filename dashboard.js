 /* =========================================================
   SECORA
   PREMIUM DYNAMIC DASHBOARD
   V0.5
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  initializeDashboard
);


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initializeDashboard() {

  try {

    const {
      data: {
        session
      },
      error: sessionError
    } = await secoraSupabase.auth.getSession();


    if (
      sessionError ||
      !session
    ) {

      window.location.replace("index.html");

      return;

    }


    const user =
      session.user;


    /* -------------------------------------------------------
       PROFILE
       ------------------------------------------------------- */

    const profile =
      await loadUserProfile(
        user.id
      );


    const displayName =
      getDisplayName(
        user,
        profile
      );


    /* -------------------------------------------------------
       USER INTERFACE
       ------------------------------------------------------- */

    setupUserInterface(
      user,
      profile,
      displayName
    );


    /* -------------------------------------------------------
       LOGOUT
       ------------------------------------------------------- */

    setupLogout();


    /* -------------------------------------------------------
       PLATFORM DATA
       ------------------------------------------------------- */

    const platform =
      await loadPlatformData(
        user.id
      );


    /* -------------------------------------------------------
       STATS
       ------------------------------------------------------- */

    renderDashboardStats(
      platform
    );


    /* -------------------------------------------------------
       COURSES
       ------------------------------------------------------- */

    renderCourses(
      platform
    );


    /* -------------------------------------------------------
       REMOVE OLD CONTINUE CARD
       ------------------------------------------------------- */

    removeContinueLearning();

  } catch (error) {

    console.error(
      "SECORA dashboard error:",
      error
    );

    showDashboardError();

  }

}


/* =========================================================
   PROFILE
   ========================================================= */

async function loadUserProfile(
  userId
) {

  const {
    data,
    error
  } =
    await secoraSupabase
      .from("profiles")
      .select(`
        id,
        display_name,
        avatar_url,
        bio
      `)
      .eq(
        "id",
        userId
      )
      .maybeSingle();


  if (error) {

    console.warn(
      "Profile could not be loaded:",
      error
    );

    return null;

  }


  return data || null;

}


/* =========================================================
   DISPLAY NAME
   ========================================================= */

function getDisplayName(
  user,
  profile
) {

  const metadata =
    user?.user_metadata || {};


  const identity =
    user?.identities?.[0]
      ?.identity_data || {};


  const name =
    profile?.display_name ||
    metadata.full_name ||
    metadata.name ||
    identity.full_name ||
    identity.name ||
    user?.email?.split("@")[0] ||
    "Learner";


  return cleanName(
    name
  );

}


/* =========================================================
   CLEAN NAME
   ========================================================= */

function cleanName(
  name
) {

  const value =
    String(
      name || "Learner"
    ).trim();


  if (!value) {

    return "Learner";

  }


  return value
    .split(/\s+/)
    .map(
      part =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");

}


/* =========================================================
   USER INTERFACE
   ========================================================= */

function setupUserInterface(
  user,
  profile,
  displayName
) {

  /* -------------------------------------------------------
     GREETING
     ------------------------------------------------------- */

  const welcomeName =
    document.getElementById(
      "welcomeName"
    );

  const userGreeting =
    document.getElementById(
      "userGreeting"
    );


  const hasLearningHistory =
    hasUserLearningHistory();


  const greeting =
    hasLearningHistory
      ? `Welcome back, ${displayName}.`
      : `Welcome, ${displayName}.`;


  if (welcomeName) {

    welcomeName.textContent =
      displayName;

  }


  if (userGreeting) {

    userGreeting.textContent =
      greeting;

  }


  /* -------------------------------------------------------
     SIDEBAR NAME
     ------------------------------------------------------- */

  const userName =
    document.getElementById(
      "userName"
    );


  if (userName) {

    userName.textContent =
      displayName;

  }


  /* -------------------------------------------------------
     TOPBAR NAME
     ------------------------------------------------------- */

  const topUserName =
    document.getElementById(
      "topUserName"
    );


  if (topUserName) {

    topUserName.textContent =
      displayName;

  }


  /* -------------------------------------------------------
     EMAIL
     ------------------------------------------------------- */

  const userEmail =
    document.getElementById(
      "userEmail"
    );


  if (userEmail) {

    userEmail.textContent =
      user?.email || "";

  }


  /* -------------------------------------------------------
     AVATAR
     ------------------------------------------------------- */

  setupAvatar(
    document.getElementById("userAvatar"),
    user,
    profile,
    displayName
  );


  setupAvatar(
    document.getElementById("topUserAvatar"),
    user,
    profile,
    displayName
  );


  /* -------------------------------------------------------
     DATE
     ------------------------------------------------------- */

  const dateElement =
    document.getElementById(
      "currentDate"
    );


  if (dateElement) {

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


/* =========================================================
   AVATAR
   ========================================================= */

function setupAvatar(
  avatar,
  user,
  profile,
  displayName
) {

  if (!avatar) {

    return;

  }


  const avatarUrl =
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    user?.identities?.[0]
      ?.identity_data
      ?.avatar_url ||
    user?.identities?.[0]
      ?.identity_data
      ?.picture ||
    "";


  /* -------------------------------------------------------
     IMAGE ELEMENT
     ------------------------------------------------------- */

  if (
    avatar.tagName === "IMG"
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
        displayName;

      avatar.style.display =
        "grid";

      avatar.textContent =
        getInitials(
          displayName
        );

    }

    return;

  }


  /* -------------------------------------------------------
     DIV AVATAR
     ------------------------------------------------------- */

  avatar.textContent =
    getInitials(
      displayName
    );


  if (avatarUrl) {

    avatar.style.backgroundImage =
      `url("${escapeCSSUrl(avatarUrl)}")`;

    avatar.style.backgroundSize =
      "cover";

    avatar.style.backgroundPosition =
      "center";

    avatar.style.color =
      "transparent";

  } else {

    avatar.style.backgroundImage =
      "";

    avatar.style.color =
      "";

  }

}


/* =========================================================
   INITIALS
   ========================================================= */

function getInitials(
  name
) {

  const parts =
    String(
      name || "Learner"
    )
      .trim()
      .split(/\s+/)
      .filter(Boolean);


  if (!parts.length) {

    return "L";

  }


  if (parts.length === 1) {

    return parts[0]
      .charAt(0)
      .toUpperCase();

  }


  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase();

}


/* =========================================================
   CSS URL SAFETY
   ========================================================= */

function escapeCSSUrl(
  value
) {

  return String(
    value || ""
  )
    .replaceAll(
      "\\",
      "\\\\"
    )
    .replaceAll(
      '"',
      '\\"'
    );

}


/* =========================================================
   LEARNING HISTORY
   ========================================================= */

function hasUserLearningHistory() {

  const key =
    "secora_dashboard_visited";


  const visited =
    sessionStorage.getItem(
      key
    );


  if (visited) {

    return true;

  }


  sessionStorage.setItem(
    key,
    "true"
  );


  return false;

}


/* =========================================================
   LOAD PLATFORM DATA
   ========================================================= */

async function loadPlatformData(
  userId
) {

  /* -------------------------------------------------------
     COURSES
     ------------------------------------------------------- */

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


  if (coursesError) {

    throw coursesError;

  }


  const safeCourses =
    courses || [];


  /* -------------------------------------------------------
     MODULES
     ------------------------------------------------------- */

  const courseIds =
    safeCourses.map(
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


    if (error) {

      throw error;

    }


    modules =
      data || [];

  }


  /* -------------------------------------------------------
     LESSONS
     ------------------------------------------------------- */

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


    if (error) {

      throw error;

    }


    lessons =
      data || [];

  }


  /* -------------------------------------------------------
     USER PROGRESS
     ------------------------------------------------------- */

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


    if (error) {

      throw error;

    }


    progress =
      data || [];

  }


  return {

    courses:
      safeCourses,

    modules,

    lessons,

    progress

  };

}


/* =========================================================
   BUILD COURSE DATA
   ========================================================= */

function buildCourseData(
  data
) {

  const {
    courses,
    modules,
    lessons,
    progress
  } = data;


  return courses.map(
    course => {

      const courseModules =
        modules.filter(
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
        lessons.filter(
          lesson =>
            moduleIds.includes(
              lesson.module_id
            )
        );


      const courseLessonIds =
        courseLessons.map(
          lesson =>
            lesson.id
        );


      const courseProgress =
        progress.filter(
          item =>
            courseLessonIds.includes(
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


/* =========================================================
   DASHBOARD STATISTICS
   ========================================================= */

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
        item.completed === true
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


  /* -------------------------------------------------------
     DIRECT IDS
     ------------------------------------------------------- */

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
    `${overallPercentage}%`
  );


  /* -------------------------------------------------------
     EXISTING HTML COMPATIBILITY
     ------------------------------------------------------- */

  const statValues =
    document.querySelectorAll(
      ".stat-card strong"
    );


  if (
    statValues.length >= 1
  ) {

    statValues[0].textContent =
      startedCourses;

  }


  if (
    statValues.length >= 2
  ) {

    statValues[1].textContent =
      completedLessons;

  }


  if (
    statValues.length >= 3
  ) {

    statValues[2].textContent =
      `${overallPercentage}%`;

  }


  /* -------------------------------------------------------
     FOURTH STAT
     Replace fake streak with real account state.
     ------------------------------------------------------- */

  if (
    statValues.length >= 4
  ) {

    statValues[3].textContent =
      "ACTIVE";


    const labels =
      document.querySelectorAll(
        ".stat-card .stat-label"
      );


    const descriptions =
      document.querySelectorAll(
        ".stat-card p"
      );


    if (labels.length >= 4) {

      labels[3].textContent =
        "STATUS";

    }


    if (
      descriptions.length >= 4
    ) {

      descriptions[3].textContent =
        "Learning account";

    }

  }

}


/* =========================================================
   COURSE CARDS
   ========================================================= */

function renderCourses(
  data
) {

  const grid =
    document.querySelector(
      ".course-grid"
    );


  if (!grid) {

    return;

  }


  const courseData =
    buildCourseData(
      data
    );


  if (
    !courseData.length
  ) {

    grid.innerHTML = `
      <div class="course-empty">

        <h3>
          No courses available
        </h3>

        <p>
          Published courses will appear here.
        </p>

      </div>
    `;

    return;

  }


  grid.innerHTML =
    courseData
      .map(
        course =>
          createCourseCard(
            course
          )
      )
      .join("");

}


/* =========================================================
   COURSE CARD
   ========================================================= */

function createCourseCard(
  course
) {

  const level =
    String(
      course.level ||
      "beginner"
    ).toUpperCase();


  const moduleCount =
    course.modules.length;


  const duration =
    course.lessons.reduce(
      (
        total,
        lesson
      ) =>
        total +
        (
          Number(
            lesson.duration_minutes
          ) || 0
        ),
      0
    );


  const hours =
    duration > 0
      ? Math.max(
          1,
          Math.round(
            duration / 60
          )
        )
      : null;


  const durationLabel =
    hours
      ? `~ ${hours} ${hours === 1 ? "hour" : "hours"}`
      : `${course.total} ${course.total === 1 ? "lesson" : "lessons"}`;


  return `

    <article
      class="course-card"
      data-course="${escapeHTML(course.slug)}"
    >

      <div class="course-number">
        ${String(
          course.modules?.[0]?.position ||
          1
        ).padStart(2, "0")}
      </div>


      <div class="course-card-top">

        <span class="course-level">
          ${escapeHTML(level)}
        </span>

        <span class="course-percentage">
          ${course.percentage}%
        </span>

      </div>


      <div class="course-meta">

        <span>
          ${moduleCount}
          MODULE${moduleCount === 1 ? "" : "S"}
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
          "Build your cybersecurity knowledge through structured lessons."
        )}
      </p>


      <div class="course-card-meta">

        <span>
          ${course.total}
          LESSON${course.total === 1 ? "" : "S"}
        </span>

        <span>
          ${course.completed}
          COMPLETED
        </span>

      </div>


      <div
        class="course-progress"
        aria-label="Course progress"
      >

        <div
          class="course-progress-bar"
          style="width:${course.percentage}%"
        ></div>

      </div>


      <div class="course-footer">

        <span>
          ${durationLabel}
        </span>

        <a
          href="course.html?slug=${encodeURIComponent(
            course.slug
          )}"
          class="course-explore"
          aria-label="Explore ${escapeHTML(course.title)}"
        >
          Explore →
        </a>

      </div>

    </article>

  `;

}


/* =========================================================
   REMOVE OLD CONTINUE LEARNING
   ========================================================= */

function removeContinueLearning() {

  document
    .querySelectorAll(
      ".continue-learning"
    )
    .forEach(
      element =>
        element.remove()
    );

}


/* =========================================================
   LOGOUT
   ========================================================= */

function setupLogout() {

  const logoutButtons =
    document.querySelectorAll(
      "#logoutBtn, .logout, .logout-btn, [data-action='logout']"
    );


  logoutButtons.forEach(
    button => {

      if (
        button.dataset.secoraLogoutBound ===
        "true"
      ) {

        return;

      }


      button.dataset.secoraLogoutBound =
        "true";


      button.addEventListener(
        "click",
        async event => {

          event.preventDefault();


          button.disabled =
            true;


          const originalText =
            button.textContent;


          button.textContent =
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


            button.disabled =
              false;


            button.textContent =
              originalText;


            return;

          }


          window.location.replace(
            "index.html"
          );

        }
      );

    }
  );

}


/* =========================================================
   TEXT HELPER
   ========================================================= */

function setText(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );


  if (element) {

    element.textContent =
      value;

  }

}


/* =========================================================
   ERROR
   ========================================================= */

function showDashboardError() {

  const grid =
    document.querySelector(
      ".course-grid"
    );


  if (!grid) {

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


/* =========================================================
   HTML SAFETY
   ========================================================= */

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
