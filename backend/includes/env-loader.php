<?php
declare(strict_types=1);

/**
 * Velora — Universal Environment Loader
 * Loads variables from root `.env` or system environment variables (Docker/Render).
 */

if (!function_exists('loadVeloraEnv')) {
    function loadVeloraEnv(): void
    {
        static $loaded = false;
        if ($loaded) return;
        $loaded = true;

        $paths = [
            dirname(__DIR__, 2) . '/.env',
            dirname(__DIR__) . '/config/.env',
            dirname(__DIR__) . '/.env'
        ];

        foreach ($paths as $envFile) {
            if (is_file($envFile)) {
                $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                if ($lines !== false) {
                    foreach ($lines as $line) {
                        $line = trim($line);
                        if ($line === '' || str_starts_with($line, '#')) {
                            continue;
                        }

                        $parts = explode('=', $line, 2);
                        if (count($parts) === 2) {
                            $key = trim($parts[0]);
                            $value = trim($parts[1]);
                            $value = trim($value, "\"'");

                            if (!array_key_exists($key, $_ENV)) {
                                $_ENV[$key] = $value;
                                putenv("$key=$value");
                            }
                        }
                    }
                }
                break;
            }
        }
    }
}

// Load environment variables immediately
loadVeloraEnv();

