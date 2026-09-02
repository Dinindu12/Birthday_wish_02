<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$dataDir = __DIR__ . '/../data';
if (!file_exists($dataDir)) {
    mkdir($dataDir, 0777, true);
    chmod($dataDir, 0777);
}

$dataFile = $dataDir . '/wishes.json';
$wishes = [];
if (file_exists($dataFile)) {
    $json = file_get_contents($dataFile);
    $wishes = json_decode($json, true) ?: [];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);

    if (!$input && !empty($_POST)) {
        $input = $_POST;
    }

    if (!$input) {
        // Fallback: try raw decoded payload
        if (!empty($rawInput)) {
            $input = ['raw' => $rawInput];
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON or empty payload']);
            exit;
        }
    }

    $id = 'wish_' . substr(md5(uniqid(rand(), true)), 0, 10);
    $input['id'] = $id;

    $wishes[$id] = $input;
    file_put_contents($dataFile, json_encode($wishes, JSON_PRETTY_PRINT));
    chmod($dataFile, 0777);

    echo json_encode(['status' => 'success', 'id' => $id]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method Not Allowed']);
