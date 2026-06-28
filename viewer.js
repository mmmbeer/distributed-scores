const $ = id => document.getElementById(id);

let lastUpdatedAt = null;
let consecutiveFailures = 0;

function render(s) {
  $("vLeftTeam").textContent = s.leftTeam;
  $("vRightTeam").textContent = s.rightTeam;
  $("vLeftScore").textContent = s.leftScore;
  $("vRightScore").textContent = s.rightScore;
  $("vLeftGames").textContent = s.leftGames;
  $("vRightGames").textContent = s.rightGames;
  $("vSetNumber").textContent = s.setNumber;

  if (s.updatedAt !== lastUpdatedAt) {
    lastUpdatedAt = s.updatedAt;
    document.body.dataset.updated = String(Date.now());
  }
}

async function pullScore() {
  try {
    const res = await fetch(`api.php?ts=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache"
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const state = await res.json();
    render(state);

    consecutiveFailures = 0;
    $("connectionStatus").textContent = "Live";
  } catch {
    consecutiveFailures += 1;
    $("connectionStatus").textContent = consecutiveFailures > 2 ? "Reconnecting..." : "Live";
  } finally {
    window.setTimeout(pullScore, document.hidden ? 1000 : 250);
  }
}

pullScore();

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    pullScore();
  }
});
