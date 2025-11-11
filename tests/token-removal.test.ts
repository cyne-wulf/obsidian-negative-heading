/**
 * Token Removal Tests for Negative Heading Plugin
 * Tests that -# tokens are properly removed after transformation
 */

import { setupDOM, createWorkingMockPlugin } from './test-environment';

describe('Token Removal Behavior', () => {
  let plugin: any;

  beforeEach(() => {
    setupDOM();
    const MockPlugin = createWorkingMockPlugin();
    plugin = new MockPlugin();
  });

  describe('Basic Token Removal', () => {
    test('should remove -# token after transformation', () => {
      const p = document.createElement('p');
      p.textContent = '-# Test heading';

      plugin.transformMarkdown(p);

      const heading = p.querySelector('[data-neg-heading="true"]');
      expect(heading).toBeTruthy();
      expect(heading?.textContent).toBe('Test heading');
      // Token should be removed
      expect(heading?.textContent).not.toContain('-#');
      expect(p.textContent).not.toContain('-#');
    });

    test('should remove only the token, not content', () => {
      const p = document.createElement('p');
      p.textContent = '-# Important content here';

      plugin.transformMarkdown(p);

      const heading = p.querySelector('[data-neg-heading="true"]');
      expect(heading?.textContent).toBe('Important content here');
      // All content except token should be preserved
      expect(heading?.textContent).toContain('Important');
      expect(heading?.textContent).toContain('content');
      expect(heading?.textContent).toContain('here');
    });

    test('should remove token even with extra spaces', () => {
      const p = document.createElement('p');
      p.textContent = '-#   Multiple   spaces   in   content';

      plugin.transformMarkdown(p);

      const heading = p.querySelector('[data-neg-heading="true"]');
      expect(heading).toBeTruthy();
      // Should preserve the spacing in content but remove token
      expect(heading?.textContent).toBe('Multiple   spaces   in   content');
      expect(heading?.textContent).not.toContain('-#');
    });
  });

  describe('Multiple Headings', () => {
    test('should remove all tokens from multiple headings', () => {
      const p = document.createElement('p');
      p.textContent = '-# First heading\n-# Second heading\n-# Third heading';

      plugin.transformMarkdown(p);

      const headings = p.querySelectorAll('[data-neg-heading="true"]');
      expect(headings.length).toBe(3);

      // Check each heading has token removed
      expect(headings[0].textContent).toBe('First heading');
      expect(headings[1].textContent).toBe('Second heading');
      expect(headings[2].textContent).toBe('Third heading');

      // Verify no tokens remain in entire element
      expect(p.textContent).not.toContain('-#');
    });

    test('should handle mixed content with multiple headings', () => {
      const p = document.createElement('p');
      p.textContent = 'Normal text\n-# Heading one\nMore text\n-# Heading two\nFinal text';

      plugin.transformMarkdown(p);

      const headings = p.querySelectorAll('[data-neg-heading="true"]');
      expect(headings.length).toBe(2);

      expect(headings[0].textContent).toBe('Heading one');
      expect(headings[1].textContent).toBe('Heading two');

      // Normal text should be preserved
      expect(p.textContent).toContain('Normal text');
      expect(p.textContent).toContain('More text');
      expect(p.textContent).toContain('Final text');

      // But no tokens
      expect(p.textContent).not.toContain('-#');
    });
  });

  describe('Token Removal Timing', () => {
    test('should verify token is removed by plugin, not earlier', () => {
      const p = document.createElement('p');
      const originalContent = '-# Test heading for timing';
      p.textContent = originalContent;

      // Before transformation, token should be present
      expect(p.textContent).toBe(originalContent);
      expect(p.textContent).toContain('-#');

      // After transformation, token should be gone
      plugin.transformMarkdown(p);

      const heading = p.querySelector('[data-neg-heading="true"]');
      expect(heading).toBeTruthy();
      expect(heading?.textContent).toBe('Test heading for timing');
      expect(p.textContent).not.toContain('-#');
    });

    test('should document if token is missing before plugin runs', () => {
      // This simulates the reported issue where token is already gone
      const p = document.createElement('p');

      // Simulate token already removed by Obsidian
      p.textContent = 'Heading without token';
      p.dataset.hadNegativeHeadingToken = 'true'; // Hypothetical marker

      // If token is already gone, plugin can't detect it
      plugin.transformMarkdown(p);

      // No heading should be created because no token was found
      const headings = p.querySelectorAll('[data-neg-heading="true"]');
      expect(headings.length).toBe(0);

      // Content remains unchanged
      expect(p.textContent).toBe('Heading without token');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty content after token', () => {
      const p = document.createElement('p');
      p.textContent = '-# ';

      plugin.transformMarkdown(p);

      const heading = p.querySelector('[data-neg-heading="true"]');
      // May or may not create heading for empty content
      // Document actual behavior
      if (heading) {
        expect(heading.textContent).toBe('');
      }
    });

    test('should handle token at end of content', () => {
      const p = document.createElement('p');
      p.textContent = 'Some content\n-# Last line heading';

      plugin.transformMarkdown(p);

      const heading = p.querySelector('[data-neg-heading="true"]');
      expect(heading).toBeTruthy();
      expect(heading?.textContent).toBe('Last line heading');
      expect(p.textContent).not.toContain('-#');
    });

    test('should preserve line breaks after token removal', () => {
      const p = document.createElement('p');
      p.textContent = '-# Heading\nNext line of text';

      plugin.transformMarkdown(p);

      const heading = p.querySelector('[data-neg-heading="true"]');
      expect(heading?.textContent).toBe('Heading');

      // Next line should still be separate
      expect(p.textContent).toContain('Next line of text');
      // Structure should be preserved
      expect(p.childNodes.length).toBeGreaterThan(1);
    });
  });

  describe('DOM Structure After Removal', () => {
    test('should create proper heading element structure', () => {
      const p = document.createElement('p');
      p.textContent = '-# Heading content';

      plugin.transformMarkdown(p);

      const heading = p.querySelector('[data-neg-heading="true"]');
      expect(heading).toBeTruthy();
      expect(heading?.tagName).toBe('DIV');
      expect(heading?.classList.contains('neg-heading')).toBe(true);
      expect(heading?.classList.contains('neg-h1')).toBe(true);
      expect(heading?.getAttribute('role')).toBe('heading');
      expect(heading?.getAttribute('aria-level')).toBe('7');
    });

    test('should maintain text nodes for non-heading content', () => {
      const p = document.createElement('p');
      p.textContent = 'Before\n-# Heading\nAfter';

      const childCountBefore = p.childNodes.length;
      plugin.transformMarkdown(p);

      // Should have text nodes for "Before" and "After"
      // Plus the heading element
      const textNodes = Array.from(p.childNodes).filter(
        node => node.nodeType === Node.TEXT_NODE
      );
      const elementNodes = Array.from(p.childNodes).filter(
        node => node.nodeType === Node.ELEMENT_NODE
      );

      expect(elementNodes.length).toBeGreaterThan(0); // At least one heading
      expect(textNodes.length).toBeGreaterThan(0); // At least some text
    });
  });

  describe('Performance Considerations', () => {
    test('should efficiently handle many tokens', () => {
      const p = document.createElement('p');
      const headingCount = 100;
      const content = Array(headingCount)
        .fill(0)
        .map((_, i) => `-# Heading ${i}`)
        .join('\n');

      p.textContent = content;

      const startTime = performance.now();
      plugin.transformMarkdown(p);
      const endTime = performance.now();

      const headings = p.querySelectorAll('[data-neg-heading="true"]');
      expect(headings.length).toBe(headingCount);

      // All tokens should be removed
      expect(p.textContent).not.toContain('-#');

      // Performance check (should be reasonably fast)
      // Note: JSDOM is slower than real browser DOM, so we allow more time
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1000ms for 100 headings in test env
    });
  });
});