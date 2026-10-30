<?php
declare(strict_types=1);

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status, array $data): void
{
    http_response_code($status);
    echo json_encode(
        $data,
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    );
    exit;
}

if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'POST', 'PUT', 'DELETE'], true)) {
    header('Allow: GET, POST, PUT, DELETE');
    respond(405, [
        'success' => false,
        'message' => 'Method not allowed.'
    ]);
}

try {
    require_once __DIR__ . '/../config/database.php';
    require_once __DIR__ . '/../includes/admin-auth.php';

    if (!isset($pdo) || !($pdo instanceof PDO)) {
        throw new RuntimeException('Database connection is unavailable.');
    }

    requireVeloraAdmin($pdo);

    $method = $_SERVER['REQUEST_METHOD'];
    $input = [];

    if (in_array($method, ['POST', 'PUT', 'DELETE'], true)) {
        $raw = file_get_contents('php://input');
        $input = json_decode($raw ?: '', true);

        if (!is_array($input)) {
            respond(400, [
                'success' => false,
                'message' => 'A valid JSON request body is required.'
            ]);
        }
    }

    if ($method === 'GET') {
        $statement = $pdo->query(
            'SELECT id, product_code, name, description, price,
                    image_url, category, stock, is_active,
                    created_at, updated_at
             FROM public.products
             ORDER BY id DESC'
        );

        respond(200, [
            'success' => true,
            'products' => $statement->fetchAll(PDO::FETCH_ASSOC)
        ]);
    }

    if ($method === 'POST') {
        $name = trim((string) ($input['name'] ?? ''));
        $code = trim((string) ($input['product_code'] ?? ''));
        $description = trim((string) ($input['description'] ?? ''));
        $imageUrl = trim((string) ($input['image_url'] ?? ''));
        $category = trim((string) ($input['category'] ?? ''));
        $price = $input['price'] ?? null;
        $stock = $input['stock'] ?? 0;
        $isActive = $input['is_active'] ?? true;

        if ($name === '' || !is_numeric($price) ||
            (float) $price < 0 || filter_var($stock, FILTER_VALIDATE_INT) === false ||
            (int) $stock < 0) {
            respond(422, [
                'success' => false,
                'message' => 'Provide a product name, valid non-negative price, and non-negative integer stock.'
            ]);
        }

        if ($code === '') {
            $code = 'product-' . bin2hex(random_bytes(8));
        }

        if (!is_bool($isActive)) {
            respond(422, [
                'success' => false,
                'message' => 'is_active must be true or false.'
            ]);
        }

        $statement = $pdo->prepare(
            'INSERT INTO public.products
                (product_code, name, description, price, image_url,
                 category, stock, is_active)
             VALUES
                (:code, :name, :description, :price, :image_url,
                 :category, :stock, :is_active)
             RETURNING id, product_code, name, description, price,
                       image_url, category, stock, is_active,
                       created_at, updated_at'
        );

        $statement->execute([
            'code' => $code,
            'name' => $name,
            'description' => $description !== '' ? $description : null,
            'price' => $price,
            'image_url' => $imageUrl !== '' ? $imageUrl : null,
            'category' => $category !== '' ? $category : null,
            'stock' => (int) $stock,
            'is_active' => $isActive
        ]);

        respond(201, [
            'success' => true,
            'message' => 'Product created successfully.',
            'product' => $statement->fetch(PDO::FETCH_ASSOC)
        ]);
    }

    if ($method === 'PUT') {
        $id = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT);

        if (!$id || $id < 1) {
            respond(422, [
                'success' => false,
                'message' => 'A valid product ID is required.'
            ]);
        }

        $name = trim((string) ($input['name'] ?? ''));
        $code = trim((string) ($input['product_code'] ?? ''));
        $description = trim((string) ($input['description'] ?? ''));
        $imageUrl = trim((string) ($input['image_url'] ?? ''));
        $category = trim((string) ($input['category'] ?? ''));
        $price = $input['price'] ?? null;
        $stock = $input['stock'] ?? null;
        $isActive = $input['is_active'] ?? true;

        if ($name === '' || !is_numeric($price) ||
            (float) $price < 0 || filter_var($stock, FILTER_VALIDATE_INT) === false ||
            (int) $stock < 0 || !is_bool($isActive)) {
            respond(422, [
                'success' => false,
                'message' => 'Product name, price, stock, and active status are invalid.'
            ]);
        }

        if ($code === '') {
            respond(422, [
                'success' => false,
                'message' => 'Product code is required when updating a product.'
            ]);
        }

        $statement = $pdo->prepare(
            'UPDATE public.products
             SET product_code = :code,
                 name = :name,
                 description = :description,
                 price = :price,
                 image_url = :image_url,
                 category = :category,
                 stock = :stock,
                 is_active = :is_active,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id
             RETURNING id, product_code, name, description, price,
                       image_url, category, stock, is_active,
                       created_at, updated_at'
        );

        $statement->execute([
            'id' => $id,
            'code' => $code,
            'name' => $name,
            'description' => $description !== '' ? $description : null,
            'price' => $price,
            'image_url' => $imageUrl !== '' ? $imageUrl : null,
            'category' => $category !== '' ? $category : null,
            'stock' => (int) $stock,
            'is_active' => $isActive
        ]);

        $product = $statement->fetch(PDO::FETCH_ASSOC);

        if (!$product) {
            respond(404, [
                'success' => false,
                'message' => 'Product not found.'
            ]);
        }

        respond(200, [
            'success' => true,
            'message' => 'Product updated successfully.',
            'product' => $product
        ]);
    }

    if ($method === 'DELETE') {
        $id = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT);

        if (!$id || $id < 1) {
            respond(422, [
                'success' => false,
                'message' => 'A valid product ID is required.'
            ]);
        }

        // Soft-delete: retain product history and references.
        $statement = $pdo->prepare(
            'UPDATE public.products
             SET is_active = FALSE,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id
             RETURNING id'
        );

        $statement->execute(['id' => $id]);

        if (!$statement->fetchColumn()) {
            respond(404, [
                'success' => false,
                'message' => 'Product not found.'
            ]);
        }

        respond(200, [
            'success' => true,
            'message' => 'Product deactivated successfully.'
        ]);
    }
} catch (PDOException $exception) {
    error_log('Velora admin products database error: ' . $exception->getMessage());

    $sqlState = (string) $exception->getCode();

    if ($sqlState === '23505') {
        respond(409, [
            'success' => false,
            'message' => 'That product code already exists. Choose a unique code.'
        ]);
    }

    respond(500, [
        'success' => false,
        'message' => 'A database error occurred while processing the product.'
    ]);
} catch (Throwable $exception) {
    error_log('Velora admin products API error: ' . $exception->getMessage());

    respond(500, [
        'success' => false,
        'message' => 'Unable to process the product request.'
    ]);
}
