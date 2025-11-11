# Escape Character Limitations in Reader Mode

## Summary

**Issue**: Single backslash escape `\-#` does not prevent styling in Reader Mode.

**Workaround**: Use double backslash `\\-#` for content that will be viewed in Reader Mode.

**Status**: This is a **fundamental limitation** of the Obsidian plugin API architecture, not a bug that can be fixed.

---

## Why This Happens

### The Processing Pipeline

When you view a note in Reader Mode, Obsidian processes it in this order:

1. **Obsidian's Markdown Processor** runs first
   - Interprets escape sequences
   - Converts `\-#` to `-#` (consumes the backslash)
   - Creates the DOM structure

2. **Plugin Hooks Run** (our plugin runs here)
   - Receives the already-processed DOM
   - Sees `-#` with no backslash present
   - Cannot distinguish between:
     - "Text that happens to start with `-#`"
     - "Escaped negative heading that lost its backslash"

### Why We Can't Fix This

Our plugin uses `registerMarkdownPostProcessor`, which runs **after** Obsidian's markdown processing. By the time our plugin sees the content, the escape character has already been consumed.

There is no plugin API hook that runs **before** markdown processing that would allow us to detect the original escape character.

---

## Mode-by-Mode Behavior

### ✅ Edit Mode & Live Preview Mode

**Single backslash works correctly:**

```markdown
\-# This will NOT be styled as a heading
-# This WILL be styled as a heading
```

**Why it works**: In editor modes, our plugin uses CodeMirror's `ViewPlugin` which has direct access to the raw editor text where backslashes are preserved.

### ⚠️ Reader Mode

**Single backslash does NOT work:**

```markdown
\-# This WILL be styled as a heading (incorrect)
-# This WILL be styled as a heading (correct)
```

**Double backslash workaround works:**

```markdown
\\-# This will NOT be styled as a heading
-# This WILL be styled as a heading
```

**Why**: Obsidian's markdown processor consumes one backslash, leaving `\-#` which our plugin CAN detect.

---

## Recommended Solutions

### Option 1: Use Double Backslash (Recommended)

If your content will be viewed in Reader Mode, use double backslash:

```markdown
\\-# This text starts with -# but is not a heading
```

**Pros**: Works reliably in all modes
**Cons**: Slightly less intuitive than single backslash

### Option 2: Use HTML Comments

Obsidian ignores content in HTML comments:

```markdown
<!-- -# This is a comment, not a heading -->
```

### Option 3: Use Inline Code

Inline code is never processed as a heading:

```markdown
`-# This is inline code, not a heading`
```

### Option 4: Add Extra Space

Negative headings require a space after `-#`. No space = not a heading:

```markdown
-#This is not a heading (no space after #)
-# This IS a heading (space after #)
```

---

## Comparison with Native Headings

Native Obsidian headings have the **exact same limitation**:

```markdown
\# This becomes plain text "# This becomes plain text"
# This becomes a real H1 heading
```

When you write `\#`, Obsidian's markdown processor converts it to plain text `#` before any plugins run. Our negative heading syntax behaves consistently with this native behavior.

---

## Technical Details

For developers or curious users:

- **Edit/Live Preview**: Uses `registerEditorExtension` with CodeMirror 6 `ViewPlugin`
  - Direct access to editor state via `view.state.doc`
  - Backslashes are preserved in the document text
  - Escape detection regex: `/^\\-#\s+/`

- **Reader Mode**: Uses `registerMarkdownPostProcessor`
  - Receives DOM after markdown processing
  - Backslashes already consumed by Remark/Markdown-it
  - No way to detect original escape characters

---

## Test Verification

This limitation has been verified with:

1. **Unit tests**: See `tests/reader-mode-escape-reality.test.ts`
2. **Real Obsidian testing**: Confirmed in actual Obsidian Reader Mode using DevTools inspection
3. **Native heading comparison**: Verified that native headings have identical behavior

---

## Future Possibilities

This could potentially be fixed if Obsidian adds:
- A plugin API hook that runs before markdown processing
- Metadata or attributes to mark escaped content in the DOM
- A way for plugins to register custom escape sequences

Until then, the double backslash workaround (`\\-#`) is the recommended solution for Reader Mode.
