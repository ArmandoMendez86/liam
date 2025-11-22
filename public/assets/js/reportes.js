// /pizzeria_pos/public/assets/js/reportes.js
const API_BASE_URL = '../../api/index.php';
const PRINT_SERVICE_URL = 'http://localhost:9899/imprimir/';

let currentReportData = null;

document.addEventListener('DOMContentLoaded', () => {
    // Configurar fecha local
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const todayLocal = `${year}-${month}-${day}`;

    document.getElementById('start-date').value = todayLocal;
    document.getElementById('end-date').value = todayLocal;

    generateReport();

    document.getElementById('report-form').addEventListener('submit', (e) => {
        e.preventDefault();
        generateReport();
    });

    document.getElementById('btn-print-cut').addEventListener('click', printDailyCut);
});

async function generateReport() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    const btnSearch = document.querySelector('#report-form button[type="submit"]');
    const originalText = btnSearch.innerHTML;
    btnSearch.disabled = true;
    btnSearch.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    try {
        const response = await fetch(`${API_BASE_URL}/reports/sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start_date: startDate, end_date: endDate })
        });

        const data = await response.json();

        if (data.success) {
            currentReportData = data;
            renderDashboard(data);
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión.');
    } finally {
        btnSearch.disabled = false;
        btnSearch.innerHTML = originalText;
    }
}

function renderDashboard(data) {
    const totalSales = parseFloat(data.summary.total_sales || 0);
    const totalOrders = parseInt(data.summary.total_orders || 0);

    // 1. Totales (Sin descuentos)
    document.getElementById('display-total').textContent = formatCurrency(totalSales);
    document.getElementById('display-count').textContent = `${totalOrders} Órdenes`;

    // 2. Por Tipo de Servicio
    const serviceList = document.getElementById('service-breakdown');
    serviceList.innerHTML = '';

    if (!data.by_service || data.by_service.length === 0) {
        serviceList.innerHTML = '<li class="list-group-item text-muted text-center">Sin ventas</li>';
    } else {
        data.by_service.forEach(item => {
            const name = item.service_type === 'DINE_IN' ? 'Comer Aquí' : 'Para Llevar';
            const itemTotal = parseFloat(item.total || 0);
            const percent = totalSales > 0 ? Math.round((itemTotal / totalSales) * 100) : 0;

            serviceList.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${name} <span class="badge bg-light text-dark border">${item.qty}</span>
                    <span>${formatCurrency(itemTotal)} <small class="text-muted">(${percent}%)</small></span>
                </li>
            `;
        });
    }

    // 3. TOP 10 PRODUCTOS
    const tbodyTop = document.getElementById('top-products-tbody');
    tbodyTop.innerHTML = '';

    if (!data.top_products || data.top_products.length === 0) {
        tbodyTop.innerHTML = '<tr><td colspan="4" class="text-center text-muted p-4">Sin datos.</td></tr>';
    } else {
        const maxQty = Math.max(...data.top_products.map(p => p.total_qty));

        data.top_products.forEach((product, index) => {
            const rank = index + 1;
            let rankBadge = `<span class="badge rounded-pill bg-secondary">${rank}</span>`;
            if (rank === 1) rankBadge = '🥇';
            if (rank === 2) rankBadge = '🥈';
            if (rank === 3) rankBadge = '🥉';

            const barWidth = (product.total_qty / maxQty) * 100;

            tbodyTop.innerHTML += `
                <tr>
                    <td class="ps-3">${rankBadge}</td>
                    <td><div class="fw-bold">${product.product_name}</div></td>
                    <td class="text-center">
                        <div>${product.total_qty}</div>
                        <div class="progress" style="height: 3px; width: 50px; margin: 0 auto;">
                            <div class="progress-bar bg-success" style="width: ${barWidth}%"></div>
                        </div>
                    </td>
                    <td class="text-end pe-3 text-success fw-bold">${formatCurrency(product.total_revenue)}</td>
                </tr>
            `;
        });
    }

    // 4. NUEVO: POR CATEGORÍA
    const tbodyCats = document.getElementById('categories-tbody');
    tbodyCats.innerHTML = '';

    if (!data.by_category || data.by_category.length === 0) {
        tbodyCats.innerHTML = '<tr><td colspan="2" class="text-center text-muted p-3">Sin datos.</td></tr>';
    } else {
        // Encontrar el valor máximo para barras de progreso (visual)
        const maxCatRev = Math.max(...data.by_category.map(c => c.total_revenue));

        data.by_category.forEach(cat => {
            const percentBar = (cat.total_revenue / maxCatRev) * 100;

            tbodyCats.innerHTML += `
                <tr>
                    <td class="ps-3">
                        <div class="fw-bold">${cat.category_name}</div>
                        <div class="small text-muted">${cat.total_qty} ítems vendidos</div>
                    </td>
                    <td class="text-end pe-3">
                        <div class="fw-bold">${formatCurrency(cat.total_revenue)}</div>
                        <div class="progress mt-1 ms-auto" style="height: 4px; width: 80px;">
                            <div class="progress-bar bg-primary" style="width: ${percentBar}%"></div>
                        </div>
                    </td>
                </tr>
            `;
        });
    }

    // ... código anterior de categorías ...

    // 5. NUEVO: VENTAS POR USUARIO
    const tbodyUsers = document.getElementById('users-tbody');
    tbodyUsers.innerHTML = '';

    if (!data.by_user || data.by_user.length === 0) {
        tbodyUsers.innerHTML = '<tr><td colspan="3" class="text-center text-muted p-3">Sin datos.</td></tr>';
    } else {
        data.by_user.forEach(user => {
            tbodyUsers.innerHTML += `
                <tr>
                    <td class="ps-3 fw-bold">
                        <i class="bi bi-person-circle text-secondary me-1"></i> ${user.username}
                    </td>
                    <td class="text-center">
                        <span class="badge bg-light text-dark border">${user.total_orders}</span>
                    </td>
                    <td class="text-end pe-3 fw-bold text-dark">
                        ${formatCurrency(user.total_sales)}
                    </td>
                </tr>
            `;
        });
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

// Lógica de impresión (Corte)
async function printDailyCut() {
    if (!currentReportData || currentReportData.summary.total_orders == 0) {
        alert("No hay ventas para imprimir.");
        return;
    }

    if (!confirm('¿Imprimir Corte de Caja?')) return;

    const summary = currentReportData.summary;
    const period = currentReportData.period;

    const cutPayload = {
        order_id: 0,
        print_type: 'CORTE',
        order_date: `${period.start} al ${period.end}`,

        subtotal: parseFloat(summary.total_sales || 0), // Sin descuentos, subtotal = total
        discount_amount: 0,
        total: parseFloat(summary.total_sales || 0),

        service_type: 'REPORT',
        items: []
    };

    // Agregamos resumen por Categoría al ticket impreso
    if (currentReportData.by_category) {
        currentReportData.by_category.forEach(c => {
            cutPayload.items.push({
                product_id: 0,
                name: c.category_name.toUpperCase(), // Ej: "PIZZAS"
                quantity: parseInt(c.total_qty),
                price: 0,
                variant_name: "",
                extras: []
            });
        });
    }

    try {
        const response = await fetch(PRINT_SERVICE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cutPayload)
        });

        if (response.ok) {
            alert('Enviado a impresora.');
        } else {
            alert('Error al imprimir.');
        }
    } catch (error) {
        alert('Error: Revisa que el programa .exe esté abierto.');
    }
}