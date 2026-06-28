// Volleyball Trainer — JSON-driven (5-1 / 6-2)
// Loads /data/51.json and /data/62.json, supports bench→court drag,
// libero configuration, opponent click-tests with an attack arrow,
// proximity targets + grading, mobile-friendly pointer events.

const $ = s => document.querySelector(s)
const $$ = s => Array.from(document.querySelectorAll(s))

// ------------------- Proximity scoring -------------------
class ProximityScorer {
  constructor(targets = []) { this.setTargets(targets) }
  setTargets(targets){ this.targets = (targets || []).map(t => ({ weight: 1, ...t })) }
  score(x, y){
    if (!this.targets.length) return { grade: 'miss', best: null, d: Infinity }
    let best = null, dmin = Infinity
    for (const t of this.targets){
      const d = Math.hypot(x - t.cx, y - t.cy)
      if (d < dmin){ dmin = d; best = t }
    }
    let grade = 'miss'
    if (dmin <= (best.rOk ?? best.rCorrect ?? 0.055)) grade = 'ok'
    else if (dmin <= (best.rNear ?? 0.12)) grade = 'near'
    return { grade, best, d: dmin }
  }
}

// Zones in clockwise order, starting RB (1)
const CW_ZONES = ['RB','CB','LB','LF','CF','RF'];

// Given a laneMap for R1 and a target rotation number, return the rotated lanes
function rotateLaneMapClockwise(r1LaneMap, rotationNumber){
  if (!r1LaneMap) return null
  // R1 means zero shift; R6 means shift by 1 step (RB->CB), R5 shift by 2, ... R2 shift by 5
  const shiftBy = ({1:0,6:1,5:2,4:3,3:4,2:5})[rotationNumber] ?? 0
  const out = {}
  for (let i=0;i<CW_ZONES.length;i++){
    const z = CW_ZONES[i]
    const whoAtZinR1 = r1LaneMap[z]             // e.g., RB:'S'
    const newZone = CW_ZONES[(i + shiftBy) % CW_ZONES.length]
    out[newZone] = whoAtZinR1
  }
  return out
}


// ------------------- Drag handler (pointer) -------------------
class Drag {
  constructor(container, onDrop, opts={}){
    this.container = container
    this.onDrop = onDrop
    this.rectProvider = opts.rectProvider || (() => this.container.getBoundingClientRect())
    this.onStart = opts.onStart || null
    this.active = null
    container.addEventListener('pointerdown', this._down, { passive: false })
    window.addEventListener('pointermove', this._move, { passive: false })
    window.addEventListener('pointerup', this._up)
    window.addEventListener('pointercancel', this._up)
  }
  _norm(e, rect){ return { x:(e.clientX-rect.left)/rect.width, y:(e.clientY-rect.top)/rect.height } }
  _down = e => {
    const el = e.target.closest('.marker')
    if (!el || !this.container.contains(el)) return
    e.preventDefault()
    el.setPointerCapture?.(e.pointerId)
    const rect = this.rectProvider()
    this.active = { el, id: e.pointerId, rect, started: false }
    el.classList.add('dragging')
    if (this.onStart){
      this.onStart(el, e, rect) // e.g., move bench piece into court layer
      this.active.started = true
    }
  }
  _move = e => {
    if (!this.active || e.pointerId !== this.active.id) return
    e.preventDefault()
    const { el } = this.active
    const rect = this.rectProvider()
    const n = this._norm(e, rect)
    const nx = Math.max(0.02, Math.min(0.98, n.x))
    const ny = Math.max(0.02, Math.min(0.98, n.y))
    el.style.left = `${nx*100}%`
    el.style.top  = `${ny*100}%`
  }
  _up = e => {
    if (!this.active || e.pointerId !== this.active.id) return
    const { el } = this.active
    el.classList.remove('dragging')
    const rect = this.rectProvider()
    const n = this._norm(e, rect)
    const nx = Math.max(0.02, Math.min(0.98, n.x))
    const ny = Math.max(0.02, Math.min(0.98, n.y))
    this.onDrop?.(el, { x:nx, y:ny })
    this.active = null
  }
}


