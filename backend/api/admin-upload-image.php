<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function uploadResponse(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    uploadResponse(405, [
        'success' => false,
        'message' => 'POST method required.'
    ]);
}

try {
    // Database connection and administrator authentication.
    require_once __DIR__ . '/../config/database.php';
    require_once __DIR__ . '/../includes/admin-auth.php';

    requireVeloraAdmin($pdo);

    // Load server-only Supabase configuration.
    $config = require __DIR__ . '/../config/.env.php';

    $supabaseUrl = rtrim(
        (string) (getenv('SUPABASE_URL') ?: ($config['supabase_url'] ?? '')),
        '/'
    );

    $secretKey = (string) (
        $config['supabase_secret_key'] ?? ''
    );

    if ($supabaseUrl === '' || $secretKey === '') {
        uploadResponse(500, [
            'success' => false,
            'message' => 'Supabase Storage configuration is missing.'
        ]);
    }

    // Validate uploaded file.
    if (!isset($_FILES['product_image'])) {
        uploadResponse(400, [
            'success' => false,
            'message' => 'No image was received.'
        ]);
    }

    $file = $_FILES['product_image'];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        uploadResponse(400, [
            'success' => false,
            'message' => 'Image upload failed. Error code: ' . $file['error']
        ]);
    }

    if (!is_uploaded_file($file['tmp_name'])) {
        uploadResponse(400, [
            'success' => false,
            'message' => 'Invalid uploaded file.'
        ]);
    }

    // Maximum image size: 5 MB.
    if ($file['size'] > 5 * 1024 * 1024) {
        uploadResponse(400, [
            'success' => false,
            'message' => 'Image must be 5 MB or smaller.'
        ]);
    }

    // Detect actual MIME type, not just the filename extension.
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']);

    $allowedTypes = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp'
    ];

    if (!isset($allowedTypes[$mime])) {
        uploadResponse(400, [
            'success' => false,
            'message' => 'Only JPG, PNG and WEBP images are allowed.'
        ]);
    }

    // Generate a unique storage filename.
    $extension = $allowedTypes[$mime];
    $filename = bin2hex(random_bytes(16)) . '.' . $extension;
    $storagePath = 'products/' . $filename;

    $uploadUrl = $supabaseUrl .
        '/storage/v1/object/product-images/' .
        $storagePath;

    $imageContents = file_get_contents($file['tmp_name']);

    if ($imageContents === false) {
        uploadResponse(500, [
            'success' => false,
            'message' => 'Could not read the uploaded image.'
        ]);
    }

    // Upload using the server-only secret key.
    $ch = curl_init($uploadUrl);

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $imageContents,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'apikey: ' . $secretKey,
            'Authorization: Bearer ' . $secretKey,
            'Content-Type: ' . $mime,
            'x-upsert: false'
        ],
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => 60
    ]);

    $response = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);

    curl_close($ch);

    if ($response === false || $httpCode < 200 || $httpCode >= 300) {
        error_log(
            'Velora Storage upload failed. HTTP ' .
            $httpCode . ': ' . $curlError . ' ' . (string) $response
        );

        uploadResponse(502, [
            'success' => false,
            'message' => 'Supabase Storage upload failed.',
            'http_status' => $httpCode
        ]);
    }

    $publicUrl = $supabaseUrl .
        '/storage/v1/object/public/product-images/' .
        $storagePath;

    uploadResponse(200, [
        'success' => true,
        'message' => 'Product image uploaded successfully.',
        'image_url' => $publicUrl
    ]);

} catch (Throwable $exception) {
    error_log(
        'Velora image upload error: ' . $exception->getMessage()
    );

    uploadResponse(500, [
        'success' => false,
        'message' => 'Server error while uploading image.'
    ]);
}
