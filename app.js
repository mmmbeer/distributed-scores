let state = null;
let lastRemoteUpdatedAt = null;
let saveTimer = null;
let localWriteInProgress = false;
let editingTeamName = false;
let pullTimer = null;
let mode = "viewer";

const $ = id => document.getElementById(id);

function setMode(nextMode) {
  mode = nextMode === "scorekeeper" ? "scorekeeper" : "viewer";

  document.body.classList.toggle("scorekeeper-mode", mode === "scorekeeper");
  document.body.classList.toggle("viewer-mode", mode === "viewer");

  $("modeModal").classList.add("hidden");
}

function openModeModal() {
  $("modeModal").classList.remove("hidden");
}

async function fetchState() {
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

  return await res.json();
}

async function loadState() {
  try {
    state = await fetchState();
    lastRemoteUpdatedAt = state.updatedAt;
    render();
    $("syncStatus").textContent = "Live sync";
  } catch {
    $("syncStatus").textContent = "Offline";
  }
}

async function saveState(patch = {}) {
  if (mode !== "scorekeeper") return;

  state = { ...state, ...patch };
  render();

  localWriteInProgress = true;
  $("syncStatus").textContent = "Saving...";

  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      const res = await fetch("api.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(state)
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      state = await res.json();
      lastRemoteUpdatedAt = state.updatedAt;
      render();
      $("syncStatus").textContent = "Live sync";
    } catch {
      $("syncStatus").textContent = "Save failed";
    } finally {
      localWriteInProgress = false;
    }
  }, 60);
}

function render() {
  if (!state) return;

  if (document.activeElement !== $("leftTeam")) {
    $("leftTeam").value = state.leftTeam;
  }

  if (document.activeElement !== $("rightTeam")) {
    $("rightTeam").value = state.rightTeam;
  }

  $("leftTeamLabel").textContent = state.leftTeam;
  $("rightTeamLabel").textContent = state.rightTeam;
  $("leftScore").textContent = state.leftScore;
  $("rightScore").textContent = state.rightScore;
  $("leftGames").textContent = state.leftGames;
  $("rightGames").textContent = state.rightGames;
}

function flashRemoteUpdate() {
  const el = $("syncStatus");
  el.textContent = "Updated";
  el.classList.add("changed");
  setTimeout(() => {
    el.classList.remove("changed");
    el.textContent = mode === "viewer" ? "Viewer live" : "Live sync";
  }, 450);
}

async function pullRemoteChanges() {
  try {
    if (!localWriteInProgress && !editingTeamName) {
      const remote = await fetchState();

      if (state && remote.updatedAt !== lastRemoteUpdatedAt) {
        state = remote;
        lastRemoteUpdatedAt = remote.updatedAt;
        render();
        flashRemoteUpdate();
      } else if (!state) {
        state = remote;
        lastRemoteUpdatedAt = remote.updatedAt;
        render();
      }

      if (!$("syncStatus").classList.contains("changed")) {
        $("syncStatus").textContent = mode === "viewer" ? "Viewer live" : "Live sync";
      }
    }
  } catch {
    $("syncStatus").textContent = "Reconnecting...";
  } finally {
    pullTimer = window.setTimeout(pullRemoteChanges, document.hidden ? 1000 : 300);
  }
}

function changeScore(side, amount) {
  if (mode !== "scorekeeper") return;

  const key = side === "left" ? "leftScore" : "rightScore";
  saveState({ [key]: Math.max(0, Number(state[key]) + amount) });
}

function bindTouchZone(element, side) {
  let startX = 0;
  let startY = 0;
  let startedOnControl = false;

  element.addEventListener("pointerdown", event => {
    startedOnControl = Boolean(event.target.closest("button, input, a"));
    startX = event.clientX;
    startY = event.clientY;
  });

  element.addEventListener("pointerup", event => {
    if (startedOnControl || !state || mode !== "scorekeeper") return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (Math.abs(dy) > 48 && Math.abs(dy) > Math.abs(dx)) {
      changeScore(side, dy > 0 ? -1 : 1);
      return;
    }

    changeScore(side, 1);
  });
}

for (const id of ["leftTeam", "rightTeam"]) {
  $(id).addEventListener("focus", () => {
    editingTeamName = true;
  });

  $(id).addEventListener("blur", () => {
    editingTeamName = false;
  });
}

$("leftTeam").addEventListener("change", event => {
  saveState({ leftTeam: event.target.value || "Home" });
});

$("rightTeam").addEventListener("change", event => {
  saveState({ rightTeam: event.target.value || "Away" });
});

$("leftGame").addEventListener("click", event => {
  event.stopPropagation();
  if (!state || mode !== "scorekeeper") return;

  saveState({
    leftGames: Number(state.leftGames) + 1,
    leftScore: Number(state.leftScore),
    rightScore: Number(state.rightScore)
  });
});

$("rightGame").addEventListener("click", event => {
  event.stopPropagation();
  if (!state || mode !== "scorekeeper") return;

  saveState({
    rightGames: Number(state.rightGames) + 1,
    leftScore: Number(state.leftScore),
    rightScore: Number(state.rightScore)
  });
});

$("newSet").addEventListener("click", () => {
  if (!state || mode !== "scorekeeper") return;
  saveState({
    leftScore: 0,
    rightScore: 0,
    setNumber: Number(state.setNumber) + 1
  });
});

$("resetMatch").addEventListener("click", () => {
  if (!state || mode !== "scorekeeper") return;
  saveState({
    leftScore: 0,
    rightScore: 0,
    leftGames: 0,
    rightGames: 0,
    setNumber: 1
  });
});

$("startViewer").addEventListener("click", () => setMode("viewer"));
$("startScorekeeper").addEventListener("click", () => setMode("scorekeeper"));
$("chooseMode").addEventListener("click", openModeModal);
$("viewerModeButton").addEventListener("click", openModeModal);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    clearTimeout(pullTimer);
    pullRemoteChanges();
  }
});

bindTouchZone($("leftSide"), "left");
bindTouchZone($("rightSide"), "right");

loadState().then(() => {
  setMode("viewer");
  openModeModal();
  pullRemoteChanges();
});
