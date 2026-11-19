import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { SCENE } from './scene.js'

const ID = 'christmas-eve'

// Christmas Eve, a snowy night: navy surfaces, pale snow-white text, ice blue for the accent, lamp amber for warnings.
// Dark only: the scene is a night. The surfaces are lifted off black and the text is softened off
// white, to stay easy on the eyes.
const { theme, problems } = makeColors({
  label: 'Christmas Eve',
  only: 'dark',
  roles: { accent: '#7fa6e6', danger: '#e5786d', success: '#6fc48f', warning: '#e0b45e', pro: '#b39ae6' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0b0f1e',
        'surface-1': '#0f1426',
        'surface-2': '#13192e',
        'surface-3': '#13192e',
        'text-primary': '#e3e9f7',
        'text-secondary': '#b8c3dc',
        'text-muted': '#93a0bd',
      },
    },
    git: { added: '#6fc48f', removed: '#e5786d', modified: '#e0b45e', merged: '#b39ae6' },
  },
})

const LOOK: ThemeSetArgs = {
  colors: theme,
  // blur frosts the panels over the scene so text sits on a calm, soft field
  backdrop: { scene: ID, glass: { blur: 6, tint: '#0a0e1c', opacity: 0.62 } },
}

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'christmas-eve', description: 'Turn the Christmas Eve backdrop on' })
    await $.command.register({ name: 'christmas-eve-off', description: 'Turn the Christmas Eve backdrop off' })
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) $.ui.toast(unpainted)
    // Apps that share one ~/.claude load the same plugins; the signed-in account tells them apart.
    const only = String(options.onlyForEmail ?? '').trim().toLowerCase()
    const email = only ? await $.env.get('CLAUDE_CODE_USER_EMAIL') : undefined
    if (!only || email?.trim().toLowerCase() === only) void $.theme.set(LOOK)
    return next(e)
  })

  on('command.run', { command: 'christmas-eve' }, async $ => {
    const r = await $.theme.set(LOOK)
    return { text: r.isDrawn ? 'Christmas Eve is on.' : `Christmas Eve set, not drawn: ${r.reason}` }
  })

  on('command.run', { command: 'christmas-eve-off' }, async $ => {
    await $.theme.clear()
    return { text: 'Christmas Eve is off.' }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.scene !== ID || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    return <Svg source={SCENE} alt="Pixel-art Christmas Eve: a log hut and a lamp post in falling snow under a full moon, with sleighs passing on the road and across the sky" isInteractive />
  })
}
