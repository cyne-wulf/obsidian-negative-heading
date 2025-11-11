/**
 * Native Heading Behavior Probes
 *
 * These tests probe how NATIVE headings (H1, H2, etc.) actually behave
 * in various contexts. This establishes ground truth for how negative
 * headings SHOULD behave.
 *
 * Principle: Negative headings should work wherever native headings work.
 */

import { setupDOM, createWorkingMockPlugin } from './test-environment';

describe('Native Heading Behavior Probes', () => {
  beforeEach(() => {
    setupDOM();
  });

  describe('PROBE: Native Headings in Callouts', () => {
    test('probe: does native H1 remain a heading inside .callout?', () => {
      const callout = document.createElement('div');
      callout.className = 'callout';

      const h1 = document.createElement('h1');
      h1.textContent = 'Native Heading in Callout';
      callout.appendChild(h1);

      // Probe: Is H1 still a heading element?
      const heading = callout.querySelector('h1');
      expect(heading).toBeTruthy();
      expect(heading?.tagName).toBe('H1');
      expect(heading?.textContent).toBe('Native Heading in Callout');

      // FINDING: Native headings ARE heading elements inside callouts
      // CONCLUSION: Negative headings SHOULD also render inside callouts
      console.log('✓ Native H1 remains a heading inside .callout');
    });

    test('probe: native H2 in nested callout structure', () => {
      const callout = document.createElement('div');
      callout.className = 'callout';

      const content = document.createElement('div');
      content.className = 'callout-content';

      const h2 = document.createElement('h2');
      h2.textContent = 'Nested Native Heading';
      content.appendChild(h2);
      callout.appendChild(content);

      // Probe: Does nesting affect heading status?
      const heading = callout.querySelector('h2');
      expect(heading).toBeTruthy();
      expect(heading?.tagName).toBe('H2');

      // FINDING: Nesting doesn't prevent native headings from being headings
      console.log('✓ Native H2 works in nested callout structure');
    });

    test('probe: multiple native headings in callout', () => {
      const callout = document.createElement('div');
      callout.className = 'callout';

      const h1 = document.createElement('h1');
      h1.textContent = 'First';
      const h2 = document.createElement('h2');
      h2.textContent = 'Second';

      callout.appendChild(h1);
      callout.appendChild(h2);

      // Probe: Do multiple headings work?
      const headings = callout.querySelectorAll('h1, h2');
      expect(headings.length).toBe(2);

      console.log('✓ Multiple native headings work in callouts');
    });
  });

  describe('PROBE: Native Headings with Escape Characters', () => {
    test('probe: does \\# actually prevent heading in DOM?', () => {
      // Simulate what Obsidian's markdown processor would create
      // If user types \# in markdown, Obsidian creates:

      const p = document.createElement('p');
      // After escape processing, the backslash might be:
      // Option A: Removed, leaving just "#"
      p.textContent = '# Not a heading';

      // Probe: Is this a paragraph or heading?
      expect(p.tagName).toBe('P'); // It's a paragraph, not H1
      expect(p.querySelector('h1')).toBeNull(); // No H1 inside

      // FINDING: Escaped headings become plain text in paragraphs
      // CONCLUSION: Escaped negative headings should also be plain text
      console.log('✓ Escaped native heading becomes plain text in paragraph');
    });

    test('probe: backslash presence in escaped content', () => {
      const p = document.createElement('p');
      // Check if backslash is preserved or removed after escape processing
      p.textContent = '\\# Escaped content';

      // Probe: Does text contain backslash?
      const hasBackslash = p.textContent.includes('\\');

      if (hasBackslash) {
        console.log('✓ Backslash is preserved: "' + p.textContent + '"');
      } else {
        console.log('✓ Backslash is consumed: "' + p.textContent + '"');
      }

      // Document the actual behavior
      expect(p.textContent.includes('Escaped content')).toBe(true);
    });
  });

  describe('PROBE: Native Headings in Lists', () => {
    test('probe: does native H1 work inside LI?', () => {
      const ul = document.createElement('ul');
      const li = document.createElement('li');
      const h1 = document.createElement('h1');
      h1.textContent = 'Heading in List';

      li.appendChild(h1);
      ul.appendChild(li);

      // Probe: Is H1 valid inside LI?
      const heading = li.querySelector('h1');
      expect(heading).toBeTruthy();
      expect(heading?.tagName).toBe('H1');

      // FINDING: Native headings CAN be in list items
      console.log('✓ Native H1 works inside LI element');
    });

    test('probe: native heading rendering position in list', () => {
      const li = document.createElement('li');
      const h1 = document.createElement('h1');
      h1.textContent = 'List Heading';
      h1.style.display = 'inline'; // Check if inline vs block matters

      li.appendChild(h1);

      // Probe: Check computed display
      // (In real Obsidian, check if heading is inline or block)
      const heading = li.querySelector('h1');
      expect(heading).toBeTruthy();

      // Document default display
      console.log('✓ Native heading in list item (display check needed in real Obsidian)');
    });
  });

  describe('PROBE: Native Heading Attributes', () => {
    test('probe: what attributes do native headings have?', () => {
      const h1 = document.createElement('h1');
      h1.textContent = 'Native Heading';

      // Probe: Default attributes
      const attrs = {
        role: h1.getAttribute('role'),
        ariaLevel: h1.getAttribute('aria-level'),
        className: h1.className,
        id: h1.id
      };

      console.log('Native H1 attributes:', attrs);

      // FINDING: Document what attributes native headings have
      // CONCLUSION: Negative headings should have similar semantics
      expect(h1.tagName).toBe('H1');
    });

    test('probe: heading level semantics', () => {
      const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

      headings.forEach((tag, index) => {
        const heading = document.createElement(tag);
        heading.textContent = `Level ${index + 1}`;

        // Probe: Implicit aria-level
        const implicitLevel = index + 1;
        expect(heading.tagName.toLowerCase()).toBe(tag);

        console.log(`✓ Native ${tag.toUpperCase()} = level ${implicitLevel}`);
      });

      // FINDING: H1-H6 have implicit aria levels 1-6
      // CONCLUSION: Negative heading uses aria-level=7 (outside normal range)
    });
  });

  describe('PROBE: Code and Math Block Behavior', () => {
    test('probe: native heading inside PRE', () => {
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = '# This is code, not a heading';
      pre.appendChild(code);

      // Probe: Is this treated as a heading?
      expect(pre.querySelector('h1')).toBeNull(); // No H1 created
      expect(code.textContent).toBe('# This is code, not a heading');

      // FINDING: # in code blocks is literal text, not a heading
      // CONCLUSION: -# in code blocks should also be literal
      console.log('✓ Native # in code block is literal text');
    });

    test('probe: inline code with heading syntax', () => {
      const p = document.createElement('p');
      const code = document.createElement('code');
      code.textContent = '# code';
      p.appendChild(document.createTextNode('Text '));
      p.appendChild(code);
      p.appendChild(document.createTextNode(' more text'));

      // Probe: Inline code doesn't become heading
      expect(p.querySelector('h1')).toBeNull();
      expect(code.textContent).toBe('# code');

      console.log('✓ Native # in inline code is literal');
    });
  });
});

