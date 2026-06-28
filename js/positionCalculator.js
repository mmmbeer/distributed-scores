// js/positionCalculator.js

class PositionCalculator {
  constructor() {
    this.BACK_ROW = new Set([1, 6, 5]);
    this.FRONT_ROW = new Set([2, 3, 4]);

    // ---------- Serve receive shapes (5–1 base; 6–2 remapped per rotation) ----------
    // Based on the cheatsheets, serve receive formations
    this.serveReceive = {
      '5-1': {
        1: {
          primary: { setter: '1b', outside1: '4a', outside2: '5c', middle1: '3c', middle2: '6a', opposite: '2b', passers: ['outside1', 'outside2', 'middle2'] },
          stacked: { setter: '1a', outside1: '4a', outside2: '5b', middle1: '3a', middle2: '6c', opposite: '2c', passers: ['outside1', 'outside2', 'middle2'] },
          spread:  { setter: '1c', outside1: '4b', outside2: '5a', middle1: '3b', middle2: '6b', opposite: '2a', passers: ['outside1', 'outside2', 'middle2'] }
        },
        2: {
          primary: { setter: '6b', outside1: '5a', outside2: '4c', middle1: '2b', middle2: '1c', opposite: '3a', passers: ['outside1', 'outside2', 'middle2'] },
          stacked: { setter: '6a', outside1: '5b', outside2: '4b', middle1: '2a', middle2: '1b', opposite: '3c', passers: ['outside1', 'outside2', 'middle2'] },
          spread:  { setter: '6c', outside1: '5c', outside2: '4a', middle1: '2c', middle2: '1a', opposite: '3b', passers: ['outside1', 'outside2', 'middle2'] }
        },
        3: {
          primary: { setter: '5b', outside1: '6a', outside2: '3c', middle1: '1b', middle2: '2a', opposite: '4b', passers: ['outside1', 'outside2', 'middle2'] },
          stacked: { setter: '5a', outside1: '6b', outside2: '3b', middle1: '1a', middle2: '2b', opposite: '4c', passers: ['outside1', 'outside2', 'middle2'] },
          spread:  { setter: '5c', outside1: '6c', outside2: '3a', middle1: '1c', middle2: '2c', opposite: '4a', passers: ['outside1', 'outside2', 'middle2'] }
        },
        4: {
          primary: { setter: '4b', outside1: '3a', outside2: '2c', middle1: '6b', middle2: '1a', opposite: '5b', passers: ['outside1', 'outside2', 'middle2'] },
          stacked: { setter: '4a', outside1: '3b', outside2: '2b', middle1: '6a', middle2: '1b', opposite: '5c', passers: ['outside1', 'outside2', 'middle2'] },
          spread:  { setter: '4c', outside1: '3c', outside2: '2a', middle1: '6c', middle2: '1c', opposite: '5a', passers: ['outside1', 'outside2', 'middle2'] }
        },
        5: {
          primary: { setter: '3b', outside1: '2a', outside2: '1c', middle1: '5b', middle2: '6a', opposite: '4b', passers: ['outside1', 'outside2', 'middle2'] },
          stacked: { setter: '3a', outside1: '2b', outside2: '1b', middle1: '5a', middle2: '6b', opposite: '4c', passers: ['outside1', 'outside2', 'middle2'] },
          spread:  { setter: '3c', outside1: '2c', outside2: '1a', middle1: '5c', middle2: '6c', opposite: '4a', passers: ['outside1', 'outside2', 'middle2'] }
        },
        6: {
          primary: { setter: '2b', outside1: '1a', outside2: '6c', middle1: '4b', middle2: '5a', opposite: '3b', passers: ['outside1', 'outside2', 'middle2'] },
          stacked: { setter: '2a', outside1: '1b', outside2: '6b', middle1: '4a', middle2: '5b', opposite: '3c', passers: ['outside1', 'outside2', 'middle2'] },
          spread:  { setter: '2c', outside1: '1c', outside2: '6a', middle1: '4c', middle2: '5c', opposite: '3a', passers: ['outside1', 'outside2', 'middle2'] }
        }
      }
    };

    // ---------- Defense formations based on cheatsheets ----------
    const L = (playerId, subZone) => ({ playerId, subZone });
    this.defense = {
      left: { // vs Outside Hitter (OH)
        '5-1': {
          base: {
            1: [L('setter','b')],
            2: [L('opposite','b')],
            3: [L('middle1','b')],
            4: [L('outside1','b')],
            5: [L('outside2','b')],
            6: [L('middle2','b')]
          }
        }
      },
      middle: { // vs Middle Blocker (MB) - quick attack
        '5-1': {
          base: {
            1: [L('setter','b')],
            2: [L('opposite','b')],
            3: [L('middle1','b'), L('outside1','a')],
            4: [L('outside1','b')],
            5: [L('outside2','b')],
            6: [L('middle2','b')]
          }
        }
      },
      right: { // vs Right Side/Opposite (RS)
        '5-1': {
          base: {
            1: [L('setter','b')],
            2: [L('opposite','b')],
            3: [L('middle1','b')],
            4: [L('outside1','b')],
            5: [L('outside2','b')],
            6: [L('middle2','b')]
          }
        }
      }
    };
  }

