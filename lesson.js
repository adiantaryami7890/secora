 // =========================================================
// SECORA V0.4.1 — LESSON READER + REAL PROGRESS
// HTML + MARKDOWN CONTENT SUPPORT
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
  // LESSON SLUG
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


  const module =
    lesson.modules;

  const course =
    module?.courses;


  // =======================================================
  // COURSE INFORMATION
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
    `${course?.title || "Course"} / ${module?.title || "Module"}`;


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
  // RENDER LESSON
  // =======================================================

  lessonContent.innerHTML =
    renderLessonContent(
      lesson.content || ""
    );


  // =======================================================
  // RECORD LESSON OPEN
  // =======================================================

  await recordLessonOpened(
    user.id,
    lesson.id
  );


  // =======================================================
  // LOAD COMPLETION
  // =======================================================

  await loadCompletion(
    user.id,
    lesson.id
  );


  // =======================================================
  // LOAD NAVIGATION
  // =======================================================

  await loadLessonNavigation(
    lesson,
    module,
    previousLesson,
    nextLesson
  );


  // =======================================================
  // COMPLETE BUTTON
  // =======================================================

  if (completeBtn) {

    completeBtn.addEventListener(
      "click",
      async () => {

        await toggleCompletion(
          user.id,
          lesson.id
        );

      }
    );

  }

});


// =========================================================
// RECORD LESSON OPENED
// =========================================================

async function recordLessonOpened(
  userId,
  lessonId
) {

  const {
    data: existing,
    error
  } = await secoraSupabase
    .from("lesson_progress")
    .select("id, completed")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();


  if (error) {

    console.warn(
      "Could not read lesson progress:",
      error
    );

    return;
  }


  if (existing) {

    await secoraSupabase
      .from("lesson_progress")
      .update({
        last_opened_at:
          new Date().toISOString()
      })
      .eq("id", existing.id);

  } else {

    await secoraSupabase
      .from("lesson_progress")
      .insert({
        user_id: userId,
        lesson_id: lessonId,
        completed: false,
        last_opened_at:
          new Date().toISOString()
      });

  }

}


// =========================================================
// LOAD COMPLETION
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


  updateCompletionUI(
    data?.completed === true
  );

}


// =========================================================
// TOGGLE COMPLETION
// =========================================================

async function toggleCompletion(
  userId,
  lessonId
) {

  const button =
    document.getElementById(
      "completeBtn"
    );


  if (!button) {
    return;
  }


  button.disabled =
    true;

  button.textContent =
    "Saving...";


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
      "Progress lookup failed:",
      existingError
    );

    button.disabled =
      false;

    button.textContent =
      "Mark as complete";

    return;
  }


  const completed =
    !(existing?.completed === true);


  let result;


  if (existing) {

    result =
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

  } else {

    result =
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

  }


  if (result.error) {

    console.error(
      "Progress update failed:",
      result.error
    );

    button.disabled =
      false;

    button.textContent =
      "Unable to update";

    return;
  }


  button.disabled =
    false;


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


  if (!status || !bar || !button) {
    return;
  }


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
// LESSON NAVIGATION
// =========================================================

async function loadLessonNavigation(
  lesson,
  module,
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
      item =>
        item.id === lesson.id
    );


  // =======================================================
  // PREVIOUS
  // =======================================================

  if (
    previousLink
  ) {

    if (currentIndex > 0) {

      const previous =
        lessons[currentIndex - 1];


      previousLink.href =
        `lesson.html?slug=${encodeURIComponent(previous.slug)}`;


      const previousTitle =
        previousLink.querySelector("strong");


      if (previousTitle) {

        previousTitle.textContent =
          previous.title;

      }


      previousLink.style.visibility =
        "visible";

    } else {

      previousLink.style.visibility =
        "hidden";

    }

  }


  // =======================================================
  // NEXT
  // =======================================================

  if (
    nextLink
  ) {

    if (
      currentIndex >= 0 &&
      currentIndex < lessons.length - 1
    ) {

      const next =
        lessons[currentIndex + 1];


      nextLink.href =
        `lesson.html?slug=${encodeURIComponent(next.slug)}`;


      const nextTitle =
        nextLink.querySelector("strong");


      if (nextTitle) {

        nextTitle.textContent =
          next.title;

      }


      nextLink.style.visibility =
        "visible";

    } else {

      nextLink.style.visibility =
        "hidden";

    }

  }

}


// =========================================================
// LESSON CONTENT RENDERER
// Supports HTML + Markdown
// =========================================================

function renderLessonContent(
  content
) {

  const value =
    String(content || "").trim();


  if (!value) {
    return "";
  }


  // -------------------------------------------------------
  // Detect HTML
  // -------------------------------------------------------

  if (
    /<\/?[a-z][\s\S]*>/i.test(value)
  ) {

    return sanitizeLessonHTML(
      value
    );

  }


  // -------------------------------------------------------
  // Otherwise treat as Markdown
  // -------------------------------------------------------

  return renderMarkdown(
    value
  );

}


