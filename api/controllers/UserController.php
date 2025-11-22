<?php
// /pizzeria_pos/api/controllers/UserController.php
require_once MODEL_PATH . '/Database.php';

class UserController
{
    public function list()
    {
        try {
            $pdo = Database::getConnection();
            // CORRECCIÓN: Usamos 'last_updated_at' en lugar de 'created_at'
            $stmt = $pdo->query("SELECT id, username, role, last_updated_at, is_active FROM users WHERE is_active = 1 ORDER BY id ASC");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $users]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function get()
    {
        try {
            if (!isset($_GET['id'])) throw new Exception("ID requerido");
            
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("SELECT id, username, role FROM users WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user) {
                echo json_encode(['success' => true, 'data' => $user]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function create()
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['username']) || empty($data['password']) || empty($data['role'])) {
                throw new Exception("Datos incompletos.");
            }

            $pdo = Database::getConnection();

            // Verificar duplicados
            $check = $pdo->prepare("SELECT id FROM users WHERE username = ?");
            $check->execute([$data['username']]);
            if ($check->fetch()) throw new Exception("El usuario ya existe.");

            // Hashear password
            $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);

            // CORRECCIÓN: Insertamos en 'password_hash'
            $stmt = $pdo->prepare("INSERT INTO users (username, password_hash, role, is_active) VALUES (?, ?, ?, 1)");
            $stmt->execute([$data['username'], $hashedPassword, $data['role']]);

            echo json_encode(['success' => true, 'message' => 'Usuario creado exitosamente']);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function update()
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['id']) || empty($data['username']) || empty($data['role'])) {
                throw new Exception("Datos incompletos.");
            }

            $pdo = Database::getConnection();

            // Si envió password nuevo, lo actualizamos. Si no, solo nombre y rol.
            if (!empty($data['password'])) {
                $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
                // CORRECCIÓN: Actualizamos 'password_hash'
                $sql = "UPDATE users SET username = ?, password_hash = ?, role = ? WHERE id = ?";
                $params = [$data['username'], $hashedPassword, $data['role'], $data['id']];
            } else {
                $sql = "UPDATE users SET username = ?, role = ? WHERE id = ?";
                $params = [$data['username'], $data['role'], $data['id']];
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            echo json_encode(['success' => true, 'message' => 'Usuario actualizado']);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function delete()
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['id'])) throw new Exception("ID requerido");

            // Protección: No borrar al admin principal (ID 1)
            // (En tu DB el admin parece tener ID alto, pero ajusta esto si tu admin principal siempre es el 1 o tiene un nombre específico)
            if ($data['id'] == 1) { 
                 throw new Exception("No puedes eliminar al usuario principal."); 
            }

            $pdo = Database::getConnection();
            // CORRECCIÓN: Soft Delete (Desactivar en vez de borrar) es más seguro para mantener historial de ventas
            // Pero si prefieres borrar físico: "DELETE FROM users WHERE id = ?"
            // Usaremos DELETE físico para simplificar CRUD, ya que tu tabla tiene is_active pero podemos borrar si no hay integridad referencial estricta que lo impida.
            // Para evitar errores con órdenes pasadas, lo mejor es poner is_active = 0
            
            $stmt = $pdo->prepare("UPDATE users SET is_active = 0 WHERE id = ?");
            $stmt->execute([$data['id']]);

            echo json_encode(['success' => true, 'message' => 'Usuario desactivado correctamente']);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}