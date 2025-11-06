# Negative Heading Plugin

Negative Heading renders Discord-style `-# Heading` lines as compact, muted headings in both Reading View and the editor. The rendered block keeps normal Markdown content (bold, italics, links) but the `-# ` marker is dimmed so the text reads like a lightweight heading.

## Features

- Reading View and the rendered layer of Live Preview convert `-# Heading` into a `<div role="heading" aria-level="7">`.
- Source mode and Live Preview decorate matches with subtle inline styling powered by a CodeMirror view plugin.
- Skips fenced code blocks, math blocks, inline code, and callouts, so normal Markdown rendering stays intact.
- Uses `var(--text-muted)` / `var(--text-faint)` when available, falls back to the theme’s comment color, then a neutral gray.

## Usage

1. Type `-# Micro heading` at the start of a line.
2. Switch to Reading View (or Live Preview) to see a compact heading that respects theme typography.
3. In Source mode, the text is tinted to match muted text/comment colors so it remains identifiable.

Notes:

- Only a single leading `-# ` token is supported per block.
- Syntax inside code fences, math blocks, and callouts is ignored on purpose.

## Installation

### From source

```bash
npm install
npm run build
```

Copy the generated `main.js`, along with `manifest.json` and `styles.css`, into `<vault>/.obsidian/plugins/negative-heading-plugin/`.

### Development

- `npm run dev` - watch mode via esbuild.
- `npm run build` - type-check plus production bundle.

Reload Obsidian after each build, or use the **Reload app without saving** hotkey in the developer tools.

## Limitations

- Only matches lines that begin with `-# `; indented lines and repeated markers are treated as plain text.
- The plugin targets Obsidian v1.6+ where Live Preview and the current CodeMirror 6 API are available.
