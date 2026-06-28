<?php
function load_env_file(string $path): void {
  if (!is_file($path)) return;
  foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    $line = trim($line);
    if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
    [$key, $value] = array_map('trim', explode('=', $line, 2));
    $value = trim($value, "\"'");
    if ($key !== '' && getenv($key) === false) putenv("$key=$value");
  }
}

function db(): PDO {
  static $pdo = null;
  if ($pdo instanceof PDO) return $pdo;
  load_env_file(__DIR__ . '/.env');
  $host = getenv('DB_SERVER') ?: '127.0.0.1';
  $port = getenv('DB_PORT') ?: '3306';
  $user = getenv('DB_USER') ?: '';
  $pass = getenv('DB_PASSWORD') ?: '';
  $name = getenv('DB_NAME') ?: getenv('DB_DATABASE') ?: getenv('DB_USER') ?: 'volleyball';
  $dsn = "mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4";
  $pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  ensure_schema($pdo);
  return $pdo;
}

function ensure_schema(PDO $pdo): void {
  $pdo->exec("CREATE TABLE IF NOT EXISTS games (
    game_id CHAR(5) NOT NULL PRIMARY KEY,
    left_team VARCHAR(80) NOT NULL,
    right_team VARCHAR(80) NOT NULL,
    left_color VARCHAR(7) NOT NULL,
    right_color VARCHAR(7) NOT NULL,
    left_score INT UNSIGNED NOT NULL DEFAULT 0,
    right_score INT UNSIGNED NOT NULL DEFAULT 0,
    left_games INT UNSIGNED NOT NULL DEFAULT 0,
    right_games INT UNSIGNED NOT NULL DEFAULT 0,
    set_number INT UNSIGNED NOT NULL DEFAULT 1,
    version INT UNSIGNED NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

function json_response(array $payload, int $status = 200): void {
  http_response_code($status);
  echo json_encode($payload);
  exit;
}

function read_json_body(): array {
  $input = json_decode(file_get_contents('php://input'), true);
  if (!is_array($input)) json_response(['error' => 'Invalid JSON'], 400);
  return $input;
}

function clean_text(mixed $value, string $fallback): string {
  $text = trim((string)$value);
  return mb_substr($text !== '' ? $text : $fallback, 0, 80);
}

function clean_color(mixed $value, string $fallback): string {
  $color = trim((string)$value);
  return preg_match('/^#[0-9a-fA-F]{6}$/', $color) ? $color : $fallback;
}

function make_game_id(PDO $pdo): string {
  $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for ($tries = 0; $tries < 24; $tries++) {
    $id = '';
    for ($i = 0; $i < 5; $i++) $id .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    $stmt = $pdo->prepare('SELECT 1 FROM games WHERE game_id = ?');
    $stmt->execute([$id]);
    if (!$stmt->fetchColumn()) return $id;
  }
  throw new RuntimeException('Unable to allocate game id');
}

function normalize_game(array $row): array {
  return [
    'gameId' => $row['game_id'],
    'leftTeam' => $row['left_team'],
    'rightTeam' => $row['right_team'],
    'leftColor' => $row['left_color'],
    'rightColor' => $row['right_color'],
    'leftScore' => (int)$row['left_score'],
    'rightScore' => (int)$row['right_score'],
    'leftGames' => (int)$row['left_games'],
    'rightGames' => (int)$row['right_games'],
    'setNumber' => (int)$row['set_number'],
    'version' => (int)$row['version'],
    'updatedAt' => $row['updated_at'],
  ];
}

function find_game(PDO $pdo, string $id): ?array {
  $stmt = $pdo->prepare('SELECT * FROM games WHERE game_id = ?');
  $stmt->execute([strtoupper($id)]);
  $row = $stmt->fetch();
  return $row ? normalize_game($row) : null;
}
