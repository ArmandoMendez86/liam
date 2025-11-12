<?php
// /pizzeria_pos/api/controllers/OrderController.php

require_once MODEL_PATH . '/Database.php';

class OrderController
{

    /**
     * Registra un nuevo pedido en la base de datos y devuelve el ID.
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

        // 1. Extracción de datos
        if (!isset($input['total']) || !isset($input['items']) || empty($input['items'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Datos de pedido incompletos.']);
            return;
        }

        $total = (float)$input['total'];
        $subtotal = (float)$input['subtotal'];
        $discount_amount = (float)$input['discount_amount'];
        $service_type = $input['service_type'] ?? 'TO_GO';
        $status_to_save = $input['status'] ?? 'COMPLETED';
        $items = $input['items'];
        $user_id = 1;

        try {
            // --- ¡CAMBIO AQUÍ! (Paso 1 de 3) ---
            // Establece la zona horaria deseada.
            // Puedes cambiar 'America/Mexico_City' por la que necesites.
            $timezone = new DateTimeZone('America/Mexico_City');
            $now = new DateTime('now', $timezone);
            // Formatear la fecha para que sea compatible con SQLite (YYYY-MM-DD HH:MM:SS)
            $order_date_string = $now->format('Y-m-d H:i:s');
            // --- FIN DEL CAMBIO 1 ---


            $pdo = Database::getConnection();
            $pdo->beginTransaction();

            // --- ¡CAMBIO AQUÍ! (Paso 2 de 3) ---
            // Modificar la consulta SQL:
            // Se reemplaza 'datetime('now')' por el parámetro ':order_date'
            $stmt_order = $pdo->prepare("INSERT INTO orders (user_id, total, subtotal, discount, service_type, status, order_date) 
                                        VALUES (:user_id, :total, :subtotal, :discount, :service_type, :status_to_save, :order_date)");

            $stmt_order->bindParam(':user_id', $user_id);
            $stmt_order->bindParam(':total', $total);
            $stmt_order->bindParam(':subtotal', $subtotal);
            $stmt_order->bindParam(':discount', $discount_amount);
            $stmt_order->bindParam(':service_type', $service_type);
            $stmt_order->bindParam(':status_to_save', $status_to_save);

            // --- ¡CAMBIO AQUÍ! (Paso 3 de 3) ---
            // Enlazar el nuevo parámetro con la fecha que generamos
            $stmt_order->bindParam(':order_date', $order_date_string);
            // --- FIN DEL CAMBIO 3 ---

            $stmt_order->execute();

            $orderId = $pdo->lastInsertId();

            // 3. Insertar en la tabla order_items (Sin cambios esta parte)
            $stmt_item = $pdo->prepare("INSERT INTO order_items (order_id, product_id, name, quantity, unit_price, item_data) 
                                        VALUES (:order_id, :product_id, :name, :quantity, :unit_price, :item_data)");

            foreach ($items as $item) {
                // Serializar datos complejos (variante, extras, split)
                $itemData = json_encode([
                    'variant_name' => $item['variant_name'],
                    'extras' => $item['extras'] ?? [],
                    'is_split' => $item['is_split'] ?? false,
                    'split_details' => $item['split_details'] ?? null
                ]);

                $name = $item['name'];
                $product_id = $item['product_id'];
                $quantity = $item['quantity'];
                $unit_price = $item['price'];

                $stmt_item->bindParam(':order_id', $orderId);
                $stmt_item->bindParam(':product_id', $product_id);
                $stmt_item->bindParam(':name', $name);
                $stmt_item->bindParam(':quantity', $quantity);
                $stmt_item->bindParam(':unit_price', $unit_price);
                $stmt_item->bindParam(':item_data', $itemData);
                $stmt_item->execute();
            }

            $pdo->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Pedido registrado con éxito.',
                'order_id' => $orderId
            ]);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al registrar pedido: ' . $e->getMessage()]);
        }
    }

    /**
     * Finaliza (marca como COMPLETED) una orden PENDING.
     * Esto se llama cuando el cliente paga la cuenta.
     */
    public function complete()
    {
        header('Content-Type: application/json');

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $orderId = (int)($input['order_id'] ?? 0);

        if ($orderId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Falta el ID de la orden.']);
            return;
        }

        try {
            $pdo = Database::getConnection();

            // 1. Actualizar el estado de la orden
            $stmt = $pdo->prepare("UPDATE orders SET status = 'COMPLETED' WHERE id = :id AND status = 'PENDING'");
            $stmt->bindParam(':id', $orderId, PDO::PARAM_INT);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                // 2. Si se actualizó, obtener los datos de la orden completa para imprimir el ticket
                $orderData = $this->fetchOrderDataForPrinting($pdo, $orderId);

                echo json_encode([
                    'success' => true,
                    'message' => 'Orden marcada como pagada (COMPLETED).',
                    'order_data' => $orderData
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Orden no encontrada o ya estaba COMPLETED.']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()]);
        }
    }

    /**
     * Helper: Obtiene los datos completos del pedido para el ticket de VENTA.
     * Necesitas este helper ya que los datos originales del pedido no están en JS.
     */
    private function fetchOrderDataForPrinting($pdo, $orderId)
    {
        // --- 1. Obtener la cabecera de la orden ---
        // <-- CAMBIO AQUÍ: Añadimos 'order_date' al SELECT
        $stmt_order = $pdo->prepare("SELECT total, subtotal, discount, service_type, order_date 
                                     FROM orders 
                                     WHERE id = :id");
        $stmt_order->bindParam(':id', $orderId, PDO::PARAM_INT);
        $stmt_order->execute();
        $order = $stmt_order->fetch(PDO::FETCH_ASSOC);

        if (!$order) return null;

        // --- 2. Obtener los ítems de la orden ---
        $stmt_items = $pdo->prepare("SELECT product_id, name, quantity, unit_price AS price, item_data 
                                      FROM order_items 
                                      WHERE order_id = :order_id");
        $stmt_items->bindParam(':order_id', $orderId, PDO::PARAM_INT);
        $stmt_items->execute();
        $items = $stmt_items->fetchAll(PDO::FETCH_ASSOC);

        // Deserializar item_data para construir el objeto cartItem completo
        $cartItems = array_map(function ($item) {
            $data = json_decode($item['item_data'], true);
            unset($item['item_data']); // remover el string JSON

            // Estructura que JS usará
            return [
                'product_id' => (int)$item['product_id'],
                'name' => $item['name'],
                'quantity' => (int)$item['quantity'],
                'price' => (float)$item['price'],
                'variant_name' => $data['variant_name'] ?? '',
                'extras' => $data['extras'] ?? [],
                'is_split' => $data['is_split'] ?? false,
                'split_details' => $data['split_details'] ?? null
            ];
        }, $items);


        // --- 3. Combinar y devolver ---
        return [
            'order_id' => $orderId,
            'subtotal' => (float)$order['subtotal'],
            'discount_amount' => (float)$order['discount'],
            'total' => (float)$order['total'],
            'service_type' => $order['service_type'],
            'items' => $cartItems,
            'order_date' => $order['order_date'] // <-- CAMBIO AQUÍ: Añadimos la fecha al objeto
        ];
    }

    /**
     * Devuelve una lista de órdenes con estado 'PENDING'.
     */
    public function getPendingOrders()
    {
        header('Content-Type: application/json');

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
            return;
        }

        try {
            $pdo = Database::getConnection();

            // Seleccionamos los datos básicos necesarios para la interfaz.
            $stmt = $pdo->prepare("SELECT id, total, service_type, order_date FROM orders WHERE status = 'PENDING' ORDER BY order_date ASC");
            $stmt->execute();
            $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $orders
            ]);
            return; // <--- ESTO ES CRUCIAL: TERMINA LA EJECUCIÓN DEL SCRIPT.

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()]);
            return;
        }
    }

    public function getOrderById()
    {
        header('Content-Type: application/json');

        // 1. Usar GET y un parámetro de URL (ej. .../orders/get?id=123)
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
            return;
        }

        $orderId = (int)($_GET['id'] ?? 0);

        if ($orderId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Falta el ID de la orden.']);
            return;
        }

        try {
            $pdo = Database::getConnection();

            // 2. Reutilizamos el helper que creamos para complete()
            $orderData = $this->fetchOrderDataForPrinting($pdo, $orderId);

            if ($orderData) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Orden encontrada.',
                    'order_data' => $orderData
                ]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Orden no encontrada.']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()]);
        }
    }

    public function cancel()
    {
        header('Content-Type: application/json');

        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
            return; // <--- ¡AÑADIDO!
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $orderId = (int)($input['order_id'] ?? 0);

        if ($orderId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Falta el ID de la orden.']);
            return; // <--- ¡AÑADIDO!
        }

        try {
            $pdo = Database::getConnection();

            // Esta consulta anula la orden, sin importar si estaba PENDING o COMPLETED,
            // siempre y cuando no esté ya CANCELLED.
            $stmt = $pdo->prepare("UPDATE orders 
                                  SET status = 'CANCELLED' 
                                  WHERE id = :id AND status != 'CANCELLED'");

            $stmt->bindParam(':id', $orderId, PDO::PARAM_INT);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Orden #' . $orderId . ' ha sido ANULADA.'
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Orden no encontrada o ya estaba anulada.'
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()]);
        }

        return; // <--- ¡AÑADIDO! Esta era la línea que faltaba.
    }
}
