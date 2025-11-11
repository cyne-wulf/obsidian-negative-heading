# Negative Heading Plugin - Development Guide

## Project-Specific Overview

**Plugin Name:** Negative Heading Plugin
**Purpose:** Discord-style `-# Heading` syntax support in Obsidian
**Author:** Ashan Devine
**Architecture:** Dual-pipeline processing (Reader Mode DOM + Edit Mode CodeMirror decorations)

### Key Features
- Discord-style compact headings (`-# Heading text`)
- Smart Toggle Command for converting lines to/from negative headings
- Escape character support (`\-# Escaped text`)
- Works in all view modes (Reading, Live Preview, Source)
- List item support (`- -# List heading`)

### Current Project Structure
```
src/
  main.ts              # Plugin entry (584 lines) - Core rendering logic
  types.ts             # TypeScript interfaces (40 lines)
  commands/
    toggle-command.ts  # Command orchestration (104 lines)
    toggle-utils.ts    # Utility functions (169 lines)
    toggle-analysis.ts # Majority detection (53 lines)
tests/                 # 22 test files with Jest
styles.css             # Negative heading styles
manifest.json          # Plugin metadata
```

### Development Focus Areas

**Architecture Notes:**
- See ARCHITECTURE.md for detailed architecture documentation
- Dual-pipeline: DOM post-processing (Reader) + CodeMirror decorations (Edit)
- main.ts is larger than ideal (584 lines) - future refactoring should extract DOM utilities

**Testing:**
- Jest with jsdom for testing
- 43 tests across 22 test files
- Run: `npm test` or `npm run test:watch`
- Visual regression tests: `npm run test:visual`
- Edge case tests: `npm run test:edge`

**Known Challenges:**
- Reader Mode requires source access for escape detection via `getSectionInfo()`
- List items need special inline styling
- Code block/math block exclusion requires syntax tree traversal
- Indented content must be filtered (line-start requirement)

## General Obsidian Plugin Development

### Target Platform
- Target: Obsidian Community Plugin (TypeScript → bundled JavaScript).
- Entry point: `main.ts` compiled to `main.js` and loaded by Obsidian.
- Required release artifacts: `main.js`, `manifest.json`, and optional `styles.css`.

## Environment & tooling

- Node.js: use current LTS (Node 18+ recommended).
- **Package manager: npm** (required - `package.json` defines npm scripts and dependencies).
- **Bundler: esbuild** (required - `esbuild.config.mjs` and build scripts depend on it).
- **Test framework: Jest** with jsdom for DOM testing
- Types: `obsidian` type definitions, `@codemirror` types.

### Install

```bash
npm install
```

### Dev (watch)

```bash
npm run dev
```

### Production build

```bash
npm run build
```

## Linting

- To use eslint install eslint from terminal: `npm install -g eslint`
- To use eslint to analyze this project use this command: `eslint main.ts`
- eslint will then create a report with suggestions for code improvement by file and line number.
- If your source code is in a folder, such as `src`, you can use eslint with this command to analyze all files in that folder: `eslint ./src/`

## File & folder conventions

- **Organize code into multiple files**: Split functionality across separate modules rather than putting everything in `main.ts`.
- Source lives in `src/`. Keep `main.ts` focused on plugin lifecycle and core rendering logic.
- **This project's structure**:
  ```
  src/
    main.ts              # Plugin entry, Reader Mode pipeline, Edit Mode decorations
    types.ts             # TypeScript interfaces (LineInfo, AnalysisResult, EditorState)
    commands/            # Smart Toggle Command implementation
      toggle-command.ts  # Command orchestration
      toggle-utils.ts    # Line manipulation utilities
      toggle-analysis.ts # Majority detection algorithm
  tests/                 # Jest test suite
    visual.test.ts       # Visual regression tests
    edge-cases.test.ts   # 200+ edge case scenarios
    [18 more test files]
  styles.css             # Negative heading styling
  manifest.json          # Plugin metadata
  esbuild.config.mjs     # Build configuration
  jest.config.js         # Jest configuration
  ```
