 // =========================================================
// SECORA V0.3.6 — COURSE PAGE + REAL PROGRESS
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {

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


  const user =
    session.user;


  // =======================================================
  // COURSE SLUG
  // =======================================================

  const params =
    new URLSearchParams(window.location.search);

  const slug =
    params.get("slug");


  if (!slug) {

    showError(
      modulesContainer,
      "No course was selected."
    );

    return;
  }


  // =======================================================
  // LOAD COURSE
  // =======================================================

  const {
    data: course,
    error: courseError
  } = await secoraSupabase
    .from("courses")
    .select(`
      id,
      title,
      slug,
      description,
      level
    `)
    .eq("slug", slug)
    .eq("published", true)
    .single();


  if (courseError || !course) {

    console.error(
      "Course error:",
      courseError
    );

    showError(
      modulesContainer,
      "This course could not be found."
    );

    return;
  }


  // =======================================================
  // COURSE HEADER
  // =======================================================

  title.textContent =
    course.title;

  description.textContent =
    course.description || "";

  level.textContent =
    course.level || "beginner";

  document.title =
    `${course.title} — Secora`;


  // =======================================================
  // LOAD MODULES
  // =======================================================

  const {
    data: modules,
    error: modulesError
  } = await secoraSupabase
    .from("modules")
    .select(`
      id,
      title,
      description,
      position
    `)
    .eq("course_id", course.id)
    .order("position", {
      ascending: true
    });


  if (modulesError) {

    console.error(
      "Module error:",
      modulesError
    );

    showError(
      modulesContainer,
      "Unable to load course modules."
    );

    return;
  }


  const totalModules =
    modules?.length || 0;


  moduleCount.textContent =
    `${totalModules} MODULE${totalModules === 1 ? "" : "S"}`;


  // =======================================================
  // LOAD ALL LESSONS
  // =======================================================

  let allLessons = [];


  if (modules?.length) {

    const moduleIds =
      modules.map(
        module => module.id
      );


    const {
      data: lessons,
      error: lessonsError
    } = await secoraSupabase
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
      .eq("published", true)
      .order("position", {
        ascending: true
      });


    if (!lessonsError && lessons) {

      allLessons =
        lessons;

    }

  }


  // =======================================================
  // LESSON COUNT
  // =======================================================

  const totalLessons =
    allLessons.length;


  lessonCount.textContent =
    `${totalLessons} LESSON${totalLessons === 1 ? "" : "S"}`;


  // =======================================================
  // LOAD USER PROGRESS
  // =======================================================

  let completedLessons = 0;


  if (totalLessons > 0) {

    const lessonIds =
      allLessons.map(
        lesson => lesson.id
      );


    const {
      data: progress,
      error: progressError
    } = await secoraSupabase
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


    if (!progressError && progress) {

      completedLessons =
        progress.filter(
          item => item.completed === true
        ).length;

    }

  }


  // =======================================================
  // CALCULATE PERCENTAGE
  // =======================================================

  const percentage =
    totalLessons === 0
      ? 0
      : Math.round(
          (completedLessons / totalLessons) * 100
        );


  if (progressPercent) {

    progressPercent.textContent =
      `${percentage}%`;

  }


  if (progressLessons) {

    progressLessons.textContent =
      `${completedLessons} / ${totalLessons} lessons`;

  }


  // =======================================================
  // RENDER MODULES
  // =======================================================

  modulesContainer.innerHTML = "";


  if (!modules?.length) {

    modulesContainer.innerHTML = `

      <div class="loading">
        Course modules are being prepared.
      </div>

    `;

    return;
  }


  modules.forEach(
    (module, index) => {

      const article =
        document.createElement("article");


      article.className =
        "module";


      const number =
        String(index + 1)
          .padStart(2, "0");


      const moduleLessons =
        allLessons.filter(
          lesson =>
            lesson.module_id === module.id
        );


      article.innerHTML = `

        <div
          class="module-header"
          data-module-id="${module.id}"
        >

          <div class="module-number">
            ${number}
          </div>


          <div class="module-info">

            <h3>
              ${escapeHTML(module.title)}
            </h3>

            <p>
              ${escapeHTML(module.description || "")}
            </p>

          </div>


          <div class="module-meta">
            ${moduleLessons.length}
            LESSON${moduleLessons.length === 1 ? "" : "S"}
          </div>


          <div class="module-arrow">
            →
          </div>

        </div>


        <div class="lesson-list">

          ${renderLessonList(moduleLessons)}

        </div>

      `;


      modulesContainer.appendChild(
        article
      );

    }
  );


  // =======================================================
  // MODULE TOGGLE
  // =======================================================

  document
    .querySelectorAll(".module-header")
    .forEach(header => {

      header.addEventListener(
        "click",
        () => {

          const module =
            header.parentElement;


          module.classList.toggle(
            "open"
          );

        }
      );

    });

});


// =========================================================
// RENDER LESSONS
// =========================================================

function renderLessonList(
  lessons
) {

  if (!lessons.length) {

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
          String(index + 1)
            .padStart(2, "0");


        return `

          <a
            href="lesson.html?slug=${encodeURIComponent(lesson.slug)}"
            class="lesson-item"
          >

            <span class="lesson-number">
              ${number}
            </span>


            <span class="lesson-title">
              ${escapeHTML(lesson.title)}
            </span>


            <span class="lesson-duration">
              ${lesson.duration_minutes || "—"} MIN
            </span>


            <span class="lesson-arrow">
              →
            </span>

          </a>

        `;

      }
    )
    .join("");

}


// =========================================================
// HTML SAFETY
// =========================================================

function escapeHTML(
  value
) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


// =========================================================
// ERROR
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
      ${escapeHTML(message)}
    </div>

  `;

}
