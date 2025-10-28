<?php
// /pizzeria_pos/api/index.php

// Cargar la configuración y definir que la respuesta será JSON
require_once dirname(__DIR__) . '../config.php';
header('Content-Type: application/json');

// Incluir controladores (ajusta las rutas según sea necesario)
require_once CONTROLLER_PATH . '/AuthController.php';
require_once CONTROLLER_PATH . '/ProductController.php';
require_once CONTROLLER_PATH . '/DiscountController.php';
require_once CONTROLLER_PATH . '/OrderController.php';


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
        case 'products':
            $controller = new ProductController();
            if ($method_name === 'list') {
                $controller->list();
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
            } elseif ($method_name === 'complete') { // <--- NUEVA RUTA
                $controller->complete();
            } elseif ($method_name === 'pending') { // <--- NUEVA RUTA
                $controller->getPendingOrders();
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Endpoint de Orders no encontrado']);
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
