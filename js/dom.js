export const $ = id => document.getElementById(id);
export const show = el => el.classList.remove("hidden");
export const hide = el => el.classList.add("hidden");

export function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("visible");
  window.setTimeout(() => el.classList.remove("visible"), 1800);
}
