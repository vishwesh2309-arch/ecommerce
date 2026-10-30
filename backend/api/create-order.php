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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, [
        'success' => false,
        'message' => 'Method not allowed.'
    ]);
}

// The authenticated user ID must come from the PHP session.
$user = $_SESSION['velora_user'] ?? null;

if (!is_array($user) || empty($user['id'])) {
    respond(401, [
        'success' => false,
        'authenticated' => false,
        'message' => 'Please log in before placing an order.'
    ]);
}

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    respond(400, [
        'success' => false,
        'message' => 'Invalid request data.'
    ]);
}

$fullName = trim((string)($input['fullName'] ?? ''));
$phone = trim((string)($input['phone'] ?? ''));
$address = trim((string)($input['address'] ?? ''));
$city = trim((string)($input['city'] ?? ''));
$pincode = trim((string)($input['pincode'] ?? ''));
$paymentMethod = (string)($input['paymentMethod'] ?? '');
$items = $input['items'] ?? [];

if (
    mb_strlen($fullName) < 2 ||
    $phone === '' ||
    mb_strlen($address) < 5 ||
    mb_strlen($city) < 2 ||
    !preg_match('/^[0-9]{6}$/', $pincode)
) {
    respond(422, [
        'success' => false,
        'message' => 'Please provide valid customer and delivery details.'
    ]);
}

if ($paymentMethod !== 'COD') {
    respond(422, [
        'success' => false,
        'message' => 'Only Cash on Delivery is currently supported.'
    ]);
}

if (!is_array($items) || count($items) < 1 || count($items) > 100) {
    respond(422, [
        'success' => false,
        'message' => 'Your cart is empty or contains too many items.'
    ]);
}

// Normalize cart items and reject duplicate or invalid product IDs.
$requestedItems = [];

foreach ($items as $item) {
    if (!is_array($item)) {
        respond(422, [
            'success' => false,
            'message' => 'Invalid cart item.'
        ]);
    }

    $productCode = trim((string)($item['id'] ?? ''));
    $quantity = filter_var(
        $item['quantity'] ?? null,
        FILTER_VALIDATE_INT
    );

    if (
        $productCode === '' ||
        strlen($productCode) > 100 ||
        $quantity === false ||
        $quantity < 1 ||
        $quantity > 99
    ) {
        respond(422, [
            'success' => false,
            'message' => 'A cart item has an invalid product or quantity.'
        ]);
    }

    if (isset($requestedItems[$productCode])) {
        $requestedItems[$productCode] += $quantity;
    } else {
        $requestedItems[$productCode] = $quantity;
    }

    if ($requestedItems[$productCode] > 99) {
        respond(422, [
            'success' => false,
            'message' => 'The quantity for a product cannot exceed 99.'
        ]);
    }
}

