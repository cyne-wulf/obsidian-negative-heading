# Architecture

This document describes the technical architecture of the Negative Heading Plugin for Obsidian.

## Overview

The Negative Heading Plugin enables Discord-style `-# Heading` syntax in Obsidian, rendering it as compact, muted headings across all view modes. The plugin uses a **dual-pipeline architecture** to handle Obsidian's different view modes while maintaining consistent behavior.

## Core Architecture

### Dual-Pipeline Processing

The plugin implements two separate processing pipelines to support Obsidian's three view modes:

```
┌─────────────────────────────────────────────────────────┐
│                   Plugin Entry Point                     │
│                    (src/main.ts)                        │
└──────────────────┬──────────────────┬───────────────────┘
                   │                  │
        ┌──────────▼────────┐  ┌─────▼──────────┐
        │  Reader Mode      │  │  Edit Modes    │
        │  Pipeline         │  │  Pipeline      │
        └──────────┬────────┘  └─────┬──────────┘
                   │                  │
        ┌──────────▼────────┐  ┌─────▼──────────┐
        │ DOM Post-          │  │ CodeMirror 6   │
        │ Processor          │  │ Decorations    │
        │ (transformMarkdown)│  │ (ViewPlugin)   │
        └────────────────────┘  └────────────────┘
```

#### Pipeline 1: Reader Mode (DOM Post-Processing)

**API:** `registerMarkdownPostProcessor()`

**Flow:**
1. Obsidian renders markdown to DOM
2. Plugin receives DOM tree via post-processor callback
3. Plugin finds eligible blocks (paragraphs, list items)
4. Plugin checks source for escape characters
5. Plugin transforms matching blocks into heading elements
6. Plugin removes `-# ` tokens from display

**Key Methods:**
- `transformMarkdown()` - Entry point, walks DOM tree
- `tryPromoteBlock()` - Core transformation logic (src/main.ts:79-132)
- `isBlockEscapedInSource()` - Detects `\-#` escape sequences (src/main.ts:134-159)
- `createHeadingElement()` - Creates semantic heading markup (src/main.ts:180-191)

**Challenges:**
- No direct access to source text, only rendered DOM
- Must use `MarkdownPostProcessorContext.getSectionInfo()` for escape detection
- DOM structure varies (p vs li elements)
- Must avoid transforming code blocks, math blocks

#### Pipeline 2: Edit Modes (CodeMirror Decorations)

**API:** `registerEditorExtension()`

**Flow:**
1. CodeMirror parses document into syntax tree
2. Plugin's ViewPlugin scans for `-# ` tokens
3. Plugin checks context (line start, not in code/math)
4. Plugin applies decorations (dimmed token, styled text)
5. Decorations update reactively as user types

**Key Functions:**
- `buildDecorations()` - Main decoration builder (src/main.ts:228-323)
- `isInExcludedNode()` - Filters code/math/HTML contexts (src/main.ts:325-343)
- `findNextHeadingMatch()` - DOM walker for token detection (src/main.ts:366-447)

**Advantages:**
- Direct source access for escape character detection
- Reactive updates without full re-render
- Syntax tree provides context information

## Module Structure

### src/main.ts (584 lines)

Main plugin class and core rendering logic.

**Exports:**
- `NegativeHeadingPlugin` - Main plugin class extending Obsidian's Plugin

**Key Responsibilities:**
1. Plugin lifecycle management (`onload()`)
2. Reader Mode transformation pipeline
3. Edit Mode decoration system
4. CSS styling and color fallback system
5. Command registration

**Architecture Note:** This file is larger than ideal (584 lines). Future refactoring should extract DOM manipulation utilities to a separate module.

### src/commands/ (3 files, 326 lines total)

Modular command system for the Smart Toggle feature.

#### src/commands/toggle-command.ts (104 lines)

**Exports:** `smartToggleNegativeHeading(editor: Editor)`

