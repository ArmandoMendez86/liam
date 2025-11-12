<?php
// /pizzeria_pos/api/controllers/ProductController.php

require_once MODEL_PATH . '/Database.php';

class ProductController
{
    /**
     * MÉTODO PARA EL TPV (pos.js)
     * Obtiene el menú completo, formateado para el TPV (pos.js).
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

            // 1. Obtener todas las categorías
            $stmt_cats = $pdo->query("SELECT * FROM categories ORDER BY sort_order ASC, name ASC");
            $categories = $stmt_cats->fetchAll(PDO::FETCH_ASSOC);

            // 2. Obtener todos los productos
            $stmt_prods = $pdo->query("SELECT * FROM products");
            $products = $stmt_prods->fetchAll(PDO::FETCH_ASSOC);

            // 3. Obtener todas las variantes de producto
            $stmt_vars = $pdo->query("SELECT * FROM product_variants ORDER BY id ASC");
            $variants = $stmt_vars->fetchAll(PDO::FETCH_GROUP | PDO::FETCH_ASSOC); // Agrupadas por product_id

            // 4. Obtener todos los extras activos
            $stmt_extras_all = $pdo->query("SELECT * FROM extras WHERE activo = 1 ORDER BY nombre ASC");
            $all_extras_list = $stmt_extras_all->fetchAll(PDO::FETCH_ASSOC);
            
            // 5. Obtener las relaciones producto <-> extra
            // (La agrupación por defecto usará la primera columna, 'producto_id', lo cual es correcto)
            $stmt_rel = $pdo->query("SELECT * FROM producto_extra");
            $extra_relations = $stmt_rel->fetchAll(PDO::FETCH_GROUP | PDO::FETCH_ASSOC); // Agrupadas por producto_id

            // 6. Construir el JSON final
            $menu_structure = [];
            foreach ($categories as $category) {
                $cat_id = $category['id'];
                $category_data = $category;
                $category_data['products'] = [];

                foreach ($products as $product) {
                    if ($product['category_id'] == $cat_id) {
                        $prod_id = $product['id'];
                        $product_data = $product;

                        // Adjuntar variantes
                        $product_data['variants'] = $variants[$prod_id] ?? [];

                        // Adjuntar extras
                        $product_data['extras'] = [];
                        if (isset($extra_relations[$prod_id])) {
                            $linked_extra_ids = array_column($extra_relations[$prod_id], 'extra_id');
                            // Mapear IDs a los datos completos de los extras
                            foreach ($all_extras_list as $extra) {
                                if (in_array($extra['id'], $linked_extra_ids)) {
                                    $product_data['extras'][] = $extra;
                                }
                            }
                        }
                        
                        $category_data['products'][] = $product_data;
                    }
                }
                $menu_structure[] = $category_data;
            }

            echo json_encode(['success' => true, 'data' => $menu_structure]);
            return;

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()]);
            return;
        }
    }


    // --- INICIO DE MÉTODOS PARA EL PANEL DE ADMINISTRACIÓN ---

    /**
     * ADMIN: Obtener la lista simple de productos para el admin
     */
    public function adminList()
    {
        header('Content-Type: application/json');
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
            return;
        }
        
        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->query(
                "SELECT p.id, p.name, p.description, c.name as category_name 
                 FROM products p
                 JOIN categories c ON p.category_id = c.id
                 ORDER BY c.sort_order, p.name ASC"
            );
            $products = $stmt->fetchAll();
            echo json_encode(['success' => true, 'data' => $products]);
            return;

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()]);
            return;
        }
    }

    /**
     * ADMIN: Obtener los datos completos de UN producto para editar
     */
    public function get()
    {
        header('Content-Type: application/json');
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID de producto inválido.']);
            return;
        }

        try {
            $pdo = Database::getConnection();
            
            // 1. Datos del producto
            $stmt_prod = $pdo->prepare("SELECT * FROM products WHERE id = :id");
            $stmt_prod->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt_prod->execute();
            $details = $stmt_prod->fetch();

            if (!$details) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Producto no encontrado.']);
                return;
            }

            // 2. Variantes del producto (Usa 'product_id')
            $stmt_vars = $pdo->prepare("SELECT * FROM product_variants WHERE product_id = :id ORDER BY id ASC");
            $stmt_vars->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt_vars->execute();
            $variants = $stmt_vars->fetchAll();

            // 3. IDs de Extras asignados (Usa 'producto_id')
            // --- ¡CAMBIO AQUÍ! ---
            $stmt_extras = $pdo->prepare("SELECT extra_id FROM producto_extra WHERE producto_id = :id");
            // --- FIN DEL CAMBIO ---
            $stmt_extras->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt_extras->execute();
            $extra_ids = $stmt_extras->fetchAll(PDO::FETCH_COLUMN);

            echo json_encode([
                'success' => true,
                'data' => [
                    'details' => $details,
                    'variants' => $variants,
                    'extras' => $extra_ids
                ]
            ]);
            return;

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()]);
            return;
        }
    }

    /**
     * ADMIN: Crear un nuevo producto, sus variantes y sus extras (Transaccional)
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
        
        $name = $input['name'] ?? null;
        $description = $input['description'] ?? null;
        $category_id = (int)($input['category_id'] ?? 0);
        $variants = $input['variants'] ?? []; // Array de {name, price, is_default}
        $extras = $input['extras'] ?? []; // Array de [1, 2, 5] (IDs de extras)

        if (!$name || !$category_id || empty($variants)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Nombre, categoría y al menos una variante son obligatorios.']);
            return;
        }

        $pdo = Database::getConnection();
        
        try {
            $pdo->beginTransaction();

            // 1. Insertar el producto principal
            $stmt_prod = $pdo->prepare(
                "INSERT INTO products (name, description, category_id) 
                 VALUES (:name, :description, :category_id)"
            );
            $stmt_prod->execute([
                ':name' => $name,
                ':description' => $description,
                ':category_id' => $category_id
            ]);
            $productId = $pdo->lastInsertId();

            // 2. Insertar las variantes (Usa 'product_id')
            $stmt_var = $pdo->prepare(
                "INSERT INTO product_variants (product_id, name, price, is_default) 
                 VALUES (:product_id, :name, :price, :is_default)"
            );
            foreach ($variants as $variant) {
                $stmt_var->execute([
                    ':product_id' => $productId,
                    ':name' => $variant['name'],
                    ':price' => (float)$variant['price'],
                    ':is_default' => (int)$variant['is_default']
                ]);
            }

            // 3. Insertar los links de extras (Usa 'producto_id')
            // --- ¡CAMBIO AQUÍ! ---
            $stmt_extra = $pdo->prepare("INSERT INTO producto_extra (producto_id, extra_id) VALUES (:producto_id, :extra_id)");
            foreach ($extras as $extra_id) {
                $stmt_extra->execute([
                    ':producto_id' => $productId, // <-- Corregido
                    ':extra_id' => (int)$extra_id
                ]);
            }

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Producto creado con éxito.', 'new_id' => $productId]);
            return;

        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()]);
            return;
        }
    }

    /**
     * ADMIN: Actualizar un producto, sus variantes y sus extras (Transaccional)
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
        $name = $input['name'] ?? null;
        $description = $input['description'] ?? null;
        $category_id = (int)($input['category_id'] ?? 0);
        $variants = $input['variants'] ?? []; // Array de {name, price, is_default}
        $extras = $input['extras'] ?? []; // Array de [1, 2, 5] (IDs de extras)

        if (!$id || !$name || !$category_id || empty($variants)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID, nombre, categoría y al menos una variante son obligatorios.']);
            return;
        }
        
        $pdo = Database::getConnection();

        try {
            $pdo->beginTransaction();

            // 1. Actualizar el producto principal
            $stmt_prod = $pdo->prepare(
                "UPDATE products SET name = :name, description = :description, category_id = :category_id 
                 WHERE id = :id"
            );
            $stmt_prod->execute([
                ':id' => $id,
                ':name' => $name,
                ':description' => $description,
                ':category_id' => $category_id
            ]);

            // 2. Reemplazar Variantes (Usa 'product_id')
            $pdo->prepare("DELETE FROM product_variants WHERE product_id = :id")->execute([':id' => $id]);
            
            $stmt_var = $pdo->prepare(
                "INSERT INTO product_variants (product_id, name, price, is_default) 
                 VALUES (:product_id, :name, :price, :is_default)"
            );
            foreach ($variants as $variant) {
                $stmt_var->execute([
                    ':product_id' => $id,
                    ':name' => $variant['name'],
                    ':price' => (float)$variant['price'],
                    ':is_default' => (int)$variant['is_default']
                ]);
            }

            // 3. Reemplazar Extras (Usa 'producto_id')
            // --- ¡CAMBIO AQUÍ! ---
            $pdo->prepare("DELETE FROM producto_extra WHERE producto_id = :id")->execute([':id' => $id]);
            
            $stmt_extra = $pdo->prepare("INSERT INTO producto_extra (producto_id, extra_id) VALUES (:producto_id, :extra_id)");
            foreach ($extras as $extra_id) {
                $stmt_extra->execute([
                    ':producto_id' => $id, // <-- Corregido
                    ':extra_id' => (int)$extra_id
                ]);
            }
            // --- FIN DEL CAMBIO ---

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Producto actualizado con éxito.']);
            return;

        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()]);
            return;
        }
    }

    /**
     * ADMIN: Eliminar un producto (y sus variantes/extras por FK)
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
            echo json_encode(['success' => false, 'message' => 'ID de producto inválido.']);
            return;
        }

        try {
            $pdo = Database::getConnection();
            
            // Asumiendo que tus FK tienen 'ON DELETE CASCADE' (como en el schema que te di)
            // Si no lo tuvieran, necesitaríamos borrar manualmente.
            
            // Borrado manual por si acaso (no hace daño si ON DELETE CASCADE está activo)
            
            // 2. Borrar de product_variants (Usa 'product_id')
            $pdo->prepare("DELETE FROM product_variants WHERE product_id = :id")->execute([':id' => $id]);
            
            // 3. Borrar de producto_extra (Usa 'producto_id')
            // --- ¡CAMBIO AQUÍ! ---
            $pdo->prepare("DELETE FROM producto_extra WHERE producto_id = :id")->execute([':id' => $id]);
            // --- FIN DEL CAMBIO ---

            // 4. Borrar el producto principal
            $stmt = $pdo->prepare("DELETE FROM products WHERE id = :id");
            $stmt->execute([':id' => $id]);

            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'Producto eliminado.']);
            } else {
                echo json_encode(['success' => false, 'message' => 'No se encontró el producto.']);
            }
            return;

        } catch (Exception $e) {
             if ($e->getCode() == 23000 || strpos($e->getMessage(), 'FOREIGN KEY constraint') !== false) {
                http_response_code(409); // 409 Conflict
                echo json_encode(['success' => false, 'message' => 'Error: No se puede eliminar. Este producto ya existe en órdenes de venta.']);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()]);
            }
            return;
        }
    }
}