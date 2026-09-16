 // ==========================================
// SECORA V0.3 — DASHBOARD
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {

  const {
    data: { session },
    error: sessionError
  } = await secoraSupabase.auth.getSession();

  // No authenticated user
  if (sessionError || !session) {
    window.location.replace("index.html");
    return;
  }

  const user = session.user;

  console.log("Secora user:", user);

  // ------------------------------------------
  // USER INFORMATION
  // ------------------------------------------

  const metadata = user.user_metadata || {};

  const name =
    metadata.full_name ||
    metadata.name ||
    metadata.user_name ||
    user.email?.split("@")[0] ||
    "Student";

  const firstName = name.split(" ")[0];

  document.getElementById("welcomeName").textContent = firstName;
  document.getElementById("topUserName").textContent = name;


  // ------------------------------------------
  // AVATAR
  // ------------------------------------------

  const avatar = document.getElementById("userAvatar");

  const avatarUrl =
    metadata.avatar_url ||
    metadata.picture;

  if (avatarUrl) {

    const img = document.createElement("img");

    img.src = avatarUrl;
    img.alt = name;

    img.onerror = () => {
      avatar.textContent = firstName.charAt(0).toUpperCase();
    };

    avatar.textContent = "";
    avatar.appendChild(img);

  } else {

    avatar.textContent =
      firstName.charAt(0).toUpperCase();

  }


  // ------------------------------------------
  // DATE
  // ------------------------------------------

  const dateElement =
    document.getElementById("currentDate");

  const today = new Date();

  dateElement.textContent =
    today.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });


  // ------------------------------------------
  // LOGOUT
  // ------------------------------------------

  document
    .getElementById("logoutBtn")
    .addEventListener("click", async () => {

      const button =
        document.getElementById("logoutBtn");

      button.disabled = true;
      button.textContent = "Logging out...";

      const { error } =
        await secoraSupabase.auth.signOut();

      if (error) {

        console.error("Logout error:", error);

        button.disabled = false;
        button.innerHTML = "<span>↪</span> Log out";

        return;
      }

      window.location.replace("index.html");

    });


  // ------------------------------------------
  // PROFILE DATA
  // ------------------------------------------

  try {

    const { data: profile, error } =
      await secoraSupabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

    if (!error && profile) {

      if (profile.display_name) {

        document.getElementById(
          "welcomeName"
        ).textContent =
          profile.display_name.split(" ")[0];

        document.getElementById(
          "topUserName"
        ).textContent =
          profile.display_name;
      }

      if (profile.avatar_url) {

        const img =
          document.createElement("img");

        img.src = profile.avatar_url;
        img.alt = profile.display_name || name;

        avatar.textContent = "";
        avatar.appendChild(img);
      }

    }

  } catch (error) {

    console.warn(
      "Profile could not be loaded:",
      error
    );

  }

});