  // ---------- Public API ----------

  getFormation(phase, system, rotation, opts = {}) {
    const {
      useLibero = true,
      useDS = false,
      dsFor = 'opposite',
      attackSide = 'left',
      serveReceiveVariant = 'primary',
      blockPattern = 'double'
    } = opts;

    if (!rotation || rotation < 1 || rotation > 6) return this._err('Rotation must be 1..6');

    if (phase === 'starting') {
      const base = this._getStartingPositions(system, rotation);
      if (!base) return this._err(`No starting for ${system} R${rotation}`);
      const withSubs = this._applyBackRowSubs(base, { useLibero, useDS, dsFor, system });
      return {
        gamePhase: 'starting',
        allowMultiple: false,
        showSubZones: false,
        positions: withSubs,
        meta: { system, rotation }
      };
    }

    if (phase === 'serve-receive') {
      const seed = this._clone(this.serveReceive['5-1']?.[rotation]?.[serveReceiveVariant]);
      if (!seed) return this._err(`No SR shape for R${rotation}/${serveReceiveVariant}`);
      let sr = seed;
      if (system === '6-2') sr = this._remapSRfor62(sr, rotation);
      sr = this._applySRSubs(sr, { useLibero, useDS, dsFor });
      const switchTargets = this._computeSRSwitchTargets(system, rotation, sr);
      return {
        gamePhase: 'serve-receive',
        allowMultiple: true,
        showSubZones: true,
        formation: serveReceiveVariant,
        positions: this._toMulti(sr),
        meta: { system, rotation, passers: sr.passers || [], switchTargets }
      };
    }

    if (phase === 'defending') {
      // Create base defense formation from cheatsheet data
      let pack = this._createDefenseFromCheatsheet(system, rotation, attackSide);
      if (!pack) return this._err(`No defense vs ${attackSide}`);
      pack = this._applyDefenseSubs(pack, { useLibero, useDS });
      pack = this._applyBlockPattern(pack, attackSide, blockPattern);
      return {
        gamePhase: 'defending',
        allowMultiple: true,
        showSubZones: true,
        attackSide,
        positions: pack,
        meta: { system, rotation, blockPattern }
      };
    }

    return this._err(`Unknown phase: ${phase}`);
  }

  // ---------- Create defense from cheatsheet data ----------
  _createDefenseFromCheatsheet(system, rotation, attackSide) {
    // Map cheatsheet positions to our format
    const cheatsheetData = this._getCheatsheetDefense(system, rotation, attackSide);
    if (!cheatsheetData) return null;

    const pack = {};
    for (const [role, position] of Object.entries(cheatsheetData)) {
      const zone = this.getMainPosition(position);
      const subZone = this.getSubZone(position) || 'b';
      
      if (!pack[zone]) pack[zone] = [];
      pack[zone].push({ playerId: role, subZone });
    }
    
    return pack;
  }

