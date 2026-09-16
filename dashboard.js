 // =========================================================
// SECORA V0.3.7
// COMPLETE DASHBOARD.JS
// AUTH + PROFILE MENU + COURSES + PROGRESS
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {

  // =======================================================
  // AUTH
  // =======================================================

  const {
    data: { session },
    error: sessionError
  } = await secoraSupabase.auth.getSession();

  if (sessionError || !session) {
    window.location.replace("index.html");
    return;
  }

  const user = session.user;

  // =======================================================
  // USER INTERFACE
  // =======================================================

  setupUserInterface(user);

  // =======================================================
  // PROFILE / ACCOUNT MENU
  // =======================================================

  setupProfileMenu(user);

  // =======================================================
  // LOAD DASHBOARD DATA
  // =======================================================

  try {

    const data = await loadPlatformData(user.id);

    renderDashboardStats(data);

    renderContinueLearning(data);

    renderCourses(data);

  } catch (error) {

    console.error("Dashboard error:", error);

    showDashboardError();

  }

});


// =========================================================
// USER DETAILS
// =========================================================

function getUserDetails(user) {

  const metadata =
    user?.user_metadata || {};

  const identity =
    user?.identities?.[0]?.identity_data || {};

  const email =
    user?.email ||
    identity.email ||
    "";

  const displayName =
    metadata.full_name ||
    metadata.name ||
    identity.full_name ||
    identity.name ||
    email.split("@")[0] ||
    "Learner";

  const avatarUrl =
    metadata.avatar_url ||
    metadata.picture ||
    identity.avatar_url ||
    identity.picture ||
    "";

  return {
    displayName,
    email,
    avatarUrl
  };

}


// =========================================================
// BASIC USER UI
// =========================================================

