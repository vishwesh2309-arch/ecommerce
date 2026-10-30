<?php
declare(strict_types=1);

session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

function respond(int $status, array $data): void
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

// Require an authenticated PHP session.
if (
    empty($_SESSION['velora_user']['id']) ||
    !is_string($_SESSION['velora_user']['id'])
) {
    respond(401, [
        'success' => false,
        'authenticated' => false,
        'message' => 'Please log in to view your orders.'
    ]);
}

$userId = $_SESSION['velora_user']['id'];
$apiStartTime = microtime(true);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');

    respond(405, [
        'success' => false,
        'message' => 'Method not allowed.'
    ]);
}

try {
    $dbStartTime = microtime(true);

    require_once __DIR__ . '/../config/database.php';

    $dbElapsed = microtime(true) - $dbStartTime;

    error_log(
        'Velora orders API - Database connection/setup: ' .
        round(microtime(true) - $dbStartTime, 4) . ' seconds'
    );

    $sql = "
        SELECT
            o.id AS order_id,
            o.order_number,
            o.status,
            o.payment_method,
            o.payment_status,
            o.subtotal,
            o.total,
            o.created_at,

            oi.id AS order_item_id,
            oi.product_id,
            oi.product_name,
            oi.product_image,
            oi.quantity,
            oi.unit_price,
            oi.line_total

        FROM public.orders AS o

        LEFT JOIN public.order_items AS oi
            ON oi.order_id = o.id

        WHERE o.user_id = :user_id

        ORDER BY o.created_at DESC, oi.id ASC
    ";

    $queryStartTime = microtime(true);

    $statement = $pdo->prepare($sql);
    $statement->execute(['user_id' => $userId]);

    error_log(
        'Velora orders API - SQL execute: ' .
        round(microtime(true) - $queryStartTime, 4) . ' seconds'
    );

    $fetchStartTime = microtime(true);

    $rows = $statement->fetchAll();

    error_log(
        'Velora orders API - Fetch rows: ' .
        round(microtime(true) - $fetchStartTime, 4) . ' seconds'
    );

    $orders = [];

    foreach ($rows as $row) {
        $orderId = (string) $row['order_id'];

        if (!isset($orders[$orderId])) {
            $orders[$orderId] = [
                'id' => $orderId,
                'orderId' => $row['order_number'] ?: $orderId,
                'orderNumber' => $row['order_number'],
                'status' => $row['status'] ?? 'Pending',
                'paymentMethod' => $row['payment_method'],
                'paymentStatus' => $row['payment_status'],
                'subtotal' => $row['subtotal'],
                'total' => $row['total'],
                'createdAt' => $row['created_at'],
                'items' => []
            ];
        }

        if ($row['order_item_id'] !== null) {
            $orders[$orderId]['items'][] = [
                'id' => $row['order_item_id'],
                'orderItemId' => $row['order_item_id'],
                'productId' => $row['product_id'],
                'name' => $row['product_name'] ?? 'Product unavailable',
                'product_name' => $row['product_name'] ?? 'Product unavailable',
                'image' => $row['product_image'],
                'product_image' => $row['product_image'],
                'quantity' => (int) $row['quantity'],
                'price' => $row['unit_price'],
                'unit_price' => $row['unit_price'],
                'lineTotal' => $row['line_total']
            ];
        }
    }

    respond(200, [
        'success' => true,
        'orders' => array_values($orders)
    ]);

} catch (Throwable $exception) {
    error_log(
        'Velora orders API error: ' . $exception->getMessage()
    );

    respond(500, [
        'success' => false,
        'message' => 'Could not retrieve orders.'
    ]);
}
