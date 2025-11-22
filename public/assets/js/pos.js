// /pizzeria_pos/public/assets/js/pos.js

// /pizzeria_pos/public/assets/js/pos.js (INICIO DEL ARCHIVO)

const API_BASE_URL = '../api/index.php';

// Variables globales del estado
let fullMenuData = [];
let cartItems = [];
let currentProduct = null;
// Variables de Descuento (NUEVAS)
let appliedDiscount = {
    code: null,
    value: 0.00 // Monto total del descuento aplicado en $
};
// Variables de Impresión (NUEVAS)
const PRINT_SERVICE_URL = 'http://localhost:9899/imprimir/';
const REPRINT_SERVICE_URL = 'http://localhost:9899/reimprimir/';


/**
 * Formatea un número al formato de moneda con separador de miles.
 */
function formatCurrency(number) {
    if (isNaN(number)) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2
    }).format(number);
}

// /pizzeria_pos/public/assets/js/pos.js (Añadir en la sección de funciones de impresión/checkout)

/**
 * Llama a la API para marcar una orden como COMPLETED (pagada) e imprime el ticket de VENTA.
 * @param {number} orderId - ID de la orden pendiente a cerrar.
 */
async function completeOrder(orderId) {
    if (!confirm(`¿Confirmas el pago y cierre de la Orden #${orderId}?`)) {
        return;
    }

    // Aquí puedes añadir una animación de carga para la interfaz de pedidos pendientes

    try {
        const response = await fetch(`${API_BASE_URL}/orders/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId })
        });

        const data = await response.json();

        if (data.success) {
            alert(`Pago de Orden #${orderId} completado. Imprimiendo ticket de venta...`);

            // Imprimir el ticket de VENTA
            const orderData = data.order_data;
            if (orderData) {
                await sendPrintJob(orderData, 'VENTA', PRINT_SERVICE_URL);
            }

            // Aquí deberías recargar o actualizar la lista de pedidos pendientes
            // Por ahora, solo alertamos
            console.log(`Orden #${orderId} marcada como COMPLETED.`);

        } else {
            alert(`Error al cerrar orden #${orderId}: ${data.message}`);
        }
    } catch (error) {
        console.error('Error al completar orden:', error);
        alert('Error de conexión al intentar completar la orden.');
    }
}


/**
 * Función para obtener las órdenes pendientes de la API.
 */
async function fetchPendingOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/pending`);

        // Verificamos si la respuesta es exitosa (código 200-299)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Leemos el cuerpo como texto para evitar el error SyntaxError, y luego lo parseamos.
        // Esto es un parche común para PHP/SQLite.
        const text = await response.text();
        const data = JSON.parse(text);

        if (data.success) {
            return data.data;
        } else {
            console.error('Error lógico al obtener pedidos pendientes:', data.message);
            return [];
        }
    } catch (error) {
        console.error('Error de conexión o parseo de respuesta en pedidos pendientes:', error);
        return [];
    }
}

/**
 * Renderiza los pedidos pendientes dentro del modal y devuelve la instancia del modal.
 */
async function renderPendingOrdersModal() {
    const tbody = document.getElementById('pendingOrdersTableBody');
    const messageDiv = document.getElementById('pendingOrdersMessage');

    // 💡 Capturamos la instancia del modal
    const modalElement = document.getElementById('pendingOrdersModal');
    const pendingOrdersModalInstance = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);

    // Muestra un mensaje de carga mientras se obtienen los datos
    tbody.innerHTML = '';
    messageDiv.style.display = 'block';
    messageDiv.innerHTML = '<div class="spinner-border spinner-border-sm me-2" role="status"></div> Cargando órdenes...';

    const orders = await fetchPendingOrders();

    tbody.innerHTML = '';

    if (orders.length === 0) {
        messageDiv.innerHTML = 'No hay órdenes pendientes.';
        messageDiv.style.display = 'block';
        return pendingOrdersModalInstance;
    }

    messageDiv.style.display = 'none';

    orders.forEach(order => {
        const serviceText = order.service_type === 'DINE_IN' ? 'Comer Aquí' : 'Para Llevar';
        const serviceBadge = order.service_type === 'DINE_IN' ? '<span class="badge bg-primary">Mesa</span>' : '<span class="badge bg-secondary">Llevar</span>';

        tbody.innerHTML += `
            <tr data-order-id="${order.id}">
                <td>#${order.id}</td>
                <td>${serviceBadge}</td>
                <td>${formatCurrency(order.total)}</td>
                <td>${new Date(order.order_date).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>
                    <button class="btn btn-success btn-sm complete-order-btn" 
                            data-order-id="${order.id}">
                        Cerrar Cuenta / Pagar
                    </button>
                </td>
            </tr>
        `;
    });

    // Adjuntar listener de eventos a los nuevos botones
    document.querySelectorAll('.complete-order-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const orderId = parseInt(e.currentTarget.dataset.orderId);
            completeOrder(orderId);
        });
    });

    return pendingOrdersModalInstance;
}

/**
 * Llama a la API para marcar una orden como COMPLETED (pagada) e imprime el ticket de VENTA.
 * @param {number} orderId - ID de la orden pendiente a cerrar.
 */
async function completeOrder(orderId) {
    if (!confirm(`¿Confirmas el pago y cierre de la Orden #${orderId}?`)) {
        return;
    }

    // 1. Obtener la instancia del modal
    const pendingOrdersModalInstance = bootstrap.Modal.getInstance(document.getElementById('pendingOrdersModal'));

    // Deshabilitar botón durante el proceso
    const button = document.querySelector(`.complete-order-btn[data-order-id="${orderId}"]`);
    if (button) button.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/orders/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId })
        });

        const data = await response.json();

        if (data.success) {
            alert(`Pago de Orden #${orderId} completado. Imprimiendo ticket de venta...`);

            // Imprimir el ticket de VENTA
            const orderData = data.order_data;
            if (orderData) {
                await sendPrintJob(orderData, 'VENTA', PRINT_SERVICE_URL);
            }

            // 💡 SOLUCIÓN: Ocultar el modal si es el único pedido o recargar
            const orders = await fetchPendingOrders();

            if (orders.length === 0) {
                // Si ya no quedan pedidos pendientes, ocultamos el modal
                if (pendingOrdersModalInstance) {
                    pendingOrdersModalInstance.hide();
                }
            } else {
                // Si aún quedan pedidos, solo actualizamos la lista
                renderPendingOrdersModal();
            }

        } else {
            // Re-habilitar botón en caso de error
            if (button) button.disabled = false;
            alert(`Error al cerrar orden #${orderId}: ${data.message}`);
        }
    } catch (error) {
        console.error('Error al completar orden:', error);
        if (button) button.disabled = false;
        alert('Error de conexión al intentar completar la orden.');
    }
}

/**
 * Función genérica para enviar datos de impresión al servicio local de C#.
 */
async function sendPrintJob(orderData, type, url) {

    // El 'orderData' que recibimos de 'handleCheckout' o 'completeOrder'
    // ya tiene el formato correcto que nuestro C# 'Models.cs' espera.
    // No necesitamos crear un objeto '{ venta: ... }'.
    // Simplemente pasamos el objeto 'orderData' tal cual.

    // Solo agregamos el tipo de ticket para que C# sepa qué hacer
    // (Aunque nuestro C# actual no usa esto, es bueno tenerlo para el futuro)
    const payload = {
        ...orderData, // Copia todos los campos (order_id, total, subtotal, items, etc.)
        print_type: type // 'VENTA' o 'COCINA'
    };

    console.log(`Enviando trabajo de impresión (${type})...`);
    console.log('Payload para C#:', payload); // Para depuración

    try {
        const response = await fetch(url, { // 'url' es PRINT_SERVICE_URL
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload) // <--- Enviamos el payload corregido
        });

        if (!response.ok) {
            // Capturar errores del servidor C#
            let errorMsg = `Error HTTP ${response.status} del servicio de impresión.`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.detail || errorData.message || errorMsg;
            } catch (e) {
                // El cuerpo del error no era JSON
            }
            throw new Error(errorMsg);
        }

        const result = await response.json();

        if (result.success) {
            console.log(`Impresión de ${type} exitosa. Ticket ID: ${result.ticket_id}`);
        } else {
            console.error(`Error al imprimir ${type}:`, result.message);
            alert(`ATENCIÓN: Error al imprimir ticket de ${type}. ${result.message}`);
        }

    } catch (error) {
        // Este es el error si el C# no está corriendo
        console.error(`No se pudo conectar al servicio de impresión local (${url}).`, error);
        alert(`ERROR GRAVE: No se pudo conectar al servicio de impresión local C#.\n\nAsegúrese de que "PizzeriaPrintBridge.exe" esté ejecutándose.\n\nDetalle: ${error.message}`);
    }
}

