// js/gameController.js

class GameController {
  constructor() {
    this.positionCalculator = new PositionCalculator();
    this.dragDropHandler = new DragDropHandler();

    this.currentSettings = {
      offenseType: '5-1',
      rotation: 1,
      gamePhase: 'starting',
      attackPosition: 'left-attack',
      blockPattern: 'double',
      formation: 'primary',
      useLibero: true,
      useDS: false,
      dsFor: 'opposite'
    };

    this.lastOffenseType = this.currentSettings.offenseType;
    this.isShowingCorrect = false;
    this.currentFormation = null;
    this._ghosts = [];

    this.initializeController();
  }

  initializeController() {
    this.setupEventListeners();
    this.setupDragDropCallback();

    this.currentSettings = Utils.getCurrentSettings();
    this.updateRosterForSystem(this.currentSettings.offenseType);
    this.dragDropHandler.setGamePhase(this.currentSettings.gamePhase);
    this.updateGamePhaseSettings();
    this.loadCurrentFormation();
    this.updateDisplay();

    Utils.addEventListener(document, 'dragover', e => e.preventDefault());
  }

  setupEventListeners() {
    const controls = [
      { id: 'offense-type', handler: () => this.handleSettingsChange() },
      { id: 'rotation', handler: () => this.handleSettingsChange() },
      { id: 'game-phase', handler: () => this.handleGamePhaseChange() },
      { id: 'attack-position', handler: () => this.handleAttackPositionChange() },
      { id: 'block-pattern', handler: () => this.handleBlockPatternChange() },
      { id: 'formation-type', handler: () => this.handleFormationChange() },
      { id: 'use-libero', handler: () => this.handleLiberoToggle() },
      { id: 'use-ds', handler: () => this.handleDSToggle() },
      { id: 'ds-for', handler: () => this.handleDSForChange() }
    ];

    controls.forEach(c => {
      const el = Utils.getElementById(c.id);
      if (el) Utils.addEventListener(el, 'change', c.handler);
    });

    const buttons = [
      { id: 'show-correct', handler: () => this.showCorrectPositions() },
      { id: 'reset', handler: () => this.resetGame() },
      { id: 'check-positions', handler: () => this.checkCurrentPositions() },
      { id: 'show-tips', handler: () => this.showLearningTips() }
    ];
    buttons.forEach(b => {
      const el = Utils.getElementById(b.id);
      if (el) Utils.addEventListener(el, 'click', b.handler);
    });

    document.querySelectorAll('.opponent-hitter').forEach(h => {
      Utils.addEventListener(h, 'click', e => this.handleOpponentHitterClick(e));
    });
  }

  setupDragDropCallback() {
    this.dragDropHandler.setPositionChangeCallback(() => this.handlePositionChange());
  }

  // --- System-aware bench (adds setter2, hides opposite for 6–2) ---

  updateRosterForSystem(system) {
    const opposite = Utils.getElementById('opposite');
    const setter = Utils.getElementById('setter');

    if (system === '6-2') {
      // ensure setter2 exists
      const s2 = Utils.ensurePlayerToken({
        id: 'setter2',
        role: 'setter2',
        label: 'S2',
        title: 'Setter 2 – in 6–2, whichever setter is front-row attacks at RS'
      });

      if (s2) {
        // rebind drag events for any new token
        this.dragDropHandler.setupPlayerDragEvents?.();
      }

      // hide opposite token
      if (opposite) {
        this.dragDropHandler.movePlayerToBench(opposite);
        opposite.style.display = 'none';
      }

      // setters visible
      if (setter) setter.style.display = 'flex';
      if (s2) s2.style.display = 'flex';
    } else { // 5–1
      // show opposite
      if (opposite) opposite.style.display = 'flex';

      // hide setter2 if present
      const s2 = Utils.getElementById('setter2');
      if (s2) {
        this.dragDropHandler.movePlayerToBench(s2);
        s2.style.display = 'none';
      }
      if (setter) setter.style.display = 'flex';
    }
  }

  // ——— Settings handlers

