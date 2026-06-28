const api = "api.php";

async function request(url, options = {}) {
  const res = await fetch(url, { cache: "no-store", ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data.game;
}

export function createGame(payload) {
  return request(`${api}?action=create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function getGame(gameId, since = 0, wait = 20) {
  return request(`${api}?gameId=${encodeURIComponent(gameId)}&since=${since}&wait=${wait}`);
}

export function updateGame(game) {
  return request(`${api}?gameId=${encodeURIComponent(game.gameId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(game)
  });
}