/**
 * Muestra el modal para reimprimir tickets.
 */
async function showReprintModal() {
    const orderId = prompt("Ingrese el ID de la orden a reimprimir:");
    if (!orderId) {
        return; // El usuario canceló
    }

    const type = prompt("¿Qué ticket desea reimprimir? (COCINA o VENTA)").toUpperCase();

    if (type !== 'COCINA' && type !== 'VENTA') {
        alert('Tipo de ticket inválido. Use COCINA o VENTA.');
        return;
    }

    // --- 1. LLAMAR A PHP PARA OBTENER LOS DATOS ---
    console.log(`Buscando datos de la orden #${orderId} en el servidor...`);

    try {
        // Usamos el nuevo endpoint '/orders/get' que creamos en PHP
        const response = await fetch(`${API_BASE_URL}/orders/get?id=${orderId}`);

        if (!response.ok) {
            let errorMsg = `Error HTTP ${response.status} del servidor.`;
            try {
                const errData = await response.json();
                errorMsg = errData.message;
            } catch (e) { }

            throw new Error(errorMsg);
        }

        const data = await response.json();

        if (data.success && data.order_data) {
            // ¡Éxito! PHP nos devolvió los datos completos
            const orderData = data.order_data;

            console.log('Datos de la orden encontrados. Enviando a impresión...');

            // --- 2. LLAMAR AL PUENTE C# CON LOS DATOS ---
            // Usamos la URL de impresión normal. C# diferenciará el ticket
            // usando el 'print_type' que le pasamos.
            await sendPrintJob(orderData, type, PRINT_SERVICE_URL);

        } else {
            // PHP no encontró la orden o hubo un error
            alert(`Error al buscar la orden: ${data.message}`);
        }

    } catch (error) {
        console.error('Error al reimprimir:', error);
        alert(`Error de conexión al buscar la orden #${orderId}. Revisa la consola.\n\nDetalle: ${error.message}`);
    }
}

async function showCancelModal() {
    const orderId = prompt("Ingrese el ID de la orden a ANULAR:");

    if (!orderId) {
        return; // El usuario canceló
    }

    // Doble confirmación porque esta acción es importante
    if (!confirm(`¿Está SEGURO de que desea anular la orden #${orderId}?\n\nEsta acción marcará la venta como CANCELLED y no se puede deshacer.`)) {
        return;
    }

    try {
        console.log(`Enviando solicitud para anular la orden #${orderId}...`);

        const response = await fetch(`${API_BASE_URL}/orders/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: parseInt(orderId) })
        });

        const data = await response.json();

        if (data.success) {
            alert(`¡Éxito! ${data.message}`);

            // Si el modal de pendientes está abierto, lo actualizamos
            // para que la orden anulada desaparezca de la lista.
            const modalElement = document.getElementById('pendingOrdersModal');
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance && modalElement.classList.contains('show')) {
                console.log('Actualizando lista de pendientes...');
                renderPendingOrdersModal();
            }

        } else {
            alert(`Error al anular la orden: ${data.message}`);
        }

    } catch (error) {
        console.error('Error de conexión al anular la orden:', error);
        alert('Error de conexión. No se pudo anular la orden.');
    }
}

/**
 * Función para remover el descuento.
 */
function removeDiscount() {
    appliedDiscount.code = null;
    appliedDiscount.value = 0.00;

    const codeInput = document.getElementById('discount-code');
    const messageDisplay = document.getElementById('discount-message');

    if (codeInput) codeInput.value = '';
    if (messageDisplay) messageDisplay.textContent = '';
}

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // INICIALIZACIÓN
    // ----------------------------------------------------
    initPOS();

    // ----------------------------------------------------
    // LISTENERS GLOBALES (Solo botones fijos)
    // ----------------------------------------------------
    // Listener del Logout
    document.getElementById('logout-btn').addEventListener('click', async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/logout`);
            const data = await response.json();

            if (data.success) {
                window.location.href = 'login.html';
            } else {
                alert('Error al cerrar sesión. Intente de nuevo.');
            }
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            alert('No se pudo contactar al servidor para cerrar sesión.');
        }
    });

    // Listener para el botón "Añadir al Pedido" del modal
    document.getElementById('addToCartModalBtn').addEventListener('click', handleAddToCartFromModal);
    document.getElementById('apply-discount-btn').addEventListener('click', applyDiscount);
});

// ----------------------------------------------------
// 1. FUNCIONES DE AUTENTICACIÓN Y CARGA INICIAL
// ----------------------------------------------------

/**
 * Verifica el estado de la sesión del usuario.
 * @returns {Object|null} Objeto de usuario si está logueado, null si no lo está.
 */
async function checkLoginStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/status`);
        const data = await response.json();
        return data.logged_in ? data.user : null;
    } catch (error) {
        console.error('Error al verificar sesión:', error);
        alert('Error de conexión con el servidor. Revisar consola.');
        return null;
    }
}

// /pizzeria_pos/public/assets/js/pos.js (Nueva función)
async function applyDiscount() {
    const code = document.getElementById('discount-code').value.trim();
    // Calcular el subtotal actual de todos los ítems
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const messageDisplay = document.getElementById('discount-message');

    if (!code || subtotal === 0) {
        messageDisplay.className = 'small mt-1 text-danger';
        messageDisplay.textContent = 'Ingrese un código y agregue productos al pedido.';
        return;
    }

    try {
        messageDisplay.className = 'small mt-1 text-muted';
        messageDisplay.textContent = 'Verificando código...';

        const response = await fetch(`${API_BASE_URL}/discounts/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code, subtotal: subtotal })
        });
        const data = await response.json();

        if (data.success) {
            appliedDiscount.code = code;
            appliedDiscount.value = data.discount_applied.value;

            messageDisplay.className = 'small mt-1 text-success';
            messageDisplay.textContent = `✅ Descuento '${code}' aplicado: ${formatCurrency(appliedDiscount.value)}.`;

        } else {
            // Si el código es inválido o no aplica, reseteamos el descuento
            appliedDiscount.code = null;
            appliedDiscount.value = 0.00;

            messageDisplay.className = 'small mt-1 text-danger';
            messageDisplay.textContent = `❌ ${data.message}`;
        }

    } catch (error) {
        console.error('Error aplicando descuento:', error);
        messageDisplay.className = 'small mt-1 text-danger';
        messageDisplay.textContent = 'Error de conexión al aplicar descuento.';
    }

    // Forzar el recálculo de los totales y el display
    renderCart();
}

/**
 * Función para remover el descuento. Usada al eliminar el último item o al checkout.
 */
function removeDiscount() {
    appliedDiscount.code = null;
    appliedDiscount.value = 0.00;
    document.getElementById('discount-code').value = '';
    document.getElementById('discount-message').textContent = '';
}

/**
 * Inicializa la aplicación POS: verifica sesión y carga el menú.
 */

// /pizzeria_pos/public/assets/js/pos.js (Reemplazar initPOS)

