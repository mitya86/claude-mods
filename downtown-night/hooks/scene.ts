// Downtown at night from a window high up a tower, in the thick of it: a glass tower right across
// the street in the middle of the view, cut off top and bottom; a street running away on its left;
// below and beyond, packed lower towers with lit windows and rooftop
// water tanks; a few taller ones rising past eye level; a needle tower and a strip of stars in the gap;
// traffic crawling along the streets far below, and now and then a plane on its way in.
//
// Everything still is drawn once. What moves:
// - traffic: each lane is one dashed path whose zero-length dashes, with round caps, are car lights;
//   the lane drives by animating stroke-dashoffset;
// - the plane: a <use> whose x and y are animated (a transform animation, even one waiting out its
//   delay, makes a backdrop cost far more CPU the whole time; x and y cost only while it crosses);
// - a few twinkling stars, blinking aviation lights, and office and far windows going on and off, by
//   opacity.
// Every animation steps on one shared 10 Hz clock. With animation off the scene stands still.
const W = 1600
const H = 900
const FPS = 10
const HZ = 330 // eye level: the far city melts into its own glow here; most towers' roofs sit below it
const VX = 330 // where the street running away from us meets the horizon: left of the tower across
// The tower right across the street, behind the transcript: its face, and its side wall toward VX.
const TX0 = 590
const TX1 = 1030
const TSIDE = 48
const hidden = (x: number) => x > TX0 - TSIDE && x < TX1

let seed = 2046
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)
const r1 = (n: number) => Math.round(n * 10) / 10
const rect = (x: number, y: number, w: number, h: number, fill: string, extra = '') =>
  `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" fill="${fill}"${extra}/>`
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]!
const snap = (n: number, p: number) => Math.round(n / p) * p

let css = ''
let defs = ''

// Stars: only the top of the sky, thinning out toward the glow.
let stars = ''
for (let i = 0; i < 150; i++) {
  const y = rnd() * 230
  if (rnd() < y / 230) continue
  const tw = rnd() < 0.08 ? ` class="tw${Math.floor(rnd() * 3)}"` : ''
  stars += `<circle cx="${r1(rnd() * W)}" cy="${r1(y)}" r="${r1(0.4 + rnd() * 0.8)}" fill="#f4f1ff" fill-opacity="${(0.25 + rnd() * 0.65).toFixed(2)}"${tw}/>`
}
css += [4, 6, 9].map((sec, i) => `.tw${i}{animation:tw ${sec}s steps(${sec * FPS}) ${-i * 2}s infinite}`).join('') +
  `@keyframes tw{0%,100%{opacity:1}50%{opacity:.2}}`

// Aviation lights on rooftops: dim red, all blinking together, slowly.
css += `.av{animation:av 3s steps(1) infinite}@keyframes av{50%{opacity:.15}}`
// Anything that moves or blinks is kept out of the still city (see bloom below): aviation lights and
// switching windows collect here and are drawn just after their row.
let moving = ''
const avLight = (x: number, y: number, s: number) => {
  const r = Math.max(1, 1.8 * s)
  moving += `<g class="av"><circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r * 5)}" fill="url(#avhalo)"/><circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="#ff5a4a"/></g>`
  return ''
}

// Lit windows of the city beyond: one pattern per depth row, a big tile of random floors (some fully
// lit, most sparse), in userSpace so each building shows a different part of it. Buildings are
// snapped to the window pitch, so the windows sit square in them.
const WIN = ['#ffc979', '#ffc979', '#ffc979', '#ffdca3', '#ffdca3', '#eea35a', '#d8e5ff']
const winPattern = (id: string, s: number, opacity: number) => {
  const pw = Math.max(3, Math.round(10 * s))
  const ph = Math.max(4, Math.round(13 * s))
  const ww = r1(Math.max(1, pw * 0.46))
  const wh = r1(Math.max(1.2, ph * 0.6))
  const C = s < 0.45 ? 21 : 27
  const R = s < 0.45 ? 27 : 35
  const ox = Math.floor((pw - ww) / 2) // whole pixels keep the tile's paths short
  const oy = Math.floor((ph - wh) / 2)
  const paths: Record<string, string> = {}
  const lit = new Set<number>()
  for (let r = 0; r < R; r++) {
    const share = rnd() < 0.15 ? 0.85 : 0.1 + rnd() * 0.45
    const tone = pick(WIN) // a floor tends to share one tone
    for (let c = 0; c < C; c++) {
      if (rnd() >= share) continue
      lit.add(r * C + c)
      const col = `${rnd() < 0.7 ? tone : pick(WIN)}|${pick(['1', '1', '.75', '.5'])}` // some rooms dimmer
      paths[col] = (paths[col] ?? '') + `M${c * pw + ox} ${r * ph + oy}h${ww}v${wh}h-${ww}z`
    }
  }
  defs += `<pattern id="${id}" width="${C * pw}" height="${R * ph}" patternUnits="userSpaceOnUse"><g opacity="${opacity}">` +
    Object.entries(paths).map(([k, d]) => { const [c, o] = k.split('|'); return `<path fill="${c}" fill-opacity="${o}" d="${d}"/>` }).join('') + `</g></pattern>`
  return { id, pw, ph, ww, wh, ox, oy, C, R, lit, opacity }
}
type Pat = ReturnType<typeof winPattern>
const textures = (k: number, P: Pat) => {
  const fw = r1(Math.max(0.8, P.pw * 0.16))
  defs += `<pattern id="fin${k}" width="${P.pw}" height="${P.ph}" patternUnits="userSpaceOnUse">${rect(0, 0, fw, P.ph, '#8a90b8', ' opacity=".09"')}</pattern>` +
    `<pattern id="band${k}" width="${P.pw}" height="${P.ph}" patternUnits="userSpaceOnUse">${rect(0, 0, P.pw, fw, '#8a90b8', ' opacity=".08"')}</pattern>`
}