Main command orchestration:
1. Get eligible lines from selection/cursor
2. Analyze lines to determine operation (SET/UNSET)
3. Apply transformation to all lines
4. Preserve and adjust cursor/selection positions

**Pattern:** Command pattern with state preservation

#### src/commands/toggle-utils.ts (169 lines)

**Exports:** Utility functions for line manipulation

Key functions:
- `isNegativeHeading(text)` - Detection regex
- `addNegativeHeadingToken(text)` - Adds `-# `, strips native `#` markers
- `removeNegativeHeadingToken(text)` - Removes `-# ` token
- `getEligibleLines(editor)` - Gets lines from selection or cursor
- `parseLineInfo(text, lineNumber)` - Creates LineInfo objects

**Design:** Pure functions for testability

#### src/commands/toggle-analysis.ts (53 lines)

**Exports:** `analyzeLines(lines: LineInfo[])`

Majority detection algorithm:
- Returns `SET` if ≤50% are negative headings
- Returns `UNSET` if >50% are negative headings
- 50/50 tie defaults to `SET`

**Pattern:** Strategy pattern for decision logic

### src/types.ts (40 lines)

TypeScript interfaces for type safety.

**Key Types:**
- `LineInfo` - Represents a line with metadata
- `AnalysisResult` - Result of majority analysis
- `EditorState` - Cursor/selection position tracking

## Key Architectural Patterns

### Pattern 1: Progressive Enhancement

The plugin works in increasingly sophisticated ways based on available context:

```
Basic: Regex pattern matching
  ↓
Enhanced: Syntax tree context awareness
  ↓
Full: Source access for escape detection
```

### Pattern 2: Separation of Concerns

```
Rendering Logic (main.ts)
  → View-specific implementation

Command Logic (commands/)
  → Business logic separated by concern
  → Utils: data transformation
  → Analysis: decision making
  → Command: orchestration
```

### Pattern 3: State Preservation

Commands preserve editor state through transformations:
1. Capture cursor/selection positions
2. Perform text modifications
3. Adjust positions based on text changes
4. Restore adjusted positions

This ensures smooth UX and proper undo/redo behavior.

### Pattern 4: Context-Aware Processing

The plugin uses different strategies for context detection:

**Edit Modes:**
```
CodeMirror Syntax Tree
  → Direct node type checking
  → isInExcludedNode(tree, pos)
```

**Reader Mode:**
```
DOM Tree + Source Access
  → DOM traversal for structure
  → getSectionInfo() for escape detection
  → isBlockEscapedInSource(sectionInfo, block)
```

### Pattern 5: Defensive Filtering

Multiple layers of filtering prevent false positives:

1. **Syntax matching**: Must match `-# ` pattern
2. **Position checking**: Must be at line start
3. **Context filtering**: Exclude code, math, HTML
4. **Escape detection**: Respect `\-#` escape sequences
5. **Already-processed**: Check `data-neg-heading` attribute

## Styling System

### CSS Architecture

```
Base Styles (styles.css)
  ↓
CSS Variables (--text-muted, --text-faint)
  ↓
Theme Color Fallback (CodeMirror comment color)
  ↓
Hard-Coded Fallback (rgb(120, 120, 120))
```

**Classes:**
- `.neg-heading.neg-h1` - Main heading class
- `.cm-neg-heading-text` - Editor text decoration
- `.cm-neg-heading-token` - Editor token decoration
- `.cm-neg-heading-token-solo` - Token without content

**Special Handling:**
List items receive inline display styles to prevent layout breaking.

## Data Flow

### Reader Mode Transformation

```
Markdown Source
  ↓
Obsidian Parser
  ↓
Rendered DOM
  ↓
Plugin Post-Processor
  ├─→ Find Eligible Blocks
  ├─→ Check Source for Escapes
  ├─→ Transform to Headings
  └─→ Remove Tokens
  ↓
Final Rendered Output
```

### Edit Mode Decoration

