<?php
declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| VELORA — ADMIN UPDATE ORDER STATUS
|--------------------------------------------------------------------------
| Administrator-only endpoint.
| Updates order status in the Supabase PostgreSQL database.
*/

ob_start();
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function sendJson(int $httpCode, array $data): void
{
    http_response_code($httpCode);

    // Remove accidental output from included PHP files.
    while (ob_get_level() > 0) {
        ob_end_clean();
    }

    echo json_encode(
        $data,
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    );
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    sendJson(405, [
        'success' => false,
        'message' => 'Only POST requests are allowed.'
    ]);
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/admin-auth.php';

try {
    // Verify the signed-in user has administrator permission.
    requireVeloraAdmin($pdo);

    $rawBody = file_get_contents('php://input');
    $input = json_decode($rawBody ?: '', true);

    if (!is_array($input)) {
        sendJson(400, [
            'success' => false,
            'message' => 'Invalid JSON request body.'
        ]);
    }

    $orderNumber = trim((string)($input['orderNumber'] ?? ''));
    $newStatus = trim((string)($input['status'] ?? ''));

    if ($orderNumber === '' || $newStatus === '') {
        sendJson(400, [
            'success' => false,
            'message' => 'Order number and status are required.'
        ]);
    }

    $allowedTransitions = [
        'Placed' => ['Confirmed', 'Cancelled'],
        'Confirmed' => ['Shipped', 'Cancelled'],
        'Shipped' => ['Delivered'],
        'Delivered' => [],
        'Cancelled' => []
    ];

    if (!array_key_exists($newStatus, $allowedTransitions)) {
        sendJson(400, [
            'success' => false,
            'message' => 'Invalid order status.'
        ]);
    }

    $pdo->beginTransaction();

    // Lock the order to prevent conflicting simultaneous updates.
    $select = $pdo->prepare(
        'SELECT order_number, status
         FROM public.orders
         WHERE order_number = :order_number
         FOR UPDATE'
    );

    $select->execute([
        'order_number' => $orderNumber
    ]);

    $order = $select->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        $pdo->rollBack();

        sendJson(404, [
            'success' => false,
            'message' => 'Order not found.'
        ]);
    }

    $currentStatus = (string)$order['status'];

    if ($newStatus === $currentStatus) {
        $pdo->rollBack();

        sendJson(400, [
            'success' => false,
            'message' => 'The order already has this status.'
        ]);
    }

    $permitted = $allowedTransitions[$currentStatus] ?? [];

    if (!in_array($newStatus, $permitted, true)) {
        $pdo->rollBack();

        sendJson(409, [
            'success' => false,
            'message' => "Status change from {$currentStatus} to {$newStatus} is not allowed."
        ]);
    }

    $update = $pdo->prepare(
        'UPDATE public.orders
         SET status = :status,
             updated_at = CURRENT_TIMESTAMP
         WHERE order_number = :order_number'
    );

    $update->execute([
        'status' => $newStatus,
        'order_number' => $orderNumber
    ]);

    $pdo->commit();

    sendJson(200, [
        'success' => true,
        'message' => 'Order status updated successfully.',
        'orderNumber' => $orderNumber,
        'previousStatus' => $currentStatus,
        'status' => $newStatus
    ]);

} catch (Throwable $exception) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log(
        'Velora admin order status update failed: ' .
        $exception->getMessage()
    );

    sendJson(500, [
        'success' => false,
        'message' => 'Unable to update order status. Check the PHP error log.'
    ]);
}