// Far windows going on and off now and then: a window-sized rect over one cell of the pattern, lit
// where the tile's window is dark and dark where it is lit, shown for half of its long cycle.
css += [70, 110].map((sec, i) => `.sf${i}{animation:sf ${sec}s steps(1) infinite}`).join('') + `@keyframes sf{50%{opacity:0}}`
const flick = (P: Pat, x: number, wt: number, w: number, wb: number, body: string) => {
  const c = Math.floor(rnd() * (w / P.pw))
  const r = Math.floor(rnd() * ((wb - wt) / P.ph))
  const cx = x + c * P.pw
  const cy = wt + r * P.ph
  if (hidden(cx)) return ''
  const isLit = P.lit.has(((cy / P.ph) % P.R) * P.C + ((cx / P.pw) % P.C))
  const fill = isLit ? body : pick(WIN)
  const op = isLit ? '' : ` fill-opacity="${P.opacity}"`
  return `<rect x="${r1(cx + P.ox)}" y="${r1(cy + P.oy)}" width="${P.ww}" height="${P.wh}" fill="${fill}"${op} class="sf${Math.floor(rnd() * 2)}" style="animation-delay:-${Math.floor(rnd() * 110)}s"/>`
}

// Depth rows, far to near: where their street runs (base), their scale, how tall their buildings
// are, their colours (lighter and hazier with distance), and how fast their traffic moves. Rows are
// packed: buildings stand shoulder to shoulder, with only the odd gap.
type Row = { base: number; s: number; h: [number, number]; body: string[]; roof: string; win: number; speed: number }
const ROWS: Row[] = [
  { base: HZ + 22, s: 0.26, h: [8, 150], body: ['#1e1b2d', '#28243a', '#181726', '#2b2431'], roof: '#2c273a', win: 0.55, speed: 3 },
  { base: 440, s: 0.38, h: [40, 270], body: ['#161829', '#1f2337', '#121322', '#231d2b'], roof: '#24263a', win: 0.7, speed: 6 },
  { base: 560, s: 0.52, h: [80, 330], body: ['#111424', '#1a1f33', '#0d101c', '#1e1925'], roof: '#1f2437', win: 0.85, speed: 10 },
  { base: 710, s: 0.7, h: [130, 400], body: ['#0d101d', '#161c2e', '#0a0c16', '#1a1620'], roof: '#1b2032', win: 0.95, speed: 15 },
  { base: 885, s: 0.95, h: [170, 400], body: ['#0a0c17', '#12172a', '#070910', '#16121b'], roof: '#181d2e', win: 1, speed: 22 },
]

const mix = (a: string, b: string, t: number) => '#' + [1, 3, 5].map(i => {
  const v = Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t)
  return v.toString(16).padStart(2, '0')
}).join('')
ROWS.forEach((row, k) => row.body.forEach((c, n) => {
  defs += `<linearGradient id="f${k}${n}" x1="0" y1="${row.base - row.h[1]}" x2="0" y2="${row.base}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${mix(c, '#000000', 0.25)}"/><stop offset=".6" stop-color="${c}"/><stop offset="1" stop-color="${mix(c, '#5a3a30', 0.35)}"/></linearGradient>`
}))