async function initPOS() {
    const user = await checkLoginStatus();

    if (user) {
        document.getElementById('user-info').textContent = `Usuario: ${user.username}`;
        loadMenu();

        // LISTENERS DE BOTONES GLOBALES
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) checkoutBtn.addEventListener('click', handleCheckout);

        const applyDiscountBtn = document.getElementById('apply-discount-btn');
        if (applyDiscountBtn) applyDiscountBtn.addEventListener('click', applyDiscount);

        const reprintBtn = document.getElementById('reprint-btn');
        if (reprintBtn) reprintBtn.addEventListener('click', showReprintModal);

        const cancelBtn = document.getElementById('cancel-order-btn');
        if (cancelBtn) cancelBtn.addEventListener('click', showCancelModal);

        // NUEVO LISTENER: Botón para mostrar pedidos pendientes
        const pendingOrdersBtn = document.getElementById('pending-orders-btn');
        if (pendingOrdersBtn) {
            pendingOrdersBtn.addEventListener('click', () => {
                renderPendingOrdersModal();
                const modal = new bootstrap.Modal(document.getElementById('pendingOrdersModal'));
                modal.show();
            });
        }

    } else {
        window.location.href = 'login.html';
    }
}

/**
 * Carga el menú completo desde la API de Productos.
 */

async function loadMenu() {
    try {
        const response = await fetch(`${API_BASE_URL}/pos/list`);
        const data = await response.json();

        if (data.success) {
            fullMenuData = data.data; // Guardar el menú completo
            setupSearchListener();
            setupMenuListeners();
        } else {
            document.getElementById('menu-container').innerHTML = '<div class="alert alert-danger">Error al cargar el menú: ' + data.message + '</div>';
        }
    } catch (error) {
        document.getElementById('menu-container').innerHTML = '<div class="alert alert-danger">Error de conexión con la API de Productos.</div>';
        console.error('Error al obtener menú:', error);
    }
}

// ----------------------------------------------------
// 2. FUNCIONES DE RENDERIZADO DEL MENÚ Y BUSCADOR
// ----------------------------------------------------

/**
 * Renderiza el menú en el panel izquierdo usando la estructura de Bootstrap.
 * Controla la visibilidad del prompt inicial.
 */
function renderMenu(menuData) {
    const container = document.getElementById('menu-container');
    const searchPrompt = document.getElementById('initial-search-prompt');

    // 1. Determinar si mostramos el prompt (no hay datos)
    const showPrompt = !menuData || menuData.length === 0 || menuData.every(cat => cat.products.length === 0);

    if (showPrompt) {
        if (searchPrompt) {
            searchPrompt.style.display = 'block';
        }
        container.innerHTML = '';
        return;
    }

    // 2. Si hay productos para renderizar
    if (searchPrompt) {
        searchPrompt.style.display = 'none';
    }

    container.innerHTML = '';

    const PIZZA_CATEGORY_ID = 1;

    menuData.forEach(category => {
        if (category.products.length === 0) return;

        const categoryHeader = document.createElement('h3');
        categoryHeader.className = 'mt-4 mb-3 border-bottom pb-2';
        categoryHeader.textContent = category.name;
        container.appendChild(categoryHeader);

        const productGrid = document.createElement('div');
        productGrid.className = 'product-grid';

        category.products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card shadow-sm';

            // --- LÓGICA PARA DETERMINAR PRECIO Y BOTÓN ---
            const isPizza = product.category_id === PIZZA_CATEGORY_ID;
            const hasMultipleVariants = product.variants.length > 1;
            const defaultVariant = product.variants.find(v => v.is_default === 1);

            let priceDisplay = 'Ver opciones';
            let buttonClass = 'btn-primary';

            if (isPizza || hasMultipleVariants) {
                if (product.variants.length > 0) {
                    const minPrice = Math.min(...product.variants.map(v => v.price));
                    // USAMOS formatCurrency
                    priceDisplay = `Desde ${formatCurrency(minPrice)}`;
                }
                buttonClass = 'btn-warning';
            } else if (defaultVariant) {
                // USAMOS formatCurrency
                priceDisplay = formatCurrency(defaultVariant.price);
                buttonClass = 'btn-success';
            }

            productCard.innerHTML = `
                <div class="card-body d-flex flex-column">
                    <h4 class="card-title">${product.name}</h4>
                    <p class="card-text description mb-3">${product.description || ''}</p>
                    <div class="price-action mt-auto pt-2 border-top">
                        <span class="price fw-bold">${priceDisplay}</span>
                        <button class="btn btn-sm ${buttonClass} add-to-cart-btn" 
                                data-product-id="${product.id}">
                            ${(isPizza || hasMultipleVariants) ? 'Seleccionar' : '+ Agregar'}
                        </button>
                    </div>
                </div>
            `;
            productGrid.appendChild(productCard);
        });

        container.appendChild(productGrid);
    });
    setupMenuListeners();
}

/**
 * Configura el listener del input de búsqueda para filtrar el menú.
 */
function setupSearchListener() {
    const searchInput = document.getElementById('product-search');

    renderMenu([]);

    searchInput.addEventListener('keyup', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();

        if (searchTerm.length === 0) {
            renderMenu([]);
            return;
        }

        const filteredMenu = fullMenuData.map(category => {
            const filteredProducts = category.products.filter(product => {
                return product.name.toLowerCase().includes(searchTerm) ||
                    product.description?.toLowerCase().includes(searchTerm);
            });
            return { ...category, products: filteredProducts };
        }).filter(category => category.products.length > 0);

        renderMenu(filteredMenu);
    });
}

/**
 * Añade listeners a los botones de producto (delegado).
 */
function setupMenuListeners() {
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.removeEventListener('click', handleProductClick);
        button.addEventListener('click', handleProductClick);
    });
}


// ----------------------------------------------------
// 3. LÓGICA DEL MODAL DE VARIANTE Y COMBINACIONES
// ----------------------------------------------------

/**
 * Maneja el clic en un producto para decidir si abrir el modal o añadirlo directamente.
 */
function handleProductClick(event) {
    const productId = parseInt(event.currentTarget.dataset.productId);

    if (isNaN(productId)) {
        console.error('El botón no tiene un ID de producto válido.');
        return;
    }

    const allProducts = fullMenuData.flatMap(cat => cat.products);
    currentProduct = allProducts.find(p => p.id === productId);

    if (!currentProduct) {
        console.error(`Producto con ID ${productId} no encontrado en fullMenuData.`);
        return;
    }

    const PIZZA_CATEGORY_ID = 1;

    if (currentProduct.category_id === PIZZA_CATEGORY_ID || currentProduct.variants.length > 1 || currentProduct.flavor_options) {
        showVariantModal(currentProduct);
    } else {
        if (currentProduct.variants.length === 0) {
            console.error(`Producto ${currentProduct.name} no tiene variantes de precio.`);
            return;
        }

        const variant = currentProduct.variants[0];
        addToCart({
            id: Date.now(),
            product_id: currentProduct.id,
            name: currentProduct.name,
            variant_name: variant.name,
            variant_id: variant.id,
            price: variant.price,
            quantity: 1
        });
    }
}

/**
 * Renderiza un selector de sabores si el producto tiene opciones definidas en DB.
 */
/* function renderFlavorSelector(container, flavorString) {
    if (!flavorString) return;

    // Convertir la cadena "BBQ,Mango,Habanero" en un array
    const flavors = flavorString.split(',').map(f => f.trim());

    // Crear el HTML del selector
    const optionsHtml = flavors.map(flavor => `<option value="${flavor}">${flavor}</option>`).join('');

    container.innerHTML += `
        <div class="variant-options-group mt-3" id="flavor-selector-group">
            <label for="flavorSelect" class="form-label fw-bold">Elige el Sabor/Salsa:</label>
            <select class="form-select" id="flavorSelect">
                <option value="" selected>Selecciona un sabor...</option>
                ${optionsHtml}
            </select>
        </div>
    `;

    // Listener para actualizar el resumen cuando cambie el sabor
    document.getElementById('flavorSelect').addEventListener('change', updateSelectionSummary);
} */

