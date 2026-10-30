<?php
declare(strict_types=1);

/**
 * Velora — Supabase PostgreSQL connection
 */

$configFile = __DIR__ . '/.env.php';

if (!is_file($configFile)) {
    throw new RuntimeException(
        'Missing config/.env.php file.'
    );
}

$dbConfig = require $configFile;

foreach (['host', 'port', 'database', 'username', 'password'] as $key) {
    if (!isset($dbConfig[$key]) || $dbConfig[$key] === '') {
        throw new RuntimeException(
            'Missing database configuration value: ' . $key
        );
    }
}

$host = (string) $dbConfig['host'];
$port = (int) $dbConfig['port'];
$database = (string) $dbConfig['database'];
$username = (string) $dbConfig['username'];
$password = (string) $dbConfig['password'];

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
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 10,
            PDO::ATTR_PERSISTENT => true,
    ]
    );
} catch (PDOException $exception) {
    error_log(
        'Velora PostgreSQL connection failed: ' .
        $exception->getMessage()
    );

    throw new RuntimeException(
        'Could not connect to the Velora database. ' .
        'Check the PHP error log.'
    );
}
