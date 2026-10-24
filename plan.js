// Draws the game's floor plan (plan-data.js) as SVG and moves it the ways the game does:
// passing to another organisation of the rooms, sliding grid lines, and (while he dreams)
// letting some interior walls come loose and drift. No dependencies.

window.HousePlan = (() => {
  const NS = 'http://www.w3.org/2000/svg'
  const D = window.PLAN_DATA
  const NX = D.X.length - 1
  const NY = D.Y.length - 1
  const DOOR_W = 0.84
  const reduce = matchMedia('(prefers-reduced-motion: reduce)')
  let uid = 0

  const KEYS = []
  for (let i = 0; i <= NX; i++) for (let j = 0; j < NY; j++) KEYS.push(`v${i}_${j}`)
  for (let j = 0; j <= NY; j++) for (let i = 0; i < NX; i++) KEYS.push(`h${j}_${i}`)

  const el = (name, attrs = {}, parent) => {
    const n = document.createElementNS(NS, name)
    for (const k in attrs) n.setAttribute(k, attrs[k])
    if (parent) parent.appendChild(n)
    return n
  }

  // a stable pseudo-random number per key, so the same walls come loose each time
  const hash = (s, salt) => {
    let h = 2166136261 ^ salt
    for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
    return ((h >>> 0) % 1000) / 1000
  }

  function mount(svg) {
    const id = ++uid
    let X = [...D.X]
    let Y = [...D.Y]
    let cfg = D.configs.origin
    let exitsShut = false
    let tween = 0

    const defs = el('defs', {}, svg)
    const parts = {}

    if (svg.hasAttribute('data-body')) {
      const g = el('radialGradient', { id: `fade${id}` }, defs)
      el('stop', { offset: '0.45', 'stop-color': '#fff' }, g)
      el('stop', { offset: '1', 'stop-color': '#000' }, g)
      const mask = el('mask', { id: `mask${id}`, maskContentUnits: 'objectBoundingBox' }, defs)
      el('rect', { width: 1, height: 1, fill: `url(#fade${id})` }, mask)
      const glow = el('radialGradient', { id: `glow${id}` }, defs)
      el('stop', { offset: '0', 'stop-color': '#ef5b3f', 'stop-opacity': '.85' }, glow)
      el('stop', { offset: '1', 'stop-color': '#ef5b3f', 'stop-opacity': '0' }, glow)

      // the rotated body is clipped to the drawing's frame so it never widens the page
      const [vx, vy, vw, vh] = svg.getAttribute('viewBox').split(' ').map(Number)
      el('rect', { x: vx, y: vy, width: vw, height: vh }, el('clipPath', { id: `clip${id}` }, defs))
      const frame = el('g', { 'clip-path': `url(#clip${id})` }, svg)
      const b = D.body
      parts.body = el('g', { class: 'plan__body', transform: `translate(${b.x} ${b.y}) rotate(${b.rot})` }, frame)
      el('image', { href: 'assets/img/body.jpg', x: -4.3, y: -4.4, width: 8.6, height: 8.8, mask: `url(#mask${id})`, preserveAspectRatio: 'xMidYMid slice' }, parts.body)
      parts.ember = el('g', { class: 'plan__ember', transform: `translate(${b.x} ${b.y})` }, svg)
      el('circle', { r: 1.3, fill: `url(#glow${id})`, class: 'plan__ember-glow' }, parts.ember)
      el('circle', { r: 0.13, class: 'plan__ember-core' }, parts.ember)
    }

    const house = el('g', { class: 'plan__house' }, svg)
    const grid = el('g', { class: 'plan__grid' }, house)
    const gx = D.X.map(() => el('line', {}, grid))
    const gy = D.Y.map(() => el('line', {}, grid))
    const walls = el('g', { class: 'plan__walls' }, house)
    const units = Object.fromEntries(KEYS.map((k) => [k, el('line', { 'data-k': k }, walls)]))

    if (svg.hasAttribute('data-marks')) {
      parts.marks = el('g', { class: 'plan__marks' }, svg)
      parts.anchor = el('g', { class: 'anchor' }, parts.marks)
      el('circle', { class: 'anchor__halo', r: 0.9 }, parts.anchor)
      el('rect', { class: 'anchor__tile', x: -0.32, y: -0.32, width: 0.64, height: 0.64 }, parts.anchor)
      const t = el('text', { class: 'anchor__label', y: -0.62, 'text-anchor': 'middle' }, parts.anchor)
      t.textContent = 'ANCHOR'
      parts.burst = el('circle', { class: 'burst', r: 0.4 }, parts.marks)
      parts.runner = el('circle', { class: 'runner', r: 0.26 }, parts.marks)
    }

    const geom = (k) => {
      const v = k[0] === 'v'
      const [a, b] = k.slice(1).split('_').map(Number)
      return v ? [X[a], Y[b], X[a], Y[b + 1]] : [X[b], Y[a], X[b + 1], Y[a]]
    }

    function draw() {
      gx.forEach((l, i) => setLine(l, [X[i], Y[0] - 0.4, X[i], Y[NY] + 0.4]))
      gy.forEach((l, j) => setLine(l, [X[0] - 0.4, Y[j], X[NX] + 0.4, Y[j]]))
      for (const k of KEYS) {
        const u = units[k]
        const g = geom(k)
        setLine(u, g)
        const len = Math.hypot(g[2] - g[0], g[3] - g[1])
        const gap = u.classList.contains('is-door') || (u.classList.contains('is-exit') && !exitsShut)
        u.setAttribute('stroke-dasharray', gap ? `${(len - DOOR_W) / 2} ${DOOR_W} ${len}` : 'none')
      }
    }
    const setLine = (l, [x1, y1, x2, y2]) => {
      l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2); l.setAttribute('y2', y2)
    }

    function setConfig(name) {
      cfg = D.configs[name]
      for (const k of KEYS) {
        const u = units[k]
        const w = cfg.walls[k]
        u.classList.toggle('is-on', !!w)
        u.classList.toggle('is-ext', w === 'e')
        u.classList.toggle('is-door', cfg.doors.includes(k))
        u.classList.toggle('is-window', cfg.windows.includes(k))
        u.classList.toggle('is-exit', cfg.exits.includes(k))
      }
      draw()
    }

    // slide the grid lines to new positions (the outer frame never moves)
    function setLines(nx = D.X, ny = D.Y, ms = 1400) {
      cancelAnimationFrame(tween)
      const fx = [...X], fy = [...Y]
      if (reduce.matches || !ms) { X = [...nx]; Y = [...ny]; return draw() }
      const t0 = performance.now()
      const step = (t) => {
        const p = Math.min(1, (t - t0) / ms)
        const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2
        X = fx.map((v, i) => v + (nx[i] - v) * e)
        Y = fy.map((v, j) => v + (ny[j] - v) * e)
        draw()
        if (p < 1) tween = requestAnimationFrame(step)
      }
      tween = requestAnimationFrame(step)
    }

    // about two in five interior walls come loose and drift (as in the game's dream)
    function drift(on) {
      for (const k of KEYS) {
        const u = units[k]
        const loose = on && u.classList.contains('is-on') && !u.classList.contains('is-ext') && hash(k, 1) < 0.4
        u.classList.toggle('is-loose', loose)
        u.style.transform = loose
          ? `translate(${(hash(k, 2) - 0.5) * 0.9}px, ${(hash(k, 3) - 0.5) * 0.9}px) rotate(${(hash(k, 4) - 0.5) * 28}deg)`
          : ''
      }
    }

    function shutExits(on) { exitsShut = on; draw() }

    const bayCentre = (i, j) => [(X[i] + X[i + 1]) / 2, (Y[j] + Y[j + 1]) / 2]

    setConfig('origin')
    return { svg, parts, setConfig, setLines, drift, shutExits, bayCentre, get config() { return cfg } }
  }

  return { mount, data: D }
})()
