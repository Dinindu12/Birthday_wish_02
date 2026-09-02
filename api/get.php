<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$id = isset($_GET['id']) ? trim($_GET['id']) : '';

if (empty($id)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing ID parameter']);
    exit;
}

$dataFile = __DIR__ . '/../data/wishes.json';
if (!file_exists($dataFile)) {
    http_response_code(404);
    echo json_encode(['error' => 'No database found']);
    exit;
}

$wishes = json_decode(file_get_contents($dataFile), true) ?: [];

if (isset($wishes[$id])) {
    echo json_encode(['status' => 'success', 'data' => $wishes[$id]]);
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Wish not found']);
}
