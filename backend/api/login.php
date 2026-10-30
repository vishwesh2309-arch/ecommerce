<?php
declare(strict_types=1);

session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, [
        'success' => false,
        'message' => 'Only POST requests are allowed.'
    ]);
}

$configFile = dirname(__DIR__) . '/config/.env.php';

if (!is_file($configFile)) {
    respond(500, [
        'success' => false,
        'message' => 'Server configuration is missing.'
    ]);
}

$config = require $configFile;

$supabaseUrl = rtrim(
    (string) ($config['supabase_url'] ?? ''),
    '/'
);

$publishableKey = (string) (
    $config['supabase_publishable_key'] ?? ''
);

if (
    !filter_var($supabaseUrl, FILTER_VALIDATE_URL) ||
    !str_starts_with($supabaseUrl, 'https://') ||
    $publishableKey === ''
) {
    respond(500, [
        'success' => false,
        'message' => 'Supabase Auth configuration is incomplete.'
    ]);
}

$contentType = $_SERVER['CONTENT_TYPE'] ?? '';

if (stripos($contentType, 'application/json') === false) {
    respond(400, [
        'success' => false,
        'message' => 'Expected a JSON request.'
    ]);
}

$input = json_decode(
    file_get_contents('php://input'),
    true
);

if (!is_array($input)) {
    respond(400, [
        'success' => false,
        'message' => 'Invalid JSON request.'
    ]);
}

$email = strtolower(trim((string) ($input['email'] ?? '')));
$password = (string) ($input['password'] ?? '');

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(422, [
        'success' => false,
        'message' => 'Please enter a valid email address.'
    ]);
}

if ($password === '' || strlen($password) > 128) {
    respond(422, [
        'success' => false,
        'message' => 'Please enter a valid password.'
    ]);
}

if (!function_exists('curl_init')) {
    respond(500, [
        'success' => false,
        'message' => 'PHP cURL is not enabled.'
    ]);
}

$payload = json_encode([
    'email' => $email,
    'password' => $password
]);

$curl = curl_init(
    $supabaseUrl . '/auth/v1/token?grant_type=password'
);

curl_setopt_array($curl, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Accept: application/json',
        'apikey: ' . $publishableKey
    ],
    CURLOPT_POSTFIELDS => $payload
]);

$responseBody = curl_exec($curl);
$curlError = curl_error($curl);
$statusCode = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);

curl_close($curl);

if ($responseBody === false) {
    error_log('Velora login request failed: ' . $curlError);

    respond(502, [
        'success' => false,
        'message' => 'Could not contact the authentication service.'
    ]);
}

$result = json_decode($responseBody, true);

if (!is_array($result)) {
    respond(502, [
        'success' => false,
        'message' => 'Authentication service returned an invalid response.'
    ]);
}

if (
    $statusCode < 200 ||
    $statusCode >= 300 ||
    !isset($result['user']['id']) ||
    !isset($result['access_token'])
) {
    $authMessage = strtolower(
        (string) (
            $result['msg'] ??
            $result['message'] ??
            $result['error_description'] ??
            $result['error'] ??
            ''
        )
    );

    error_log(
        'Velora login rejected. HTTP ' . $statusCode .
        '; message: ' . substr($authMessage, 0, 300)
    );

    if (
        str_contains($authMessage, 'confirm') ||
        str_contains($authMessage, 'not confirmed')
    ) {
        respond(401, [
            'success' => false,
            'message' => 'Please confirm your email address before logging in.'
        ]);
    }

    if ($statusCode === 429) {
        respond(429, [
            'success' => false,
            'message' => 'Too many login attempts. Please wait and try again.'
        ]);
    }

    respond(401, [
        'success' => false,
        'message' => 'Incorrect email or password.'
    ]);
}

$user = $result['user'];

if (
    !isset($user['email_confirmed_at']) ||
    $user['email_confirmed_at'] === null
) {
    respond(401, [
        'success' => false,
        'message' => 'Please confirm your email address before logging in.'
    ]);
}

/*
 * Establish a PHP session after successful Supabase authentication.
 * Tokens remain server-side in the PHP session.
 */
session_regenerate_id(true);

$_SESSION['velora_user'] = [
    'id' => $user['id'],
    'email' => $user['email'] ?? $email,
    'name' => $user['user_metadata']['full_name'] ?? ''
];

$_SESSION['supabase_access_token'] = $result['access_token'];
$_SESSION['supabase_refresh_token'] = $result['refresh_token'] ?? null;

respond(200, [
    'success' => true,
    'message' => 'Login successful.',
    'user' => [
        'id' => $user['id'],
        'email' => $user['email'] ?? $email,
        'name' => $user['user_metadata']['full_name'] ?? ''
    ]
]);
