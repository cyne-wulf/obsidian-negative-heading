/**
 * Reader Mode Escape Detection with Source Access
 *
 * Tests that escape character detection works in reader mode by accessing
 * the original markdown source via MarkdownPostProcessorContext.getSectionInfo()
 */

import { setupDOM, createWorkingMockPlugin } from './test-environment';

describe('Reader Mode Escape with Source Access', () => {
  let plugin: any;

  beforeEach(() => {
    setupDOM();
    const MockPlugin = createWorkingMockPlugin();
    plugin = new MockPlugin();
  });

  describe('Source-based escape detection', () => {
    test('single backslash \\-# SHOULD work when source is available', () => {
      // Simulate Reader Mode: DOM has processed content (backslash consumed)
      const p = document.createElement('p');
      p.textContent = '-# Escaped text'; // No backslash in DOM!

      // Mock context with source information
      const mockCtx = {
        getSectionInfo: (el: HTMLElement) => {
          if (el === p) {
            return {
              text: '\\-# Escaped text\n-# Normal heading',
              lineStart: 0,
              lineEnd: 1
            };
          }
          return null;
        }
      };

      plugin.transformMarkdown(p, mockCtx);

      const heading = p.querySelector('[data-neg-heading="true"]');

      // EXPECTED: Should NOT be styled because we detected escape in source
      expect(heading).toBeNull();
      console.log('✓ Source-based escape detection works: \\-# detected from source');
    });

    test('unescaped -# SHOULD be styled even with source context', () => {
      const p = document.createElement('p');
      p.textContent = '-# Normal heading';

      // Mock context with source showing NO escape
      const mockCtx = {
        getSectionInfo: (el: HTMLElement) => {
          if (el === p) {
            return {
              text: '-# Normal heading',
              lineStart: 0,
              lineEnd: 0
            };
          }
          return null;
        }
      };

      plugin.transformMarkdown(p, mockCtx);

      const heading = p.querySelector('[data-neg-heading="true"]');

      // EXPECTED: Should be styled (no escape in source)
      expect(heading).toBeTruthy();
      expect(heading?.textContent).toBe('Normal heading');
    });

    test('multiple lines: escaped and unescaped mixed', () => {
      const container = document.createElement('div');

      const p1 = document.createElement('p');
      p1.textContent = '-# Escaped line'; // Will be escaped in source
      container.appendChild(p1);

      const p2 = document.createElement('p');
      p2.textContent = '-# Normal line'; // Will not be escaped in source
      container.appendChild(p2);

      // Mock context with mixed source
      const mockCtx = {
        getSectionInfo: (el: HTMLElement) => {
          if (el === p1) {
            return {
              text: '\\-# Escaped line\n-# Normal line',
              lineStart: 0,
              lineEnd: 0
            };
          }
          if (el === p2) {
            return {
              text: '\\-# Escaped line\n-# Normal line',
              lineStart: 1,
              lineEnd: 1
            };
          }
          return null;
        }
      };

      plugin.transformMarkdown(container, mockCtx);

      // Check first paragraph (escaped in source)
      const heading1 = p1.querySelector('[data-neg-heading="true"]');
      expect(heading1).toBeNull(); // Should NOT be styled

      // Check second paragraph (not escaped in source)
      const heading2 = p2.querySelector('[data-neg-heading="true"]');
      expect(heading2).toBeTruthy(); // Should be styled
      expect(heading2?.textContent).toBe('Normal line');
    });

    test('fallback to DOM-based processing when getSectionInfo returns null', () => {
      const p = document.createElement('p');
      p.textContent = '\\-# Text with backslash preserved';

      // Mock context that returns null (source not available)
      const mockCtx = {
        getSectionInfo: (el: HTMLElement) => null
      };

      plugin.transformMarkdown(p, mockCtx);

      const heading = p.querySelector('[data-neg-heading="true"]');

      // EXPECTED: Should fall back to DOM-based escape detection
      // Since the backslash IS in the textContent, it should be detected
      expect(heading).toBeNull();
      console.log('✓ Falls back to DOM-based detection when source unavailable');
    });

    test('works without context (backwards compatibility)', () => {
      const p = document.createElement('p');
      p.textContent = '\\-# Text with backslash';

      // No context provided
      plugin.transformMarkdown(p);

      const heading = p.querySelector('[data-neg-heading="true"]');

      // EXPECTED: Should use DOM-based escape detection
      expect(heading).toBeNull();
      console.log('✓ Works without context (backwards compatible)');
    });
  });

  describe('Source line boundary handling', () => {
    test('multi-line block with escape on first line', () => {
      const p = document.createElement('p');
      p.textContent = '-# First line\nSecond line\nThird line';

      const mockCtx = {
        getSectionInfo: (el: HTMLElement) => {
          if (el === p) {
            return {
              text: '\\-# First line\nSecond line\nThird line',
              lineStart: 0,
              lineEnd: 2
            };
          }
          return null;
        }
      };

      plugin.transformMarkdown(p, mockCtx);

      const heading = p.querySelector('[data-neg-heading="true"]');
      expect(heading).toBeNull();
    });

    test('handles line boundaries correctly', () => {
      const p = document.createElement('p');
      p.textContent = '-# Line 3 content';

      const mockCtx = {
        getSectionInfo: (el: HTMLElement) => {
          if (el === p) {
            return {
              text: 'Line 1\nLine 2\n\\-# Line 3 content',
              lineStart: 2, // This paragraph starts at line 2 (0-indexed)
              lineEnd: 2
            };
          }
          return null;
        }
      };

      plugin.transformMarkdown(p, mockCtx);

      const heading = p.querySelector('[data-neg-heading="true"]');
      expect(heading).toBeNull();
      console.log('✓ Correctly handles line boundaries in source');
    });
  });

  describe('Content matching verification', () => {
    test('verifies content matches to avoid false positives', () => {
      const p = document.createElement('p');
      p.textContent = '-# Different content';

      // Source has escaped heading but with DIFFERENT content
      const mockCtx = {
        getSectionInfo: (el: HTMLElement) => {
          if (el === p) {
            return {
              text: '\\-# Wrong content\n-# Different content',
              lineStart: 1,
              lineEnd: 1
            };
          }
          return null;
        }
      };

      plugin.transformMarkdown(p, mockCtx);

      const heading = p.querySelector('[data-neg-heading="true"]');

      // EXPECTED: Should be styled because the escaped line doesn't match this block
      expect(heading).toBeTruthy();
      console.log('✓ Content matching prevents false positives');
    });
  });
});