// =========================================================
// SAFE HTML SANITIZER
// =========================================================

function sanitizeLessonHTML(
  html
) {

  const template =
    document.createElement(
      "template"
    );


  template.innerHTML =
    html;


  const allowedTags =
    new Set([
      "H1",
      "H2",
      "H3",
      "H4",
      "P",
      "UL",
      "OL",
      "LI",
      "STRONG",
      "B",
      "EM",
      "I",
      "CODE",
      "PRE",
      "BLOCKQUOTE",
      "BR",
      "HR",
      "A"
    ]);


  const walker =
    document.createTreeWalker(
      template.content,
      NodeFilter.SHOW_ELEMENT
    );


  const elements = [];


  let current =
    walker.nextNode();


  while (current) {

    elements.push(
      current
    );

    current =
      walker.nextNode();

  }


  elements.forEach(
    element => {

      // ---------------------------------------------------
      // Capture safe information BEFORE removing attributes
      // ---------------------------------------------------

      let originalHref =
        null;


      if (
        element.tagName === "A"
      ) {

        originalHref =
          element.getAttribute(
            "href"
          );

      }


      // ---------------------------------------------------
      // Remove dangerous / unsupported elements
      // ---------------------------------------------------

      if (
        !allowedTags.has(
          element.tagName
        )
      ) {

        element.replaceWith(
          document.createTextNode(
            element.textContent
          )
        );

        return;

      }


      // ---------------------------------------------------
      // Remove ALL attributes
      // ---------------------------------------------------

      [...element.attributes]
        .forEach(
          attribute => {

            element.removeAttribute(
              attribute.name
            );

          }
        );


      // ---------------------------------------------------
      // Restore safe links
      // ---------------------------------------------------

      if (
        element.tagName === "A" &&
        originalHref
      ) {

        const href =
          originalHref.trim();


        const isSafeURL =
          href.startsWith("/") ||
          href.startsWith("#") ||
          /^https?:\/\//i.test(
            href
          );


        if (isSafeURL) {

          element.setAttribute(
            "href",
            href
          );


          element.setAttribute(
            "target",
            "_blank"
          );


          element.setAttribute(
            "rel",
            "noopener noreferrer"
          );

        }

      }

    }
  );


  return template.innerHTML;

}


// =========================================================
// MARKDOWN RENDERER
// =========================================================

function renderMarkdown(
  markdown
) {

  const safe =
    escapeHTML(
      markdown
    );


  const lines =
    safe.split("\n");


  let html =
    "";


  let inUnorderedList =
    false;


  let inOrderedList =
    false;


  function closeLists() {

    if (
      inUnorderedList
    ) {

      html +=
        "</ul>";


      inUnorderedList =
        false;

    }


    if (
      inOrderedList
    ) {

      html +=
        "</ol>";


      inOrderedList =
        false;

    }

  }


  lines.forEach(
    line => {

      const trimmed =
        line.trim();


      // ---------------------------------------------------
      // Empty line
      // ---------------------------------------------------

      if (!trimmed) {

        closeLists();

        return;

      }


      // ---------------------------------------------------
      // H3
      // ---------------------------------------------------

      if (
        trimmed.startsWith(
          "### "
        )
      ) {

        closeLists();


        html +=
          `<h3>${formatInline(
            trimmed.slice(4)
          )}</h3>`;


        return;

      }


      // ---------------------------------------------------
      // H2
      // ---------------------------------------------------

      if (
        trimmed.startsWith(
          "## "
        )
      ) {

        closeLists();


        html +=
          `<h2>${formatInline(
            trimmed.slice(3)
          )}</h2>`;


        return;

      }


      // ---------------------------------------------------
      // H1
      // ---------------------------------------------------

      if (
        trimmed.startsWith(
          "# "
        )
      ) {

        closeLists();


        html +=
          `<h1>${formatInline(
            trimmed.slice(2)
          )}</h1>`;


        return;

      }


      // ---------------------------------------------------
      // Unordered list
      // ---------------------------------------------------

      if (
        trimmed.startsWith("- ") ||
        trimmed.startsWith("* ")
      ) {

        if (
          !inUnorderedList
        ) {

          closeLists();


          html +=
            "<ul>";


          inUnorderedList =
            true;

        }


        html +=
          `<li>${formatInline(
            trimmed.slice(2)
          )}</li>`;


        return;

      }


      // ---------------------------------------------------
      // Ordered list
      // ---------------------------------------------------

      if (
        /^\d+\.\s/.test(
          trimmed
        )
      ) {

        if (
          !inOrderedList
        ) {

          closeLists();


          html +=
            "<ol>";


          inOrderedList =
            true;

        }


        html +=
          `<li>${formatInline(
            trimmed.replace(
              /^\d+\.\s/,
              ""
            )
          )}</li>`;


        return;

      }


      // ---------------------------------------------------
      // Paragraph
      // ---------------------------------------------------

      closeLists();


      html +=
        `<p>${formatInline(
          trimmed
        )}</p>`;

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

  if (!element) {
    return;
  }


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