- **Do not commit build artifacts**: Never commit `node_modules/`, `main.js`, or other generated files to version control.
- Keep the plugin small. Avoid large dependencies. Prefer browser-compatible packages.
- Generated output should be placed at the plugin root. Release artifacts must end up at the top level of the plugin folder (`main.js`, `manifest.json`, `styles.css`).

## Manifest rules (`manifest.json`)

- Must include (non-exhaustive):  
  - `id` (plugin ID; for local dev it should match the folder name)  
  - `name`  
  - `version` (Semantic Versioning `x.y.z`)  
  - `minAppVersion`  
  - `description`  
  - `isDesktopOnly` (boolean)  
  - Optional: `author`, `authorUrl`, `fundingUrl` (string or map)
- Never change `id` after release. Treat it as stable API.
- Keep `minAppVersion` accurate when using newer APIs.
- Canonical requirements are coded here: https://github.com/obsidianmd/obsidian-releases/blob/master/.github/workflows/validate-plugin-entry.yml

## Testing

### Automated Testing (Jest)

This project uses Jest with jsdom for comprehensive automated testing:

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:visual         # Visual regression tests
npm run test:edge          # Edge case tests
npm run test:update-snapshots  # Update snapshots
```

**Test Categories:**
- Visual regression tests (visual.test.ts)
- Edge cases (200+ scenarios in edge-cases.test.ts)
- Mode parity tests (source-mode.test.ts, mode-parity.test.ts)
- Escape character tests (escape-character.test.ts, reader-mode-escape-*.test.ts)
- Toggle command tests (toggle-command-*.test.ts)
- List item behavior tests
- Native behavior probes

**Current Status:** 43 tests, target 100% pass rate

### Manual Testing

- Manual install for testing: copy `main.js`, `manifest.json`, `styles.css` to:
  ```
  <Vault>/.obsidian/plugins/negative-heading-plugin/
  ```
- Reload Obsidian and enable the plugin in **Settings → Community plugins**.
- Test in all three view modes: Reading View, Live Preview, Source Mode
- Test list item behavior, escape characters, and edge cases

## Commands & settings

- Any user-facing commands should be added via `this.addCommand(...)`.
- If the plugin has configuration, provide a settings tab and sensible defaults.
- Persist settings using `this.loadData()` / `this.saveData()`.
- Use stable command IDs; avoid renaming once released.

## Versioning & releases

- Bump `version` in `manifest.json` (SemVer) and update `versions.json` to map plugin version → minimum app version.
- Create a GitHub release whose tag exactly matches `manifest.json`'s `version`. Do not use a leading `v`.
- Attach `manifest.json`, `main.js`, and `styles.css` (if present) to the release as individual assets.
- After the initial release, follow the process to add/update your plugin in the community catalog as required.

## Security, privacy, and compliance

Follow Obsidian's **Developer Policies** and **Plugin Guidelines**. In particular:

- Default to local/offline operation. Only make network requests when essential to the feature.
- No hidden telemetry. If you collect optional analytics or call third-party services, require explicit opt-in and document clearly in `README.md` and in settings.
- Never execute remote code, fetch and eval scripts, or auto-update plugin code outside of normal releases.
- Minimize scope: read/write only what's necessary inside the vault. Do not access files outside the vault.
- Clearly disclose any external services used, data sent, and risks.
- Respect user privacy. Do not collect vault contents, filenames, or personal information unless absolutely necessary and explicitly consented.
- Avoid deceptive patterns, ads, or spammy notifications.
- Register and clean up all DOM, app, and interval listeners using the provided `register*` helpers so the plugin unloads safely.

## UX & copy guidelines (for UI text, commands, settings)

- Prefer sentence case for headings, buttons, and titles.
- Use clear, action-oriented imperatives in step-by-step copy.
- Use **bold** to indicate literal UI labels. Prefer "select" for interactions.
- Use arrow notation for navigation: **Settings → Community plugins**.
- Keep in-app strings short, consistent, and free of jargon.

## Performance

- Keep startup light. Defer heavy work until needed.
- Avoid long-running tasks during `onload`; use lazy initialization.
- Batch disk access and avoid excessive vault scans.
- Debounce/throttle expensive operations in response to file system events.

## Coding conventions

- TypeScript with `"strict": true` preferred.
- **Keep `main.ts` minimal**: Focus only on plugin lifecycle (onload, onunload, addCommand calls). Delegate all feature logic to separate modules.
- **Split large files**: If any file exceeds ~200-300 lines, consider breaking it into smaller, focused modules.
- **Use clear module boundaries**: Each file should have a single, well-defined responsibility.
- Bundle everything into `main.js` (no unbundled runtime deps).
- Avoid Node/Electron APIs if you want mobile compatibility; set `isDesktopOnly` accordingly.
- Prefer `async/await` over promise chains; handle errors gracefully.

## Mobile

- Where feasible, test on iOS and Android.
- Don't assume desktop-only behavior unless `isDesktopOnly` is `true`.
- Avoid large in-memory structures; be mindful of memory and storage constraints.

## Agent do/don't

**Do**
- Add commands with stable IDs (don't rename once released).
- Provide defaults and validation in settings.
- Write idempotent code paths so reload/unload doesn't leak listeners or intervals.
- Use `this.register*` helpers for everything that needs cleanup.

**Don't**
- Introduce network calls without an obvious user-facing reason and documentation.
- Ship features that require cloud services without clear disclosure and explicit opt-in.
- Store or transmit vault contents unless essential and consented.

## Common tasks

### Organize code across multiple files

**main.ts** (minimal, lifecycle only):
```ts
import { Plugin } from "obsidian";
import { MySettings, DEFAULT_SETTINGS } from "./settings";
import { registerCommands } from "./commands";

