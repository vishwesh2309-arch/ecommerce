<?php
declare(strict_types=1);

/**
 * Velora — Server-side administrator authorization
 *
 * Requires the existing PHP session and the Supabase PDO connection.
 */

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

function requireVeloraAdmin(PDO $pdo): void
{
    $user = $_SESSION['velora_user'] ?? null;
    $userId = is_array($user) ? ($user['id'] ?? null) : null;

    if (!is_string($userId) || $userId === '') {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'authenticated' => false,
            'message' => 'Your admin session has expired. Please log in again to continue.'
        ]);
        exit;
    }

    try {
        $statement = $pdo->prepare(
            'SELECT 1
             FROM public.admin_users
             WHERE user_id = CAST(:user_id AS UUID)
             LIMIT 1'
        );

        $statement->execute(['user_id' => $userId]);

        if ($statement->fetchColumn() === false) {
            http_response_code(403);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'success' => false,
                'message' => 'Access denied. Administrator permission is required.'
            ]);
            exit;
        }
    } catch (Throwable $exception) {
        error_log(
            'Velora admin authorization failed: ' .
            $exception->getMessage()
        );

        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'message' => 'Unable to verify administrator access.'
        ]);
        exit;
    }
}
