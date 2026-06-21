<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
define('API_ENTRY', true);
require_once __DIR__ . '/home/u854704211/api/config.php';
require_once __DIR__ . '/home/u854704211/api/db.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Não autenticado.']);
    exit;
}
$userId = $_SESSION['user_id'];
$pdo = getDB();
$action = $_GET['action'] ?? '';

switch ($action) {

    case 'list':
        $date = $_GET['date'] ?? '';
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            http_response_code(400);
            echo json_encode(['error' => 'Data inválida.']);
            exit;
        }
        $stmt = $pdo->prepare('SELECT id, entry_date, start_time, end_time, activity_text
                                FROM diario_entries
                                WHERE user_id = ? AND entry_date = ?
                                ORDER BY start_time ASC');
        $stmt->execute([$userId, $date]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(array_map(function ($r) {
            return [
                'id'   => (int)$r['id'],
                'date' => $r['entry_date'],
                'time' => substr($r['start_time'], 0, 5),
                'end'  => $r['end_time'] ? substr($r['end_time'], 0, 5) : '',
                'text' => $r['activity_text'],
            ];
        }, $rows));
        break;

    case 'save':
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $date = $input['date'] ?? '';
        $time = $input['time'] ?? '';
        $end  = $input['end']  ?? '';
        $text = trim($input['text'] ?? '');
        $id   = $input['id']   ?? null;

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) ||
            !preg_match('/^\d{2}:\d{2}$/', $time) ||
            $text === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Dados inválidos.']);
            exit;
        }
        $endValue = $end !== '' ? $end . ':00' : null;

        if ($id) {
            $stmt = $pdo->prepare('UPDATE diario_entries
                                    SET start_time = ?, end_time = ?, activity_text = ?
                                    WHERE id = ? AND user_id = ?');
            $stmt->execute([$time . ':00', $endValue, $text, $id, $userId]);
            echo json_encode(['id' => (int)$id]);
        } else {
            $stmt = $pdo->prepare('INSERT INTO diario_entries (user_id, entry_date, start_time, end_time, activity_text)
                                    VALUES (?, ?, ?, ?, ?)');
            $stmt->execute([$userId, $date, $time . ':00', $endValue, $text]);
            echo json_encode(['id' => (int)$pdo->lastInsertId()]);
        }
        break;

    case 'delete':
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $id = $input['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID não informado.']);
            exit;
        }
        $stmt = $pdo->prepare('DELETE FROM diario_entries WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $userId]);
        echo json_encode(['deleted' => true]);
        break;

    default:
        http_response_code(404);
        echo json_encode(['error' => 'Ação desconhecida.']);
}