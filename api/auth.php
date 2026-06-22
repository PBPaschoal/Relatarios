<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
define('API_ENTRY', true);
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

$pdo = getDB();
$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true) ?: [];

function currentUser($pdo) {
    if (!isset($_SESSION['user_id'])) return null;
    $stmt = $pdo->prepare('SELECT id, name, username, role FROM users WHERE id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

switch ($action) {

    case 'login':
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';
        if ($username === '' || $password === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Informe usuário e senha.']);
            exit;
        }
        $stmt = $pdo->prepare('SELECT id, name, username, password_hash, role FROM users WHERE username = ?');
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user || !password_verify($password, $user['password_hash'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Usuário ou senha incorretos.']);
            exit;
        }
        session_regenerate_id(true);
        $_SESSION['user_id'] = $user['id'];
        echo json_encode([
            'id' => $user['id'],
            'name' => $user['name'],
            'username' => $user['username'],
            'role' => $user['role'],
        ]);
        break;

    case 'logout':
        $_SESSION = [];
        session_destroy();
        echo json_encode(['ok' => true]);
        break;

    case 'me':
        $user = currentUser($pdo);
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Não autenticado.']);
            exit;
        }
        echo json_encode($user);
        break;

    case 'create_user':
        $me = currentUser($pdo);
        if (!$me || $me['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Apenas o administrador pode criar contas.']);
            exit;
        }
        $name = trim($input['name'] ?? '');
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';
        $role = ($input['role'] ?? 'user') === 'admin' ? 'admin' : 'user';

        if ($name === '' || $username === '' || strlen($password) < 6) {
            http_response_code(400);
            echo json_encode(['error' => 'Preencha nome, usuário e senha (mínimo 6 caracteres).']);
            exit;
        }
        try {
            $stmt = $pdo->prepare('INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)');
            $stmt->execute([$name, $username, password_hash($password, PASSWORD_DEFAULT), $role]);
            echo json_encode(['id' => (int)$pdo->lastInsertId()]);
        } catch (PDOException $e) {
            http_response_code(409);
            echo json_encode(['error' => 'Esse nome de usuário já existe.']);
        }
        break;

    default:
        http_response_code(404);
        echo json_encode(['error' => 'Ação desconhecida.']);
}