/* function renderComboSelectors(container, product) {
    // 1. Selector de Alitas para Combo (Solo si la BD tiene datos en combo_wings_options)
    if (product.combo_wings_options) {
        const flavors = product.combo_wings_options.split(',').map(f => f.trim());
        const optionsHtml = flavors.map(f => `<option value="${f}">${f}</option>`).join('');

        container.innerHTML += `
            <div class="variant-options-group mt-3">
                <label for="comboWingSelect" class="form-label fw-bold">Sabor de Alitas (Combo):</label>
                <select class="form-select" id="comboWingSelect">
                    <option value="" selected>Selecciona sabor...</option>
                    ${optionsHtml}
                </select>
            </div>
        `;
        // Agregamos un pequeño retardo para asegurar que el elemento existe antes de ponerle el listener
        setTimeout(() => {
            document.getElementById('comboWingSelect')?.addEventListener('change', updateSelectionSummary);
        }, 50);
    }

    // 2. Selector de Refresco (Solo si la BD tiene datos en soda_options)
    if (product.soda_options) {
        const sodas = product.soda_options.split(',').map(s => s.trim());
        const optionsHtml = sodas.map(s => `<option value="${s}">${s}</option>`).join('');

        container.innerHTML += `
            <div class="variant-options-group mt-3">
                <label for="sodaSelect" class="form-label fw-bold">Elige el Refresco:</label>
                <select class="form-select" id="sodaSelect">
                    <option value="" selected>Selecciona refresco...</option>
                    ${optionsHtml}
                </select>
            </div>
        `;
        setTimeout(() => {
            document.getElementById('sodaSelect')?.addEventListener('change', updateSelectionSummary);
        }, 50);
    }
}
 */
/**
 * Muestra y pobla el modal de selección de variantes.
 * (VERSIÓN CORREGIDA: Genera HTML primero y asigna eventos al final)
 */
function showVariantModal(product) {
    currentProduct = product;
    const modal = new bootstrap.Modal(document.getElementById('variantModal'));
    const PIZZA_CATEGORY_ID = 1;

    // 1. Resetear formulario y datos
    document.getElementById('variantForm').reset();
    document.getElementById('quantityInput').value = 1;
    document.getElementById('modalProductId').value = product.id;
    document.getElementById('modalProductName').textContent = product.name;
    document.getElementById('modalProductDescription').textContent = product.description || '';
    document.getElementById('selection-summary').classList.add('d-none');

    const optionsContainer = document.getElementById('modalVariantOptions');
    const extrasContainer = document.getElementById('modalProductExtras');

    // Limpiamos contenedores
    optionsContainer.innerHTML = '';
    if (extrasContainer) extrasContainer.innerHTML = '';

    // ========================================================================
    // FASE 1: CONSTRUCCIÓN DE HTML (Acumulamos todo el texto primero)
    // ========================================================================
    let fullHtml = '';

    // A. HTML de Pizza (Split)
    if (product.category_id === PIZZA_CATEGORY_ID || (product.allows_pizza_split && product.allows_pizza_split === 1)) {
        const specialtyProducts = fullMenuData.find(cat => cat.id === PIZZA_CATEGORY_ID)?.products || [];
        fullHtml += getSplitPizzaHTML(specialtyProducts);
    }

    // B. HTML de Selectores de Combo (Refresco/Alitas)
    fullHtml += getComboSelectorsHTML(product);

    // C. HTML de Sabor Simple (Alitas sueltas)
    if (product.flavor_options) {
        fullHtml += getFlavorSelectorHTML(product.flavor_options);
    }

    // INYECTAMOS TODO EL HTML DE GOLPE (Esto evita que se borren los listeners)
    optionsContainer.innerHTML = fullHtml;


    // ========================================================================
    // FASE 2: RENDERIZADO DE PRECIOS Y EXTRAS (Usan createElement, es seguro)
    // ========================================================================
    renderPriceVariants(optionsContainer, product.variants);
    if (extrasContainer) {
        renderProductExtras(extrasContainer, product.extras);
    }


    // ========================================================================
    // FASE 3: ACTIVACIÓN DE LISTENERS (Ahora que el HTML es definitivo)
    // ========================================================================

    // A. Listeners de Pizza (Checkbox Mitad y Mitad)
    setupSplitPizzaListeners();

    // B. Listeners de Selectores (Para actualizar el resumen al cambiar)
    const selectorsToWatch = ['comboWingSelect', 'sodaSelect', 'flavorSelect', 'half1Select', 'half2Select', 'singleSpecialtySelect'];
    selectorsToWatch.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', updateSelectionSummary);
    });


    // 4. Seleccionar la primera variante de precio por defecto
    const firstRadio = document.querySelector('#modalVariantOptions input[type="radio"]');
    if (firstRadio) firstRadio.checked = true;

    // 5. Configuración de Listener de Cantidad
    const quantityInput = document.getElementById('quantityInput');
    quantityInput.oninput = () => {
        updateModalPrice();
        updateSelectionSummary();
    };

    // 6. Actualización inicial
    updateModalPrice();
    updateSelectionSummary();

    modal.show();
}
/**
 * Renderiza los radio buttons para elegir la variante de precio.
 * Utiliza el listener de 'click' delegado para forzar la actualización inmediata.
 */
function renderPriceVariants(container, variants) {
    if (variants.length === 0) return;

    const variantGroup = document.createElement('div');
    variantGroup.className = 'variant-options-group';
    variantGroup.innerHTML = '<h6>Selecciona Tamaño/Opción:</h6>';

    // Construir el HTML de las opciones
    let optionsHtml = '';
    variants.forEach((variant, index) => {
        const inputId = `variant-${variant.id}`;
        // Nota: Mantenemos .toFixed(2) en data-price para que el parseFloat() en el cálculo sea limpio.
        const checked = index === 0 ? 'checked' : '';

        optionsHtml += `
            <div class="form-check">
                <input class="form-check-input variant-radio" type="radio" name="selected_variant" 
                       id="${inputId}" value="${variant.id}" data-price="${variant.price.toFixed(2)}" ${checked}>
                <label class="form-check-label" for="${inputId}">
                    <span>${variant.name}</span> <span class="fw-bold">(${formatCurrency(variant.price)})</span>
                </label>
            </div>
        `;
    });

    variantGroup.innerHTML += optionsHtml;
    container.appendChild(variantGroup);

    // ************ CORRECCIÓN FINAL ************
    // Usamos el evento 'click' delegado para forzar la actualización.
    variantGroup.addEventListener('click', (event) => {
        const target = event.target;
        let radioInput = null;

        // 1. Detectar el clic en el radio o en la etiqueta
        if (target.classList.contains('variant-radio')) {
            radioInput = target;
        } else if (target.closest('.form-check-label')) {
            // Si hacen clic en la etiqueta, encontramos el radio asociado
            radioInput = document.getElementById(target.closest('.form-check-label').getAttribute('for'));
        }

        if (radioInput && radioInput.classList.contains('variant-radio')) {
            // Forzamos el estado 'checked' y disparamos la actualización
            if (!radioInput.checked) {
                radioInput.checked = true;
            }
            updateModalPrice();
            updateSelectionSummary();
        }
    });
}

/**
 * Renderiza el selector de Especialidad y Mitad-Mitad para pizzas o combos.
 * (Función REESCRITA para soportar combos)
 */
