<?php
// /pizzeria_pos/api/controllers/ReportsController.php
require_once MODEL_PATH . '/Database.php';

class ReportsController
{
    public function getSales()
    {
        header('Content-Type: application/json');
        
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            $startDate = isset($data['start_date']) ? $data['start_date'] : date('Y-m-d');
            $endDate = isset($data['end_date']) ? $data['end_date'] : date('Y-m-d');

            $pdo = Database::getConnection();

            // 1. RESUMEN GENERAL
            $sql = "SELECT 
                        COUNT(id) as total_orders,
                        SUM(total) as total_sales
                    FROM orders 
                    WHERE status = 'COMPLETED' 
                    AND DATE(order_date) BETWEEN :start AND :end";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([':start' => $startDate, ':end' => $endDate]);
            $summary = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$summary['total_orders']) {
                $summary = ['total_orders' => 0, 'total_sales' => 0];
            }

            // 2. POR TIPO DE SERVICIO
            $sqlService = "SELECT service_type, COUNT(id) as qty, SUM(total) as total 
                           FROM orders 
                           WHERE status = 'COMPLETED' 
                           AND DATE(order_date) BETWEEN :start AND :end 
                           GROUP BY service_type";
            $stmtService = $pdo->prepare($sqlService);
            $stmtService->execute([':start' => $startDate, ':end' => $endDate]);
            $byService = $stmtService->fetchAll(PDO::FETCH_ASSOC);

            // 3. VENTAS POR CATEGORÍA
            $sqlCats = "SELECT 
                            c.name as category_name,
                            SUM(oi.quantity) as total_qty,
                            SUM(oi.unit_price * oi.quantity) as total_revenue
                        FROM order_items oi
                        JOIN orders o ON oi.order_id = o.id
                        JOIN products p ON oi.product_id = p.id
                        JOIN categories c ON p.category_id = c.id
                        WHERE o.status = 'COMPLETED' 
                        AND DATE(o.order_date) BETWEEN :start AND :end
                        GROUP BY c.name
                        ORDER BY total_revenue DESC";
            
            $stmtCats = $pdo->prepare($sqlCats);
            $stmtCats->execute([':start' => $startDate, ':end' => $endDate]);
            $byCategory = $stmtCats->fetchAll(PDO::FETCH_ASSOC);

            // 4. TOP 10 PRODUCTOS
            $sqlTop = "SELECT 
                        oi.name as product_name,
                        SUM(oi.quantity) as total_qty,
                        SUM(oi.unit_price * oi.quantity) as total_revenue
                       FROM order_items oi
                       JOIN orders o ON oi.order_id = o.id
                       WHERE o.status = 'COMPLETED'
                       AND DATE(o.order_date) BETWEEN :start AND :end
                       GROUP BY oi.name
                       ORDER BY total_qty DESC
                       LIMIT 10";

            $stmtTop = $pdo->prepare($sqlTop);
            $stmtTop->execute([':start' => $startDate, ':end' => $endDate]);
            $topProducts = $stmtTop->fetchAll(PDO::FETCH_ASSOC);

            // 5. NUEVO: VENTAS POR USUARIO
            // Unimos con la tabla 'users' para obtener el nombre
            $sqlUsers = "SELECT 
                            u.username,
                            COUNT(o.id) as total_orders,
                            SUM(o.total) as total_sales
                         FROM orders o
                         JOIN users u ON o.user_id = u.id
                         WHERE o.status = 'COMPLETED'
                         AND DATE(o.order_date) BETWEEN :start AND :end
                         GROUP BY u.username
                         ORDER BY total_sales DESC";

            $stmtUsers = $pdo->prepare($sqlUsers);
            $stmtUsers->execute([':start' => $startDate, ':end' => $endDate]);
            $byUser = $stmtUsers->fetchAll(PDO::FETCH_ASSOC);


            echo json_encode([
                'success' => true,
                'summary' => $summary,
                'by_service' => $byService,
                'by_category' => $byCategory,
                'top_products' => $topProducts,
                'by_user' => $byUser, // <--- Enviamos los datos nuevos
                'period' => ['start' => $startDate, 'end' => $endDate]
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}