try {
    require_once __DIR__ . '/../config/database.php';

    if (!isset($pdo) || !($pdo instanceof PDO)) {
        throw new RuntimeException('Database connection is unavailable.');
    }

    $pdo->beginTransaction();

    $productQuery = $pdo->prepare("
        SELECT id, product_code, name, price, image_url, stock
        FROM public.products
        WHERE product_code = :product_code
            AND is_active = TRUE
        FOR UPDATE
    ");

    $insertOrder = $pdo->prepare("
        INSERT INTO public.orders (
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
            total
        ) VALUES (
            :order_number,
            :user_id,
            :customer_name,
            :customer_email,
            :customer_phone,
            CAST(:shipping_address AS jsonb),
            :status,
            :payment_method,
            :payment_status,
            :subtotal,
            :total
        )
        RETURNING id
    ");

    $insertItem = $pdo->prepare("
        INSERT INTO public.order_items (
            order_id,
            product_id,
            product_name,
            product_image,
            quantity,
            unit_price,
            line_total
        ) VALUES (
            :order_id,
            :product_id,
            :product_name,
            :product_image,
            :quantity,
            :unit_price,
            :line_total
        )
    ");

    $updateStock = $pdo->prepare("
        UPDATE public.products
        SET stock = stock - :quantity,
            updated_at = NOW()
        WHERE id = :product_id
          AND stock >= :minimum_quantity
    ");

    $resolvedItems = [];
    $subtotal = 0.0;

    ksort($requestedItems, SORT_STRING);
    
    foreach ($requestedItems as $productCode => $quantity) {
        $productQuery->execute([
            'product_code' => $productCode
        ]);

        $product = $productQuery->fetch(PDO::FETCH_ASSOC);

        if (!$product) {
            throw new DomainException(
                'A product in your cart is unavailable. Please refresh your cart.'
            );
        }

        if ((int)$product['stock'] < $quantity) {
            throw new DomainException(
                'Insufficient stock for ' . $product['name'] .
                '. Please update the quantity in your cart.'
            );
        }

        $unitPrice = (float)$product['price'];

        if (!is_finite($unitPrice) || $unitPrice < 0) {
            throw new RuntimeException('Invalid product price in database.');
        }

        $lineTotal = round($unitPrice * $quantity, 2);
        $subtotal = round($subtotal + $lineTotal, 2);

        $resolvedItems[] = [
            'product' => $product,
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'line_total' => $lineTotal
        ];
    }

    // Delivery is free in the current checkout design.
    $total = $subtotal;

    $accountEmail = trim((string)($user['email'] ?? ''));

    if (!filter_var($accountEmail, FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException(
            'The account email is missing. Please log in again.'
        );
    }

    $shippingAddress = json_encode([
        'address' => $address,
        'city' => $city,
        'pincode' => $pincode
    ], JSON_THROW_ON_ERROR);

    // Retry order-number generation if an extremely unlikely collision occurs.
    $orderNumber = 'VEL' . date('YmdHis') .
        strtoupper(bin2hex(random_bytes(3)));

    $insertOrder->execute([
        'order_number' => $orderNumber,
        'user_id' => $user['id'],
        'customer_name' => $fullName,
        'customer_email' => $accountEmail,
        'customer_phone' => $phone,
        'shipping_address' => $shippingAddress,
        'status' => 'Placed',
        'payment_method' => 'COD',
        'payment_status' => 'Pending',
        'subtotal' => $subtotal,
        'total' => $total
    ]);

    $orderId = $insertOrder->fetchColumn();

    foreach ($resolvedItems as $resolved) {
        $product = $resolved['product'];
        $quantity = $resolved['quantity'];

        $updateStock->execute([
            'quantity' => $quantity,
            'product_id' => $product['id'],
            'minimum_quantity' => $quantity
        ]);

        if ($updateStock->rowCount() !== 1) {
            throw new DomainException(
                'Stock changed while placing your order. Please try again.'
            );
        }

        $insertItem->execute([
            'order_id' => $orderId,
            'product_id' => $product['id'],
            'product_name' => $product['name'],
            'product_image' => $product['image_url'],
            'quantity' => $quantity,
            'unit_price' => $resolved['unit_price'],
            'line_total' => $resolved['line_total']
        ]);
    }

    $pdo->commit();

    respond(201, [
        'success' => true,
        'message' => 'Your order was placed successfully.',
        'order' => [
            'id' => (string)$orderId,
            'orderId' => $orderNumber,
            'status' => 'Placed',
            'paymentMethod' => 'COD',
            'paymentStatus' => 'Pending',
            'subtotal' => $subtotal,
            'total' => $total
        ]
    ]);

} catch (DomainException $exception) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    respond(422, [
        'success' => false,
        'message' => $exception->getMessage()
    ]);

} catch (Throwable $exception) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('Velora create-order API error: ' . $exception->getMessage());

    respond(500, [
        'success' => false,
        'message' => 'We could not place your order. Please try again.'
    ]);
}
