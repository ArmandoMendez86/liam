<?php
// /pizzeria_pos/api/controllers/ProductController.php

require_once MODEL_PATH . '/Database.php';

class ProductController
{

    /**
     * Obtiene el menú completo (Categorías, Productos, Variantes y Extras) 
     * y lo devuelve en una estructura anidada JSON.
     */
    public function list()
    {
        try {
            $pdo = Database::getConnection();

            // 1. Obtener todas las categorías
            $stmt_categories = $pdo->query("SELECT id, name FROM categories ORDER BY sort_order");
            $categories = $stmt_categories->fetchAll();

            // 2. Obtener todos los productos base
            $stmt_products = $pdo->query("SELECT id, category_id, name, description FROM products");
            $products = $stmt_products->fetchAll();

            // 3. Obtener todas las variantes (precios y opciones)
            $stmt_variants = $pdo->query("SELECT id, product_id, name, price, is_default FROM product_variants");
            $variants = $stmt_variants->fetchAll();

            // 4. Obtener todos los extras disponibles para CADA PRODUCTO (NUEVO JOIN)
            $sql_extras = "
                SELECT 
                    pe.producto_id,
                    e.id, 
                    e.nombre AS name, 
                    e.precio AS price
                FROM producto_extra pe
                JOIN extras e ON pe.extra_id = e.id
                WHERE e.activo = 1
            ";
            $stmt_extras = $pdo->query($sql_extras);
            $all_product_extras = $stmt_extras->fetchAll();


            // 5. Estructurar el menú (Anidación)
            $menu = [];
            $products_map = []; // Usamos un mapa para la reconstrucción

            // Mapear variantes y extras a sus productos
            foreach ($products as $product) {
                $product['variants'] = [];
                $product['extras'] = []; // Inicializar array de extras (NUEVO)
                $products_map[$product['id']] = $product;
            }

            foreach ($variants as $variant) {
                $products_map[$variant['product_id']]['variants'][] = $variant;
            }

            // Añadir extras a los productos correspondientes (NUEVO)
            foreach ($all_product_extras as $extra) {
                $products_map[$extra['producto_id']]['extras'][] = [
                    'id' => $extra['id'],
                    'name' => $extra['name'],
                    'price' => $extra['price']
                ];
            }

            // Agrupar productos por categoría
            foreach ($categories as $category) {
                $category['products'] = array_filter($products_map, function ($product) use ($category) {
                    return $product['category_id'] === $category['id'];
                });
                $category['products'] = array_values($category['products']);
                $menu[] = $category;
            }

            echo json_encode([
                'success' => true,
                'data' => $menu
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error al cargar el menú: ' . $e->getMessage()
            ]);
        }
    }
}
