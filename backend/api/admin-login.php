<?php
declare(strict_types=1);

/**
 * Velora API — Admin Dedicated Login
 * POST /api/admin-login.php
 */

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function sendJson(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    sendJson(405, ['success' => false, 'message' => 'Only POST requests are allowed.']);
}

require_once __DIR__ . '/../includes/env-loader.php';
require_once __DIR__ . '/../config/database.php';

$rawBody = file_get_contents('php://input');
$input = json_decode($rawBody ?: '', true);

if (!is_array($input)) {
    sendJson(400, ['success' => false, 'message' => 'Invalid JSON request.']);
}

$email = strtolower(trim((string)($input['email'] ?? '')));
$password = (string)($input['password'] ?? '');

if ($email === '' || $password === '') {
    sendJson(400, ['success' => false, 'message' => 'Email and password are required.']);
}

$configFile = __DIR__ . '/../config/.env.php';
$config = is_file($configFile) ? (require $configFile) : [];

$supabaseUrl = rtrim((string)(getenv('SUPABASE_URL') ?: ($config['supabase_url'] ?? '')), '/');
$publishableKey = (string)(getenv('SUPABASE_PUBLISHABLE_KEY') ?: ($config['supabase_publishable_key'] ?? ''));

if ($supabaseUrl === '' || $publishableKey === '') {
    sendJson(500, ['success' => false, 'message' => 'Supabase Auth configuration is incomplete.']);
}

// 1. Authenticate credentials via Supabase GoTrue
$authEndpoint = $supabaseUrl . '/auth/v1/token?grant_type=password';
$payload = json_encode(['email' => $email, 'password' => $password]);

$curl = curl_init($authEndpoint);
curl_setopt_array($curl, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'apikey: ' . $publishableKey
    ],
    CURLOPT_POSTFIELDS => $payload
]);

$responseBody = curl_exec($curl);
$curlError = curl_error($curl);
$statusCode = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

if ($responseBody === false) {
    sendJson(502, ['success' => false, 'message' => 'Authentication service unavailable. ' . $curlError]);
}

$result = json_decode($responseBody, true);

if ($statusCode !== 200 || !isset($result['user']['id'])) {
    sendJson(401, ['success' => false, 'message' => 'Invalid admin email or password.']);
}

$user = $result['user'];
$userId = (string)$user['id'];

// 2. Verify that this user exists in public.admin_users
try {
    $statement = $pdo->prepare(
        'SELECT 1 FROM public.admin_users WHERE user_id = CAST(:user_id AS UUID) LIMIT 1'
    );
    $statement->execute(['user_id' => $userId]);

    if ($statement->fetchColumn() === false) {
        sendJson(403, [
            'success' => false,
            'message' => 'Access denied: You do not have administrator permissions.'
        ]);
    }
} catch (Throwable $e) {
    error_log('Admin check failed: ' . $e->getMessage());
    sendJson(500, ['success' => false, 'message' => 'Error verifying admin role.']);
}

// 3. Establish secure PHP session
session_regenerate_id(true);

$_SESSION['velora_user'] = [
    'id' => $userId,
    'email' => $user['email'] ?? $email,
    'name' => $user['user_metadata']['full_name'] ?? 'Administrator',
    'is_admin' => true
];
$_SESSION['supabase_access_token'] = $result['access_token'];
$_SESSION['supabase_refresh_token'] = $result['refresh_token'] ?? null;

sendJson(200, [
    'success' => true,
    'message' => 'Admin authentication successful.',
    'user' => [
        'id' => $userId,
        'email' => $email,
        'name' => $user['user_metadata']['full_name'] ?? 'Administrator'
    ]
]);