function setupUserInterface(user) {

  const {
    displayName,
    email,
    avatarUrl
  } = getUserDetails(user);


  // -------------------------------------------------------
  // GREETING
  // -------------------------------------------------------

  const greeting =
    document.getElementById("userGreeting");

  if (greeting) {

    greeting.textContent =
      `Welcome back, ${displayName}`;

  }


  // -------------------------------------------------------
  // NAME
  // -------------------------------------------------------

  const userName =
    document.getElementById("userName");

  if (userName) {

    userName.textContent =
      displayName;

  }


  // -------------------------------------------------------
  // EMAIL
  // -------------------------------------------------------

  const userEmail =
    document.getElementById("userEmail");

  if (userEmail) {

    userEmail.textContent =
      email;

  }


  // -------------------------------------------------------
  // AVATAR
  // -------------------------------------------------------

  const avatar =
    document.getElementById("userAvatar");

  if (avatar) {

    if (avatarUrl) {

      avatar.src =
        avatarUrl;

      avatar.alt =
        displayName;

      avatar.referrerPolicy =
        "no-referrer";

      avatar.style.display =
        "";

    } else {

      avatar.style.display =
        "none";

    }

  }


  // -------------------------------------------------------
  // DATE
  // -------------------------------------------------------

  const dateElement =
    document.getElementById("currentDate");

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
// PROFILE MENU
// =========================================================

function setupProfileMenu(user) {

  const {
    displayName,
    email,
    avatarUrl
  } = getUserDetails(user);


  // -------------------------------------------------------
  // ADD PROFILE CSS
  // -------------------------------------------------------

  injectProfileStyles();


  // -------------------------------------------------------
  // FIND EXISTING PROFILE AREA
  // -------------------------------------------------------

  let wrapper =
    document.getElementById(
      "secoraProfileWrapper"
    );


  // -------------------------------------------------------
  // IF PROFILE DOES NOT EXIST, CREATE IT
  // -------------------------------------------------------

  if (!wrapper) {

    wrapper =
      createProfileWrapper(
        displayName,
        email,
        avatarUrl
      );


    const existingProfile =
      findExistingProfileArea();


    if (
      existingProfile &&
      existingProfile.parentElement
    ) {

      existingProfile.replaceWith(
        wrapper
      );

    } else {

      const header =
        document.querySelector(".topbar") ||
        document.querySelector("header") ||
        document.querySelector(".navbar") ||
        document.querySelector("nav");


      if (header) {

        header.appendChild(wrapper);

      } else {

        document.body.appendChild(wrapper);

      }

    }

  }


  // -------------------------------------------------------
  // UPDATE USER INFORMATION
  // -------------------------------------------------------

  updateProfileWrapper(
    wrapper,
    displayName,
    email,
    avatarUrl
  );


  // -------------------------------------------------------
  // PROFILE BUTTON
  // -------------------------------------------------------

  const profileButton =
    wrapper.querySelector(
      "#profileBtn"
    );


  const profileMenu =
    wrapper.querySelector(
      "#profileMenu"
    );


  if (
    profileButton &&
    profileButton.dataset.secoraBound !== "true"
  ) {

    profileButton.dataset.secoraBound =
      "true";


    // -----------------------------------------------------
    // CLICK
    // -----------------------------------------------------

    profileButton.addEventListener(
      "click",
      event => {

        event.preventDefault();

        event.stopPropagation();

        toggleProfileMenu(
          profileButton,
          profileMenu
        );

      }
    );


    // -----------------------------------------------------
    // KEYBOARD
    // -----------------------------------------------------

    profileButton.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Enter" ||
          event.key === " "
        ) {

          event.preventDefault();

          profileButton.click();

        }


        if (
          event.key === "Escape"
        ) {

          closeProfileMenu();

        }

      }
    );

  }


  // -------------------------------------------------------
  // LOGOUT
  // -------------------------------------------------------

  const logoutButton =
    wrapper.querySelector(
      "#logoutBtn"
    );

  bindLogoutButton(
    logoutButton
  );


  // -------------------------------------------------------
  // OUTSIDE CLICK
  // -------------------------------------------------------

  if (
    document.documentElement.dataset
      .secoraProfileOutsideBound !== "true"
  ) {

    document.documentElement.dataset
      .secoraProfileOutsideBound =
      "true";


    document.addEventListener(
      "click",
      event => {

        const currentWrapper =
          document.getElementById(
            "secoraProfileWrapper"
          );

        if (!currentWrapper) {
          return;
        }

        if (
          !currentWrapper.contains(
            event.target
          )
        ) {

          closeProfileMenu();

        }

      }
    );


    document.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Escape"
        ) {

          closeProfileMenu();

        }

      }
    );

  }

}


// =========================================================
// FIND OLD PROFILE AREA
// =========================================================

function findExistingProfileArea() {

  const selectors = [

    "#profileBtn",

    "#profileButton",

    "#profileTrigger",

    "[data-profile-trigger]",

    ".profile-trigger",

    ".profile-button",

    ".user-menu-trigger",

    ".header-profile",

    ".user-profile",

    ".user-account"

  ];


  for (
    const selector of selectors
  ) {

    const element =
      document.querySelector(
        selector
      );


    if (element) {

      return (
        element.closest(
          ".profile-wrapper"
        ) ||

        element.closest(
          ".user-wrapper"
        ) ||

        element.closest(
          ".account-wrapper"
        ) ||

        element.parentElement ||

        element
      );

    }

  }


  // -------------------------------------------------------
  // FIND LOADING...
  // -------------------------------------------------------

  const leaves =
    [
      ...document.querySelectorAll(
        "body *"
      )
    ].filter(
      element =>
        element.children.length === 0
    );


  const loading =
    leaves.find(
      element => {

        const text =
          element.textContent.trim();

        return (
          text === "Loading..." ||
          text === "Loading…"
        );

      }
    );


  if (loading) {

    let node =
      loading;


    for (
      let i = 0;
      i < 5;
      i++
    ) {

      if (!node.parentElement) {
        break;
      }


      const parent =
        node.parentElement;


      const text =
        parent.textContent
          .replace(/\s+/g, " ")
          .trim();


      if (
        text.length <= 150 &&
        /Loading/i.test(text)
      ) {

        return parent;

      }


      node =
        parent;

    }


    return loading.parentElement;

  }


  return null;

}


