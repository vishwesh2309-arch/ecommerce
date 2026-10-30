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

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    respond(405, [
        'success' => false,
        'message' => 'Method not allowed.'
    ]);
}

try {
    require_once __DIR__ . '/../config/database.php';
    require_once __DIR__ . '/../includes/admin-auth.php';

    // Verify administrator access.
    requireVeloraAdmin($pdo);

    // Retrieve orders.
    $ordersStatement = $pdo->query("
        SELECT
            o.id,
            o.order_number,
            o.user_id,
            o.customer_name,
            o.customer_email,
            o.customer_phone,
            o.shipping_address,
            o.status,
            o.payment_method,
            o.payment_status,
            o.subtotal,
            o.total,
            o.created_at,
            o.updated_at
        FROM public.orders AS o
        ORDER BY o.created_at DESC, o.id DESC
    ");

    $orders = $ordersStatement->fetchAll(PDO::FETCH_ASSOC);

    // Retrieve all items for those orders in one query.
    $itemsStatement = $pdo->query("
        SELECT
            oi.order_id,
            oi.product_id,
            oi.product_name,
            oi.product_image,
            oi.quantity,
            oi.unit_price,
            oi.line_total
        FROM public.order_items AS oi
        INNER JOIN public.orders AS o
            ON o.id = oi.order_id
        ORDER BY oi.order_id DESC, oi.id ASC
    ");

    $itemsByOrder = [];

    foreach ($itemsStatement->fetchAll(PDO::FETCH_ASSOC) as $item) {
        $orderId = (string) $item['order_id'];

        $itemsByOrder[$orderId][] = [
            'productId' => $item['product_id'],
            'name' => $item['product_name'],
            'image' => $item['product_image'],
            'quantity' => (int) $item['quantity'],
            'price' => (float) $item['unit_price'],
            'lineTotal' => (float) $item['line_total']
        ];
    }

    foreach ($orders as &$order) {
        $order['id'] = (string) $order['id'];
        $order['subtotal'] = (float) $order['subtotal'];
        $order['total'] = (float) $order['total'];

        $order['items'] = $itemsByOrder[$order['id']] ?? [];
    }

    unset($order);

    respond(200, [
        'success' => true,
        'orders' => $orders
    ]);

} catch (Throwable $exception) {
    error_log(
        'Velora admin orders API error: ' .
        $exception->getMessage()
    );

    respond(500, [
        'success' => false,
        'message' => 'Could not retrieve admin orders.'
    ]);
}