/* function renderSplitPizzaSelector(container, specialtyProducts) {

    // ID de la categoría "Pizzas", asumimos que es 1
    const PIZZA_CATEGORY_ID = 1;
    const isPizzaProduct = (currentProduct.category_id === PIZZA_CATEGORY_ID);

    // Si es un producto de Pizza (ej. "Hawaiana"), pre-seleccionamos su ID.
    // Si es un Combo, dejamos la selección en blanco ("").
    const defaultSpecialtyId = isPizzaProduct ? currentProduct.id : "";

    // Construir las opciones <select> para especialidades
    const specialtyOptions = specialtyProducts
        .map(p => `<option value="${p.id}">${p.name}</option>`)
        .join('');

    // Construir las opciones <select> pero con el default seleccionado (si aplica)
    const specialtyOptionsWithDefault = specialtyProducts
        .map(p => {
            const selected = (p.id === defaultSpecialtyId) ? "selected" : "";
            return `<option value="${p.id}" ${selected}>${p.name}</option>`;
        })
        .join('');

    container.innerHTML += `
        <div class="variant-options-group mt-4">
            <h6>Selección de Pizza:</h6>
            
            <div id="singleSpecialtyOptions">
                <label for="singleSpecialtySelect" class="form-label">Especialidad (Completa):</label>
                <select class="form-select" id="singleSpecialtySelect">
                    <option value="" ${defaultSpecialtyId === "" ? "selected" : ""}>Selecciona Especialidad</option>
                    ${specialtyOptionsWithDefault}
                </select>
            </div>

            <div class="form-check form-switch my-3">
                <input class="form-check-input" type="checkbox" id="splitPizzaCheckbox">
                <label class="form-check-label" for="splitPizzaCheckbox">¿Pizza Mitad y Mitad?</label>
            </div>

            <div id="splitPizzaOptions" style="display: none;">
                <h6 class="mt-3">Elige las dos mitades:</h6>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="half1Select" class="form-label">Mitad 1:</label>
                        <select class="form-select" id="half1Select">
                            <option selected value="">Selecciona Especialidad</option>
                            ${specialtyOptions}
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="half2Select" class="form-label">Mitad 2:</label>
                        <select class="form-select" id="half2Select">
                            <option selected value="">Selecciona Especialidad</option>
                            ${specialtyOptions}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    `;

    // --- LISTENERS ---
    const half1Select = document.getElementById('half1Select');
    const half2Select = document.getElementById('half2Select');
    const singleSpecialtySelect = document.getElementById('singleSpecialtySelect');
    const splitCheckbox = document.getElementById('splitPizzaCheckbox');
    const singleSpecialtyContainer = document.getElementById('singleSpecialtyOptions');
    const splitOptionsContainer = document.getElementById('splitPizzaOptions');

    // Listener para el checkbox (Actualiza precio y resumen)
    if (splitCheckbox) {
        splitCheckbox.addEventListener('change', () => {
            // Si está chequeado, mostrar Mitades y ocultar Completa
            splitOptionsContainer.style.display = splitCheckbox.checked ? 'block' : 'none';
            singleSpecialtyContainer.style.display = splitCheckbox.checked ? 'none' : 'block';

            // Si el usuario activa "mitad y mitad", reseteamos el valor de la pizza completa
            // y si la desactiva, reseteamos las mitades.
            if (splitCheckbox.checked) {
                if (singleSpecialtySelect) singleSpecialtySelect.value = "";
            } else {
                if (half1Select) half1Select.value = "";
                if (half2Select) half2Select.value = "";
            }

            updateModalPrice();
            updateSelectionSummary();
        });
    }

    // Listeners para todos los selectores de pizza (Actualiza solo el resumen)
    if (half1Select) half1Select.addEventListener('change', updateSelectionSummary);
    if (half2Select) half2Select.addEventListener('change', updateSelectionSummary);
    if (singleSpecialtySelect) singleSpecialtySelect.addEventListener('change', updateSelectionSummary);
} */

/**
 * Renderiza los inputs de cantidad para seleccionar extras/adicionales.
 */
function renderProductExtras(container, extras) {
    if (!extras || extras.length === 0) return;

    const extrasGroup = document.createElement('div');
    extrasGroup.className = 'variant-options-group mt-4';
    extrasGroup.innerHTML = '<h6>Adicionales (Extras):</h6>';

    extras.forEach(extra => {
        const inputId = `extra-${extra.id}`;
        const checkboxId = `checkbox-${inputId}`;

        extrasGroup.innerHTML += `
            <div class="form-check d-flex justify-content-between align-items-center mb-2 p-0">
                
                <input type="checkbox" class="extra-checkbox d-none" id="${checkboxId}" value="${extra.id}">

                <label class="form-check-label flex-grow-1" for="${checkboxId}">
                    <span>${extra.name}</span> 
                    <span class="fw-bold text-dark">(+ ${formatCurrency(extra.price)})</span>
                </label>
                
                <input type="number" 
                       class="form-control form-control-sm text-center extra-quantity-input"
                       id="${inputId}" 
                       data-price="${extra.price.toFixed(2)}"
                       value="0" 
                       min="0"
                       max="99"
                       style="width: 70px;"
                       disabled> 
            </div>
        `;
    });
    container.appendChild(extrasGroup);

    // 1. Listener para el checkbox (maneja el estado del input de cantidad)
    document.querySelectorAll('.extra-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateExtraQuantityState);
    });

    // 2. Listener para los inputs de cantidad (activa/desactiva el checkbox y dispara el cálculo)
    document.querySelectorAll('.extra-quantity-input').forEach(input => {
        input.addEventListener('input', () => {
            const extraQuantity = parseInt(input.value) || 0;
            const checkboxId = `checkbox-${input.id}`;
            const checkbox = document.getElementById(checkboxId);

            if (checkbox) {
                checkbox.checked = extraQuantity > 0;
                input.disabled = (extraQuantity === 0);
            }
            updateModalPrice();
            updateSelectionSummary();
        });
    });

    // 3. Listener para la ETIQUETA (Permite hacer clic en el nombre para seleccionar)
    document.querySelectorAll('.form-check-label').forEach(label => {
        label.addEventListener('click', (e) => {
            if (e.target.tagName === 'INPUT') {
                e.stopPropagation();
                return;
            }

            const checkbox = document.getElementById(label.htmlFor);
            if (checkbox && !checkbox.checked) {
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change'));
                e.preventDefault();
            }
        });
    });
}

/**
 * Gestiona el estado de habilitado/cantidad de los inputs de extras, disparado por el checkbox.
 */
function updateExtraQuantityState(event) {
    const checkbox = event.target;
    const inputId = checkbox.id.replace('checkbox-', '');
    const quantityInput = document.getElementById(inputId);

    if (!quantityInput) return;

    if (checkbox.checked) {
        quantityInput.disabled = false;
        if (parseInt(quantityInput.value) === 0) {
            quantityInput.value = 1;
        }
        quantityInput.focus();
    } else {
        quantityInput.disabled = true;
        quantityInput.value = 0;
    }

    // Ya no disparamos un evento 'input' aquí. El onchange del formulario es el que se encarga.
    // Pero si queremos que el precio se actualice inmediatamente después de activar el checkbox:
    updateModalPrice();
    updateSelectionSummary();
}

/**
 * Actualiza el precio total mostrado en el modal sumando la variante y los extras.
 */
function updateModalPrice() {
    const selectedRadio = document.querySelector('input[name="selected_variant"]:checked');
    const quantity = parseInt(document.getElementById('quantityInput').value) || 1;
    const priceSpan = document.getElementById('modalVariantPrice');

    let basePrice = 0;

    if (selectedRadio) {
        basePrice = parseFloat(selectedRadio.dataset.price);
    }

    // 1. CALCULAR COSTO DE EXTRAS
    let extrasPriceTotal = 0;
    const extraInputs = document.querySelectorAll('.extra-quantity-input');

    extraInputs.forEach(input => {
        const extraQuantity = parseInt(input.value) || 0;

        if (extraQuantity > 0) {
            const extraUnitPrice = parseFloat(input.dataset.price);
            extrasPriceTotal += (extraUnitPrice * extraQuantity);
        }
    });

    // 2. CALCULAR EL PRECIO FINAL DEL ÍTEM UNITARIO
    const itemPrice = basePrice + extrasPriceTotal;

    // 3. CALCULAR EL TOTAL A PAGAR
    const totalPrice = itemPrice * quantity;

    // USAMOS formatCurrency
    document.getElementById('modalVariantPrice').textContent = formatCurrency(totalPrice);
}

