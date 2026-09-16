// Secora - Update Password

const form = document.getElementById("updatePasswordForm");
const password = document.getElementById("password");
const confirm = document.getElementById("confirmPassword");
const btn = document.getElementById("updatePasswordBtn");
const status = document.getElementById("status");

let recoverySessionReady = false;

function showStatus(message, type) {
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = "block";
}

// Listen for Supabase password recovery
secoraSupabase.auth.onAuthStateChange((event, session) => {
  console.log("Supabase auth event:", event);

  if (event === "PASSWORD_RECOVERY" && session) {
    recoverySessionReady = true;

    showStatus(
      "Recovery session verified. Choose your new password.",
      "success"
    );
  }
});

// Check whether a recovery session already exists
(async function checkRecoverySession() {
  try {
    const { data, error } = await secoraSupabase.auth.getSession();

    if (error) {
      console.error("Session error:", error);
      showStatus("Unable to verify the recovery session.", "error");
      return;
    }

    if (data.session) {
      recoverySessionReady = true;
      console.log("Recovery session found.");
    } else {
      console.warn("No active recovery session found.");
      showStatus(
        "Recovery session not found. Please request a new password reset link.",
        "error"
      );
    }
  } catch (err) {
    console.error("Recovery check failed:", err);
    showStatus("Something went wrong. Please request a new reset link.", "error");
  }
})();

// Update password
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const newPassword = password.value;
  const confirmPassword = confirm.value;

  if (newPassword.length < 6) {
    showStatus(
      "Password must contain at least 6 characters.",
      "error"
    );
    return;
  }

  if (newPassword !== confirmPassword) {
    showStatus(
      "Passwords do not match.",
      "error"
    );
    return;
  }

  btn.disabled = true;
  btn.querySelector("span").textContent = "Updating...";

  try {
    // Make sure Supabase has a session
    const { data: sessionData, error: sessionError } =
      await secoraSupabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (!sessionData.session) {
      throw new Error(
        "Your recovery session is missing or has expired. Please request a new reset link."
      );
    }

    // Update password
    const { error } = await secoraSupabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw error;
    }

    showStatus(
      "Password updated successfully! Redirecting to login...",
      "success"
    );

    // Sign out so the user must log in with the new password
    await secoraSupabase.auth.signOut();

    setTimeout(() => {
      window.location.replace("index.html");
    }, 1500);

  } catch (error) {
    console.error("Password update error:", error);

    showStatus(
      error.message || "Unable to update password. Please try again.",
      "error"
    );

    btn.disabled = false;
    btn.querySelector("span").textContent = "Update password";
  }
});
