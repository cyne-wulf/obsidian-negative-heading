/**
 * List Item Behavior Probes
 *
 * PURPOSE: Investigate how native headings behave inside list items
 * and establish expected behavior for negative headings.
 *
 * ISSUE: Negative headings in lists currently:
 * - Edit mode: Don't get styled
 * - Reader mode: Render on separate line below bullet (broken display)
 */

import { setupDOM, createWorkingMockPlugin } from './test-environment';

describe('List Item Behavior Probes', () => {
  let plugin: any;

  beforeEach(() => {
    setupDOM();
    const MockPlugin = createWorkingMockPlugin();
    plugin = new MockPlugin();
  });

  describe('PROBE: Native heading behavior in list items', () => {
    test('probe: native H1 is a valid element inside LI', () => {
      const li = document.createElement('li');
      const h1 = document.createElement('h1');
      h1.textContent = 'Native heading in list';
      li.appendChild(h1);

      // Probe: Is this valid HTML?
      expect(li.querySelector('h1')).toBeTruthy();
      expect(li.querySelector('h1')?.textContent).toBe('Native heading in list');

      console.log('✓ Native H1 is valid inside LI element');
    });

    test('probe: block vs inline elements in list items', () => {
      const li1 = document.createElement('li');
      const div = document.createElement('div');
      div.textContent = 'Block element';
      li1.appendChild(div);

      const li2 = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = 'Inline element';
      li2.appendChild(span);

      console.log('\n=== BLOCK VS INLINE IN LIST ITEMS ===');
      console.log('DIV in LI:', {
        tagName: div.tagName,
        defaultDisplay: 'block', // divs are block by default
        visualEffect: 'Renders on new line below bullet'
      });
      console.log('SPAN in LI:', {
        tagName: span.tagName,
        defaultDisplay: 'inline',
        visualEffect: 'Renders inline with bullet'
      });
      console.log('======================================\n');

      // Document finding
      expect(div.tagName).toBe('DIV');
      expect(span.tagName).toBe('SPAN');
    });

    test('probe: nested list structure', () => {
      const ul = document.createElement('ul');
      const li1 = document.createElement('li');
      li1.textContent = 'Level 1';

      const ul2 = document.createElement('ul');
      const li2 = document.createElement('li');
      const h2 = document.createElement('h2');
      h2.textContent = 'Level 2 heading';
      li2.appendChild(h2);

      ul2.appendChild(li2);
      li1.appendChild(ul2);
      ul.appendChild(li1);

      // Probe: Does native heading work in nested list?
      const nestedHeading = ul.querySelector('li ul li h2');
      expect(nestedHeading).toBeTruthy();
      expect(nestedHeading?.textContent).toBe('Level 2 heading');

      console.log('✓ Native headings work in nested lists');
    });

    test('probe: list item with paragraph wrapper', () => {
      // Common Obsidian structure: <li><p>content</p></li>
      const li = document.createElement('li');
      const p = document.createElement('p');
      p.textContent = '-# Negative heading';
      li.appendChild(p);

      expect(li.querySelector('p')).toBeTruthy();
      expect(li.textContent).toBe('-# Negative heading');

      console.log('✓ List items can contain paragraph elements');
    });
  });

  describe('CURRENT BEHAVIOR: Negative headings in lists (FAILING)', () => {
    test('simple list item with negative heading', () => {
      const li = document.createElement('li');
      li.textContent = '-# Heading in list';

      plugin.transformMarkdown(li);

      const heading = li.querySelector('[data-neg-heading="true"]');

      if (!heading) {
        console.error('\n❌ FAILURE: Negative heading in list not transformed');
        console.error('   Expected: <li><div data-neg-heading="true">Heading in list</div></li>');
        console.error('   Actual: Content not transformed\n');
      }

      // This documents current BROKEN behavior
      // TODO: This should pass after fix
      expect(heading).toBeTruthy();
    });

    test('check if heading element is block or inline', () => {
      const li = document.createElement('li');
      li.textContent = '-# Heading text';

      plugin.transformMarkdown(li);

      const heading = li.querySelector('[data-neg-heading="true"]');

      if (heading) {
        const tagName = heading.tagName;
        console.log('\n=== HEADING ELEMENT IN LIST ===');
        console.log('Tag name:', tagName);
        console.log('Is DIV?:', tagName === 'DIV');
        console.log('Is SPAN?:', tagName === 'SPAN');

        if (tagName === 'DIV') {
          console.error('❌ PROBLEM: DIV is block-level');
          console.error('   This causes heading to render on separate line');
          console.error('   Should use inline or inline-block display');
        }
        console.log('================================\n');

        // Current implementation uses DIV (block element)
        expect(tagName).toBe('DIV'); // Documents current behavior
      }
    });

    test('nested list with negative heading', () => {
      const ul = document.createElement('ul');
      const li1 = document.createElement('li');
      li1.textContent = 'Level 1';

      const ul2 = document.createElement('ul');
      const li2 = document.createElement('li');
      li2.textContent = '-# Level 2 heading';

      ul2.appendChild(li2);
      li1.appendChild(ul2);
      ul.appendChild(li1);

      plugin.transformMarkdown(ul);

      const heading = ul.querySelector('[data-neg-heading="true"]');

      if (!heading) {
        console.error('❌ FAILURE: Nested list heading not transformed');
      }

      expect(heading).toBeTruthy();
    });

    test('list with paragraph wrapper', () => {
      const li = document.createElement('li');
      const p = document.createElement('p');
      p.textContent = '-# Heading in paragraph';
      li.appendChild(p);

      plugin.transformMarkdown(li);

      const heading = li.querySelector('[data-neg-heading="true"]');

      if (!heading) {
        console.error('❌ FAILURE: Heading in <p> inside <li> not transformed');
      }

      expect(heading).toBeTruthy();
    });
  });

  describe('PARITY CHECK: Negative vs Native headings in lists', () => {
    test('both should work in simple list items', () => {
      // Native heading
      const li1 = document.createElement('li');
      const h1 = document.createElement('h1');
      h1.textContent = 'Native heading';
      li1.appendChild(h1);

      const nativeHeading = li1.querySelector('h1');
      expect(nativeHeading).toBeTruthy();

      // Negative heading
      const li2 = document.createElement('li');
      li2.textContent = '-# Negative heading';

      plugin.transformMarkdown(li2);

      const negHeading = li2.querySelector('[data-neg-heading="true"]');

      if (!negHeading) {
        console.error('\n❌ PARITY VIOLATION: Native headings work in lists, negative headings do not');
        console.error('   Native: <li><h1>Text</h1></li> ✓');
        console.error('   Negative: <li>-# Text</li> ✗ (not transformed)');
        console.error('   Fix needed: Negative headings must work in list items\n');
      } else {
        console.log('✓ PARITY: Both native and negative headings work in lists');
      }

      expect(negHeading).toBeTruthy();
    });

    test('both should have compatible display modes', () => {
      // Create native heading in list
      const li1 = document.createElement('li');
      const h1 = document.createElement('h1');
      h1.textContent = 'Native';
      li1.appendChild(h1);

      // Create negative heading in list
      const li2 = document.createElement('li');
      li2.textContent = '-# Negative';
      plugin.transformMarkdown(li2);

      const nativeTag = h1.tagName; // H1
      const negHeading = li2.querySelector('[data-neg-heading="true"]');
      const negTag = negHeading?.tagName; // DIV

      console.log('\n=== DISPLAY MODE COMPARISON ===');
      console.log('Native heading tag:', nativeTag, '(block-level, but styled inline by Obsidian)');
      console.log('Negative heading tag:', negTag, '(block-level, needs inline styling)');

      if (negTag === 'DIV' && !negHeading?.classList.contains('inline')) {
        console.error('⚠️  WARNING: Negative heading uses DIV without inline styling');
        console.error('   Recommendation: Add CSS rule "li .neg-heading { display: inline-block; }"');
      }
      console.log('================================\n');

      // Both use block-level elements, but need inline styling
      expect(nativeTag).toBe('H1');
      expect(negTag).toBe('DIV');
    });

    test('multiple list items with mixed content', () => {
      const ul = document.createElement('ul');

      // Item 1: Native heading
      const li1 = document.createElement('li');
      const h1 = document.createElement('h1');
      h1.textContent = 'Native';
      li1.appendChild(h1);
      ul.appendChild(li1);

      // Item 2: Negative heading
      const li2 = document.createElement('li');
      li2.textContent = '-# Negative';
      ul.appendChild(li2);

      // Item 3: Plain text
      const li3 = document.createElement('li');
      li3.textContent = 'Plain text';
      ul.appendChild(li3);

      plugin.transformMarkdown(ul);

      const nativeHeading = ul.querySelector('h1');
      const negHeading = ul.querySelector('[data-neg-heading="true"]');

      expect(nativeHeading).toBeTruthy();
      expect(negHeading).toBeTruthy();

      console.log('✓ Mixed content lists work correctly');
    });
  });
});