  _getCheatsheetDefense(system, rotation, attackSide) {
    // Base defense formations from cheatsheets
    const defenseMap = {
      '5-1': {
        1: { left: { outside1: '4b', middle1: '3b', opposite: '2b', setter: '1b', outside2: '5b', middle2: '6b' } },
        2: { left: { outside1: '5b', middle1: '3b', opposite: '2b', setter: '6b', outside2: '4b', middle2: '1b' } },
        3: { left: { outside1: '6b', middle1: '3b', opposite: '4b', setter: '5b', outside2: '2b', middle2: '1b' } },
        4: { left: { outside1: '3b', middle1: '6b', opposite: '5b', setter: '4b', outside2: '1b', middle2: '2b' } },
        5: { left: { outside1: '2b', middle1: '5b', opposite: '4b', setter: '3b', outside2: '6b', middle2: '1b' } },
        6: { left: { outside1: '1b', middle1: '4b', opposite: '3b', setter: '2b', outside2: '5b', middle2: '6b' } }
      },
      '6-2': {
        1: { left: { outside1: '4b', middle1: '3b', setter2: '2b', setter: '1b', outside2: '5b', middle2: '6b' } },
        2: { left: { outside1: '5b', middle1: '3b', setter2: '2b', setter: '6b', outside2: '4b', middle2: '1b' } },
        3: { left: { outside1: '6b', middle1: '3b', setter: '4b', setter2: '5b', outside2: '2b', middle2: '1b' } },
        4: { left: { outside1: '3b', middle1: '6b', setter: '5b', setter2: '4b', outside2: '1b', middle2: '2b' } },
        5: { left: { outside1: '2b', middle1: '5b', setter2: '4b', setter: '3b', outside2: '6b', middle2: '1b' } },
        6: { left: { outside1: '1b', middle1: '4b', setter2: '3b', setter: '2b', outside2: '5b', middle2: '6b' } }
      }
    };

    // For now, using left defense pattern for all attack sides
    return defenseMap[system]?.[rotation]?.left;
  }

  validatePositions(currentPositions, expected) {
    const { gamePhase, positions } = expected || {};
    if (!positions) return this._err('Missing expected formation');
    if (gamePhase === 'starting') return this._validateStarting(currentPositions, positions);
    return this._validateMulti(currentPositions, positions);
  }

  getAvailableFormations(phase) {
    if (phase === 'starting') return ['standard'];
    if (phase === 'serve-receive') return ['primary', 'stacked', 'spread'];
    if (phase === 'defending') return ['left', 'middle', 'right'];
    return [];
  }

  getFormationExplanation(phase, system, rotation, opts = {}) {
    const { attackSide = 'left', serveReceiveVariant = 'primary' } = opts;
    if (phase === 'starting') return `${system} R${rotation}: legal rotational order — one per zone.`;
    if (phase === 'serve-receive') return `${system} R${rotation} SR (${serveReceiveVariant}): three-pass lane, setter hidden.`;
    if (phase === 'defending') return `Defense vs ${attackSide}: call block, set line/cross, dig tips.`;
    return 'Formation';
  }

  getLearningTips(phase) {
    if (phase === 'starting') return ['Unique zones 1–6', 'Front row 4-3-2, back row 5-6-1', 'Transition after serve'];
    if (phase === 'serve-receive') return ['Three passers', 'Hide setter', 'Legal stacks if order kept'];
    if (phase === 'defending') return ['Middle calls block', 'Define line/cross', 'Libero stays back row'];
    return [];
  }

  // ---------- Substitution / role remap helpers ----------

  _applyBackRowSubs(base, { useLibero, useDS, dsFor, system }) {
    const out = this._clone(base);

    // Libero replaces a back-row middle
    if (useLibero) {
      const candidate = Object.entries(out).find(([role, z]) => role.startsWith('middle') && this.BACK_ROW.has(z));
      if (candidate) {
        const [role, zone] = candidate;
        delete out[role];
        out.libero = zone;
      }
    }

    // DS replaces chosen back-row role if present
    if (useDS) {
      const t = dsFor;
      const z = out[t];
      if (z && this.BACK_ROW.has(z)) {
        delete out[t];
        out.ds = z;
      }
    }

    // 6–2 never has 'opposite' as a separate role
    if (system === '6-2' && out.opposite) delete out.opposite;

    return this._ensureUniqueZones(out);
  }

  _applySRSubs(srShape, { useLibero, useDS, dsFor }) {
    const out = this._clone(srShape);

    if (useLibero) {
      const midBack = ['middle2','middle1'].find(r => this._isBackRowSubZone(out[r]));
      if (midBack) { out.libero = out[midBack]; delete out[midBack]; }
      if (out.passers) out.passers = out.passers.map(p => (p === midBack ? 'libero' : p));
    }

    if (useDS && out[dsFor] && this._isBackRowSubZone(out[dsFor])) {
      out.ds = out[dsFor];
      delete out[dsFor];
      if (out.passers) out.passers = out.passers.map(p => (p === dsFor ? 'ds' : p));
    }

    return out;
  }