  handleGamePhaseChange() {
    const prev = this.currentSettings.gamePhase;
    this.currentSettings = Utils.getCurrentSettings();

    this.dragDropHandler.setGamePhase(this.currentSettings.gamePhase);
    this.updateGamePhaseSettings();
    this.clearPositionFeedback();
    this.isShowingCorrect = false;
    this.dragDropHandler.resetPlayersToBench();

    this.loadCurrentFormation();

    const expl = this.positionCalculator.getFormationExplanation(
      this.currentSettings.gamePhase,
      this.currentSettings.offenseType,
      this.currentSettings.rotation,
      {
        attackSide: Utils.mapAttackToSide(this.currentSettings.attackPosition),
        serveReceiveVariant: this.currentSettings.formation
      }
    );
    Utils.showFeedback(`${this.currentSettings.gamePhase.toUpperCase()}: ${expl}`, 'info');
  }

  handleAttackPositionChange() {
    this.currentSettings = Utils.getCurrentSettings();
    this.updateOpponentHittersUI();
    this.clearPositionFeedback();
    this.isShowingCorrect = false;

    if (this.currentSettings.gamePhase === 'defending') {
      this.loadCurrentFormation();
      Utils.showFeedback(this.getAttackDescription(this.currentSettings.attackPosition), 'info');
    }
  }

  handleBlockPatternChange() {
    this.currentSettings = Utils.getCurrentSettings();
    if (this.currentSettings.gamePhase === 'defending') {
      this.loadCurrentFormation();
      Utils.showFeedback(`Block: ${this.currentSettings.blockPattern}`, 'info');
    }
  }

  handleFormationChange() {
    this.currentSettings = Utils.getCurrentSettings();
    this.clearPositionFeedback();
    this.isShowingCorrect = false;
    if (this.currentSettings.gamePhase === 'serve-receive') {
      this.loadCurrentFormation();
      Utils.showFeedback(`Formation: ${this.currentSettings.formation}`, 'info');
    }
  }

  handleLiberoToggle() {
    this.currentSettings = Utils.getCurrentSettings();
    this.updatePlayerVisibility();
    this.clearPositionFeedback();
    this.isShowingCorrect = false;
    Utils.showFeedback(this.currentSettings.useLibero ? 'Libero enabled' : 'Libero disabled', 'info');
    this.loadCurrentFormation();
  }

  handleDSToggle() {
    this.currentSettings = Utils.getCurrentSettings();
    this.updatePlayerVisibility();
    this.clearPositionFeedback();
    this.isShowingCorrect = false;
    Utils.showFeedback(this.currentSettings.useDS ? 'DS enabled' : 'DS disabled', 'info');
    this.loadCurrentFormation();
  }

  handleDSForChange() {
    this.currentSettings = Utils.getCurrentSettings();
    if (this.currentSettings.gamePhase !== 'starting') this.loadCurrentFormation();
  }

  handleSettingsChange() {
    const prevSystem = this.currentSettings.offenseType;
    this.currentSettings = Utils.getCurrentSettings();

    if (prevSystem !== this.currentSettings.offenseType) {
      this.dragDropHandler.resetPlayersToBench();
      this.updateRosterForSystem(this.currentSettings.offenseType);
    }

    this.updateGamePhaseSettings();
    this.clearPositionFeedback();
    this.isShowingCorrect = false;
    this.loadCurrentFormation();
  }

  // ——— UI switches

  updateGamePhaseSettings() {
    const { gamePhase } = this.currentSettings;
    this.updateFormationControls();
    this.updateAttackControls();
    this.updateOpponentHittersUI();
    this.updatePlayerVisibility();
    this.updateFormationOptions();
  }

  updateFormationControls() {
    const box = Utils.getElementById('formation-controls');
    if (!box) return;
    box.style.display = this.currentSettings.gamePhase === 'serve-receive' ? 'flex' : 'none';
  }

  updateAttackControls() {
    const box = Utils.getElementById('attack-controls');
    if (!box) return;
    box.style.display = this.currentSettings.gamePhase === 'defending' ? 'flex' : 'none';
  }