// Towers taller than us, rising past eye level, by row: x, width, top, and a crown.
type Tower = { row: number; x: number; w: number; top: number; crown: 'steps' | 'spire' | 'slant' | 'flat' }
const TOWERS: Tower[] = [
  { row: 0, x: 120, w: 30, top: 205, crown: 'spire' },
  { row: 1, x: 470, w: 54, top: 130, crown: 'spire' },
  { row: 1, x: 1440, w: 50, top: 170, crown: 'flat' },
  { row: 2, x: 1120, w: 84, top: 85, crown: 'steps' },
  { row: 3, x: 400, w: 96, top: 160, crown: 'slant' },
  { row: 3, x: 1380, w: 80, top: 250, crown: 'flat' },
]

// Rooftops seen from above: the nearer and lower a roof, the more of its top shows.
// A row's buildings are gathered into one path per fill or stroke, which keeps the file small, and
// drawn in key order: roofs, faces, windows, facade texture, then lines.
let parts: Record<string, string> = {}
const add = (key: string, d: string) => { parts[key] = (parts[key] ?? '') + d }
const box = (x: number, y: number, w: number, h: number) => `M${r1(x)} ${r1(y)}h${r1(w)}v${r1(h)}h${r1(-w)}z`
const emit = () => {
  const out = Object.keys(parts).sort().map(k => {
    const [o, a, b, c] = k.split('|')
    return o === '5' ? `<path d="${parts[k]}" stroke="${a}" stroke-width="${b}" opacity="${c}"/>` : `<path fill="${a}" d="${parts[k]}"/>`
  }).join('')
  parts = {}
  return out
}
const roofFace = (row: Row, x: number, top: number, w: number) => {
  const d = Math.min(26, (top - HZ) * 0.07 * row.s)
  if (d < 1) return
  add(`1|${row.roof}`, box(x, top - d, w, d))
  add('1|#2a3046', box(x, top - d, w, Math.max(0.8, row.s)))
}
// A rooftop water tank on legs, with a conical cap.
const tank = (x: number, roof: number, s: number) => {
  const w = 16 * s
  const h = 18 * s
  const legs = 9 * s
  const c = '#1a1717'
  return `<path d="M${r1(x + 2 * s)} ${r1(roof)}V${r1(roof - legs)}M${r1(x + w - 2 * s)} ${r1(roof)}V${r1(roof - legs)}" stroke="${c}" stroke-width="${r1(Math.max(1, 1.5 * s))}"/>` +
    rect(x, roof - legs - h, w, h, '#2b211d') + rect(x, roof - legs - h, w, h, 'url(#tankshade)') +
    `<path d="M${r1(x - 1 * s)} ${r1(roof - legs - h)}L${r1(x + w / 2)} ${r1(roof - legs - h - 9 * s)}L${r1(x + w + s)} ${r1(roof - legs - h)}Z" fill="${c}"/>`
}

// One block of a building: body, the roof seen from above, its windows.
const block = (row: Row, P: Pat, x: number, top: number, w: number, face: string) => {
  const ph = P.ph
  const wt = Math.ceil((top + ph * 1.2) / ph) * ph
  const wb = Math.floor((row.base - ph) / ph) * ph
  roofFace(row, x, top, w)
  add(`2|url(#${face})`, box(x, top, w, row.base - top))
  if (wb <= wt) return ''
  add(`3|url(#${P.id})`, box(x, wt, w, wb - wt))
  // only where a window is big enough to notice it switching
  if (row.s > 0.45) for (let i = 0; i < 3; i++) if (rnd() < row.s * 0.6) moving += flick(P, x, wt, w, wb, `url(#${face})`)
  return ''
}

// What sets one building off from the next: an edge catching the city glow on the side toward the
// middle and a dark seam on the other, a texture on some facades (vertical fins or floor bands), a
// floodlit crown on a few, an antenna on some tall ones.
const details = (row: Row, k: number, P: Pat, x: number, top: number, w: number, h: number) => {
  const s = row.s
  const lw = r1(Math.max(0.8, 1.4 * s))
  const isLeft = x + w / 2 < W / 2
  add(`5|#5a5470|${lw}|.55`, `M${r1(isLeft ? x + w - lw / 2 : x + lw / 2)} ${top}V${row.base}`)
  add(`5|#020308|${lw}|.9`, `M${r1(isLeft ? x + lw / 2 : x + w - lw / 2)} ${top}V${row.base}`)
  const wt = Math.ceil((top + P.ph * 1.2) / P.ph) * P.ph
  const wb = Math.floor((row.base - P.ph) / P.ph) * P.ph
  const f = rnd()
  if (k >= 1 && wb > wt && f < 0.55) add(`4|url(#${f < 0.3 ? 'fin' : 'band'}${k})`, box(x, wt, w, wb - wt))
  if (rnd() < 0.2) add(`5|#ffcf8a|${r1(Math.max(1, 2.4 * s))}|.55`, `M${x} ${r1(top + 1.5 * s)}h${w}`)
  else if (h > row.h[1] * 0.45 && rnd() < 0.3) add(`5|${row.roof}|${lw}|1`, `M${r1(x + w * (0.2 + rnd() * 0.6))} ${top}v${r1(-(14 + rnd() * 26) * s)}`)
}

