// =========================================================
// SECORA V0.3.5 — LESSON READER
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {

  const lessonTitle =
    document.getElementById("lessonTitle");

  const moduleName =
    document.getElementById("moduleName");

  const lessonDuration =
    document.getElementById("lessonDuration");

  const breadcrumb =
    document.getElementById("breadcrumb");

  const lessonContent =
    document.getElementById("lessonContent");

  const backToCourse =
    document.getElementById("backToCourse");

  const previousLesson =
    document.getElementById("previousLesson");

  const nextLesson =
    document.getElementById("nextLesson");

  const completeBtn =
    document.getElementById("completeBtn");

  const completionStatus =
    document.getElementById("completionStatus");

  const completionBar =
    document.getElementById("completionBar");


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
  // GET LESSON SLUG
  // =======================================================

  const params =
    new URLSearchParams(window.location.search);

  const slug =
    params.get("slug");


  if (!slug) {

    showError(
      lessonContent,
      "No lesson was selected."
    );

    return;
  }


  // =======================================================
  // LOAD LESSON
  // =======================================================

  const {
    data: lesson,
    error: lessonError
  } = await secoraSupabase
    .from("lessons")
    .select(`
      id,
      title,
      slug,
      content,
      position,
      duration_minutes,
      module_id,
      modules (
        id,
        title,
        position,
        course_id,
        courses (
          id,
          title,
          slug
        )
      )
    `)
    .eq("slug", slug)
    .eq("published", true)
    .single();


  if (lessonError || !lesson) {

    console.error(
      "Lesson error:",
      lessonError
    );

    showError(
      lessonContent,
      "This lesson could not be found."
    );

    return;
  }


  // =======================================================
  // COURSE + MODULE
  // =======================================================

  const module =
    lesson.modules;

  const course =
    module?.courses;


  // =======================================================
  // HEADER
  // =======================================================

  lessonTitle.textContent =
    lesson.title;


  moduleName.textContent =
    module?.title || "Module";


  lessonDuration.textContent =
    lesson.duration_minutes || "—";


  document.title =
    `${lesson.title} — Secora`;


  breadcrumb.textContent =
    `${course?.title || "Course"}  /  ${module?.title || "Module"}`;


  // =======================================================
  // BACK TO COURSE
  // =======================================================

  if (course?.slug) {

    backToCourse.href =
      `course.html?slug=${encodeURIComponent(course.slug)}`;

  } else {

    backToCourse.href =
      "home.html";

  }


  // =======================================================
  // RENDER CONTENT
  // =======================================================

  lessonContent.innerHTML =
    renderMarkdown(
      lesson.content || ""
    );


  // =======================================================
  // LOAD COMPLETION
  // =======================================================

  await loadCompletion(
    user.id,
    lesson.id
  );


  // =======================================================
  // LOAD PREVIOUS / NEXT
  // =======================================================

  await loadLessonNavigation(
    lesson,
    module,
    course,
    previousLesson,
    nextLesson
  );


  // =======================================================
  // COMPLETE BUTTON
  // =======================================================

  completeBtn.addEventListener(
    "click",
    async () => {

      await toggleCompletion(
        user.id,
        lesson.id
      );

    }
  );

});


// =========================================================
// COMPLETION
// =========================================================

async function loadCompletion(
  userId,
  lessonId
) {

  const {
    data,
    error
  } = await secoraSupabase
    .from("lesson_progress")
    .select("completed")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();


  if (error) {

    console.warn(
      "Progress could not be loaded:",
      error
    );

    return;

  }


  const completed =
    data?.completed === true;


  updateCompletionUI(
    completed
  );

}


// =========================================================
// TOGGLE COMPLETION
// =========================================================

async function toggleCompletion(
  userId,
  lessonId
) {

  const completeBtn =
    document.getElementById("completeBtn");


  completeBtn.disabled =
    true;


  const {
    data: existing,
    error: existingError
  } = await secoraSupabase
    .from("lesson_progress")
    .select("id, completed")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();


  if (existingError) {

    console.error(
      existingError
    );

    completeBtn.disabled =
      false;

    return;
  }


  const completed =
    !(existing?.completed === true);


  let error;


  if (existing) {

    const result =
      await secoraSupabase
        .from("lesson_progress")
        .update({
          completed,
          completed_at:
            completed
              ? new Date().toISOString()
              : null,
          last_opened_at:
            new Date().toISOString()
        })
        .eq("id", existing.id);


    error =
      result.error;

  } else {

    const result =
      await secoraSupabase
        .from("lesson_progress")
        .insert({
          user_id: userId,
          lesson_id: lessonId,
          completed,
          completed_at:
            completed
              ? new Date().toISOString()
              : null,
          last_opened_at:
            new Date().toISOString()
        });


    error =
      result.error;

  }


  completeBtn.disabled =
    false;


  if (error) {

    console.error(
      "Progress update failed:",
      error
    );

    completeBtn.textContent =
      "Unable to update";

    return;
  }


  updateCompletionUI(
    completed
  );

}


