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

if (stripos($contentType, 'application/json') !== false) {
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
} else {
    $input = $_POST;
}

$name = trim((string) ($input['full_name'] ?? $input['name'] ?? ''));
$email = strtolower(trim((string) ($input['email'] ?? '')));
$password = (string) ($input['password'] ?? '');
$phone = trim((string) ($input['phone'] ?? ''));

if ($name === '' || strlen($name) > 150) {
    respond(422, [
        'success' => false,
        'message' => 'Enter a valid full name (maximum 150 characters).'
    ]);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(422, [
        'success' => false,
        'message' => 'Enter a valid email address.'
    ]);
}

if (strlen($password) < 8) {
    respond(422, [
        'success' => false,
        'message' => 'Password must contain at least 8 characters.'
    ]);
}

if (strlen($password) > 128) {
    respond(422, [
        'success' => false,
        'message' => 'Password is too long.'
    ]);
}

if (strlen($phone) > 30) {
    respond(422, [
        'success' => false,
        'message' => 'Phone number is too long.'
    ]);
}

if (!function_exists('curl_init')) {
    respond(500, [
        'success' => false,
        'message' => 'PHP cURL is not enabled on this server.'
    ]);
}

$payload = [
    'email' => $email,
    'password' => $password,
    'data' => [
        'full_name' => $name,
        'phone' => $phone
    ]
];

$redirectUrl = 'http://127.0.0.1:8080/velora-ecommerce/';

$signupUrl = $supabaseUrl . '/auth/v1/signup?redirect_to='
    . rawurlencode($redirectUrl);

$curl = curl_init($signupUrl);

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
    CURLOPT_POSTFIELDS => json_encode($payload)
]);

$responseBody = curl_exec($curl);
$curlError = curl_error($curl);
$statusCode = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);

curl_close($curl);

if ($responseBody === false) {
    error_log('Velora signup request failed: ' . $curlError);

    respond(502, [
        'success' => false,
        'message' => 'Could not contact the authentication service.'
    ]);
}

$result = json_decode($responseBody, true);

if (!is_array($result)) {
    error_log('Velora signup returned invalid JSON.');

    respond(502, [
        'success' => false,
        'message' => 'Authentication service returned an invalid response.'
    ]);
}

if ($statusCode < 200 || $statusCode >= 300) {
    $authMessage = (string) (
        $result['msg'] ??
        $result['message'] ??
        $result['error_description'] ??
        $result['error'] ??
        ''
    );

    error_log(
        'Velora signup rejected. HTTP ' . $statusCode .
        '; message: ' . substr($authMessage, 0, 300)
    );

    $publicMessage = 'Registration failed. Check your details and try again.';

    if ($statusCode === 429) {
        $publicMessage = 'Too many attempts. Please wait before trying again.';
    } elseif ($statusCode === 422 || $statusCode === 400) {
        $publicMessage = 'Registration could not be completed. Check your details; the email may already be registered.';
    }

    respond(
        $statusCode >= 500 ? 502 : $statusCode,
        [
            'success' => false,
            'message' => $publicMessage
        ]
    );
}

$user = $result['user'] ?? $result;

$userId = $user['id'] ?? null;

if (
    !is_string($userId) ||
    !preg_match(
        '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i',
        $userId
    )
) {
    respond(502, [
        'success' => false,
        'message' => 'Registration response did not contain a valid user ID.'
    ]);
}

/*
 * Email confirmation is enabled.
 * Do not create an authenticated PHP session here.
 *
 * Profile creation is handled separately after the Auth account
 * has been created. A database trigger is preferable for reliable
 * profile creation, including registrations outside this endpoint.
 */

respond(201, [
    'success' => true,
    'message' => 'Registration submitted. Check your email for the confirmation link.',
    'email_confirmation_required' => true
]);
