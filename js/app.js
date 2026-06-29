import { createGame, getGame, updateGame } from "./api.js";
import { $, hide, show, toast } from "./dom.js";
import { GamePoller } from "./poller.js";
import { goHome, goScorekeeper, goViewer, route, viewerUrl } from "./routes.js";
import { bindScorekeeperTutorial, hasSeenScorekeeperTutorial, startScorekeeperTutorial, stopScorekeeperTutorial } from "./tutorial.js";
import { bindGameTracker, bindTeamEditing, bindTouchZone, isEditingTeamName, render } from "./scoreboard.js";

let game = null;
let mode = "landing";
let saveTimer = null;
let saving = false;
let poller = null;
const landingBackgrounds = ["/assets/court.jpg", "/assets/ball.jpg"];
let showTutorialAfterStart = false;

function setStatus(message) {
  $("syncStatus").textContent = message;
}

function showBoard(nextMode) {
  mode = nextMode;
  document.body.className = `${mode}-mode`;
  document.body.style.removeProperty("--landing-background");
  $("scoreboard").hidden = false;
  hide($("homeModal"));
  hide($("setupModal"));
  hide($("joinModal"));
  stopScorekeeperTutorial();
}

function setLandingBackground() {
  const image = landingBackgrounds[Math.floor(Math.random() * landingBackgrounds.length)];
  document.body.style.setProperty("--landing-background", `url("${image}")`);
}

function isMobileDevice() {
  return window.matchMedia("(pointer: coarse), (max-width: 820px)").matches;
}

async function requestMobileFullscreen() {
  if (!isMobileDevice() || document.fullscreenElement || !document.documentElement.requestFullscreen) return;
  await document.documentElement.requestFullscreen().catch(() => {});
}

function bindDeferredFullscreen() {
  if (!isMobileDevice() || document.fullscreenElement) return;
  const requestOnce = () => requestMobileFullscreen();
  document.addEventListener("pointerdown", requestOnce, { once: true });
}

function shouldShowScorekeeperTutorial() {
  return showTutorialAfterStart && !hasSeenScorekeeperTutorial();
}

function showScorekeeperTutorial() {
  if (!shouldShowScorekeeperTutorial()) return;
  showTutorialAfterStart = false;
  startScorekeeperTutorial();
}

async function savePatch(patch) {
  if (mode !== "scorekeeper" || !game) return;
  game = { ...game, ...patch };
  render(game);
  saving = true;
  setStatus("Saving...");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      game = await updateGame(game);
      render(game);
      setStatus("Live sync");
    } catch {
      setStatus("Save failed");
    } finally {
      saving = false;
    }
  }, 80);
}

function bindControls() {
  bindTeamEditing(savePatch);
  bindTouchZone($("leftSide"), "left", changeScore);
  bindTouchZone($("rightSide"), "right", changeScore);
  bindGameTracker($("leftGamesBar"), "leftGames", changeGames);
  bindGameTracker($("rightGamesBar"), "rightGames", changeGames);
  $("newSet").addEventListener("click", () => confirmAction({
    title: "Start new match?",
    message: "This will award the current game to the leading team, clear the scores, and advance the match count.",
    confirmLabel: "Start New Match",
    onConfirm: () => savePatch(buildNewMatchPatch(game))
  }));
  $("resetMatch").addEventListener("click", () => confirmAction({
    title: "Reset score?",
    message: "This will clear scores, games won, and return the match count to 1.",
    confirmLabel: "Reset Score",
    onConfirm: () => savePatch({ leftScore: 0, rightScore: 0, leftGames: 0, rightGames: 0, setNumber: 1 })
  }));
  $("shareGame").addEventListener("click", shareGame);
  $("homeButton").addEventListener("click", goHome);
}

function buildNewMatchPatch(currentGame) {
  const leftScore = Number(currentGame.leftScore);
  const rightScore = Number(currentGame.rightScore);
  const patch = {
    leftScore: 0,
    rightScore: 0,
    setNumber: Number(currentGame.setNumber) + 1
  };

  if (leftScore > rightScore) patch.leftGames = Number(currentGame.leftGames) + 1;
  if (rightScore > leftScore) patch.rightGames = Number(currentGame.rightGames) + 1;

  return patch;
}

function changeGames(key, amount) {
  if (!game || mode !== "scorekeeper") return;
  savePatch({ [key]: Math.max(0, Number(game[key]) + amount) });
}

