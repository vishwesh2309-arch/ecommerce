<?php
declare(strict_types=1);

/**
 * Velora API — Check Admin Session Status
 * GET /api/admin-session.php
 */

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

require_once __DIR__ . '/../config/database.php';

$user = $_SESSION['velora_user'] ?? null;
$userId = is_array($user) ? ($user['id'] ?? null) : null;

if (!is_string($userId) || $userId === '') {
    echo json_encode([
        'authenticated' => false,
        'isAdmin' => false,
        'message' => 'Not logged in'
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
    $isAdmin = $statement->fetchColumn() !== false;

    echo json_encode([
        'authenticated' => true,
        'isAdmin' => $isAdmin,
        'user' => [
            'id' => $userId,
            'email' => $user['email'] ?? '',
            'name' => $user['name'] ?? ''
        ]
    ]);
} catch (Throwable $e) {
    echo json_encode([
        'authenticated' => true,
        'isAdmin' => false,
        'error' => $e->getMessage()
    ]);
}
