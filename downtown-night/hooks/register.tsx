import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { SCENE } from './scene.js'

const ID = 'downtown-night'

// Downtown Night, a city seen from high up: deep blue-violet surfaces like the sky over the glow,
// warm off-white text like lit windows, and lamp amber for the accent. Dark only: the scene is a night.
const { theme, problems } = makeColors({
  label: 'Downtown Night',
  only: 'dark',
  roles: { accent: '#e8a75c', danger: '#ec7468', success: '#74c79a', warning: '#f2c46b', pro: '#b9a0ee' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0a0b14',
        'surface-1': '#0e0f1a',
        'surface-2': '#131421',
        'surface-3': '#131421',
        'text-primary': '#ede7dd',
        'text-secondary': '#c6beb2',
        'text-muted': '#9d96a0',
      },
    },
    git: { added: '#74c79a', removed: '#ec7468', modified: '#f2c46b', merged: '#b9a0ee' },
  },
})

const LOOK: ThemeSetArgs = {
  colors: theme,
  // light frosting: enough to keep text calm over the lit windows, little enough to keep the lights sharp
  backdrop: { scene: ID, glass: { blur: 6, tint: '#0a0b14', opacity: 0.6 } },
}

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'downtown-night', description: 'Turn the Downtown Night backdrop on' })
    await $.command.register({ name: 'downtown-night-off', description: 'Turn the Downtown Night backdrop off' })
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) $.ui.toast(unpainted)
    // Apps that share one ~/.claude load the same plugins; the signed-in account tells them apart.
    const only = String(options.onlyForEmail ?? '').trim().toLowerCase()
    const email = only ? await $.env.get('CLAUDE_CODE_USER_EMAIL') : undefined
    if (!only || email?.trim().toLowerCase() === only) void $.theme.set(LOOK)
    return next(e)
  })

  on('command.run', { command: 'downtown-night' }, async $ => {
    const r = await $.theme.set(LOOK)
    return { text: r.isDrawn ? 'Downtown Night is on.' : `Downtown Night set, not drawn: ${r.reason}` }
  })

  on('command.run', { command: 'downtown-night-off' }, async $ => {
    await $.theme.clear()
    return { text: 'Downtown Night is off.' }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.scene !== ID || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    return <Svg source={SCENE} alt="A city at night from a high window: warm-lit skyscrapers, a needle tower with a glowing deck, stars above the glow, traffic crawling far below and now and then a plane" isInteractive />
  })
}