/**
 * Actualiza el área de resumen de selección en el modal.
 */
function updateSelectionSummary() {
    const summaryContainer = document.getElementById('selection-summary');
    const summaryContent = document.getElementById('summary-content');

    if (!summaryContainer || !summaryContent) return;

    let selectedVariant = document.querySelector('input[name="selected_variant"]:checked');
    let summaryText = '';

    // 1. Obtener la variante principal (Tamaño/Opción)
    if (selectedVariant) {
        const variantName = selectedVariant.closest('.form-check').querySelector('.form-check-label span:first-child').textContent;
        summaryText += `<span class="badge bg-primary me-2">${variantName}</span>`;
    }

    // 2. Si es Pizza O un Combo con Pizza, obtener las opciones
    const PIZZA_CATEGORY_ID = 1;
    const allowsSplit = (currentProduct.allows_pizza_split && currentProduct.allows_pizza_split === 1);
    const isPizza = (currentProduct.category_id === PIZZA_CATEGORY_ID);

    if (isPizza || allowsSplit) {
        const isSplit = document.getElementById('splitPizzaCheckbox')?.checked;

        if (isSplit) {
            // --- Caso Mitades ---
            const half1Select = document.getElementById('half1Select');
            const half2Select = document.getElementById('half2Select');

            if (half1Select && half2Select) {
                const half1Name = half1Select.options[half1Select.selectedIndex].text;
                const half2Name = half2Select.options[half2Select.selectedIndex].text;

                if (half1Name !== 'Selecciona Especialidad' && half1Select.value) {
                    summaryText += `<span class="badge bg-info text-dark me-2">½: ${half1Name}</span>`;
                }
                if (half2Name !== 'Selecciona Especialidad' && half2Select.value) {
                    summaryText += `<span class="badge bg-info text-dark">½: ${half2Name}</span>`;
                }
            }
        } else {
            // --- Caso Especialidad Completa ---
            const singleSpecialtySelect = document.getElementById('singleSpecialtySelect');
            if (singleSpecialtySelect && singleSpecialtySelect.value) {
                const specialtyName = singleSpecialtySelect.options[singleSpecialtySelect.selectedIndex].text;
                if (specialtyName !== 'Selecciona Especialidad') {
                    summaryText += `<span class="badge bg-info text-dark">${specialtyName}</span>`;
                }
            }
        }
    }

    // --- NUEVO: Mostrar sabor seleccionado ---
    const flavorSelect = document.getElementById('flavorSelect');
    if (flavorSelect && flavorSelect.value) {
        summaryText += `<span class="badge bg-success me-2">Sabor: ${flavorSelect.value}</span>`;
    }

    // --- NUEVO: Resumen de Combo (Alitas) ---
    const comboWingSelect = document.getElementById('comboWingSelect');
    if (comboWingSelect && comboWingSelect.value) {
        summaryText += `<span class="badge bg-success me-2">Alitas: ${comboWingSelect.value}</span>`;
    }

    // --- NUEVO: Resumen de Combo (Refresco) ---
    const sodaSelect = document.getElementById('sodaSelect');
    if (sodaSelect && sodaSelect.value) {
        summaryText += `<span class="badge bg-info text-dark me-2">Refresco: ${sodaSelect.value}</span>`;
    }

    // 3. Obtener los extras seleccionados con cantidad
    const selectedExtras = document.querySelectorAll('.extra-quantity-input');
    selectedExtras.forEach(input => {
        const extraQuantity = parseInt(input.value) || 0;

        if (extraQuantity > 0) {
            const extraName = document.getElementById(`checkbox-${input.id}`).closest('.form-check').querySelector('span:first-child').textContent.trim();
            summaryText += `<span class="badge bg-warning text-dark me-2">x${extraQuantity} ${extraName}</span>`;
        }
    });

    // 4. Mostrar u Ocultar el resumen
    if (summaryText.trim()) {
        summaryContent.innerHTML = summaryText;
        summaryContainer.classList.remove('d-none');
    } else {
        summaryContainer.classList.add('d-none');
    }
}

/**
 * Procesa los datos del modal y los añade al carrito.
 * (VERSIÓN MAESTRA: Soporta Pizza Split + Combos con Opciones)
 */