  updateFormationOptions() {
    const select = Utils.getElementById('formation-type');
    if (!select) return;
    const list = this.positionCalculator.getAvailableFormations(
      this.currentSettings.gamePhase,
      this.currentSettings.offenseType,
      this.currentSettings.rotation
    );
    select.innerHTML = '';
    list.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f;
      opt.textContent = f.charAt(0).toUpperCase() + f.slice(1);
      select.appendChild(opt);
    });
    if (list.length > 0) {
      select.value = list.includes(this.currentSettings.formation) ? this.currentSettings.formation : list[0];
      this.currentSettings.formation = select.value;
    }
  }

  updateOpponentHittersUI() {
    const { gamePhase, attackPosition } = this.currentSettings;
    const wrap = document.querySelector('.opponent-section');
    const tiles = document.querySelectorAll('.opponent-hitter');
    if (wrap) wrap.style.display = gamePhase === 'defending' ? 'flex' : 'none';
    tiles.forEach(t => {
      Utils.removeClass(t, 'active');
      const id = t.id.replace('opp-', '') + '-attack';
      if (id === attackPosition) Utils.addClass(t, 'active');
    });
  }

  updatePlayerVisibility() {
    const { useLibero, useDS } = this.currentSettings;
    const libero = Utils.getElementById('libero');
    const ds = Utils.getElementById('ds');
    if (libero) libero.style.display = useLibero ? 'flex' : 'none';
    if (ds) ds.style.display = useDS ? 'flex' : 'none';
  }

  // ——— Formation loading

  loadCurrentFormation() {
    const {
      gamePhase, offenseType, rotation,
      attackPosition, blockPattern, formation,
      useLibero, useDS, dsFor
    } = this.currentSettings;

    const opts = {
      useLibero, useDS, dsFor,
      attackSide: Utils.mapAttackToSide(attackPosition),
      serveReceiveVariant: formation,
      blockPattern
    };

    const f = this.positionCalculator.getFormation(gamePhase, offenseType, rotation, opts);
    this.currentFormation = f && !f.error ? f : null;

    if (this.currentFormation) this.updateDisplayForFormation();
  }

  updateDisplayForFormation() {
    const { allowMultiple, showSubZones } = this.currentFormation;
    this.dragDropHandler.toggleSubZones(!!showSubZones);
    this.updateMultiPlayerHints(!!allowMultiple);
  }

  updateMultiPlayerHints(allowMultiple) {
    const hint = Utils.getElementById('positioning-hint');
    if (!hint) return;
    if (allowMultiple) { hint.textContent = 'Multiple players can occupy the same position in different sub-zones'; hint.style.display = 'block'; }
    else { hint.style.display = 'none'; }
  }

  // ——— Actions

  // gameController.js — replace the entire showCorrectPositions method with this
