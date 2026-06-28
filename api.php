<?php
require __DIR__ . '/lib.php';

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

try {
  $pdo = db();
  $method = $_SERVER['REQUEST_METHOD'];
  $action = $_GET['action'] ?? '';

  if ($method === 'POST' && $action === 'create') {
    $input = read_json_body();
    $id = make_game_id($pdo);
    $stmt = $pdo->prepare('INSERT INTO games (game_id, left_team, right_team, left_color, right_color) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([
      $id,
      clean_text($input['leftTeam'] ?? '', 'Home'),
      clean_text($input['rightTeam'] ?? '', 'Away'),
      clean_color($input['leftColor'] ?? '', '#991408'),
      clean_color($input['rightColor'] ?? '', '#3a0ca3'),
    ]);
    json_response(['game' => find_game($pdo, $id)], 201);
  }

  $gameId = strtoupper((string)($_GET['gameId'] ?? ''));
  if (!preg_match('/^[A-Z2-9]{5}$/', $gameId)) json_response(['error' => 'Invalid game id'], 400);

  if ($method === 'GET') {
    $since = max(0, (int)($_GET['since'] ?? 0));
    $deadline = microtime(true) + min(25, max(0, (int)($_GET['wait'] ?? 0)));
    do {
      $game = find_game($pdo, $gameId);
      if (!$game) json_response(['error' => 'Game not found'], 404);
      if ($since === 0 || $game['version'] > $since || microtime(true) >= $deadline) json_response(['game' => $game]);
      usleep(400000);
    } while (true);
  }

  if ($method === 'PATCH') {
    $input = read_json_body();
    if (!find_game($pdo, $gameId)) json_response(['error' => 'Game not found'], 404);
    $next = [
      'leftTeam' => clean_text($input['leftTeam'] ?? 'Home', 'Home'),
      'rightTeam' => clean_text($input['rightTeam'] ?? 'Away', 'Away'),
      'leftColor' => clean_color($input['leftColor'] ?? '#991408', '#991408'),
      'rightColor' => clean_color($input['rightColor'] ?? '#3a0ca3', '#3a0ca3'),
      'leftScore' => max(0, (int)($input['leftScore'] ?? 0)),
      'rightScore' => max(0, (int)($input['rightScore'] ?? 0)),
      'leftGames' => max(0, (int)($input['leftGames'] ?? 0)),
      'rightGames' => max(0, (int)($input['rightGames'] ?? 0)),
      'setNumber' => max(1, (int)($input['setNumber'] ?? 1)),
    ];
    $stmt = $pdo->prepare('UPDATE games SET left_team=?, right_team=?, left_color=?, right_color=?, left_score=?, right_score=?, left_games=?, right_games=?, set_number=?, version=version+1 WHERE game_id=?');
    $stmt->execute([$next['leftTeam'], $next['rightTeam'], $next['leftColor'], $next['rightColor'], $next['leftScore'], $next['rightScore'], $next['leftGames'], $next['rightGames'], $next['setNumber'], $gameId]);
    json_response(['game' => find_game($pdo, $gameId)]);
  }

  json_response(['error' => 'Not found'], 404);
} catch (Throwable $e) {
  error_log($e->getMessage());
  json_response(['error' => 'Server error'], 500);
}