  _applyDefenseSubs(pack, { useLibero, useDS }) {
    const out = this._clone(pack);
  
    // Libero: replace a back-row middle (zones 6, 5, 1). If none, anchor L at 6b.
    if (useLibero) {
      const backZones = [6, 5, 1];
      let replaced = false;
      for (const z of backZones) {
        const arr = out[z] || [];
        const idx = arr.findIndex(p => p.playerId && p.playerId.startsWith('middle'));
        if (idx >= 0) {
          const sub = arr[idx].subZone || 'b';
          arr.splice(idx, 1, { playerId: 'libero', subZone: sub });
          out[z] = arr;
          replaced = true;
          break;
        }
      }
      if (!replaced) {
        out[6] = out[6] || [];
        if (!out[6].some(p => p.playerId === 'libero')) out[6].push({ playerId: 'libero', subZone: 'b' });
      }
      // ensure only one libero across all zones
      let seenL = false;
      for (const z of Object.keys(out)) {
        out[z] = (out[z] || []).filter(p => {
          if (p.playerId !== 'libero') return true;
          if (seenL) return false;
          seenL = true;
          return true;
        });
      }
    }
  
    // DS: replace an opposite in the back row if present; otherwise add a single DS anchor at 5b
    if (useDS) {
      let replaced = false;
      for (const z of [1, 6, 5]) {
        const arr = out[z] || [];
        const i = arr.findIndex(x => x.playerId === 'opposite');
        if (i >= 0) {
          arr[i] = { playerId: 'ds', subZone: arr[i].subZone || 'b' };
          out[z] = arr;
          replaced = true;
          break;
        }
      }
      if (!replaced) {
        const hasDS = Object.values(out).flat().some(x => x.playerId === 'ds');
        if (!hasDS) {
          out[5] = out[5] || [];
          out[5].push({ playerId: 'ds', subZone: 'b' });
        }
      }
    }
  
    return out;
  }

  // Remap serve receive for 6-2
  _remapSRfor62(sr, rotation) {
    // Decide which setter is back-row using _getStartingPositions
    const start = this._getStartingPositions('6-2', rotation);
    if (!start) return this._clone(sr);

    const backIsSetter1 = this.BACK_ROW.has(start.setter);
    const setterBack  = backIsSetter1 ? 'setter'  : 'setter2';
    const setterFront = backIsSetter1 ? 'setter2' : 'setter';

    const out = this._clone(sr);

    // Map generic 5–1 SR roles to 6–2 tokens
    if (out.setter)   { out[setterBack]  = out.setter;   delete out.setter; }
    if (out.opposite) { out[setterFront] = out.opposite; delete out.opposite; }

    // Clean passers list to match the remap
    if (out.passers) {
      out.passers = out.passers
        .map(p => (p === 'setter' ? setterBack : p))
        .map(p => (p === 'opposite' ? setterFront : p))
        .filter(p => out[p]);
    }

    return out;
  }

  _remapDefensefor62(pack, rotation) {
    // Decide which setter is back-row using _getStartingPositions
    const start = this._getStartingPositions('6-2', rotation);
    if (!start) return this._clone(pack);

    const backIsSetter1 = this.BACK_ROW.has(start.setter);
    const setterBack  = backIsSetter1 ? 'setter'  : 'setter2';
    const setterFront = backIsSetter1 ? 'setter2' : 'setter';

    const out = this._clone(pack);
    for (const z of Object.keys(out)) {
      out[z] = (out[z] || []).map(p => {
        if (p.playerId === 'setter')   return { ...p, playerId: setterBack };
        if (p.playerId === 'opposite') return { ...p, playerId: setterFront };
        return p;
      });
    }
    return out;
  }

  // ---------- Validation ----------

