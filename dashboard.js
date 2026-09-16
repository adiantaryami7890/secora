 // =========================================================
// SECORA V0.3.7
// DYNAMIC DASHBOARD
// CONTINUE LEARNING + REAL STATISTICS
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {

  // -------------------------------------------------------
  // AUTH
  // -------------------------------------------------------

  const {
    data: { session },
    error: sessionError
  } = await secoraSupabase.auth.getSession();

  if (sessionError || !session) {
    window.location.replace("index.html");
    return;
  }

  const user = session.user;

  // -------------------------------------------------------
  // BASIC USER INFORMATION
  // -------------------------------------------------------

  setupUserInterface(user);
  setupProfileMenu(user);

  // -------------------------------------------------------
  // LOAD PLATFORM DATA
  // -------------------------------------------------------

  try {

    const data = await loadPlatformData(user.id);

    renderDashboardStats(data);

    renderContinueLearning(data);

    renderCourses(data);

  } catch (error) {

    console.error(
      "Dashboard error:",
      error
    );

    showDashboardError();

  }

  // -------------------------------------------------------
  // LOGOUT
  // -------------------------------------------------------

  const logoutButton =
    document.getElementById("logoutBtn");

  if (logoutButton) {

    logoutButton.addEventListener(
      "click",
      async () => {

        logoutButton.disabled = true;

        logoutButton.textContent =
          "Logging out...";

        const {
          error
        } =
          await secoraSupabase.auth.signOut();

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

});


// =========================================================
// USER INTERFACE
// =========================================================

function setupUserInterface(
  user
) {

  const metadata =
    user.user_metadata || {};

  const displayName =
    metadata.full_name ||
    metadata.name ||
    user.email?.split("@")[0] ||
    "Learner";

  // Greeting

  const greeting =
    document.getElementById(
      "userGreeting"
    );

  if (greeting) {

    greeting.textContent =
      `Welcome back, ${displayName}`;

  }

  // Name

  const userName =
    document.getElementById(
      "userName"
    );

  if (userName) {

    userName.textContent =
      displayName;

  }

  // Email

  const userEmail =
    document.getElementById(
      "userEmail"
    );

  if (userEmail) {

    userEmail.textContent =
      user.email || "";

  }

  // Avatar

  const avatar =
    document.getElementById(
      "userAvatar"
    );

  if (avatar) {

    const avatarUrl =
      metadata.avatar_url ||
      metadata.picture;

    if (avatarUrl) {

      avatar.src =
        avatarUrl;

      avatar.alt =
        displayName;

    } else {

      avatar.style.display =
        "none";

    }

  }

  // Date

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


// =========================================================
// LOAD ALL PLATFORM DATA
// =========================================================

async function loadPlatformData(
  userId
) {

  // -------------------------------------------------------
  // COURSES
  // -------------------------------------------------------

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

  // -------------------------------------------------------
  // MODULES
  // -------------------------------------------------------

  const courseIds =
    (courses || []).map(
      course => course.id
    );

  let modules = [];

  if (courseIds.length) {

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

  // -------------------------------------------------------
  // LESSONS
  // -------------------------------------------------------

  const moduleIds =
    modules.map(
      module => module.id
    );

  let lessons = [];

  if (moduleIds.length) {

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

  // -------------------------------------------------------
  // USER PROGRESS
  // -------------------------------------------------------

  const lessonIds =
    lessons.map(
      lesson => lesson.id
    );

  let progress = [];

  if (lessonIds.length) {

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

    courses,
    modules,
    lessons,
    progress

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
  } = data;

  return courses.map(
    course => {

      const courseModules =
        modules.filter(
          module =>
            module.course_id === course.id
        );

      const moduleIds =
        courseModules.map(
          module => module.id
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
              (completed / total) * 100
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

  // -------------------------------------------------------
  // Try IDs first
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
  // Compatibility with existing dashboard
  // -------------------------------------------------------

  const statValues =
    document.querySelectorAll(
      ".stat-card strong"
    );

  if (statValues.length >= 1) {

    statValues[0].textContent =
      completedLessons;

  }

  if (statValues.length >= 2) {

    statValues[1].textContent =
      startedCourses;

  }

  if (statValues.length >= 3) {

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
  } = data;

  // -------------------------------------------------------
  // Find lessons that were opened
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

          if (!record?.last_opened_at) {

            return null;

          }

          return {

            lesson,

            progress:
              record

          };

        }
      )
      .filter(Boolean);

  // Nothing has been opened yet

  if (!openedLessons.length) {

    renderEmptyContinueLearning();

    return;

  }

  // -------------------------------------------------------
  // Most recently opened lesson
  // -------------------------------------------------------

  openedLessons.sort(
    (a, b) =>
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

  if (!course) {

    return;

  }

  // -------------------------------------------------------
  // Existing continue elements
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
    module?.title || ""
  );

  const continueButton =
    document.getElementById(
      "continueBtn"
    );

  if (continueButton) {

    continueButton.href =
      `lesson.html?slug=${encodeURIComponent(
        lesson.slug
      )}`;

  }

  // -------------------------------------------------------
  // If old dashboard doesn't have a continue card,
  // create one automatically.
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

  if (!courseGrid) {

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
          module?.title || ""
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

  if (existing) {

    existing.remove();

  }

}


// =========================================================
// RENDER COURSE CARDS
// =========================================================

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

  if (!courseData.length) {

    grid.innerHTML = `

      <div class="course-empty">

        <h3>
          No courses available
        </h3>

        <p>
          Courses will appear here
          when they are published.
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


// =========================================================
// COURSE CARD
// =========================================================

function createCourseCard(
  course
) {

  const level =
    String(
      course.level || "beginner"
    ).toUpperCase();

  return `

    <article class="course-card">

      <div class="course-card-top">

        <span class="course-level">
          ${escapeHTML(level)}
        </span>

        <span class="course-percentage">
          ${course.percentage}%
        </span>

      </div>

      <h3>
        ${escapeHTML(
          course.title
        )}
      </h3>

      <p>
        ${escapeHTML(
          course.description || ""
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

      <div class="course-progress">

        <div
          class="course-progress-bar"
          style="width:${course.percentage}%"
        ></div>

      </div>

      <a
        href="course.html?slug=${encodeURIComponent(
          course.slug
        )}"
        class="course-explore"
      >
        Explore →
      </a>

    </article>

  `;

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

  if (element) {

    element.textContent =
      value;

  }

}


// =========================================================
// ERROR
// =========================================================

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


// =========================================================
// HTML SAFETY
// =========================================================

function escapeHTML(
  value
) {

  return String(value)

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


// =========================================================
// PROFILE / HEADER AUTH UI
// =========================================================

function setupProfileMenu(user) {

  const metadata =
    user?.user_metadata || {};

  const displayName =
    metadata.full_name ||
    metadata.name ||
    user?.email?.split("@")[0] ||
    "Learner";

  const avatarUrl =
    metadata.avatar_url ||
    metadata.picture ||
    "";

  // -------------------------------------------------------
  // FIND EXISTING PROFILE TRIGGER
  // -------------------------------------------------------

  const trigger =
    document.getElementById(
      "profileBtn"
    ) ||
    document.getElementById(
      "profileButton"
    ) ||
    document.getElementById(
      "profileTrigger"
    ) ||
    document.querySelector(
      "[data-profile-trigger], .profile-trigger, .profile-button, .user-menu-trigger, .header-profile"
    );

  // -------------------------------------------------------
  // UPDATE PROFILE NAMES
  // -------------------------------------------------------

  const nameElements = [

    document.getElementById(
      "profileName"
    ),

    document.getElementById(
      "headerUserName"
    ),

    document.getElementById(
      "userName"
    )

  ].filter(Boolean);

  nameElements.forEach(
    element => {

      element.textContent =
        displayName;

    }
  );

  // -------------------------------------------------------
  // REMOVE HEADER LOADING STATE
  // -------------------------------------------------------

  document
    .querySelectorAll("body *")
    .forEach(
      element => {

        if (
          element.children.length !== 0
        ) {
          return;
        }

        const value =
          element.textContent.trim();

        if (
          value === "Loading..." ||
          value === "Loading…"
        ) {

          const parentText =
            element.parentElement
              ?.textContent
              ?.trim() || "";

          if (
            parentText.length < 100 ||
            element.id === "profileLoading" ||
            element.classList.contains(
              "profile-loading"
            )
          ) {

            element.textContent =
              displayName;

          }

        }

      }
    );

  // -------------------------------------------------------
  // EXISTING PROFILE TRIGGER
  // -------------------------------------------------------

  if (trigger) {

    trigger.style.cursor =
      "pointer";

    trigger.setAttribute(
      "role",
      "button"
    );

    trigger.setAttribute(
      "tabindex",
      "0"
    );

    trigger.setAttribute(
      "aria-haspopup",
      "true"
    );

    trigger.setAttribute(
      "aria-expanded",
      "false"
    );

    // Prevent duplicate listeners

    if (
      trigger.dataset
        .secoraProfileBound !==
      "true"
    ) {

      trigger.dataset
        .secoraProfileBound =
        "true";

      trigger.addEventListener(
        "click",
        event => {

          event.preventDefault();

          event.stopPropagation();

          const menu =
            document.getElementById(
              "profileMenu"
            ) ||
            document.querySelector(
              "[data-profile-menu], .profile-menu, .user-menu-dropdown"
            );

          if (!menu) {

            window.location.href =
              "profile.html";

            return;

          }

          const isOpen =
            menu.classList.contains(
              "open"
            ) ||
            menu.getAttribute(
              "aria-hidden"
            ) === "false";

          menu.classList.toggle(
            "open",
            !isOpen
          );

          menu.setAttribute(
            "aria-hidden",
            String(isOpen)
          );

          trigger.setAttribute(
            "aria-expanded",
            String(!isOpen)
          );

        }
      );

      trigger.addEventListener(
        "keydown",
        event => {

          if (
            event.key === "Enter" ||
            event.key === " "
          ) {

            event.preventDefault();

            trigger.click();

          }

        }
      );

    }

  }

  // -------------------------------------------------------
  // EXISTING PROFILE MENU
  // -------------------------------------------------------

  const menu =
    document.getElementById(
      "profileMenu"
    ) ||
    document.querySelector(
      "[data-profile-menu], .profile-menu, .user-menu-dropdown"
    );

  if (menu) {

    const menuName =
      menu.querySelector(
        "#profileMenuName, .profile-menu-name, [data-profile-name]"
      );

    const menuEmail =
      menu.querySelector(
        "#profileMenuEmail, .profile-menu-email, [data-profile-email]"
      );

    if (menuName) {

      menuName.textContent =
        displayName;

    }

    if (menuEmail) {

      menuEmail.textContent =
        user?.email || "";

    }

    const profileLink =
      menu.querySelector(
        "#profileLink, [data-profile-link], a[href*='profile']"
      );

    if (profileLink) {

      profileLink.href =
        "profile.html";

      profileLink.addEventListener(
        "click",
        () => {

          menu.classList.remove(
            "open"
          );

          menu.setAttribute(
            "aria-hidden",
            "true"
          );

        }
      );

    }

  }

  // -------------------------------------------------------
  // CREATE FALLBACK PROFILE HEADER
  // -------------------------------------------------------

  if (!trigger) {

    createFallbackProfileHeader(
      user,
      displayName,
      avatarUrl
    );

  }

  // -------------------------------------------------------
  // CLOSE MENU WHEN CLICKING OUTSIDE
  // -------------------------------------------------------

  if (
    !document.documentElement
      .dataset
      .secoraProfileOutsideBound
  ) {

    document.documentElement
      .dataset
      .secoraProfileOutsideBound =
      "true";

    document.addEventListener(
      "click",
      event => {

        const openMenu =
          document.getElementById(
            "profileMenu"
          ) ||
          document.querySelector(
            "[data-profile-menu], .profile-menu, .user-menu-dropdown"
          );

        if (!openMenu) {

          return;

        }

        const activeTrigger =
          document.getElementById(
            "profileBtn"
          ) ||
          document.getElementById(
            "profileButton"
          ) ||
          document.getElementById(
            "profileTrigger"
          ) ||
          document.querySelector(
            "[data-profile-trigger], .profile-trigger, .profile-button, .user-menu-trigger, .header-profile"
          );

        if (
          !openMenu.contains(
            event.target
          ) &&
          !activeTrigger?.contains(
            event.target
          )
        ) {

          openMenu.classList.remove(
            "open"
          );

          openMenu.setAttribute(
            "aria-hidden",
            "true"
          );

          if (activeTrigger) {

            activeTrigger.setAttribute(
              "aria-expanded",
              "false"
            );

          }

        }

      }
    );

  }

}


// =========================================================
// FALLBACK PROFILE HEADER
// =========================================================

function createFallbackProfileHeader(
  user,
  displayName,
  avatarUrl
) {

  const header =
    document.querySelector(
      "header"
    ) ||
    document.querySelector(
      ".topbar"
    ) ||
    document.querySelector(
      ".navbar"
    ) ||
    document.querySelector(
      "nav"
    );

  if (
    !header ||
    document.getElementById(
      "secoraFallbackProfile"
    )
  ) {

    return;

  }

  // -------------------------------------------------------
  // WRAPPER
  // -------------------------------------------------------

  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.id =
    "secoraFallbackProfile";

  wrapper.style.cssText = `
    position:relative;
    margin-left:auto;
    display:flex;
    align-items:center;
    font-family:inherit;
  `;

  // -------------------------------------------------------
  // PROFILE BUTTON
  // -------------------------------------------------------

  const button =
    document.createElement(
      "button"
    );

  button.id =
    "profileBtn";

  button.type =
    "button";

  button.style.cssText = `
    display:flex;
    align-items:center;
    gap:9px;
    border:0;
    background:transparent;
    color:inherit;
    padding:6px 8px;
    border-radius:9px;
    cursor:pointer;
    font:inherit;
  `;

  // -------------------------------------------------------
  // AVATAR
  // -------------------------------------------------------

  const avatar =
    document.createElement(
      "span"
    );

  avatar.style.cssText = `
    width:32px;
    height:32px;
    border-radius:50%;
    display:grid;
    place-items:center;
    overflow:hidden;
    background:#e9edf2;
    color:#1b2430;
    font-size:13px;
    font-weight:700;
  `;

  if (avatarUrl) {

    avatar.innerHTML =
      `<img src="${escapeHTML(
        avatarUrl
      )}" alt="${escapeHTML(
        displayName
      )}" style="width:100%;height:100%;object-fit:cover;">`;

  } else {

    avatar.textContent =
      displayName
        .charAt(0)
        .toUpperCase();

  }

  // -------------------------------------------------------
  // NAME
  // -------------------------------------------------------

  const text =
    document.createElement(
      "span"
    );

  text.id =
    "profileName";

  text.textContent =
    displayName;

  text.style.cssText = `
    font-size:13px;
    font-weight:600;
    white-space:nowrap;
  `;

  button.append(
    avatar,
    text
  );

  // -------------------------------------------------------
  // PROFILE MENU
  // -------------------------------------------------------

  const menu =
    document.createElement(
      "div"
    );

  menu.id =
    "profileMenu";

  menu.setAttribute(
    "aria-hidden",
    "true"
  );

  menu.style.cssText = `
    position:absolute;
    top:calc(100% + 10px);
    right:0;
    min-width:220px;
    padding:10px;
    background:#fff;
    color:#17202b;
    border:1px solid #e2e7ed;
    border-radius:12px;
    box-shadow:0 16px 40px rgba(0,0,0,.12);
    display:none;
    z-index:9999;
  `;

  // -------------------------------------------------------
  // PROFILE CSS
  // -------------------------------------------------------

  const style =
    document.createElement(
      "style"
    );

  style.textContent = `

    #profileMenu.open {
      display:block !important;
    }

    #profileBtn:hover {
      background:rgba(0,0,0,.04);
    }

    #profileMenu a,
    #profileMenu button {

      display:block;
      width:100%;
      box-sizing:border-box;
      padding:10px 11px;
      border:0;
      background:transparent;
      color:inherit;
      text-align:left;
      text-decoration:none;
      border-radius:8px;
      cursor:pointer;
      font:inherit;

    }

    #profileMenu a:hover,
    #profileMenu button:hover {

      background:#f2f5f8;

    }

  `;

  // -------------------------------------------------------
  // PROFILE INFORMATION
  // -------------------------------------------------------

  const info =
    document.createElement(
      "div"
    );

  info.style.cssText =
    "padding:8px 10px 10px;border-bottom:1px solid #edf0f3;margin-bottom:5px;";

  const menuName =
    document.createElement(
      "strong"
    );

  menuName.id =
    "profileMenuName";

  menuName.textContent =
    displayName;

  menuName.style.display =
    "block";

  const menuEmail =
    document.createElement(
      "small"
    );

  menuEmail.id =
    "profileMenuEmail";

  menuEmail.textContent =
    user?.email || "";

  menuEmail.style.cssText =
    "display:block;margin-top:3px;color:#718096;overflow:hidden;text-overflow:ellipsis;";

  info.append(
    menuName,
    menuEmail
  );

  // -------------------------------------------------------
  // PROFILE LINK
  // -------------------------------------------------------

  const profileLink =
    document.createElement(
      "a"
    );

  profileLink.id =
    "profileLink";

  profileLink.href =
    "profile.html";

  profileLink.textContent =
    "Profile";

  // -------------------------------------------------------
  // LOGOUT BUTTON
  // -------------------------------------------------------

  const logout =
    document.createElement(
      "button"
    );

  logout.id =
    "logoutBtn";

  logout.type =
    "button";

  logout.textContent =
    "Logout";

  // -------------------------------------------------------
  // BUILD MENU
  // -------------------------------------------------------

  menu.append(
    info,
    profileLink,
    logout
  );

  wrapper.append(
    button,
    menu
  );

  header.append(
    wrapper
  );

  document.head.appendChild(
    style
  );

  // -------------------------------------------------------
  // LOGOUT HANDLER
  // -------------------------------------------------------

  logout.addEventListener(
    "click",
    async event => {

      event.preventDefault();

      logout.disabled =
        true;

      logout.textContent =
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

        logout.disabled =
          false;

        logout.textContent =
          "Logout";

        return;

      }

      window.location.replace(
        "index.html"
      );

    }
  );

}