const tower = (t: Tower, row: Row, P: Pat) => {
  const pw = P.pw
  const body = row.body[0]!
  const face = `f${ROWS.indexOf(row)}0`
  let g = ''
  const crownLight = (x: number, y: number, w: number) => rect(x, y, w, Math.max(1.5, 2 * row.s), '#ffd9a0', ' opacity=".85"')
  if (t.crown === 'steps') {
    const tiers: [number, number, number][] = [[0, 90, 1], [0.14, 40, 0.72], [0.3, 0, 0.4]]
    for (const [dx, dy, fw] of tiers) {
      const x = t.x + snap(t.w * dx, pw)
      const w = snap(t.w * fw, pw)
      g += block(row, P, x, t.top + dy, w, face) + crownLight(x, t.top + dy, w)
    }
    g += rect(t.x + t.w * 0.48, t.top - 46, 2, 46, body) + avLight(t.x + t.w * 0.48 + 1, t.top - 46, 0.8)
  } else if (t.crown === 'spire') {
    g += block(row, P, t.x, t.top, t.w, face) + crownLight(t.x, t.top, t.w)
    g += `<path d="M${t.x + t.w * 0.2} ${t.top}L${t.x + t.w / 2} ${t.top - t.w * 0.5}L${t.x + t.w * 0.8} ${t.top}Z" fill="${body}"/>`
    g += rect(t.x + t.w / 2 - 1, t.top - t.w * 1.5, 2, t.w, body) + avLight(t.x + t.w / 2, t.top - t.w * 1.5, 0.8)
  } else if (t.crown === 'slant') {
    const drop = t.w * 0.6
    g += block(row, P, t.x, t.top + drop, t.w, face)
    g += `<path d="M${t.x} ${t.top + drop}L${t.x + t.w} ${t.top}V${t.top + drop + 2}H${t.x}Z" fill="${body}"/>`
    g += `<path d="M${t.x} ${t.top + drop}L${t.x + t.w} ${t.top}" stroke="#ffd9a0" stroke-width="1.5" opacity=".8"/>`
  } else {
    g += block(row, P, t.x, t.top, t.w, face) + crownLight(t.x, t.top, t.w) + avLight(t.x + t.w / 2, t.top - 2, row.s)
  }
  return g
}

// The needle tower, far off on row 1, seen through the gap: legs pinched at the waist, a glowing deck,
// a spire with a light. Drawn in local units, tip at 0 and base at 400, then scaled into place.
const NX = 1290
const NS = 0.62
const needle = (() => {
  const c = '#191b2e'
  let g = `<ellipse cx="0" cy="70" rx="120" ry="60" fill="url(#deckglow)"/>`
  g += `<path d="M-26 400C-12 300 -5 250 -6 200S-12 120 -10 96H10C12 120 5 160 6 200S12 300 26 400H14C4 300 2 250 2 200V110H-2V200C-2 250 -4 300 -14 400Z" fill="${c}"/>`
  g += `<path d="M-10 96L-50 74H50L10 96Z" fill="#1d2034"/>` // underside
  g += rect(-52, 66, 104, 8, '#2a2a3c') // deck rim
  g += `<path d="M-50 70H50" stroke="#ffe2b0" stroke-width="3" stroke-dasharray="3 2"/>` // deck windows
  g += `<path d="M-46 66L-20 52H20L46 66Z" fill="${c}"/>` // roof
  g += rect(-8, 44, 16, 8, c) + rect(-1.5, 0, 3, 44, c)
  return `<g transform="translate(${NX} ${ROWS[1]!.base - 400 * NS}) scale(${NS})">${g}</g>`
})()

