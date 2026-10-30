<?php
declare(strict_types=1);

/**
 * Velora Universal Router (Production + Local Development)
 * When opening the root URL (e.g. on Render or custom domain),
 * it serves the storefront UI immediately.
 */

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

// Handle local CAMPP subfolder if present
$localPrefix = '/velora-ecommerce';
$isLocal = str_starts_with($uri, $localPrefix);
if ($isLocal) {
    $uri = substr($uri, strlen($localPrefix));
}

$uri = '/' . ltrim($uri, '/');

// 1. Route API requests: /api/... -> backend/api/...
if (str_starts_with($uri, '/api/')) {
    $target = __DIR__ . '/backend' . $uri;
    if (is_file($target)) {
        require $target;
        exit;
    }
}

// 2. Health check endpoint for Render / monitoring
if ($uri === '/health' || $uri === '/healthz') {
    require __DIR__ . '/backend/api/health.php';
    exit;
}

// 3. Serve Root URL: Immediately display the Storefront UI
if ($uri === '/' || $uri === '' || $uri === '/index.php') {
    $indexHtml = __DIR__ . '/frontend/index.html';
    if (is_file($indexHtml)) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($indexHtml);
        exit;
    }
}

// 4. Serve any frontend files directly (CSS, JS, images, HTML)
$frontendPath = __DIR__ . '/frontend' . $uri;

if (is_file($frontendPath)) {
    // Determine proper content type
    $ext = strtolower(pathinfo($frontendPath, PATHINFO_EXTENSION));
    $mimeTypes = [
        'html' => 'text/html; charset=utf-8',
        'css'  => 'text/css; charset=utf-8',
        'js'   => 'application/javascript; charset=utf-8',
        'json' => 'application/json; charset=utf-8',
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
        'svg'  => 'image/svg+xml',
        'ico'  => 'image/x-icon'
    ];

    $mime = $mimeTypes[$ext] ?? mime_content_type($frontendPath) ?? 'application/octet-stream';
    header('Content-Type: ' . $mime);
    readfile($frontendPath);
    exit;
}

// 5. Fallback: Check if requested without .html extension (e.g. /products -> /frontend/products.html)
if (is_file($frontendPath . '.html')) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($frontendPath . '.html');
    exit;
}

// 6. Otherwise 404
http_response_code(404);
header('Content-Type: text/html; charset=utf-8');
echo '<!DOCTYPE html><html><head><title>404 Not Found</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>404 - Page Not Found</h2><p><a href="/">Return to Storefront</a></p></body></html>';
exit;