```
User Types
  ↓
CodeMirror Update
  ↓
Syntax Tree Parse
  ↓
Plugin ViewPlugin
  ├─→ Scan for Patterns
  ├─→ Check Syntax Context
  ├─→ Build Decorations
  └─→ Apply Styles
  ↓
Updated Editor View
```

### Toggle Command Flow

```
User Invokes Command
  ↓
Get Selection/Cursor
  ↓
Parse Lines → LineInfo[]
  ↓
Analyze Lines → AnalysisResult
  ↓
Determine Operation (SET/UNSET)
  ↓
Transform Each Line
  ↓
Adjust Cursor Position
  ↓
Apply Changes (Single Transaction)
```

## Edge Cases and Special Handling

### Escape Character Support - Complete Implementation Guide

This section documents the complete solution for escape character support, including all edge cases discovered through extensive testing and iteration. This guide will help you implement escape character functionality correctly the first time.

#### The Core Challenge

Escape character support in Obsidian plugins is complex because of the **timing and transformation pipeline**:

1. **Source Markdown**: User writes `\-# Escaped text`
2. **Obsidian Processing**: Markdown processor consumes the backslash
3. **DOM Result**: Plugin sees `-# Escaped text` (no backslash!)
4. **Plugin Decision**: Must determine this should NOT be styled

The challenge is distinguishing between:
- `-# Regular heading` (should be styled)
- `-# Escaped text` (originally `\-#`, should NOT be styled)

Both look identical in the DOM!

#### The Multi-Layer Problem

**Different Modes, Different Approaches:**

1. **Edit/Live Preview Modes**:
   - Can access raw text through CodeMirror
   - Can detect `\-#` directly in source
   - Relatively straightforward implementation

2. **Reader Mode** (The Hard Part):
   - Only has access to processed DOM
   - Backslash already consumed by Obsidian
   - Must use `ctx.getSectionInfo()` for ground truth
   - **Critical insight**: This provides the ORIGINAL source with backslashes intact!

**Block Structure Complexity:**

Obsidian may render multiple lines as a single block:
```markdown
-# First line
\-# Second line (escaped)
-# Third line
```

This creates ONE paragraph element with THREE `-#` tokens inside. The escape detection must work at the **token level**, not the block level.

#### Failed Approaches (Learn from Our Mistakes)

**❌ Attempt 1: Block-Level Escape Detection**
```typescript
// DON'T DO THIS
if (isBlockEscapedInSource(block)) {
    return; // Skip entire block
}
```
**Why it fails**: Multi-line blocks contain both escaped and non-escaped lines. You can't skip the entire block.

**❌ Attempt 2: DOM-Based Escape Detection**
```typescript
// DON'T DO THIS
if (domText.includes('\\-#')) {
    // This is escaped
}
```
**Why it fails**: The backslash is already gone from the DOM in Reader Mode!

**❌ Attempt 3: Wrong Line Indexing**
```typescript
// DON'T DO THIS
for (let i = 0; i < lines.length; i++) {
    // Check all lines in section
}
```
**Why it fails**: You must use `lineStart` and `lineEnd` to map blocks to their specific source lines. Checking all lines causes false matches between unrelated blocks.

**❌ Attempt 4: Not Removing Tokens (CAUSES INFINITE LOOP!)**
```typescript
// DON'T DO THIS
if (escapedLineContents.has(contentText)) {
    continue; // Skip but don't remove token
}
```
**Why it fails**: `findNextHeadingMatch` will find the same token again, causing an infinite loop and freezing Obsidian!

#### The Working Solution

**Key Components:**

1. **Per-Token Escape Detection** in `tryPromoteBlock`:
```typescript
// Build set of escaped line contents at start
const escapedLineContents = new Set<string>();
if (ctx) {
    const sectionInfo = ctx.getSectionInfo(block);
    if (sectionInfo) {
        const { text, lineStart, lineEnd } = sectionInfo;
        const lines = text.split('\n');

        // CRITICAL: Only check lines for THIS block
        for (let i = lineStart; i <= lineEnd && i < lines.length; i++) {
            const line = lines[i].trim();
            if (ESCAPED_NEG_HEADING_REGEX.test(line)) {
                // Extract content after \-#
                const content = line.replace(ESCAPED_NEG_HEADING_REGEX, '').trim();
                escapedLineContents.add(content);
            }
        }
    }
}

// Later, for each token found:
if (escapedLineContents.has(contentText)) {
    // CRITICAL: Must remove token to prevent infinite loop!
    removeTokenFromMatch(match);
    match = findNextHeadingMatch(block);
    continue;
}
```

