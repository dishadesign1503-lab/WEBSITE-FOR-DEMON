// The House Outlives Its Creator — project site.
// No dependencies, no data collection, no microphone. Tilt is read only on request, and only in the page.

(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion.matches ? 0 : ms))
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
  const $ = (s, root = document) => root.querySelector(s)
  const $$ = (s, root = document) => [...root.querySelectorAll(s)]

  // ── scroll reveals ──────────────────────────────
  const revealer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      e.target.classList.add('is-visible')
      revealer.unobserve(e.target)
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 })
  $$('[data-reveal]').forEach((el) => revealer.observe(el))

  // ── floor plans ─────────────────────────────────
  const plans = new Map($$('svg[data-plan]').map((svg) => [svg, HousePlan.mount(svg)]))
  const planIn = (sel) => plans.get($(`${sel} svg[data-plan]`))
  const { X, Y } = HousePlan.data

  // ── section pager ───────────────────────────────
  const pagerLinks = $$('.pager a')
  const sections = pagerLinks.map((a) => $(a.getAttribute('href')))
  const setCurrent = () => {
    const mid = innerHeight * 0.45
    let current = 0
    sections.forEach((s, i) => { if (s.getBoundingClientRect().top <= mid) current = i })
    pagerLinks.forEach((a, i) => a.setAttribute('aria-current', String(i === current)))
  }

  // ── 01: lights going out; the plan settling over him ─
  // --p runs 0 → 1 as a figure travels from the bottom of the screen to the top
  const progressFigs = $$('[data-progress]')
  const setProgress = () => {
    for (const f of progressFigs) {
      const r = f.getBoundingClientRect()
      f.style.setProperty('--p', clamp(1 - (r.top + r.height) / (innerHeight + r.height)).toFixed(3))
    }
  }

  const hearing = $('.hearing__btn')
  hearing.addEventListener('click', () => {
    const fig = hearing.closest('.hearing')
    fig.classList.remove('is-sent')
    void fig.offsetWidth
    fig.classList.add('is-sent', 'was-sent')
  })

  // ── scroll stories (02, 03, 04) ─────────────────
  const stories = $$('.story').map((el) => {
    const n = Number(el.dataset.steps)
    const w = (el.dataset.weights ?? '').split(',').map(Number).filter(Boolean)
    const weights = w.length === n ? w : Array(n).fill(1)
    const total = weights.reduce((a, b) => a + b, 0)
    return { el, n, weights, total, step: -1, items: $$('[data-at]', el) }
  })

  const storyHooks = new Map()
  const onStep = (sel, fn) => storyHooks.set($(sel).querySelector('.story'), fn)

  function updateStories() {
    for (const s of stories) {
      const r = s.el.getBoundingClientRect()
      const range = s.el.offsetHeight - innerHeight
      let at = clamp(-r.top / range) * s.total
      let step = 0
      while (step < s.n - 1 && at >= s.weights[step]) at -= s.weights[step++]
      if (step === s.step) continue
      s.step = step
      s.el.dataset.step = step
      s.items.forEach((it) => {
        const k = Number(it.dataset.at)
        it.classList.toggle('is-shown', step >= k)
        it.classList.toggle('is-current', step === k)
      })
      storyHooks.get(s.el)?.(step)
    }
  }

  // 02: the mandala's grid lines, drawn from his body outwards (positions measured in s3-mandala.jpg)
  const mandala = $('.mandala-lines')
  const VX = [15, 41, 73, 106, 139, 172, 205, 239, 273]
  const HY = [15, 54, 92, 130, 166, 203, 239, 277]
  const centre = [144, 146]
  const mlines = [
    ...VX.map((x) => [x, HY[0], x, HY.at(-1), Math.abs(x - centre[0])]),
    ...HY.map((y) => [VX[0], y, VX.at(-1), y, Math.abs(y - centre[1])]),
  ]
  for (const [x1, y1, x2, y2, d] of mlines) {
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    Object.entries({ x1, y1, x2, y2, pathLength: 1 }).forEach(([k, v]) => l.setAttribute(k, v))
    l.style.setProperty('--d', `${(d / 130) * 1.4}s`)
    mandala.appendChild(l)
  }

  // 04: once the room is empty, the plan keeps changing by itself; it stops when the question comes
  const emptyPlan = planIn('.s04')
  let emptyTimer = 0
  let emptyTick = 0
  const emptyLoop = () => {
    const moves = [
      () => emptyPlan.setLines(X.map((x, i) => (i === 3 ? x + 0.55 : x)), Y),
      () => emptyPlan.setLines(X, Y),
      () => emptyPlan.setConfig('courtSouth'),
      () => emptyPlan.setLines(X, Y.map((y, j) => (j === 4 ? y - 0.5 : y))),
      () => emptyPlan.setLines(X, Y),
      () => emptyPlan.setConfig('origin'),
    ]
    moves[emptyTick++ % moves.length]()
    emptyTimer = setTimeout(emptyLoop, reduceMotion.matches ? 3000 : 1900)
  }
  onStep('.s04', (step) => {
    clearTimeout(emptyTimer)
    if (step === 4) emptyLoop()
  })

  // ── 05: voice → Vaastu Purusha → house ──────────
  // Clicking any stage replays the signal from the voice up to that stage.
  const stages = $$('.stage')
  const links = $$('.system .link')
  const housePlan = planIn('.fx-house')
  let run = 0

  const resetSystem = () => {
    stages.forEach((s) => {
      s.classList.remove('is-on')
      $('.stage__btn', s).setAttribute('aria-expanded', 'false')
    })
    links.forEach((l) => l.classList.remove('is-flowing', 'is-done'))
    housePlan.setConfig('origin')
    housePlan.setLines(X, Y, 0)
  }

  const playTo = async (target) => {
    const id = ++run
    resetSystem()
    void $('.system').offsetWidth
    for (let i = 0; i < target; i++) {
      if (id !== run) return
      stages[i].classList.add('is-on')
      $('.stage__btn', stages[i]).setAttribute('aria-expanded', 'true')
      if (i === 2) {
        housePlan.setLines(X.map((x, k) => (k === 2 ? x - 0.4 : k === 4 ? x + 0.4 : x)), Y, 900)
        await wait(900)
        if (id === run) housePlan.setConfig('bands')
      }
      if (i === target - 1) return
      await wait(i === 0 ? 900 : 700)
      if (id !== run) return
      links[i].classList.add('is-flowing')
      await wait(650)
      links[i].classList.add('is-done')
    }
  }
  stages.forEach((s, i) => $('.stage__btn', s).addEventListener('click', () => playTo(i + 1)))

  // ── 06: the dream ───────────────────────────────
  const dream = $('.dream')
  const dreamPlan = planIn('.dream')
  const { runner, anchor, burst } = dreamPlan.parts
  const phases = ['asleep', 'dreaming', 'moving', 'anchor', 'settled']
  const result = $('.dream__result')
  let dreamRun = 0
  let dreamCount = 0
  let runnerRaf = 0

  const place = (node, [x, y]) => node.setAttribute('transform', `translate(${x} ${y})`)
  const setPhase = (name) => {
    dream.dataset.phase = name
    const n = phases.indexOf(name)
    $$('.phases li', dream).forEach((li) => li.classList.toggle('is-shown', phases.indexOf(li.dataset.phase) <= n && n >= 0))
  }

  // the runner rolls along a path to the anchor
  const roll = (points, ms) => new Promise((done) => {
    const segs = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]))
    const total = segs.reduce((a, b) => a + b, 0)
    const t0 = performance.now()
    cancelAnimationFrame(runnerRaf)
    const step = (t) => {
      let d = clamp((t - t0) / (reduceMotion.matches ? 1 : ms)) * total
      let i = 0
      while (i < segs.length - 1 && d > segs[i]) d -= segs[i++]
      const a = points[i], b = points[i + 1], f = segs[i] ? d / segs[i] : 1
      place(runner, [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f])
      if (t - t0 < ms && !reduceMotion.matches) runnerRaf = requestAnimationFrame(step)
      else done()
    }
    runnerRaf = requestAnimationFrame(step)
  })

  async function playDream() {
    const id = ++dreamRun
    const live = () => id === dreamRun
    const keep = dreamCount++ % 2 === 0
    cancelAnimationFrame(runnerRaf)
    dreamPlan.setConfig('origin')
    dreamPlan.setLines(X, Y, 0)
    dreamPlan.drift(false)
    dreamPlan.shutExits(false)
    place(runner, [4.0, 11.5])
    place(anchor, dreamPlan.bayCentre(4, 1))
    place(burst, dreamPlan.bayCentre(4, 1))
    result.textContent = ''
    dream.classList.remove('is-done')
    setPhase('asleep')

    await wait(2200); if (!live()) return
    setPhase('dreaming')
    await wait(1600); if (!live()) return
    setPhase('moving')
    dreamPlan.shutExits(true)
    dreamPlan.setConfig('ring')
    dreamPlan.drift(true)
    await wait(2200); if (!live()) return
    dreamPlan.setConfig('strips')
    dreamPlan.drift(true)
    await wait(1200); if (!live()) return
    setPhase('anchor')
    await wait(900); if (!live()) return
    await roll([[4.0, 11.5], [2.8, 11.5], [2.8, 3.0], [6.4, 3.0]], 2800)
    if (!live()) return
    dream.classList.add('is-burst')
    dreamPlan.drift(false)
    if (!keep) dreamPlan.setConfig('origin')
    dreamPlan.shutExits(false)
    setPhase('settled')
    result.textContent = keep ? 'This time he kept the dreamt plan.' : 'This time he returned to the plan from before.'
    await wait(900)
    dream.classList.remove('is-burst')
    dream.classList.add('is-done')
  }

  $('.dream__play').addEventListener('click', playDream)
  new IntersectionObserver((entries, obs) => {
    if (entries.some((e) => e.isIntersecting)) { obs.disconnect(); playDream() }
  }, { threshold: 0.5 }).observe($('.dream__visual'))

  // ── 07: tilt, only if the visitor asks ──────────
  const tiltBtn = $('.tilt-try')
  const tiltStatus = $('.tilt-status')
  const phone = $('.phone')
  const tiltRunner = $('.runner--tilt')
  tiltBtn.addEventListener('click', async () => {
    const simulate = (msg) => { phone.classList.remove('is-live'); tiltStatus.textContent = msg }
    if (typeof DeviceOrientationEvent === 'undefined') return simulate('No tilt sensor here. Showing a simulation.')
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        if ((await DeviceOrientationEvent.requestPermission()) !== 'granted') return simulate('Permission declined. Showing a simulation.')
      } catch { return simulate('Tilt is not available. Showing a simulation.') }
    }
    let got = false
    const onTilt = (e) => {
      if (e.gamma == null || e.beta == null) return
      got = true
      phone.classList.add('is-live')
      const gx = clamp(e.gamma / 35, -1, 1)
      const gy = clamp((e.beta - 35) / 35, -1, 1)
      tiltRunner.setAttribute('cx', 120 + gx * 20)
      tiltRunner.setAttribute('cy', 76 + gy * 44)
      $('.phone__body').style.transform = `rotate(${gx * 10}deg)`
    }
    addEventListener('deviceorientation', onTilt)
    tiltStatus.textContent = 'Listening for tilt…'
    setTimeout(() => {
      if (got) return void (tiltStatus.textContent = 'Tilt the phone. Nothing is recorded.')
      removeEventListener('deviceorientation', onTilt)
      simulate('No tilt sensor found. Showing a simulation.')
    }, 1500)
  })

  // ── scroll loop ─────────────────────────────────
  let ticking = false
  const onScroll = () => {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => {
      setCurrent()
      setProgress()
      updateStories()
      ticking = false
    })
  }
  addEventListener('scroll', onScroll, { passive: true })
  addEventListener('resize', onScroll)
  onScroll()
})()
