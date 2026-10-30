<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

try {
    require_once __DIR__ . '/../config/database.php';

    $statement = $pdo->query(
        'SELECT current_database() AS database_name,
                current_timestamp AS server_time'
    );

    $result = $statement->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'php' => PHP_VERSION,
        'database_connected' => true,
        'database' => $result['database_name']
    ]);
} catch (Throwable $exception) {
    error_log('Velora health check failed: ' . $exception->getMessage());

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'PHP ran, but the database connection failed. Check the hosting PHP error log.'
    ]);
}
