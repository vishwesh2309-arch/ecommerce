<?php
declare(strict_types=1);

/**
 * Velora API — Product Details
 * GET /api/product-details.php?id=<id>&code=<code>
 */

require_once __DIR__ . '/../includes/bootstrap.php';

requireMethod(['GET']);

try {
    $id = trim((string) ($_GET['id'] ?? ''));
    $code = trim((string) ($_GET['code'] ?? ''));

    if ($id === '' && $code === '') {
        sendJson(400, [
            'success' => false,
            'message' => 'Product ID or product code is required.'
        ]);
    }

    $sql = '
        SELECT
            id,
            product_code,
            name,
            description,
            price,
            image_url,
            category,
            stock,
            is_active,
            created_at,
            updated_at
        FROM public.products
        WHERE is_active = TRUE
    ';

    $params = [];

    if ($id !== '') {
        $sql .= ' AND id = :id';
        $params['id'] = $id;
    } elseif ($code !== '') {
        $sql .= ' AND product_code = :code';
        $params['code'] = $code;
    }

    $statement = $pdo->prepare($sql);
    $statement->execute($params);
    $product = $statement->fetch(PDO::FETCH_ASSOC);

    if (!$product) {
        sendJson(404, [
            'success' => false,
            'message' => 'Product not found.'
        ]);
    }

    sendJson(200, [
        'success' => true,
        'product' => [
            'id' => (int) $product['id'],
            'product_code' => $product['product_code'],
            'name' => $product['name'],
            'description' => $product['description'],
            'price' => (float) $product['price'],
            'image_url' => $product['image_url'],
            'category' => $product['category'],
            'stock' => (int) $product['stock']
        ]
    ]);

} catch (Throwable $exception) {
    error_log('Product details error: ' . $exception->getMessage());
    sendJson(500, [
        'success' => false,
        'message' => 'Could not retrieve product details.'
    ]);
}

