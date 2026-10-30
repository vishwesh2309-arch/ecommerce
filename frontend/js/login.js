
/* =========================================
   VELORA LOGIN
   Supabase Auth through PHP
========================================= */

document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");

    if (!loginForm) return;

    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const message = document.getElementById("loginMessage");
    const submitButton = loginForm.querySelector(
        'button[type="submit"]'
    );
    const toggleLoginPassword = document.getElementById(
        "toggleLoginPassword"
    );

    // Show or hide password
    if (toggleLoginPassword && passwordInput) {
        toggleLoginPassword.addEventListener("click", function () {
            const showing = passwordInput.type === "password";

            passwordInput.type = showing ? "text" : "password";
            toggleLoginPassword.textContent = showing ? "🙈" : "👁";
            toggleLoginPassword.setAttribute(
                "aria-label",
                showing ? "Hide password" : "Show password"
            );
        });
    }

    function showMessage(text, success = false) {
        message.textContent = text;
        message.style.color = success ? "#2e7d32" : "#c62828";
    }

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;

        message.textContent = "";

        if (!email || !emailInput.validity.valid) {
            showMessage("Please enter a valid email address.");
            emailInput.focus();
            return;
        }

        if (password.length < 8) {
            showMessage(
                "Your password must contain at least 8 characters."
            );
            passwordInput.focus();
            return;
        }

        const originalButtonText = submitButton.textContent;

        submitButton.disabled = true;
        submitButton.textContent = "Logging in...";
        message.textContent = "Verifying your account...";

        try {
            const response = await fetch("../backend/api/login.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                credentials: "same-origin",
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                showMessage(
                    result.message ||
                    "Login failed. Please try again."
                );
                return;
            }

            const user = result.user;

            // Compatibility for existing Velora frontend scripts.
            // These values are display hints, not secure authentication.
            localStorage.setItem("veloraLoggedIn", "true");
            localStorage.setItem(
                "veloraCurrentUser",
                JSON.stringify({
                    id: user.id,
                    name: user.name || "",
                    email: user.email
                })
            );

            // Do not store the password or Supabase access token
            // in localStorage.

            showMessage(
                "Login successful. Redirecting...",
                true
            );

            loginForm.reset();

            window.setTimeout(function () {
                window.location.href = "index.html";
            }, 800);

        } catch (error) {
            console.error("Velora login error:", error);

            showMessage(
                "Could not connect to the server. Please try again."
            );

        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
});