2. **Understanding getSectionInfo()**:
   - Returns object with `{ text, lineStart, lineEnd }`
   - `text`: Original markdown source WITH backslashes intact
   - `lineStart`/`lineEnd`: 0-indexed positions of this block's lines WITHIN the section text
   - **NOT** absolute document line numbers!

3. **Correct Line Mapping**:
   - Each block gets its own `lineStart`/`lineEnd` range
   - Multiple blocks may share the same section text
   - You MUST respect these boundaries to avoid cross-block contamination

#### Critical Implementation Details

**1. Always Remove Tokens**:
```typescript
// Whether escaping or transforming, ALWAYS remove the token
removeTokenFromMatch(match); // Prevents infinite loops
```

**2. Content Matching Strategy**:
```typescript
// Source line: "\-# My Content"
// After removing escape: "My Content"
// DOM text to match: "My Content" (from `-# My Content` in DOM)
escapedLineContents.add("My Content"); // Store without token
```

**3. Handle Edge Cases**:
- Empty blocks
- Whitespace-only content
- Multiple escaped lines in one block
- Adjacent escaped/unescaped lines
- List items with escapes

#### Common Pitfalls and How to Avoid Them

**Pitfall 1: Assuming One Block = One Line**
- **Reality**: Obsidian may combine multiple lines into one block
- **Solution**: Process each `-#` token individually within blocks

**Pitfall 2: Forgetting Token Removal**
- **Symptom**: Infinite loop, Obsidian freezes
- **Solution**: Always call `removeTokenFromMatch(match)` even when skipping

**Pitfall 3: Ignoring lineStart/lineEnd**
- **Symptom**: Blocks incorrectly marked as escaped due to other blocks' content
- **Solution**: Always use `for (let i = lineStart; i <= lineEnd && i < lines.length; i++)`

**Pitfall 4: Trying to Detect Escapes in DOM**
- **Problem**: Backslash is already consumed
- **Solution**: Use `getSectionInfo()` for original source access

**Pitfall 5: Over-Matching Content**
- **Problem**: Using `includes()` instead of exact match
- **Solution**: Use Set with exact content strings

#### Testing Escape Behavior

**The Three-Line Test** (Critical for verification):
```markdown
-# First line is a negative heading
\-# Second Line is escaped
-# Third line is negative heading
```

Expected results:
1. Line 1: Styled as negative heading ✓
2. Line 2: NOT styled (displays as plain text) ✓
3. Line 3: Styled as negative heading ✓

**Edge Case Tests**:
- Single escaped line alone
- Multiple escaped lines in sequence
- Escaped line in list item: `- \-# Escaped item`
- Mixed indentation with escapes
- Empty content after escape: `\-# `

#### Why This Solution Works

1. **Respects Obsidian's Processing Pipeline**: Works WITH the markdown processor, not against it
2. **Ground Truth from Source**: Uses `getSectionInfo()` to access original markdown
3. **Token-Level Precision**: Handles multi-line blocks correctly
4. **Performance**: O(n) where n = number of lines in block's range
5. **No Infinite Loops**: Proper token removal prevents re-processing

#### Implementation Checklist

- [ ] Use `ctx.getSectionInfo(block)` for source access in Reader Mode
- [ ] Build Set of escaped content at block processing start
- [ ] Check each token's content against the Set
- [ ] ALWAYS remove tokens (even when skipping)
- [ ] Respect lineStart/lineEnd boundaries
- [ ] Test with multi-line blocks
- [ ] Test with the three-line verification case
- [ ] Verify no infinite loops occur

