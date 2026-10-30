
/* =========================================
   VELORA — ORDER DETAILS
   Supabase/PHP API Integration
========================================= */

document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    const orderDetails = document.getElementById("orderDetails");
    const orderStatus = document.getElementById("orderStatus");
    const orderTimeline = document.getElementById("orderTimeline");

    const cancelOrderBtn = document.getElementById("cancelOrderBtn");
    const markPaymentPaidBtn = document.getElementById("markPaymentPaidBtn");
    const viewInvoiceBtn = document.getElementById("viewInvoiceBtn");
    const printReceiptBtn = document.getElementById("printReceiptBtn");

    const orderId = new URLSearchParams(
        window.location.search
    ).get("orderId");

    const VALID_STATUSES = [
        "Placed",
        "Confirmed",
        "Shipped",
        "Delivered",
        "Cancelled"
    ];

    const ALLOWED_TRANSITIONS = {
        Placed: ["Confirmed", "Cancelled"],
        Confirmed: ["Shipped", "Cancelled"],
        Shipped: ["Delivered"],
        Delivered: [],
        Cancelled: []
    };

    let currentOrder = null;
    let currentUser = null;
    let apiOrders = [];

    /* =========================================
       1. SECURITY HELPERS
    ========================================= */

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (char) {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return entities[char];
        });
    }

    function getSafeStatus(order) {
        const status = String(order?.status || "Placed").trim();

        if (VALID_STATUSES.includes(status)) {
            return status;
        }

        return "Unknown";
    }

    /*
     * api/orders.php only returns orders belonging to the
     * authenticated PHP session. Therefore, API-loaded orders
     * are already filtered by the server.
     */
    function isOrderOwner(order, user) {
        if (order?._fromAPI === true) {
            return true;
        }

        const orderEmail = String(
            order?.customer?.email || order?.customer_email || ""
        ).trim().toLowerCase();

        const userEmail = String(
            user?.email || ""
        ).trim().toLowerCase();

        return Boolean(orderEmail && userEmail && orderEmail === userEmail);
    }

    function readLocalUser() {
        try {
            return JSON.parse(
                localStorage.getItem("veloraCurrentUser") || "null"
            );
        } catch (error) {
            console.warn("Could not read local user information.", error);
            return null;
        }
    }

    /* =========================================
       2. DATE AND PRICE HELPERS
    ========================================= */

    function formatDate(value) {
        if (!value) {
            return "Date unavailable";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Date unavailable";
        }

        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    function formatDateTime(value) {
        if (!value) {
            return "Date unavailable";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Date unavailable";
        }

        return date.toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function formatPrice(value) {
        const amount = Number(value);

        if (!Number.isFinite(amount)) {
            return "Price unavailable";
        }

        return amount.toLocaleString("en-IN", {
            style: "currency",
            currency: "INR"
        });
    }

    /* =========================================
       3. PAYMENT INFORMATION
    ========================================= */

    function getPaymentMethod(order) {
        const method = String(order?.paymentMethod || "")
            .trim()
            .toUpperCase();

        if (method === "COD") {
            return "Cash on Delivery";
        }

        if (method === "ONLINE") {
            return "Online Payment";
        }

        return method || "Not specified";
    }

    function getPaymentStatus(order) {
        const status = String(order?.paymentStatus || "")
            .trim()
            .toLowerCase();

        const statuses = {
            paid: {
                label: "Paid",
                className: "payment-paid"
            },
            pending: {
                label: "Pending",
                className: "payment-pending"
            },
            failed: {
                label: "Failed",
                className: "payment-failed"
            },
            refunded: {
                label: "Refunded",
                className: "payment-refunded"
            }
        };

        return statuses[status] || {
            label: "Not recorded",
            className: "payment-unknown"
        };
    }

    /* =========================================
       4. DELIVERY INFORMATION
    ========================================= */

    function getEstimatedDeliveryDate(order) {
        const orderDate = order?.date || order?.createdAt;

        if (!orderDate) {
            return null;
        }

        const date = new Date(orderDate);

        if (Number.isNaN(date.getTime())) {
            return null;
        }

        date.setDate(date.getDate() + 5);

        return date;
    }

    function getDeliveryMessage(order, status) {
        if (status === "Cancelled") {
            return "This order has been cancelled.";
        }

        if (status === "Delivered") {
            return order.deliveredDate
                ? "Delivered on " + formatDate(order.deliveredDate)
                : "Your order is marked as delivered.";
        }

        if (status === "Unknown") {
            return "Order status is unavailable. Please contact support.";
        }

        const estimatedDate = getEstimatedDeliveryDate(order);

        if (!estimatedDate) {
            return "Your estimated delivery date is currently unavailable.";
        }

        return "Estimated delivery: " + formatDate(estimatedDate);
    }

    /* =========================================
       5. ORDER API
    ========================================= */

    
async function loadOrderFromAPI(targetOrderId) {
    const response = await fetch(
        "../backend/api/order-details.php?orderId=" +
        encodeURIComponent(targetOrderId),
        {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            headers: {
                "Accept": "application/json"
            }
        }
    );

    const text = await response.text();

    let data;

    try {
        data = JSON.parse(text);
    } catch (error) {
        console.error("Invalid order-details API response:", text);
        throw new Error(
            "The order API returned an invalid response. Check the PHP error."
        );
    }

    if (!response.ok || data.success !== true || !data.order) {
        throw new Error(
            data.message || "Could not load this order."
        );
    }

    return data.order;
}


    /*
     * Convert the database/API response into the field names
     * already used by the order-details interface.
     */
    function normalizeAPIOrder(source) {
        const items = Array.isArray(source.items)
            ? source.items.map(function (item) {
                const quantity = Math.max(
                    1,
                    Number(item.quantity) || 1
                );

                const unitPrice = Number(
                    item.unit_price ??
                    item.price ??
                    0
                );

                return {
                    id: item.id ?? item.orderItemId ?? null,
                    productId: item.productId ?? item.product_id ?? null,
                    name: item.name || item.product_name || "Product",
                    title: item.name || item.product_name || "Product",
                    image: item.image || item.product_image || "",
                    imageUrl: item.image || item.product_image || "",
                    quantity: quantity,
                    price: Number.isFinite(unitPrice) ? unitPrice : 0,
                    lineTotal: Number(
                        item.lineTotal ??
                        item.line_total ??
                        (quantity * unitPrice)
                    )
                };
            })
            : [];

        let shippingAddress = source.shipping_address || source.shippingAddress || {};

        if (typeof shippingAddress === "string") {
            try {
                shippingAddress = JSON.parse(shippingAddress);
            } catch (error) {
                shippingAddress = {
                    address: shippingAddress
                };
            }
        }

        if (!shippingAddress || typeof shippingAddress !== "object") {
            shippingAddress = {};
        }

        const customer = {
            fullName:
                source.customer_name ||
                source.customerName ||
                source.customer?.fullName ||
                source.customer?.name ||
                "",
            name:
                source.customer_name ||
                source.customerName ||
                source.customer?.name ||
                "",
            email:
                source.customer_email ||
                source.customerEmail ||
                source.customer?.email ||
                "",
            phone:
                source.customer_phone ||
                source.customerPhone ||
                source.customer?.phone ||
                "",
            address:
                shippingAddress.address ||
                shippingAddress.street ||
                shippingAddress.line1 ||
                "",
            city:
                shippingAddress.city || "",
            pincode:
                shippingAddress.pincode ||
                shippingAddress.postalCode ||
                shippingAddress.postal_code ||
                ""
        };

        const normalized = {
            id: source.id,
            orderId: String(
                source.orderId ||
                source.orderNumber ||
                source.order_number ||
                source.id ||
                ""
            ),
            orderNumber: String(
                source.orderNumber ||
                source.order_number ||
                source.orderId ||
                source.id ||
                ""
            ),
            status: source.status || "Placed",
            paymentMethod:
                source.paymentMethod ||
                source.payment_method ||
                "",
            paymentStatus:
                source.paymentStatus ||
                source.payment_status ||
                "Pending",
            subtotal: Number(source.subtotal ?? 0),
            total: Number(source.total ?? 0),
            date: source.date || source.createdAt || source.created_at || null,
            createdAt: source.createdAt || source.created_at || source.date || null,
            items: items,
            customer: customer,
            deliveredDate: source.deliveredDate || source.delivered_at || null,
            confirmedDate: source.confirmedDate || source.confirmed_at || null,
            shippedDate: source.shippedDate || source.shipped_at || null,
            cancelledDate: source.cancelledDate || source.cancelled_at || null,
            _fromAPI: true
        };

        return normalized;
    }

    function findOrder(orders, targetOrderId) {
        const target = String(targetOrderId || "").trim();

        if (!target) {
            return null;
        }

        return orders.find(function (order) {
            return order && [
                order.orderId,
                order.orderNumber,
                order.order_number,
                order.id
            ].some(function (candidate) {
                return candidate !== null &&
                    candidate !== undefined &&
                    String(candidate).trim() === target;
            });
        }) || null;
    }

    /* =========================================
       6. PAGE MESSAGES
    ========================================= */

    function showPageMessage(message, statusText) {
        if (orderDetails) {
            orderDetails.textContent = message;
        }

        if (orderStatus) {
            orderStatus.textContent = statusText || "";
            orderStatus.className = "order-status";
        }

        if (cancelOrderBtn) {
            cancelOrderBtn.style.display = "none";
        }

        if (markPaymentPaidBtn) {
            markPaymentPaidBtn.style.display = "none";
        }

        if (orderTimeline) {
            orderTimeline.replaceChildren();
        }
    }

    /* =========================================
       7. ORDER TRACKING TIMELINE
    ========================================= */

    function renderTimeline(status, order) {
        if (!orderTimeline) {
            return;
        }

        if (status === "Unknown") {
            orderTimeline.innerHTML = `
                <div>
                    <h3>Order Tracking</h3>
                    <p>Tracking is unavailable because the order status is not recognized.</p>
                </div>
            `;
            return;
        }

        if (status === "Cancelled") {
            orderTimeline.innerHTML = `
                <div class="cancelled-message">
                    <h3>Order Cancelled</h3>
                    <p>This order will not proceed to shipping or delivery.</p>
                    <p>
                        ${escapeHTML(
                            order.cancelledDate
                                ? formatDateTime(order.cancelledDate)
                                : "Cancellation date unavailable"
                        )}
                    </p>
                </div>
            `;
            return;
        }

        const milestones = [
            {
                status: "Placed",
                title: "Order Placed",
                description: "Your order has been received successfully.",
                date: order.date
            },
            {
                status: "Confirmed",
                title: "Order Confirmed",
                description: "Your order has been confirmed for processing.",
                date: order.confirmedDate
            },
            {
                status: "Shipped",
                title: "Order Shipped",
                description: "Your order has been dispatched for delivery.",
                date: order.shippedDate
            },
            {
                status: "Delivered",
                title: "Order Delivered",
                description: "Your order has reached its destination.",
                date: order.deliveredDate
            }
        ];

        const currentIndex = milestones.findIndex(function (milestone) {
            return milestone.status === status;
        });

        orderTimeline.innerHTML = `
            <h3>Order Tracking</h3>
            <p>Follow the progress of your order below.</p>

            <div class="order-timeline">
                ${milestones.map(function (milestone, index) {
                    const completed = currentIndex >= 0 && index <= currentIndex;
                    const current = index === currentIndex;

                    return `
                        <div class="timeline-step
                            ${completed ? "completed" : "pending"}
                            ${current ? "current" : ""}">

                            <div class="timeline-marker">
                                ${completed ? "✓" : index + 1}
                            </div>

                            <div class="timeline-content">
                                <h4>${escapeHTML(milestone.title)}</h4>

                                <p class="timeline-description">
                                    ${escapeHTML(milestone.description)}
                                </p>

                                <p class="timeline-date">
                                    ${escapeHTML(
                                        completed
                                            ? formatDateTime(milestone.date)
                                            : "Pending"
                                    )}
                                </p>

                                ${current ? `
                                    <span class="timeline-current-label">
                                        Current Status
                                    </span>
                                ` : ""}
                            </div>
                        </div>
                    `;
                }).join("")}
            </div>
        `;
    }

    /* =========================================
       8. ORDER STATUS BUTTONS
    ========================================= */

    function renderCancelButton(status) {
    if (!cancelOrderBtn) return;

    const canCancel =
        status === "Placed" ||
        status === "Confirmed";

    cancelOrderBtn.style.display = "inline-block";
    cancelOrderBtn.disabled = !canCancel;

    cancelOrderBtn.textContent = canCancel
        ? "Cancel Order"
        : status === "Cancelled"
            ? "Order Cancelled"
            : "Cancellation Unavailable";
}

    function renderPaymentButton(order, status) {
        if (!markPaymentPaidBtn) {
            return;
        }

        /*
         * Marking COD as paid must be persisted through a server endpoint.
         * Hide this local-only action for database-backed orders.
         */
        if (order?._fromAPI) {
            markPaymentPaidBtn.style.display = "none";
            return;
        }

        const isCOD =
            String(order?.paymentMethod || "").toUpperCase() === "COD";

        const isPending =
            String(order?.paymentStatus || "").toLowerCase() === "pending";

        const canMarkPaid =
            isCOD && isPending && status === "Delivered";

        markPaymentPaidBtn.style.display =
            canMarkPaid ? "inline-block" : "none";

        markPaymentPaidBtn.disabled = !canMarkPaid;
    }

    /* =========================================
       9. RENDER ORDER DETAILS
    ========================================= */

    function renderOrder(order) {
        if (!orderDetails || !order) {
            return;
        }

        currentOrder = order;

        const status = getSafeStatus(order);
        const customer = order.customer || {};
        const items = Array.isArray(order.items) ? order.items : [];

        const itemsHTML = items.map(function (item) {
            if (!item || typeof item !== "object") {
                return "";
            }

            const name = escapeHTML(
                item.name || item.title || "Product"
            );

            const quantity = Math.max(
                1,
                Number(item.quantity) || 1
            );

            const price = Number(item.price);
            const validPrice = Number.isFinite(price) && price >= 0
                ? price
                : null;

            const image = String(item.image || item.imageUrl || "");

            const subtotal = validPrice === null
                ? null
                : validPrice * quantity;

            return `
                <div class="order-item">
                    ${image ? `
                        <img
                            src="${escapeHTML(image)}"
                            alt="${name}"
                            class="order-item-image"
                            loading="lazy"
                            onerror="this.style.display='none'"
                        >
                    ` : ""}

                    <div class="order-item-info">
                        <h4>${name}</h4>
                        <p>Quantity: ${quantity}</p>
                        <p>
                            Unit price:
                            ${validPrice === null
                                ? "Price unavailable"
                                : formatPrice(validPrice)}
                        </p>
                    </div>

                    <div class="order-item-subtotal">
                        ${subtotal === null
                            ? "Price unavailable"
                            : formatPrice(subtotal)}
                    </div>
                </div>
            `;
        }).join("");

        const paymentMethod = getPaymentMethod(order);
        const paymentStatus = getPaymentStatus(order);

        const totalValue = Number(order.total);
        const total = Number.isFinite(totalValue)
            ? formatPrice(totalValue)
            : "Total unavailable";

        const customerName =
            customer.fullName ||
            customer.name ||
            currentUser?.name ||
            "Customer";

        orderDetails.innerHTML = `
            <div class="order-details-content">
                <h3>Order Information</h3>

                <p>
                    <strong>Order ID:</strong>
                    ${escapeHTML(order.orderId || order.orderNumber || order.id)}
                </p>

                <p>
                    <strong>Order Date:</strong>
                    ${escapeHTML(formatDate(order.date || order.createdAt))}
                </p>

                <p>
                    <strong>Customer:</strong>
                    ${escapeHTML(customerName)}
                </p>

                ${customer.email ? `
                    <p>
                        <strong>Email:</strong>
                        ${escapeHTML(customer.email)}
                    </p>
                ` : ""}

                ${customer.phone ? `
                    <p>
                        <strong>Phone:</strong>
                        ${escapeHTML(customer.phone)}
                    </p>
                ` : ""}

                ${customer.address ? `
                    <p>
                        <strong>Address:</strong>
                        ${escapeHTML(customer.address)}
                    </p>
                ` : ""}

                ${customer.city ? `
                    <p>
                        <strong>City:</strong>
                        ${escapeHTML(customer.city)}
                    </p>
                ` : ""}

                ${customer.pincode ? `
                    <p>
                        <strong>PIN Code:</strong>
                        ${escapeHTML(customer.pincode)}
                    </p>
                ` : ""}

                <h3>Payment Information</h3>

                <p>
                    <strong>Payment Method:</strong>
                    ${escapeHTML(paymentMethod)}
                </p>

                <p>
                    <strong>Payment Status:</strong>
                    <span class="payment-status ${paymentStatus.className}">
                        ${escapeHTML(paymentStatus.label)}
                    </span>
                </p>

                ${String(order.paymentMethod || "").toUpperCase() === "COD" &&
                  String(order.paymentStatus || "").toLowerCase() === "pending"
                    ? `
                        <p class="payment-note">
                            Please pay when your order is delivered.
                        </p>
                    `
                    : ""}

                <h3>Items Ordered</h3>

                <div class="order-items-list">
                    ${itemsHTML || "<p>No items found for this order.</p>"}
                </div>

                <h3>Delivery Information</h3>

                <p class="delivery-message">
                    ${escapeHTML(getDeliveryMessage(order, status))}
                </p>

                ${status === "Delivered" && order.deliveredDate ? `
                    <p>
                        <strong>Actual Delivery Date:</strong>
                        ${escapeHTML(formatDate(order.deliveredDate))}
                    </p>
                ` : ""}

                <div class="order-total">
                    Order Total: ${escapeHTML(total)}
                </div>
            </div>
        `;

        if (orderStatus) {
            orderStatus.textContent = status;
            orderStatus.className =
                "order-status-text status-" + status.toLowerCase();
        }

        renderTimeline(status, order);
        renderCancelButton(status);
        renderPaymentButton(order, status);
    }

    /* =========================================
       10. LOAD THE SELECTED ORDER
    ========================================= */

    
async function initializeOrderDetails() {
    if (!orderId) {
        showPageMessage(
            "No order ID was provided. Return to My Orders and select an order.",
            "Order not found"
        );
        return;
    }

    currentUser = readLocalUser();

    if (orderDetails) {
        orderDetails.innerHTML = "<p>Loading order details...</p>";
    }

    try {
        // Fetch this specific order from the working PHP endpoint.
        const sourceOrder = await loadOrderFromAPI(orderId);

        console.log("Order details API returned:", sourceOrder);

        // Convert database fields to the format used by this page.
        const order = normalizeAPIOrder(sourceOrder);

        console.log("Normalized order:", order);

        // Verify the requested order matches the returned order.
        const requestedId = String(orderId).trim();

        const matches = [
            order.id,
            order.orderId,
            order.orderNumber
        ].some(value =>
            value !== null &&
            value !== undefined &&
            String(value).trim() === requestedId
        );

        if (!matches) {
            showPageMessage(
                "The returned order does not match the requested order number.",
                "Order not found"
            );
            return;
        }

        // The PHP endpoint already checks ownership using the session.
        renderOrder(order);

    } catch (error) {
        console.error("Failed to load order details:", error);

        showPageMessage(
            error.message ||
            "Could not load order details. Please refresh the page.",
            "Unable to load order"
        );
    }
}


    /* =========================================
       11. VIEW INVOICE
    ========================================= */

    if (viewInvoiceBtn) {
        viewInvoiceBtn.addEventListener("click", function () {
            if (!orderId) {
                alert("Order ID is missing.");
                return;
            }

            window.location.href =
                "invoice.html?orderId=" + encodeURIComponent(orderId);
        });
    }

    /* =========================================
       12. PRINT RECEIPT
    ========================================= */

    function printOrderReceipt() {
        const order = currentOrder;

        if (!order) {
            alert("Order details are not available yet.");
            return;
        }

        if (!isOrderOwner(order, currentUser)) {
            alert("Order could not be verified.");
            return;
        }

        const customer = order.customer || {};
        const items = Array.isArray(order.items) ? order.items : [];

        const itemsHTML = items.map(function (item) {
            const quantity = Math.max(1, Number(item.quantity) || 1);
            const price = Number(item.price);
            const safePrice =
                Number.isFinite(price) && price >= 0 ? price : 0;

            return `
                <tr>
                    <td>${escapeHTML(item.name || item.title || "Product")}</td>
                    <td>${quantity}</td>
                    <td>${formatPrice(safePrice)}</td>
                    <td>${formatPrice(safePrice * quantity)}</td>
                </tr>
            `;
        }).join("");

        const total = Number(order.total);
        const safeTotal =
            Number.isFinite(total) && total >= 0 ? total : 0;

        const receiptWindow = window.open(
            "",
            "_blank",
            "width=850,height=700"
        );

        if (!receiptWindow) {
            alert("The receipt window was blocked. Allow pop-ups and try again.");
            return;
        }

        receiptWindow.document.open();

        receiptWindow.document.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Velora Order Receipt</title>

                <style>
                    body {
                        font-family: Arial, sans-serif;
                        max-width: 800px;
                        margin: 30px auto;
                        padding: 20px;
                        color: #222;
                    }

                    h1, h2 {
                        margin-bottom: 8px;
                    }

                    .muted {
                        color: #666;
                    }

                    .section {
                        margin-top: 24px;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 12px;
                    }

                    th, td {
                        border-bottom: 1px solid #ddd;
                        padding: 12px 8px;
                        text-align: left;
                    }

                    .total {
                        text-align: right;
                        font-size: 20px;
                        font-weight: bold;
                        margin-top: 20px;
                    }

                    @media print {
                        body {
                            margin: 0;
                        }

                        .no-print {
                            display: none;
                        }
                    }
                </style>
            </head>

            <body>
                <h1>Velora</h1>
                <p class="muted">Order Receipt</p>

                <div class="section">
                    <h2>Order Information</h2>
                    <p><strong>Order ID:</strong> ${escapeHTML(order.orderId)}</p>
                    <p><strong>Order Date:</strong> ${escapeHTML(formatDateTime(order.date))}</p>
                    <p><strong>Status:</strong> ${escapeHTML(order.status)}</p>
                </div>

                <div class="section">
                    <h2>Customer Information</h2>
                    <p><strong>Name:</strong> ${escapeHTML(customer.fullName || customer.name || "Customer")}</p>
                    <p><strong>Email:</strong> ${escapeHTML(customer.email || "")}</p>
                    <p><strong>Phone:</strong> ${escapeHTML(customer.phone || "")}</p>
                    <p><strong>Address:</strong> ${escapeHTML(customer.address || "")}</p>
                    <p><strong>City:</strong> ${escapeHTML(customer.city || "")}</p>
                    <p><strong>PIN Code:</strong> ${escapeHTML(customer.pincode || "")}</p>
                </div>

                <div class="section">
                    <h2>Items</h2>

                    <table>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${itemsHTML || "<tr><td colspan='4'>No items available</td></tr>"}
                        </tbody>
                    </table>

                    <p class="total">
                        Order Total: ${formatPrice(safeTotal)}
                    </p>
                </div>

                <div class="section">
                    <h2>Payment Information</h2>
                    <p><strong>Payment Method:</strong> ${escapeHTML(getPaymentMethod(order))}</p>
                    <p><strong>Payment Status:</strong> ${escapeHTML(getPaymentStatus(order).label)}</p>
                </div>

                <p class="muted section">
                    This receipt reflects the order information currently saved in Velora.
                </p>

                <button class="no-print" onclick="window.print()">
                    Print Receipt
                </button>
            </body>
            </html>
        `);

        receiptWindow.document.close();
    }

    if (printReceiptBtn) {
        printReceiptBtn.addEventListener("click", printOrderReceipt);
    }

    /* =========================================
       13. LEGACY LOCAL-ONLY ACTIONS
    ========================================= */

    /*
     * The following handlers are retained for older localStorage orders.
     * For API-backed orders, the cancellation and payment buttons are
     * hidden until server endpoints are implemented to persist those
     * changes safely in Supabase.
     */

    function loadLegacyOrders() {
        try {
            const orders = JSON.parse(
                localStorage.getItem("veloraOrderHistory") || "[]"
            );

            return Array.isArray(orders) ? orders : [];
        } catch (error) {
            console.error("Could not read legacy order history:", error);
            return [];
        }
    }

    function saveLegacyOrders(orders) {
        try {
            localStorage.setItem(
                "veloraOrderHistory",
                JSON.stringify(orders)
            );

            return true;
        } catch (error) {
            console.error("Could not save legacy orders:", error);
            return false;
        }
    }

    function findLegacyOrder(orders, targetId) {
        return orders.find(function (order) {
            return order && String(order.orderId) === String(targetId);
        }) || null;
    }

    if (cancelOrderBtn) {
        cancelOrderBtn.addEventListener("click", function () {
            if (!currentOrder) {
                alert("Order details are not available yet.");
                return;
            }

            const status = getSafeStatus(currentOrder);

            if (!["Placed", "Confirmed"].includes(status)) {
                alert("This order can no longer be cancelled.");
                return;
            }

            if (!window.confirm("Are you sure you want to cancel this order?")) {
                return;
            }

            if (currentOrder._fromAPI) {
                alert(
                    "The Cancel Order button is now available. " +
                    "Database cancellation will be connected when we set up " +
                    "the admin panel."
                );
                return;
            }

            const orders = loadLegacyOrders();
            const order = findLegacyOrder(orders, orderId);

            if (!order || !isOrderOwner(order, currentUser)) {
                alert("Order could not be verified.");
                return;
            }

            order.status = "Cancelled";
            order.cancelledDate = new Date().toISOString();

            if (!saveLegacyOrders(orders)) {
                alert("Could not save the cancellation.");
                return;
            }

            renderOrder(order);
            alert("The order has been cancelled.");
        });
    }

    if (markPaymentPaidBtn) {
        markPaymentPaidBtn.addEventListener("click", function () {
            if (currentOrder?._fromAPI) {
                alert(
                    "Payment updates must be connected to a server endpoint before they can update your database."
                );
                return;
            }

            const orders = loadLegacyOrders();
            const order = findLegacyOrder(orders, orderId);

            if (!order || !isOrderOwner(order, currentUser)) {
                alert("Order could not be verified.");
                return;
            }

            const isCOD =
                String(order.paymentMethod || "").toUpperCase() === "COD";

            const isPending =
                String(order.paymentStatus || "").toLowerCase() === "pending";

            if (
                !isCOD ||
                !isPending ||
                getSafeStatus(order) !== "Delivered"
            ) {
                alert(
                    "Only delivered COD orders with pending payment can be marked as paid."
                );
                return;
            }

            if (!window.confirm("Confirm that the COD payment has actually been collected?")) {
                return;
            }

            order.paymentStatus = "Paid";
            order.paymentCollectedDate = new Date().toISOString();

            if (!saveLegacyOrders(orders)) {
                alert("Could not save the payment status.");
                return;
            }

            renderOrder(order);
            alert("Local payment status updated.");
        });
    }

    /* =========================================
       14. LEGACY STATUS TRANSITION HELPER
    ========================================= */

    function updateOrderStatus(orderIdToUpdate, newStatus) {
        if (!VALID_STATUSES.includes(newStatus)) {
            console.error("Invalid order status:", newStatus);
            return false;
        }

        const orders = loadLegacyOrders();
        const order = findLegacyOrder(orders, orderIdToUpdate);

        if (!order) {
            console.error("Legacy order not found:", orderIdToUpdate);
            return false;
        }

        const currentStatus = getSafeStatus(order);

        if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus)) {
            console.error(
                `Invalid status transition: ${currentStatus} → ${newStatus}`
            );
            return false;
        }

        const now = new Date().toISOString();

        if (newStatus === "Confirmed" && !order.confirmedDate) {
            order.confirmedDate = now;
        }

        if (newStatus === "Shipped" && !order.shippedDate) {
            order.shippedDate = now;
        }

        if (newStatus === "Delivered" && !order.deliveredDate) {
            order.deliveredDate = now;
        }

        if (newStatus === "Cancelled" && !order.cancelledDate) {
            order.cancelledDate = now;
        }

        order.status = newStatus;

        if (!saveLegacyOrders(orders)) {
            return false;
        }

        console.log(
            `Legacy order ${orderIdToUpdate}: ${currentStatus} → ${newStatus}`
        );

        return true;
    }

    window.updateVeloraOrderStatus = updateOrderStatus;

    /* =========================================
       15. REFRESH ON STORAGE CHANGES
    ========================================= */

    window.addEventListener("storage", function (event) {
        if (
            event.key === "veloraOrderHistory" ||
            event.key === "veloraCurrentUser" ||
            event.key === null
        ) {
            initializeOrderDetails();
        }
    });

    /* =========================================
       16. INITIAL LOAD
    ========================================= */

    initializeOrderDetails();
});
