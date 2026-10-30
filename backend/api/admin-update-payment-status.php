<?php
declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| VELORA — ADMIN UPDATE PAYMENT STATUS
|--------------------------------------------------------------------------
| Administrator-only endpoint.
| Updates the payment_status (Pending, Paid, Failed, Refunded) of an order.
*/

ob_start();
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function sendJson(int $httpCode, array $data): void
{
    http_response_code($httpCode);

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
    $rawStatus = strtolower(trim((string)($input['paymentStatus'] ?? '')));

    // PostgreSQL constraint `orders_payment_status_check` uses Title Case ('Pending', 'Paid', 'Failed', 'Refunded')
    $statusMap = [
        'pending'  => 'Pending',
        'paid'     => 'Paid',
        'done'     => 'Paid',
        'failed'   => 'Failed',
        'refunded' => 'Refunded'
    ];

    if ($orderNumber === '' || $rawStatus === '' || !isset($statusMap[$rawStatus])) {
        sendJson(400, [
            'success' => false,
            'message' => 'Invalid payment status. Allowed values: Pending, Paid (Done), Failed, Refunded.'
        ]);
    }

    $targetStatus = $statusMap[$rawStatus];

    $pdo->beginTransaction();

    $select = $pdo->prepare(
        'SELECT order_number, payment_status, payment_method
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

    $update = $pdo->prepare(
        'UPDATE public.orders
         SET payment_status = :payment_status,
             updated_at = CURRENT_TIMESTAMP
         WHERE order_number = :order_number'
    );

    $update->execute([
        'payment_status' => $targetStatus,
        'order_number' => $orderNumber
    ]);

    $pdo->commit();

    sendJson(200, [
        'success' => true,
        'message' => 'Payment status updated successfully.',
        'orderNumber' => $orderNumber,
        'previousPaymentStatus' => $order['payment_status'] ?? 'Pending',
        'paymentStatus' => $targetStatus
    ]);

} catch (Throwable $exception) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log(
        'Velora admin payment status update failed: ' .
        $exception->getMessage()
    );

    sendJson(500, [
        'success' => false,
        'message' => 'Unable to update payment status: ' . $exception->getMessage()
    ]);
}