// Traffic: a car is two lights, a dash pattern "0 d 0 gap" with round caps (or one light, seen end
// on). The pattern's period is longer than the screen, so no repeat shows; the lane drives one period
// per loop. Each path runs the way its lane drives, so the lights move forward as the offset falls.
const lane = (id: string, d: string, s: number, speed: number, isHead: boolean, spread = 0.6, isPair = true, span = 1700) => {
  const arr: number[] = []
  let L = 0
  while (L < span) {
    const d = Math.max(1.5, 3 * s)
    const gap = Math.round((10 + rnd() * rnd() * 170) * s * 2 * spread)
    if (isPair) arr.push(0, r1(d), 0, gap)
    else arr.push(0, gap)
    L += (isPair ? d : 0) + gap
  }
  L = r1(L)
  const sec = Math.max(1, Math.round(L / speed))
  css += `.${id}{animation:${id} ${sec}s steps(${sec * FPS}) infinite}@keyframes ${id}{from{stroke-dashoffset:0}to{stroke-dashoffset:${-L}px}}`
  defs += `<path id="${id}p" d="${d}" stroke-dasharray="${arr.join(' ')}"/>`
  const col = isHead ? '#fff1d2' : '#ff4433'
  const glow = isHead ? '#ffd28a' : '#ff3322'
  // far streets skip the glow: too small to see, and each animated stroke costs a repaint
  return (s < 0.45 ? '' : `<use href="#${id}p" class="${id}" stroke="${glow}" stroke-width="${r1(Math.max(3, 6 * s))}" stroke-opacity=".16"/>`) +
    `<use href="#${id}p" class="${id}" stroke="${col}" stroke-width="${r1(Math.max(1.4, 3 * s))}"/>`
}
// Cars only run where they can be seen, either side of the tower across the street: a moving dash
// repaints everything over it.
const SEGS: [string, number, number][] = [['l', -20, TX0 - TSIDE + 4], ['r', TX1 - 4, W + 20]]
const road = (row: Row, k: number) => {
  const s = row.s
  const h = 16 * s
  let g = rect(-20, row.base, W + 40, h, '#0b0d15') + rect(-20, row.base, W + 40, h, 'url(#roadglow)')
  g += `<path d="M-20 ${r1(row.base + 1.5 * s)}H${W + 20}" stroke="#ffcf86" stroke-width="${r1(Math.max(1, 1.6 * s))}" stroke-dasharray="0 ${r1(34 * s)}" opacity=".75"/>`
  let t = `<g fill="none" stroke-linecap="round">`
  for (const [side, a, b] of SEGS) {
    const span = b - a + 60
    t += lane(`t${k}${side}a`, `M${b} ${r1(row.base + 6 * s)}H${a}`, s, row.speed, true, 0.6, true, span) +
      lane(`t${k}${side}b`, `M${a} ${r1(row.base + 11 * s)}H${b}`, s, row.speed * 1.15, false, 0.6, true, span)
  }
  t += `</g>`
  return { still: g, traffic: t }
}

// A street running away from us, left of the tower across the street, between the blocks, from row 2's avenue to below
// the view.
const BT = ROWS[2]!.base + 16 * ROWS[2]!.s
const BB = H + 40
const bAt = (y: number) => {
  const t = (y - BT) / (BB - BT)
  return { cx: VX - 30 * t, hw: 12 + 80 * t }
}
const boulevard = (() => {
  const a = bAt(BT)
  const b = bAt(BB)
  const shape = `M${a.cx - a.hw} ${BT}H${a.cx + a.hw}L${b.cx + b.hw} ${BB}H${b.cx - b.hw}Z`
  let g = `<path d="${shape}" fill="#0b0d15"/><path d="${shape}" fill="url(#blvdglow)"/>`
  for (const side of [-1, 1]) {
    g += `<path d="M${a.cx + side * (a.hw + 2)} ${BT}L${b.cx + side * (b.hw + 8)} ${BB}" stroke="#ffcf86" stroke-width="2" stroke-linecap="round" stroke-dasharray="0 30" opacity=".75"/>`
  }
  const lanePath = (f: number, isAway: boolean) => {
    const [y0, y1] = isAway ? [BB, BT] : [BT, BB]
    const p = (y: number) => { const q = bAt(y); return `${r1(q.cx + f * q.hw)} ${r1(y)}` }
    return `M${p(y0)}L${p(y1)}`
  }
  g += `<g fill="none" stroke-linecap="round">` +
    lane('ba', lanePath(-0.6, true), 1.2, 16, false, 0.35, false) + lane('bc', lanePath(-0.22, true), 1.2, 19, false, 0.4, false) +
    lane('bb', lanePath(0.22, false), 1.2, 15, true, 0.35, false) + lane('bd', lanePath(0.6, false), 1.2, 18, true, 0.45, false) + `</g>`
  return g
})()
const BGAP = (k: number): [number, number] | undefined => {
  if (k < 3) return undefined
  const q = bAt(ROWS[k]!.base)
  return [q.cx - q.hw - 10, q.cx + q.hw + 10]
}

