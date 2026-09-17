 // =========================================================
// SECORA — COURSE PAGE
// V0.4.1
// DYNAMIC COURSE + MODULES + LESSONS + REAL PROGRESS
// =========================================================

document.addEventListener(
  "DOMContentLoaded",
  initializeCourse
);


// =========================================================
// INITIALIZE
// =========================================================

async function initializeCourse() {

  // -------------------------------------------------------
  // REQUIRED DOM ELEMENTS
  // -------------------------------------------------------

  const title =
    document.getElementById("courseTitle");

  const description =
    document.getElementById("courseDescription");

  const level =
    document.getElementById("courseLevel");

  const moduleCount =
    document.getElementById("moduleCount");

  const lessonCount =
    document.getElementById("lessonCount");

  const progressPercent =
    document.getElementById("progressPercent");

  const progressLessons =
    document.getElementById("progressLessons");

  const modulesContainer =
    document.getElementById("modulesContainer");

  const curriculumLessonCount =
    document.getElementById("curriculumLessonCount");


  // -------------------------------------------------------
  // DOM VALIDATION
  // -------------------------------------------------------

  if (!modulesContainer) {

    console.error(
      "SECORA: #modulesContainer was not found."
    );

    return;

  }


  // =======================================================
  // AUTHENTICATION
  // =======================================================

  try {

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
    // COURSE SLUG
    // =====================================================

    const params =
      new URLSearchParams(
        window.location.search
      );


    const slug =
      params.get("slug");


    if (!slug) {

      showError(
        modulesContainer,
        "No course was selected."
      );

      return;

    }


    // =====================================================
    // LOAD COURSE
    // =====================================================

    const {
      data: course,
      error: courseError
    } =
      await secoraSupabase
        .from("courses")
        .select(`
          id,
          title,
          slug,
          description,
          level
        `)
        .eq(
          "slug",
          slug
        )
        .eq(
          "published",
          true
        )
        .single();


    if (
      courseError ||
      !course
    ) {

      console.error(
        "SECORA course error:",
        courseError
      );

      showError(
        modulesContainer,
        "This course could not be found."
      );

      return;

    }


    // =====================================================
    // COURSE HEADER
    // =====================================================

    if (title) {

      title.textContent =
        course.title;

    }


    if (description) {

      description.textContent =
        course.description || "";

    }


    if (level) {

      level.textContent =
        String(
          course.level || "beginner"
        ).toUpperCase();

    }


    document.title =
      `${course.title} — Secora`;


    // =====================================================
    // LOAD MODULES
    // =====================================================

    const {
      data: modules,
      error: modulesError
    } =
      await secoraSupabase
        .from("modules")
        .select(`
          id,
          title,
          description,
          position
        `)
        .eq(
          "course_id",
          course.id
        )
        .order(
          "position",
          {
            ascending: true
          }
        );


    if (modulesError) {

      console.error(
        "SECORA module error:",
        modulesError
      );

      showError(
        modulesContainer,
        "Unable to load course modules."
      );

      return;

    }


    const safeModules =
      modules || [];


    const totalModules =
      safeModules.length;


    // -----------------------------------------------------
    // MODULE COUNT
    // -----------------------------------------------------
    // Only write the number here.
    // The visual label is handled by HTML/CSS.
    // This prevents:
    // "7 MODULESMODULES"
    // -----------------------------------------------------

    setText(
      moduleCount,
      totalModules
    );


    // =====================================================
    // LOAD ALL LESSONS
    // =====================================================

    let allLessons = [];


    if (
      safeModules.length > 0
    ) {

      const moduleIds =
        safeModules.map(
          module =>
            module.id
        );


      const {
        data: lessons,
        error: lessonsError
      } =
        await secoraSupabase
          .from("lessons")
          .select(`
            id,
            module_id,
            title,
            slug,
            position,
            duration_minutes
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


      if (lessonsError) {

        console.error(
          "SECORA lesson error:",
          lessonsError
        );

        showError(
          modulesContainer,
          "Unable to load course lessons."
        );

        return;

      }


      allLessons =
        lessons || [];

    }


    // =====================================================
    // LESSON COUNT
    // =====================================================

    const totalLessons =
      allLessons.length;


    // -----------------------------------------------------
    // WRITE NUMBER ONLY
    // Prevent:
    // "61 LESSONSLESSONS"
    // -----------------------------------------------------

    setText(
      lessonCount,
      totalLessons
    );


    // -----------------------------------------------------
    // CURRICULUM HEADER COUNT
    // -----------------------------------------------------

    if (
      curriculumLessonCount
    ) {

      curriculumLessonCount.textContent =
        `${totalLessons} ${totalLessons === 1 ? "lesson" : "lessons"}`;

    }


    // =====================================================
    // LOAD USER PROGRESS
    // =====================================================

    let completedLessons = 0;


    if (
      totalLessons > 0
    ) {

      const lessonIds =
        allLessons.map(
          lesson =>
            lesson.id
        );


      const {
        data: progress,
        error: progressError
      } =
        await secoraSupabase
          .from("lesson_progress")
          .select(
            "lesson_id, completed"
          )
          .eq(
            "user_id",
            user.id
          )
          .in(
            "lesson_id",
            lessonIds
          );


      if (progressError) {

        console.warn(
          "SECORA progress could not be loaded:",
          progressError
        );

      } else if (
        progress
      ) {

        completedLessons =
          progress.filter(
            item =>
              item.completed === true
          ).length;

      }

    }


    // =====================================================
    // CALCULATE PROGRESS
    // =====================================================

    const percentage =
      totalLessons === 0
        ? 0
        : Math.round(
            (
              completedLessons /
              totalLessons
            ) * 100
          );


    // =====================================================
    // UPDATE PROGRESS UI
    // =====================================================

    if (
      progressPercent
    ) {

      progressPercent.textContent =
        `${percentage}%`;

    }


    if (
      progressLessons
    ) {

      progressLessons.textContent =
        `${completedLessons} / ${totalLessons} lessons`;

    }


    // =====================================================
    // RENDER CURRICULUM
    // =====================================================

    renderModules(
      safeModules,
      allLessons,
      modulesContainer
    );


  } catch (error) {

    console.error(
      "SECORA course page error:",
      error
    );

    showError(
      modulesContainer,
      "Something went wrong while loading this course."
    );

  }

}


// =========================================================
// RENDER MODULES
// =========================================================

function renderModules(
  modules,
  allLessons,
  container
) {

  container.innerHTML = "";


  if (
    !modules.length
  ) {

    container.innerHTML = `
      <div class="empty-state">
        <h3>No modules available</h3>
        <p>
          Course modules are being prepared.
        </p>
      </div>
    `;

    return;

  }


  modules.forEach(
    (module, index) => {

      const article =
        document.createElement(
          "article"
        );


      article.className =
        "module";


      const number =
        String(
          index + 1
        ).padStart(
          2,
          "0"
        );


      const moduleLessons =
        allLessons.filter(
          lesson =>
            lesson.module_id ===
            module.id
        );


      const completedModuleLessons =
        moduleLessons.filter(
          lesson =>
            lessonIsCompleted(
              lesson.id
            )
        ).length;


      article.innerHTML = `

        <button
          type="button"
          class="module-header"
          data-module-id="${escapeHTML(module.id)}"
          aria-expanded="false"
        >

          <span
            class="module-number"
            aria-hidden="true"
          >
            ${number}
          </span>


          <span class="module-info">

            <span class="module-title">
              ${escapeHTML(module.title)}
            </span>

            <span class="module-description">
              ${escapeHTML(module.description || "")}
            </span>

          </span>


          <span class="module-meta">
            ${moduleLessons.length}
            ${moduleLessons.length === 1 ? "LESSON" : "LESSONS"}
          </span>


          <span
            class="module-arrow"
            aria-hidden="true"
          >
            →
          </span>

        </button>


        <div class="lesson-list">

          ${renderLessonList(moduleLessons)}

        </div>

      `;


      container.appendChild(
        article
      );

    }
  );


  // =======================================================
  // MODULE TOGGLE
  // =======================================================

  container
    .querySelectorAll(
      ".module-header"
    )
    .forEach(
      header => {

        header.addEventListener(
          "click",
          () => {

            const module =
              header.closest(
                ".module"
              );


            if (!module) {

              return;

            }


            const isOpen =
              module.classList.toggle(
                "open"
              );


            header.setAttribute(
              "aria-expanded",
              String(isOpen)
            );

          }
        );

      }
    );

}


// =========================================================
// RENDER LESSON LIST
// =========================================================

function renderLessonList(
  lessons
) {

  if (
    !lessons.length
  ) {

    return `
      <div class="lesson-loading">
        Lessons are being prepared.
      </div>
    `;

  }


  return lessons
    .map(
      (lesson, index) => {

        const number =
          String(
            index + 1
          ).padStart(
            2,
            "0"
          );


        return `

          <a
            href="lesson.html?slug=${encodeURIComponent(lesson.slug)}"
            class="lesson-item"
          >

            <span
              class="lesson-number"
              aria-hidden="true"
            >
              ${number}
            </span>


            <span class="lesson-title">
              ${escapeHTML(lesson.title)}
            </span>


            <span class="lesson-duration">
              ${lesson.duration_minutes || "—"} MIN
            </span>


            <span
              class="lesson-arrow"
              aria-hidden="true"
            >
              →
            </span>

          </a>

        `;

      }
    )
    .join("");

}


// =========================================================
// PROGRESS HELPER
// =========================================================
// Kept intentionally lightweight.
// The main progress calculation happens directly from
// Supabase data in initializeCourse().
// =========================================================

function lessonIsCompleted(
  lessonId
) {

  return false;

}


// =========================================================
// TEXT HELPER
// =========================================================

function setText(
  element,
  value
) {

  if (!element) {

    return;

  }


  element.textContent =
    value;

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
// ERROR STATE
// =========================================================

function showError(
  element,
  message
) {

  if (!element) {

    return;

  }


  element.innerHTML = `

    <div class="error-state">

      <h3>
        Unable to load course
      </h3>

      <p>
        ${escapeHTML(message)}
      </p>

    </div>

  `;

}
