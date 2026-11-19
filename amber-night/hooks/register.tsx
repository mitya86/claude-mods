import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'

const ID = 'amber-night'

const { theme, problems } = makeColors({
  label: 'Amber Night',
  only: 'dark',
  roles: { accent: '#a98bff', danger: '#f0717a', success: '#5fd3a6', warning: '#f2c46b', pro: '#e08bff' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#08050f',
        'surface-1': '#0d0918',
        'surface-2': '#120d21',
        'surface-3': '#17112a',
        'text-primary': '#efe9ff',
        'text-secondary': '#c9bfe6',
        'text-muted': '#a197c4',
      },
    },
  },
})

const THEME: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: ID, glass: { blur: 18, tint: '#0a0614', opacity: 0.55 } },
}

// A fresh sky every time the mod loads.
let seed = (Date.now() % 2147483646) + 1
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
const i = (n: number) => Math.round(n)
const f = (n: number) => n.toFixed(2)
const gauss = () => rnd() + rnd() + rnd() + rnd() - 2
const many = (n: number, make: () => string) => Array.from({ length: n }, make).join('')

// Every animation steps on one shared 10 fps clock (whole-second durations, 10 steps a second).
// The nearest stars move about 0.1px a step, which reads as smooth at a sixth of the repaints of 60 fps.
const FPS = 10
const stepped = (name: string, seconds: number, extra = '') => `animation:${name} ${seconds}s steps(${seconds * FPS}) ${extra} infinite`

const star = (x: number, y: number, r: number, twinkle = false) =>
  `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" class="k${Math.floor(rnd() * 12)}${twinkle ? ` t${Math.floor(rnd() * 4)}` : ''}"/>`
const halo = (x: number, y: number, r: number) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#halo)"/>`

// A depth layer is one small square tile of stars that the renderer repeats across the sky and
// caches as a bitmap; it drifts left by exactly one tile width, so the loop has no seam.
// Tile sizes are unrelated to each other, so the repeats never line up across layers.
type Layer = { w: number; stars: number; r: [number, number]; halos: number; speed: number; opacity: number }
const LAYERS: Layer[] = [
  { w: 307, stars: 110, r: [0.25, 0.45], halos: 0, speed: 0.09, opacity: 0.5 },
  { w: 397, stars: 170, r: [0.35, 0.7], halos: 0, speed: 0.225, opacity: 0.7 },
  { w: 563, stars: 70, r: [0.55, 1.0], halos: 2, speed: 0.525, opacity: 0.85 },
  { w: 811, stars: 22, r: [0.9, 1.6], halos: 4, speed: 1.05, opacity: 1 },
]
const M = 8
const inTile = (w: number) => M + rnd() * (w - 2 * M)
const patterns = LAYERS.map(
  (l, n) =>
    `<pattern id="p${n}" width="${l.w}" height="${l.w}" patternUnits="userSpaceOnUse">` +
    many(l.stars, () => star(inTile(l.w), inTile(l.w), l.r[0] + rnd() * (l.r[1] - l.r[0]))) +
    many(l.halos, () => halo(inTile(l.w), inTile(l.w), 1.8 + rnd() * 1.4)) +
    `</pattern>`,
).join('')
const drifts = LAYERS.map((l, n) => {
  const seconds = i(l.w / l.speed)
  return `@keyframes d${n}{to{transform:translateX(-${l.w}px)}}.d${n}{${stepped(`d${n}`, seconds)}}`
}).join('')
const layerRects = LAYERS.map((l, n) => `<rect class="d${n}" width="${1600 + l.w}" height="1000" fill="url(#p${n})" opacity="${l.opacity}"/>`).join('')

// The Milky Way is farthest of all and barely moves; only a few of its stars twinkle.
// Its shape keeps a fixed seed; only the star tiles change from load to load.
seed = 11
const BAND_W = 2400
const BAND_SECONDS = 40000
const bandStars = many(600, () => star(rnd() * 1900 - 950, gauss() * 85, 0.3 + rnd() * 0.65, rnd() < 0.015))
const clumps = many(20, () =>
  `<ellipse cx="${i(rnd() * 1800 - 900)}" cy="${i(gauss() * 40)}" rx="${i(90 + rnd() * 170)}" ry="${i(40 + rnd() * 60)}" fill="url(#mw)"/>`,
)
const lanes = many(12, () =>
  `<ellipse cx="${i(rnd() * 1500 - 750)}" cy="${i(gauss() * 25 + 10)}" rx="${i(70 + rnd() * 150)}" ry="${i(10 + rnd() * 18)}" fill="url(#dust)"/>`,
)