// =========================================================
// CREATE PROFILE WRAPPER
// =========================================================

function createProfileWrapper(
  displayName,
  email,
  avatarUrl
) {

  const wrapper =
    document.createElement(
      "div"
    );


  wrapper.id =
    "secoraProfileWrapper";


  wrapper.className =
    "secora-profile-wrapper";


  wrapper.innerHTML = `

    <button
      id="profileBtn"
      class="secora-profile-trigger"
      type="button"
      aria-haspopup="menu"
      aria-expanded="false"
    >

      <span class="secora-profile-avatar">
        ${createAvatarMarkup(
          displayName,
          avatarUrl
        )}
      </span>


      <span class="secora-profile-copy">

        <strong class="secora-profile-name">
          ${escapeHTML(displayName)}
        </strong>

        <small class="secora-profile-role">
          Student
        </small>

      </span>


      <span
        class="secora-profile-chevron"
        aria-hidden="true"
      >
        ⌄
      </span>

    </button>


    <div
      id="profileMenu"
      class="secora-profile-menu"
      role="menu"
      aria-hidden="true"
    >

      <div class="secora-profile-menu-head">

        <span class="secora-menu-avatar">
          ${createAvatarMarkup(
            displayName,
            avatarUrl
          )}
        </span>


        <div class="secora-profile-menu-user">

          <strong id="profileMenuName">
            ${escapeHTML(displayName)}
          </strong>

          <span id="profileMenuEmail">
            ${escapeHTML(email)}
          </span>

          <small>
            Student account
          </small>

        </div>

      </div>


      <div class="secora-profile-menu-divider"></div>


      <a
        class="secora-profile-menu-item"
        href="profile.html"
        role="menuitem"
      >

        <span class="secora-menu-icon">
          ${profileIcon()}
        </span>

        <span>
          Profile
        </span>

      </a>


      <a
        class="secora-profile-menu-item"
        href="settings.html"
        role="menuitem"
      >

        <span class="secora-menu-icon">
          ${settingsIcon()}
        </span>

        <span>
          Settings
        </span>

      </a>


      <a
        class="secora-profile-menu-item"
        href="help.html"
        role="menuitem"
      >

        <span class="secora-menu-icon">
          ${helpIcon()}
        </span>

        <span>
          Help
        </span>

      </a>


      <div class="secora-profile-menu-divider"></div>


      <button
        id="logoutBtn"
        class="secora-profile-menu-item secora-logout-item"
        type="button"
        role="menuitem"
      >

        <span class="secora-menu-icon">
          ${logoutIcon()}
        </span>

        <span>
          Logout
        </span>

      </button>

    </div>

  `;


  return wrapper;

}


// =========================================================
// UPDATE PROFILE
// =========================================================

function updateProfileWrapper(
  wrapper,
  displayName,
  email,
  avatarUrl
) {

  const trigger =
    wrapper.querySelector(
      "#profileBtn"
    );


  if (trigger) {

    const name =
      trigger.querySelector(
        ".secora-profile-name"
      );


    const role =
      trigger.querySelector(
        ".secora-profile-role"
      );


    const avatar =
      trigger.querySelector(
        ".secora-profile-avatar"
      );


    if (name) {

      name.textContent =
        displayName;

    }


    if (role) {

      role.textContent =
        "Student";

    }


    if (avatar) {

      avatar.innerHTML =
        createAvatarMarkup(
          displayName,
          avatarUrl
        );

    }

  }


  const menu =
    wrapper.querySelector(
      "#profileMenu"
    );


  if (menu) {

    const menuName =
      menu.querySelector(
        "#profileMenuName"
      );


    const menuEmail =
      menu.querySelector(
        "#profileMenuEmail"
      );


    const menuAvatar =
      menu.querySelector(
        ".secora-menu-avatar"
      );


    if (menuName) {

      menuName.textContent =
        displayName;

    }


    if (menuEmail) {

      menuEmail.textContent =
        email;

    }


    if (menuAvatar) {

      menuAvatar.innerHTML =
        createAvatarMarkup(
          displayName,
          avatarUrl
        );

    }

  }


  // -------------------------------------------------------
  // REMOVE LOADING TEXT
  // -------------------------------------------------------

  document
    .querySelectorAll(
      "body *"
    )
    .forEach(
      element => {

        if (
          element.children.length !== 0
        ) {

          return;

        }


        const text =
          element.textContent.trim();


        if (
          text === "Loading..." ||
          text === "Loading…"
        ) {

          const parent =
            element.parentElement;


          const parentText =
            parent?.textContent
              ?.trim() || "";


          if (
            element.id ===
              "profileLoading" ||

            element.classList.contains(
              "profile-loading"
            ) ||

            parentText.length < 100
          ) {

            element.textContent =
              displayName;

          }

        }

      }
    );

}


