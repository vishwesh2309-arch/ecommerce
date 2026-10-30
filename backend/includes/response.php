<?php
declare(strict_types=1);

/**
 * Velora API response helpers.
 * All API responses use JSON.
 */

function jsonResponse(
    int $statusCode,
    array $data
): never {
    http_response_code($statusCode);

    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');

    echo json_encode(
        $data,
        JSON_UNESCAPED_SLASHES |
        JSON_UNESCAPED_UNICODE |
        JSON_INVALID_UTF8_SUBSTITUTE
    );

    exit;
}

function jsonSuccess(
    array $data = [],
    int $statusCode = 200
): never {
    jsonResponse($statusCode, [
        'success' => true,
        'data' => $data
    ]);
}

function jsonError(
    string $message,
    int $statusCode = 400,
    array $details = []
): never {
    jsonResponse($statusCode, [
        'success' => false,
        'message' => $message,
        'details' => $details
    ]);
}

function getJsonInput(): array
{
    $rawInput = file_get_contents('php://input');

    if ($rawInput === false || trim($rawInput) === '') {
        return [];
    }

    $decoded = json_decode($rawInput, true);

    if (!is_array($decoded)) {
        jsonError('Invalid JSON request body.', 400);
    }

    return $decoded;
}
