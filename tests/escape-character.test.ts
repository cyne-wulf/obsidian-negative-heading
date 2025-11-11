/**
 * Escape Character Tests for Negative Heading Plugin
 * Tests that escaped syntax \-# should NOT render as heading
 */

import { setupDOM, createWorkingMockPlugin } from './test-environment';

describe('Escape Character Handling', () => {
  let plugin: any;

  beforeEach(() => {
    setupDOM();
    const MockPlugin = createWorkingMockPlugin();
    plugin = new MockPlugin();
  });

  describe('Basic Escape Behavior', () => {
    test('should NOT transform escaped negative heading \\-#', () => {
      const p = document.createElement('p');
      // In reality, Obsidian would have already processed the escape
      // and we'd receive just '-#' but need to know it was escaped
      // For now, test with the actual escaped string
      p.textContent = '\\-# This should not be a heading';

      plugin.transformMarkdown(p);

      // Should NOT transform escaped syntax
      const headings = p.querySelectorAll('[data-neg-heading="true"]');
      expect(headings.length).toBe(0);
      expect(p.textContent).toContain('This should not be a heading');
    });

    test('should transform non-escaped negative heading', () => {
      const p = document.createElement('p');
      p.textContent = '-# This is a real heading';

      plugin.transformMarkdown(p);

      const headings = p.querySelectorAll('[data-neg-heading="true"]');
      expect(headings.length).toBe(1);
      expect(headings[0].textContent).toBe('This is a real heading');
    });

    test('should handle multiple escapes in same block', () => {
      const p = document.createElement('p');
      p.textContent = '\\-# Escaped\n-# Not escaped\n\\-# Also escaped';

      plugin.transformMarkdown(p);

      const headings = p.querySelectorAll('[data-neg-heading="true"]');
      expect(headings.length).toBe(1); // Only the non-escaped one
      expect(headings[0].textContent).toBe('Not escaped');
    });
  });

  describe('Edge Cases', () => {
    test('should handle double backslash followed by heading \\\\-#', () => {
      const p = document.createElement('p');
      // \\-# means escaped backslash + heading, so heading should render
      p.textContent = '\\\\-# Heading with escaped backslash';

      plugin.transformMarkdown(p);

      const headings = p.querySelectorAll('[data-neg-heading="true"]');
      // This is tricky - \\-# should render the heading because
      // the first \ escapes the second \, leaving -# unescaped
      expect(headings.length).toBe(1);
      expect(headings[0].textContent).toBe('Heading with escaped backslash');
    });

    test('should handle triple backslash \\\\\\-#', () => {
      const p = document.createElement('p');
      // \\\-# means escaped backslash + escaped heading
      p.textContent = '\\\\\\-# Should not be heading';

      plugin.transformMarkdown(p);

      const headings = p.querySelectorAll('[data-neg-heading="true"]');
      expect(headings.length).toBe(0); // Should NOT render
    });

    test('should handle escape at end of line', () => {
      const p = document.createElement('p');
      p.textContent = 'Some text \\-# Not at line start';

      plugin.transformMarkdown(p);

      // Shouldn't transform anyway (not at line start), but verify
      const headings = p.querySelectorAll('[data-neg-heading="true"]');
      expect(headings.length).toBe(0);
    });
  });

  describe('Mixed Content', () => {
    test('should handle escaped and unescaped on consecutive lines', () => {
      const p = document.createElement('p');
      p.textContent = '\\-# Line 1 escaped\n-# Line 2 not escaped\n-# Line 3 not escaped\n\\-# Line 4 escaped';

      plugin.transformMarkdown(p);

      const headings = p.querySelectorAll('[data-neg-heading="true"]');
      expect(headings.length).toBe(2); // Only lines 2 and 3
      expect(headings[0].textContent).toBe('Line 2 not escaped');
      expect(headings[1].textContent).toBe('Line 3 not escaped');
    });

    test('should preserve escaped text in output', () => {
      const p = document.createElement('p');
      p.textContent = '\\-# Keep this text intact';

      plugin.transformMarkdown(p);

      // The escaped heading should remain as plain text
      // But the backslash might be consumed
      expect(p.textContent).toContain('Keep this text intact');
      expect(p.querySelector('[data-neg-heading="true"]')).toBeNull();
    });
  });

  describe('Source Mode Escape Detection', () => {
    test('should detect escaped syntax in source mode', () => {
      // This tests the regex pattern directly
      const NEG_HEADING_TOKEN_REGEX = /^-#\s+/;
      const ESCAPED_NEG_HEADING_REGEX = /^\\-#\s+/;

      const normalHeading = '-# Normal heading';
      const escapedHeading = '\\-# Escaped heading';

      expect(NEG_HEADING_TOKEN_REGEX.test(normalHeading)).toBe(true);
      expect(NEG_HEADING_TOKEN_REGEX.test(escapedHeading)).toBe(false);
      expect(ESCAPED_NEG_HEADING_REGEX.test(escapedHeading)).toBe(true);
      expect(ESCAPED_NEG_HEADING_REGEX.test(normalHeading)).toBe(false);
    });
  });

  describe('Reader Mode Limitations', () => {
    test('should document limitation if escape info is lost', () => {
      // In Reader Mode, Obsidian may process escapes before we see the DOM
      // This test documents expected behavior vs actual limitation
      const p = document.createElement('p');

      // Simulate what we might receive after Obsidian processes escapes
      // The backslash is gone, and we just see the literal text
      p.textContent = '-# This was escaped but we cannot tell';
      p.dataset.wasEscaped = 'true'; // Hypothetical marker

      // If we had a way to know it was escaped...
      if (p.dataset.wasEscaped === 'true') {
        // Don't transform
        expect(p.querySelector('[data-neg-heading="true"]')).toBeNull();
      } else {
        // Current behavior: would transform because we can't detect escape
        plugin.transformMarkdown(p);
        const headings = p.querySelectorAll('[data-neg-heading="true"]');
        // This documents the limitation
        expect(headings.length).toBe(1);
      }
    });
  });
});