function handleAddToCartFromModal() {
    const selectedRadio = document.querySelector('input[name="selected_variant"]:checked');
    const quantity = parseInt(document.getElementById('quantityInput').value);
    const PIZZA_CATEGORY_ID = 1;

    if (!selectedRadio || quantity < 1) {
        alert('Por favor, selecciona una opción y una cantidad válida.');
        return;
    }

    const variantId = parseInt(selectedRadio.value);
    // Nombre base de la variante (ej: "Grande", "Combo 1")
    const variantNameBase = document.querySelector(`label[for="variant-${variantId}"]`).textContent.split(' ($')[0].trim();
    const basePrice = parseFloat(selectedRadio.dataset.price);

    // 1. EXTRAS
    let selectedExtras = [];
    let extrasPriceTotal = 0;
    document.querySelectorAll('.extra-quantity-input').forEach(input => {
        const extraQuantity = parseInt(input.value) || 0;
        if (extraQuantity > 0) {
            const extraUnitPrice = parseFloat(input.dataset.price);
            extrasPriceTotal += (extraUnitPrice * extraQuantity);
            const checkbox = document.getElementById(`checkbox-${input.id}`);
            selectedExtras.push({
                id: parseInt(input.id.replace('extra-', '')),
                name: checkbox.closest('.form-check').querySelector('span:first-child').textContent.trim(),
                price: extraUnitPrice,
                quantity: extraQuantity
            });
        }
    });

    const finalItemUnitPrice = basePrice + extrasPriceTotal;

    // ---------------------------------------------------------
    // 2. RECOLECTAR OPCIONES DE TEXTO (Refrescos, Sabores, Alitas)
    // ---------------------------------------------------------
    let infoToAdd = [];

    // A. Alitas/Boneless SUELTOS
    const flavorSelect = document.getElementById('flavorSelect');
    if (flavorSelect && flavorSelect.closest('div').style.display !== 'none') {
        if (!flavorSelect.value) { alert('Selecciona el sabor/salsa.'); return; }
        infoToAdd.push(flavorSelect.value);
    }

    // B. Alitas DE COMBO
    const comboWingSelect = document.getElementById('comboWingSelect');
    if (comboWingSelect) {
        if (!comboWingSelect.value) { alert('Selecciona el sabor de las alitas del combo.'); return; }
        infoToAdd.push(`Alitas: ${comboWingSelect.value}`);
    }

    // C. Refresco DE COMBO
    const sodaSelect = document.getElementById('sodaSelect');
    if (sodaSelect) {
        if (!sodaSelect.value) { alert('Selecciona el refresco.'); return; }
        infoToAdd.push(`Ref: ${sodaSelect.value}`);
    }

    // Construir el nombre inicial de la variante
    let finalVariantName = variantNameBase;
    if (infoToAdd.length > 0) {
        finalVariantName += ` (${infoToAdd.join(', ')})`;
    }

    // ---------------------------------------------------------
    // 3. CREAR EL ITEM BASE
    // ---------------------------------------------------------
    let item = {
        id: Date.now(),
        product_id: currentProduct.id,
        name: currentProduct.name,
        variant_name: finalVariantName,
        variant_id: variantId,
        price: finalItemUnitPrice,
        quantity: quantity,
        is_split: false,
        extras: selectedExtras,
        split_details: null
    };

    // ---------------------------------------------------------
    // 4. LÓGICA DE PIZZA (MITAD Y MITAD / ESPECIALIDAD)
    // ---------------------------------------------------------
    const allowsSplit = (currentProduct.allows_pizza_split && currentProduct.allows_pizza_split === 1);
    const isPizza = (currentProduct.category_id === PIZZA_CATEGORY_ID);

    // Si es Pizza O un Combo marcado para permitir pizza
    if (isPizza || allowsSplit) {
        const splitChecked = document.getElementById('splitPizzaCheckbox')?.checked;

        if (splitChecked) {
            // --- CASO: MITAD Y MITAD ---
            const half1Select = document.getElementById('half1Select');
            const half2Select = document.getElementById('half2Select');
            const half1Id = parseInt(half1Select?.value);
            const half2Id = parseInt(half2Select?.value);

            if (!half1Id || !half2Id) {
                alert('Debes seleccionar las dos especialidades para la pizza combinada.');
                return;
            }

            const half1Name = half1Select.options[half1Select.selectedIndex].text;
            const half2Name = half2Select.options[half2Select.selectedIndex].text;

            item.is_split = true;
            item.split_details = {
                half1: { id: half1Id, name: half1Name },
                half2: { id: half2Id, name: half2Name }
            };

            // Construcción del Nombre Principal
            if (isPizza) {
                item.name = `Pizza Combinada: ${half1Name} / ${half2Name}`;
            } else {
                // COMBO: Mantiene nombre del combo + detalles de pizza
                item.name = `${currentProduct.name} (Pizza: ${half1Name} / ${half2Name})`;
            }

            // Añadimos "(Combinada)" a la variante para que se vea en el ticket
            item.variant_name = `${item.variant_name} (Combinada)`;

        } else {
            // --- CASO: ESPECIALIDAD ÚNICA ---
            const singleSpecialtySelect = document.getElementById('singleSpecialtySelect');
            const singleSpecialtyId = parseInt(singleSpecialtySelect?.value);

            // Si existe el selector y no tiene valor, es error (solo si es obligatorio, en combos suele serlo)
            if (singleSpecialtySelect && !singleSpecialtyId) {
                alert('Debes seleccionar una especialidad para la pizza.');
                return;
            }

            // Si se seleccionó algo (o si es pizza y ya tiene ID por defecto)
            if (singleSpecialtyId) {
                const singleSpecialtyName = singleSpecialtySelect.options[singleSpecialtySelect.selectedIndex].text;

                item.is_split = false;
                item.split_details = {
                    half1: { id: singleSpecialtyId, name: singleSpecialtyName },
                    half2: { id: singleSpecialtyId, name: singleSpecialtyName }
                };

                if (isPizza) {
                    // Si cambió la especialidad base
                    if (currentProduct.id !== singleSpecialtyId) {
                        item.name = singleSpecialtyName;
                        item.product_id = singleSpecialtyId;
                    }
                } else {
                    // COMBO: Añadimos la especialidad elegida al nombre
                    item.name = `${currentProduct.name} (${singleSpecialtyName})`;
                }
            }
        }
    }

    // 5. AÑADIR AL CARRITO
    addToCart(item);
    const modalInstance = bootstrap.Modal.getInstance(document.getElementById('variantModal'));
    modalInstance.hide();
}


/**
 * Añade un ítem al carrito y actualiza la vista.
 */
function addToCart(item) {
    cartItems.push(item);
    renderCart();
}


/**
 * Renderiza el contenido del carrito en el panel derecho.
 * Calcula el subtotal, aplica el descuento global y muestra el total final.
 * (VERSIÓN CORREGIDA 2025-11-15 para manejar nombres de Combos Split)
 */
