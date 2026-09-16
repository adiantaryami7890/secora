// =========================================================
// SECORA V0.3.3 — DYNAMIC COURSE PAGE
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {

  // -------------------------------------------------------
  // ELEMENTS
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

  const modulesContainer =
    document.getElementById("modulesContainer");


  // -------------------------------------------------------
  // AUTH CHECK
  // -------------------------------------------------------

  const {
    data: { session },
    error: sessionError
  } = await secoraSupabase.auth.getSession();


  if (sessionError || !session) {

    window.location.replace("index.html");

    return;
  }


  // -------------------------------------------------------
  // GET COURSE SLUG
  // -------------------------------------------------------

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


  console.log(
    "Loading course:",
    slug
  );


  // -------------------------------------------------------
  // LOAD COURSE
  // -------------------------------------------------------

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


  // -------------------------------------------------------
  // COURSE INFORMATION
  // -------------------------------------------------------

  title.textContent =
    course.title;

  description.textContent =
    course.description || "";


  level.textContent =
    course.level || "beginner";


  document.title =
    `${course.title} — Secora`;


  // -------------------------------------------------------
  // LOAD MODULES
  // -------------------------------------------------------

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


  // -------------------------------------------------------
  // MODULE COUNT
  // -------------------------------------------------------

  const totalModules =
    modules?.length || 0;


  moduleCount.textContent =
    `${totalModules} MODULE${totalModules === 1 ? "" : "S"}`;


  // -------------------------------------------------------
  // LOAD LESSON COUNTS
  // -------------------------------------------------------

  let totalLessons = 0;


  if (modules && modules.length > 0) {

    const moduleIds =
      modules.map(module => module.id);


    const {
      data: lessons,
      error: lessonsError
    } = await secoraSupabase
      .from("lessons")
      .select("id, module_id")
      .in("module_id", moduleIds)
      .eq("published", true);


    if (!lessonsError && lessons) {

      totalLessons =
        lessons.length;

    }

  }


  lessonCount.textContent =
    `${totalLessons} LESSON${totalLessons === 1 ? "" : "S"}`;


  // -------------------------------------------------------
  // NO MODULES
  // -------------------------------------------------------

  if (!modules || modules.length === 0) {

    modulesContainer.innerHTML = `

      <div class="loading">
        Course modules are being prepared.
      </div>

    `;

    return;
  }


  // -------------------------------------------------------
  // RENDER MODULES
  // -------------------------------------------------------

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

        <div class="module-header">

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

      `;


      modulesContainer.appendChild(article);

    }
  );


  // -------------------------------------------------------
  // MODULE CLICK
  // -------------------------------------------------------

  document
    .querySelectorAll(".module-header")
    .forEach(header => {

      header.addEventListener(
        "click",
        () => {

          const module =
            header.parentElement;

          module.classList.toggle("open");

        }
      );

    });

});


// =========================================================
// ERROR UI
// =========================================================

function showError(element, message) {

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
