 // =========================================================
// SECORA V0.3.5 — COURSE PAGE
// Dynamic course + modules + lessons
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
  // COURSE INFORMATION
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
  // LOAD TOTAL LESSON COUNT
  // =======================================================

  let totalLessons = 0;


  if (modules?.length) {

    const moduleIds =
      modules.map(module => module.id);


    const {
      data: lessons,
      error: lessonsError
    } = await secoraSupabase
      .from("lessons")
      .select("id")
      .in("module_id", moduleIds)
      .eq("published", true);


    if (!lessonsError && lessons) {

      totalLessons =
        lessons.length;

    }

  }


  lessonCount.textContent =
    `${totalLessons} LESSON${totalLessons === 1 ? "" : "S"}`;


  // =======================================================
  // NO MODULES
  // =======================================================

  if (!modules?.length) {

    modulesContainer.innerHTML = `

      <div class="loading">
        Course modules are being prepared.
      </div>

    `;

    return;
  }


  // =======================================================
  // RENDER MODULES
  // =======================================================

  modulesContainer.innerHTML = "";


  modules.forEach(
    (module, index) => {

      const article =
        document.createElement("article");


      article.className =
        "module";


      const number =
        String(index + 1)
          .padStart(2, "0");


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
            MODULE ${number}
          </div>


          <div class="module-arrow">
            →
          </div>

        </div>


        <div class="lesson-list"></div>

      `;


      modulesContainer.appendChild(article);

    }
  );


  // =======================================================
  // MODULE CLICK
  // =======================================================

  document
    .querySelectorAll(".module-header")
    .forEach(header => {

      header.addEventListener(
        "click",
        async () => {

          const module =
            header.parentElement;

          const lessonList =
            module.querySelector(".lesson-list");


          const isOpen =
            module.classList.contains("open");


          // Close

          if (isOpen) {

            module.classList.remove("open");

            lessonList.innerHTML = "";

            return;
          }


          // Open

          module.classList.add("open");


          lessonList.innerHTML = `

            <div class="lesson-loading">
              Loading lessons...
            </div>

          `;


          await loadModuleLessons(
            header.dataset.moduleId,
            lessonList
          );

        }
      );

    });

});


// =========================================================
// LOAD LESSONS FOR MODULE
// =========================================================

async function loadModuleLessons(
  moduleId,
  container
) {

  const {
    data: lessons,
    error
  } = await secoraSupabase
    .from("lessons")
    .select(`
      id,
      title,
      slug,
      duration_minutes,
      position
    `)
    .eq("module_id", moduleId)
    .eq("published", true)
    .order("position", {
      ascending: true
    });


  if (error) {

    console.error(
      "Lesson loading error:",
      error
    );


    container.innerHTML = `

      <div class="lesson-loading">
        Unable to load lessons.
      </div>

    `;

    return;
  }


  if (!lessons?.length) {

    container.innerHTML = `

      <div class="lesson-loading">
        Lessons are being prepared.
      </div>

    `;

    return;
  }


  container.innerHTML = "";


  lessons.forEach(
    (lesson, index) => {

      const link =
        document.createElement("a");


      link.className =
        "lesson-item";


      link.href =
        `lesson.html?slug=${encodeURIComponent(lesson.slug)}`;


      const number =
        String(index + 1)
          .padStart(2, "0");


      link.innerHTML = `

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

      `;


      container.appendChild(link);

    }
  );

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


// =========================================================
// HTML SAFETY
// =========================================================

function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}
