<?php
declare(strict_types=1);

/**
 * Velora customer authentication helpers.
 *
 * Requires includes/bootstrap.php to be loaded first.
 */

if (!function_exists('requireCustomer')) {
    function requireCustomer(): int
    {
        return requireLogin();
    }
}

if (!function_exists('isCustomerLoggedIn')) {
    function isCustomerLoggedIn(): bool
    {
        return currentUserId() !== null;
    }
}

if (!function_exists('setCustomerSession')) {
    function setCustomerSession(int $userId): void
    {
        if ($userId < 1) {
            jsonError('Invalid customer account.', 400);
        }

        session_regenerate_id(true);

        $_SESSION['user_id'] = $userId;
        $_SESSION['user_role'] = 'customer';
    }
}

if (!function_exists('clearCustomerSession')) {
    function clearCustomerSession(): void
    {
        unset($_SESSION['user_id'], $_SESSION['user_role']);
        session_regenerate_id(true);
    }
}
