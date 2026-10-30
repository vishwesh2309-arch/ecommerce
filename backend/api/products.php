<?php
declare(strict_types=1);

/**
 * Velora API — Product listing
 * GET /api/products.php
 */

require_once __DIR__ . '/../includes/bootstrap.php';

requireMethod(['GET']);

try {
    $category = trim((string) ($_GET['category'] ?? ''));
    $search = trim((string) ($_GET['search'] ?? ''));

    $sql = '
        SELECT
            id,
            product_code,
            name,
            description,
            price,
            image_url,
            category,
            stock
        FROM public.products
        WHERE is_active = TRUE
    ';

    $params = [];

    if ($category !== '' && strtolower($category) !== 'all') {
        $sql .= ' AND category = :category';
        $params['category'] = $category;
    }

    if ($search !== '') {
        $sql .= ' AND (
            name ILIKE :search
            OR description ILIKE :search
            OR category ILIKE :search
        )';

        $params['search'] = '%' . $search . '%';
    }

    $sql .= ' ORDER BY created_at DESC, id DESC';

    $statement = $pdo->prepare($sql);
    $statement->execute($params);

    $products = $statement->fetchAll();

    foreach ($products as &$product) {
        $product['id'] = (int) $product['id'];
        $product['price'] = (float) $product['price'];
        $product['stock'] = (int) $product['stock'];
    }
    unset($product);

    jsonSuccess([
        'products' => $products,
        'count' => count($products)
    ]);
} catch (Throwable $exception) {
    error_log(
        'Velora products API error: ' .
        $exception->getMessage()
    );

    jsonError('Unable to load products right now.', 500);
}
