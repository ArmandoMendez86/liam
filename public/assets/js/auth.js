// /pizzeria_pos/public/assets/js/auth.js

const API_BASE_URL = '../api/index.php'; // Ajusta la ruta a tu API

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const messageArea = document.getElementById('message-area');

    // 1. Verificar si ya hay sesión al cargar login.html
    fetch(`${API_BASE_URL}/auth/status`)
        .then(res => res.json())
        .then(data => {
            if (data.logged_in) {
                // Si ya está logueado, redirigir al POS
                window.location.href = 'pos.html';
            }
        });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageArea.textContent = '';

        const username = form.username.value;
        const password = form.password.value;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                // Enviar los datos como JSON
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                // Login exitoso
                messageArea.style.color = 'green';
                messageArea.textContent = '¡Bienvenido!';

                // --- INICIO: Lógica de Redirección por Rol ---
                const userRole = data.user.role;
                let redirectUrl = 'pos.html'; // URL por defecto

                if (userRole === 'admin' || userRole === 'manager') {
                    // Si es admin o manager, puedes enviarlo a reportes o mantenerlo en pos.html
                    // Por ahora, todos van a pos.html para la interfaz de venta
                    redirectUrl = 'pos.html';
                } else if (userRole === 'cashier') {
                    // Si el rol es 'cashier', también redirigir al punto de venta.
                    redirectUrl = 'pos.html';
                }

                // Redirigir
                window.location.href = redirectUrl;
                // --- FIN: Lógica de Redirección por Rol ---

            } else {
                // Login fallido: Mostrar mensaje de error del servidor
                messageArea.style.color = 'red';
                messageArea.textContent = data.message || 'Error de credenciales.';
            }
        } catch (error) {
            console.error('Error de conexión:', error);
            messageArea.style.color = 'red';
            messageArea.textContent = 'Error al intentar conectar con el servidor.';
        }
    });
});