// ------------------- Data store -------------------
class Playbook {
  constructor(){ this.cache = {} }
  async load(system){ // '5-1' or '6-2'
    if (this.cache[system]) return this.cache[system]
    const path = system === '5-1' ? '/data/51.json' : '/data/62.json'
    const res = await fetch(path, { cache: 'no-store' })
    const data = await res.json()
    // normalize radii for scoring
    const rOk = data.radii?.correct ?? 0.055
    const rNear = data.radii?.near ?? 0.12
    this.cache[system] = { ...data, rOk, rNear }
    return this.cache[system]
  }
  getRotationBlock(book, rotation){
    return (book.rotations || []).find(r => Number(r.rotation) === Number(rotation))
  }
}

// ------------------- Utility -------------------
const clamp01 = v => Math.max(0.02, Math.min(0.98, v))
const pct = v => `${v*100}%`
const titleOf = role => ({
  S:'Setter', S1:'Setter 1', S2:'Setter 2',
  RS:'Right-side (Opp)', RS1:'Right-side 1', RS2:'Right-side 2',
  OH1:'Outside Hitter 1', OH2:'Outside Hitter 2',
  MB1:'Middle Blocker 1', MB2:'Middle Blocker 2',
  L:'Libero',
  LF:'Left Front', CF:'Center Front', RF:'Right Front',
  LB:'Left Back', CB:'Center Back', RB:'Right Back',
  OH:'Outside Hitter', MB:'Middle Blocker', BR:'Back Row', 'RS-ATK':'Right Side'
}[role] || role)

// ------------------- App -------------------
class App {
  constructor(){
    // UI
    this.court = $('#court')
    this.bench = $('#bench') || this._makeBench()
    this.status = $('#status') || { textContent: '' }

    // controls
    this.selOffense = $('#offenseSelect')
    this.selRotation = $('#rotationSelect')
    this.selPhase = $('#phaseSelect')
    this.selBaseMode = $('#baseModeSelect')
    this.chkTargets = $('#showTargets')
    this.btnPlace = $('#btnPlace')
    this.btnGrade = $('#btnGrade')
    this.btnReset = $('#btnReset')

    this.chkLibero = $('#useLibero')
    this.selLiberoSubFor = $('#liberoSubFor')
    this.selLiberoZone = $('#liberoZone')

    // templates (create programmatically)
    this.markerLayer = document.createElement('div')
    this.markerLayer.className = 'marker-layer'
    this.court.appendChild(this.markerLayer)

    this.ringLayer = document.createElement('div')
    this.ringLayer.className = 'ring-layer'
    this.court.appendChild(this.ringLayer)

    this.arrowLayer = document.createElement('svg')
    this.arrowLayer.className = 'arrow-layer'
    this.arrowLayer.setAttribute('xmlns','http://www.w3.org/2000/svg')
    this.arrowLayer.setAttribute('viewBox','0 0 1000 1000') // will scale with court
    this.court.appendChild(this.arrowLayer)

    this.drag = new Drag(this.court, (el, norm) => this._onDrop(el, norm))
    
    
    // drag on the court as usual
    this.dragCourt = new Drag(this.court, (el, norm) => this._onDrop(el, norm), {
      rectProvider: () => this.court.getBoundingClientRect()
    })
    
    // drag starting from the bench, but use COURT coords and move piece into court on grab
    this.dragBench = new Drag(this.bench, (el, norm) => this._onDrop(el, norm), {
      rectProvider: () => this.court.getBoundingClientRect(),
      onStart: (el, e, rect) => this._benchGrabToCourt(el, e, rect)
    })
    
    
    this.playbook = new Playbook()
    
    
    this.zoneLayer = document.createElement('div')
    this.zoneLayer.className = 'zone-layer'
    this.court.appendChild(this.zoneLayer)
    this._buildZonesOverlay()
    
    this.chkShowZones = $('#showZones')
    this.chkShowZones?.addEventListener('change', () => {
      this.zoneLayer.style.display = this.chkShowZones.checked ? 'grid' : 'none'
    })
    

    // state
    this.book = null
    this.rotationBlock = null
    this.currentTargets = null
    this.rosterRoles = new Set()         // draggable defenders on court
    this.attackers = {}                  // opponents (OH, RS, MB, BR)
    this.attackMode = 'base'             // freeBall, backRow, vsOH, vsRS, vsMB
    this.arrow = null

    // coordinates (from JSON or defaults)
    this.coord = { net: 0.5, tenFt: 2/3 }

    // bind
    this._bindUI()
  }

