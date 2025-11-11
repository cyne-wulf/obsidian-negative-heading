/**
 * Admonition/Callout Tests for Negative Heading Plugin
 * Tests behavior inside callout blocks (> [!note] style blocks)
 *
 * PRINCIPLE: Negative headings should work wherever native headings work.
 * Native headings DO render inside callouts, so negative headings should too.
 */

import { setupDOM, createWorkingMockPlugin } from './test-environment';

describe('Admonition/Callout Handling', () => {
  let plugin: any;

  beforeEach(() => {
    setupDOM();
    const MockPlugin = createWorkingMockPlugin();
    plugin = new MockPlugin();
  });

  describe('Callouts SHOULD Render (Matching Native Behavior)', () => {
    test('SHOULD transform negative heading inside .callout', () => {
      const callout = document.createElement('div');
      callout.className = 'callout';
      const p = document.createElement('p');
      p.textContent = '-# Heading inside callout';
      callout.appendChild(p);

      plugin.transformMarkdown(callout);

      // Callouts are NOT in DISALLOWED_CONTAINER_SELECTOR (matches native headings)
      // So headings SHOULD transform
      const headings = callout.querySelectorAll('[data-neg-heading="true"]');
      expect(headings.length).toBe(1);
      expect(headings[0].textContent).toBe('Heading inside callout');
    });

    test('SHOULD transform when paragraph is nested in callout', () => {
      const container = document.createElement('div');
      const callout = document.createElement('div');
      callout.className = 'callout';
      const content = document.createElement('div');
      content.className = 'callout-content';
      const p = document.createElement('p');
      p.textContent = '-# Nested in callout structure';

      content.appendChild(p);
      callout.appendChild(content);
      container.appendChild(callout);

      plugin.transformMarkdown(container);

      const headings = container.querySelectorAll('[data-neg-heading="true"]');
      expect(headings.length).toBe(1);
      expect(headings[0].textContent).toBe('Nested in callout structure');
    });

    test('SHOULD transform in different callout types', () => {
      const calloutTypes = ['callout-note', 'callout-warning', 'callout-info', 'callout-tip'];

      calloutTypes.forEach(calloutType => {
        const callout = document.createElement('div');
        callout.className = `callout ${calloutType}`;
        const p = document.createElement('p');
        p.textContent = '-# Heading in ' + calloutType;
        callout.appendChild(p);

        plugin.transformMarkdown(callout);

        const headings = callout.querySelectorAll('[data-neg-heading="true"]');
        expect(headings.length).toBe(1);
        expect(headings[0].textContent).toContain('Heading in');
      });
    });
  });

  describe('Mixed Content with Callouts', () => {
    test('should transform headings before, inside, and after callout', () => {
      const container = document.createElement('div');

      // Before callout
      const p1 = document.createElement('p');
      p1.textContent = '-# Before callout';
      container.appendChild(p1);

      // Inside callout
      const callout = document.createElement('div');
      callout.className = 'callout';
      const p2 = document.createElement('p');
      p2.textContent = '-# Inside callout';
      callout.appendChild(p2);
      container.appendChild(callout);

      // After callout
      const p3 = document.createElement('p');
      p3.textContent = '-# After callout';
      container.appendChild(p3);

      plugin.transformMarkdown(container);

      // All three should transform
      const headingBefore = p1.querySelector('[data-neg-heading="true"]');
      expect(headingBefore).toBeTruthy();
      expect(headingBefore?.textContent).toBe('Before callout');

      const headingInside = p2.querySelector('[data-neg-heading="true"]');
      expect(headingInside).toBeTruthy();
      expect(headingInside?.textContent).toBe('Inside callout');

      const headingAfter = p3.querySelector('[data-neg-heading="true"]');
      expect(headingAfter).toBeTruthy();
      expect(headingAfter?.textContent).toBe('After callout');
    });

    test('should handle multiple headings in mixed content', () => {
      const container = document.createElement('div');

      // Before callout
      const p1 = document.createElement('p');
      p1.textContent = '-# First heading';
      container.appendChild(p1);

      // Callout with heading
      const callout = document.createElement('div');
      callout.className = 'callout';
      const p2 = document.createElement('p');
      p2.textContent = '-# Inside callout\nMore callout content';
      callout.appendChild(p2);
      container.appendChild(callout);

      // After callout - multiple headings
      const p3 = document.createElement('p');
      p3.textContent = '-# Second heading\n-# Third heading';
      container.appendChild(p3);

      plugin.transformMarkdown(container);

      const allHeadings = container.querySelectorAll('[data-neg-heading="true"]');
      expect(allHeadings.length).toBe(4); // First, Inside, Second, Third

      // Verify each one
      expect(p1.querySelector('[data-neg-heading="true"]')?.textContent).toBe('First heading');
      expect(p2.querySelector('[data-neg-heading="true"]')?.textContent).toBe('Inside callout');

      const p3Headings = p3.querySelectorAll('[data-neg-heading="true"]');
      expect(p3Headings.length).toBe(2);
      expect(p3Headings[0].textContent).toBe('Second heading');
      expect(p3Headings[1].textContent).toBe('Third heading');
    });
  });

  describe('Obsidian Callout Structure', () => {
    test('should handle actual Obsidian callout DOM structure', () => {
      // Simulate realistic Obsidian callout structure
      const container = document.createElement('div');
      container.className = 'markdown-preview-section';

      const callout = document.createElement('div');
      callout.className = 'callout';
      callout.setAttribute('data-callout', 'note');

      const calloutTitle = document.createElement('div');
      calloutTitle.className = 'callout-title';
      const titleContent = document.createElement('div');
      titleContent.className = 'callout-title-inner';
      titleContent.textContent = 'Note';
      calloutTitle.appendChild(titleContent);

      const calloutContent = document.createElement('div');
      calloutContent.className = 'callout-content';
      const p = document.createElement('p');
      p.textContent = '-# This is inside the callout';
      calloutContent.appendChild(p);

      callout.appendChild(calloutTitle);
      callout.appendChild(calloutContent);
      container.appendChild(callout);

      plugin.transformMarkdown(container);

      // SHOULD transform inside callout structure (matching native headings)
      const headings = container.querySelectorAll('[data-neg-heading="true"]');
      expect(headings.length).toBe(1);
      expect(headings[0].textContent).toBe('This is inside the callout');
    });

    test('should handle nested callouts', () => {
      const outer = document.createElement('div');
      outer.className = 'callout';

      const inner = document.createElement('div');
      inner.className = 'callout';

      const p = document.createElement('p');
      p.textContent = '-# Nested callout heading';

      inner.appendChild(p);
      outer.appendChild(inner);

      plugin.transformMarkdown(outer);

      // SHOULD transform in nested callouts (matching native headings)
      const headings = outer.querySelectorAll('[data-neg-heading="true"]');
      expect(headings.length).toBe(1);
      expect(headings[0].textContent).toBe('Nested callout heading');
    });
  });
});