showCorrectPositions() {
  if (!this.currentFormation || !this.currentFormation.positions) {
    Utils.showFeedback('No formation loaded', 'error');
    return;
  }

  this._clearGhosts();
  this.dragDropHandler.resetPlayersToBench();

  // Place expected tokens
  const placements = this._normalizePositionsForPlacing(this.currentFormation.positions, this.currentSettings.gamePhase);
  Object.keys(placements).forEach(zoneStr => {
    const zone = parseInt(zoneStr, 10);
    const el = Utils.getElementById(`pos-${zone}`);
    if (!el) return;
    placements[zone].forEach(p => {
      const player = Utils.getElementById(p.playerId);
      if (player) this.dragDropHandler.movePlayerToPosition(player, el, p.subZone || null);
    });
  });

  // SR: overlay switch targets as ghosts, but skip duplicates (same role already at target)
  if (this.currentSettings.gamePhase === 'serve-receive' && this.currentFormation.meta?.switchTargets) {
    this._placeGhostTargets(this.currentFormation.meta.switchTargets);
  }

  this.highlightCorrectPositions();
  this.isShowingCorrect = true;
  Utils.showFeedback(`Showing: ${this.getFormationDescription()}`, 'success');
}


  checkCurrentPositions() {
    if (!this.currentFormation) { Utils.showFeedback('No formation loaded to check against', 'error'); return; }
    const current = this.dragDropHandler.getCurrentPositions();
    const result = this.positionCalculator.validatePositions(current, this.currentFormation);
    this.displayValidationResults(result);
    this.highlightPositionCorrectness(result);
  }

  showLearningTips() {
    const tips = this.positionCalculator.getLearningTips(this.currentSettings.gamePhase, this.currentFormation);
    const list = tips.map((t, i) => `${i + 1}. ${t}`).join('\n');
    Utils.showFeedback(`Tips for ${this.currentSettings.gamePhase}:\n${list}`, 'info');
  }

  resetGame() {
    this.dragDropHandler.resetPlayersToBench();
    this._clearGhosts();
    this.clearPositionFeedback();
    this.isShowingCorrect = false;
    Utils.showFeedback('Reset complete.', 'info');
  }

  handlePositionChange() {
    this.clearPositionFeedback();
    this.isShowingCorrect = false;
    this._clearGhosts();
  }

  // ——— UI feedback and helpers

  displayValidationResults(v) {
    const { isCorrect, correctCount, totalExpected, accuracy, incorrectPlayers, missingPlayers } = v;
    if (isCorrect) { Utils.showFeedback(`Perfect! ${correctCount}/${totalExpected} (${accuracy}%)`, 'success'); return; }
    let msg = `${correctCount}/${totalExpected} correct (${accuracy}%). `;
    if (incorrectPlayers?.length) {
      const wrong = incorrectPlayers.map(p => `${this.getPlayerDisplayName(p.playerId)} wrong`).join(', ');
      msg += `Incorrect: ${wrong}. `;
    }
    if (missingPlayers?.length) {
      const miss = missingPlayers.map(p => `${this.getPlayerDisplayName(p.playerId)}→pos ${p.correctPosition}`).join(', ');
      msg += `Missing: ${miss}`;
    }
    Utils.showFeedback(msg, 'error');
  }

  highlightPositionCorrectness(v) {
    this.clearPositionFeedback();
    if (!v.details) return;
    Object.keys(v.details).forEach(pos => {
      const d = v.details[pos];
      const el = Utils.getElementById(`pos-${pos}`);
      if (!el) return;
      if (d.correct === d.expected && d.expected > 0) Utils.addClass(el, 'correct');
      else if (d.correct > 0) Utils.addClass(el, 'partial');
      else Utils.addClass(el, 'incorrect');
    });
  }

  clearPositionFeedback() {
    Utils.clearClassFromAll('.position', 'correct');
    Utils.clearClassFromAll('.position', 'incorrect');
    Utils.clearClassFromAll('.position', 'partial');
  }

  highlightCorrectPositions() {
    document.querySelectorAll('.position').forEach(el => {
      Utils.removeClass(el, 'incorrect'); Utils.removeClass(el, 'partial'); Utils.addClass(el, 'correct');
    });
  }

  getFormationDescription() {
    const { gamePhase, offenseType, rotation, attackPosition, formation, blockPattern } = this.currentSettings;
    let s = `${offenseType} ${gamePhase}`;
    if (gamePhase !== 'defending') s += ` (R${rotation})`;
    if (gamePhase === 'serve-receive' && formation !== 'primary') s += ` - ${formation}`;
    if (gamePhase === 'defending') s += ` vs ${attackPosition.replace('-attack', '')} [${blockPattern}]`;
    return s;
  }

  getAttackDescription(v) {
    const map = {
      'left-attack': 'Defending against left side attack (P4)',
      'middle-attack': 'Defending against quick/middle (P3)',
      'right-attack': 'Defending against right side attack (P2)',
      'back-attack': 'Defending against a back row/pipe attack'
    };
    return map[v] || 'Defense selected';
  }

  getPlayerDisplayName(playerId) {
    const el = Utils.getElementById(playerId);
    return el ? this.dragDropHandler.getPlayerDisplayName(el) : playerId;
  }

  updateDisplay() {}

  // ——— State save/load

  getCurrentGameState() {
    return {
      settings: this.currentSettings,
      positions: this.dragDropHandler.getCurrentPositions(),
      isShowingCorrect: this.isShowingCorrect,
      currentFormation: this.currentFormation
    };
  }

  loadGameState(state) {
    if (state.settings) {
      this.currentSettings = state.settings;
      const controls = [
        { id: 'offense-type', value: state.settings.offenseType },
        { id: 'rotation', value: String(state.settings.rotation) },
        { id: 'game-phase', value: state.settings.gamePhase },
        { id: 'attack-position', value: state.settings.attackPosition },
        { id: 'block-pattern', value: state.settings.blockPattern || 'double' },
        { id: 'formation-type', value: state.settings.formation },
        { id: 'use-libero', checked: !!state.settings.useLibero },
        { id: 'use-ds', checked: !!state.settings.useDS },
        { id: 'ds-for', value: state.settings.dsFor || 'opposite' }
      ];
      controls.forEach(c => {
        const el = Utils.getElementById(c.id);
        if (!el) return;
        if ('checked' in c) el.checked = c.checked;
        else el.value = c.value;
      });
    }

    this.updateRosterForSystem(this.currentSettings.offenseType);
    this.dragDropHandler.setGamePhase(this.currentSettings.gamePhase);
    this.currentFormation = state.currentFormation || null;

    if (state.positions) this.restorePlayerPositions(state.positions);

    this.isShowingCorrect = !!state.isShowingCorrect;
    this.updateGamePhaseSettings();
    this.updateDisplay();
  }

  restorePlayerPositions(saved) {
    this.dragDropHandler.resetPlayersToBench();
    Object.keys(saved).forEach(zoneStr => {
      const el = Utils.getElementById(`pos-${zoneStr}`);
      if (!el) return;
      saved[zoneStr].forEach(p => {
        const player = Utils.getElementById(p.playerId);
        if (player) this.dragDropHandler.movePlayerToPosition(player, el, p.subZone || null);
      });
    });
  }

  _normalizePositionsForPlacing(posObj, phase) {
    if (phase === 'starting') {
      const out = {};
      Object.entries(posObj).forEach(([role, zone]) => {
        if (!out[zone]) out[zone] = [];
        out[zone].push({ playerId: role, subZone: null });
      });
      return out;
    }
    return posObj;
  }

  handleOpponentHitterClick(e) {
    const tile = e.currentTarget;
    const val = tile.id.replace('opp-', '') + '-attack';
    const sel = Utils.getElementById('attack-position');
    if (sel) { sel.value = val; sel.dispatchEvent(new Event('change')); }
  }

  // gameController.js — replace the entire _placeGhostTargets method with this
