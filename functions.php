<?php
// functions.php
require_once 'config.php';

/**
 * Establece una conexión PDO a la base de datos SQLite.
 * @return PDO El objeto de conexión PDO.
 * @throws Exception Si la conexión falla.
 */
function getDbConnection() {
    try {
        // Asegúrate de que el directorio /db existe
        if (!is_dir(dirname(DB_FILE))) {
            mkdir(dirname(DB_FILE), 0777, true);
        }

        // Crear una nueva conexión PDO
        // sqlite:DB_FILE es la sintaxis de PDO para SQLite
        $pdo = new PDO('sqlite:' . DB_FILE);

        // Configurar PDO para que lance excepciones en caso de error
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // Configurar el modo de resultados para que devuelva un array asociativo por defecto
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        return $pdo;
    } catch (PDOException $e) {
        // En un entorno de producción, loguear el error y mostrar un mensaje genérico.
        // En desarrollo, puedes mostrar el error.
        error_log('Error de conexión a la BD: ' . $e->getMessage());
        throw new Exception('Error interno del servidor. No se pudo conectar a la base de datos.');
    }
}

// Ejemplo de uso (puedes borrar esto después de probar)
 try {
     $db = getDbConnection();
     echo "Conexión a SQLite exitosa!";
 } catch (Exception $e) {
     echo $e->getMessage();
 }
?>