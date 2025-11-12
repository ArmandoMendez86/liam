<?php
// /pizzeria_pos/api/controllers/ExtrasController.php

require_once MODEL_PATH . '/Database.php';

class ExtrasController
{

    /**
     * Obtener todos los extras (para el admin y el TPV)
     */
    public function list()
    {
        header('Content-Type: application/json');
        
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
            return;
        }

        try {
            $pdo = Database::getConnection();
            // Ordenamos por nombre
            $stmt = $pdo->prepare("SELECT * FROM extras ORDER BY nombre ASC");
            $stmt->execute();
            $extras = $stmt->fetchAll();
            
            echo json_encode(['success' => true, 'data' => $extras]);
            return;

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()]);
            return;
        }
    }

    /**
     * Obtener un extra por su ID (para el formulario de "Editar")
     */
    public function get()
    {
        header('Content-Type: application/json');

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
            return;
        }

        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID de extra inválido.']);
            return;
        }

        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("SELECT * FROM extras WHERE id = :id");
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            $extra = $stmt->fetch();

            if ($extra) {
                echo json_encode(['success' => true, 'data' => $extra]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Extra no encontrado.']);
            }
            return;

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()]);
            return;
        }
    }

    /**
     * Crear un nuevo extra
     */
    public function create()
    {
        header('Content-Type: application/json');
        
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $nombre = $input['nombre'] ?? '';
        $precio = (float)($input['precio'] ?? 0);
        $descripcion = $input['descripcion'] ?? null;
        $activo = (int)($input['activo'] ?? 1); // Activo por defecto

        if (empty($nombre) || $precio < 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El nombre y un precio válido son obligatorios.']);
            return;
        }

        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare(
                "INSERT INTO extras (nombre, precio, descripcion, activo) 
                 VALUES (:nombre, :precio, :descripcion, :activo)"
            );
            $stmt->bindParam(':nombre', $nombre);
            $stmt->bindParam(':precio', $precio);
            $stmt->bindParam(':descripcion', $descripcion);
            $stmt->bindParam(':activo', $activo, PDO::PARAM_INT);
            $stmt->execute();
            $newId = $pdo->lastInsertId();
            
            echo json_encode(['success' => true, 'message' => 'Extra creado.', 'new_id' => $newId]);
            return;

        } catch (Exception $e) {
             // (SQLite usa 23000 para violaciones de integridad como UNIQUE)
            if ($e->getCode() == 23000 || strpos($e->getMessage(), 'UNIQUE constraint') !== false) {
                http_response_code(409); // 409 Conflict
                echo json_encode(['success' => false, 'message' => 'Error: El nombre de ese extra ya existe.']);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()]);
            }
            return;
        }
    }

    /**
     * Actualizar un extra existente
     */
    public function update()
    {
        header('Content-Type: application/json');
        
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $id = (int)($input['id'] ?? 0);
        $nombre = $input['nombre'] ?? '';
        $precio = (float)($input['precio'] ?? 0);
        $descripcion = $input['descripcion'] ?? null;
        $activo = (int)($input['activo'] ?? 1);

        if (empty($nombre) || $id <= 0 || $precio < 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID, nombre y precio válido son obligatorios.']);
            return;
        }

        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare(
                "UPDATE extras SET nombre = :nombre, precio = :precio, descripcion = :descripcion, activo = :activo 
                 WHERE id = :id"
            );
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->bindParam(':nombre', $nombre);
            $stmt->bindParam(':precio', $precio);
            $stmt->bindParam(':descripcion', $descripcion);
            $stmt->bindParam(':activo', $activo, PDO::PARAM_INT);
            $stmt->execute();
            
            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'Extra actualizado.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'No se encontró el extra o no hubo cambios.']);
            }
            return;

        } catch (Exception $e) {
            if ($e->getCode() == 23000 || strpos($e->getMessage(), 'UNIQUE constraint') !== false) {
                http_response_code(409); // 409 Conflict
                echo json_encode(['success' => false, 'message' => 'Error: El nombre de ese extra ya existe.']);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()]);
            }
            return;
        }
    }

    /**
     * Eliminar un extra
     */
    public function delete()
    {
        header('Content-Type: application/json');
        
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $id = (int)($input['id'] ?? 0);

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID de extra inválido.']);
            return;
        }

        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("DELETE FROM extras WHERE id = :id");
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            
            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'Extra eliminado.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'No se encontró el extra.']);
            }
            return;

        } catch (Exception $e) {
            // Manejar error de restricción de clave foránea (FK)
            // (Si el extra está asignado a un producto en 'producto_extra')
            if ($e->getCode() == 23000 || strpos($e->getMessage(), 'FOREIGN KEY constraint') !== false) {
                http_response_code(409); // 409 Conflict
                echo json_encode(['success' => false, 'message' => 'Error: No se puede eliminar. Este extra está siendo usado por uno o más productos.']);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()]);
            }
            return;
        }
    }
}