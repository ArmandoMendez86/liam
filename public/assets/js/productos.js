// /public/admin/productos.js

// La URL base de la API
const API_BASE_URL = '../../api/index.php';

// Almacén en caché para los datos de categorías y extras
let cacheCategorias = [];
let cacheExtras = [];
let dataTableInstance = null; // <--- CAMBIO: Variable para guardar la instancia de DataTable

document.addEventListener('DOMContentLoaded', () => {

    // --- Referencias a elementos del DOM ---
    const tbody = document.getElementById('productos-tbody');
    const btnCrear = document.getElementById('btn-crear-producto');
    const btnGuardar = document.getElementById('btn-guardar');
    const btnAddVariante = document.getElementById('btn-add-variante');
    
    const modalElement = document.getElementById('producto-modal');
    const modalInstancia = new bootstrap.Modal(modalElement);
    const modalTitulo = document.getElementById('modal-titulo');
    
    // Contenedores del Modal
    const form = document.getElementById('producto-form');
    const selectCategorias = document.getElementById('producto-categoria');
    const listaVariantes = document.getElementById('producto-variantes-lista');
    const listaExtras = document.getElementById('producto-extras-lista');

    /**
     * Carga inicial de datos (Categorías y Extras) para poblar el modal
     */
    async function precargarDatosModal() {
        try {
            // Cargar Categorías
            const catResponse = await fetch(API_BASE_URL + '/categories/list');
            const catData = await catResponse.json();
            if (catData.success) {
                cacheCategorias = catData.data;
                selectCategorias.innerHTML = '<option value="">Seleccione una categoría</option>';
                cacheCategorias.forEach(cat => {
                    selectCategorias.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
                });
            } else {
                selectCategorias.innerHTML = '<option value="">Error al cargar categorías</option>';
            }

            // Cargar Extras
            const extResponse = await fetch(API_BASE_URL + '/extras/list');
            const extData = await extResponse.json();
            if (extData.success) {
                cacheExtras = extData.data;
                listaExtras.innerHTML = '';
                cacheExtras.forEach(extra => {
                    if (extra.activo == 1) { // Solo mostrar extras activos
                        listaExtras.innerHTML += `
                            <div class="col-md-6">
                                <div class="form-check">
                                    <input class="form-check-input extra-checkbox" type="checkbox" value="${extra.id}" id="extra-${extra.id}">
                                    <label class="form-check-label" for="extra-${extra.id}">
                                        ${extra.nombre} (${formatCurrency(extra.precio)})
                                    </label>
                                </div>
                            </div>
                        `;
                    }
                });
            } else {
                listaExtras.innerHTML = '<p>Error al cargar extras.</p>';
            }
        } catch (error) {
            console.error('Error al precargar datos:', error);
            selectCategorias.innerHTML = '<option value="">Error de conexión</option>';
            listaExtras.innerHTML = '<p>Error de conexión</p>';
        }
    }

    /**
     * === FUNCIÓN ACTUALIZADA CON DATATABLES ===
     * Carga la lista de productos en la tabla principal
     */
    async function cargarProductos() {
        
        // 1. Destruir la instancia de DataTable si ya existe
        // Esto es crucial para recargar los datos después de crear/editar/eliminar
        if (dataTableInstance) {
            dataTableInstance.destroy();
            dataTableInstance = null;
        }

        // Mostrar 'Cargando...' en el tbody
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Cargando...</td></tr>';
        
        try {
            // Usamos la nueva ruta 'adminList'
            const response = await fetch(API_BASE_URL + '/products/adminList');
            const data = await response.json();

            // Limpiar el tbody
            tbody.innerHTML = '';

            if (data.success && data.data.length > 0) {
                data.data.forEach(prod => {
                    tbody.innerHTML += `
                        <tr>
                            <td>${prod.id}</td>
                            <td>${prod.name}</td>
                            <td><span class="badge bg-secondary">${prod.category_name}</span></td>
                            <td>${prod.description || '<i class="text-muted">N/A</i>'}</td>
                            <td class="text-end">
                                <button class="btn btn-sm btn-warning btn-accion btn-editar" data-id="${prod.id}">
                                    Editar
                                </button>
                                <button class="btn btn-sm btn-danger btn-accion btn-eliminar" data-id="${prod.id}">
                                    Eliminar
                                </button>
                            </td>
                        </tr>
                    `;
                });
            } else if (data.success && data.data.length === 0) {
                // Dejar vacío, DataTables mostrará "No hay datos"
            } else {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${data.message}</td></tr>`;
            }
        } catch (error) {
            console.error('Error al cargar productos:', error);
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error de conexión con la API.</td></tr>`;
        }

        // 3. (Re)Inicializar DataTables
        // Usamos jQuery (requerido por DataTables)
        // Usamos new DataTable() que es la API moderna de DataTables
        dataTableInstance = new DataTable('#productos-table', {
            // Opciones para traducir DataTables al español
            language: {
                url: 'es-MX.json',
            },
            // Deshabilitar ordenamiento en la columna de Acciones (columna 4)
            "columnDefs": [
                { "orderable": false, "targets": 4 }
            ],
            // Asegurar que sea responsivo
            responsive: true
        });
    }

    /**
     * Añade una fila de input para una nueva variante de producto
     */
    function añadirFilaVariante(variante = { name: '', price: 0, is_default: 0 }) {
        const div = document.createElement('div');
        div.className = 'variante-fila';
        
        div.innerHTML = `
            <input type="text" class="form-control form-control-sm variante-nombre" placeholder="Nombre (Ej: Mediana)" value="${variante.name}" required>
            <input type="number" class="form-control form-control-sm variante-precio" placeholder="Precio" value="${variante.price}" step="0.01" min="0" required>
            <div class="form-check form-check-inline ms-2">
                <input class="form-check-input variante-default" type="radio" name="variante_default">
                <label class="form-check-label small">Default</label>
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger btn-remove-variante">
                <i class="bi bi-x-lg"></i>
            </button>
        `;
        
        // Marcar el 'default' si corresponde
        if (variante.is_default == 1) {
            div.querySelector('.variante-default').checked = true;
        }

        // Evento para el botón de eliminar fila
        div.querySelector('.btn-remove-variante').addEventListener('click', () => {
            div.remove();
            // Si eliminamos el default, marcar el primero como default
            asegurarUnDefault();
        });
        
        // Evento para asegurar que solo un radio esté seleccionado
        div.querySelector('.variante-default').addEventListener('click', () => {
            document.querySelectorAll('.variante-default').forEach(radio => {
                if (radio !== div.querySelector('.variante-default')) {
                    radio.checked = false;
                }
            });
        });

        listaVariantes.appendChild(div);
    }
    
    /**
     * Asegura que siempre haya un radio 'default' seleccionado
     */
    function asegurarUnDefault() {
        const radios = document.querySelectorAll('.variante-default');
        let unoSeleccionado = false;
        radios.forEach(radio => {
            if (radio.checked) unoSeleccionado = true;
        });

        // Si no hay ninguno, o si borramos una fila, seleccionar el primero
        if (!unoSeleccionado && radios.length > 0) {
            radios[0].checked = true;
        }
    }

    /**
     * Resetea el formulario modal a su estado inicial
     */
    function resetModal() {
        form.reset();
        document.getElementById('producto-id').value = '';
        listaVariantes.innerHTML = '';
        // Desmarcar todos los checkboxes de extras
        document.querySelectorAll('.extra-checkbox').forEach(cb => cb.checked = false);
    }

    /**
     * Maneja el clic en "Crear Nuevo Producto"
     */
    btnCrear.addEventListener('click', () => {
        resetModal();
        modalTitulo.textContent = 'Crear Nuevo Producto';
        añadirFilaVariante(); // Añadir una fila vacía
        asegurarUnDefault();
        modalInstancia.show();
    });

    /**
     * Maneja el clic en "Añadir Variante"
     */
    btnAddVariante.addEventListener('click', () => {
        añadirFilaVariante();
        asegurarUnDefault();
    });

    /**
     * Maneja el clic en "Guardar" del modal (Crear o Actualizar)
     */
    async function guardarProducto(e) {
        e.preventDefault();

        // 1. Recolectar Datos Básicos
        const id = document.getElementById('producto-id').value;
        const nombre = document.getElementById('producto-nombre').value.trim();
        const categoria_id = document.getElementById('producto-categoria').value;
        const descripcion = document.getElementById('producto-descripcion').value.trim() || null;

        if (!nombre || !categoria_id) {
            alert('Nombre y Categoría son obligatorios.');
            return;
        }

        // 2. Recolectar Variantes
        const variantes = [];
        const filasVariante = document.querySelectorAll('.variante-fila');
        if (filasVariante.length === 0) {
            alert('Debe añadir al menos una variante de precio.');
            return;
        }
        
        let variantesValidas = true;
        filasVariante.forEach(fila => {
            const nombreVar = fila.querySelector('.variante-nombre').value.trim();
            const precioVar = parseFloat(fila.querySelector('.variante-precio').value);
            const isDefault = fila.querySelector('.variante-default').checked ? 1 : 0;
            
            if (!nombreVar || isNaN(precioVar) || precioVar < 0) {
                variantesValidas = false;
            }
            
            variantes.push({
                name: nombreVar,
                price: precioVar,
                is_default: isDefault
            });
        });

        if (!variantesValidas) {
            alert('Todas las variantes deben tener un nombre y un precio válido (0 o más).');
            return;
        }

        // 3. Recolectar Extras
        const extras = [];
        document.querySelectorAll('.extra-checkbox:checked').forEach(cb => {
            extras.push(parseInt(cb.value));
        });

        // 4. Construir Payload
        const payload = {
            name: nombre,
            description: descripcion,
            category_id: parseInt(categoria_id),
            variants: variantes,
            extras: extras
        };

        const esEdicion = id ? true : false;
        const url = esEdicion ? `${API_BASE_URL}/products/update` : `${API_BASE_URL}/products/create`;
        
        if (esEdicion) {
            payload.id = parseInt(id);
        }

        // 5. Enviar a la API
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {
                alert(esEdicion ? 'Producto actualizado' : 'Producto creado');
                modalInstancia.hide();
                cargarProductos(); // <--- Esto ahora recargará Y reinicializará el DataTable
            } else {
                alert(`Error: ${data.message}`);
            }

        } catch (error) {
            console.error('Error al guardar:', error);
            alert('Error de conexión al guardar.');
        }
    }

    /**
     * Maneja los clics en los botones de "Editar" y "Eliminar"
     */
    async function manejarAccionesTabla(e) {
        // Corrección para DataTables: Asegurarse de que el clic viene de un botón
        // y no de otra parte de la celda.
        const target = e.target.closest('.btn-accion');
        if (!target) return;

        const id = target.dataset.id;

        // --- Botón EDITAR ---
        if (target.classList.contains('btn-editar')) {
            resetModal();
            modalTitulo.textContent = 'Editar Producto';

            try {
                // 1. Obtener los datos completos del producto
                const response = await fetch(`${API_BASE_URL}/products/get?id=${id}`);
                const data = await response.json();

                if (data.success) {
                    const prod = data.data;

                    // 2. Llenar Datos Básicos
                    document.getElementById('producto-id').value = prod.details.id;
                    document.getElementById('producto-nombre').value = prod.details.name;
                    document.getElementById('producto-descripcion').value = prod.details.description || '';
                    document.getElementById('producto-categoria').value = prod.details.category_id;

                    // 3. Llenar Variantes
                    if (prod.variants.length > 0) {
                        prod.variants.forEach(v => añadirFilaVariante(v));
                    } else {
                        añadirFilaVariante(); // Añadir una vacía si no tiene
                    }
                    asegurarUnDefault();

                    // 4. Marcar Extras
                    prod.extras.forEach(extraId => {
                        const cb = document.getElementById(`extra-${extraId}`);
                        if (cb) cb.checked = true;
                    });
                    
                    // 5. Mostrar modal
                    modalInstancia.show();

                } else {
                    alert(`Error al cargar datos: ${data.message}`);
                }
            } catch (error) {
                console.error('Error al cargar producto:', error);
                alert('Error de conexión.');
            }
        }

        // --- Botón ELIMINAR ---
        if (target.classList.contains('btn-eliminar')) {
            if (!confirm(`¿Estás seguro de que quieres eliminar el producto con ID ${id}?\n\nADVERTENCIA: No podrás eliminarlo si ya está en alguna orden de venta.`)) {
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/products/delete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: parseInt(id) })
                });

                const data = await response.json();

                if (data.success) {
                    alert('Producto eliminado');
                    cargarProductos(); // <--- Esto ahora recargará Y reinicializará el DataTable
                } else {
                    alert(`Error al eliminar: ${data.message}`);
                }
            } catch (error) {
                console.error('Error al eliminar:', error);
                alert('Error de conexión.');
            }
        }
    }

    // --- Inicialización ---
    precargarDatosModal();
    cargarProductos(); // Carga inicial

    // --- Asignación de Eventos ---
    btnGuardar.addEventListener('click', guardarProducto);
    
    // CAMBIO: El listener de "Editar/Eliminar" ahora escucha en la tabla,
    // pero la función 'manejarAccionesTabla' filtrará mejor los clics.
    tbody.addEventListener('click', manejarAccionesTabla);

});


// --- Funciones Helper (copiadas de extras.js) ---
function formatCurrency(number) {
    if (isNaN(number)) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2
    }).format(number);
}