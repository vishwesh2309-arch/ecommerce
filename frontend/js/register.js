
/* =========================================
   VELORA REGISTRATION
   Supabase Auth through PHP API
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("registerForm");

    if (!registerForm) {
        console.error("Velora: registerForm not found.");
        return;
    }

    const nameInput = document.getElementById("registerName");
    const emailInput = document.getElementById("registerEmail");
    const passwordInput = document.getElementById("registerPassword");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const message = document.getElementById("registerMessage");
    const submitButton = registerForm.querySelector('[type="submit"]');

    if (
        !nameInput ||
        !emailInput ||
        !passwordInput ||
        !confirmPasswordInput ||
        !message ||
        !submitButton
    ) {
        console.error("Velora: Registration form elements are missing.");
        return;
    }

    console.log("Velora: registration API integration loaded.");

    // Show or hide password.
    function setupPasswordToggle(buttonId, input) {
        const button = document.getElementById(buttonId);

        if (!button) return;

        button.addEventListener("click", () => {
            const showPassword = input.type === "password";

            input.type = showPassword ? "text" : "password";
            button.textContent = showPassword ? "🙈" : "👁";
            button.setAttribute(
                "aria-label",
                showPassword ? "Hide password" : "Show password"
            );
        });
    }

    setupPasswordToggle("toggleRegisterPassword", passwordInput);
    setupPasswordToggle("toggleConfirmPassword", confirmPasswordInput);

    function showMessage(text, success = false) {
        message.textContent = text;
        message.style.color = success ? "#2e7d32" : "#c62828";
    }

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (submitButton.disabled) return;

        showMessage("");

        const fullName = nameInput.value.trim();
        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Validate name.
        if (fullName.length < 2 || fullName.length > 100) {
            showMessage("Please enter your full name using 2 to 100 characters.");
            nameInput.focus();
            return;
        }

        // Validate email.
        if (!email || !emailInput.validity.valid) {
            showMessage("Please enter a valid email address.");
            emailInput.focus();
            return;
        }

        // Validate password.
        if (password.length < 8 || password.length > 128) {
            showMessage("Your password must contain 8 to 128 characters.");
            passwordInput.focus();
            return;
        }

        // Confirm password locally. Never send it separately.
        if (password !== confirmPassword) {
            showMessage("Your passwords do not match.");
            confirmPasswordInput.focus();
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Creating account...";

        try {
            const response = await fetch("../backend/api/register.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    full_name: fullName,
                    email: email,
                    password: password
                })
            });

            let result;

            try {
                result = await response.json();
            } catch {
                throw new Error(
                    "The server returned an invalid response. Check the PHP API."
                );
            }

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Registration failed. Please try again."
                );
            }

            registerForm.reset();

            showMessage(
                result.message ||
                "Registration submitted. Check your email for a confirmation link.",
                true
            );

            // Do not automatically log in: email confirmation is enabled.
            // Keep the user on this page so they can read the message.

        } catch (error) {
            console.error("Velora registration error:", error);

            showMessage(
                error.message ||
                "Unable to contact the server. Check your connection and try again."
            );
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Create Account";
        }
    });
});