#### Summary

The escape character implementation requires understanding that:
1. Obsidian's markdown processor runs BEFORE your plugin
2. Reader Mode requires source access through `getSectionInfo()`
3. Multi-line blocks need token-level escape detection
4. Tokens must be removed to prevent infinite loops
5. Line boundaries (lineStart/lineEnd) are critical for correct mapping

This implementation achieves full parity with Obsidian's native heading escape behavior while handling all edge cases correctly.

### List Item Handling

List items require special treatment:

1. **Detection:** Check if parent/ancestor is `<li>`
2. **Styling:** Apply `display: inline` to prevent breaking list layout
3. **Token Position:** Preserve list marker (`-`, `*`, `1.`)

**Example:**
```
- -# Item text
```
Renders as an inline heading within the list item.

### Indentation Exclusion

Negative headings must appear at line start:

```
Valid:   -# Heading
Invalid:     -# Indented (ignored)
```

This prevents false positives in nested contexts.

### Already-Processed Protection

Blocks marked with `data-neg-heading="true"` are skipped to prevent double-processing on re-renders.

## Performance Considerations

### Reader Mode

- DOM traversal is O(n) where n = number of blocks
- Source inspection is O(m) where m = number of source lines
- Runs once per section render

### Edit Mode

- Decoration building is O(n) where n = document length
- Runs on every editor update (throttled by CodeMirror)
- Syntax tree iteration is efficient (tree walking)

### Toggle Command

- Line parsing is O(n) where n = number of selected lines
- No syntax tree parsing (lightweight regex matching)
- Single transaction for all changes

## Testing Architecture

See TESTING.md for comprehensive testing documentation.

**Test Categories:**
- Visual regression tests
- Edge case tests (200+ scenarios)
- Mode parity tests
- Escape character tests
- Toggle command tests
- Native behavior probes

**Test Framework:** Jest with jsdom

**Coverage:** 43 tests covering rendering, commands, and edge cases

## Future Architecture Improvements

### Potential Refactorings

1. **Extract DOM utilities** from main.ts into `src/utils/dom.ts`
2. **Extract decoration logic** into `src/rendering/decorations.ts`
3. **Create unified context detector** to share code between pipelines
4. **Add plugin settings** for user customization

### Extension Points

1. **Custom styling** - Settings tab for color/size preferences
2. **Additional commands** - Convert native headings, batch operations
3. **Syntax variants** - Support alternative markers beyond `-#`
4. **Export/import** - Compatibility with other markdown renderers

## Dependencies

### Core Dependencies
- **obsidian** - Obsidian API (Plugin, Editor, MarkdownPostProcessor, etc.)
- **@codemirror/state** - CodeMirror state management
- **@codemirror/view** - CodeMirror view layer (ViewPlugin, Decoration)

### Dev Dependencies
- **typescript** - Type checking
- **esbuild** - Bundling
- **jest** - Testing framework
- **@types/node** - Node.js type definitions

## Build System

**Builder:** esbuild (esbuild.config.mjs)

**Configuration:**
- Target: ES2018
- Format: CommonJS
- Platform: Browser
- External: obsidian, electron, @codemirror/*
- Minification: Production only
- Sourcemaps: Development only

**Output:** main.js (bundled plugin)

## Versioning

**Current Version:** 0.1.0

**Versioning Scheme:** Semantic Versioning (semver)
- Major: Breaking changes
- Minor: New features
- Patch: Bug fixes

**Manifest:** manifest.json specifies minAppVersion for compatibility

## License

GPL License - See LICENSE file for details

## References

- [Obsidian Plugin API Documentation](https://docs.obsidian.md/)
- [CodeMirror 6 Documentation](https://codemirror.net/docs/)
- [Discord Message Formatting](https://support.discord.com/hc/en-us/articles/210298617-Markdown-Text-101-Chat-Formatting-Bold-Italic-Underline-)
