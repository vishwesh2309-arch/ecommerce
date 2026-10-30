<?php
declare(strict_types=1);

/**
 * Velora Project Root Router
 * Routes incoming requests smoothly between /frontend and /backend
 */

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

// Remove the base directory prefix if present
$basePath = '/velora-ecommerce';
if (str_starts_with($uri, $basePath)) {
    $uri = substr($uri, strlen($basePath));
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

// 2. Route backend admin PHP entry points
if (in_array($uri, ['/admin-orders.php', '/admin-products.php', '/check-extensions.php'], true)) {
    $target = __DIR__ . '/backend' . $uri;
    if (is_file($target)) {
        require $target;
        exit;
    }
}

// 3. Default to frontend: serve file or redirect
if ($uri === '/' || $uri === '') {
    header('Location: ' . $basePath . '/frontend/index.html', true, 302);
    exit;
}

// 4. If root requested an html file directly (e.g. /index.html)
$frontendFile = __DIR__ . '/frontend' . $uri;
if (is_file($frontendFile)) {
    // Serve HTML or redirect to canonical location
    if (str_ends_with($uri, '.html')) {
        header('Location: ' . $basePath . '/frontend' . $uri, true, 302);
        exit;
    }
}

// Fallback to frontend index
header('Location: ' . $basePath . '/frontend/index.html', true, 302);
exit;

