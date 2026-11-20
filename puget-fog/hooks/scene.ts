// Puget Sound on a grey afternoon, from the Seattle shore looking west: the faint shape of the
// mountains, forested islands in layers that grow paler with distance, fog lying on the water and
// wrapped around the islands, a ferry and small boats crossing, and a pebble beach with old pilings
// in the near corner.
//
// Everything still is drawn once. What moves:
// - the boats: each a <use> whose x is animated (never a transform: that costs CPU all the time);
// - the fog: three groups of soft patches drifting back and forth, on a slow 2 Hz clock;
// - a few glints on the water under the bright patch of sky, by opacity.
// The boats step on a 10 Hz clock. With animation off the scene stands still.
const W = 1600
const H = 900
const FPS = 10
const FOG_FPS = 2
const HZ = 470 // the far shore line, where fog and water meet

let seed = 1851
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)
const r1 = (n: number) => Math.round(n * 10) / 10
const between = (a: number, b: number) => a + rnd() * (b - a)

let css = ''

// A forested island: a long low hill whose top edge is a row of fir spikes.
function island(x0: number, x1: number, base: number, peak: number, th: [number, number], tw: [number, number], ph: number) {
  let d = `M${x0} ${base + 3}`
  let x = x0
  while (x < x1) {
    const t = (x - x0) / (x1 - x0)
    const env = Math.sin(Math.PI * t) ** 0.7 * (0.75 + 0.25 * Math.sin(t * 9 + ph)) * (0.88 + 0.12 * Math.sin(t * 27 + ph * 2))
    const g = base - peak * env
    const w = between(tw[0], tw[1])
    const h = between(th[0], th[1]) * (0.35 + 0.65 * Math.min(1, env * 4))
    d += `L${r1(x)} ${r1(g)}L${r1(x + w / 2)} ${r1(g - h)}`
    x += w * between(0.5, 0.95)
  }
  return d + `L${x1} ${base + 3}Z`
}
// An island, a faint squashed reflection under it, and a pale strip of beach along its foot.
const isle = (d: string, base: number, fill: string, x0: number, x1: number, beach: string) =>
  `<path d="${d}" fill="${fill}"/>` +
  `<path d="${d}" fill="${fill}" opacity=".18" transform="matrix(1 0 0 -.3 0 ${r1(base * 1.3 + 4)})"/>` +
  `<rect x="${x0 + 30}" y="${base + 1}" width="${x1 - x0 - 60}" height="1.6" fill="${beach}"/>`

// The mountains behind everything: one ragged ridge, barely darker than the sky.
let ridge = `M-20 ${HZ}`
for (let x = -20, y = 380; x <= W + 20; x += between(14, 40)) {
  y = Math.max(318, Math.min(410, y + between(-14, 14) + (x > 300 && x < 1000 ? -1.2 : 1)))
  ridge += `L${r1(x)} ${r1(y)}`
}
ridge += `L${W + 20} ${HZ}Z`

const far =
  isle(island(380, 1010, HZ, 24, [1.5, 3.5], [3, 5], 1), HZ, '#b2bbc0', 380, 1010, '#c9cfd1') +
  isle(island(1240, 1720, HZ, 18, [1.5, 3], [3, 5], 4), HZ, '#b5bdc2', 1240, 1720, '#c9cfd1')
const mid = isle(island(-80, 780, HZ + 4, 64, [4, 9], [3.5, 6], 2.2), HZ + 4, '#8c9a9b', -80, 780, '#b3bab8')
const near = isle(island(1150, 1760, HZ + 12, 104, [9, 21], [5.5, 9.5], 5.1), HZ + 12, '#617370', 1150, 1760, '#a2a9a5')

// Fog: patches of soft mist, each an ellipse filled with a radial fade.
function patches(n: number, y0: number, y1: number, rx: [number, number], ry: [number, number], x0 = -250, x1 = W + 250) {
  let g = ''
  for (let i = 0; i < n; i++) {
    g += `<ellipse cx="${r1(between(x0, x1))}" cy="${r1(between(y0, y1))}" rx="${r1(between(rx[0], rx[1]))}" ry="${r1(between(ry[0], ry[1]))}" fill="url(#fog)" opacity="${between(0.55, 0.95).toFixed(2)}"/>`
  }
  return g
}
// Each group drifts sideways and back, slow enough that its 2 Hz steps are under a pixel.
function drift(id: string, sec: number, dx: number, delay: number) {
  css += `.${id}{animation:${id} ${sec}s steps(${sec * FOG_FPS}) ${-delay}s infinite alternate}` +
    `@keyframes ${id}{from{x:${-dx}px}to{x:${dx}px}}`
  return `<use href="#${id}S" class="${id}"/>`
}
const fogFar = patches(12, HZ - 30, HZ + 2, [140, 320], [10, 22])
const fogMid = patches(14, HZ - 50, HZ + 10, [120, 300], [12, 30], -250, 950)
const fogNear = patches(10, HZ + 8, HZ + 70, [200, 420], [10, 26])
const fogHill = patches(7, HZ - 70, HZ - 10, [90, 200], [14, 34], 1100, 1800)

