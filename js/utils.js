// js/utils.js

const Utils = {
  getElementById(id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`Element with ID '${id}' not found`);
    return el;
  },

  addEventListener(el, event, handler, opts) {
    if (el && typeof handler === 'function') el.addEventListener(event, handler, opts);
    else console.warn('Invalid element or handler for addEventListener');
  },

  removeClass(el, className) { if (el?.classList) el.classList.remove(className); },
  addClass(el, className) { if (el?.classList) el.classList.add(className); },
  hasClass(el, className) { return !!(el?.classList && el.classList.contains(className)); },
  toggleClass(el, className) { if (el?.classList) el.classList.toggle(className); },

  clearClassFromAll(selector, className) {
    document.querySelectorAll(selector).forEach(el => this.removeClass(el, className));
  },

  showFeedback(message, type = 'info', duration = 5000) {
    const fb = this.getElementById('feedback');
    if (!fb) { console.log(`${type.toUpperCase()}: ${message}`); return; }
    fb.textContent = message;
    fb.className = `feedback ${type} show`;
    if (type !== 'error' && duration > 0) {
      setTimeout(() => this.removeClass(fb, 'show'), duration);
    }
  },

  clearFeedback() {
    const fb = this.getElementById('feedback');
    if (!fb) return;
    fb.textContent = '';
    fb.className = 'feedback';
  },

  mapAttackToSide(value) {
    switch (value) {
      case 'left-attack': return 'left';
      case 'right-attack': return 'right';
      case 'middle-attack': return 'middle';
      case 'back-attack': return 'middle';
      default: return 'left';
    }
  },

  getCurrentSettings() {
    const read = (id, def, parser = null) => {
      const el = this.getElementById(id);
      if (!el) return def;
      let val = el.type === 'checkbox' ? el.checked : el.value;
      if (parser) { try { val = parser(val); } catch { val = def; } }
      return val;
    };

    const offenseType = read('offense-type', '5-1');
    const rotation = read('rotation', 1, v => parseInt(v, 10));
    const gamePhase = read('game-phase', 'starting');
    const attackPosition = read('attack-position', 'left-attack');
    const blockPattern = read('block-pattern', 'double');
    const formation = read('formation-type', 'primary');
    const useLibero = read('use-libero', true);
    const useDS = read('use-ds', false);
    const dsFor = read('ds-for', 'opposite');

    return { offenseType, rotation, gamePhase, attackPosition, blockPattern, formation, useLibero, useDS, dsFor };
  },

  animateElement(el, styles, duration = 300, easing = 'ease') {
    if (!el) return Promise.resolve();
    return new Promise(resolve => {
      el.style.transition = `all ${duration}ms ${easing}`;
      Object.keys(styles).forEach(k => { el.style[k] = styles[k]; });
      setTimeout(() => { el.style.transition = ''; resolve(); }, duration);
    });
  },

  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (Array.isArray(obj)) return obj.map(x => this.deepClone(x));
    const out = {};
    Object.keys(obj).forEach(k => { out[k] = this.deepClone(obj[k]); });
    return out;
  },

  debounce(func, delay) {
    let t;
    return function(...args) {
      clearTimeout(t);
      t = setTimeout(() => func.apply(this, args), delay);
    };
  },

  throttle(func, limit) {
    let inFlight = false;
    return function(...args) {
      if (inFlight) return;
      func.apply(this, args);
      inFlight = true;
      setTimeout(() => { inFlight = false; }, limit);
    };
  },

  // Minimal helper for dynamic bench adjustments
  ensurePlayerToken({ id, role, label, title }) {
    let el = this.getElementById(id);
    if (el) return el;
    const bench = document.querySelector('.player-bench');
    if (!bench) return null;
    el = document.createElement('div');
    el.className = 'player';
    el.id = id;
    el.dataset.role = role;
    el.draggable = true;
    el.title = title || label;
    el.textContent = label;
    bench.appendChild(el);
    return el;
  },
  
  
  // --- viewport + device helpers (needed by app.js) ---
isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
},

getViewportSize() {
  return {
    width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
    height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
  };
},

isInViewport(el) {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const { width, height } = this.getViewportSize();
  return r.top >= 0 && r.left >= 0 && r.bottom <= height && r.right <= width;
},

scrollIntoView(el, behavior = 'smooth', block = 'center') {
  el?.scrollIntoView?.({ behavior, block, inline: 'nearest' });
}

  
  
};



window.Utils = Utils;