  _validateStarting(currentUI, expectedRolesToZones) {
    const current = {};
    for (const [zoneStr, arr] of Object.entries(currentUI || {})) {
      const zone = parseInt(zoneStr, 10);
      if (!arr || !arr.length) continue;
      const p = arr[0];
      current[p.playerId] = zone;
    }

    const result = {
      isCorrect: true,
      correctCount: 0,
      totalExpected: Object.keys(expectedRolesToZones).length,
      accuracy: 0,
      correctPlayers: [],
      incorrectPlayers: [],
      missingPlayers: [],
      legality: this._checkRotationLegality(current)
    };

    for (const [role, zone] of Object.entries(expectedRolesToZones)) {
      const seen = current[role];
      if (seen === zone) {
        result.correctCount++;
        result.correctPlayers.push(role);
      } else {
        result.isCorrect = false;
        if (seen) result.incorrectPlayers.push({ playerId: role, currentPosition: seen, correctPosition: zone });
        else result.missingPlayers.push({ playerId: role, correctPosition: zone });
      }
    }

    result.accuracy = Math.round((result.correctCount / result.totalExpected) * 100);
    return result;
  }

  _validateMulti(currentUI, expectedZonesToPlayers) {
    const details = {};
    let correctCount = 0;
    let expectedTotal = 0;
    const incorrectPlayers = [];
    const missingPlayers = [];
    const correctPlayers = [];

    for (const [zoneStr, expectArr] of Object.entries(expectedZonesToPlayers)) {
      const zone = parseInt(zoneStr, 10);
      const placed = currentUI?.[zone] || [];
      details[zone] = { expected: expectArr.length, current: placed.length, correct: 0, playerDetails: [] };
      expectedTotal += expectArr.length;

      for (const exp of expectArr) {
        const hit = placed.find(p => p.playerId === exp.playerId && (!exp.subZone || p.subZone === exp.subZone));
        if (hit) {
          correctCount++;
          correctPlayers.push({ playerId: exp.playerId, position: zone, subZone: exp.subZone });
          details[zone].correct++;
          details[zone].playerDetails.push({ playerId: exp.playerId, status: 'correct' });
        } else {
          const wrong = this._findPlayer(currentUI, exp.playerId);
          if (wrong) {
            incorrectPlayers.push({ playerId: exp.playerId, correctPosition: zone, correctSubZone: exp.subZone, currentPosition: wrong.position, currentSubZone: wrong.subZone });
          } else {
            missingPlayers.push({ playerId: exp.playerId, correctPosition: zone, correctSubZone: exp.subZone });
          }
          details[zone].playerDetails.push({ playerId: exp.playerId, status: 'missing' });
        }
      }
    }

    return {
      isCorrect: incorrectPlayers.length === 0 && missingPlayers.length === 0,
      correctCount,
      totalExpected: expectedTotal,
      accuracy: expectedTotal ? Math.round((correctCount / expectedTotal) * 100) : 0,
      correctPlayers,
      incorrectPlayers,
      missingPlayers,
      details
    };
  }

  // ---------- Utilities ----------

  _toMulti(single) {
    const out = {};
    for (const [key, val] of Object.entries(single)) {
      if (key === 'passers') continue;
      const zone = this.getMainPosition(val);
      const subZone = this.getSubZone(val);
      out[zone] = out[zone] || [];
      out[zone].push({ playerId: key, subZone });
    }
    return out;
  }

  _ensureUniqueZones(roleToZone) {
    const used = new Set();
    for (const [role, z] of Object.entries(roleToZone)) {
      if (used.has(z)) {
        const alt = [6,5,1,3,2,4].find(k => !Object.values(roleToZone).includes(k));
        if (alt) roleToZone[role] = alt;
      }
      used.add(roleToZone[role]);
    }
    return roleToZone;
  }

  _findPlayer(current, playerId) {
    for (const [zoneStr, arr] of Object.entries(current || {})) {
      const zone = parseInt(zoneStr, 10);
      const hit = (arr || []).find(p => p.playerId === playerId);
      if (hit) return { position: zone, subZone: hit.subZone || null };
    }
    return null;
  }

  _isBackRowSubZone(token) {
    const zone = this.getMainPosition(token);
    return this.BACK_ROW.has(zone);
  }

  getMainPosition(position) {
    if (typeof position === 'number') return position;
    if (typeof position === 'string') { const m = position.match(/^(\d+)/); return m ? parseInt(m[1], 10) : null; }
    return null;
  }

  getSubZone(position) {
    if (typeof position === 'string') { const m = position.match(/^(\d+)([abc])$/); return m ? m[2] : null; }
    return null;
  }

  _clone(x) { return JSON.parse(JSON.stringify(x)); }

  _err(msg) {
    console.error(`[PositionCalculator] ${msg}`);
    return { gamePhase: 'invalid', error: msg };
  }

  // ---------- Defense helpers ----------