  async init(){
    await this._loadBook(this.selOffense?.value || '5-1')
    this._populateRotationSelect()
    this._renderCourtLines()
    this._spawnOpponent()
    this._resetBenchAndPlayers()
    this._applyPhase()
    this._renderTargetsIf()
  }

  _bindUI(){
    this.selOffense?.addEventListener('change', async () => {
      await this._loadBook(this.selOffense.value)
      this._populateRotationSelect()
      this._resetBenchAndPlayers()
      this._applyPhase()
      this._renderTargetsIf()
    })
    this.selRotation?.addEventListener('change', () => {
      this._resetBenchAndPlayers()
      this._applyPhase()
      this._renderTargetsIf()
    })
    this.selPhase?.addEventListener('change', () => {
      const showBase = this.selPhase.value === 'base'
      if (this.selBaseMode) this.selBaseMode.disabled = !showBase
      this._applyPhase()
      this._renderTargetsIf()
    })
    this.selBaseMode?.addEventListener('change', () => {
      this._applyPhase()
      this._renderTargetsIf()
    })
    this.chkLibero?.addEventListener('change', () => {
      this._resetBenchAndPlayers()
      this._applyPhase()
      this._renderTargetsIf()
    })
    this.selLiberoSubFor?.addEventListener('change', () => { this._applyPhase(); this._renderTargetsIf() })
    this.selLiberoZone?.addEventListener('change', () => { this._applyPhase(); this._renderTargetsIf() })

    this.chkTargets?.addEventListener('change', () => this._renderTargetsIf())
    this.btnPlace?.addEventListener('click', () => this.placeRecommended())
    this.btnGrade?.addEventListener('click', () => this.grade())
    this.btnReset?.addEventListener('click', () => this._resetBenchAndPlayers())
  }

  async _loadBook(system){
    this.book = await this.playbook.load(system)
    this.coord = {
      net: this.book.coord?.net ?? 0.5,
      tenFt: this.book.coord?.tenFt ?? 2/3
    }
    this.rotationBlock = this.playbook.getRotationBlock(this.book, Number(this.selRotation?.value || 1))
  }

  _populateRotationSelect(){
      if (!this.selRotation) return
      const order = [1,6,5,4,3,2]  // standard order
      this.selRotation.innerHTML = ''
      for (const r of order){
        const opt = document.createElement('option')
        opt.value = String(r)
        opt.textContent = `R${r}`
        this.selRotation.appendChild(opt)
      }
      this.selRotation.value = '1'
      this.rotationBlock = this.playbook.getRotationBlock(this.book, 1)
    }
    
    // optional helpers if you add rotation arrows later
    _nextRotationValue(){
      const order = ['1','6','5','4','3','2']
      const i = order.indexOf(this.selRotation.value)
      return order[(i + 1) % order.length]
    }
    _prevRotationValue(){
      const order = ['1','6','5','4','3','2']
      const i = order.indexOf(this.selRotation.value)
      return order[(i + order.length - 1) % order.length]
    }

  _renderCourtLines(){
    // add antennas and lines once
    if (!this.court.querySelector('.net')) {
      const net = document.createElement('div')
      net.className = 'net'
      this.court.appendChild(net)

      const antL = document.createElement('div')
      antL.className = 'antenna left'
      const antR = document.createElement('div')
      antR.className = 'antenna right'
      this.court.appendChild(antL)
      this.court.appendChild(antR)

      const lineTop = document.createElement('div')
      lineTop.className = 'line top'
      const lineBottom = document.createElement('div')
      lineBottom.className = 'line bottom'
      const tenTop = document.createElement('div')
      tenTop.className = 'ten top'
      const tenBottom = document.createElement('div')
      tenBottom.className = 'ten bottom'

      this.court.appendChild(lineTop)
      this.court.appendChild(lineBottom)
      this.court.appendChild(tenTop)
      this.court.appendChild(tenBottom)
    }
    this.court.style.backgroundImage = "url('/assets/court.png')"
  }

  _spawnOpponent(){
    // four attackers on opponent side, clickable to set attack mode; draggable as well
    const seeds = {
      OH: { x: 0.82, y: 0.42 - 0.02 },
      MB: { x: 0.50, y: 0.42 - 0.02 },
      RS: { x: 0.18, y: 0.42 - 0.02 },
      BR: { x: 0.50, y: 0.10 + 0.04 }
    }
    Object.entries(seeds).forEach(([role, pos]) => {
      const el = this._makeMarker(role, 'attacker', pos.x, pos.y)
      el.title = titleOf(role) + ' (tap to test)'
      el.addEventListener('click', () => this._onAttackerClick(role))
      this.attackers[role] = { ...pos, el }
    })
  }

