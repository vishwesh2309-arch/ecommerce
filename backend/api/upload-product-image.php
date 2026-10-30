<?php
declare(strict_types=1);

/*
 * VELORA — Product Image Upload API
 * Stage 23.5.1
 *
 * Requires:
 * - Existing database.php
 * - config/.env.php containing supabase_url
 *   and supabase_publishable_key
 * - Existing admin authentication
 */

header('Content-Type: application/json; charset=utf-8');

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
        'message' => 'POST requests only.'
    ]);
}

try {
    require_once __DIR__ . '/../config/database.php';
    require_once __DIR__ . '/../includes/admin-auth.php';

    requireVeloraAdmin($pdo);

    $config = require __DIR__ . '/../config/.env.php';

    $supabaseUrl = rtrim(
        (string) (getenv('SUPABASE_URL') ?: ($config['supabase_url'] ?? '')),
        '/'
    );

    $publishableKey = (string) (
        $config['supabase_publishable_key'] ?? ''
    );

    if (
        $supabaseUrl === '' ||
        $publishableKey === '' ||
        !filter_var($supabaseUrl, FILTER_VALIDATE_URL)
    ) {
        respond(500, [
            'success' => false,
            'message' => 'Supabase configuration is incomplete.'
        ]);
    }

    if (
        !isset($_FILES['image']) ||
        $_FILES['image']['error'] !== UPLOAD_ERR_OK
    ) {
        respond(400, [
            'success' => false,
            'message' => 'Choose an image and try again.'
        ]);
    }

    $file = $_FILES['image'];

    if ($file['size'] > 5 * 1024 * 1024) {
        respond(400, [
            'success' => false,
            'message' => 'Image size must be 5 MB or less.'
        ]);
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']);

    $allowedTypes = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
    ];

    if (!isset($allowedTypes[$mime])) {
        respond(400, [
            'success' => false,
            'message' => 'Use a JPG, PNG, or WebP image.'
        ]);
    }

    $extension = $allowedTypes[$mime];

    // Generate a safe, unique object name.
    $objectName = 'product-' .
        bin2hex(random_bytes(16)) . '.' . $extension;

    $storagePath = 'product-images/' . $objectName;

    $uploadUrl = $supabaseUrl .
        '/storage/v1/object/' . $storagePath;

    $fileContents = file_get_contents($file['tmp_name']);

    if ($fileContents === false) {
        respond(500, [
            'success' => false,
            'message' => 'Could not read the uploaded image.'
        ]);
    }

    $curl = curl_init($uploadUrl);

    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $fileContents,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => [
            'apikey: ' . $publishableKey,
            'Authorization: Bearer ' . $publishableKey,
            'Content-Type: ' . $mime,
            'x-upsert: false'
        ],
    ]);

    $response = curl_exec($curl);
    $httpCode = (int) curl_getinfo(
        $curl,
        CURLINFO_HTTP_CODE
    );
    $curlError = curl_error($curl);

    curl_close($curl);

    if ($response === false || $curlError !== '') {
        error_log('Velora Storage upload transport error.');
        respond(502, [
            'success' => false,
            'message' => 'Could not reach Supabase Storage.'
        ]);
    }

    if ($httpCode < 200 || $httpCode >= 300) {
        error_log(
            'Velora Storage upload failed with HTTP ' . $httpCode
        );

        respond(502, [
            'success' => false,
            'message' =>
                'Supabase rejected the upload. Check Storage policies and permissions.',
            'storage_status' => $httpCode
        ]);
    }

    $publicUrl = $supabaseUrl .
        '/storage/v1/object/public/' . $storagePath;

    respond(200, [
        'success' => true,
        'message' => 'Image uploaded successfully.',
        'image_url' => $publicUrl
    ]);

} catch (Throwable $e) {
    error_log('Velora image upload error: ' . $e->getMessage());

    respond(500, [
        'success' => false,
        'message' => 'Image upload failed. Check the PHP error log.'
    ]);
}