describe('Native vs Negative Heading Comparison', () => {
  let plugin: any;

  beforeEach(() => {
    setupDOM();
    const MockPlugin = createWorkingMockPlugin();
    plugin = new MockPlugin();
  });

  describe('COMPARISON: Callout Rendering', () => {
    test('negative heading should match native heading behavior in callout', () => {
      const callout = document.createElement('div');
      callout.className = 'callout';

      // Native heading test
      const nativeP = document.createElement('p');
      const h1 = document.createElement('h1');
      h1.textContent = 'Native Heading';
      nativeP.appendChild(h1);
      callout.appendChild(nativeP);

      // Native heading IS a heading element ✓
      expect(callout.querySelector('h1')).toBeTruthy();

      // Negative heading test
      const negativeP = document.createElement('p');
      negativeP.textContent = '-# Negative Heading';
      callout.appendChild(negativeP);

      plugin.transformMarkdown(callout);

      // Negative heading SHOULD ALSO render (match native behavior)
      const negHeading = negativeP.querySelector('[data-neg-heading="true"]');

      // PARITY ACHIEVED: Negative heading renders in callout like native heading
      expect(negHeading).toBeTruthy();
      expect(negHeading?.textContent).toBe('Negative Heading');

      console.log('✓ PARITY: Both native and negative headings render in callouts');
    });
  });

  describe('COMPARISON: Code Block Exclusion', () => {
    test('both should exclude code blocks', () => {
      const pre = document.createElement('pre');
      const code = document.createElement('code');

      // Native doesn't create heading in code
      code.textContent = '# Native syntax';
      expect(code.querySelector('h1')).toBeNull();

      // Negative shouldn't either
      code.textContent = '-# Negative syntax';
      pre.appendChild(code);
      plugin.transformMarkdown(pre);

      const negHeading = code.querySelector('[data-neg-heading="true"]');
      expect(negHeading).toBeNull(); // Should match native (no heading)

      console.log('✓ PARITY: Both exclude code blocks');
    });
  });

  describe('COMPARISON: List Item Behavior', () => {
    test('both should work in list items', () => {
      const ul = document.createElement('ul');

      // Native heading in list
      const li1 = document.createElement('li');
      const h1 = document.createElement('h1');
      h1.textContent = 'Native in List';
      li1.appendChild(h1);
      ul.appendChild(li1);

      // Native works ✓
      expect(li1.querySelector('h1')).toBeTruthy();

      // Negative heading in list
      const li2 = document.createElement('li');
      li2.textContent = '-# Negative in List';
      ul.appendChild(li2);

      plugin.transformMarkdown(ul);

      const negHeading = li2.querySelector('[data-neg-heading="true"]');

      if (!negHeading) {
        console.error('❌ PARITY VIOLATION: Native heading works in LI, but negative heading does not');
      }

      expect(negHeading).toBeTruthy(); // Should match native
      console.log('✓ PARITY: Both work in list items');
    });
  });
});