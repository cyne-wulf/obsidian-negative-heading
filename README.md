# Negative Heading Plugin

An Obsidian plugin that renders Discord-style `-# Heading` lines as compact, muted headings in all view modes (Reading View, Live Preview, and Source Mode). The rendered block keeps normal Markdown content (bold, italics, links) while the `-# ` marker is dimmed, creating lightweight subheadings perfect for organizing content without the visual weight of traditional headings.

## Features
![Main Demo](https://private-user-images.githubusercontent.com/54266829/511137875-3407d475-066a-44aa-9df6-5261ae8610be.gif?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjM0NjMwMzksIm5iZiI6MTc2MzQ2MjczOSwicGF0aCI6Ii81NDI2NjgyOS81MTExMzc4NzUtMzQwN2Q0NzUtMDY2YS00NGFhLTlkZjYtNTI2MWFlODYxMGJlLmdpZj9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTExMTglMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUxMTE4VDEwNDUzOVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTNkNWZiOGIxMDc2MWVkNjhiOTU1MzE1NmI1MmRlNzk1MTAxMDViMGE3NTkyYTE0OGUwM2QzNDU2ZGRiYTQ4OTAmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.qpabE5H9u-SsmFW4GTXrybrOwDNhH9M7Ekx_KvmktA4)
- **All View Modes**: Works seamlessly in Reading View, Live Preview, and Source Mode
- **Semantic Rendering**: Reading View converts `-# Heading` into `<div role="heading" aria-level="7">` for proper accessibility
- **CodeMirror Integration**: Source mode and Live Preview use decorations for real-time syntax highlighting
- **Smart Toggle Command**: Intelligently add or remove negative heading tokens based on majority detection
- **List Item Support**: Works inside list items (`- -# List heading`)
- **Escape Character Support**: Use `\-# ` to prevent transformation (renders as literal `-# ` text)
- **Context-Aware**: Skips fenced code blocks, math blocks, and inline code for proper Markdown rendering
- **Theme Integration**: Uses `var(--text-muted)` / `var(--text-faint)` with intelligent fallbacks to theme comment color or neutral gray

#### Some theme examples:
![Theme 1](https://private-user-images.githubusercontent.com/54266829/511137597-7afd8e38-00ac-4efd-b8ae-f9e123d56316.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjM0NjMwMzksIm5iZiI6MTc2MzQ2MjczOSwicGF0aCI6Ii81NDI2NjgyOS81MTExMzc1OTctN2FmZDhlMzgtMDBhYy00ZWZkLWI4YWUtZjllMTIzZDU2MzE2LnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTExMTglMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUxMTE4VDEwNDUzOVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPWNkZGZjYmQxYzllOTA3NGZiN2Q5NzdmMDYwZTgwNWM3YmExOGQ5ZTNlNGQ0MzY0MTNmYjEyODNiYzVkZDJjYTImWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.AB4KxTBXabKH4L1kiWcIPJxImuVJ9NzRcBdKfRsVza0)

![Theme 2](https://private-user-images.githubusercontent.com/54266829/511137757-4a7f531e-986e-46f0-a7cf-5e10b08d36f9.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjM0NjMwMzksIm5iZiI6MTc2MzQ2MjczOSwicGF0aCI6Ii81NDI2NjgyOS81MTExMzc3NTctNGE3ZjUzMWUtOTg2ZS00NmYwLWE3Y2YtNWUxMGIwOGQzNmY5LnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTExMTglMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUxMTE4VDEwNDUzOVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTE2MGQ0ZDAyMTQzNWMyOTllNDFkMjllNDkxOGYyYWY5ZDYxOGQzYmM4ZGQxMTBkNjU5MzRjZGQ5NjczNmYxOTcmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.WSm831aP8bBMGy-s8I1vQq7lqyNvmGutieP2r4ZXa80)

## Usage

### Manual Entry

1. Type `-# ` at the start of a line, follow with text.
2. Switch to Reading View (or Live Preview) to see a compact heading that respects theme typography.
3. In Source mode, the text is tinted to match muted text/comment colors so it remains identifiable.

### Smart Toggle Command

The plugin provides a **Smart toggle negative heading** command that intelligently adds or removes the `-# ` token based on context:

- **Single line**: Place cursor on any line and run the command to toggle the token on/off.
- **Multiple lines**: Select multiple lines and run the command. It will analyze the selection:
  - If **majority are regular text** → adds `-# ` to all lines (SET operation)
  - If **majority are already negative headings** → removes `-# ` from all lines (UNSET operation)
  - On a **50/50 tie** → defaults to SET (add tokens)
- **List items**: Preserves list markers (`- `, `1. `, etc.) and inserts/removes the token after the marker.
- **Cursor preservation**: Your cursor/selection position adjusts automatically after the transformation.

**To use**: Open the command palette (`Ctrl/Cmd + P`) and search for "Smart Toggle Negative Heading", or assign a hotkey in Settings → Hotkeys.  

![Command Demo with Hotkey](https://private-user-images.githubusercontent.com/54266829/511140006-d1a0b747-2986-47dc-ad5a-b0d86cd0ee40.gif?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NjM0NjMwMzksIm5iZiI6MTc2MzQ2MjczOSwicGF0aCI6Ii81NDI2NjgyOS81MTExNDAwMDYtZDFhMGI3NDctMjk4Ni00N2RjLWFkNWEtYjBkODZjZDBlZTQwLmdpZj9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTExMTglMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUxMTE4VDEwNDUzOVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPWFmOGQ0MzFlN2JkYzg3MmVjNzQxNzM0Yjg1MjhjZGE2Zjk0OTZhN2NiZTdlMDFkNDBkZDNmNDdjOTE4ZjI2MmYmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.UMpyMnn3U2gF8ukgUw_jVCjVWZR2MUvy8gs0MftHOws)




**Examples**:
- Single line: `Text here` → `-# Text here` (and vice versa)
- In lists: `- Item text` → `- -# Item text` (and vice versa)
- Multiple lines: If you select 3 regular lines and 1 negative heading, all 4 become negative headings (majority rule)

Notes:

- Only a single leading `-# ` token is supported per block.
- Syntax inside code fences and math blocks is ignored on purpose.
- The smart toggle command skips empty lines and whitespace-only lines in multi-line selections.

## Installation

### From Obsidian Community Plugins (Recommended)

*Note: Pending approval to the community plugins repository.*

Once approved, you'll be able to install directly from Obsidian:

1. Open Obsidian Settings
2. Navigate to Community plugins and disable Safe Mode
3. Click Browse and search for "Negative Heading"
4. Click Install, then Enable

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

- Only matches lines that begin with `-# ` (at line start); indented lines are treated as plain text.
- The plugin targets Obsidian v1.6+ where Live Preview and the current CodeMirror 6 API are available.
- Single `-# ` token per line (repeated markers are treated as plain text).
- **Nested Lists in Reader Mode**: There is a known issue with rendering negative headings inside nested list items in Reader Mode. The styling may not apply correctly in deeply nested list structures. This is being investigated for a future update.

## Testing

The plugin includes comprehensive automated testing:

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:visual         # Visual regression tests
npm run test:edge          # Edge case tests
```

**Test Coverage:**
- 43 tests across 22 test files
- 200+ edge case scenarios
- Visual regression testing
- Mode parity verification (Reading/Live Preview/Source)
- Toggle command functionality
- Escape character handling
- List item behavior

## Troubleshooting

### Plugin doesn't appear in Reading View
- Ensure you're using `-# ` at the start of a line (not indented)
- Check that the line isn't inside a code block or math block
- Try reloading Obsidian

### Styles look wrong
- The plugin uses theme variables for colors
- Check your theme supports `--text-muted` and `--text-faint` variables
- Plugin provides fallbacks if variables aren't available

### Toggle command isn't working
- Ensure you have text selected or cursor on a line
- Empty lines are skipped in multi-line selections
- Check the command palette for "Smart toggle negative heading"

### Escape characters not working
- Use single backslash: `\-# Text` (not `\\-# `)
- Verify you're using the correct syntax (backslash before the dash)

## Architecture

This plugin uses a dual-pipeline architecture to support all Obsidian view modes:

- **Reader Mode Pipeline**: DOM post-processing via `registerMarkdownPostProcessor()`
- **Edit Mode Pipeline**: CodeMirror 6 decorations via `registerEditorExtension()`

For detailed architecture documentation, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Contributing

Contributions are welcome! Please see [AGENTS.md](AGENTS.md) for development guidelines and project conventions.

**Development Setup:**
```bash
npm install
npm run dev    # Watch mode
npm test       # Run tests
```

**Before submitting:**
- Ensure all tests pass (`npm test`)
- Follow the coding conventions in AGENTS.md
- Test in all three view modes (Reading View, Live Preview, Source Mode)
- Test edge cases (lists, code blocks, escape characters)

## License

This project is licensed under the GPL License. See [LICENSE](LICENSE) for details.

## Changelog

### 0.1.0 (Initial Release)
- Discord-style `-# Heading` syntax support
- Smart Toggle Command with majority detection
- Escape character support (`\-# `)
- List item support
- Works in all view modes
- Comprehensive test suite