// =========================================================
// COMPLETION UI
// =========================================================

function updateCompletionUI(
  completed
) {

  const status =
    document.getElementById(
      "completionStatus"
    );

  const bar =
    document.getElementById(
      "completionBar"
    );

  const button =
    document.getElementById(
      "completeBtn"
    );


  if (completed) {

    status.textContent =
      "100%";

    bar.style.width =
      "100%";

    button.textContent =
      "✓ Completed";

    button.classList.add(
      "completed"
    );

  } else {

    status.textContent =
      "0%";

    bar.style.width =
      "0%";

    button.textContent =
      "Mark as complete";

    button.classList.remove(
      "completed"
    );

  }

}


// =========================================================
// PREVIOUS / NEXT LESSON
// =========================================================

async function loadLessonNavigation(
  lesson,
  module,
  course,
  previousLink,
  nextLink
) {

  if (!module?.id) {
    return;
  }


  const {
    data: lessons,
    error
  } = await secoraSupabase
    .from("lessons")
    .select(`
      id,
      title,
      slug,
      position
    `)
    .eq("module_id", module.id)
    .eq("published", true)
    .order("position", {
      ascending: true
    });


  if (error || !lessons) {
    return;
  }


  const currentIndex =
    lessons.findIndex(
      item => item.id === lesson.id
    );


  if (currentIndex > 0) {

    const previous =
      lessons[currentIndex - 1];


    previousLink.href =
      `lesson.html?slug=${encodeURIComponent(previous.slug)}`;


    previousLink.querySelector("strong")
      .textContent =
      previous.title;

  } else {

    previousLink.style.visibility =
      "hidden";

  }


  if (
    currentIndex >= 0 &&
    currentIndex < lessons.length - 1
  ) {

    const next =
      lessons[currentIndex + 1];


    nextLink.href =
      `lesson.html?slug=${encodeURIComponent(next.slug)}`;


    nextLink.querySelector("strong")
      .textContent =
      next.title;

  } else {

    nextLink.style.visibility =
      "hidden";

  }

}


// =========================================================
// MARKDOWN → HTML
// =========================================================

function renderMarkdown(
  markdown
) {

  const safe =
    escapeHTML(markdown);


  const lines =
    safe.split("\n");


  let html = "";

  let inUnorderedList =
    false;

  let inOrderedList =
    false;


  function closeLists() {

    if (inUnorderedList) {

      html += "</ul>";

      inUnorderedList =
        false;

    }

    if (inOrderedList) {

      html += "</ol>";

      inOrderedList =
        false;

    }

  }


  lines.forEach(
    line => {

      const trimmed =
        line.trim();


      // Empty line

      if (!trimmed) {

        closeLists();

        return;

      }


      // H3

      if (trimmed.startsWith("### ")) {

        closeLists();

        html +=
          `<h3>${formatInline(trimmed.slice(4))}</h3>`;

        return;

      }


      // H2

      if (trimmed.startsWith("## ")) {

        closeLists();

        html +=
          `<h2>${formatInline(trimmed.slice(3))}</h2>`;

        return;

      }


      // H1

      if (trimmed.startsWith("# ")) {

        closeLists();

        html +=
          `<h1>${formatInline(trimmed.slice(2))}</h1>`;

        return;

      }


      // Unordered list

      if (
        trimmed.startsWith("- ") ||
        trimmed.startsWith("* ")
      ) {

        if (!inUnorderedList) {

          closeLists();

          html += "<ul>";

          inUnorderedList =
            true;

        }

        html +=
          `<li>${formatInline(trimmed.slice(2))}</li>`;

        return;

      }


      // Ordered list

      if (/^\d+\.\s/.test(trimmed)) {

        if (!inOrderedList) {

          closeLists();

          html += "<ol>";

          inOrderedList =
            true;

        }


        html +=
          `<li>${formatInline(
            trimmed.replace(/^\d+\.\s/, "")
          )}</li>`;

        return;

      }


      // Quote

      if (trimmed.startsWith("&gt; ")) {

        closeLists();

        html +=
          `<blockquote>${formatInline(
            trimmed.slice(5)
          )}</blockquote>`;

        return;

      }


      // Normal paragraph

      closeLists();

      html +=
        `<p>${formatInline(trimmed)}</p>`;

    }
  );


  closeLists();


  return html;

}


// =========================================================
// INLINE MARKDOWN
// =========================================================

function formatInline(
  text
) {

  return text

    // Bold
    .replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    )

    // Inline code
    .replace(
      /`([^`]+)`/g,
      "<code>$1</code>"
    );

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
// ERROR
// =========================================================

function showError(
  element,
  message
) {

  element.innerHTML = `

    <div
      style="
        padding:50px;
        text-align:center;
        color:#888;
        font-size:13px;
      "
    >
      ${escapeHTML(message)}
    </div>

  `;

}
