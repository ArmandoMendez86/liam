<?php
// /pizzeria_pos/api/controllers/AuthController.php

require_once MODEL_PATH . '/Database.php';

class AuthController
{

    public function login()
    {
        // La API espera un body JSON, no datos de formulario POST
        $input = json_decode(file_get_contents('php://input'), true);
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';

        if (empty($username) || empty($password)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Faltan credenciales.']);
            return;
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT id, username, password_hash, role FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        // **IMPORTANTE**: password_verify verifica la contraseña contra el hash de la BD
        if ($user && password_verify($password, $user['password_hash'])) {
            // LOGIN EXITOSO: Crear la sesión en el servidor
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];

            echo json_encode([
                'success' => true,
                'message' => 'Login exitoso.',
                'user' => ['id' => $user['id'], 'username' => $user['username'], 'role' => $user['role']]
            ]);
        } else {
            http_response_code(401); // No autorizado
            echo json_encode(['success' => false, 'message' => 'Usuario o contraseña incorrectos.']);
        }
    }

    public function status()
    {
        if (isset($_SESSION['user_id'])) {
            echo json_encode([
                'logged_in' => true,
                'user' => ['id' => $_SESSION['user_id'], 'username' => $_SESSION['username'], 'role' => $_SESSION['role']]
            ]);
        } else {
            echo json_encode(['logged_in' => false]);
        }
    }

    public function logout()
    {
        // Asegúrate de que la sesión esté iniciada antes de destruirla
        if (session_status() == PHP_SESSION_NONE) {
            session_start();
        }

        // Destruir todas las variables de sesión y la cookie
        session_unset();
        session_destroy();

        echo json_encode(['success' => true, 'message' => 'Sesión cerrada.']);
    }
}
