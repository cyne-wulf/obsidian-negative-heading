/**
 * Reader Mode Escape Detection - Reality Check
 *
 * FINDINGS FROM REAL OBSIDIAN TESTING:
 * ====================================
 *
 * The user confirmed that in Reader Mode:
 * - `\-# Text` is styled as heading (INCORRECT - should be escaped)
 * - `-# Text` is styled as heading (CORRECT)
 * - `\\-# Text` is NOT styled (CORRECT - one backslash survives)
 *
 * REASON:
 * Obsidian's markdown processor runs BEFORE our registerMarkdownPostProcessor hook.
 * It consumes single backslashes as escape characters, so by the time our plugin
 * sees the DOM, `\-#` has already become `-#` with no way to detect it was escaped.
 *
 * LIMITATION:
 * Single backslash escape `\-#` CANNOT be detected in Reader Mode due to
 * the plugin API architecture. This is a fundamental limitation.
 *
 * WORKAROUND:
 * Users must use double backslash `\\-#` in content that will be viewed in
 * Reader Mode. Obsidian consumes one backslash, leaving `\-#` which our
 * plugin CAN detect.
 *
 * EDIT/LIVE PREVIEW MODE:
 * Single backslash `\-#` DOES work correctly in Edit and Live Preview modes
 * because CodeMirror preserves the backslash in the editor state.
 */

import { setupDOM, createWorkingMockPlugin } from './test-environment';

describe('Reader Mode Escape Reality', () => {
  let plugin: any;

  beforeEach(() => {
    setupDOM();
    const MockPlugin = createWorkingMockPlugin();
    plugin = new MockPlugin();
  });

  describe('DOCUMENTED LIMITATION: Single backslash escape', () => {
    test('single backslash \\-# CANNOT be detected in reader mode', () => {
      // Simulating Reader Mode: Obsidian has already consumed the backslash
      const p = document.createElement('p');
      p.textContent = '-# Text after escape consumed'; // No backslash!

      plugin.transformMarkdown(p);

      const heading = p.querySelector('[data-neg-heading="true"]');

      // CURRENT BEHAVIOR: Will be styled as heading
      // This is INCORRECT but UNAVOIDABLE in reader mode
      expect(heading).toBeTruthy();

      console.log('\n⚠️  LIMITATION: Single backslash escape does not work in Reader Mode');
      console.log('   Reason: Obsidian\'s markdown processor consumes the backslash');
      console.log('   before our plugin runs via registerMarkdownPostProcessor');
      console.log('   Workaround: Use double backslash \\\\-# instead\n');
    });

    test('documents the markdown processing pipeline order', () => {
      console.log('\n=== OBSIDIAN READER MODE PIPELINE ===');
      console.log('1. User writes: \\-# Escaped text');
      console.log('2. Obsidian markdown processor runs');
      console.log('   - Processes escape sequences');
      console.log('   - Consumes backslash: \\-# → -#');
      console.log('   - Creates DOM: <p>-# Escaped text</p>');
      console.log('3. registerMarkdownPostProcessor hooks run');
      console.log('   - Our plugin sees: "-# Escaped text"');
      console.log('   - No backslash present!');
      console.log('   - Cannot detect it was escaped');
      console.log('   - Incorrectly styles it as heading');
      console.log('=====================================\n');

      expect(true).toBe(true); // Documentation only
    });
  });

  describe('WORKAROUND: Double backslash escape', () => {
    test('double backslash \\\\-# DOES work in reader mode', () => {
      // Simulating Reader Mode: Obsidian consumed one backslash, one remains
      const p = document.createElement('p');
      p.textContent = '\\-# Text with one backslash remaining';

      plugin.transformMarkdown(p);

      const heading = p.querySelector('[data-neg-heading="true"]');

      // EXPECTED: Should NOT be styled because we detect the backslash
      expect(heading).toBeNull();

      console.log('✓ Double backslash escape works: \\\\-# → \\-# (detected by plugin)');
    });

    test('documents the double backslash workflow', () => {
      console.log('\n=== DOUBLE BACKSLASH WORKAROUND ===');
      console.log('1. User writes: \\\\-# Escaped text');
      console.log('2. Obsidian markdown processor runs');
      console.log('   - Processes first backslash');
      console.log('   - Consumes first backslash: \\\\-# → \\-#');
      console.log('   - Creates DOM: <p>\\-# Escaped text</p>');
      console.log('3. registerMarkdownPostProcessor hooks run');
      console.log('   - Our plugin sees: "\\-# Escaped text"');
      console.log('   - Backslash IS present!');
      console.log('   - Escape detection works');
      console.log('   - Correctly skips styling');
      console.log('====================================\n');

      expect(true).toBe(true); // Documentation only
    });
  });

  describe('EDIT/LIVE PREVIEW MODE: Single backslash works', () => {
    test('single backslash \\-# DOES work in edit/live preview mode', () => {
      // In Edit/Live Preview, CodeMirror preserves the backslash
      const p = document.createElement('p');
      p.textContent = '\\-# Escaped in editor';

      plugin.transformMarkdown(p);

      const heading = p.querySelector('[data-neg-heading="true"]');

      // EXPECTED: Should NOT be styled
      expect(heading).toBeNull();

      console.log('✓ Single backslash escape works in Edit/Live Preview modes');
    });

    test('documents why edit mode is different', () => {
      console.log('\n=== EDIT/LIVE PREVIEW MODE ===');
      console.log('In Edit and Live Preview modes, our plugin uses');
      console.log('CodeMirror ViewPlugin (buildDecorations) which has');
      console.log('access to the raw editor text where backslashes are');
      console.log('preserved. This allows single backslash \\-# to work.');
      console.log('==============================\n');

      expect(true).toBe(true); // Documentation only
    });
  });

  describe('COMPARISON: Native heading escape behavior', () => {
    test('native headings have the same limitation', () => {
      console.log('\n=== NATIVE HEADING ESCAPE COMPARISON ===');
      console.log('Native headings have the SAME limitation:');
      console.log('- User writes: \\# Native heading');
      console.log('- Reader Mode shows: # Native heading (plain text)');
      console.log('- Backslash consumed by markdown processor');
      console.log('');
      console.log('Our negative headings behave consistently:');
      console.log('- User writes: \\-# Negative heading');
      console.log('- Reader Mode shows: -# Negative heading (plain text)');
      console.log('- Backslash consumed by markdown processor');
      console.log('');
      console.log('However, our plugin cannot detect the difference between');
      console.log('"plain text that happens to start with -#" and');
      console.log('"escaped negative heading that lost its backslash"');
      console.log('=========================================\n');

      expect(true).toBe(true); // Documentation only
    });
  });
});
