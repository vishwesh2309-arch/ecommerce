<?php
declare(strict_types=1);

session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

function respond(int $status, array $data): void
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, [
        'success' => false,
        'message' => 'Method not allowed.'
    ]);
}

if (
    empty($_SESSION['velora_user']['id']) ||
    empty($_SESSION['velora_user']['email'])
) {
    respond(401, [
        'success' => false,
        'message' => 'Please log in again.'
    ]);
}

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    respond(400, [
        'success' => false,
        'message' => 'Invalid request data.'
    ]);
}

$currentPassword = (string) ($input['current_password'] ?? '');
$newPassword = (string) ($input['new_password'] ?? '');
$confirmPassword = (string) ($input['confirm_new_password'] ?? '');

if (
    $currentPassword === '' ||
    $newPassword === '' ||
    $confirmPassword === ''
) {
    respond(422, [
        'success' => false,
        'message' => 'Please complete all password fields.'
    ]);
}

if (strlen($newPassword) < 8 || strlen($newPassword) > 4096) {
    respond(422, [
        'success' => false,
        'message' => 'The new password must contain 8 to 4096 characters.'
    ]);
}

if ($newPassword !== $confirmPassword) {
    respond(422, [
        'success' => false,
        'message' => 'The new passwords do not match.'
    ]);
}

if ($newPassword === $currentPassword) {
    respond(422, [
        'success' => false,
        'message' => 'Your new password must differ from your current password.'
    ]);
}

try {
    $config = require __DIR__ . '/../config/.env.php';

    $supabaseUrl = rtrim(
        (string) ($config['supabase_url'] ?? ''),
        '/'
    );

    $publishableKey = (string) (
        $config['supabase_publishable_key'] ?? ''
    );

    if ($supabaseUrl === '' || $publishableKey === '') {
        throw new RuntimeException('Supabase configuration is incomplete.');
    }

    if (!function_exists('curl_init')) {
        throw new RuntimeException('PHP cURL is not available.');
    }

    $email = (string) $_SESSION['velora_user']['email'];
    $sessionUserId = (string) $_SESSION['velora_user']['id'];

    // Verify the current password with Supabase Auth.
    $verifyPayload = json_encode([
        'email' => $email,
        'password' => $currentPassword
    ]);

    $curl = curl_init(
        $supabaseUrl . '/auth/v1/token?grant_type=password'
    );

    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $verifyPayload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'apikey: ' . $publishableKey
        ],
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 20
    ]);

    $verifyResponse = curl_exec($curl);
    $verifyStatus = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $curlError = curl_error($curl);
    curl_close($curl);

    if ($verifyResponse === false) {
        error_log('Velora password verification request failed: ' . $curlError);

        respond(502, [
            'success' => false,
            'message' => 'Could not contact the authentication service. Please try again.'
        ]);
    }

    $verified = json_decode($verifyResponse, true);

    if (
        $verifyStatus < 200 ||
        $verifyStatus >= 300 ||
        !is_array($verified) ||
        empty($verified['access_token']) ||
        empty($verified['user']['id']) ||
        (string) $verified['user']['id'] !== $sessionUserId
    ) {
        respond(422, [
            'success' => false,
            'message' => 'Your current password is incorrect.'
        ]);
    }

    // Change the password using the short-lived token returned
    // by the successful password verification. Never send this token
    // to the browser or store it in localStorage.
    $updatePayload = json_encode([
        'password' => $newPassword
    ]);

    $curl = curl_init($supabaseUrl . '/auth/v1/user');

    curl_setopt_array($curl, [
        CURLOPT_CUSTOMREQUEST => 'PUT',
        CURLOPT_POSTFIELDS => $updatePayload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'apikey: ' . $publishableKey,
            'Authorization: Bearer ' . $verified['access_token']
        ],
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 20
    ]);

    $updateResponse = curl_exec($curl);
    $updateStatus = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $curlError = curl_error($curl);
    curl_close($curl);

    if ($updateResponse === false) {
        error_log('Velora password update request failed: ' . $curlError);

        respond(502, [
            'success' => false,
            'message' => 'Could not contact the authentication service. Please try again.'
        ]);
    }

    if ($updateStatus < 200 || $updateStatus >= 300) {
        error_log(
            'Velora password update rejected by Supabase. HTTP ' .
            $updateStatus . '; response: ' . substr($updateResponse, 0, 500)
        );

        respond(422, [
            'success' => false,
            'message' => 'Supabase could not update the password. Check its password requirements and try again.'
        ]);
    }

    respond(200, [
        'success' => true,
        'message' => 'Password updated successfully.'
    ]);

} catch (Throwable $exception) {
    error_log('Velora password API error: ' . $exception->getMessage());

    respond(500, [
        'success' => false,
        'message' => 'A server error occurred while updating your password.'
    ]);
}