  _makeBench(){
    const bench = document.createElement('div')
    bench.id = 'bench'
    bench.className = 'bench'
    this.court.insertAdjacentElement('afterend', bench)
    return bench
  }

  _resetBenchAndPlayers(){
      // wipe all layers
      this.markerLayer.innerHTML = ''
      this.ringLayer.innerHTML = ''
      this.arrowLayer.innerHTML = ''
      // wipe bench
      if (this.bench) this.bench.innerHTML = ''
      this.rosterRoles.clear()
    
      // defenders: create one marker per role on the bench
      const roles = this.book.roles || []
      for (const role of roles){
        const el = this._makeMarker(role, 'defender', null, null, true)
        el.title = titleOf(role)
        this.bench.appendChild(el)
      }
    
      // re-add attackers to the court
      Object.values(this.attackers).forEach(a => {
        if (!a.el.parentNode) this.markerLayer.appendChild(a.el)
        else this.markerLayer.appendChild(a.el) // ensure in correct layer
      })
    }


  _applyPhase(){
      this.rotationBlock = this.playbook.getRotationBlock(this.book, Number(this.selRotation?.value || 1))
      if (!this.rotationBlock) return
    
      // Ensure clockwise starting lanes even if JSON blocks are sparse or out-of-sync
      const r1 = this.playbook.getRotationBlock(this.book, 1)
      const canonicalR1 = r1?.laneMap
      if (canonicalR1){
        const rotated = rotateLaneMapClockwise(canonicalR1, Number(this.selRotation?.value || 1))
        // keep for libero/back-row checks even if pack below comes with absolute coordinates
        this.currentLaneMap = rotated
      } else {
        this.currentLaneMap = this.rotationBlock.laneMap || null
      }
    
      const phase = this.selPhase?.value || 'serveReceive'
      let pack = null
      if (phase === 'serving') pack = this.rotationBlock.serving
      else if (phase === 'serveReceive') pack = this.rotationBlock.serveReceive
      else if (phase === 'altServeReceive') pack = this.rotationBlock.altServeReceive
      else if (phase === 'base'){
        const mode = this.selBaseMode?.value || 'base'
        const keyMap = { base:'base', freeBall:'freeBall', backRow:'vsBackRow', vsOH:'vsOH', vsRS:'vsRS', vsMB:'vsMB' }
        pack = (this.rotationBlock.baseDefense || {})[keyMap[mode]] || (this.rotationBlock.baseDefense || {}).base
        this.attackMode = keyMap[mode]
      }
    
      // If this phase pack is missing someone, seed positions from rotated lanes (simple zone anchors)
      if (pack && this.currentLaneMap){
        const anchors = { RB:{x:.83,y:.90}, CB:{x:.50,y:.90}, LB:{x:.17,y:.90}, LF:{x:.17,y:.58}, CF:{x:.50,y:.58}, RF:{x:.83,y:.58} }
        for (const [zone, role] of Object.entries(this.currentLaneMap)){
          if (!pack[role]) pack[role] = { ...anchors[zone] }
        }
      }
    
      this._buildTargetsFromPack(pack)
    }


  _buildTargetsFromPack(pack){
    // pack = role -> {x,y}
    this.currentTargets = {}
    const rOk = this.book.rOk, rNear = this.book.rNear
    Object.entries(pack).forEach(([role, pos]) => {
      if (!pos || typeof pos.x !== 'number') return
      const targets = [{ id:`${role}`, cx:pos.x, cy:pos.y, rOk, rNear }]
      this.currentTargets[role] = { targets, scorer: new ProximityScorer(targets) }
    })

    // Libero: if enabled, swap with MB1/MB2 in back row and optionally move to zone 5/6
    if (this.chkLibero?.checked && this.currentLaneMap){
      const subFor = this.selLiberoSubFor?.value || 'MB1'
      // Which zone is that subFor in this rotation?
      const zoneOfSub = Object.entries(this.currentLaneMap).find(([zone, role]) => role === subFor)?.[0] || null
      const isBackRow = zoneOfSub === 'RB' || zoneOfSub === 'CB' || zoneOfSub === 'LB'
      if (isBackRow){
        // Remove substituted MB from targets (he should not be on court for defense)
        if (this.currentTargets[subFor]) delete this.currentTargets[subFor]
    
        // Place L into chosen defensive base zone (5 or 6)
        const laneX = (this.selLiberoZone?.value || '6') === '5' ? 0.17 : 0.50
        const Ltarget = { cx: laneX, cy: 0.86, rOk: this.book.rOk, rNear: this.book.rNear }
        this.currentTargets['L'] = { targets:[Ltarget], scorer: new ProximityScorer([Ltarget]) }
      } else {
        // Sub target is front-row → no libero on court for this phase
        if (this.currentTargets['L']) delete this.currentTargets['L']
      }
    } else {
      // Libero disabled
      if (this.currentTargets['L']) delete this.currentTargets['L']
    }

  }

