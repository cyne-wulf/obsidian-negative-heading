/**
 * Reader Mode Escape Detection Probe
 *
 * PURPOSE: Investigate how Obsidian's markdown processor handles escaped syntax
 * in reader mode, and whether we can detect it in our plugin.
 *
 * PROBLEM: User reports that \-# still renders as heading in reader mode.
 * This suggests our escape detection isn't working because the backslash
 * is consumed by Obsidian's markdown processor before our plugin runs.
 */

import { setupDOM, createWorkingMockPlugin } from './test-environment';

describe('Reader Mode Escape Detection Probes', () => {
  let plugin: any;

  beforeEach(() => {
    setupDOM();
    const MockPlugin = createWorkingMockPlugin();
    plugin = new MockPlugin();
  });

  describe('PROBE: What does escaped markdown look like in reader mode?', () => {
    test('probe: does Obsidian add markers to escaped content?', () => {
      // Simulate what Obsidian's reader mode MIGHT produce for: \-# Escaped
      const p = document.createElement('p');

      // After markdown processing, the backslash is consumed
      // What's left is just the text
      p.textContent = '-# Escaped heading text';

      console.log('\n=== READER MODE ESCAPE PROBE ===');
      console.log('Raw textContent:', p.textContent);
      console.log('innerHTML:', p.innerHTML);
      console.log('className:', p.className);
      console.log('Attributes:', Array.from(p.attributes).map(a => `${a.name}="${a.value}"`));

      // Check if there's any way to distinguish this from unescaped content
      const hasEscapeMarker = p.hasAttribute('data-escaped') ||
                              p.className.includes('escaped') ||
                              p.innerHTML.includes('\\');

      console.log('Has escape marker?', hasEscapeMarker);
      console.log('================================\n');

      // Document finding: In JSDOM simulation, there's no escape marker
      // This means we can't distinguish escaped from unescaped in reader mode
      expect(p.textContent).toBe('-# Escaped heading text');
    });

    test('probe: what if Obsidian wraps escaped chars in a span?', () => {
      // Some markdown processors wrap escaped content
      const p = document.createElement('p');
      const span = document.createElement('span');
      span.className = 'escaped-char'; // hypothetical
      span.textContent = '-#';
      p.appendChild(span);
      p.appendChild(document.createTextNode(' Escaped heading'));

      console.log('\n=== SPAN-WRAPPED ESCAPE PROBE ===');
      console.log('Has .escaped-char span?', p.querySelector('.escaped-char') !== null);
      console.log('textContent:', p.textContent);
      console.log('innerHTML:', p.innerHTML);
      console.log('=================================\n');

      // If Obsidian uses this pattern, we could detect it
      const escapedSpan = p.querySelector('.escaped-char, [data-escaped="true"]');
      if (escapedSpan) {
        console.log('✓ Could detect escape via span marker');
      }
    });

    test('probe: what if backslash remains in textContent?', () => {
      // Maybe the backslash is preserved in some way?
      const p = document.createElement('p');
      p.textContent = '\\-# With backslash preserved';

      console.log('\n=== BACKSLASH PRESERVED PROBE ===');
      console.log('textContent:', p.textContent);
      console.log('Starts with backslash?', p.textContent.startsWith('\\'));
      console.log('=================================\n');

      const hasBackslash = p.textContent.includes('\\');
      if (hasBackslash) {
        console.log('✓ Could detect via backslash in text');
      }
    });
  });

  describe('ACTUAL TEST: Escaped syntax should NOT render heading style', () => {
    test('scenario 1: backslash is consumed (most likely)', () => {
      // This is what likely happens in real Obsidian reader mode:
      // User writes: \-# Escaped text
      // Markdown processor outputs: <p>-# Escaped text</p>
      // Backslash is GONE, just plain text remains

      const p = document.createElement('p');
      p.textContent = '-# Escaped text'; // No backslash!

      plugin.transformMarkdown(p);

      const heading = p.querySelector('[data-neg-heading="true"]');

      // CURRENT BEHAVIOR: This WILL style it as heading (WRONG!)
      // because we can't tell it was escaped
      if (heading) {
        console.error('\n❌ PROBLEM: Escaped content is being styled as heading');
        console.error('   User wrote: \\-# Escaped text');
        console.error('   Obsidian processed to: <p>-# Escaped text</p>');
        console.error('   Our plugin sees: "-# Escaped text" and styles it (WRONG!)');
        console.error('   ISSUE: Backslash consumed before our plugin runs\n');
      }

      // This test documents the CURRENT BROKEN behavior
      // We expect it to be styled (wrong) because we can't detect the escape
      expect(heading).toBeTruthy(); // Current behavior: styles it (incorrect)
    });

    test('scenario 2: backslash is preserved (ideal case)', () => {
      // If Obsidian preserves the backslash somehow
      const p = document.createElement('p');
      p.textContent = '\\-# Escaped text'; // Backslash preserved

      plugin.transformMarkdown(p);

      const heading = p.querySelector('[data-neg-heading="true"]');

      // EXPECTED: Should NOT style because we detect the backslash
      expect(heading).toBeNull();

      if (!heading) {
        console.log('✓ Escape detection works when backslash is preserved');
      }
    });

    test('scenario 3: Obsidian adds a marker class or attribute', () => {
      // If Obsidian adds a marker we could detect
      const p = document.createElement('p');
      p.textContent = '-# Escaped text';
      p.setAttribute('data-escaped-content', 'true'); // hypothetical marker

      // First check if marker exists
      if (p.hasAttribute('data-escaped-content')) {
        // Our plugin should check for this marker and skip
        console.log('Found escape marker, should skip transformation');
      }

      plugin.transformMarkdown(p);

      const heading = p.querySelector('[data-neg-heading="true"]');

      // Currently our plugin doesn't check for markers, so this will still style
      // But if Obsidian provides markers, we could implement detection
    });
  });

  describe('INVESTIGATION: Check actual Obsidian reader mode output', () => {
    test('document what we need to discover in real Obsidian', () => {
      console.log('\n=== TO TEST IN REAL OBSIDIAN ===');
      console.log('1. Create a note with: \\-# Escaped heading');
      console.log('2. Open reader mode');
      console.log('3. Open browser DevTools (Ctrl+Shift+I)');
      console.log('4. Inspect the paragraph element');
      console.log('5. Check:');
      console.log('   - What is the textContent? (includes backslash?)');
      console.log('   - What is the innerHTML?');
      console.log('   - What classes are on the <p>?');
      console.log('   - Any data-* attributes?');
      console.log('   - Is content wrapped in any special spans?');
      console.log('================================\n');

      expect(true).toBe(true); // Just documentation
    });
  });
});
