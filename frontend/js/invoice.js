
(function () {
    "use strict";

    async function initializeInvoice() {
        const invoicePage = document.getElementById("invoicePage");
        const invoiceActions = document.getElementById("invoiceActions");

        if (!invoicePage) {
            console.error("Invoice page element #invoicePage was not found.");
            return;
        }

        function escapeHTML(value) {
            return String(value ?? "").replace(/[&<>"']/g, char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[char]);
        }

        function money(value) {
            return "₹" + (Number(value) || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }

        function formatDate(value) {
            if (!value) return "Not available";

            const parsed = new Date(value);

            return Number.isNaN(parsed.getTime())
                ? "Not available"
                : parsed.toLocaleString("en-IN");
        }

        function showError(message) {
            invoicePage.innerHTML = `
                <div class="invoice-message">
                    <h2>Invoice Unavailable</h2>
                    <p>${escapeHTML(message)}</p>
                    <a href="my-orders.html">Return to My Orders</a>
                </div>
            `;

            if (invoiceActions) {
                invoiceActions.style.display = "none";
            }
        }

        function parseAddress(value) {
            if (value && typeof value === "object") return value;
            if (!value) return {};

            try {
                return JSON.parse(value);
            } catch {
                return { address: String(value) };
            }
        }

        function paymentLabel(value) {
            const method = String(value || "COD").toUpperCase();

            return method === "COD"
                ? "Cash on Delivery"
                : method;
        }

        const params = new URLSearchParams(window.location.search);

        const requestedOrderId =
            params.get("orderId") ||
            params.get("orderNumber") ||
            params.get("order_number");

        console.log("INVOICE PAGE URL:", window.location.href);
        console.log("REQUESTED ORDER ID:", requestedOrderId);

        if (!requestedOrderId) {
            showError("The invoice URL does not contain an order ID.");
            return;
        }

        invoicePage.innerHTML = "<p>Loading invoice...</p>";

        try {
            const apiURL =
                "../backend/api/order-details.php?orderId=" +
                encodeURIComponent(requestedOrderId);

            console.log("INVOICE API URL:", apiURL);

            const response = await fetch(apiURL, {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store",
                headers: {
                    "Accept": "application/json"
                }
            });

            const responseText = await response.text();

            console.log("INVOICE API HTTP STATUS:", response.status);
            console.log("INVOICE API RAW RESPONSE:", responseText);

            let data;

            try {
                data = JSON.parse(responseText);
            } catch (error) {
                throw new Error(
                    "The order API did not return valid JSON. Check the Console."
                );
            }

            console.log("INVOICE API SUCCESS:", data.success);
            console.log("INVOICE API MESSAGE:", data.message);
            console.log("INVOICE API ORDER:", data.order);

            if (!response.ok) {
                throw new Error(
                    data.message || "The order API returned HTTP " + response.status
                );
            }

            if (data.success !== true || !data.order) {
                throw new Error(
                    data.message || "The API did not return an order."
                );
            }

            const order = data.order;

            const orderNumber =
                order.order_number ||
                order.orderNumber ||
                order.orderId;

            const matchesRequestedOrder = [
                order.order_number,
                order.orderNumber,
                order.orderId,
                order.id
            ].some(value =>
                value !== null &&
                value !== undefined &&
                String(value) === String(requestedOrderId)
            );

            console.log("INVOICE ORDER NUMBER:", orderNumber);
            console.log("INVOICE ORDER MATCH:", matchesRequestedOrder);

            if (!matchesRequestedOrder) {
                throw new Error(
                    "The API returned an order that does not match the URL."
                );
            }

            const items = Array.isArray(order.items)
                ? order.items
                : [];

            const address = parseAddress(order.shipping_address);

            const addressText = [
                address.address,
                address.city,
                address.state,
                address.pincode || address.postalCode,
                address.country
            ].filter(Boolean).join(", ");

            const itemRows = items.map(item => {
                const quantity = Number(item.quantity) || 0;
                const unitPrice = Number(item.unit_price) || 0;

                const lineTotal = item.line_total != null
                    ? Number(item.line_total)
                    : unitPrice * quantity;

                return `
                    <tr>
                        <td>${escapeHTML(
                            item.product_name || item.name || "Product"
                        )}</td>
                        <td class="number">${quantity}</td>
                        <td class="number">${money(unitPrice)}</td>
                        <td class="number">${money(lineTotal)}</td>
                    </tr>
                `;
            }).join("");

            const cleanOrderNumber = String(orderNumber)
                .replace(/[^a-zA-Z0-9]/g, "")
                .slice(-12);

            const invoiceNumber =
                "INV-" + new Date().getFullYear() + "-" + cleanOrderNumber;

            invoicePage.innerHTML = `
                <header class="invoice-header">
                    <div class="invoice-brand">
                        <h1>VELORA</h1>
                        <p>Style for Every Day</p>
                    </div>

                    <div class="invoice-meta">
                        <p><strong>Invoice Number:</strong>
                            ${escapeHTML(invoiceNumber)}</p>
                        <p><strong>Order ID:</strong>
                            ${escapeHTML(orderNumber)}</p>
                        <p><strong>Order Date:</strong>
                            ${escapeHTML(formatDate(order.created_at))}</p>
                    </div>
                </header>

                <h2 class="invoice-title">INVOICE</h2>

                <section class="invoice-info-grid">
                    <div class="invoice-info-box">
                        <h3>Bill To</h3>
                        <p><strong>${escapeHTML(
                            order.customer_name || "Customer"
                        )}</strong></p>
                        <p>${escapeHTML(
                            order.customer_email || "Not provided"
                        )}</p>
                        <p>${escapeHTML(
                            order.customer_phone || "Not provided"
                        )}</p>
                        <p>${escapeHTML(
                            addressText || "Address not provided"
                        )}</p>
                    </div>

                    <div class="invoice-info-box">
                        <h3>Payment Information</h3>
                        <p><strong>Method:</strong>
                            ${escapeHTML(paymentLabel(order.payment_method))}</p>
                        <p><strong>Payment Status:</strong>
                            ${escapeHTML(order.payment_status || "Pending")}</p>
                        <p><strong>Order Status:</strong>
                            ${escapeHTML(order.status || "Placed")}</p>
                    </div>
                </section>

                <h3>Order Items</h3>

                <div class="invoice-table-wrap">
                    <table class="invoice-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th class="number">Qty</th>
                                <th class="number">Unit Price</th>
                                <th class="number">Subtotal</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${itemRows || `
                                <tr>
                                    <td colspan="4">No items found.</td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>

                <section class="invoice-total">
                    <div class="invoice-total-row">
                        <span>Subtotal</span>
                        <span>${money(order.subtotal)}</span>
                    </div>

                    <div class="invoice-total-row invoice-grand-total">
                        <span>Total</span>
                        <span>${money(order.total)}</span>
                    </div>
                </section>

                <footer class="invoice-footer">
                    <p>Thank you for shopping with Velora!</p>
                    <p>Please retain this invoice for your records.</p>
                </footer>
            `;

            if (invoiceActions) {
                invoiceActions.style.display = "flex";
            }

            console.log("INVOICE RENDERED SUCCESSFULLY.");

        } catch (error) {
            console.error("INVOICE LOADING ERROR:", error);
            showError(error.message || "Unable to load the invoice.");
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializeInvoice,
            { once: true }
        );
    } else {
        initializeInvoice();
    }
})();