  _renderTargetsIf(){
    this.ringLayer.innerHTML = ''
    if (!this.chkTargets?.checked || !this.currentTargets) return
    Object.values(this.currentTargets).forEach(({targets}) => {
      targets.forEach(t => {
        const near = document.createElement('div')
        near.className = 'ring near'
        near.style.left = pct(t.cx)
        near.style.top  = pct(t.cy)
        near.style.width = pct(t.rNear*2)
        near.style.height= pct(t.rNear*2)
        this.ringLayer.appendChild(near)

        const ok = document.createElement('div')
        ok.className = 'ring ok'
        ok.style.left = pct(t.cx)
        ok.style.top  = pct(t.cy)
        ok.style.width = pct(t.rOk*2)
        ok.style.height= pct(t.rOk*2)
        this.ringLayer.appendChild(ok)
      })
    })
  }

  placeRecommended(){
    if (!this.currentTargets) return
    // move/clone bench markers into court at first target
    Object.entries(this.currentTargets).forEach(([role, pack]) => {
      let el = this._findMarker(role)
      if (!el){ el = this._makeMarker(role, 'defender', null, null, true) }
      const t = pack.targets[0]
      this.markerLayer.appendChild(el)
      el.style.left = pct(t.cx)
      el.style.top  = pct(t.cy)
      el.dataset.onCourt = '1'
      this.rosterRoles.add(role)
    })
  }

  grade(){
      if (!this.currentTargets) return
      let ok=0, near=0, miss=0
      this.rosterRoles.forEach(role => {
        if (role === 'L' && !this.currentTargets['L']) return  // don’t grade L if not active
        const el = this._findMarker(role); if (!el) return
        const pos = { x: parseFloat(el.style.left)/100, y: parseFloat(el.style.top)/100 }
        const pack = this.currentTargets[role]
        const res = pack?.scorer.score(pos.x, pos.y) || { grade:'miss' }
        el.classList.remove('ok','near','miss')
        el.classList.add(res.grade)
        if (res.grade==='ok') ok++; else if (res.grade==='near') near++; else miss++
      })
      const total = ok+near+miss
      this.status.textContent = `Correct ${ok}/${total} • Near ${near} • Miss ${miss}`
    }

  _onDrop(el, norm){
    const role = el.dataset.role
    if (el.classList.contains('defender')){
      // moving from bench to court?
      if (!el.dataset.onCourt) {
        this.markerLayer.appendChild(el)
        el.dataset.onCourt = '1'
        this.rosterRoles.add(role)
      }
    }
    // update arrow if attacker moved and mode selected
    if (el.classList.contains('attacker')){
      const a = this.attackers[role]; if (a){ a.x = norm.x; a.y = norm.y }
      if (this.attackMode && this.attackMode !== 'base' && this.attackMode !== 'freeBall'){
        this._drawAttackArrow(role)
      }
    }
  }

  _onAttackerClick(role){
    // Clicking attacker selects test mode that matches role; clicking BR toggles backRow; clicking empty top bar not supported.
    const map = { OH:'vsOH', RS:'vsRS', MB:'vsMB', BR:'vsBackRow' }
    this.attackMode = map[role] || 'base'
    if (this.selPhase?.value !== 'base'){
      this.selPhase.value = 'base'
    }
    if (this.selBaseMode){
      const reverse = { vsOH:'vsOH', vsRS:'vsRS', vsMB:'vsMB', vsBackRow:'backRow', base:'base' }
      this.selBaseMode.value = reverse[this.attackMode] || 'base'
    }
    this._applyPhase()
    this._renderTargetsIf()
    this._drawAttackArrow(role)
  }

