// /pizzeria_pos/public/assets/js/usuarios.js

const API_BASE_URL = '../../api/index.php';
let usuariosModal;

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar el modal de Bootstrap
    usuariosModal = new bootstrap.Modal(document.getElementById('modalUsuario'));
    
    // Cargar la lista al abrir
    loadUsuarios();

    // Listeners de botones
    document.getElementById('btn-crear-usuario').addEventListener('click', () => {
        openModal();
    });

    document.getElementById('btn-guardar').addEventListener('click', saveUsuario);
});

async function loadUsuarios() {
    const tbody = document.getElementById('usuarios-tbody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Cargando...</td></tr>';

    try {
        const response = await fetch(`${API_BASE_URL}/users/list`);
        const result = await response.json();

        if (result.success) {
            renderTable(result.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${result.message}</td></tr>`;
        }
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error de conexión</td></tr>';
    }
}

function renderTable(users) {
    const tbody = document.getElementById('usuarios-tbody');
    tbody.innerHTML = '';

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay usuarios registrados.</td></tr>';
        return;
    }

    users.forEach(user => {
        const roleBadge = user.role === 'admin' 
            ? '<span class="badge bg-danger">Administrador</span>' 
            : '<span class="badge bg-success">Cajero</span>';
        
        // CORRECCIÓN: Usamos last_updated_at
        const dateStr = user.last_updated_at 
            ? new Date(user.last_updated_at.replace(' ', 'T')).toLocaleDateString() 
            : '-';

        tbody.innerHTML += `
            <tr>
                <td>${user.id}</td>
                <td class="fw-bold">${user.username}</td>
                <td>${roleBadge}</td>
                <td>${dateStr}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary btn-accion" onclick="editUsuario(${user.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger btn-accion" onclick="deleteUsuario(${user.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function openModal(user = null) {
    const title = document.getElementById('modal-titulo');
    const helpText = document.getElementById('password-help');
    const passwordInput = document.getElementById('usuario-password');

    if (user) {
        // MODO EDICIÓN
        document.getElementById('usuario-id').value = user.id;
        document.getElementById('usuario-nombre').value = user.username;
        document.getElementById('usuario-role').value = user.role;
        passwordInput.value = ''; // Limpiar campo pass
        passwordInput.required = false; // No obligatoria al editar
        
        title.textContent = 'Editar Usuario';
        helpText.classList.remove('d-none'); // Mostrar aviso
    } else {
        // MODO CREAR
        document.getElementById('usuario-form').reset();
        document.getElementById('usuario-id').value = '';
        passwordInput.required = true; // Obligatoria al crear

        title.textContent = 'Nuevo Usuario';
        helpText.classList.add('d-none');
    }
    usuariosModal.show();
}

// Función global para el onclick del HTML
window.editUsuario = async function(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/get?id=${id}`);
        const result = await response.json();
        if (result.success) {
            openModal(result.data);
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        alert('Error al obtener datos');
    }
};

// Función global para el onclick del HTML
window.deleteUsuario = async function(id) {
    if (!confirm('¿Estás seguro de desactivar este usuario?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/users/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });

        const result = await response.json();
        if (result.success) {
            loadUsuarios();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        alert('Error al eliminar usuario');
    }
};

async function saveUsuario() {
    const id = document.getElementById('usuario-id').value;
    const username = document.getElementById('usuario-nombre').value;
    const role = document.getElementById('usuario-role').value;
    const password = document.getElementById('usuario-password').value;

    if (!username || (!id && !password)) {
        alert('Completa los campos obligatorios.');
        return;
    }

    const endpoint = id ? 'update' : 'create';
    const payload = { id, username, role, password };

    try {
        const response = await fetch(`${API_BASE_URL}/users/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            usuariosModal.hide();
            loadUsuarios();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error(error);
        alert('Error al guardar.');
    }
}