// The city beyond, far to near: buildings shoulder to shoulder, the taller towers, then the avenue
// in front of them.
let city = ''
let still = ''
ROWS.forEach((row, k) => {
  const P = winPattern(`w${k}`, row.s, row.win)
  const pw = P.pw
  moving = ''
  textures(k, P)
  let g = ''
  let prev = -1
  if (k === 1) avLight(NX, ROWS[1]!.base - 400 * NS, 0.9)
  const gap = BGAP(k)
  const roofs: string[] = []
  for (let x = snap(-rnd() * 60, pw); x < W + 20; ) {
    let w = Math.max(3 * pw, snap((34 + rnd() * 80) * row.s * 1.3, pw))
    if (gap && x < gap[1] && x + w > gap[0]) {
      // keep the street clear: end this building before it, or jump past it
      if (gap[0] - x >= 3 * pw) w = Math.floor((gap[0] - x) / pw) * pw
      else { x = Math.ceil(gap[1] / pw) * pw; continue }
    }
    const h = row.h[0] + rnd() * rnd() * (row.h[1] - row.h[0])
    const top = Math.round(row.base - h)
    let n = Math.floor(rnd() * row.body.length)
    if (n === prev) n = (n + 1) % row.body.length // never the same tone as the neighbour
    prev = n
    if (k >= 2 && h > row.h[1] * 0.5 && w >= 6 * pw && rnd() < 0.35) {
      // a setback: a narrower upper tier on a wider base
      const inset = snap(w * 0.2, pw)
      const lower = Math.round(top + h * (0.2 + rnd() * 0.2))
      block(row, P, x + inset, top, w - 2 * inset, `f${k}${n}`)
      details(row, k, P, x + inset, top, w - 2 * inset, h)
      block(row, P, x, lower, w, `f${k}${n}`)
    } else {
      block(row, P, x, top, w, `f${k}${n}`)
      details(row, k, P, x, top, w, h)
    }
    if (k >= 2 && top > HZ + 30 && rnd() < 0.3) roofs.push(tank(x + w * (0.15 + rnd() * 0.5), top - 2, row.s))
    else if (h > row.h[1] * 0.6 && rnd() < 0.5) g += avLight(x + w / 2, top - 1, row.s)
    x += w + (rnd() < 0.08 ? pw * 2 : 0)
  }
  g += roofs.join('')
  const blocks = emit()
  // the taller towers stand in front of the row, so their parts are drawn after it
  let tw = ''
  for (const t of TOWERS.filter(t => t.row === k)) tw += tower({ ...t, x: snap(t.x, pw), w: snap(t.w, pw) }, row, P)
  g = (k === 1 ? needle : '') + blocks + g + emit() + tw
  const rd = k < 4 ? road(row, k) : { still: '', traffic: '' }
  defs += `<g id="row${k}">${g}${rd.still}</g>`
  still += `<use href="#row${k}"/>`
  city += `<use href="#row${k}"/>${moving}${rd.traffic}`
  if (k === 2) city += boulevard
  // mist over each street, thinning toward us
  if (k === 0) city += rect(0, HZ - 50, W, 160, 'url(#haze)')
  else if (k < 4) city += rect(0, row.base - 70 * row.s, W, 90 * row.s, 'url(#haze)', ` opacity="${(0.9 - k * 0.2).toFixed(1)}"`)
})

