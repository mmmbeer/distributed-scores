// js/dragDropHandler.js

/**
 * Drag/drop for players with sub-zone awareness
 * Supports single occupant (starting) and multi occupant (SR/defense)
 */
class DragDropHandler {
  constructor() {
    this.draggedElement = null
    this.originalParent = null
    this.placeholder = null
    this.onPositionChange = null
    this.gamePhase = 'starting'
    this.initializeDragAndDrop()
  }

  setGamePhase(phase) {
    this.gamePhase = phase
    this.updateSubZoneVisibility()
  }

  updateSubZoneVisibility() {
    const show = this.gamePhase !== 'starting'
    this.toggleSubZones(show)
  }

  initializeDragAndDrop() {
    this.setupPlayerDragEvents()
    this.setupPositionDropEvents()
  }

  setPositionChangeCallback(cb) { this.onPositionChange = cb }

  setupPlayerDragEvents() {
    const players = document.querySelectorAll('.player')
    players.forEach(player => {
      player.draggable = true
      Utils.addEventListener(player, 'dragstart', e => this.handleDragStart(e))
      Utils.addEventListener(player, 'dragend', e => this.handleDragEnd(e))

      // touch
      Utils.addEventListener(player, 'touchstart', e => this.handleTouchStart(e), { passive: false })
      Utils.addEventListener(player, 'touchmove', e => this.handleTouchMove(e), { passive: false })
      Utils.addEventListener(player, 'touchend', e => this.handleTouchEnd(e), { passive: false })

      // click select
      let isDragging = false
      let t0 = 0
      Utils.addEventListener(player, 'mousedown', () => { t0 = Date.now(); isDragging = false })
      Utils.addEventListener(player, 'mousemove', () => { if (Date.now() - t0 > 150) isDragging = true })
      Utils.addEventListener(player, 'click', e => {
        if (!isDragging && Date.now() - t0 < 200) this.handlePlayerClick(e)
        isDragging = false
      })
    })
  }

  setupPositionDropEvents() {
    const positions = document.querySelectorAll('.position')
    const subZones = document.querySelectorAll('.sub-zone')
    positions.forEach(el => this.setupDropEventsForElement(el))
    subZones.forEach(el => this.setupDropEventsForElement(el))
  }

  setupDropEventsForElement(el) {
    Utils.addEventListener(el, 'dragover', e => this.handleDragOver(e))
    Utils.addEventListener(el, 'dragenter', e => this.handleDragEnter(e))
    Utils.addEventListener(el, 'dragleave', e => this.handleDragLeave(e))
    Utils.addEventListener(el, 'drop', e => this.handleDrop(e))
    Utils.addEventListener(el, 'click', e => this.handlePositionClick(e))
  }

  handleDragStart(e) {
    this.draggedElement = e.target
    this.originalParent = e.target.parentNode
    Utils.addClass(e.target, 'dragging')
    e.dataTransfer.setData('text/plain', e.target.id)
    e.dataTransfer.effectAllowed = 'move'
    this.createPlaceholder()
    Utils.clearFeedback()
  }

  handleDragEnd(e) {
    Utils.removeClass(e.target, 'dragging')
    this.clearDropTargets()
    this.removePlaceholder()
    this.draggedElement = null
    this.originalParent = null
  }

  handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  handleDragEnter(e) {
    e.preventDefault()
    const t = e.target
    if (t.classList.contains('position') || t.classList.contains('sub-zone')) {
      Utils.addClass(t, 'drop-target')
      if (t.classList.contains('sub-zone')) {
        const parent = t.closest('.position')
        if (parent) Utils.addClass(parent, 'drop-target')
      }
    }
  }

  handleDragLeave(e) {
    const t = e.target
    if (t.classList.contains('position') || t.classList.contains('sub-zone')) {
      Utils.removeClass(t, 'drop-target')
      if (t.classList.contains('sub-zone')) {
        const parent = t.closest('.position')
        if (parent && !parent.querySelector('.sub-zone.drop-target')) Utils.removeClass(parent, 'drop-target')
      }
    }
  }

  handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    const id = e.dataTransfer.getData('text/plain')
    const player = Utils.getElementById(id)
    let target = e.target
    let subZone = null

    if (target.classList.contains('sub-zone')) {
      subZone = target.dataset.subzone
      target = target.closest('.position')
    } else if (target.classList.contains('position') && this.gamePhase !== 'starting') {
      subZone = 'b'
    }

    if (player && target) this.movePlayerToPosition(player, target, subZone)
    this.clearDropTargets()
  }

  movePlayerToPosition(player, position, subZone = null) {
    if (!player || !position) return
    const posNum = position.dataset.position

    // remove from old
    player.remove()

    // add to new
    position.appendChild(player)
    Utils.addClass(player, 'on-court')
    player.dataset.position = posNum
    if (subZone) player.dataset.subzone = subZone
    else delete player.dataset.subzone

    this.arrangePlayersInPosition(position)

    this.onPositionChange?.()
    this.showMoveMessage(player, posNum, subZone)
  }

  arrangePlayersInPosition(position) {
    const players = position.querySelectorAll('.player')
    if (players.length === 0) return

    if (this.gamePhase === 'starting') {
      // single occupant, center it
      for (let i = 1; i < players.length; i++) this.movePlayerToBench(players[i])
      if (players[0]) this.positionPlayerInZone(players[0], '50%', '50%')
      return
    }

    // multi occupant by subzone
    this.arrangePlayersBySubZone(position, players)
  }

  arrangePlayersBySubZone(position, players) {
    const groups = { a: [], b: [], c: [] }
    players.forEach(p => {
      const sz = p.dataset.subzone || 'b'
      if (groups[sz]) groups[sz].push(p)
    })
    Object.keys(groups).forEach(sz => {
      if (groups[sz].length) this.arrangeMultiplePlayersInSubZone(groups[sz], sz)
    })
  }

  arrangeMultiplePlayersInSubZone(players, subZone) {
    const base = { a: { left: 25, top: 50 }, b: { left: 50, top: 50 }, c: { left: 75, top: 50 } }[subZone]
    if (!base) return
    const arrangements = {
      1: [{ left: base.left, top: base.top }],
      2: [{ left: base.left - 5, top: base.top - 8 }, { left: base.left + 5, top: base.top + 8 }],
      3: [{ left: base.left - 8, top: base.top - 10 }, { left: base.left, top: base.top }, { left: base.left + 8, top: base.top + 10 }]
    }
    const plan = arrangements[players.length] || arrangements[3]
    players.forEach((p, i) => {
      const pos = plan[i] || plan[plan.length - 1]
      this.positionPlayerInZone(p, `${pos.left}%`, `${pos.top}%`)
    })
  }

  positionPlayerInZone(player, left, top) {
    player.style.left = left
    player.style.top = top
    player.style.transform = 'translate(-50%, -50%)'
    Utils.animateElement(player, { transform: 'translate(-50%, -50%) scale(1.1)' }, 200)
      .then(() => Utils.animateElement(player, { transform: 'translate(-50%, -50%) scale(1)' }, 200))
  }

  movePlayerToBench(player) {
    const bench = document.querySelector('.player-bench')
    if (!bench || !player) return
    Utils.removeClass(player, 'on-court')
    player.style.left = ''
    player.style.top = ''
    player.style.transform = ''
    delete player.dataset.position
    delete player.dataset.subzone
    bench.appendChild(player)
  }

  getCurrentPositions() {
    const out = {}
    document.querySelectorAll('.position').forEach(el => {
      const pos = parseInt(el.dataset.position, 10)
      const players = el.querySelectorAll('.player')
      if (players.length) {
        out[pos] = []
        players.forEach(p => {
          const sz = p.dataset.subzone
          out[pos].push({ playerId: p.id, subZone: sz || null, position: sz ? `${pos}${sz}` : pos })
        })
      }
    })
    return out
  }

  handlePlayerClick(e) {
    e.preventDefault()
    e.stopPropagation()
    const p = e.target.closest('.player')
    if (!p) return
    document.querySelectorAll('.player.selected').forEach(x => { if (x !== p) Utils.removeClass(x, 'selected') })
    if (Utils.hasClass(p, 'selected')) Utils.removeClass(p, 'selected')
    else Utils.addClass(p, 'selected')
  }

  handlePositionClick(e) {
    e.preventDefault()
    e.stopPropagation()
    const selected = this.getSelectedPlayer()
    if (!selected) return
    let target = e.target
    let subZone = null
    if (target.classList.contains('sub-zone')) {
      subZone = target.dataset.subzone
      target = target.closest('.position')
    } else if (target.classList.contains('position') && this.gamePhase !== 'starting') {
      subZone = 'b'
    }
    if (target?.classList.contains('position')) {
      this.movePlayerToPosition(selected, target, subZone)
      this.clearPlayerSelection()
    }
  }

  showMoveMessage(player, positionNumber, subZone) {
    const name = this.getPlayerDisplayName(player)
    let m = `Moved ${name} to position ${positionNumber}`
    if (subZone) {
      const n = { a: 'left', b: 'center', c: 'right' }[subZone] || subZone
      m += ` (${n})`
    }
    Utils.showFeedback(m, 'info')
  }

  getSelectedPlayer() {
    return document.querySelector('.player.selected')
  }

  clearPlayerSelection() {
    const s = this.getSelectedPlayer()
    if (s) Utils.removeClass(s, 'selected')
  }

  getPlayerDisplayName(player) {
    const role = player.dataset.role
    const names = {
      setter: 'Setter',
      outside1: 'Outside 1',
      outside2: 'Outside 2',
      middle1: 'Middle 1',
      middle2: 'Middle 2',
      opposite: 'Opposite',
      libero: 'Libero',
      ds: 'Defensive Specialist'
    }
    return names[role] || player.textContent || player.id
  }

  createPlaceholder() {
    if (!this.draggedElement) return
    this.placeholder = document.createElement('div')
    this.placeholder.className = 'player-placeholder'
    this.placeholder.style.cssText = `
      width: 50px; height: 50px; border: 2px dashed #ccc; border-radius: 50%; opacity: .5; position: absolute;
    `
    this.originalParent?.appendChild(this.placeholder)
  }

  removePlaceholder() {
    if (this.placeholder?.parentNode) this.placeholder.parentNode.removeChild(this.placeholder)
    this.placeholder = null
  }

  clearDropTargets() {
    Utils.clearClassFromAll('.position', 'drop-target')
    Utils.clearClassFromAll('.sub-zone', 'drop-target')
  }

  resetPlayersToBench() {
    const bench = document.querySelector('.player-bench')
    document.querySelectorAll('.player').forEach(p => { if (bench && !bench.contains(p)) this.movePlayerToBench(p) })
    Utils.clearClassFromAll('.position', 'correct')
    Utils.clearClassFromAll('.position', 'incorrect')
    this.onPositionChange?.()
    Utils.showFeedback('All players reset to bench', 'info', 1200)
  }

  toggleSubZones(show) {
    document.querySelectorAll('.position').forEach(p => {
      if (show) Utils.addClass(p, 'show-zones')
      else Utils.removeClass(p, 'show-zones')
    })
  }

  // touch helpers
  handleTouchStart(e) {
    const p = e.target.closest('.player')
    if (!p) return
    this.draggedElement = p
    Utils.addClass(p, 'selected')
    e.preventDefault()
    document.querySelectorAll('.player.selected').forEach(x => { if (x !== p) Utils.removeClass(x, 'selected') })
  }

  handleTouchMove(e) {
    e.preventDefault()
    if (!this.draggedElement) return
  }

  handleTouchEnd(e) {
    e.preventDefault()
    this.draggedElement = null
  }
}

window.DragDropHandler = DragDropHandler