export default class MyPlugin extends Plugin {
  settings: MySettings;

  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    registerCommands(this);
  }
}
```

**settings.ts**:
```ts
export interface MySettings {
  enabled: boolean;
  apiKey: string;
}

export const DEFAULT_SETTINGS: MySettings = {
  enabled: true,
  apiKey: "",
};
```

**commands/index.ts**:
```ts
import { Plugin } from "obsidian";
import { doSomething } from "./my-command";

export function registerCommands(plugin: Plugin) {
  plugin.addCommand({
    id: "do-something",
    name: "Do something",
    callback: () => doSomething(plugin),
  });
}
```

### Add a command

```ts
this.addCommand({
  id: "your-command-id",
  name: "Do the thing",
  callback: () => this.doTheThing(),
});
```

### Persist settings

```ts
interface MySettings { enabled: boolean }
const DEFAULT_SETTINGS: MySettings = { enabled: true };

async onload() {
  this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  await this.saveData(this.settings);
}
```

### Register listeners safely

```ts
this.registerEvent(this.app.workspace.on("file-open", f => { /* ... */ }));
this.registerDomEvent(window, "resize", () => { /* ... */ });
this.registerInterval(window.setInterval(() => { /* ... */ }, 1000));
```

## Troubleshooting

- Plugin doesn't load after build: ensure `main.js` and `manifest.json` are at the top level of the plugin folder under `<Vault>/.obsidian/plugins/<plugin-id>/`. 
- Build issues: if `main.js` is missing, run `npm run build` or `npm run dev` to compile your TypeScript source code.
- Commands not appearing: verify `addCommand` runs after `onload` and IDs are unique.
- Settings not persisting: ensure `loadData`/`saveData` are awaited and you re-render the UI after changes.
- Mobile-only issues: confirm you're not using desktop-only APIs; check `isDesktopOnly` and adjust.

## References

- Obsidian sample plugin: https://github.com/obsidianmd/obsidian-sample-plugin
- API documentation: https://docs.obsidian.md
- Developer policies: https://docs.obsidian.md/Developer+policies
- Plugin guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- Style guide: https://help.obsidian.md/style-guide