_placeGhostTargets(targetMap) {
  // Avoid confusing overlays:
  // - skip ghost if the role doesn't exist on the bench (hidden or not created)
  // - skip ghost if the role is already at that target zone (same zone = no overlay)
  // - ensure one ghost per role
  const current = this.dragDropHandler.getCurrentPositions();

  Object.entries(targetMap).forEach(([role, zone]) => {
    const benchToken = Utils.getElementById(role);
    if (!benchToken) return; // role not present in this system (e.g., 'opposite' in 6–2)

    // Is this role already placed at the target zone? If yes, don't add a ghost.
    const alreadyHere = (current?.[zone] || []).some(p => p.playerId === role);
    if (alreadyHere) return;

    const ghost = benchToken.cloneNode(true);
    ghost.classList.add('ghost');
    ghost.removeAttribute('draggable');
    ghost.id = `${role}-ghost`;

    const posEl = Utils.getElementById(`pos-${zone}`);
    if (!posEl) return;

    posEl.appendChild(ghost);
    ghost.style.left = '50%';
    ghost.style.top = '50%';
    ghost.style.transform = 'translate(-50%,-50%)';
    this._ghosts.push(ghost);
  });
}


  _clearGhosts() { this._ghosts.forEach(g => g.remove()); this._ghosts.length = 0; }
}

window.GameController = GameController;
