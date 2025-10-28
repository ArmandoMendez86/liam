<?php
// Script temporal para generar el hash de la contraseña
$password = '1234'; // <--- LA CONTRASEÑA QUE VAS A USAR
$hash = password_hash($password, PASSWORD_DEFAULT);
echo "Hash generado para '1234': <strong>" . htmlspecialchars($hash) . "</strong>";
?>