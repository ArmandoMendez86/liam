<?php
// /pizzeria_pos/api/controllers/DiscountController.php

require_once MODEL_PATH . '/Database.php';

class DiscountController {
    
    /**
     * Aplica y calcula el descuento en base al código y el subtotal.
     */
    public function apply() {
        header('Content-Type: application/json');

        // Solo permitir POST
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $code = trim($input['code']);
        $subtotal = (float)($input['subtotal']);

        if (empty($code)) {
            echo json_encode(['success' => false, 'message' => 'El código no puede estar vacío.']);
            return;
        }

        try {
            $pdo = Database::getConnection();

            $stmt = $pdo->prepare("SELECT codigo, tipo, valor, minimo_pedido FROM descuentos WHERE codigo = :code AND activo = 1");
            $stmt->bindParam(':code', $code);
            $stmt->execute();
            $discount = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$discount) {
                http_response_code(200);
                echo json_encode(['success' => false, 'message' => 'Código de descuento inválido.']);
                return;
            }

            // Aplicar reglas de validación
            if ($subtotal < (float)$discount['minimo_pedido']) {
                http_response_code(200);
                echo json_encode(['success' => false, 'message' => 'El pedido no alcanza el mínimo de ' . (float)$discount['minimo_pedido']]);
                return;
            }

            $discountAmount = 0;
            $valor = (float)$discount['valor'];

            if ($discount['tipo'] === 'PORCENTAJE') {
                $discountAmount = $subtotal * ($valor / 100);
            } elseif ($discount['tipo'] === 'MONTO_FIJO') {
                $discountAmount = $valor;
            }
            
            // Aseguramos que el descuento no exceda el subtotal
            $discountAmount = min($discountAmount, $subtotal);

            echo json_encode([
                'success' => true,
                'discount_applied' => [
                    'code' => $discount['codigo'],
                    'value' => round($discountAmount, 2), // Monto en MXN
                    'type' => $discount['tipo']
                ]
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()]);
        }
    }
}