function changeScore(side, amount) {
  if (!game || mode !== "scorekeeper") return;
  const key = side === "left" ? "leftScore" : "rightScore";
  savePatch({ [key]: Math.max(0, Number(game[key]) + amount) });
}

async function shareGame() {
  const url = viewerUrl(game.gameId);
  if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
    await navigator.share({ title: "Keep Score", url }).catch(() => {});
    return;
  }
  await navigator.clipboard.writeText(url);
  toast("Viewer link copied");
}

async function startGame(id, nextMode) {
  game = await getGame(id, 0, 0);
  showBoard(nextMode);
  render(game);
  poller?.stop();
  poller = new GamePoller({
    load: (since, wait) => getGame(game.gameId, since, wait),
    apply: next => { game = next; render(game); },
    status: setStatus,
    canApply: () => !saving && !isEditingTeamName()
  });
  poller.start(game.version);
  if (nextMode === "scorekeeper") {
    bindDeferredFullscreen();
    showScorekeeperTutorial();
  }
}

function confirmAction({ title, message, confirmLabel, onConfirm }) {
  $("confirmTitle").textContent = title;
  $("confirmMessage").textContent = message;
  $("confirmAccept").textContent = confirmLabel;
  show($("confirmModal"));
  $("confirmAccept").focus();
  const cleanup = () => {
    $("confirmAccept").removeEventListener("click", accept);
    $("confirmCancel").removeEventListener("click", cancel);
  };
  const close = () => {
    cleanup();
    hide($("confirmModal"));
  };
  const accept = () => {
    close();
    onConfirm();
  };
  const cancel = () => close();
  $("confirmAccept").addEventListener("click", accept);
  $("confirmCancel").addEventListener("click", cancel);
}

function closeActiveModal() {
  if (!$("confirmModal").classList.contains("hidden")) {
    $("confirmCancel").click();
    return;
  }
  if (!$("tutorialOverlay").classList.contains("hidden")) {
    stopScorekeeperTutorial();
    return;
  }
  goHome();
}

function bindColorPresets() {
  let activeColorInput = $("setupTeamColor");
  const panel = $("colorPickerPanel");
  const pickerButtons = document.querySelectorAll("[data-color-picker]");

  const syncPickerButton = input => {
    const pickerButton = document.querySelector(`[data-color-picker="${input.id}"]`);
    pickerButton?.style.setProperty("--selected-color", input.value);
  };

  const showPanelFor = input => {
    activeColorInput = input;
    panel.classList.remove("hidden");
  };

  pickerButtons.forEach(button => {
    button.addEventListener("click", () => showPanelFor($(button.dataset.colorPicker)));
  });

  document.querySelectorAll("[data-color-preset]").forEach(button => {
    button.addEventListener("click", () => {
      activeColorInput.value = button.dataset.colorPreset;
      syncPickerButton(activeColorInput);
      panel.classList.add("hidden");
      document.querySelector(`[data-color-picker="${activeColorInput.id}"]`)?.focus();
    });
  });
}

function bindModals() {
  bindColorPresets();
  $("chooseScorekeeper").addEventListener("click", () => { hide($("homeModal")); show($("setupModal")); });
  $("chooseViewer").addEventListener("click", () => { hide($("homeModal")); show($("joinModal")); $("joinKey").focus(); });
  bindScorekeeperTutorial();
  document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => { hide($("setupModal")); hide($("joinModal")); show($("homeModal")); }));
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeActiveModal(); });
  $("setupForm").addEventListener("submit", createFromForm);
  $("joinForm").addEventListener("submit", event => { event.preventDefault(); goViewer($("joinKey").value.trim().toUpperCase()); });
}

async function createFromForm(event) {
  event.preventDefault();
  showTutorialAfterStart = true;
  await requestMobileFullscreen();
  setStatus("Creating...");
  const created = await createGame({
    leftTeam: $("setupTeam").value,
    leftColor: $("setupTeamColor").value,
    rightTeam: $("setupOpponent").value || "Opponent",
    rightColor: $("setupOpponentColor").value
  });
  goScorekeeper(created.gameId);
  await startGame(created.gameId, "scorekeeper");
}

async function boot() {
  setLandingBackground();
  bindModals();
  bindControls();
  const current = route();
  if (current.mode === "viewer" && current.id) return startGame(current.id, "viewer");
  if (current.mode === "sk" && current.id) return startGame(current.id, "scorekeeper");
  show($("homeModal"));
}

boot().catch(error => {
  toast(error.message || "Unable to load game");
  show($("homeModal"));
});
