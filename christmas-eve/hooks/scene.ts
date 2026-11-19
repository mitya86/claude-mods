// A snowy night in 8-bit: a log hut with a lit window, a lone lamp post, pines, a full moon, and a blizzard.
// Now and then Santa's sleigh crosses the moon, and a horse-drawn sleigh passes along the road.
//
// Everything still is drawn once. What moves, all by animating stroke-dashoffset (and one opacity):
// - three snow layers (far, mid, near) of dashed slanted columns;
// - a gust every 40 s: a layer of fast, steep streaks that fades in and out;
// - snow inside the lamp's light cone, the same layers again in warm colour, clipped to the cone;
// - smoke puffs rising from the chimney.
// Every animation steps on one shared 16 Hz clock, so the frame redraws at most 16 times a second.
// With animation off the scene stands still, snow and all.
const W = 1600
const H = 900
const FPS = 16 // smooth enough to read as falling, at about a third of the cost of redrawing every display frame
const P = 5 // the chunky pixel
const GY = 700 // ground line
const s = (n: number) => Math.round(n / P) * P

let seed = 1987
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)

const px = (x: number, y: number, w: number, h: number, fill: string) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`

// A stepped triangle (8-bit slope): `rows` rows of height rh, widening by `slope` px per row.
const steps = (cx: number, top: number, rows: number, rh: number, slope: number, fill: string) => {
  let r = ''
  for (let i = 0; i < rows; i++) {
    const hw = s((i + 1) * slope)
    r += px(cx - hw, top + i * rh, 2 * hw, rh, fill)
  }
  return r
}

// Sky in flat bands, darkest at the top.
const SKY = ['#060915', '#080c1c', '#0a0f23', '#0d132a', '#101731', '#131b38']
const sky = SKY.map((c, i) => px(0, Math.round((i * GY) / SKY.length), W, Math.ceil(GY / SKY.length) + 1, c)).join('')

// A full moon above the hut: a stepped pixel disc with a few craters, and a wide warm glow that
// lights the sky around it. Drawn behind the far snow, so flakes cross in front of it.
const MX = 300
const MY = 150
const MR = 45
let moon = ''
for (let y = -MR; y < MR; y += P) {
  const hw = s(Math.sqrt(MR * MR - (y + P / 2) ** 2))
  moon += px(MX - hw, MY + y, 2 * hw, P, '#f4ecd0')
}
for (const [dx, dy, w, h] of [[-20, -15, 15, 10], [5, -25, 10, 10], [10, 5, 20, 15], [-15, 15, 10, 5], [-30, 0, 5, 10]]) {
  moon += px(MX + dx, MY + dy, w, h, '#ddd2ad')
}

// Pines along the horizon, with snow on each tier's top.
let pines = ''
for (const [cx, h] of [[60, 170], [140, 120], [560, 150], [640, 210], [730, 130], [880, 110], [1010, 160], [1090, 120], [1480, 190], [1560, 140]]) {
  const tier = h / 3
  for (let k = 0; k < 3; k++) {
    const top = GY - h + k * tier * 0.75
    pines += steps(cx, top, Math.round(tier / P), P, 4.2 + k * 0.6, '#0a1022')
    pines += px(cx - P, top, 2 * P, P, '#3b4870')
  }
  pines += px(cx - P, GY - P * 3, 2 * P, P * 3, '#0a1022')
}

// Ground: drifts in bands, lighter toward the horizon, with a few low mounds.
const ground = [
  px(0, GY, W, 20, '#5f6f9a'),
  px(0, GY + 20, W, 60, '#52618b'),
  px(0, GY + 80, W, H - GY - 80, '#46547b'),
  steps(820, GY - 15, 3, P, 60, '#5f6f9a'),
  steps(1520, GY - 10, 2, P, 70, '#5f6f9a'),
].join('')

// The hut: logs, a snow-heavy roof, a chimney, a warm window and a door, a drift against the wall.
const HX = 170
const HW = 270
const WALL = 110
const wallTop = GY - WALL
let hut = ''
for (let y = wallTop, i = 0; y < GY; y += 10, i++) hut += px(HX, y, HW, 10, i % 2 ? '#2b1f1c' : '#352620')
for (let y = wallTop; y < GY; y += 10) hut += px(HX - 5, y + 2, 5, 6, '#3d2c24') + px(HX + HW, y + 2, 5, 6, '#3d2c24') // log ends
hut += px(HX + 200, wallTop - 120, 30, 120, '#3a2a2c') + px(HX + 195, wallTop - 125, 40, 10, '#c9d4ee') // chimney
hut += steps(HX + HW / 2, wallTop - 110, 22, 5, 7.2, '#c9d4ee') // roof under snow
hut += px(HX - 30, wallTop - 5, HW + 60, 5, '#93a2c8') + px(HX - 25, wallTop, HW + 50, 5, '#1a1214') // snow edge, eave
hut += px(HX + 45, wallTop + 30, 60, 50, '#ffc76a') + px(HX + 73, wallTop + 30, 5, 50, '#2b1f1c') + px(HX + 45, wallTop + 52, 60, 5, '#2b1f1c') // window
hut += px(HX + 40, wallTop + 25, 70, 5, '#2b1f1c') + px(HX + 40, wallTop + 80, 70, 5, '#c9d4ee') // frame, snowy sill
hut += px(HX + 160, wallTop + 40, 50, 70, '#1d1513') + px(HX + 200, wallTop + 75, 5, 5, '#a88a50') // door
hut += steps(HX + 30, GY - 15, 3, 5, 28, '#6d7da6') + steps(HX + HW - 20, GY - 10, 2, 5, 34, '#6d7da6') // drifts

// The lamp post on the right, its glow, its cone of light, and the pool it casts on the snow.
const LX = 1300
const LY = 500 // lamp head
const lamp =
  px(LX - 4, LY + 14, 8, GY - LY - 14, '#1b2136') + px(LX - 10, GY - 10, 20, 10, '#1b2136') +
  px(LX - 16, LY - 6, 32, 6, '#1b2136') + px(LX - 12, LY, 24, 14, '#ffe3a3') + px(LX - 16, LY + 14, 32, 4, '#1b2136') +
  px(LX - 16, LY - 11, 32, 5, '#c9d4ee') // snow on the hood
const cone = `M${LX - 12} ${LY + 18}H${LX + 12}L${LX + 150} ${GY}H${LX - 150}Z`

// Snow: each layer is a set of slanted columns, each column one path dashed into flakes. The layer
// falls by animating stroke-dashoffset (inherited by every column through a <use>), the same
// mechanism the rain used. All columns of a layer share one dash period L, so the loop is seamless.
// [name, columns, flake size, colour, warm colour in the lamp light, period L in px, seconds per period]
const SLANT = 0.22 // sideways drift per px of fall
const LAYERS: [string, number, number, string, string, number, number][] = [
  ['a', 220, 2, '#56648f', '', 600, 30],
  ['b', 150, 3, '#9aa8cc', '#e8c98a', 640, 18],
  ['c', 64, 5, '#e4ebfa', '#fff0c8', 720, 10],
  ['d', 60, 2, '#c9d4ee', '#fff0c8', 800, 4], // gust: fast, steep streaks that come and go
]
const TOP = -60
const LEN = H - TOP + 20
let css = ''
let layerDefs = ''
for (const [id, cols, sz, , , L, sec] of LAYERS) {
  const slant = id === 'd' ? SLANT * 3 : SLANT
  let paths = ''
  for (let i = 0; i < cols; i++) {
    const x = Math.round(rnd() * (W + LEN * slant))
    const n = 3 + Math.floor(rnd() * 4) // flakes per period in this column
    const gaps = Array.from({ length: n }, () => 0.3 + rnd())
    const sum = gaps.reduce((a, b) => a + b, 0)
    const room = L - n * sz
    const arr = gaps.map(g => `${sz} ${Math.round((g / sum) * room)}`)
    const fix = L - n * sz - arr.reduce((a, s) => a + +s.split(' ')[1], 0) // rounding back into the last gap
    arr[n - 1] = `${sz} ${+arr[n - 1].split(' ')[1] + fix}`
    const lead = Math.round(rnd() * L) // where this column's pattern starts
    paths += `<path d="M${x} ${TOP}l${-Math.round(LEN * slant)} ${LEN}" stroke-dasharray="0 ${lead} ${arr.join(' ')} 0 ${L - lead}"/>`
    // ^ "0 lead ... 0 L-lead": empty dashes rotate the pattern without changing its period (2L total, whole periods)
  }
  layerDefs += `<g id="l${id}" stroke-width="${sz}">${paths}</g>`
  css += `.f${id}{animation:f${id} ${sec}s steps(${sec * FPS}) infinite}@keyframes f${id}{from{stroke-dashoffset:0}to{stroke-dashoffset:${-2 * L}px}}`
}
// Gust layer: also fades in for a few seconds every 40 s (calm 24 s, gust builds, blows, dies down).
const GUST = 40
css += `.gust{opacity:0;animation:gust ${GUST}s steps(${GUST * FPS}) infinite}` +
  `@keyframes gust{0%,60%{opacity:0}68%,84%{opacity:.9}100%{opacity:0}}`
const layer = (id: string, isWarm = false) => {
  const [, , , cool, warm] = LAYERS.find(l => l[0] === id)!
  const use = `<use href="#l${id}" stroke="${isWarm ? warm : cool}" class="f${id}"/>`
  return id === 'd' ? `<g class="gust">${use}</g>` : use
}

// Sprites drawn from character grids: each character is one pixel of size u, '.' is empty, and runs of
// one colour in a row merge into a single rect.
const sprite = (rows: string[], u: number, pal: Record<string, string>, ox = 0, oy = 0) => {
  let r = ''
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      let n = 1
      while (row[x + n] === row[x]) n++
      if (pal[row[x]]) r += px(ox + x * u, oy + y * u, n * u, u, pal[row[x]])
      x += n
    }
  })
  return r
}
// Two leg poses swap every half `sec`; the second set starts half a beat later.
const legs = (a: string, b: string, cls: string) => `<g class="${cls}">${a}</g><g class="${cls}" style="animation-delay:-${cls === 'lg' ? 0.2 : 0.25}s">${b}</g>`
css += `.lg{animation:lg .4s steps(1) infinite}.lh{animation:lg .5s steps(1) infinite}@keyframes lg{50%{opacity:0}}`
// A sprite crossing the scene once per `cycle` seconds, then waiting off-screen. It rests off-screen
// too, so with animation off it never shows. [from x, from y, to x, to y]
// It moves by animating x and y on a <use>: a transform animation, even one waiting out its delay,
// made the backdrop cost about 40% more CPU the whole time; x and y cost only while it crosses.
const crossing = (id: string, cycle: number, sec: number, delay: number, [x0, y0, x1, y1]: number[]) => {
  const at = (x: number, y: number) => `x:${x}px;y:${y}px`
  css += `.${id}{${at(x0, y0)};animation:${id} ${cycle}s steps(1) ${delay}s infinite}` +
    `@keyframes ${id}{0%{${at(x0, y0)};animation-timing-function:steps(${sec * FPS})}${((sec / cycle) * 100).toFixed(2)}%,100%{${at(x1, y1)}}}`
}

// Santa's sleigh: a far silhouette against the moon (3 px pixels), moonlight along the tops, and the
// lead reindeer's red nose. Crosses left to right, climbing, about every 70 s.
const SANTA = { '#': '#04060d', '+': '#56669a', r: '#ff4a3a' }
const deer = (nose: boolean) => {
  const body = [
    '.........+.+....',
    '..........++....',
    '..........+++...',
    '..........####' + (nose ? 'r' : '#'),
    '+.........###...',
    '++++++++++##....',
    '###########.....',
    '.#########......',
  ]
  return { body, a: ['.##......##.....', '##........##....', '#..........#....'], b: ['..##....##......', '...##..##.......', '................'] }
}
const sleighRows = [
  '..++..................',
  '.+##++....+++.........',
  '+####+...+###+........',
  '######..+####.........',
  '######...###..........',
  '#############......++.',
  '##############....#...',
  '.#############...#....',
  '..###########...#.....',
  '...#.......#...#......',
  '+++++++++++++++.......',
]
let santa = sprite(sleighRows, 3, SANTA)
for (let k = 0; k < 3; k++) {
  const ox = (26 + k * 19) * 3
  const d = deer(k === 2)
  santa += sprite(d.body, 3, SANTA, ox, 0)
  santa += legs(sprite(d.a, 3, SANTA, ox, 24), sprite(d.b, 3, SANTA, ox, 24), 'lg')
}
santa += px(19 * 3, 15, (26 + 2 * 19 + 11 - 19) * 3, 3, '#04060d') // harness, sleigh to lead reindeer
crossing('santa', 70, 14, 3, [-320, 157, 1920, 45])

// A horse-drawn sleigh on the road: red with gold trim, a driver, and a lantern whose warm light goes
// with it. Crosses right to left about every 60 s, near the bottom so the snow falls in front of it.
const RIDE = { h: '#2e201b', m: '#4a3428', k: '#14100e', r: '#9a2f2c', g: '#d0a64e', c: '#232a44', f: '#d9b08c', l: '#ffe3a3', p: '#1b2136' }
const horse = [
  '....hh................',
  '...hhhm...............',
  '..hhhhmm..............',
  '.hhhhhhmm.............',
  'hhhhhhhhmm............',
  'hh..hhhhhmm...........',
  '.....hhhhhmmmmmmmmmm..',
  '.....hhhhhhhhhhhhhhhh.',
  '.....hhhhhhhhhhhhhhhhm',
  '.....hhhhhhhhhhhhhhhhm',
  '.....hhhhhhhhhhhhhhhhm',
  '......hhhhhhhhhhhhhh.m',
]
const hA = ['......hh.......hh.....', '.....h..h.....h..h....', '.....h..h.....h..h....', '....h....h...h....h...', '....k....k...k....k...']
const hB = ['......hh.......hh.....', '......hh.......hh.....', '......hh.......hh.....', '......hh.......hh.....', '......kk.......kk.....']
const sled = [
  '.....l...........ccc....',
  '.....p..........ccccc...',
  '.....p...........fff....',
  '.....p..........cccccc..',
  '.....p.........cccccccc.',
  '.....p.rr......cccccccc.',
  '.....prr.rrrrrrrrrrrrrrr',
  '......r..rrrrrrrrrrrrrrr',
  '......r..gggggggggggggrr',
  '.......r..rrrrrrrrrrrrr.',
  '........k......k.....k..',
  '.......kkkkkkkkkkkkkkkk.',
]
let ride = `<circle cx="${29 * 5 + 2}" cy="27" r="70" fill="url(#lantern)"/>`
ride += sprite(horse, 5, RIDE) + legs(sprite(hA, 5, RIDE, 0, 60), sprite(hB, 5, RIDE, 0, 60), 'lh')
ride += px(21 * 5, 50, 9 * 5, 5, '#3a2a24') // shafts
ride += sprite(sled, 5, RIDE, 24 * 5, 25)
crossing('ride', 60, 25, 25, [1650, 675, -350, 675])

// Smoke from the chimney: puffs travelling up a wavy path, fading as they rise (a fixed gradient
// over a moving dash), the same dashoffset mechanism.
const CX = HX + 215
const CY = wallTop - 125
const smokePath = `M${CX} ${CY}c-6 -30 10 -50 -4 -80s-30 -40 -22 -80`
css += `.sm{animation:sm 6s steps(${6 * FPS}) infinite}@keyframes sm{from{stroke-dashoffset:0}to{stroke-dashoffset:-60px}}`
const smoke = `<path class="sm" d="${smokePath}" fill="none" stroke="url(#smk)" stroke-width="16" stroke-linecap="round" stroke-dasharray="4 26"/>`

export const SCENE =`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges">
<style>
${css}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<defs>
${layerDefs}
<linearGradient id="smk" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#5a6688" stop-opacity=".6"/><stop offset="1" stop-color="#5a6688" stop-opacity="0"/></linearGradient>
<radialGradient id="moonglow" cx="${MX}" cy="${MY}" r="330" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffeec4" stop-opacity=".32"/><stop offset=".2" stop-color="#ffeec4" stop-opacity=".12"/><stop offset="1" stop-color="#ffeec4" stop-opacity="0"/></radialGradient>
<radialGradient id="halo" cx="${LX}" cy="${LY + 7}" r="150" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffd789" stop-opacity=".4"/><stop offset=".35" stop-color="#ffd789" stop-opacity=".12"/><stop offset="1" stop-color="#ffd789" stop-opacity="0"/></radialGradient>
<radialGradient id="win" cx="${HX + 75}" cy="${wallTop + 55}" r="120" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffc76a" stop-opacity=".25"/><stop offset="1" stop-color="#ffc76a" stop-opacity="0"/></radialGradient>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd789" stop-opacity=".2"/><stop offset="1" stop-color="#ffd789" stop-opacity=".06"/></linearGradient>
<radialGradient id="pool" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd789" stop-opacity=".35"/><stop offset="1" stop-color="#ffd789" stop-opacity="0"/></radialGradient>
<radialGradient id="lantern"><stop offset="0" stop-color="#ffd789" stop-opacity=".35"/><stop offset="1" stop-color="#ffd789" stop-opacity="0"/></radialGradient>
<g id="santaS">${santa}</g>
<g id="rideS">${ride}</g>
<clipPath id="lit"><path d="${cone}"/><circle cx="${LX}" cy="${LY + 7}" r="70"/></clipPath>
</defs>
${sky}
<circle cx="${MX}" cy="${MY}" r="330" fill="url(#moonglow)"/>
${moon}
<use href="#santaS" class="santa"/>
<g fill="none" shape-rendering="auto">${layer('a')}</g>
${pines}
${ground}
<ellipse cx="${LX}" cy="${GY + 12}" rx="190" ry="30" fill="url(#pool)"/>
<ellipse cx="${HX + 75}" cy="${GY + 15}" rx="120" ry="20" fill="url(#pool)" opacity=".5"/>
${hut}
<circle cx="${HX + 75}" cy="${wallTop + 55}" r="120" fill="url(#win)"/>
${smoke}
${lamp}
<use href="#rideS" class="ride"/>
<path d="${cone}" fill="url(#beam)"/>
<circle cx="${LX}" cy="${LY + 7}" r="150" fill="url(#halo)"/>
<g fill="none" shape-rendering="auto">${layer('b')}${layer('c')}${layer('d')}
<g clip-path="url(#lit)">${layer('b', true)}${layer('c', true)}${layer('d', true)}</g></g>
</svg>`
