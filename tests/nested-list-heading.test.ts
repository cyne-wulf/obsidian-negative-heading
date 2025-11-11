/**
 * Nested List Heading Tests
 *
 * PURPOSE: Verify that headings with nested list content are extracted correctly
 * and don't include block-level children in the heading content.
 *
 * ISSUE: Previously, findLineEnd() would descend into <ul> elements, causing
 * headings to incorrectly include nested lists as children instead of siblings.
 */

import { setupDOM, createWorkingMockPlugin } from './test-environment';

describe('Nested List Heading Tests', () => {
  let plugin: any;

  beforeEach(() => {
    setupDOM();
    const MockPlugin = createWorkingMockPlugin();
    plugin = new MockPlugin();
  });

  describe('Heading with nested list content', () => {
    test('heading with nested UL should not include UL in heading content', () => {
      // Simulate Obsidian's reader mode DOM structure for:
      // - -# Parent heading
      //   - Child item
      const li = document.createElement('li');
      const text = document.createTextNode('-# Parent heading\n');
      const ul = document.createElement('ul');
      const childLi = document.createElement('li');
      childLi.textContent = 'Child item';
      ul.appendChild(childLi);
      li.appendChild(text);
      li.appendChild(ul);

      plugin.transformMarkdown(li);

      const heading = li.querySelector('[data-neg-heading="true"]');
      const nestedUl = li.querySelector('ul');

      // Heading should exist
      expect(heading).toBeTruthy();
      expect(heading?.textContent).toBe('Parent heading');

      // CRITICAL: UL should be SIBLING of heading, not child
      expect(heading?.contains(nestedUl)).toBe(false);

      // UL should still be in the LI
      expect(nestedUl?.parentElement).toBe(li);

      // LI should have both heading and UL as children
      const headingIndex = Array.from(li.children).indexOf(heading!);
      const ulIndex = Array.from(li.children).indexOf(nestedUl!);

      expect(headingIndex).toBeGreaterThanOrEqual(0);
      expect(ulIndex).toBeGreaterThanOrEqual(0);
      expect(headingIndex).not.toBe(ulIndex);

      console.log('✓ Heading and nested list are siblings, not parent-child');
    });

    test('deeply nested list structure', () => {
      // Simulate:
      // - -# Level 1
      //   - -# Level 2
      //     - -# Level 3
      const ul1 = document.createElement('ul');
      const li1 = document.createElement('li');
      li1.appendChild(document.createTextNode('-# Level 1\n'));

      const ul2 = document.createElement('ul');
      const li2 = document.createElement('li');
      li2.appendChild(document.createTextNode('-# Level 2\n'));

      const ul3 = document.createElement('ul');
      const li3 = document.createElement('li');
      li3.appendChild(document.createTextNode('-# Level 3'));

      ul3.appendChild(li3);
      li2.appendChild(ul3);
      ul2.appendChild(li2);
      li1.appendChild(ul2);
      ul1.appendChild(li1);

      plugin.transformMarkdown(ul1);

      const headings = ul1.querySelectorAll('[data-neg-heading="true"]');

      expect(headings.length).toBe(3);
      expect(headings[0].textContent).toBe('Level 1');
      expect(headings[1].textContent).toBe('Level 2');
      expect(headings[2].textContent).toBe('Level 3');

      // Verify none of the headings contain UL elements
      headings.forEach((heading, i) => {
        const containsUl = heading.querySelector('ul') !== null;
        if (containsUl) {
          console.error(`❌ Level ${i + 1} heading contains nested UL (should be sibling)`);
        }
        expect(containsUl).toBe(false);
      });

      console.log('✓ All nested headings correctly exclude nested lists from content');
    });

    test('heading followed by multiple siblings', () => {
      // Simulate:
      // - -# Parent
      //   - Child 1
      //   - Child 2
      //   - Child 3
      const li = document.createElement('li');
      li.appendChild(document.createTextNode('-# Parent\n'));

      const ul = document.createElement('ul');
      for (let i = 1; i <= 3; i++) {
        const childLi = document.createElement('li');
        childLi.textContent = `Child ${i}`;
        ul.appendChild(childLi);
      }
      li.appendChild(ul);

      plugin.transformMarkdown(li);

      const heading = li.querySelector('[data-neg-heading="true"]');
      const childItems = ul.querySelectorAll('li');

      expect(heading).toBeTruthy();
      expect(heading?.textContent).toBe('Parent');
      expect(childItems.length).toBe(3);

      // Heading should not contain any of the child items
      expect(heading?.contains(childItems[0])).toBe(false);
      expect(heading?.contains(childItems[1])).toBe(false);
      expect(heading?.contains(childItems[2])).toBe(false);

      console.log('✓ Heading with multiple nested children extracted correctly');
    });

    test('mixed content: heading with text and nested list', () => {
      // Simulate:
      // - -# Parent heading with some text
      //   - Child item
      const li = document.createElement('li');
      const text = document.createTextNode('-# Parent heading with some text\n');
      const ul = document.createElement('ul');
      const childLi = document.createElement('li');
      childLi.textContent = 'Child item';
      ul.appendChild(childLi);
      li.appendChild(text);
      li.appendChild(ul);

      plugin.transformMarkdown(li);

      const heading = li.querySelector('[data-neg-heading="true"]');

      expect(heading).toBeTruthy();
      expect(heading?.textContent).toBe('Parent heading with some text');

      // Verify text content is fully captured
      expect(heading?.textContent?.includes('some text')).toBe(true);

      // But not the nested list
      expect(heading?.textContent?.includes('Child item')).toBe(false);
      expect(heading?.contains(ul)).toBe(false);

      console.log('✓ Full heading text extracted without nested list content');
    });
  });

  describe('Headings with other block-level elements', () => {
    test('heading followed by blockquote should stop extraction', () => {
      const li = document.createElement('li');
      const text = document.createTextNode('-# Heading\n');
      const blockquote = document.createElement('blockquote');
      blockquote.textContent = 'Quote content';
      li.appendChild(text);
      li.appendChild(blockquote);

      plugin.transformMarkdown(li);

      const heading = li.querySelector('[data-neg-heading="true"]');

      expect(heading).toBeTruthy();
      expect(heading?.textContent).toBe('Heading');
      expect(heading?.contains(blockquote)).toBe(false);

      console.log('✓ Heading stops before blockquote element');
    });

    test('heading followed by table should stop extraction', () => {
      const li = document.createElement('li');
      const text = document.createTextNode('-# Heading\n');
      const table = document.createElement('table');
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.textContent = 'Cell';
      tr.appendChild(td);
      table.appendChild(tr);
      li.appendChild(text);
      li.appendChild(table);

      plugin.transformMarkdown(li);

      const heading = li.querySelector('[data-neg-heading="true"]');

      expect(heading).toBeTruthy();
      expect(heading?.textContent).toBe('Heading');
      expect(heading?.contains(table)).toBe(false);

      console.log('✓ Heading stops before table element');
    });

    test('heading followed by pre should stop extraction', () => {
      const li = document.createElement('li');
      const text = document.createTextNode('-# Heading\n');
      const pre = document.createElement('pre');
      pre.textContent = 'code block';
      li.appendChild(text);
      li.appendChild(pre);

      plugin.transformMarkdown(li);

      const heading = li.querySelector('[data-neg-heading="true"]');

      expect(heading).toBeTruthy();
      expect(heading?.textContent).toBe('Heading');
      expect(heading?.contains(pre)).toBe(false);

      console.log('✓ Heading stops before pre element');
    });
  });

  describe('Regression tests - ensure non-nested cases still work', () => {
    test('simple heading without nested content', () => {
      const li = document.createElement('li');
      li.textContent = '-# Simple heading';

      plugin.transformMarkdown(li);

      const heading = li.querySelector('[data-neg-heading="true"]');

      expect(heading).toBeTruthy();
      expect(heading?.textContent).toBe('Simple heading');

      console.log('✓ Simple headings still work correctly');
    });

    test('heading with inline elements (not block)', () => {
      const li = document.createElement('li');
      const text = document.createTextNode('-# Heading with ');
      const em = document.createElement('em');
      em.textContent = 'emphasis';
      li.appendChild(text);
      li.appendChild(em);

      plugin.transformMarkdown(li);

      const heading = li.querySelector('[data-neg-heading="true"]');

      expect(heading).toBeTruthy();
      // Inline elements should be included in heading
      expect(heading?.textContent).toContain('Heading with');
      expect(heading?.querySelector('em')).toBeTruthy();

      console.log('✓ Heading correctly includes inline elements');
    });
  });
});