  _drawAttackArrow(fromRole){
    this.arrowLayer.innerHTML = ''
    const a = this.attackers[fromRole]; if (!a) return
    // aim into our court near the seam: pick a point ~2m inside our baseline on the line/cross bias
    const end = this._attackEndFor(fromRole, a)
    const sx = a.x*1000, sy = a.y*1000, ex = end.x*1000, ey = end.y*1000
    const path = document.createElementNS('http://www.w3.org/2000/svg','path')
    path.setAttribute('d', `M ${sx} ${sy} C ${sx} ${sy+120}, ${ex} ${ey-120}, ${ex} ${ey}`)
    path.setAttribute('class','attack-arrow')
    path.setAttribute('marker-end','url(#arrowhead)')
    // defs
    const defs = document.createElementNS('http://www.w3.org/2000/svg','defs')
    const marker = document.createElementNS('http://www.w3.org/2000/svg','marker')
    marker.setAttribute('id','arrowhead')
    marker.setAttribute('markerWidth','12')
    marker.setAttribute('markerHeight','12')
    marker.setAttribute('refX','10')
    marker.setAttribute('refY','3')
    marker.setAttribute('orient','auto')
    const tip = document.createElementNS('http://www.w3.org/2000/svg','path')
    tip.setAttribute('d','M0,0 L0,6 L9,3 z')
    tip.setAttribute('fill','#d35400')
    marker.appendChild(tip)
    defs.appendChild(marker)
    this.arrowLayer.appendChild(defs)
    this.arrowLayer.appendChild(path)
  }
  
  _benchGrabToCourt(el, e, rect){
      if (el.dataset.onCourt === '1') return
      // move to the court layer and seed the position to the pointer location
      this.markerLayer.appendChild(el)
      el.dataset.onCourt = '1'
      const n = { x:(e.clientX-rect.left)/rect.width, y:(e.clientY-rect.top)/rect.height }
      el.style.left = `${Math.max(0.02, Math.min(0.98, n.x))*100}%`
      el.style.top  = `${Math.max(0.02, Math.min(0.98, n.y))*100}%`
      this.rosterRoles.add(el.dataset.role)
    }
  
  _attackEndFor(role, a){
    // send OH toward our left deep, RS toward our right deep, MB toward middle, BR to deep middle
    if (role === 'OH') return { x: 0.18, y: 0.90 }
    if (role === 'RS') return { x: 0.82, y: 0.90 }
    if (role === 'MB') return { x: 0.50, y: 0.86 }
    return { x: 0.50, y: 0.90 }
  }

  _findMarker(role){
    return this.markerLayer.querySelector(`.defender[data-role="${role}"]`) ||
           this.bench.querySelector(`.defender[data-role="${role}"]`)
  }

  _makeMarker(role, kind, nx, ny, startOnBench=false){
    const el = document.createElement('div')
    el.className = `marker ${kind}`
    el.dataset.role = role
    el.title = titleOf(role)
    const badge = document.createElement('span')
    badge.className = 'badge'
    badge.textContent = role
    el.appendChild(badge)
    if (typeof nx === 'number' && typeof ny === 'number'){
      el.style.left = pct(nx)
      el.style.top = pct(ny)
    } else {
      // if bench, position will be handled by flow; if on court, center bottom
      el.style.left = pct(0.5)
      el.style.top  = pct(0.95)
    }
    if (!startOnBench) {
      this.markerLayer.appendChild(el)
      el.dataset.onCourt = '1'
    }
    return el
  }
  
  
  
  _buildZonesOverlay(){
  // bottom half (our side):  | 5 6 1 | back row; | 4 3 2 | front row (standard FIVB)
  this.zoneLayer.innerHTML = ''
  this.zoneLayer.style.display = 'none'
  const makeCell = (label) => {
    const d = document.createElement('div')
    d.className = 'zone-cell'
    d.textContent = label
    d.title = `Zone ${label}`
    return d
  }
  // grid template: two rows, three cols; positioned only on our half
  this.zoneLayer.append(
    makeCell('4'), makeCell('3'), makeCell('2'),
    makeCell('5'), makeCell('6'), makeCell('1'),
  )
}
  
}

// ------------------- boot -------------------
window.addEventListener('DOMContentLoaded', () => {
  const app = new App()
  app.init()
})
