<?php
declare(strict_types=1);

ob_start();

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

function respond(int $status, array $data): void
{
    http_response_code($status);

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

    respond(405, [
        'success' => false,
        'message' => 'Only POST requests are allowed.'
    ]);
}

// Require an authenticated customer session.
$user = $_SESSION['velora_user'] ?? null;
$userId = is_array($user) ? ($user['id'] ?? null) : null;

if (!is_string($userId) || $userId === '') {
    respond(401, [
        'success' => false,
        'message' => 'Please log in to cancel your order.'
    ]);
}

// Read JSON request from my-orders.js.
$input = json_decode(
    file_get_contents('php://input') ?: '',
    true
);

if (!is_array($input)) {
    respond(400, [
        'success' => false,
        'message' => 'Invalid JSON request.'
    ]);
}

$orderNumber = trim((string)($input['orderNumber'] ?? ''));

if ($orderNumber === '') {
    respond(400, [
        'success' => false,
        'message' => 'Order number is required.'
    ]);
}

try {
    require_once __DIR__ . '/../config/database.php';

    if (!isset($pdo) || !($pdo instanceof PDO)) {
        throw new RuntimeException('Database connection unavailable.');
    }

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->beginTransaction();

    // Lock only an order belonging to the signed-in customer.
    $find = $pdo->prepare(
        "SELECT id, order_number, status
         FROM public.orders
         WHERE order_number = :order_number
           AND user_id = CAST(:user_id AS UUID)
         FOR UPDATE"
    );

    $find->execute([
        'order_number' => $orderNumber,
        'user_id' => $userId
    ]);

    $order = $find->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        $pdo->rollBack();

        respond(404, [
            'success' => false,
            'message' => 'Order not found.'
        ]);
    }

    $currentStatus = (string)$order['status'];

    // Customers may cancel only Placed or Confirmed orders.
    if (!in_array($currentStatus, ['Placed', 'Confirmed'], true)) {
        $pdo->rollBack();

        respond(409, [
            'success' => false,
            'message' => 'This order can no longer be cancelled.',
            'status' => $currentStatus
        ]);
    }

    $update = $pdo->prepare(
        "UPDATE public.orders
         SET status = 'Cancelled',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = :id
           AND user_id = CAST(:user_id AS UUID)
         RETURNING order_number, status, updated_at"
    );

    $update->execute([
        'id' => $order['id'],
        'user_id' => $userId
    ]);

    $updated = $update->fetch(PDO::FETCH_ASSOC);

    if (!$updated) {
        $pdo->rollBack();

        respond(500, [
            'success' => false,
            'message' => 'The order could not be cancelled.'
        ]);
    }

    $pdo->commit();

    respond(200, [
        'success' => true,
        'message' => 'Order cancelled successfully.',
        'order' => [
            'orderNumber' => $updated['order_number'],
            'previousStatus' => $currentStatus,
            'status' => $updated['status'],
            'updatedAt' => $updated['updated_at']
        ]
    ]);

} catch (Throwable $exception) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log(
        'Velora customer cancellation API error: ' .
        $exception->getMessage()
    );

    respond(500, [
        'success' => false,
        'message' => 'Unable to cancel the order. Please try again.'
    ]);
}
