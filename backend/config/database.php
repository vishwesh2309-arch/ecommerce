<?php
declare(strict_types=1);

/**
 * Velora — Supabase PostgreSQL connection
 * Supports both local config/.env.php and Cloud Environment Variables (Render/Docker)
 */

$configFile = __DIR__ . '/.env.php';
$dbConfig = is_file($configFile) ? (require $configFile) : [];

$host = (string) (getenv('DB_HOST') ?: ($dbConfig['host'] ?? ''));
$port = (int) (getenv('DB_PORT') ?: ($dbConfig['port'] ?? 5432));
$database = (string) (getenv('DB_NAME') ?: ($dbConfig['database'] ?? 'postgres'));
$username = (string) (getenv('DB_USER') ?: ($dbConfig['username'] ?? ''));
$password = (string) (getenv('DB_PASSWORD') ?: ($dbConfig['password'] ?? ''));

if ($host === '' || $username === '' || $password === '') {
    throw new RuntimeException(
        'Missing database configuration values. Set DB_HOST, DB_USER, DB_PASSWORD environment variables or config/.env.php'
    );
}

if ($port < 1 || $port > 65535) {
    throw new RuntimeException('Invalid database port.');
}

$dsn = sprintf(
    'pgsql:host=%s;port=%d;dbname=%s;sslmode=require',
    $host,
    $port,
    $database
);

try {
    $pdo = new PDO(
        $dsn,
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 10,
        ]
    );
} catch (PDOException $exception) {
    error_log(
        'Velora PostgreSQL connection failed: ' .
        $exception->getMessage()
    );

    throw new RuntimeException(
        'Could not connect to the Velora database. Check the server logs.'
    );
}