// Water texture: short level streaks, closer together and shorter toward the horizon.
let lightRip = ''
let darkRip = ''
for (let i = 0; i < 400; i++) {
  const u = rnd() ** 1.7
  const y = HZ + 6 + u * (H - HZ - 6)
  const len = 4 + 70 * u * between(0.4, 1)
  const s = `M${r1(between(-40, W))} ${r1(y)}h${r1(len)}`
  if (rnd() < 0.55) lightRip += s
  else darkRip += s
}

// Glints under the bright patch of sky, in three sets that take turns.
const SUNX = 1130
const glints = [0, 1, 2].map(k => {
  let d = ''
  for (let i = 0; i < 26; i++) {
    const u = rnd() ** 1.4
    const y = HZ + 14 + u * 300
    const spread = 30 + u * 140
    d += `M${r1(SUNX + between(-spread, spread))} ${r1(y)}h${r1(3 + u * 22)}`
  }
  css += `.g${k}{animation:gl 2.4s steps(1) ${-k * 0.8}s infinite}`
  return `<path class="g${k}" d="${d}" stroke="#f7f8f6" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>`
}).join('')
css += `@keyframes gl{0%{opacity:.8}33%,100%{opacity:0}}`

// Low cloud: a few broad, faint darker bands in the upper sky.
const clouds = patches(9, 30, 260, [300, 620], [30, 70]).replace(/url\(#fog\)/g, 'url(#cloud)')

// A boat crossing: it waits off-screen, crosses in `sec` seconds, and waits again.
function crossing(id: string, cycle: number, sec: number, from: number, to: number, delay: number, y: number) {
  css += `.${id}{x:${from}px;animation:${id} ${cycle}s steps(1) ${-delay}s infinite}` +
    `@keyframes ${id}{0%{x:${from}px;animation-timing-function:steps(${sec * FPS})}${((sec / cycle) * 100).toFixed(2)}%,100%{x:${to}px}}`
  return `<use href="#${id}S" class="${id}" y="${y}"/>`
}

// The ferry, heading left toward the islands: white with a green band, two decks of windows, a
// wheelhouse and a funnel, a long pale wake behind. Seen through the fog, so a little washed out.
const ferryS =
  `<path d="M160 11C210 10 330 12 430 13L430 15C330 16 210 15 156 14Z" fill="url(#wake)"/>` +
  `<ellipse cx="80" cy="17" rx="84" ry="4.5" fill="#7e8a8d" opacity=".25"/>` +
  `<path d="M-3 11C-7 10-7 15-2 15Z" fill="#f4f5f3" opacity=".8"/>` +
  `<path d="M0 2H160L155 14H5Z" fill="#eceeeb"/><path d="M1 7.5H159L158.4 10H1.6Z" fill="#3e6b58"/>` +
  `<rect x="5" y="14" width="150" height="1.4" fill="#66716f" opacity=".6"/>` +
  `<rect x="4" y="-8" width="152" height="10" fill="#e8eae7"/><rect x="10" y="-6" width="140" height="5" fill="#778285"/>` +
  `<rect x="9" y="-18" width="142" height="10" fill="#eef0ed"/><rect x="12" y="-15" width="136" height="3" fill="#F0CF8E"/>` +
  `<rect x="9" y="-18.6" width="142" height=".8" fill="#9aa3a5"/>` +
  `<rect x="14" y="-25" width="18" height="7" fill="#e5e8e5"/><rect x="15.5" y="-23" width="15" height="1.8" fill="#E8C788"/>` +
  `<rect x="128" y="-25" width="18" height="7" fill="#e5e8e5"/><rect x="129.5" y="-23" width="15" height="1.8" fill="#E8C788"/>` +
  `<rect x="74" y="-30" width="12" height="12" fill="#e1e4e1"/><rect x="74" y="-30" width="12" height="2" fill="#3a4545"/>` +
  `<path d="M23 -25V-32M137 -25V-32" stroke="#7d8789" stroke-width=".8"/>`

// A small sailboat far out, heading right, sails slack in the still air.
const sailS =
  `<ellipse cx="11" cy="4.5" rx="12" ry="1.6" fill="#7e8a8d" opacity=".25"/>` +
  `<path d="M0 0H22L19 3H3Z" fill="#4f5b5f"/><path d="M10.5 -1V-30" stroke="#59656a" stroke-width=".7"/>` +
  `<path d="M11 -29L11 -1.5L20 -1.5Z" fill="#eef0ef"/><path d="M10 -27L10 -1.5L2 -1.5Z" fill="#e3e6e6"/>`

// A tug heading left: dark hull with a muted red band, white cabin and wheelhouse, a black funnel.
const tugS =
  `<path d="M58 6C90 5 130 7 170 8L170 9.5C130 10.5 90 10 56 9Z" fill="url(#wake)"/>` +
  `<ellipse cx="29" cy="12" rx="32" ry="3.5" fill="#56625f" opacity=".25"/>` +
  `<path d="M-2 7C-5 6-5 10-1 10Z" fill="#f4f5f3" opacity=".8"/>` +
  `<path d="M0 0H58L54 9H5Z" fill="#323d3e"/><path d="M0.5 1H57.5L57 3.2H1Z" fill="#8c4a3f"/>` +
  `<rect x="16" y="-11" width="26" height="11" fill="#e6e4dd"/><rect x="19" y="-8" width="20" height="2.4" fill="#E3C080"/>` +
  `<rect x="22" y="-19" width="15" height="8" fill="#eae8e1"/><rect x="23.5" y="-16.5" width="12" height="2.4" fill="#EACB8C"/>` +
  `<rect x="41" y="-18" width="5" height="7" fill="#2c3133"/><path d="M29.5 -19V-30M26 -26H33" stroke="#4a5456" stroke-width=".9"/>`

// A small fishing boat close in, heading right: white hull with a navy stripe, a cabin forward,
// trolling poles, and a wider wake behind it.
const fishS =
  `<path d="M2 7C-40 4-110 2-180 3L-180 6C-110 8-40 10 4 10Z" fill="url(#wakeR)"/>` +
  `<path d="M4 9C-30 14-80 22-130 28L-128 29.5C-80 24-30 17 6 11Z" fill="#f2f4f3" opacity=".35"/>` +
  `<ellipse cx="36" cy="15" rx="40" ry="4.5" fill="#56625f" opacity=".25"/>` +
  `<path d="M74 8C78 7 79 11 75 12Z" fill="#f4f5f3" opacity=".8"/>` +
  `<path d="M0 0H72L66 12H6Z" fill="#f0f1ee"/><path d="M1 2.5H71L70 5H2Z" fill="#2d4560"/>` +
  `<rect x="6" y="11" width="60" height="1.6" fill="#6a7473" opacity=".6"/>` +
  `<path d="M38 0V-13H54L58 0Z" fill="#eceeeb"/><path d="M41 -10H53L55.5 -4H41Z" fill="#E8C788"/>` +
  `<path d="M44 -13V-34M44 -32L20 -12M44 -32L66 -14" stroke="#6b7577" stroke-width=".8" fill="none"/>` +
  `<rect x="10" y="-4" width="20" height="4" fill="#d9dcd8"/>`

const ferry = crossing('ferry', 180, 120, W + 40, -460, 50, HZ + 38)
const sail = crossing('sail', 260, 210, -40, W + 20, 30, HZ + 18)
const tug = crossing('tug', 300, 120, W + 20, -200, 250, HZ + 128)
const fish = crossing('fish', 220, 95, -90, W + 200, 20, HZ + 250)

// The near corner: a pebble beach, a bleached log, and old pilings standing in the shallows.
let pebL = ''
let pebD = ''
for (let i = 0; i < 160; i++) {
  const x = between(0, 470)
  const top = 800 + x * 0.17 + (x / 470) ** 3 * 40
  if (top + 4 > H) continue
  const y = between(top + 4, H)
  const s = between(1, 3.4) * (0.5 + (y - 790) / 180)
  const e = `M${r1(x)} ${r1(y)}a${r1(s)} ${r1(s * 0.6)} 0 1 0 0.1 0Z`
  if (rnd() < 0.5) pebL += e
  else pebD += e
}
const beach =
  `<path d="M0 795C120 812 260 830 360 858C410 872 450 888 480 ${H}H0Z" fill="url(#beach)"/>` +
  `<path d="M0 795C120 812 260 830 360 858C410 872 450 888 480 ${H}" stroke="#e4e7e6" stroke-width="2" fill="none" opacity=".35"/>` +
  `<path d="M0 795C120 812 260 830 360 858C410 872 450 888 480 ${H}" stroke="#4a4e4b" stroke-width="18" fill="none" opacity=".35" transform="translate(-6 10)"/>` +
  `<path d="M300 872c4-10 22-12 30-4c6 6 2 14-6 15c-10 1-26 0-24-11Z" fill="#5f625d"/>` +
  `<path d="M150 884c2-8 16-11 24-5c5 5 3 12-5 13c-9 1-20 0-19-8Z" fill="#666962"/>` +
  `<path d="M28 812c3-6 13-7 17-2c3 4 1 9-4 9c-6 1-14 0-13-7Z" fill="#6c6f68"/>` +
  `<path d="${pebL}" fill="#8e928c" opacity=".7"/><path d="${pebD}" fill="#3c403d" opacity=".6"/>` +
  `<path d="M70 842C130 838 200 846 255 858L253 866C200 855 130 849 68 851Z" fill="#a49d91"/>` +
  `<path d="M72 850C130 846 200 853 253 865" stroke="#6f6a61" stroke-width="1.2" fill="none" opacity=".6"/>`

const pilings = ([
  [395, 832, 150, 15, -1], [432, 838, 118, 13, 1.5], [470, 826, 168, 16, -0.5],
  [528, 822, 96, 12, 2], [560, 818, 128, 14, -1.5], [612, 812, 62, 11, 0.5],
] as [number, number, number, number, number][]).map(([x, base, h, w, lean]) => {
  const top = base - h
  return `<path d="M${x} ${base}L${x + lean} ${top}H${x + lean + w}L${x + w} ${base}Z" fill="url(#wood)"/>` +
    `<path d="M${x + lean} ${top}H${x + lean + w}L${x + lean + w - 1} ${top + 3}H${x + lean + 1}Z" fill="#8b8579"/>` +
    `<rect x="${x - 1}" y="${base - 26}" width="${w + 2}" height="10" fill="#2f3532" opacity=".55"/>` +
    `<path d="M${x} ${base}L${x - lean * 0.3} ${base + h * 0.35}H${x + w - lean * 0.3}L${x + w} ${base}Z" fill="url(#woodR)"/>` +
    `<ellipse cx="${x + w / 2}" cy="${base + 1}" rx="${w * 1.3}" ry="2.2" fill="#e6e9e8" opacity=".5"/>`
}).join('') +
  `<path d="M396 776L486 772L486 778L396 782Z" fill="#4a4640"/><path d="M396 782L486 778" stroke="#2f2c29" stroke-width="1" opacity=".6"/>` +
  // a gull resting on the tallest piling
  `<path d="M474 657c2-5 9-6 14-4l6 1-6 2c-2 2-6 3-11 3c-2 0-3-1-3-2Z" fill="#f2f3f1"/><path d="M477 653c3-2 8-3 13-1l-3 2c-3 0-7 0-10-1Z" fill="#9da5a8"/><circle cx="476" cy="653" r="2.6" fill="#f4f5f3"/><path d="M473.6 653.4l-2.4 .5" stroke="#c9a54a" stroke-width="1"/>`

const RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<style>
${css}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="${HZ}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#b8c0c6"/><stop offset=".55" stop-color="#ced4d7"/><stop offset="1" stop-color="#dfe3e4"/></linearGradient>
<radialGradient id="sun" cx="${SUNX}" cy="250" r="420" gradientTransform="matrix(1 0 0 .55 0 112)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f8f7f2" stop-opacity=".75"/><stop offset=".5" stop-color="#eeefec" stop-opacity=".3"/><stop offset="1" stop-color="#eeefec" stop-opacity="0"/></radialGradient>
<linearGradient id="water" x1="0" y1="${HZ}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#d7dcdd"/><stop offset=".15" stop-color="#bdc5c7"/><stop offset="1" stop-color="#8a979b"/></linearGradient>
<radialGradient id="sheen" cx="${SUNX}" cy="${HZ}" r="420" gradientTransform="matrix(.55 0 0 1 ${SUNX * 0.45} 0)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f4f5f2" stop-opacity=".55"/><stop offset="1" stop-color="#f4f5f2" stop-opacity="0"/></radialGradient>
<linearGradient id="lowfog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2e5e6" stop-opacity="0"/><stop offset=".7" stop-color="#e2e5e6" stop-opacity=".75"/><stop offset="1" stop-color="#e2e5e6" stop-opacity=".9"/></linearGradient>
<linearGradient id="veil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e4e7e8" stop-opacity="0"/><stop offset=".45" stop-color="#e4e7e8" stop-opacity=".35"/><stop offset=".6" stop-color="#e4e7e8" stop-opacity=".2"/><stop offset="1" stop-color="#e4e7e8" stop-opacity="0"/></linearGradient>
<radialGradient id="cloud"><stop offset="0" stop-color="#aab2b9" stop-opacity=".35"/><stop offset="1" stop-color="#aab2b9" stop-opacity="0"/></radialGradient>
<radialGradient id="fog"><stop offset="0" stop-color="#e6e9ea"/><stop offset=".55" stop-color="#e6e9ea" stop-opacity=".6"/><stop offset="1" stop-color="#e6e9ea" stop-opacity="0"/></radialGradient>
<linearGradient id="wake" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f3f5f4" stop-opacity=".8"/><stop offset="1" stop-color="#f3f5f4" stop-opacity="0"/></linearGradient>
<linearGradient id="wakeR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#f3f5f4" stop-opacity=".8"/><stop offset="1" stop-color="#f3f5f4" stop-opacity="0"/></linearGradient>
<linearGradient id="beach" x1="0" y1="790" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#8f928c"/><stop offset=".5" stop-color="#6f726c"/><stop offset="1" stop-color="#5a5d57"/></linearGradient>
<linearGradient id="wood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4a4640"/><stop offset=".45" stop-color="#5d5850"/><stop offset="1" stop-color="#36332f"/></linearGradient>
<linearGradient id="woodR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3c3a36" stop-opacity=".45"/><stop offset="1" stop-color="#3c3a36" stop-opacity="0"/></linearGradient>
<g id="ferryS">${ferryS}</g><g id="sailS">${sailS}</g><g id="tugS">${tugS}</g><g id="fishS">${fishS}</g>
<g id="fa1S">${fogFar}</g><g id="fa2S">${fogMid}</g><g id="fa3S">${fogNear}</g><g id="fa4S">${fogHill}</g>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
${clouds}
<rect width="${W}" height="${HZ + 40}" fill="url(#sun)"/>
<path d="${ridge}" fill="#bfc6cb" opacity=".38"/>
<rect y="300" width="${W}" height="${HZ - 300 + 4}" fill="url(#lowfog)"/>
<rect y="${HZ}" width="${W}" height="${H - HZ}" fill="url(#water)"/>
<rect y="${HZ}" width="${W}" height="${H - HZ}" fill="url(#sheen)"/>
${far}
${drift('fa1', 300, 70, 40)}
<rect y="${HZ - 40}" width="${W}" height="48" fill="url(#lowfog)"/>
${mid}
${drift('fa2', 360, 90, 200)}
${near}
${drift('fa4', 280, 60, 90)}
<rect y="${HZ - 30}" width="${W}" height="46" fill="url(#lowfog)" opacity=".8"/>
<path d="${lightRip}" stroke="#e7eaea" stroke-width="1" stroke-linecap="round" opacity=".32"/>
<path d="${darkRip}" stroke="#707d82" stroke-width="1" stroke-linecap="round" opacity=".22"/>
${glints}
${sail}
${ferry}
${drift('fa3', 240, 110, 130)}
${tug}
${fish}
${beach}
${pilings}
<rect y="${HZ - 120}" width="${W}" height="300" fill="url(#veil)"/>
</svg>`

// Late in a grey afternoon: every color drawn above is taken down in exposure and cooled a touch, so
// the whole scene sits dimmer behind a dark app while keeping its own contrasts. Colors written in
// uppercase hex are lights and skip this (the boats' lit windows).
const DIM = 0.5
function dim(hex: string) {
  const n = parseInt(hex, 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => Math.min(255, Math.round(v * DIM * [0.96, 1, 1.07][i]!)))
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('')
}
export const SCENE = RAW.replace(/#([0-9a-f]{6})\b/g, (_, h: string) => dim(h))