function renderCart() {
    const container = document.getElementById('order-details');
    const subtotalSpan = document.getElementById('order-subtotal');
    const totalSpan = document.getElementById('order-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const discountDisplay = document.getElementById('discount-display');
    const orderDiscountSpan = document.getElementById('order-discount');

    if (!container || !subtotalSpan || !totalSpan || !checkoutBtn || !discountDisplay || !orderDiscountSpan) {
        return;
    }

    // 1. Calcular subtotal sin descuentos
    let subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // 2. Si el carrito está vacío
    if (cartItems.length === 0) {
        removeDiscount();
        container.innerHTML = '<p class="text-muted text-center mt-4">El pedido está vacío. Agrega un producto.</p>';

        subtotalSpan.textContent = formatCurrency(0);
        totalSpan.textContent = formatCurrency(0);

        discountDisplay.style.display = 'none';
        checkoutBtn.disabled = true;
        return;
    }

    // 3. Aplicar Descuento
    const discountAmount = appliedDiscount.value;
    const finalTotal = subtotal - discountAmount;

    // 4. Renderizado de ítems
    container.innerHTML = '';

    cartItems.forEach(item => {
        const itemTotal = item.price * item.quantity;

        // ================================================================
        // INICIO DE LA CORRECCIÓN
        // ================================================================

        // El displayTitle es SIEMPRE item.name.
        // Confiamos en que handleAddToCartFromModal lo ha puesto correctamente.
        // Ej: "Combo 2 (Pizza: Liam / Suprema)"
        // Ej: "Hawaiana"
        // Ej: "Pizza Combinada: Liam / Suprema"
        let displayTitle = item.name;

        let details = '';
        let extrasList = '';

        // 1. Construir la lista de extras (si hay)
        if (item.extras && item.extras.length > 0) {
            item.extras.forEach(extra => {
                extrasList += `<span class="badge bg-secondary me-1">x${extra.quantity} ${extra.name}</span>`;
            });
            extrasList = `<div class="mt-1 small">${extrasList}</div>`;
        }

        // 2. Construir la línea de detalles (Variante + Extras)
        if (item.is_split) {
            // Para items split, ponemos la variante en negrita
            // Ej: "Normal (Combinada)" + (lista de extras)
            details = `<span class="fw-bold text-dark">${item.variant_name}</span>${extrasList}`;
        } else {
            // Para items normales, solo la variante
            // Ej: "Normal" + (lista de extras)
            details = `${item.variant_name}${extrasList}`;
        }

        // ¡YA NO SOBREESCRIBIMOS displayTitle SI ES SPLIT!

        // ================================================================
        // FIN DE LA CORRECCIÓN
        // ================================================================


        container.innerHTML += `
            <div class="d-flex justify-content-between border-bottom py-2 align-items-center">
                <div class="flex-grow-1">
                    ${displayTitle} <br>
                    <small class="text-muted ms-2">${details}</small>
                </div>
                <div class="text-end ms-3">
                    <span class="d-block fw-bold">${formatCurrency(itemTotal)}</span>
                    <span class="text-muted">${item.quantity} x ${formatCurrency(item.price)}</span>
                </div>
                <button class="btn btn-sm btn-outline-danger ms-2" data-item-id="${item.id}" onclick="removeItem(${item.id})">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
                </button>
            </div>
        `;
    });

    // 5. Mostrar Totales
    subtotalSpan.textContent = formatCurrency(subtotal);

    if (discountAmount > 0) {
        discountDisplay.style.display = 'flex';
        orderDiscountSpan.textContent = `- ${formatCurrency(discountAmount)}`;
    } else {
        discountDisplay.style.display = 'none';
        orderDiscountSpan.textContent = formatCurrency(0);
    }

    totalSpan.textContent = formatCurrency(Math.max(0, finalTotal));
    checkoutBtn.disabled = cartItems.length === 0;
}

/**
 * Maneja el flujo completo de finalizar pedido, registrar en BD e imprimir tickets.
 */
async function handleCheckout() {
    if (cartItems.length === 0) {
        alert('El pedido está vacío.');
        return;
    }

    // 1. Obtener tipo de servicio
    const serviceType = document.getElementById('serviceTypeSelector')?.value || 'TO_GO';

    // 2. Determinar el estado (status) basado en el tipo de servicio
    // Si es DINE_IN (Comer Aquí), se abre como PENDING (Pendiente de pago/cierre).
    // Si es TO_GO (Para Llevar), se asume el pago inmediato y se marca como COMPLETED.
    const orderStatusToSend = (serviceType === 'DINE_IN') ? 'PENDING' : 'COMPLETED';

    // 3. Calcular totales finales del pedido
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount_amount = appliedDiscount.value;
    const final_total = subtotal - discount_amount;

    // 4. Construir datos finales de la venta para el backend y la impresora
    const orderDataToSave = {
        subtotal: subtotal,
        discount_amount: discount_amount,
        total: final_total,
        service_type: serviceType,
        status: orderStatusToSend, // <--- NUEVO CAMPO ENVIADO
        items: cartItems
    };

    // 5. Registrar Pedido en la API de PHP
    document.getElementById('checkout-btn').disabled = true;
    document.getElementById('checkout-btn').textContent = 'Guardando pedido...';

    try {
        const response = await fetch(`${API_BASE_URL}/orders/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderDataToSave)
        });

        const data = await response.json();

        if (data.success) {
            const orderId = data.order_id;
            orderDataToSave.order_id = orderId; // Añadir ID para la impresión

            // Si el estado es PENDING, no imprimimos ticket de VENTA/PAGO, solo COCINA.
            if (orderStatusToSend === 'COMPLETED') {
                // Ticket de VENTA/Pago solo si el pago se completó
                await sendPrintJob(orderDataToSave, 'VENTA', PRINT_SERVICE_URL);
            }

            // Ticket de COCINA se imprime siempre (tanto para PENDING como para COMPLETED)
            await sendPrintJob(orderDataToSave, 'COCINA', PRINT_SERVICE_URL);


            // 6. Limpiar y notificar
            alert(`Venta #${orderId} finalizada con éxito. Tipo: ${serviceType}. Estado: ${orderStatusToSend}`);
            cartItems = [];
            removeDiscount();
            renderCart();

        } else {
            alert(`Error al guardar pedido: ${data.message}`);
        }
    } catch (error) {
        console.error('Error durante el checkout:', error);
        alert('Error de conexión o servidor al finalizar el pedido.');
    } finally {
        document.getElementById('checkout-btn').disabled = false;
        document.getElementById('checkout-btn').textContent = 'Finalizar Pedido';
    }
}

/**
 * Genera el string HTML para el selector de Pizza.
 */
function getSplitPizzaHTML(specialtyProducts) {
    const PIZZA_CATEGORY_ID = 1;
    const isPizzaProduct = (currentProduct.category_id === PIZZA_CATEGORY_ID);
    const defaultSpecialtyId = isPizzaProduct ? currentProduct.id : "";

    // Opciones para mitades
    const specialtyOptions = specialtyProducts
        .map(p => `<option value="${p.id}">${p.name}</option>`)
        .join('');

    // Opciones para completa (con default seleccionado)
    const specialtyOptionsWithDefault = specialtyProducts
        .map(p => `<option value="${p.id}" ${p.id === defaultSpecialtyId ? "selected" : ""}>${p.name}</option>`)
        .join('');

    return `
        <div class="variant-options-group mt-4 border-bottom pb-3">
            <h6 class="text-primary">Configuración de Pizza:</h6>
            
            <div id="singleSpecialtyOptions">
                <label for="singleSpecialtySelect" class="form-label">Especialidad Completa:</label>
                <select class="form-select" id="singleSpecialtySelect">
                    <option value="" ${defaultSpecialtyId === "" ? "selected" : ""}>Selecciona Especialidad</option>
                    ${specialtyOptionsWithDefault}
                </select>
            </div>

            <div class="form-check form-switch my-3">
                <input class="form-check-input" type="checkbox" id="splitPizzaCheckbox">
                <label class="form-check-label fw-bold" for="splitPizzaCheckbox">¿Armar Mitad y Mitad?</label>
            </div>

            <div id="splitPizzaOptions" style="display: none;">
                <div class="row">
                    <div class="col-md-6 mb-2">
                        <label class="form-label small">Mitad 1:</label>
                        <select class="form-select form-select-sm" id="half1Select">
                            <option selected value="">Elige...</option>
                            ${specialtyOptions}
                        </select>
                    </div>
                    <div class="col-md-6 mb-2">
                        <label class="form-label small">Mitad 2:</label>
                        <select class="form-select form-select-sm" id="half2Select">
                            <option selected value="">Elige...</option>
                            ${specialtyOptions}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Genera el string HTML para selectores de Combo (Refresco/Alitas).
 */
function getComboSelectorsHTML(product) {
    let html = '';

    // Alitas de Combo
    if (product.combo_wings_options) {
        const flavors = product.combo_wings_options.split(',').map(f => f.trim());
        const optionsHtml = flavors.map(f => `<option value="${f}">${f}</option>`).join('');
        html += `
            <div class="variant-options-group mt-3">
                <label for="comboWingSelect" class="form-label fw-bold">Sabor Alitas (Combo):</label>
                <select class="form-select" id="comboWingSelect">
                    <option value="" selected>Selecciona sabor...</option>
                    ${optionsHtml}
                </select>
            </div>
        `;
    }

    // Refresco de Combo
    if (product.soda_options) {
        const sodas = product.soda_options.split(',').map(s => s.trim());
        const optionsHtml = sodas.map(s => `<option value="${s}">${s}</option>`).join('');
        html += `
            <div class="variant-options-group mt-3">
                <label for="sodaSelect" class="form-label fw-bold">Refresco:</label>
                <select class="form-select" id="sodaSelect">
                    <option value="" selected>Selecciona refresco...</option>
                    ${optionsHtml}
                </select>
            </div>
        `;
    }
    return html;
}

/**
 * Genera el string HTML para sabor simple.
 */
function getFlavorSelectorHTML(flavorString) {
    const flavors = flavorString.split(',').map(f => f.trim());
    const optionsHtml = flavors.map(f => `<option value="${f}">${f}</option>`).join('');

    return `
        <div class="variant-options-group mt-3">
            <label for="flavorSelect" class="form-label fw-bold">Elige Sabor/Salsa:</label>
            <select class="form-select" id="flavorSelect">
                <option value="" selected>Selecciona...</option>
                ${optionsHtml}
            </select>
        </div>
    `;
}

/**
 * Activa la lógica del checkbox Mitad y Mitad.
 * Se llama DESPUÉS de haber inyectado el HTML.
 */
function setupSplitPizzaListeners() {
    const splitCheckbox = document.getElementById('splitPizzaCheckbox');
    const splitOptionsContainer = document.getElementById('splitPizzaOptions');
    const singleSpecialtyContainer = document.getElementById('singleSpecialtyOptions');
    const singleSpecialtySelect = document.getElementById('singleSpecialtySelect');
    const half1Select = document.getElementById('half1Select');
    const half2Select = document.getElementById('half2Select');

    if (splitCheckbox) {
        splitCheckbox.addEventListener('change', () => {
            const isChecked = splitCheckbox.checked;

            // Mostrar/Ocultar contenedores
            splitOptionsContainer.style.display = isChecked ? 'block' : 'none';
            singleSpecialtyContainer.style.display = isChecked ? 'none' : 'block';

            // Resetear valores contrarios para evitar confusión
            if (isChecked) {
                if (singleSpecialtySelect) singleSpecialtySelect.value = "";
            } else {
                if (half1Select) half1Select.value = "";
                if (half2Select) half2Select.value = "";
            }

            updateModalPrice();
            updateSelectionSummary();
        });
    }
}

/**
 * Elimina un ítem del carrito por su ID.
 */
window.removeItem = function (itemId) {
    cartItems = cartItems.filter(item => item.id !== itemId);
    renderCart();
}