<?php
// /pizzeria_pos/api/controllers/CategoryController.php

require_once MODEL_PATH . '/Database.php';

class CategoryController
{

    /**
     * Obtener todas las categorías (para el admin y el TPV)
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
            $stmt = $pdo->prepare("SELECT * FROM categories ORDER BY sort_order ASC, name ASC");
            $stmt->execute();
            $categories = $stmt->fetchAll();
            
            echo json_encode(['success' => true, 'data' => $categories]);
            return;

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()]);
            return;
        }
    }

    /**
     * Obtener una categoría por su ID (para el formulario de "Editar")
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
            echo json_encode(['success' => false, 'message' => 'ID de categoría inválido.']);
            return;
        }

        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("SELECT * FROM categories WHERE id = :id");
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            $category = $stmt->fetch();

            if ($category) {
                echo json_encode(['success' => true, 'data' => $category]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Categoría no encontrada.']);
            }
            return;

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()]);
            return;
        }
    }

    /**
     * Crear una nueva categoría
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
        $name = $input['name'] ?? '';
        $sort_order = (int)($input['sort_order'] ?? 0);

        if (empty($name)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El nombre es obligatorio.']);
            return;
        }

        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("INSERT INTO categories (name, sort_order) VALUES (:name, :sort_order)");
            $stmt->bindParam(':name', $name);
            $stmt->bindParam(':sort_order', $sort_order, PDO::PARAM_INT);
            $stmt->execute();
            $newId = $pdo->lastInsertId();
            
            echo json_encode(['success' => true, 'message' => 'Categoría creada.', 'new_id' => $newId]);
            return;

        } catch (Exception $e) {
            // Manejar error de duplicado (UNIQUE)
            if ($e->getCode() == 23000 || strpos($e->getMessage(), 'UNIQUE constraint') !== false) {
                http_response_code(409); // 409 Conflict
                echo json_encode(['success' => false, 'message' => 'Error: El nombre de esa categoría ya existe.']);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()]);
            }
            return;
        }
    }

    /**
     * Actualizar una categoría existente
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
        $name = $input['name'] ?? '';
        $sort_order = (int)($input['sort_order'] ?? 0);

        if (empty($name) || $id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El ID y el nombre son obligatorios.']);
            return;
        }

        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("UPDATE categories SET name = :name, sort_order = :sort_order WHERE id = :id");
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->bindParam(':name', $name);
            $stmt->bindParam(':sort_order', $sort_order, PDO::PARAM_INT);
            $stmt->execute();
            
            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'Categoría actualizada.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'No se encontró la categoría o no hubo cambios.']);
            }
            return;

        } catch (Exception $e) {
            // Manejar error de duplicado (UNIQUE)
            if ($e->getCode() == 23000 || strpos($e->getMessage(), 'UNIQUE constraint') !== false) {
                http_response_code(409); // 409 Conflict
                echo json_encode(['success' => false, 'message' => 'Error: El nombre de esa categoría ya existe.']);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()]);
            }
            return;
        }
    }

    /**
     * Eliminar una categoría
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
            echo json_encode(['success' => false, 'message' => 'ID de categoría inválido.']);
            return;
        }

        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("DELETE FROM categories WHERE id = :id");
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            
            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'Categoría eliminada.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'No se encontró la categoría.']);
            }
            return;

        } catch (Exception $e) {
            // Manejar error de restricción de clave foránea (FK)
            if ($e->getCode() == 23000 || strpos($e->getMessage(), 'FOREIGN KEY constraint') !== false) {
                http_response_code(409); // 409 Conflict
                echo json_encode(['success' => false, 'message' => 'Error: No se puede eliminar. Hay productos asignados a esta categoría.']);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()]);
            }
            return;
        }
    }
}