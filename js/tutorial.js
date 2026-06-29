import { $ } from "./dom.js";

const tutorialSeenKey = "scorekeeperTutorialSeen";

const steps = [
  {
    target: "leftSide",
    title: "Add points",
    text: "Tap or swipe up on either team side to add a point.",
    motion: "up"
  },
  {
    target: "rightSide",
    title: "Fix mistakes",
    text: "Swipe down on a team side to reduce that score by one.",
    motion: "down"
  },
  {
    target: "leftGamesBar",
    title: "Track wins",
    text: "Swipe left or right on the games bar to decrease or increase wins.",
    motion: "horizontal"
  },
  {
    target: "shareGame",
    title: "Share live score",
    text: "Tap the share button to send viewers a live link.",
    motion: "pulse"
  }
];

let activeStep = 0;
let onComplete = () => {};

export function hasSeenScorekeeperTutorial() {
  return localStorage.getItem(tutorialSeenKey) === "1";
}

export function startScorekeeperTutorial({ force = false, complete = () => {} } = {}) {
  if (!force && hasSeenScorekeeperTutorial()) return;
  activeStep = 0;
  onComplete = complete;
  localStorage.setItem(tutorialSeenKey, "1");
  $("tutorialOverlay").classList.remove("hidden");
  window.addEventListener("resize", positionTutorialStep);
  showStep();
}

export function stopScorekeeperTutorial() {
  $("tutorialOverlay").classList.add("hidden");
  document.querySelectorAll(".tutorial-highlight").forEach(el => el.classList.remove("tutorial-highlight"));
  window.removeEventListener("resize", positionTutorialStep);
  onComplete();
}

export function bindScorekeeperTutorial() {
  $("tutorialNext").addEventListener("click", nextStep);
  $("tutorialSkip").addEventListener("click", stopScorekeeperTutorial);
}

function nextStep() {
  activeStep += 1;
  if (activeStep >= steps.length) {
    stopScorekeeperTutorial();
    return;
  }
  showStep();
}

function showStep() {
  document.querySelectorAll(".tutorial-highlight").forEach(el => el.classList.remove("tutorial-highlight"));
  const step = steps[activeStep];
  const target = $(step.target);
  if (!target) return nextStep();
  target.classList.add("tutorial-highlight");
  positionTutorialSpotlight(target);
  $("tutorialTitle").textContent = step.title;
  $("tutorialText").textContent = step.text;
  $("tutorialStepCount").textContent = `${activeStep + 1} of ${steps.length}`;
  $("tutorialNext").textContent = activeStep === steps.length - 1 ? "Done" : "Next";
  setGestureMotion(step.motion);
  positionTutorialStep();
  $("tutorialNext").focus({ preventScroll: true });
}

function setGestureMotion(motion) {
  const cue = $("tutorialGesture");
  cue.className = `tutorial-gesture ${motion}`;
}

function positionTutorialStep() {
  const step = steps[activeStep];
  const target = $(step.target);
  const popover = $("tutorialPopover");
  if (!target || !popover) return;

  const rect = target.getBoundingClientRect();
  const gap = 14;
  const width = Math.min(320, window.innerWidth - 32);
  popover.style.width = `${width}px`;

  const placeBelow = rect.top < window.innerHeight * 0.5;
  const top = placeBelow
    ? Math.min(rect.bottom + gap, window.innerHeight - popover.offsetHeight - 16)
    : Math.max(16, rect.top - popover.offsetHeight - gap);
  const left = Math.min(Math.max(16, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 16);

  popover.style.transform = `translate(${left}px, ${top}px)`;
  positionTutorialSpotlight(target);
}

function positionTutorialSpotlight(target) {
  const spotlight = $("tutorialSpotlight");
  if (!spotlight || !target) return;
  const rect = target.getBoundingClientRect();
  const padding = 8;
  spotlight.style.width = `${rect.width + padding * 2}px`;
  spotlight.style.height = `${rect.height + padding * 2}px`;
  spotlight.style.transform = `translate(${rect.left - padding}px, ${rect.top - padding}px)`;
}
