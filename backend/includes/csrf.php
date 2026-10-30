<?php
declare(strict_types=1);

/**
 * Velora CSRF protection helpers.
 * Requires bootstrap.php to start the PHP session first.
 */

if (!function_exists('generateCsrfToken')) {
    function generateCsrfToken(): string
    {
        if (
            !isset($_SESSION['csrf_token']) ||
            !is_string($_SESSION['csrf_token']) ||
            $_SESSION['csrf_token'] === ''
        ) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }

        return $_SESSION['csrf_token'];
    }
}

if (!function_exists('validateCsrfToken')) {
    function validateCsrfToken(?string $token): bool
    {
        if (
            !isset($_SESSION['csrf_token']) ||
            !is_string($_SESSION['csrf_token']) ||
            !is_string($token) ||
            $token === ''
        ) {
            return false;
        }

        return hash_equals($_SESSION['csrf_token'], $token);
    }
}

if (!function_exists('requireValidCsrfToken')) {
    function requireValidCsrfToken(): void
    {
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;

        if (!is_string($token) || $token === '') {
            $input = getJsonInput();
            $token = $input['_csrf_token'] ?? null;
        }

        if (!is_string($token) || !validateCsrfToken($token)) {
            jsonError(
                'Invalid or missing CSRF token. Please refresh and try again.',
                403
            );
        }
    }
}
