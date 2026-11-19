# claude-mods

Themes and mods for Claude Code and the Claude desktop app.

## Amber Night

A warm starry night behind the conversation in the desktop and mobile apps. Four layers of stars drift slowly sideways past an amber Milky Way, with an occasional comet. The scene stops moving when your system asks for reduced motion.

- `/amber-night` turns it on for the session.
- `/amber-night-off` turns it off.

It turns itself on when a session starts. To limit that to one account, set **Only for email domain** (for example `example.com`): it then turns on by itself only when the signed-in account's email ends with that domain. This helps when two desktop apps share one `~/.claude` folder and you want a theme in only one of them.

### Install

At the prompt of a terminal session:

```
/plugin install amber-night --marketplace mitya86/claude-mods
```

From a shell:

```bash
claude plugin install amber-night --marketplace mitya86/claude-mods
```

Answer `y` to add the marketplace, then pick a scope (user scope loads it in every session).

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `mitya86/claude-mods`, then Add plugin.
