<?php
// /pizzeria_pos/api/index.php

// Cargar la configuración y definir que la respuesta será JSON
require_once dirname(__DIR__) . '../config.php';
header('Content-Type: application/json');

// Incluir controladores (ajusta las rutas según sea necesario)
require_once CONTROLLER_PATH . '/AuthController.php';
require_once CONTROLLER_PATH . '/PosController.php';
require_once CONTROLLER_PATH . '/DiscountController.php';
require_once CONTROLLER_PATH . '/OrderController.php';
require_once CONTROLLER_PATH . '/CategoryController.php';
require_once CONTROLLER_PATH . '/ExtrasController.php';
require_once CONTROLLER_PATH . '/ProductController.php';


// ----------------------------------------------------
// LÓGICA DE RUTEO SIMPLE
// Ejemplo de URL: /api/index.php/auth/login
// ----------------------------------------------------
$uri = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$parts = explode('/', $uri);

// Buscar el índice de 'index.php' o 'api' en la URL
$base_index = array_search('index.php', $parts) ?: array_search('api', $parts);

if ($base_index === false || !isset($parts[$base_index + 1])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Ruta de API base inválida']);
    exit;
}

$controller_name = $parts[$base_index + 1]; // Ej: 'auth'
$method_name = $parts[$base_index + 2] ?? 'index'; // Ej: 'login'

try {
    switch ($controller_name) {
        case 'auth':
            $controller = new AuthController();
            if ($method_name === 'login') {
                $controller->login();
            } elseif ($method_name === 'logout') {
                $controller->logout();
            } elseif ($method_name === 'status') {
                // Endpoint para que JS verifique si hay sesión
                $controller->status();
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Endpoint de Auth no encontrado']);
            }
            break;
        case 'pos':
            $controller = new PosController();
            if ($method_name === 'list') {
                $controller->list();
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Endpoint de Products no encontrado']);
            }
            break;
        case 'products':
            $controller = new ProductController();
            if ($method_name === 'list') {
                $controller->list(); // Para el TPV (pos.js)
            } elseif ($method_name === 'adminList') {
                $controller->adminList(); // Para el Admin
            } elseif ($method_name === 'get') {
                $controller->get(); // Para el Admin
            } elseif ($method_name === 'create') {
                $controller->create(); // Para el Admin
            } elseif ($method_name === 'update') {
                $controller->update(); // Para el Admin
            } elseif ($method_name === 'delete') {
                $controller->delete(); // Para el Admin
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Endpoint de Products no encontrado']);
            }
            break;
        case 'discounts':
            $controller = new DiscountController();

            if ($method_name === 'apply') {
                $controller->apply();
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Endpoint de Discounts no encontrado']);
            }
            break;
        case 'orders':
            $controller = new OrderController();
            if ($method_name === 'create') {
                $controller->create();
            } elseif ($method_name === 'complete') {
                $controller->complete();
            } elseif ($method_name === 'pending') {
                $controller->getPendingOrders();
            } elseif ($method_name === 'get') {
                $controller->getOrderById();
            } elseif ($method_name === 'cancel') {
                $controller->cancel();
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Endpoint de Orders no encontrado']);
            }
            break;
        case 'categories':
            $controller = new CategoryController();
            if ($method_name === 'list') {
                $controller->list(); // GET /api/categories/list
            } elseif ($method_name === 'get') {
                $controller->get(); // GET /api/categories/get?id=1
            } elseif ($method_name === 'create') {
                $controller->create(); // POST /api/categories/create
            } elseif ($method_name === 'update') {
                $controller->update(); // POST /api/categories/update
            } elseif ($method_name === 'delete') {
                $controller->delete(); // POST /api/categories/delete
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Endpoint de Categories no encontrado']);
            }
            break;
        case 'extras':
            $controller = new ExtrasController();
            if ($method_name === 'list') {
                $controller->list(); // GET /api/extras/list
            } elseif ($method_name === 'get') {
                $controller->get(); // GET /api/extras/get?id=1
            } elseif ($method_name === 'create') {
                $controller->create(); // POST /api/extras/create
            } elseif ($method_name === 'update') {
                $controller->update(); // POST /api/extras/update
            } elseif ($method_name === 'delete') {
                $controller->delete(); // POST /api/extras/delete
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Endpoint de Extras no encontrado']);
            }
            break;


        default:
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Controlador no encontrado']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    error_log("API Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error interno del servidor.']);
}
