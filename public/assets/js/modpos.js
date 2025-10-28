// /pizzeria_pos/public/assets/js/pos.js

const API_BASE_URL = '../api/index.php';

// Variables globales del estado
let fullMenuData = []; // Menú completo cargado de la API
let cartItems = [];    // Array de ítems en el carrito
let currentProduct = null; // Producto actualmente seleccionado para el modal

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // INICIALIZACIÓN
    // ----------------------------------------------------
    initPOS();

    // ----------------------------------------------------
    // LISTENERS GLOBALES
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

    // *IMPORTANTE: El listener de 'change' del modal y el 'input' de cantidad 
    // se adjuntan AHORA dentro de showVariantModal para evitar conflictos.

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

/**
 * Inicializa la aplicación POS: verifica sesión y carga el menú.
 */
async function initPOS() {
    const user = await checkLoginStatus();

    if (user) {
        document.getElementById('user-info').textContent = `Usuario: ${user.username}`;
        loadMenu();
    } else {
        window.location.href = 'login.html';
    }
}

/**
 * Carga el menú completo desde la API de Productos.
 */

async function loadMenu() {
    try {
        const response = await fetch(`${API_BASE_URL}/products/list`);
        const data = await response.json();

        if (data.success) {
            fullMenuData = data.data; // Guardar el menú completo
            setupSearchListener(); // Inicializar el listener del buscador
            setupMenuListeners(); // Añadir listeners a los botones de producto (aunque no estén renderizados aún)
            // Ya NO llamamos a renderMenu aquí. El prompt inicial se muestra por defecto.
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
 */

// /pizzeria_pos/public/assets/js/pos.js (Línea 126)
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
        // Mostrar el prompt y limpiar el contenedor de productos
        if (searchPrompt) {
            searchPrompt.style.display = 'block'; // Mostrar el mensaje
        }
        container.innerHTML = ''; // Limpiar cualquier producto renderizado previamente
        return;
    }

    // 2. Si hay productos para renderizar
    if (searchPrompt) {
        searchPrompt.style.display = 'none'; // Ocultar el mensaje
    }

    container.innerHTML = ''; // Limpiar el contenedor antes de renderizar productos

    // Asumimos que 1 es el ID de la categoría Pizzas para lógica de botón.
    const PIZZA_CATEGORY_ID = 1;

    menuData.forEach(category => {
        if (category.products.length === 0) return;

        // Título de la Categoría
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
                // Productos con múltiples opciones (Pizzas, Alitas, Bebidas)
                if (product.variants.length > 0) {
                    const minPrice = Math.min(...product.variants.map(v => v.price));
                    priceDisplay = `Desde $${minPrice.toFixed(2)}`;
                }
                buttonClass = 'btn-warning'; // Botón amarillo: requiere selección en modal
            } else if (defaultVariant) {
                // Productos con precio fijo (ej. Hamburguesa Sencilla)
                priceDisplay = `$${defaultVariant.price.toFixed(2)}`;
                buttonClass = 'btn-success'; // Botón verde: agregar directo
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

    // Al iniciar, forzamos el renderizado con una lista vacía para mostrar el prompt.
    renderMenu([]);

    searchInput.addEventListener('keyup', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();

        if (searchTerm.length === 0) {
            // Si el campo está vacío, mostramos el prompt
            renderMenu([]);
            return;
        }

        const filteredMenu = fullMenuData.map(category => {
            // Filtrar los productos dentro de cada categoría
            const filteredProducts = category.products.filter(product => {
                return product.name.toLowerCase().includes(searchTerm) ||
                    product.description?.toLowerCase().includes(searchTerm);
            });
            // Devolver la categoría con solo los productos filtrados
            return { ...category, products: filteredProducts };
        }).filter(category => category.products.length > 0); // Ocultar categorías vacías

        renderMenu(filteredMenu);
    });
}

/**
 * Añade listeners a los botones de producto (delegado).
 */
function setupMenuListeners() {
    // Remover listeners viejos antes de añadir nuevos (importante para evitar duplicados)
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

    // Si no hay un ID válido, salimos inmediatamente para evitar errores.
    if (isNaN(productId)) {
        console.error('El botón no tiene un ID de producto válido.');
        return;
    }

    // Buscar el producto en el menú completo
    // Usamos flatMap para obtener un array simple de todos los productos
    const allProducts = fullMenuData.flatMap(cat => cat.products);

    currentProduct = allProducts.find(p => p.id === productId);

    // ********* CORRECCIÓN CLAVE *********
    // Validar que currentProduct NO sea undefined antes de usarlo.
    if (!currentProduct) {
        console.error(`Producto con ID ${productId} no encontrado en fullMenuData.`);
        return;
    }

    const PIZZA_CATEGORY_ID = 1;

    // Productos que requieren modal: Pizzas (siempre) o con más de 1 variante
    if (currentProduct.category_id === PIZZA_CATEGORY_ID || currentProduct.variants.length > 1) {
        showVariantModal(currentProduct);
    } else {
        // Productos simples (Ej. Hot Dog) con una sola variante default
        // Debe tener al menos una variante si existe en la BD, si no, es un error de datos.
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
 * Muestra y pobla el modal de selección de variantes.
 */
function showVariantModal(product) {
    currentProduct = product;
    const modal = new bootstrap.Modal(document.getElementById('variantModal'));
    const PIZZA_CATEGORY_ID = 1;

    // 1. Resetear formulario y datos básicos
    document.getElementById('variantForm').reset();
    document.getElementById('quantityInput').value = 1;
    document.getElementById('modalProductId').value = product.id;
    document.getElementById('modalProductName').textContent = product.name;
    document.getElementById('modalProductDescription').textContent = product.description || '';

    // OCULTAR RESUMEN AL INICIO
    document.getElementById('selection-summary').classList.add('d-none');

    const optionsContainer = document.getElementById('modalVariantOptions');
    const extrasContainer = document.getElementById('modalProductExtras');

    optionsContainer.innerHTML = '';
    if (extrasContainer) {
        extrasContainer.innerHTML = '';
    }

    // 2. Renderizar contenido
    if (product.category_id === PIZZA_CATEGORY_ID) {
        const specialtyProducts = fullMenuData.find(cat => cat.id === PIZZA_CATEGORY_ID)?.products || [];
        renderSplitPizzaSelector(optionsContainer, specialtyProducts);
    }
    renderPriceVariants(optionsContainer, product.variants);
    if (extrasContainer) {
        renderProductExtras(extrasContainer, product.extras);
    }

    // 3. Seleccionar la primera variante por defecto
    const firstRadio = document.querySelector('#modalVariantOptions input[type="radio"]');
    if (firstRadio) {
        firstRadio.checked = true;
    }

    // 4. Configuración de Listeners (LIMPIA Y ROBUSTA)
    const variantForm = document.getElementById('variantForm');
    const quantityInput = document.getElementById('quantityInput'); // Input de cantidad principal

    // Limpieza de Listeners (anulamos los listeners anteriores que pudieran existir)
    variantForm.onchange = null;
    quantityInput.oninput = null;

    // Añadimos el listener de 'change' al formulario (captura radio buttons, select y checkbox)
    variantForm.addEventListener('change', () => {
        updateModalPrice();
        updateSelectionSummary();
    });

    // Añadimos el listener de 'input' al input de cantidad principal (Cantidad:)
    quantityInput.addEventListener('input', () => {
        updateModalPrice();
        updateSelectionSummary();
    });

    // 5. Forzar la actualización inicial
    updateModalPrice();
    updateSelectionSummary();

    modal.show();
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

    // 2. Si es Pizza, obtener las opciones de especialidad / mitades
    if (currentProduct.category_id === 1) {
        const isSplit = document.getElementById('splitPizzaCheckbox')?.checked;
        const form = document.getElementById('variantForm');

        if (isSplit) {
            // Mitades
            const half1Select = document.getElementById('half1Select');
            const half2Select = document.getElementById('half2Select');

            if (half1Select && half2Select) {
                const half1Name = half1Select.options[half1Select.selectedIndex].text;
                const half2Name = half2Select.options[half2Select.selectedIndex].text;

                if (half1Name !== 'Selecciona Especialidad') {
                    summaryText += `<span class="badge bg-info text-dark me-2">½: ${half1Name}</span>`;
                }
                if (half2Name !== 'Selecciona Especialidad') {
                    summaryText += `<span class="badge bg-info text-dark">½: ${half2Name}</span>`;
                }
            }
        } else {
            // Especialidad Completa (Se lee directamente del producto clicado)
            const specialtyName = form.dataset.singleSpecialtyName;

            if (specialtyName) {
                summaryText += `<span class="badge bg-info text-dark">${specialtyName}</span>`;
            }
        }
    }

    // 3. Obtener los extras seleccionados con cantidad (MODIFICADO)
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
 * Renderiza los radio buttons para elegir la variante de precio.
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
        const checked = index === 0 ? 'checked' : '';

        optionsHtml += `
            <div class="form-check">
                <input class="form-check-input variant-radio" type="radio" name="selected_variant" 
                       id="${inputId}" value="${variant.id}" data-price="${variant.price.toFixed(2)}" ${checked}>
                <label class="form-check-label" for="${inputId}">
                    <span>${variant.name}</span> <span class="fw-bold">($${variant.price.toFixed(2)})</span>
                </label>
            </div>
        `;
    });

    variantGroup.innerHTML += optionsHtml;
    container.appendChild(variantGroup);

    // ************ CORRECCIÓN CLAVE ************
    // Adjuntamos un listener delegado al nuevo grupo de variantes.
    // Esto asegura que cualquier cambio en un radio button dentro de este grupo
    // dispare inmediatamente las funciones de actualización.
    variantGroup.addEventListener('change', (event) => {
        if (event.target.classList.contains('variant-radio')) {
            updateModalPrice();
            updateSelectionSummary();
        }
    });
}

/**
 * Renderiza los selectores para la opción Mitad y Mitad en Pizzas.
 * AHORA: Asume que la especialidad ya fue seleccionada (por el clic en la tarjeta).
 */
function renderSplitPizzaSelector(container, specialtyProducts) {
    // La lista specialtyProducts solo se usa aquí para poblar los selectores de las mitades.

    const specialtyOptions = specialtyProducts
        .map(p => `<option value="${p.id}">${p.name}</option>`)
        .join('');

    container.innerHTML += `
        <div class="variant-options-group mt-4">
            <h6>Selección de Especialidad:</h6>
            
            <div class="form-check form-switch mb-3">
                <input class="form-check-input" type="checkbox" id="splitPizzaCheckbox">
                <label class="form-check-label" for="splitPizzaCheckbox">¿Pizza Mitad y Mitad?</label>
            </div>

            <div id="splitPizzaOptions" style="display: none;">
                <h6 class="mt-3">Elige las dos mitades:</h6>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="half1Select" class="form-label">Mitad 1:</label>
                        <select class="form-select" id="half1Select">
                            <option selected>Selecciona Especialidad</option>
                            ${specialtyOptions}
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label for="half2Select" class="form-label">Mitad 2:</label>
                        <select class="form-select" id="half2Select">
                            <option selected>Selecciona Especialidad</option>
                            ${specialtyOptions}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    `;

    // ----------------------------------------------------------
    // LISTENERS Y ACTUALIZACIÓN DEL RESUMEN (CLAVE)
    // ----------------------------------------------------------
    const half1Select = document.getElementById('half1Select');
    const half2Select = document.getElementById('half2Select');
    const splitCheckbox = document.getElementById('splitPizzaCheckbox');

    // *******************************************************************
    // NUEVO CÓDIGO CLAVE: Establece la especialidad actual por defecto.
    // *******************************************************************
    // Como el usuario hizo clic en una tarjeta específica (ej. Doris Pizza),
    // debemos almacenar su ID de producto para usarlo como la "Especialidad Completa".
    const currentSpecialtyId = currentProduct.id;
    const currentSpecialtyName = currentProduct.name;

    // Guardamos la información en el formulario para que el resumen la pueda leer.
    const form = document.getElementById('variantForm');
    form.dataset.singleSpecialtyId = currentSpecialtyId;
    form.dataset.singleSpecialtyName = currentSpecialtyName;

    // Listener para el checkbox (maneja la visibilidad de los selectores y actualiza el resumen)
    if (splitCheckbox) {
        splitCheckbox.addEventListener('change', () => {
            document.getElementById('splitPizzaOptions').style.display = splitCheckbox.checked ? 'block' : 'none';
            // Ya no hay singlePizzaSelector para ocultar/mostrar.
            updateSelectionSummary();
        });
    }

    // Listeners para los selectores de mitades (actualizan el resumen al cambiar)
    if (half1Select) {
        half1Select.addEventListener('change', updateSelectionSummary);
    }
    if (half2Select) {
        half2Select.addEventListener('change', updateSelectionSummary);
    }

    // Nota: specialtySelect ya no existe en este código, así que su listener fue removido.
}

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
        const checkboxId = `checkbox-${inputId}`; // ID del checkbox

        // Usamos Flexbox para alinear el nombre, precio y cantidad
        extrasGroup.innerHTML += `
            <div class="form-check d-flex justify-content-between align-items-center mb-2 p-0">
                
                <input type="checkbox" class="extra-checkbox d-none" id="${checkboxId}" value="${extra.id}" data-price="${extra.price.toFixed(2)}">

                <label class="form-check-label flex-grow-1" for="${checkboxId}">
                    <span>${extra.name}</span> 
                    <span class="fw-bold text-dark">(+ $${extra.price.toFixed(2)})</span>
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

    // --- LÓGICA DE LISTENERS PARA INTERACCIÓN ---

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
                // Sincronizar: Si la cantidad es > 0, checar el box. Si es 0, deschecar.
                checkbox.checked = extraQuantity > 0;

                // Habilitar/Deshabilitar el input
                input.disabled = (extraQuantity === 0);
            }
            // Forzar actualización de precio y resumen
            updateModalPrice();
            updateSelectionSummary();
        });
    });

    // 3. Listener para la ETIQUETA (Permite hacer clic en el nombre para seleccionar)
    document.querySelectorAll('.form-check-label').forEach(label => {
        label.addEventListener('click', (e) => {
            // Evitar que el clic en el input de cantidad se propague y desactive el extra
            if (e.target.tagName === 'INPUT') {
                e.stopPropagation();
                return;
            }

            const checkbox = document.getElementById(label.htmlFor);
            if (checkbox && !checkbox.checked) {
                // Si el extra NO está seleccionado, lo seleccionamos al hacer clic en la etiqueta
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change')); // Dispara la lógica de activación
                e.preventDefault(); // Evita que se cambie el estado del checkbox dos veces
            } else if (checkbox && checkbox.checked) {
                // Si ya está checado, el próximo clic podría ser para deschecarlo.
                // Lo dejamos así para que el usuario pueda usar el input directamente.
            }
        });
    });
}

/**
 * Gestiona el estado de habilitado/cantidad de los inputs de extras, disparado por el checkbox.
 */
function updateExtraQuantityState(event) {
    const checkbox = event.target;
    // La ID del input es la ID del checkbox sin el prefijo 'checkbox-'
    const inputId = checkbox.id.replace('checkbox-', '');
    const quantityInput = document.getElementById(inputId);

    if (!quantityInput) return;

    if (checkbox.checked) {
        // Si se selecciona el extra, habilitar input y asegurar cantidad mínima de 1
        quantityInput.disabled = false;
        if (parseInt(quantityInput.value) === 0) {
            quantityInput.value = 1;
        }
        quantityInput.focus(); // Enfocar el input para que el usuario pueda escribir
    } else {
        // Si se deselecciona, deshabilitar y establecer cantidad en 0
        quantityInput.disabled = true;
        quantityInput.value = 0;
    }

    // Disparar el evento de input para actualizar el precio y el resumen
    quantityInput.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Actualiza el precio total mostrado en el modal sumando la variante y los extras.
 */
function updateModalPrice() {
    const selectedRadio = document.querySelector('input[name="selected_variant"]:checked');
    // Aseguramos que la cantidad principal del producto sea al menos 1 para el cálculo
    const quantity = parseInt(document.getElementById('quantityInput').value) || 1;
    const priceSpan = document.getElementById('modalVariantPrice');

    let basePrice = 0;

    if (selectedRadio) {
        basePrice = parseFloat(selectedRadio.dataset.price);
    }

    // 1. CALCULAR COSTO DE EXTRAS CON CANTIDAD (MODIFICADO)
    let extrasPriceTotal = 0;
    // Seleccionamos todos los inputs de cantidad de extras que tengan valor > 0
    const extraInputs = document.querySelectorAll('.extra-quantity-input');

    extraInputs.forEach(input => {
        const extraQuantity = parseInt(input.value) || 0;

        if (extraQuantity > 0) {
            const extraUnitPrice = parseFloat(input.dataset.price);
            // Sumamos (Precio Unitario del Extra * Cantidad del Extra)
            extrasPriceTotal += (extraUnitPrice * extraQuantity);
        }
    });

    // 2. CALCULAR EL PRECIO FINAL DEL ÍTEM UNITARIO
    // Sumamos el costo TOTAL de los extras al precio base del producto.
    const itemPrice = basePrice + extrasPriceTotal;

    // 3. CALCULAR EL TOTAL A PAGAR (Precio del Ítem * Cantidad principal)
    const totalPrice = itemPrice * quantity;

    // Actualizar el precio visible en el footer
    document.getElementById('modalVariantPrice').textContent = `$${totalPrice.toFixed(2)}`;

    // También actualizamos el resumen (llamado desde el listener de input)
}

/**
 * Procesa los datos del modal y los añade al carrito.
 */
function handleAddToCartFromModal() {
    const selectedRadio = document.querySelector('input[name="selected_variant"]:checked');
    const quantity = parseInt(document.getElementById('quantityInput').value);
    const splitChecked = document.getElementById('splitPizzaCheckbox')?.checked;
    const PIZZA_CATEGORY_ID = 1;

    if (!selectedRadio || quantity < 1) {
        alert('Por favor, selecciona una opción y una cantidad válida.');
        return;
    }

    const variantId = parseInt(selectedRadio.value);
    const variantName = document.querySelector(`label[for="variant-${variantId}"]`).textContent.split(' ($')[0].trim();
    const basePrice = parseFloat(selectedRadio.dataset.price);

    // 1. OBTENER EXTRAS SELECCIONADOS CON CANTIDAD (MODIFICADO)
    let selectedExtras = [];
    let extrasPriceTotal = 0;
    // Seleccionamos los inputs que tengan una cantidad mayor a 0
    const extraInputs = document.querySelectorAll('.extra-quantity-input');

    extraInputs.forEach(input => {
        const extraQuantity = parseInt(input.value) || 0;

        if (extraQuantity > 0) {
            const extraUnitPrice = parseFloat(input.dataset.price);
            extrasPriceTotal += (extraUnitPrice * extraQuantity); // Suma el costo total del extra

            // Buscar la información del extra para el registro
            const checkboxId = `checkbox-${input.id}`;
            const checkbox = document.getElementById(checkboxId);

            selectedExtras.push({
                id: parseInt(input.id),
                name: checkbox.closest('.form-check').querySelector('span:first-child').textContent.trim(),
                price: extraUnitPrice, // Precio unitario del extra
                quantity: extraQuantity // CANTIDAD DEL EXTRA
            });
        }
    });

    // El precio unitario del item final debe ser: Precio Base + (Costo Total Extras / Cantidad Principal)
    // Esto es vital para que el total en el carrito (precio * cantidad) sea correcto.
    const finalItemUnitPrice = basePrice + (extrasPriceTotal / quantity);

    let item = {
        id: Date.now(),
        product_id: currentProduct.id,
        name: currentProduct.name,
        variant_name: variantName,
        variant_id: variantId,
        price: finalItemUnitPrice,
        quantity: quantity,
        is_split: false,
        extras: selectedExtras
    };

    // 2. LÓGICA DE MITAD Y MITAD (Se mantiene igual)
    if (currentProduct.category_id === PIZZA_CATEGORY_ID && splitChecked) {
        // ... (Tu lógica de Mitad y Mitad para la asignación de item.is_split, etc.)
        const half1Select = document.getElementById('half1Select');
        const half2Select = document.getElementById('half2Select');
        const half1Id = parseInt(half1Select.value);
        const half2Id = parseInt(half2Select.value);
        const half1Name = half1Select.options[half1Select.selectedIndex].text;
        const half2Name = half2Select.options[half2Select.selectedIndex].text;

        if (!half1Id || !half2Id) {
            alert('Debes seleccionar las dos especialidades para la pizza combinada.');
            return;
        }

        item.is_split = true;
        item.split_details = {
            half1: { id: half1Id, name: half1Name },
            half2: { id: half2Id, name: half2Name }
        };
        item.name = `Pizza Combinada: ${half1Name} / ${half2Name}`;
        item.variant_name = `${item.variant_name} (Combinada)`;
    }

    addToCart(item);
    const modalInstance = bootstrap.Modal.getInstance(document.getElementById('variantModal'));
    modalInstance.hide();
}

// ----------------------------------------------------
// 4. FUNCIONES DEL CARRITO DE PEDIDOS
// ----------------------------------------------------

/**
 * Añade un ítem al carrito y actualiza la vista.
 */
function addToCart(item) {
    // Para simplificar, solo empujamos el ítem. En producción se buscaría si existe para sumarle cantidad.
    cartItems.push(item);
    renderCart();
}

/**
 * Renderiza el contenido del carrito en el panel derecho.
 */
function renderCart() {
    const container = document.getElementById('order-details');
    const subtotalSpan = document.getElementById('order-subtotal');
    const totalSpan = document.getElementById('order-total');

    if (cartItems.length === 0) {
        container.innerHTML = '<p class="text-muted text-center mt-4">El pedido está vacío. Agrega un producto.</p>';
        subtotalSpan.textContent = '$0.00';
        totalSpan.textContent = '$0.00';
        document.getElementById('checkout-btn').disabled = true;
        return;
    }

    let subtotal = 0;
    container.innerHTML = '';

    cartItems.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;

        let displayTitle = item.name;
        let details = item.variant_name;

        // Mostrar detalles específicos de la combinación de pizza
        if (item.is_split) {
            details = `<span class="fw-bold text-dark">${item.variant_name}</span>`;
            displayTitle = `<span class="fw-bold">${item.split_details.half1.name} / ${item.split_details.half2.name}</span>`;
        }

        container.innerHTML += `
            <div class="d-flex justify-content-between border-bottom py-2 align-items-center">
                <div class="flex-grow-1">
                    ${displayTitle} <br>
                    <small class="text-muted ms-2">${details}</small>
                </div>
                <div class="text-end ms-3">
                    <span class="d-block fw-bold">$${itemTotal.toFixed(2)}</span>
                    <span class="text-muted">${item.quantity} x $${item.price.toFixed(2)}</span>
                </div>
                <button class="btn btn-sm btn-outline-danger ms-2" data-item-id="${item.id}" onclick="removeItem(${item.id})">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
                </button>
            </div>
        `;
    });

    // Totales (sin impuestos/descuentos por ahora)
    subtotalSpan.textContent = `$${subtotal.toFixed(2)}`;
    totalSpan.textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('checkout-btn').disabled = false;
}

/**
 * Elimina un ítem del carrito por su ID.
 * Nota: Debe ser global para el onclick en renderCart.
 */
window.removeItem = function (itemId) {
    cartItems = cartItems.filter(item => item.id !== itemId);
    renderCart();
}