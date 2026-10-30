
/* =====================================================
   VELORA — MY ORDERS
   Database Integration, Cancellation & Responsive Layout
===================================================== */

document.addEventListener("DOMContentLoaded", function () {
    const container = document.getElementById("myOrdersContainer");

    if (!container) {
        console.error("My Orders container not found.");
        return;
    }

    let isLoading = false;
    let lastOrders = [];

    // -------------------------------------------------
    // RESPONSIVE STYLES
    // -------------------------------------------------

    function installMyOrdersStyles() {
        if (document.getElementById("velora-my-orders-styles")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "velora-my-orders-styles";

        style.textContent = `
            .my-order-card {
                box-sizing: border-box;
                width: 100%;
                min-width: 0;
                margin: 0 0 24px;
                padding: 24px;
                overflow: hidden;
                border: 1px solid #e5e7eb;
                border-radius: 16px;
                background: #fff;
            }

            .my-order-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 12px;
                min-width: 0;
            }

            .my-order-heading {
                min-width: 0;
                overflow-wrap: anywhere;
            }

            .my-order-number {
                overflow-wrap: anywhere;
                word-break: break-word;
            }

            .my-order-items {
                display: flex;
                flex-direction: column;
                gap: 14px;
                width: 100%;
                min-width: 0;
                margin: 18px 0;
            }

            .my-order-item {
                display: grid !important;
                grid-template-columns: 96px minmax(0, 1fr) auto !important;
                align-items: center;
                gap: 16px;
                width: 100%;
                max-width: 100%;
                min-width: 0;
                box-sizing: border-box;
            }

            .my-order-item img.my-order-item-image {
                display: block;
                width: 96px !important;
                min-width: 96px !important;
                max-width: 96px !important;
                height: 110px !important;
                max-height: 110px !important;
                object-fit: contain !important;
                background: #f7f7f7;
                border-radius: 8px;
                box-sizing: border-box;
                }

            .my-order-item-info {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
                width: 100%;
                min-width: 0;
                overflow-wrap: anywhere;
            }

            .my-order-item-name {
                display: block;
                width: 100%;
                min-width: 0;
                font-size: 16px;
                overflow-wrap: anywhere;
                word-break: normal;
                line-height: 1.45;
            }

            .my-order-item-quantity {
                color: #666;
                font-size: 14px;
            }

            .my-order-item-price {
                min-width: 0;
                text-align: right;
                white-space: nowrap;
            }

            .my-order-delivery {
                margin: 16px 0;
                line-height: 1.6;
                overflow-wrap: anywhere;
            }

            .my-order-payment {
                display: flex;
                flex-wrap: wrap;
                gap: 8px 24px;
                min-width: 0;
                overflow-wrap: anywhere;
            }

            .my-order-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 16px;
                margin-top: 20px;
                padding-top: 16px;
                border-top: 1px solid #eee;
            }

            .my-order-total {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }

            .my-order-actions {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 10px;
            }

            .my-order-actions button,
            .my-order-actions a {
                box-sizing: border-box;
            }

            .my-order-cancel-btn {
                border: 1px solid #c62828;
                color: #c62828;
                background: #fff;
                cursor: pointer;
            }

            .my-order-cancel-btn:hover {
                color: #fff;
                background: #c62828;
            }

            .my-order-cancel-btn:disabled {
                cursor: wait;
                opacity: .6;
            }

            .my-order-status {
                display: inline-block;
                padding: 8px 12px;
                border-radius: 24px;
                font-size: 13px;
                font-weight: 600;
                white-space: nowrap;
            }

            .status-placed,
            .status-confirmed {
                color: #925700;
                background: #fff1c2;
            }

            .status-shipped {
                color: #1557a0;
                background: #e2efff;
            }

            .status-delivered {
                color: #176b38;
                background: #dcf7e5;
            }

            .status-cancelled {
                color: #a51d1d;
                background: #fde4e4;
            }

            .my-orders-notice {
                margin: 0 0 16px;
                padding: 12px 16px;
                border-radius: 8px;
                line-height: 1.5;
            }

            .my-orders-notice-success {
                color: #176b38;
                background: #e6f7eb;
            }

            .my-orders-notice-error {
                color: #a51d1d;
                background: #fdeaea;
            }

            .my-orders-loading {
                padding: 20px 0;
            }

            .my-orders-empty {
                padding: 28px 20px;
                text-align: center;
            }

            @media (max-width: 600px) {
                .my-order-card {
                    padding: 16px;
                    border-radius: 12px;
                }

                .my-order-item {
                    grid-template-columns: 76px minmax(0, 1fr) !important;
                    gap: 12px;
                    align-items: start;
                }

                .my-order-item img.my-order-item-image  {
                    width: 76px !important;
                    height: 88px !important;
                    min-width: 76 !important;
                    max-width: 76 !important;
                    max-height: 88px !important;
                }

                .my-order-item-info {
                    padding-top: 4px;
                }

                .my-order-item-price {
                    grid-column: 2;
                    text-align: left;
                    white-space: normal;
                }

                .my-order-footer {
                    align-items: flex-start;
                    flex-direction: column;
                }

                .my-order-actions {
                    width: 100%;
                }

                .my-order-actions a,
                .my-order-actions button {
                    flex: 1 1 auto;
                    text-align: center;
                }
            }
        `;

        document.head.appendChild(style);
    }

    installMyOrdersStyles();

    // -------------------------------------------------
    // HTML SAFETY
    // -------------------------------------------------

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (char) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[char];
        });
    }

    // -------------------------------------------------
    // FORMAT PRICE
    // -------------------------------------------------

    function formatPrice(value) {
        const amount = Number(value);

        if (!Number.isFinite(amount)) {
            return "₹0.00";
        }

        return "₹" + amount.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // -------------------------------------------------
    // FORMAT DATE
    // -------------------------------------------------

    function parseDate(value) {
        if (!value) return null;

        const date = new Date(value);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    function formatDate(value) {
        const date = parseDate(value);

        if (!date) return "Date unavailable";

        return date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function formatDeliveryDate(value) {
        const date = parseDate(value);

        if (!date) return "Date unavailable";

        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    // -------------------------------------------------
    // ORDER STATUS
    // -------------------------------------------------

    function getStatus(order) {
        const actualStatus = String(order.status || "Placed")
            .trim()
            .toLowerCase();

        const statuses = {
            placed: "Placed",
            confirmed: "Confirmed",
            shipped: "Shipped",
            delivered: "Delivered",
            cancelled: "Cancelled"
        };

        return statuses[actualStatus] || "Placed";
    }

    function getStatusClass(status) {
        return String(status)
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "");
    }

    // -------------------------------------------------
    // ORDER NUMBER
    // -------------------------------------------------

    function getOrderNumber(order) {
        for (const candidate of [
            order.orderNumber,
            order.orderId
        ]) {
            if (candidate === null || candidate === undefined) {
                continue;
            }

            const value = String(candidate).trim();

            if (
                value &&
                value !== "null" &&
                value !== "undefined"
            ) {
                return value;
            }
        }

        return "";
    }

    // -------------------------------------------------
    // ORDER DETAILS URL
    // -------------------------------------------------

    function getOrderDetailsURL(order) {
        const orderNumber = getOrderNumber(order);

        if (!orderNumber) return "";

        return "order-details.html?orderId=" +
            encodeURIComponent(orderNumber);
    }

    // -------------------------------------------------
    // PAYMENT
    // -------------------------------------------------

    function getPaymentMethod(order) {
        const method = String(
            order.paymentMethod || order.payment_method || ""
        ).trim().toUpperCase();

        if (method === "COD") return "Cash on Delivery";
        if (method === "ONLINE") return "Online Payment";

        return method || "Not specified";
    }

    function getPaymentStatus(order) {
        const rawStatus = order.paymentStatus ??
            order.payment_status ??
            "Pending";

        const status = String(rawStatus).trim().toLowerCase();

        const statuses = {
            pending: ["Pending", "payment-pending"],
            paid: ["Paid", "payment-paid"],
            failed: ["Failed", "payment-failed"],
            refunded: ["Refunded", "payment-refunded"]
        };

        const result = statuses[status];

        return result
            ? { label: result[0], className: result[1] }
            : { label: "Not recorded", className: "payment-unknown" };
    }

    // -------------------------------------------------
    // DELIVERY ESTIMATE
    // -------------------------------------------------

    function renderDeliveryInformation(order) {
        const status = getStatus(order);

        if (status === "Cancelled") {
            return `
                <div class="my-order-delivery">
                    <strong>Order cancelled</strong>
                </div>
            `;
        }

        if (status === "Delivered") {
            const deliveredDate = order.deliveredDate ||
                order.delivered_date;

            return `
                <div class="my-order-delivery">
                    <strong>Delivered</strong>
                    ${deliveredDate
                        ? " on " + escapeHTML(
                            formatDeliveryDate(deliveredDate)
                        )
                        : ""}
                </div>
            `;
        }

        const orderDate = parseDate(
            order.createdAt || order.created_at
        );

        if (!orderDate) return "";

        const expectedDate = new Date(orderDate);
        expectedDate.setDate(expectedDate.getDate() + 5);

        let message = "Expected delivery by:";

        if (status === "Shipped") {
            message = "Your order is on its way. Expected delivery by:";
        } else if (status === "Confirmed") {
            message = "Order confirmed. Expected delivery by:";
        }

        return `
            <div class="my-order-delivery">
                <strong>${escapeHTML(message)}</strong>
                ${escapeHTML(formatDeliveryDate(expectedDate))}
            </div>
        `;
    }

    // -------------------------------------------------
    // ORDER ITEMS
    // -------------------------------------------------

    function renderOrderItems(order) {
        const items = Array.isArray(order.items) ? order.items : [];

        if (!items.length) {
            return `
                <div class="my-order-items">
                    <p>Item details are unavailable.</p>
                </div>
            `;
        }

        return `
            <div class="my-order-items">
                ${items.map(function (item) {
                    const name = item.name ||
                        item.product_name ||
                        "Product";

                    const quantity = Math.max(
                        1,
                        Number(item.quantity) || 1
                    );

                    const price = Number(
                        item.unit_price ?? item.price ?? 0
                    );

                    const lineTotal = Number(
                        item.lineTotal ?? item.line_total
                    );

                    const total = Number.isFinite(lineTotal)
                        ? lineTotal
                        : (Number.isFinite(price) ? price : 0) *
                            quantity;

                    const image = item.image ||
                        item.product_image ||
                        "";

                    return `
                        <div class="my-order-item">
                            ${image ? `
                                <img
                                    class="my-order-item-image"
                                    src="${escapeHTML(image)}"
                                    alt="${escapeHTML(name)}"
                                    loading="lazy"
                                    decoding="async"
                                    onerror="this.style.display='none'"
                                >
                            ` : ""}

                            <div class="my-order-item-info">
                                <span class="my-order-item-name">
                                    ${escapeHTML(name)}
                                </span>

                                <span class="my-order-item-quantity">
                                    × ${quantity}
                                </span>
                            </div>

                            <strong class="my-order-item-price">
                                ${formatPrice(total)}
                            </strong>
                        </div>
                    `;
                }).join("")}
            </div>
        `;
    }

    // -------------------------------------------------
    // NOTICES
    // -------------------------------------------------

    function showNotice(message, type) {
        let notice = document.getElementById("myOrdersNotice");

        if (!notice) {
            notice = document.createElement("div");
            notice.id = "myOrdersNotice";
            notice.setAttribute("role", "status");
            container.prepend(notice);
        }

        notice.className = "my-orders-notice " +
            (type === "success"
                ? "my-orders-notice-success"
                : "my-orders-notice-error");

        notice.textContent = message;
    }

    // -------------------------------------------------
    // RENDER ONE ORDER
    // -------------------------------------------------

    function renderOrder(order) {
        const orderNumber = getOrderNumber(order);
        const status = getStatus(order);
        const payment = getPaymentStatus(order);
        const detailsURL = getOrderDetailsURL(order);

        const canCancel = Boolean(orderNumber) &&
            ["Placed", "Confirmed"].includes(status);

        const card = document.createElement("article");
        card.className = "my-order-card";
        card.dataset.orderNumber = orderNumber;

        const detailsAction = detailsURL
            ? `
                <a
                    href="${escapeHTML(detailsURL)}"
                    class="btn my-order-details-btn"
                    data-order-details
                    data-order-number="${escapeHTML(orderNumber)}"
                >View Details</a>
            `
            : `
                <button type="button" class="btn" disabled>
                    Details unavailable
                </button>
            `;

        const cancelAction = canCancel
            ? `
                <button
                    type="button"
                    class="btn my-order-cancel-btn"
                    data-cancel-order
                    data-order-number="${escapeHTML(orderNumber)}"
                >Cancel Order</button>
            `
            : "";

        card.innerHTML = `
            <div class="my-order-header">
                <div class="my-order-heading">
                    <p class="my-order-label">ORDER ID</p>

                    <h3 class="my-order-number">
                        ${escapeHTML(orderNumber || "Unavailable")}
                    </h3>

                    <p class="my-order-date">
                        ${escapeHTML(formatDate(
                            order.createdAt || order.created_at
                        ))}
                    </p>
                </div>

                <span class="my-order-status status-${getStatusClass(status)}">
                    ${escapeHTML(status)}
                </span>
            </div>

            ${renderDeliveryInformation(order)}
            ${renderOrderItems(order)}

            <div class="my-order-payment">
                <p>
                    <strong>Payment:</strong>
                    ${escapeHTML(getPaymentMethod(order))}
                </p>

                <p>
                    <strong>Payment Status:</strong>
                    <span class="payment-status ${payment.className}">
                        ${escapeHTML(payment.label)}
                    </span>
                </p>
            </div>

            <div class="my-order-footer">
                <div class="my-order-total">
                    <span>Order Total</span>
                    <strong>${formatPrice(order.total)}</strong>
                </div>

                <div class="my-order-actions">
                    ${detailsAction}
                    ${cancelAction}
                </div>
            </div>
        `;

        return card;
    }

    // -------------------------------------------------
    // EMPTY STATE
    // -------------------------------------------------

    function renderEmptyState() {
        container.innerHTML = `
            <div class="my-orders-empty">
                <h2>No orders yet</h2>
                <p>You have not placed any orders yet.</p>
                <a href="products.html" class="btn">Start Shopping</a>
            </div>
        `;
    }

    // -------------------------------------------------
    // ERROR STATE
    // -------------------------------------------------

    function renderError(message) {
        container.innerHTML = `
            <div class="my-orders-empty my-orders-error">
                <h2>Unable to load orders</h2>
                <p>${escapeHTML(message)}</p>
                <button type="button" class="btn" id="retryOrdersButton">
                    Try Again
                </button>
            </div>
        `;

        document.getElementById("retryOrdersButton")
            ?.addEventListener("click", loadOrders);
    }

    // -------------------------------------------------
    // LOAD ORDERS
    // -------------------------------------------------

    async function loadOrders(options = {}) {
        if (isLoading) return;

        isLoading = true;

        const showLoading = options.showLoading !== false;

        if (showLoading) {
            container.innerHTML = `
                <div class="my-orders-loading">
                    <p>Loading your orders...</p>
                </div>
            `;
        }

        try {
            const response = await fetch("../backend/api/orders.php", {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store",
                headers: { "Accept": "application/json" }
            });

            let data;

            try {
                data = await response.json();
            } catch {
                throw new Error(
                    "The server returned an invalid response."
                );
            }

            if (response.status === 401 || response.status === 403) {
                window.location.href = "login.html";
                return;
            }

            if (!response.ok || data.success !== true) {
                throw new Error(
                    data.message ||
                    data.error ||
                    "Could not retrieve your orders."
                );
            }

            const orders = Array.isArray(data.orders)
                ? data.orders
                : [];

            lastOrders = orders;

            console.log(
                "Velora My Orders: loaded",
                orders.length,
                "orders from the database."
            );

            if (!orders.length) {
                renderEmptyState();
                return;
            }

            container.innerHTML = "";

            const fragment = document.createDocumentFragment();

            orders.forEach(function (order) {
                fragment.appendChild(renderOrder(order));
            });

            container.appendChild(fragment);

        } catch (error) {
            console.error("My Orders API error:", error);

            renderError(
                error.message ||
                "Please check your connection and try again."
            );
        } finally {
            isLoading = false;
        }
    }

    // -------------------------------------------------
    // CANCEL ORDER
    // -------------------------------------------------

    async function cancelOrder(button) {
        const orderNumber = String(
            button.dataset.orderNumber || ""
        ).trim();

        if (!orderNumber) {
            showNotice("This order has no valid order number.", "error");
            return;
        }

        const order = lastOrders.find(function (item) {
            return getOrderNumber(item) === orderNumber;
        });

        if (!order) {
            showNotice(
                "Order information is out of date. Please refresh the page.",
                "error"
            );
            return;
        }

        const status = getStatus(order);

        if (!["Placed", "Confirmed"].includes(status)) {
            showNotice(
                "This order can no longer be cancelled.",
                "error"
            );
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to cancel order " +
            orderNumber +
            "?"
        );

        if (!confirmed) return;

        button.disabled = true;
        button.textContent = "Cancelling...";

        try {
            const response = await fetch("../backend/api/update-order-status.php", {
                method: "POST",
                credentials: "same-origin",
                cache: "no-store",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    orderNumber: orderNumber
                })
            });

            let data;

            try {
                data = await response.json();
            } catch {
                throw new Error(
                    "The server returned an invalid cancellation response."
                );
            }

            if (response.status === 401 || response.status === 403) {
                window.location.href = "login.html";
                return;
            }

            if (!response.ok || data.success !== true) {
                throw new Error(
                    data.message || "The order could not be cancelled."
                );
            }

            showNotice(
                data.message || "Order cancelled successfully.",
                "success"
            );

            // Refresh the cards from the database so the status is current.
            await loadOrders({ showLoading: false });

            // Recreate the success notice after the list has been rendered.
            showNotice(
                data.message || "Order cancelled successfully.",
                "success"
            );

        } catch (error) {
            console.error("Cancel order error:", error);

            showNotice(
                error.message || "Unable to cancel this order.",
                "error"
            );

            button.disabled = false;
            button.textContent = "Cancel Order";
        }
    }

    // -------------------------------------------------
    // DELEGATED CLICK HANDLERS
    // -------------------------------------------------

    container.addEventListener("click", function (event) {
        const cancelButton = event.target.closest("[data-cancel-order]");

        if (cancelButton) {
            event.preventDefault();
            cancelOrder(cancelButton);
            return;
        }

        const link = event.target.closest("[data-order-details]");

        if (!link) return;

        const orderNumber = String(
            link.dataset.orderNumber || ""
        ).trim();

        if (!orderNumber) {
            event.preventDefault();

            alert(
                "This order does not have a valid order number. " +
                "Please refresh My Orders and try again."
            );

            return;
        }

        event.preventDefault();

        const url = new URL(
            "order-details.html",
            window.location.href
        );

        url.searchParams.set("orderId", orderNumber);
        window.location.href = url.toString();
    });

    // -------------------------------------------------
    // INITIAL LOAD & PAGE RESTORE
    // -------------------------------------------------

    loadOrders();

    window.addEventListener("pageshow", function (event) {
        if (event.persisted) {
            loadOrders({ showLoading: false });
        }
    });

    document.addEventListener("visibilitychange", function () {
        if (!document.hidden && lastOrders.length === 0) {
            loadOrders({ showLoading: false });
        }
    });
});
