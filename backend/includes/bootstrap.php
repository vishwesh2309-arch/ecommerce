<?php
declare(strict_types=1);

/**
 * Velora shared API bootstrap.
 */

if (session_status() !== PHP_SESSION_ACTIVE) {
    $isHttps = (
        !empty($_SERVER['HTTPS']) &&
        $_SERVER['HTTPS'] !== 'off'
    );

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    session_start();
}

require_once __DIR__ . '/response.php';
require_once dirname(__DIR__) . '/config/database.php';

if (!function_exists('requireMethod')) {
    function requireMethod(array $allowedMethods): void
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

        if (!in_array($method, $allowedMethods, true)) {
            header('Allow: ' . implode(', ', $allowedMethods));
            jsonError('HTTP method not allowed.', 405);
        }
    }
}

if (!function_exists('requirePositiveId')) {
    function requirePositiveId(mixed $value): int
    {
        $id = filter_var($value, FILTER_VALIDATE_INT);

        if ($id === false || $id < 1) {
            jsonError('A valid positive ID is required.', 400);
        }

        return (int) $id;
    }
}

if (!function_exists('currentUserId')) {
    function currentUserId(): ?int
    {
        $userId = $_SESSION['user_id'] ?? null;

        if (!is_numeric($userId) || (int) $userId < 1) {
            return null;
        }

        return (int) $userId;
    }
}

if (!function_exists('requireLogin')) {
    function requireLogin(): int
    {
        $userId = currentUserId();

        if ($userId === null) {
            jsonError('Please sign in to continue.', 401);
        }

        return $userId;
    }
}
