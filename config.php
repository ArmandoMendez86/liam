<?php
// /pizzeria_pos/config.php

// ----------------------------------------------------
// RUTAS DE LA APLICACIÓN
// ----------------------------------------------------
define('ROOT_PATH', __DIR__);
define('API_PATH', ROOT_PATH . '/api');
define('MODEL_PATH', API_PATH . '/models');
define('CONTROLLER_PATH', API_PATH . '/controllers');
define('PUBLIC_PATH', ROOT_PATH . '/public');

// ----------------------------------------------------
// CONFIGURACIÓN DE BASE DE DATOS (SQLite)
// ----------------------------------------------------
// NOTA: 'pizzeria.db' está fuera de /public para mayor seguridad.
define('DB_FILE', ROOT_PATH . '/db/pizzeria.db');

// ----------------------------------------------------
// CONFIGURACIÓN DE SESIÓN y CORS
// ----------------------------------------------------
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Configuración básica para permitir el acceso a la API desde el Frontend
// En producción, ajusta '*' por el dominio específico de tu frontend.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Si la petición es OPTIONS (preflight CORS), terminar aquí
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
?>