<?php
declare(strict_types=1);

/**
 * Velora Universal Router (Production + Local Development)
 * When opening the root URL (e.g. on Render or custom domain),
 * it serves the storefront UI immediately.
 * Also seamlessly redirects any requests containing '/velora-ecommerce/' to the root.
 */

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

// 0. Automatically clean up '/velora-ecommerce' from requests in production
if (str_starts_with($uri, '/velora-ecommerce/')) {
    $cleanPath = substr($uri, strlen('/velora-ecommerce'));
    $cleanPath = '/' . ltrim($cleanPath, '/');
    $query = $_SERVER['QUERY_STRING'] ?? '';
    $redirectUrl = $cleanPath . ($query ? '?' . $query : '');
    header('Location: ' . $redirectUrl, true, 301);
    exit;
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

// 4. Check if file exists directly at root (e.g. /favicon.ico)
$rootPath = __DIR__ . $uri;
if (is_file($rootPath) && !str_starts_with($uri, '/backend/config/')) {
    header('Content-Type: ' . (mime_content_type($rootPath) ?: 'text/plain'));
    readfile($rootPath);
    exit;
}

// 5. Serve any frontend files directly (CSS, JS, images, HTML)
// Handles both /frontend/index.html and clean /index.html
$frontendSubUri = str_starts_with($uri, '/frontend/') ? substr($uri, strlen('/frontend')) : $uri;
$frontendPath = __DIR__ . '/frontend/' . ltrim($frontendSubUri, '/');

if (is_file($frontendPath)) {
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

// 6. Fallback: Check without .html extension (e.g. /products -> /frontend/products.html)
if (is_file($frontendPath . '.html')) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($frontendPath . '.html');
    exit;
}

// 7. Otherwise 404
http_response_code(404);
header('Content-Type: text/html; charset=utf-8');
echo '<!DOCTYPE html><html><head><title>404 Not Found</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>404 - Page Not Found</h2><p><a href="/">Return to Storefront</a></p></body></html>';
exit;
