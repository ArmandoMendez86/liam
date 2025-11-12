// /public/admin/extras.js

// La URL base de la API (subimos dos niveles)
const API_BASE_URL = '../../api/index.php';

/**
 * Formatea un número al formato de moneda (copiado de tu pos.js)
 */
function formatCurrency(number) {
    if (isNaN(number)) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2
    }).format(number);
}

document.addEventListener('DOMContentLoaded', () => {

    // --- Referencias a elementos del DOM ---
    const tbody = document.getElementById('extras-tbody');
    const btnCrear = document.getElementById('btn-crear-extra');
    const btnGuardar = document.getElementById('btn-guardar');
    const modalElement = document.getElementById('extra-modal');
    const modalInstancia = new bootstrap.Modal(modalElement);
    const modalTitulo = document.getElementById('modal-titulo');
    const form = document.getElementById('extra-form');
    
    // Campos del formulario
    const extraIdField = document.getElementById('extra-id');
    const extraNombreField = document.getElementById('extra-nombre');
    const extraPrecioField = document.getElementById('extra-precio');
    const extraDescField = document.getElementById('extra-descripcion');
    const extraActivoField = document.getElementById('extra-activo');

    /**
     * Carga todos los extras desde la API y los muestra en la tabla
     */
    async function cargarExtras() {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Cargando...</td></tr>';
        try {
            const response = await fetch(API_BASE_URL + '/extras/list');
            const data = await response.json();

            if (data.success && data.data.length > 0) {
                tbody.innerHTML = ''; // Limpiar la tabla
                data.data.forEach(extra => {
                    const activoBadge = extra.activo == 1 
                        ? '<span class="badge bg-success">Sí</span>' 
                        : '<span class="badge bg-danger">No</span>';
                    
                    tbody.innerHTML += `
                        <tr>
                            <td>${extra.id}</td>
                            <td>${extra.nombre}</td>
                            <td>${formatCurrency(extra.precio)}</td>
                            <td>${extra.descripcion || '<i class="text-muted">N/A</i>'}</td>
                            <td>${activoBadge}</td>
                            <td class="text-end">
                                <button class="btn btn-sm btn-warning btn-accion btn-editar" data-id="${extra.id}">
                                    Editar
                                </button>
                                <button class="btn btn-sm btn-danger btn-accion btn-eliminar" data-id="${extra.id}">
                                    Eliminar
                                </button>
                            </td>
                        </tr>
                    `;
                });
            } else if (data.success && data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay extras creados.</td></tr>';
            } else {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${data.message}</td></tr>`;
            }
        } catch (error) {
            console.error('Error al cargar extras:', error);
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error de conexión con la API.</td></tr>`;
        }
    }

    /**
     * Maneja el clic en el botón "Guardar" del modal
     */
    async function guardarExtra(e) {
        e.preventDefault();
        
        const id = extraIdField.value;
        const nombre = extraNombreField.value.trim();
        const precio = parseFloat(extraPrecioField.value) || 0;
        const descripcion = extraDescField.value.trim() || null; // Enviar null si está vacío
        const activo = extraActivoField.checked ? 1 : 0; // 1 si está marcado, 0 si no

        if (!nombre || precio < 0) {
            alert('El nombre y un precio válido (0 o más) son obligatorios.');
            return;
        }

        const esEdicion = id ? true : false;
        const url = esEdicion ? `${API_BASE_URL}/extras/update` : `${API_BASE_URL}/extras/create`;
        
        const payload = {
            nombre: nombre,
            precio: precio,
            descripcion: descripcion,
            activo: activo
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
                alert(esEdicion ? 'Extra actualizado' : 'Extra creado');
                modalInstancia.hide();
                cargarExtras(); // Recargar la tabla
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
        const target = e.target;
        const id = target.dataset.id;

        // --- Botón EDITAR ---
        if (target.classList.contains('btn-editar')) {
            try {
                // 1. Obtener los datos actuales
                const response = await fetch(`${API_BASE_URL}/extras/get?id=${id}`);
                const data = await response.json();

                if (data.success) {
                    // 2. Llenar el formulario
                    extraIdField.value = data.data.id;
                    extraNombreField.value = data.data.nombre;
                    extraPrecioField.value = data.data.precio;
                    extraDescField.value = data.data.descripcion || '';
                    extraActivoField.checked = (data.data.activo == 1);
                    
                    // 3. Mostrar el modal en modo "Editar"
                    modalTitulo.textContent = 'Editar Extra';
                    modalInstancia.show();
                } else {
                    alert(`Error al cargar datos: ${data.message}`);
                }
            } catch (error) {
                console.error('Error al cargar extra:', error);
                alert('Error de conexión.');
            }
        }

        // --- Botón ELIMINAR ---
        if (target.classList.contains('btn-eliminar')) {
            if (!confirm(`¿Estás seguro de que quieres eliminar el extra con ID ${id}?\n\nADVERTENCIA: No podrás eliminarlo si está asignado a productos.`)) {
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/extras/delete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: parseInt(id) })
                });

                const data = await response.json();

                if (data.success) {
                    alert('Extra eliminado');
                    cargarExtras(); // Recargar la tabla
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

    // Cargar extras al iniciar
    cargarExtras();

    // Botón "Crear Nuevo Extra"
    btnCrear.addEventListener('click', () => {
        form.reset(); // Limpiar el formulario
        extraIdField.value = ''; // Asegurarse de que no haya ID
        extraActivoField.checked = true; // Por defecto está activo
        modalTitulo.textContent = 'Crear Nuevo Extra';
        modalInstancia.show();
    });

    // Botón "Guardar" del modal
    btnGuardar.addEventListener('click', guardarExtra);

    // Listener en la tabla para los botones de Editar/Eliminar
    tbody.addEventListener('click', manejarAccionesTabla);

});