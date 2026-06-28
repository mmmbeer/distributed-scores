<?php
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$file = __DIR__ . '/data/score.json';

$default = [
  "leftTeam" => "Home",
  "rightTeam" => "Away",
  "leftScore" => 0,
  "rightScore" => 0,
  "leftGames" => 0,
  "rightGames" => 0,
  "setNumber" => 1,
  "updatedAt" => time()
];

if (!is_dir(__DIR__ . '/data')) {
  mkdir(__DIR__ . '/data', 0775, true);
}

if (!file_exists($file)) {
  file_put_contents($file, json_encode($default, JSON_PRETTY_PRINT), LOCK_EX);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  echo file_get_contents($file);
  exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
  http_response_code(400);
  echo json_encode(["error" => "Invalid JSON"]);
  exit;
}

$current = json_decode(file_get_contents($file), true);
if (!is_array($current)) {
  $current = $default;
}

$allowed = [
  "leftTeam",
  "rightTeam",
  "leftScore",
  "rightScore",
  "leftGames",
  "rightGames",
  "setNumber"
];

$next = $current;

foreach ($allowed as $key) {
  if (array_key_exists($key, $input)) {
    $next[$key] = $input[$key];
  }
}

$next["leftScore"] = max(0, intval($next["leftScore"]));
$next["rightScore"] = max(0, intval($next["rightScore"]));
$next["leftGames"] = max(0, intval($next["leftGames"]));
$next["rightGames"] = max(0, intval($next["rightGames"]));
$next["setNumber"] = max(1, intval($next["setNumber"]));
$next["leftTeam"] = trim(strval($next["leftTeam"])) ?: "Home";
$next["rightTeam"] = trim(strval($next["rightTeam"])) ?: "Away";
$next["updatedAt"] = time();

file_put_contents($file, json_encode($next, JSON_PRETTY_PRINT), LOCK_EX);
echo json_encode($next);
