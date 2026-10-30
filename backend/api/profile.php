<?php
declare(strict_types=1);

session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

function sendJson(int $status, array $data): void
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

// Require a valid PHP login session.
if (
    !isset($_SESSION['velora_user']) ||
    !is_array($_SESSION['velora_user']) ||
    empty($_SESSION['velora_user']['id'])
) {
    sendJson(401, [
        'success' => false,
        'message' => 'Please log in to access your profile.'
    ]);
}

$userId = (string) $_SESSION['velora_user']['id'];
$userEmail = (string) ($_SESSION['velora_user']['email'] ?? '');

try {
    require_once __DIR__ . '/../config/database.php';

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $statement = $pdo->prepare(
            'SELECT full_name, phone
             FROM public.profiles
             WHERE id = :id
             LIMIT 1'
        );

        $statement->execute(['id' => $userId]);
        $profile = $statement->fetch();

        if (!$profile) {
            sendJson(404, [
                'success' => false,
                'message' => 'Profile not found.'
            ]);
        }

        sendJson(200, [
            'success' => true,
            'user' => [
                'id' => $userId,
                'name' => (string) ($profile['full_name'] ?? ''),
                'email' => $userEmail,
                'phone' => (string) ($profile['phone'] ?? '')
            ]
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(
            file_get_contents('php://input'),
            true
        );

        if (!is_array($input)) {
            sendJson(400, [
                'success' => false,
                'message' => 'Invalid request data.'
            ]);
        }

        $fullName = trim((string) ($input['full_name'] ?? ''));

        if ($fullName === '') {
            sendJson(422, [
                'success' => false,
                'message' => 'Full name is required.'
            ]);
        }

        if (mb_strlen($fullName) > 100) {
            sendJson(422, [
                'success' => false,
                'message' => 'Full name must be 100 characters or fewer.'
            ]);
        }

        // Only update the profile belonging to this session.
        $statement = $pdo->prepare(
            'UPDATE public.profiles
             SET full_name = :full_name,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id
             RETURNING full_name, phone'
        );

        $statement->execute([
            'full_name' => $fullName,
            'id' => $userId
        ]);

        $profile = $statement->fetch();

        if (!$profile) {
            sendJson(404, [
                'success' => false,
                'message' => 'Profile not found.'
            ]);
        }

        // Keep the current session name in sync.
        $_SESSION['velora_user']['name'] = $fullName;

        sendJson(200, [
            'success' => true,
            'message' => 'Profile updated successfully.',
            'user' => [
                'id' => $userId,
                'name' => (string) $profile['full_name'],
                'email' => $userEmail,
                'phone' => (string) ($profile['phone'] ?? '')
            ]
        ]);
    }

    header('Allow: GET, POST');

    sendJson(405, [
        'success' => false,
        'message' => 'Method not allowed.'
    ]);

} catch (Throwable $exception) {
    error_log('Velora profile API error: ' . $exception->getMessage());

    sendJson(500, [
        'success' => false,
        'message' => 'A server error occurred while accessing your profile.'
    ]);
}