  _applyBlockPattern(pack, attackSide, pattern) {
    const out = this._clone(pack);
    
    if (pattern === 'double') {
      if (attackSide === 'left') {
        // Two blockers at zone 4: OH + MB
        const zone4 = out[4] || [];
        const zone3 = out[3] || [];
        
        // Move middle from zone 3 to zone 4 if not already there
        const middleIdx = zone3.findIndex(p => p.playerId.startsWith('middle'));
        if (middleIdx >= 0) {
          const middle = zone3.splice(middleIdx, 1)[0];
          zone4.push({ ...middle, subZone: 'a' });
        }
        
        out[3] = zone3.length ? zone3 : undefined;
        out[4] = zone4;
      } else if (attackSide === 'right') {
        // Two blockers at zone 2: RS + MB
        const zone2 = out[2] || [];
        const zone3 = out[3] || [];
        
        const middleIdx = zone3.findIndex(p => p.playerId.startsWith('middle'));
        if (middleIdx >= 0) {
          const middle = zone3.splice(middleIdx, 1)[0];
          zone2.push({ ...middle, subZone: 'c' });
        }
        
        out[3] = zone3.length ? zone3 : undefined;
        out[2] = zone2;
      }
    }
    
    // Clean up empty zones
    for (const zone of Object.keys(out)) {
      if (!out[zone] || out[zone].length === 0) {
        delete out[zone];
      }
    }
    
    return out;
  }

  _computeSRSwitchTargets(system, rotation, srShape) {
    const targets = {};

    if (system === '6-2') {
      const start = this._getStartingPositions('6-2', rotation);
      if (start) {
        const backIsSetter1 = this.BACK_ROW.has(start.setter);
        const setterBack  = backIsSetter1 ? 'setter'  : 'setter2';
        const setterFront = backIsSetter1 ? 'setter2' : 'setter';

        if (srShape[setterBack])  targets[setterBack]  = 1;
        if (srShape[setterFront]) targets[setterFront] = 2;
      }
    } else {
      if (srShape.setter)   targets.setter   = 1;
      if (srShape.opposite) targets.opposite = 2;
    }

    // Shared targets
    if (srShape.middle1)  targets.middle1  = 3;
    if (srShape.middle2)  targets.middle2  = 3;
    if (srShape.outside1) targets.outside1 = 4;

    if (srShape.outside2) {
      const o2Zone = this.getMainPosition(srShape.outside2);
      targets.outside2 = (o2Zone === 6) ? 6 : 5;
    }

    if (srShape.libero) targets.libero = 6;
    if (srShape.ds)     targets.ds     = this.getMainPosition(srShape.ds);

    return targets;
  }

  // Helper for rotation legality check
  _checkRotationLegality(current) {
    // Basic check - each zone should have exactly one player
    const zones = Object.values(current);
    const uniqueZones = new Set(zones);
    
    return {
      isLegal: zones.length === 6 && uniqueZones.size === 6,
      issues: zones.length !== 6 ? ['Missing players'] : uniqueZones.size !== 6 ? ['Duplicate positions'] : []
    };
  }

  // Get starting positions helper
  _getStartingPositions(system, rotation) {
    // Court ring order (clockwise on sideout): 1 → 6 → 5 → 4 → 3 → 2
    const ringZones = [1, 6, 5, 4, 3, 2];

    // Base R1 roles in ring order.
    // 5–1: S-1, MB2-6, OH2-5, OH1-4, MB1-3, OPP-2
    const baseRoles51 = ['setter', 'middle2', 'outside2', 'outside1', 'middle1', 'opposite'];

    // 6–2: S-1 (back-row setter), MB2-6, OH2-5, OH1-4, MB1-3, S2-2 (front-row setter/RS)
    const baseRoles62 = ['setter', 'middle2', 'outside2', 'outside1', 'middle1', 'setter2'];

    const baseRoles =
      system === '6-2' ? baseRoles62 :
      system === '5-1' ? baseRoles51 : null;

    if (!baseRoles) return null;

    // Rotate roles around the ring by (rotation-1)
    const shift = ((rotation - 1) % 6 + 6) % 6;
    const rolesForZones = baseRoles.map((_, i) => baseRoles[(i - shift + 6) % 6]);

    const map = {};
    for (let i = 0; i < 6; i++) map[rolesForZones[i]] = ringZones[i];
    return map;
  }
}

window.PositionCalculator = PositionCalculator;