// =========================================================
// AVATAR
// =========================================================

function createAvatarMarkup(
  displayName,
  avatarUrl
) {

  if (avatarUrl) {

    return `

      <img
        src="${escapeHTML(avatarUrl)}"
        alt="${escapeHTML(displayName)}"
        class="secora-avatar-image"
        referrerpolicy="no-referrer"
      >

    `;

  }


  const initial =
    String(
      displayName || "L"
    )
      .trim()
      .charAt(0)
      .toUpperCase() || "L";


  return `

    <span class="secora-avatar-initial">
      ${escapeHTML(initial)}
    </span>

  `;

}


// =========================================================
// PROFILE TOGGLE
// =========================================================

function toggleProfileMenu(
  button,
  menu
) {

  if (!menu) {

    window.location.href =
      "profile.html";

    return;

  }


  const isOpen =
    menu.classList.contains(
      "open"
    );


  if (isOpen) {

    closeProfileMenu();

  } else {

    menu.classList.add(
      "open"
    );


    menu.setAttribute(
      "aria-hidden",
      "false"
    );


    button.setAttribute(
      "aria-expanded",
      "true"
    );

  }

}


// =========================================================
// CLOSE PROFILE
// =========================================================

function closeProfileMenu() {

  const menu =
    document.getElementById(
      "profileMenu"
    );


  const button =
    document.getElementById(
      "profileBtn"
    );


  if (menu) {

    menu.classList.remove(
      "open"
    );


    menu.setAttribute(
      "aria-hidden",
      "true"
    );

  }


  if (button) {

    button.setAttribute(
      "aria-expanded",
      "false"
    );

  }

}


// =========================================================
// LOGOUT
// =========================================================

function bindLogoutButton(
  button
) {

  if (!button) {
    return;
  }


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

      event.stopPropagation();


      button.disabled =
        true;


      button.innerHTML = `

        <span class="secora-menu-icon">
          ${logoutIcon()}
        </span>

        <span>
          Logging out...
        </span>

      `;


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


        button.innerHTML = `

          <span class="secora-menu-icon">
            ${logoutIcon()}
          </span>

          <span>
            Logout
          </span>

        `;


        return;

      }


      window.location.replace(
        "index.html"
      );

    }
  );

}


// =========================================================
// PROFILE CSS
// =========================================================

