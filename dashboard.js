 // =========================================================
// SECORA V0.3.2 — DYNAMIC DASHBOARD
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {

  // =======================================================
  // ELEMENTS
  // =======================================================

  const welcomeName =
    document.getElementById("welcomeName");

  const topUserName =
    document.getElementById("topUserName");

  const userAvatar =
    document.getElementById("userAvatar");

  const currentDate =
    document.getElementById("currentDate");

  const logoutBtn =
    document.getElementById("logoutBtn");

  const courseGrid =
    document.querySelector(".course-grid");


  // =======================================================
  // AUTHENTICATION
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

  console.log("Secora user:", user);


  // =======================================================
  // USER INFORMATION
  // =======================================================

  const metadata =
    user.user_metadata || {};


  const name =
    metadata.full_name ||
    metadata.name ||
    metadata.user_name ||
    user.email?.split("@")[0] ||
    "Student";


  const firstName =
    name.split(" ")[0];


  if (welcomeName) {
    welcomeName.textContent = firstName;
  }


  if (topUserName) {
    topUserName.textContent = name;
  }


  // =======================================================
  // AVATAR
  // =======================================================

  const avatarUrl =
    metadata.avatar_url ||
    metadata.picture;


  if (userAvatar) {

    if (avatarUrl) {

      const img =
        document.createElement("img");

      img.src = avatarUrl;
      img.alt = name;

      img.onerror = () => {

        userAvatar.innerHTML =
          firstName.charAt(0).toUpperCase();

      };

      userAvatar.innerHTML = "";

      userAvatar.appendChild(img);

    } else {

      userAvatar.textContent =
        firstName.charAt(0).toUpperCase();

    }

  }


  // =======================================================
  // DATE
  // =======================================================

  if (currentDate) {

    const today =
      new Date();

    currentDate.textContent =
      today.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });

  }


  // =======================================================
  // LOAD PROFILE
  // =======================================================

  try {

    const {
      data: profile,
      error
    } = await secoraSupabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();


    if (!error && profile) {

      if (profile.display_name) {

        const profileFirstName =
          profile.display_name.split(" ")[0];


        if (welcomeName) {

          welcomeName.textContent =
            profileFirstName;

        }


        if (topUserName) {

          topUserName.textContent =
            profile.display_name;

        }

      }


      if (profile.avatar_url && userAvatar) {

        const img =
          document.createElement("img");

        img.src =
          profile.avatar_url;

        img.alt =
          profile.display_name || name;

        userAvatar.innerHTML = "";

        userAvatar.appendChild(img);

      }

    }

  } catch (error) {

    console.warn(
      "Profile could not be loaded:",
      error
    );

  }


  // =======================================================
  // LOAD COURSES
  // =======================================================

  await loadCourses();


  // =======================================================
  // LOGOUT
  // =======================================================

  if (logoutBtn) {

    logoutBtn.addEventListener(
      "click",
      async () => {

        logoutBtn.disabled = true;

        logoutBtn.innerHTML =
          "<span>↪</span> Logging out...";


        const { error } =
          await secoraSupabase.auth.signOut();


        if (error) {

          console.error(
            "Logout error:",
            error
          );


          logoutBtn.disabled = false;

          logoutBtn.innerHTML =
            "<span>↪</span> Log out";

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
// LOAD COURSES FROM SUPABASE
// =========================================================

async function loadCourses() {

  const courseGrid =
    document.querySelector(".course-grid");


  if (!courseGrid) {
    return;
  }


  // Loading state

  courseGrid.innerHTML = `

    <div class="course-loading">
      Loading courses...
    </div>

  `;


  // Fetch published courses

  const {
    data: courses,
    error
  } = await secoraSupabase
    .from("courses")
    .select(`
      id,
      title,
      slug,
      description,
      level,
      modules (
        id
      )
    `)
    .eq("published", true)
    .order("created_at", {
      ascending: true
    });


  // Error

  if (error) {

    console.error(
      "Course loading error:",
      error
    );


    courseGrid.innerHTML = `

      <div class="course-loading">
        Unable to load courses.
      </div>

    `;

    return;
  }


  // No courses

  if (!courses || courses.length === 0) {

    courseGrid.innerHTML = `

      <div class="course-loading">
        No courses available yet.
      </div>

    `;

    return;
  }


  // =======================================================
  // GENERATE COURSE CARDS
  // =======================================================

  courseGrid.innerHTML = "";


  courses.forEach(
    (course, index) => {

      const article =
        document.createElement("article");


      article.className =
        "course-card";


      const moduleCount =
        course.modules?.length || 0;


      const number =
        String(index + 1)
          .padStart(2, "0");


      const level =
        (course.level || "beginner")
          .toUpperCase();


      article.innerHTML = `

        <div class="course-number">
          ${number}
        </div>


        <div class="course-meta">

          <span class="level beginner">
            ${level}
          </span>

          <span>
            ${moduleCount} MODULE${moduleCount === 1 ? "" : "S"}
          </span>

        </div>


        <h3>
          ${escapeHTML(course.title)}
        </h3>


        <p>
          ${escapeHTML(course.description || "")}
        </p>


        <div class="course-footer">

          <span>
            Course
          </span>


          <button
            type="button"
            class="course-explore"
            data-slug="${escapeHTML(course.slug)}"
          >
            Explore →
          </button>

        </div>

      `;


      courseGrid.appendChild(article);

    }
  );


  // =======================================================
  // COURSE BUTTONS
  // =======================================================

  document
    .querySelectorAll(".course-explore")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const slug =
            button.dataset.slug;


          if (!slug) {
            return;
          }


          window.location.href =
            `course.html?slug=${encodeURIComponent(slug)}`;

        }
      );

    });

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
/* =========================================================
   DYNAMIC COURSE STATES
   ========================================================= */

.course-loading {
  grid-column: 1 / -1;

  min-height: 180px;

  background: #ffffff;

  border: 1px solid var(--line);

  border-radius: 8px;

  display: flex;
  align-items: center;
  justify-content: center;

  font-family: var(--font-ui);

  font-size: 12px;
  font-weight: 500;

  color: var(--muted);
}