const comet = (x: number, y: number, angle: number, period: number, delay: number) =>
  `<g transform="translate(${x} ${y}) rotate(${angle})"><g class="comet" style="animation-duration:${period}s;animation-delay:${delay}s">` +
  `<rect x="-260" y="-1" width="260" height="2" rx="1" fill="url(#tail)"/>` +
  `<circle r="2.4" fill="#fff6e8"/><circle r="7" fill="url(#halo)"/></g></g>`

const COLORS = ['#fff8ec', '#fff0d9', '#ffe6c4', '#ffd9ad', '#ffe4d6', '#fff4dc']
const starClasses = COLORS.flatMap((c, n) => [`.k${n * 2}{fill:${c};opacity:.5}`, `.k${n * 2 + 1}{fill:${c};opacity:.92}`]).join('')

const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#050309"/><stop offset=".55" stop-color="#090612"/><stop offset="1" stop-color="#030205"/></linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="#3d2a18" stop-opacity=".35"/><stop offset=".6" stop-color="#24180e" stop-opacity=".18"/><stop offset="1" stop-color="#140c06" stop-opacity="0"/></radialGradient>
<radialGradient id="mw"><stop offset="0" stop-color="#ffe6c4" stop-opacity=".17"/><stop offset=".5" stop-color="#c9a06a" stop-opacity=".08"/><stop offset="1" stop-color="#6b4a24" stop-opacity="0"/></radialGradient>
<radialGradient id="core"><stop offset="0" stop-color="#fff0d8" stop-opacity=".16"/><stop offset="1" stop-color="#ffd8a8" stop-opacity="0"/></radialGradient>
<radialGradient id="dust"><stop offset="0" stop-color="#07040e" stop-opacity=".45"/><stop offset="1" stop-color="#07040e" stop-opacity="0"/></radialGradient>
<radialGradient id="halo"><stop offset="0" stop-color="#fff6e8" stop-opacity=".95"/><stop offset=".3" stop-color="#ffdfb8" stop-opacity=".35"/><stop offset="1" stop-color="#ffdfb8" stop-opacity="0"/></radialGradient>
<linearGradient id="tail"><stop offset="0" stop-color="#ffdfb8" stop-opacity="0"/><stop offset="1" stop-color="#ffffff" stop-opacity=".85"/></linearGradient>
${patterns}
<g id="bt"><g transform="translate(750 500) rotate(-58)">
<ellipse rx="1150" ry="420" fill="url(#glow)"/>
<ellipse rx="1100" ry="230" fill="url(#mw)"/>
<ellipse rx="780" ry="130" fill="url(#mw)"/>
<ellipse cx="120" rx="430" ry="115" fill="url(#core)"/>
${clumps}${lanes}${bandStars}
</g></g>
</defs>
<style>
${starClasses}
.t0{${stepped('tw', 4)}}.t1{${stepped('tw', 6, '-2s')}}.t2{${stepped('tw', 8, '-5s')}}.t3{${stepped('tw', 5, '-3s')}}
@keyframes tw{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes db{to{transform:translateX(-${BAND_W}px)}}.band{${stepped('db', BAND_SECONDS)}}
${drifts}
.comet{opacity:0;animation:fly 30s linear infinite}
@keyframes fly{0%{opacity:0;transform:translateX(0)}.6%{opacity:1}5%{opacity:.9}6.5%{opacity:0;transform:translateX(1100px)}100%{opacity:0;transform:translateX(1100px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<rect width="1600" height="1000" fill="url(#sky)"/>
<g class="band"><use href="#bt"/><use href="#bt" x="${BAND_W}"/></g>
${layerRects}
${comet(150, 120, 24, 47, 4)}
${comet(700, 60, 32, 71, 25)}
${comet(1000, 180, 152, 97, 51)}
</svg>`

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'amber-night', description: 'Turn the Amber Night backdrop on' })
    await $.command.register({ name: 'amber-night-off', description: 'Turn the Amber Night backdrop off' })
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) $.ui.toast(unpainted)
    // Apps that share one ~/.claude load the same plugins; the signed-in account tells them apart.
    const only = String(options.onlyForEmail ?? '').trim().toLowerCase()
    const email = only ? await $.env.get('CLAUDE_CODE_USER_EMAIL') : undefined
    if (!only || email?.trim().toLowerCase() === only) void $.theme.set(THEME)
    return next(e)
  })

  on('command.run', { command: 'amber-night' }, async $ => {
    const r = await $.theme.set(THEME)
    return { text: r.isDrawn ? 'Amber Night is on.' : `Amber Night set, not drawn: ${r.reason}` }
  })

  on('command.run', { command: 'amber-night-off' }, async $ => {
    await $.theme.clear()
    return { text: 'Amber Night is off.' }
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.props.scene !== ID) return next(e)
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    const { Svg } = $.ui.resolve(e)
    return <Svg source={SCENE} alt="A warm starry night drifting very slowly past, with the Milky Way and an occasional comet" isInteractive />
  })
}
