<?php
define('API_ENTRY', true);
require_once __DIR__ . '/home/u854704211/api/config.php';
require_once __DIR__ . '/home/u854704211/api/db.php';

$pdo = getDB();
$count = (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
$message = '';

if ($count > 0) {
    $message = 'Já existe um usuário cadastrado. Por segurança, apague este arquivo (setup_admin.php) do servidor agora.';
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    if ($name === '' || $username === '' || strlen($password) < 6) {
        $message = 'Preencha todos os campos (senha com pelo menos 6 caracteres).';
    } else {
        $stmt = $pdo->prepare('INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, "admin")');
        $stmt->execute([$name, $username, password_hash($password, PASSWORD_DEFAULT)]);
        $message = 'Administrador criado com sucesso! Agora apague este arquivo (setup_admin.php) do servidor imediatamente.';
        $count = 1;
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Configuração inicial — Diário de Bordo</title>
<style>
  body{font-family:sans-serif;max-width:420px;margin:60px auto;padding:0 16px;color:#1B2A3D;}
  input,button{display:block;width:100%;margin-bottom:12px;padding:10px;font-size:15px;box-sizing:border-box;}
  button{background:#0B2240;color:#fff;border:none;border-radius:6px;cursor:pointer;}
  .msg{padding:12px;background:#FBEAEA;border-radius:6px;margin-bottom:16px;}
</style>
</head>
<body>
<h2>Criar administrador</h2>
<?php if ($message): ?><p class="msg"><?= htmlspecialchars($message) ?></p><?php endif; ?>
<?php if ($count === 0): ?>
<form method="post">
  <input type="text" name="name" placeholder="Seu nome (ex: Bruno Paschoal)" required>
  <input type="text" name="username" placeholder="Usuário de login" required>
  <input type="password" name="password" placeholder="Senha (mín. 6 caracteres)" required>
  <button type="submit">Criar administrador</button>
</form>
<?php endif; ?>
</body>
</html>