// The tower right across the street, cut off by the view: a glass wall of floors (a pattern of
// dark panes between mullions and floor slabs), the city glow reflected in it, lit offices with their
// ceiling lights, and the side wall running away toward the street's vanishing point.
// Lit rooms: bright under the ceiling, falling off to a deep tone toward the floor. [ceiling, middle, floor]
const LIT = [['#fff1d6', '#f0b262', '#5a3420'], ['#fff6e6', '#e8c08a', '#4a3324'], ['#ffffff', '#b8c8e6', '#2c3550']]
LIT.forEach(([a, b, c], i) => {
  defs += `<linearGradient id="lit${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}" stop-opacity=".9"/><stop offset=".22" stop-color="${b}" stop-opacity=".72"/><stop offset="1" stop-color="${c}" stop-opacity=".7"/></linearGradient>`
})
css += `.sw{animation:sw 37s steps(1) infinite}@keyframes sw{0%,46%{opacity:1}50%,96%{opacity:0}}`
const near = (id: string, x0: number, x1: number, pw: number, ph: number, inner: number, sideW: number) => {
  // the glass wall, and one pane per tone (lit from the ceiling, fading down) that a lit run of
  // cells shows through: a run is one rect over the cells, the pattern puts the panes in place
  const pane = `x="1" y="1" width="${pw - 2}" height="${ph - 14}"`
  defs += `<pattern id="${id}" x="${x0}" y="0" width="${pw}" height="${ph}" patternUnits="userSpaceOnUse">` +
    rect(0, 0, pw, ph, '#06080e') + `<rect ${pane} fill="#0b0f1a"/>` + rect(0, ph - 12, pw, 12, '#07080f') + `</pattern>`
  const fixtures = rect(pw * 0.25, 3, pw * 0.5, 1.2, '#ffffff', ' opacity=".6"')
  // blinds: a softer, warmer band drawn down from the top of the pane, to different heights
  const ih = ph - 14
  const blind = (f: number) => `<rect x="1" y="1" width="${pw - 2}" height="${r1(ih * f)}" fill="url(#blind)"/>`
  LIT.forEach((_, i) => {
    for (const [v, extra] of [['', fixtures], ['b', blind(0.3)], ['c', blind(0.62)]] as const) {
      defs += `<pattern id="${id}${i}${v}" x="${x0}" y="0" width="${pw}" height="${ph}" patternUnits="userSpaceOnUse"><rect ${pane} fill="url(#lit${i})"/>${extra}</pattern>`
    }
  })
  let g = rect(x0, -10, x1 - x0, H + 20, `url(#${id})`) + rect(x0, -10, x1 - x0, H + 20, 'url(#refl)')
  const runs: Record<string, string> = {}
  const cols = Math.round((x1 - x0) / pw)
  for (let y = 0; y < H; y += ph) {
    const state = rnd()
    const p = state < 0.42 ? 0 : state < 0.8 ? 0.2 + rnd() * 0.4 : 0.92
    const tone = rnd() < 0.15 ? 2 : rnd() < 0.55 ? 0 : 1 // cool white offices are the rarer ones
    // each lit room its own: blinds or not, and how bright
    for (let c = 0; c < cols; ) {
      const n = Math.min(cols - c, 2 + Math.floor(rnd() * 3)) // a room spans a few panes
      if (rnd() < p) {
        const key = `${tone}${pick(['', '', 'b', 'c'])}|${pick(['1', '1', '.8', '.6'])}`
        runs[key] = (runs[key] ?? '') + `M${x0 + c * pw} ${y}h${n * pw}v${ph}h-${n * pw}z`
      }
      c += n
    }
    if (rnd() < 0.12) {
      // an office light going on and off now and then
      const c = Math.floor(rnd() * (cols - 1))
      g += rect(x0 + c * pw, y, pw * 2, ph, `url(#${id}${tone})`, ` class="sw" style="animation-delay:-${Math.floor(rnd() * 37)}s"`)
    }
  }
  g += `<g id="${id}lit">` + Object.entries(runs).map(([k, d]) => { const [f, o] = k.split('|'); return `<path fill="url(#${id}${f})" fill-opacity="${o}" d="${d}"/>` }).join('') + `</g>`
  g += `<use href="#${id}lit" filter="url(#bloomN)" opacity=".9"/>` // light spilling onto the frame around each room
  g += rect(x0, -10, x1 - x0, H + 20, 'url(#sheen)') // a long soft sheen across the glass
  // the side wall, its floors converging on the street's vanishing point
  const dir = Math.sign(VX - inner)
  const outer = inner + dir * sideW
  const t = sideW / Math.abs(VX - inner)
  const at = (y: number) => r1(y + (HZ - y) * t)
  g += `<path d="M${inner} -10L${outer} ${at(-10)}V${at(H + 10)}L${inner} ${H + 10}Z" fill="#070910"/>`
  let slabs = ''
  let lit = ''
  for (let y = 0; y < H; y += ph) {
    slabs += `M${inner} ${y}L${outer} ${at(y)}`
    if (rnd() < 0.3) lit += `M${inner} ${y + 1}L${outer} ${at(y + 1)}V${at(y + ph - 13)}L${inner} ${y + ph - 13}Z`
  }
  g += `<path d="${slabs}" stroke="#141a2a" stroke-width="2"/><path d="${lit}" fill="#f0b262" opacity=".09"/>`
  g += rect(inner - (dir > 0 ? 1.5 : 0), -10, 1.5, H + 20, '#2c3550') // the corner catching the light
  return g
}
const nearTowers = near('nt', TX0, TX1, 22, 52, TX0, TSIDE)

// A plane on approach, right to left, slowly descending: a bright landing light, red and green
// wingtips, a white strobe. It passes behind the tower across the street.
css += `.st{animation:st 1.4s steps(1) infinite}@keyframes st{0%{opacity:1}8%,100%{opacity:0}}`
const plane =
  `<circle cx="0" cy="0" r="16" fill="url(#land)"/><circle cx="0" cy="0" r="1.8" fill="#fffaf0"/>` +
  `<circle cx="9" cy="-2" r="1.2" fill="#ff3b30"/><circle cx="14" cy="1" r="1.2" fill="#39e07a"/>` +
  `<circle cx="22" cy="-3" r="1.1" fill="#ffffff" class="st"/>`
