<?php
declare(strict_types=1);

ob_start();
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

function sendJson(int $statusCode, array $data): void
{
    http_response_code($statusCode);

    if (ob_get_level() > 0) {
        ob_clean();
    }

    echo json_encode(
        $data,
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    );
    exit;
}

try {
    // Only allow GET requests.
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        header('Allow: GET');
        sendJson(405, [
            'success' => false,
            'message' => 'Only GET requests are allowed.'
        ]);
    }

    // Verify the existing PHP session.
    if (
        !isset($_SESSION['velora_user']) ||
        !is_array($_SESSION['velora_user'])
    ) {
        sendJson(401, [
            'success' => false,
            'message' => 'Please log in to view this order.'
        ]);
    }

    $user = $_SESSION['velora_user'];
    $userId = $user['id'] ?? null;

    if ($userId === null || $userId === '') {
        sendJson(401, [
            'success' => false,
            'message' => 'Your login session is invalid. Please log in again.'
        ]);
    }

    // Accept either orderId or orderNumber from the URL.
    $orderReference = trim(
        (string) ($_GET['orderId'] ?? $_GET['orderNumber'] ?? '')
    );

    if ($orderReference === '') {
        sendJson(400, [
            'success' => false,
            'message' => 'Missing orderId in the request URL.'
        ]);
    }

    // Use the existing database connection.
    require_once __DIR__ . '/../config/database.php';

    // Support the existing connection variable if it is a PDO instance.
    if (!isset($pdo) || !($pdo instanceof PDO)) {
        sendJson(500, [
            'success' => false,
            'message' => 'Database connection is unavailable. Check config/database.php.'
        ]);
    }

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    /*
     * Match the order by its public order number, or by its database ID.
     * The user_id condition prevents access to another customer's order.
     */
    $sql = "
        SELECT
            id,
            order_number,
            user_id,
            customer_name,
            customer_email,
            customer_phone,
            shipping_address,
            status,
            payment_method,
            payment_status,
            subtotal,
            total,
            created_at
        FROM orders
        WHERE user_id = :user_id
          AND (
              CAST(id AS TEXT) = :order_id
              OR order_number = :order_number
          )
        LIMIT 1
    ";

    $statement = $pdo->prepare($sql);
    $statement->execute([
        ':user_id' => $userId,
        ':order_id' => $orderReference,
        ':order_number' => $orderReference
    ]);

    $order = $statement->fetch();

    if (!$order) {
        sendJson(404, [
            'success' => false,
            'message' => 'Order not found for your account.',
            'orderReference' => $orderReference
        ]);
    }

    // Fetch the items belonging to this order.
    $itemsStatement = $pdo->prepare("
        SELECT
            id,
            order_id,
            product_id,
            product_name,
            product_image,
            quantity,
            unit_price,
            line_total
        FROM order_items
        WHERE order_id = :order_id
        ORDER BY id ASC
    ");

    $itemsStatement->execute([
        ':order_id' => $order['id']
    ]);

    $items = $itemsStatement->fetchAll();

    // Convert numeric database values to JSON numbers.
    foreach ($items as &$item) {
        $item['quantity'] = (int) $item['quantity'];
        $item['unit_price'] = (float) $item['unit_price'];
        $item['line_total'] = (float) $item['line_total'];
    }
    unset($item);

    $order['subtotal'] = (float) $order['subtotal'];
    $order['total'] = (float) $order['total'];

    // Keep both naming styles for compatibility with existing JavaScript.
    $order['orderId'] = $order['order_number'];
    $order['orderNumber'] = $order['order_number'];
    $order['items'] = $items;

    sendJson(200, [
        'success' => true,
        'message' => 'Order details retrieved successfully.',
        'order' => $order
    ]);

} catch (Throwable $e) {
    error_log('Velora order-details API error: ' . $e->getMessage());

    sendJson(500, [
        'success' => false,
        'message' => 'Unable to retrieve order details. Check the PHP error log.'
    ]);
}