function injectProfileStyles() {

  if (
    document.getElementById(
      "secoraProfileStyles"
    )
  ) {

    return;

  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "secoraProfileStyles";


  style.textContent = `

    /* =====================================================
       SECORA PROFILE HEADER
       ===================================================== */

    .secora-profile-wrapper {

      position: relative;

      display: flex;

      align-items: center;

      margin-left: auto;

      z-index: 9999;

      font-family: inherit;

    }


    .secora-profile-trigger {

      appearance: none;

      -webkit-appearance: none;

      display: inline-flex;

      align-items: center;

      gap: 9px;

      min-height: 44px;

      margin: 0;

      padding: 5px 8px 5px 5px;

      border: 0;

      border-radius: 9px;

      outline: 0;

      background: transparent;

      color: inherit;

      cursor: pointer;

      text-align: left;

      font: inherit;

      transition:
        background .18s ease;

    }


    .secora-profile-trigger:hover,

    .secora-profile-trigger[aria-expanded="true"] {

      background:
        rgba(255,255,255,.055);

    }


    .secora-profile-trigger:focus-visible {

      box-shadow:
        0 0 0 2px
        rgba(92,214,255,.45);

    }


    .secora-profile-avatar,

    .secora-menu-avatar {

      flex: 0 0 auto;

      width: 34px;

      height: 34px;

      display: grid;

      place-items: center;

      overflow: hidden;

      border-radius: 50%;

      background: #152235;

      border: 1px solid #29415a;

      color: #dceeff;

      font-size: 13px;

      font-weight: 700;

    }


    .secora-menu-avatar {

      width: 42px;

      height: 42px;

    }


    .secora-avatar-image {

      display: block;

      width: 100%;

      height: 100%;

      object-fit: cover;

    }


    .secora-avatar-initial {

      width: 100%;

      height: 100%;

      display: grid;

      place-items: center;

      background: #102238;

      color: #dff7ff;

    }


    .secora-profile-copy {

      min-width: 0;

      display: flex;

      flex-direction: column;

      gap: 2px;

      line-height: 1.1;

    }


    .secora-profile-name {

      display: block;

      max-width: 150px;

      overflow: hidden;

      text-overflow: ellipsis;

      white-space: nowrap;

      color: #e8eef7;

      font-size: 12px;

      font-weight: 700;

    }


    .secora-profile-role {

      color: #65758b;

      font: 10px
        'DM Mono',
        monospace;

    }


    .secora-profile-chevron {

      color: #66788e;

      font-size: 15px;

      line-height: 1;

      transition:
        transform .18s ease;

    }


    .secora-profile-trigger[
      aria-expanded="true"
    ]
    .secora-profile-chevron {

      transform:
        rotate(180deg);

    }


    /* =====================================================
       DROPDOWN
       ===================================================== */

    .secora-profile-menu {

      position: absolute;

      top: calc(100% + 9px);

      right: 0;

      width: 255px;

      box-sizing: border-box;

      display: none;

      padding: 8px;

      background: #0b111c;

      color: #e7edf5;

      border:
        1px solid #24364d;

      border-radius: 10px;

      box-shadow:
        0 24px 70px
        rgba(0,0,0,.52);

      z-index: 10000;

    }


    .secora-profile-menu.open {

      display: block;

      animation:
        secoraProfileDrop
        .16s
        ease-out;

    }


    @keyframes secoraProfileDrop {

      from {

        opacity: 0;

        transform:
          translateY(-5px);

      }

      to {

        opacity: 1;

        transform:
          translateY(0);

      }

    }


    .secora-profile-menu-head {

      display: flex;

      align-items: center;

      gap: 10px;

      padding:
        9px 8px 11px;

    }


    .secora-profile-menu-user {

      min-width: 0;

      display: flex;

      flex-direction: column;

      gap: 2px;

    }


    .secora-profile-menu-user strong {

      color: #f1f6fb;

      font-size: 12px;

      font-weight: 700;

      overflow: hidden;

      text-overflow: ellipsis;

      white-space: nowrap;

    }


    .secora-profile-menu-user span {

      color: #7d8da2;

      font:
        10px
        'DM Mono',
        monospace;

      overflow: hidden;

      text-overflow: ellipsis;

      white-space: nowrap;

    }


    .secora-profile-menu-user small {

      color: #4f6279;

      font-size: 9px;

      margin-top: 1px;

    }


    .secora-profile-menu-divider {

      height: 1px;

      margin:
        3px 2px;

      background: #1b293b;

    }


    .secora-profile-menu-item {

      width: 100%;

      min-height: 40px;

      box-sizing: border-box;

      display: flex;

      align-items: center;

      gap: 10px;

      margin: 2px 0;

      padding:
        9px 10px;

      border: 0;

      border-radius: 7px;

      background: transparent;

      color: #cbd6e3;

      cursor: pointer;

      text-align: left;

      text-decoration: none;

      font:
        12px
        inherit;

      transition:
        background .15s ease,
        color .15s ease;

    }


    .secora-profile-menu-item:hover {

      background: #111c2b;

      color: #f2f7fb;

    }


    .secora-profile-menu-item:focus-visible {

      outline:
        1px solid #31506e;

      outline-offset: -1px;

    }


    .secora-menu-icon {

      width: 18px;

      height: 18px;

      flex: 0 0 18px;

      display: grid;

      place-items: center;

      color: #71859d;

    }


    .secora-menu-icon svg {

      width: 16px;

      height: 16px;

      display: block;

      stroke: currentColor;

    }


    .secora-logout-item:hover {

      color: #ffb2ad;

      background:
        rgba(255,92,83,.07);

    }


    .secora-logout-item:disabled {

      opacity: .65;

      cursor: wait;

    }


    @media (max-width: 650px) {

      .secora-profile-copy {

        display: none;

      }


      .secora-profile-menu {

        position: fixed;

        top: 62px;

        right: 12px;

        width:
          min(
            255px,
            calc(100vw - 24px)
          );

      }

    }

  `;


  document.head.appendChild(
    style
  );

}


// =========================================================
// LOAD PLATFORM DATA
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
      course =>
        course.id
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
      module =>
        module.id
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
      lesson =>
        lesson.id
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

    courses:
      courses || [],

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


      const lessonIds =
        courseLessons.map(
          lesson =>
            lesson.id
        );


      const courseProgress =
        progress.filter(
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
// DASHBOARD STATS
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
      .filter(Boolean);


  if (
    !openedLessons.length
  ) {

    renderEmptyContinueLearning();

    return;

  }


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
// EMPTY CONTINUE
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
// COURSES
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


  if (
    !courseData.length
  ) {

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
      course.level ||
      "beginner"
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
          course.description ||
          ""
        )}
      </p>


      <div class="course-card-meta">

        <span>

          ${course.total}

          LESSON${
            course.total === 1
              ? ""
              : "S"
          }

        </span>


        <span>

          ${course.completed}

          COMPLETED

        </span>

      </div>


      <div class="course-progress">

        <div
          class="course-progress-bar"
          style="
            width:${course.percentage}%
          "
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
        Please refresh the page
        and try again.
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


// =========================================================
// PROFILE ICON
// =========================================================

function profileIcon() {

  return `

    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >

      <circle
        cx="12"
        cy="8"
        r="3.2"
      ></circle>

      <path
        d="
          M5.5 20
          c.8-3.4
          3-5.1
          6.5-5.1
          s5.7 1.7
          6.5 5.1
        "
      ></path>

    </svg>

  `;

}


// =========================================================
// SETTINGS ICON
// =========================================================

function settingsIcon() {

  return `

    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >

      <path
        d="
          M12 3.8v2.1
          M12 18.1v2.1
          M20.2 12h-2.1
          M5.9 12H3.8
          M17.8 6.2l-1.5 1.5
          M7.7 16.3l-1.5 1.5
          M17.8 17.8l-1.5-1.5
          M7.7 7.7L6.2 6.2
        "
      ></path>

      <circle
        cx="12"
        cy="12"
        r="3.4"
      ></circle>

    </svg>

  `;

}


// =========================================================
// HELP ICON
// =========================================================

function helpIcon() {

  return `

    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >

      <circle
        cx="12"
        cy="12"
        r="8.5"
      ></circle>

      <path
        d="
          M9.7 9.2
          a2.4 2.4 0 0 1 4.6 1
          c0 1.7-2.3 2-2.3 3.4
        "
      ></path>

      <path
        d="
          M12 16.9h.01
        "
      ></path>

    </svg>

  `;

}


// =========================================================
// LOGOUT ICON
// =========================================================

function logoutIcon() {

  return `

    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >

      <path
        d="
          M10 4.5H6.8
          a1.8 1.8 0 0 0-1.8 1.8
          v11.4
          a1.8 1.8 0 0 0 1.8 1.8
          H10
        "
      ></path>

      <path
        d="
          M13.5 8.5
          L17 12
          l-3.5 3.5
        "
      ></path>

      <path
        d="
          M17 12H9
        "
      ></path>

    </svg>

  `;

}
