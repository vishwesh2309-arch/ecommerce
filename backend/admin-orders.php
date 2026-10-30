<?php
declare(strict_types=1);

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/admin-auth.php';

requireVeloraAdmin($pdo);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Velora | Admin Orders</title>

    <style>
        * { box-sizing: border-box; }

        body {
            margin: 0;
            padding: 24px;
            background: #f5f6f8;
            color: #222;
            font-family: Arial, sans-serif;
        }

        .container {
            max-width: 1250px;
            margin: auto;
        }

        header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            flex-wrap: wrap;
            margin-bottom: 24px;
        }

        h1 { margin: 0; font-size: 28px; }

        a { color: #333; }

        .toolbar {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-bottom: 18px;
        }

        input, select, button {
            font: inherit;
            padding: 10px 12px;
            border: 1px solid #d5d9df;
            border-radius: 7px;
            background: white;
        }

        input { flex: 1; min-width: 220px; }

        button { cursor: pointer; }

        button:disabled { opacity: .6; cursor: wait; }

        .summary {
            margin-bottom: 16px;
            color: #555;
        }

        .table-wrap {
            overflow-x: auto;
            background: white;
            border: 1px solid #e1e4e8;
            border-radius: 10px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            min-width: 950px;
        }

        th, td {
            padding: 14px;
            border-bottom: 1px solid #eceef1;
            text-align: left;
            vertical-align: top;
        }

        th {
            background: #f9fafb;
            font-size: 13px;
        }

        td { font-size: 14px; }

        .status {
            display: inline-block;
            padding: 5px 8px;
            border-radius: 20px;
            background: #fff3d6;
            color: #805b00;
            white-space: nowrap;
        }

        #message {
            margin: 12px 0;
            color: #444;
        }

        @media (max-width: 600px) {
            body { padding: 14px; }
            h1 { font-size: 23px; }
        }
    </style>
</head>
<body>
<main class="container">
    <header>
        <h1>Velora Admin — Orders</h1>
        <a href="index.html">Back to Store</a>
    </header>

    <div class="toolbar">
        <input
            type="search"
            id="searchOrders"
            placeholder="Search order number or customer..."
            aria-label="Search orders"
        >

        <select id="statusFilter" aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="Placed">Placed</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
        </select>

        <button type="button" id="refreshOrders">Refresh</button>
    </div>

    <p id="message" role="status" aria-live="polite">Loading orders...</p>
    <p class="summary" id="orderCount"></p>

    <div class="table-wrap">
        <table>
            <thead>
            <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Status</th>
            </tr>
            </thead>
            <tbody id="ordersBody">
            <tr><td colspan="6">Loading orders...</td></tr>
            </tbody>
        </table>
    </div>
</main>

<script>
(() => {
    const body = document.getElementById('ordersBody');
    const message = document.getElementById('message');
    const count = document.getElementById('orderCount');
    const search = document.getElementById('searchOrders');
    const filter = document.getElementById('statusFilter');
    const refresh = document.getElementById('refreshOrders');

    let orders = [];

    function cell(text) {
        const td = document.createElement('td');
        td.textContent = text == null ? '' : String(text);
        return td;
    }

    function renderOrders() {
        const term = search.value.trim().toLowerCase();
        const status = filter.value;

        const visible = orders.filter(order => {
            const matchesTerm = [
                order.order_number,
                order.customer_name,
                order.customer_email
            ].some(value => String(value || '').toLowerCase().includes(term));

            return matchesTerm && (!status || order.status === status);
        });

        body.replaceChildren();
        count.textContent = `${visible.length} of ${orders.length} orders`;

        if (!visible.length) {
            const tr = document.createElement('tr');
            const td = cell('No matching orders found.');
            td.colSpan = 6;
            tr.appendChild(td);
            body.appendChild(tr);
            return;
        }

        visible.forEach(order => {
            const tr = document.createElement('tr');

            tr.appendChild(cell(order.order_number || order.id));

            const customer = document.createElement('td');
            const name = document.createElement('strong');
            name.textContent = order.customer_name || 'Customer';
            customer.appendChild(name);

            const email = document.createElement('div');
            email.textContent = order.customer_email || '';
            customer.appendChild(email);

            const phone = document.createElement('div');
            phone.textContent = order.customer_phone || '';
            customer.appendChild(phone);
            tr.appendChild(customer);

            tr.appendChild(cell(order.created_at || ''));

            const payment = document.createElement('td');
            payment.textContent =
                `${order.payment_method || '—'} / ${order.payment_status || '—'}`;
            tr.appendChild(payment);

            tr.appendChild(cell(`₹${Number(order.total || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`));

            const statusCell = document.createElement('td');
            const badge = document.createElement('span');
            badge.className = 'status';
            badge.textContent = order.status || 'Pending';
            statusCell.appendChild(badge);
            tr.appendChild(statusCell);

            body.appendChild(tr);
        });
    }

    async function loadOrders() {
        refresh.disabled = true;
        message.textContent = 'Loading orders...';

        try {
            const response = await fetch('api/admin-orders.php', {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { 'Accept': 'application/json' }
            });

            const data = await response.json();

            if (response.status === 401) {
                throw new Error('Your session has expired. Please log in again.');
            }

            if (response.status === 403) {
                throw new Error('Administrator permission is required.');
            }

            if (!response.ok || data.success !== true) {
                throw new Error(data.message || 'Unable to load orders.');
            }

            orders = Array.isArray(data.orders) ? data.orders : [];
            renderOrders();
            message.textContent = 'Orders loaded successfully.';
        } catch (error) {
            message.textContent = error.message || 'Unable to load orders.';
            body.replaceChildren();

            const tr = document.createElement('tr');
            const td = cell('Orders could not be loaded.');
            td.colSpan = 6;
            tr.appendChild(td);
            body.appendChild(tr);
        } finally {
            refresh.disabled = false;
        }
    }

    search.addEventListener('input', renderOrders);
    filter.addEventListener('change', renderOrders);
    refresh.addEventListener('click', loadOrders);

    loadOrders();
})();
</script>
</body>
</html>
