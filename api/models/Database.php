<?php
// /pizzeria_pos/api/models/Database.php

class Database {
    private static $pdo = null;

    public static function getConnection() {
        // Cargar config.php para acceder a DB_FILE
        require_once ROOT_PATH . '/config.php';

        if (self::$pdo === null) {
            try {
                $dsn = 'sqlite:' . DB_FILE;
                self::$pdo = new PDO($dsn);
                self::$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                self::$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            } catch (PDOException $e) {
                error_log("DB Connection Error: " . $e->getMessage());
                // En modo API, el modelo no debe morir, sino lanzar una excepción
                throw new Exception("Database connection failed.");
            }
        }
        return self::$pdo;
    }
}
?>