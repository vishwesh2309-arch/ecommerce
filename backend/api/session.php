<?php
declare(strict_types=1);

session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$user = $_SESSION['velora_user'] ?? null;

if (!is_array($user) || empty($user['id'])) {
    http_response_code(401);

    echo json_encode([
        'success' => false,
        'authenticated' => false
    ]);
    exit;
}

echo json_encode([
    'success' => true,
    'authenticated' => true,
    'user' => [
        'id' => $user['id'],
        'email' => $user['email'] ?? '',
        'name' => $user['name'] ?? ''
    ]
]);
