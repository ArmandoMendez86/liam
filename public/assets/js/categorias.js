// /public/admin/categorias.js

// La URL base de la API. Como estamos en /public/admin/, 
// subimos dos niveles para llegar a /api/
const API_BASE_URL = '../../api/index.php';

// Esperar a que el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {

    // --- Referencias a elementos del DOM ---
    const tbody = document.getElementById('categorias-tbody');
    const btnCrear = document.getElementById('btn-crear-categoria');
    const btnGuardar = document.getElementById('btn-guardar');
    const modalElement = document.getElementById('categoria-modal');
    const modalInstancia = new bootstrap.Modal(modalElement);
    const modalTitulo = document.getElementById('modal-titulo');
    const form = document.getElementById('categoria-form');
    const categoriaIdField = document.getElementById('categoria-id');
    const categoriaNombreField = document.getElementById('categoria-nombre');
    const categoriaOrdenField = document.getElementById('categoria-orden');

    /**
     * Carga todas las categorías desde la API y las muestra en la tabla
     */
    async function cargarCategorias() {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Cargando...</td></tr>';
        try {
            const response = await fetch(API_BASE_URL + '/categories/list');
            const data = await response.json();

            if (data.success && data.data.length > 0) {
                tbody.innerHTML = ''; // Limpiar la tabla
                data.data.forEach(categoria => {
                    tbody.innerHTML += `
                        <tr>
                            <td>${categoria.id}</td>
                            <td>${categoria.name}</td>
                            <td>${categoria.sort_order}</td>
                            <td class="text-end">
                                <button class="btn btn-sm btn-warning btn-accion btn-editar" data-id="${categoria.id}">
                                    Editar
                                </button>
                                <button class="btn btn-sm btn-danger btn-accion btn-eliminar" data-id="${categoria.id}">
                                    Eliminar
                                </button>
                            </td>
                        </tr>
                    `;
                });
            } else if (data.success && data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">No hay categorías creadas.</td></tr>';
            } else {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error: ${data.message}</td></tr>`;
            }
        } catch (error) {
            console.error('Error al cargar categorías:', error);
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error de conexión con la API.</td></tr>`;
        }
    }

    /**
     * Maneja el clic en el botón "Guardar" del modal
     */
    async function guardarCategoria(e) {
        e.preventDefault();
        
        const id = categoriaIdField.value;
        const nombre = categoriaNombreField.value.trim();
        const orden = parseInt(categoriaOrdenField.value) || 0;

        if (!nombre) {
            alert('El nombre es obligatorio.');
            return;
        }

        const esEdicion = id ? true : false;
        const url = esEdicion ? `${API_BASE_URL}/categories/update` : `${API_BASE_URL}/categories/create`;
        
        const payload = {
            name: nombre,
            sort_order: orden
        };

        if (esEdicion) {
            payload.id = parseInt(id);
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {
                alert(esEdicion ? 'Categoría actualizada' : 'Categoría creada');
                modalInstancia.hide();
                cargarCategorias(); // Recargar la tabla
            } else {
                alert(`Error: ${data.message}`);
            }

        } catch (error) {
            console.error('Error al guardar:', error);
            alert('Error de conexión al guardar.');
        }
    }

    /**
     * Maneja los clics en los botones de "Editar" y "Eliminar" (Delegación de eventos)
     */
    async function manejarAccionesTabla(e) {
        const target = e.target;
        const id = target.dataset.id;

        // --- Botón EDITAR ---
        if (target.classList.contains('btn-editar')) {
            try {
                // 1. Obtener los datos actuales de esa categoría
                const response = await fetch(`${API_BASE_URL}/categories/get?id=${id}`);
                const data = await response.json();

                if (data.success) {
                    // 2. Llenar el formulario con los datos
                    categoriaIdField.value = data.data.id;
                    categoriaNombreField.value = data.data.name;
                    categoriaOrdenField.value = data.data.sort_order;
                    
                    // 3. Mostrar el modal en modo "Editar"
                    modalTitulo.textContent = 'Editar Categoría';
                    modalInstancia.show();
                } else {
                    alert(`Error al cargar datos: ${data.message}`);
                }
            } catch (error) {
                console.error('Error al cargar categoría:', error);
                alert('Error de conexión.');
            }
        }

        // --- Botón ELIMINAR ---
        if (target.classList.contains('btn-eliminar')) {
            if (!confirm(`¿Estás seguro de que quieres eliminar la categoría con ID ${id}?\n\nADVERTENCIA: No podrás eliminarla si tiene productos asignados.`)) {
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/categories/delete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: parseInt(id) })
                });

                const data = await response.json();

                if (data.success) {
                    alert('Categoría eliminada');
                    cargarCategorias(); // Recargar la tabla
                } else {
                    alert(`Error al eliminar: ${data.message}`);
                }
            } catch (error) {
                console.error('Error al eliminar:', error);
                alert('Error de conexión.');
            }
        }
    }

    // --- Asignación de Eventos ---

    // Cargar categorías al iniciar
    cargarCategorias();

    // Botón "Crear Nueva Categoría"
    btnCrear.addEventListener('click', () => {
        form.reset(); // Limpiar el formulario
        categoriaIdField.value = ''; // Asegurarse de que no haya ID
        modalTitulo.textContent = 'Crear Nueva Categoría';
        modalInstancia.show();
    });

    // Botón "Guardar" del modal
    btnGuardar.addEventListener('click', guardarCategoria);

    // Listener en la tabla para los botones de Editar/Eliminar
    tbody.addEventListener('click', manejarAccionesTabla);

});