const PLANE_CYCLE = 75
const PLANE_SEC = 34
css += `.plane{x:${1300}px;y:70px;animation:plane ${PLANE_CYCLE}s steps(1) 6s infinite}` +
  `@keyframes plane{0%{x:1300px;y:70px;animation-timing-function:steps(${PLANE_SEC * FPS})}${((PLANE_SEC / PLANE_CYCLE) * 100).toFixed(2)}%,100%{x:280px;y:135px}}`

// Our own window: a sill along the bottom and one mullion, with a faint edge catching the city light.
const frame =
  rect(0, H - 22, W, 22, '#04050a') + rect(0, H - 22, W, 2, '#232a40') +
  rect(1330, 0, 10, H, '#04050a') + rect(1330, 0, 1.5, H, '#1e2438') + rect(1338.5, 0, 1.5, H, '#2a3048')

export const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<style>
${css}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="${HZ + 60}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#03050d"/><stop offset=".5" stop-color="#0a0f22"/><stop offset=".85" stop-color="#231e30"/><stop offset="1" stop-color="#3d2b2c"/></linearGradient>
<radialGradient id="cityglow" cx="${W / 2}" cy="${HZ}" r="800" gradientTransform="matrix(1 0 0 .35 0 ${HZ * 0.65})" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff9a52" stop-opacity=".3"/><stop offset=".5" stop-color="#d0704a" stop-opacity=".1"/><stop offset="1" stop-color="#d0704a" stop-opacity="0"/></radialGradient>
<linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2c34" stop-opacity="0"/><stop offset=".4" stop-color="#3a2c34" stop-opacity=".35"/><stop offset="1" stop-color="#3a2c34" stop-opacity="0"/></linearGradient>
<linearGradient id="roadglow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb46a" stop-opacity=".1"/><stop offset="1" stop-color="#ffb46a" stop-opacity=".02"/></linearGradient>
<linearGradient id="blvdglow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb46a" stop-opacity=".03"/><stop offset="1" stop-color="#ffb46a" stop-opacity=".08"/></linearGradient>
<linearGradient id="refl" x1="0" y1="0" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3a4570" stop-opacity=".1"/><stop offset=".45" stop-color="#ff9a52" stop-opacity=".05"/><stop offset=".7" stop-color="#ff9a52" stop-opacity=".1"/><stop offset="1" stop-color="#ffb46a" stop-opacity=".04"/></linearGradient>
<linearGradient id="tankshade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset=".4" stop-color="#ffb46a" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
<radialGradient id="deckglow"><stop offset="0" stop-color="#ffd59a" stop-opacity=".28"/><stop offset="1" stop-color="#ffd59a" stop-opacity="0"/></radialGradient>
<filter id="bloom" x="0" y="0" width="${W}" height="${H}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 1.6 1 0 2 -3.3"/><feGaussianBlur stdDeviation="4"/></filter>
<filter id="bloomN" x="0" y="0" width="${W}" height="${H}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 1.6 1 0 2 -3.1"/><feGaussianBlur stdDeviation="8"/></filter>
<linearGradient id="blind" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6dcb2" stop-opacity=".55"/><stop offset="1" stop-color="#e2b47e" stop-opacity=".75"/></linearGradient>
<linearGradient id="sheen" x1="${TX0}" y1="0" x2="${TX1}" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset=".3" stop-color="#9fb4ff" stop-opacity="0"/><stop offset=".45" stop-color="#9fb4ff" stop-opacity=".06"/><stop offset=".52" stop-color="#ffffff" stop-opacity=".03"/><stop offset=".7" stop-color="#9fb4ff" stop-opacity="0"/></linearGradient>
<radialGradient id="avhalo"><stop offset="0" stop-color="#ff4a3a" stop-opacity=".45"/><stop offset="1" stop-color="#ff4a3a" stop-opacity="0"/></radialGradient>
<radialGradient id="land"><stop offset="0" stop-color="#fff6e0" stop-opacity=".55"/><stop offset="1" stop-color="#fff6e0" stop-opacity="0"/></radialGradient>
<g id="planeS">${plane}</g>
${defs}
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
${stars}
<use href="#planeS" class="plane"/>
<rect width="${W}" height="${H}" fill="url(#cityglow)"/>
${rect(0, HZ, W, H - HZ, '#0a0b14')}
${city}
<g filter="url(#bloom)" opacity=".8">${still}</g>
${nearTowers}
${frame}
</svg>`
