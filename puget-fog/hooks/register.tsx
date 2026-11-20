import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { SCENE } from './scene.js'

const ID = 'puget-fog'

// Puget Fog, a grey afternoon on the Sound seen from a dim room: wet-slate surfaces, fog-white text,
// and a soft sea green for the accent. Dark only; the dark glass keeps text calm over the bright fog.
const { theme, problems } = makeColors({
  label: 'Puget Fog',
  only: 'dark',
  roles: { accent: '#7fc0b2', danger: '#e07a6e', success: '#82c493', warning: '#e2b867', pro: '#aaa7e6' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#1a2125',
        'surface-1': '#1f272b',
        'surface-2': '#232b2f',
        'surface-3': '#232b2f',
        'text-primary': '#e6eaeb',
        'text-secondary': '#bcc5c8',
        'text-muted': '#909b9f',
      },
    },
    git: { added: '#82c493', removed: '#e07a6e', modified: '#e2b867', merged: '#aaa7e6' },
  },
})

const LOOK: ThemeSetArgs = {
  colors: theme,
  // dark slate frosting: the fog stays visible behind the text, dimmed enough to read over
  backdrop: { scene: ID, glass: { blur: 6, tint: '#1a2125', opacity: 0.5 } },
}

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'puget-fog', description: 'Turn the Puget Fog backdrop on' })
    await $.command.register({ name: 'puget-fog-off', description: 'Turn the Puget Fog backdrop off' })
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) $.ui.toast(unpainted)
    // Apps that share one ~/.claude load the same plugins; the signed-in account tells them apart.
    const only = String(options.onlyForEmail ?? '').trim().toLowerCase()
    const email = only ? await $.env.get('CLAUDE_CODE_USER_EMAIL') : undefined
    if (!only || email?.trim().toLowerCase() === only) void $.theme.set(LOOK)
    return next(e)
  })

  on('command.run', { command: 'puget-fog' }, async $ => {
    const r = await $.theme.set(LOOK)
    return { text: r.isDrawn ? 'Puget Fog is on.' : `Puget Fog set, not drawn: ${r.reason}` }
  })

  on('command.run', { command: 'puget-fog-off' }, async $ => {
    await $.theme.clear()
    return { text: 'Puget Fog is off.' }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.scene !== ID || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    return <Svg source={SCENE} alt="A foggy grey afternoon on Puget Sound: forested islands fading into mist across the water, a ferry and small boats drifting slowly by, old pilings by the shore" isInteractive />
  })
}
