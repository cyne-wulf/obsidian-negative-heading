/**
 * Bug Fixes Test Suite - November 11
 * Tests for three critical issues:
 * 1. Escaped negative heading adjacency issue
 * 2. Admonition rendering in live preview mode
 * 3. Code block exclusion in live preview mode
 */

import { setupDOM, createWorkingMockPlugin } from './test-environment';

describe('November 11 Bug Fixes', () => {
  let plugin: any;

  beforeEach(() => {
    setupDOM();
    const MockPlugin = createWorkingMockPlugin();
    plugin = new MockPlugin();
  });

  describe('Issue 1: Escaped Negative Heading Adjacency', () => {
    test('negative heading ABOVE escaped heading should maintain style', () => {
      const container = document.createElement('div');
      
      // Normal heading above escaped
      const p1 = document.createElement('p');
      p1.textContent = '-# Normal heading above';
      container.appendChild(p1);
      
      // Escaped heading
      const p2 = document.createElement('p');
      p2.textContent = '\\-# Escaped heading';
      container.appendChild(p2);
      
      plugin.transformMarkdown(container);
      
      // First paragraph should be styled
      const heading1 = p1.querySelector('[data-neg-heading="true"]');
      expect(heading1).toBeTruthy();
      expect(heading1?.textContent).toBe('Normal heading above');
      
      // Second paragraph should NOT be styled (escaped)
      const heading2 = p2.querySelector('[data-neg-heading="true"]');
      expect(heading2).toBeNull();
    });
    
    test('negative heading BELOW escaped heading should maintain style', () => {
      const container = document.createElement('div');
      
      // Escaped heading
      const p1 = document.createElement('p');
      p1.textContent = '\\-# Escaped heading';
      container.appendChild(p1);
      
      // Normal heading below escaped
      const p2 = document.createElement('p');
      p2.textContent = '-# Normal heading below';
      container.appendChild(p2);
      
      plugin.transformMarkdown(container);
      
      // First paragraph should NOT be styled (escaped)
      const heading1 = p1.querySelector('[data-neg-heading="true"]');
      expect(heading1).toBeNull();
      
      // Second paragraph should be styled
      const heading2 = p2.querySelector('[data-neg-heading="true"]');
      expect(heading2).toBeTruthy();
      expect(heading2?.textContent).toBe('Normal heading below');
    });
    
    test('multiple normal headings with escaped heading in between', () => {
      const container = document.createElement('div');
      
      const p1 = document.createElement('p');
      p1.textContent = '-# First normal';
      container.appendChild(p1);
      
      const p2 = document.createElement('p');
      p2.textContent = '\\-# Escaped in middle';
      container.appendChild(p2);
      
      const p3 = document.createElement('p');
      p3.textContent = '-# Second normal';
      container.appendChild(p3);
      
      plugin.transformMarkdown(container);
      
      // Both normal headings should be styled
      const heading1 = p1.querySelector('[data-neg-heading="true"]');
      expect(heading1).toBeTruthy();
      expect(heading1?.textContent).toBe('First normal');
      
      const heading2 = p2.querySelector('[data-neg-heading="true"]');
      expect(heading2).toBeNull(); // Escaped - should not be styled
      
      const heading3 = p3.querySelector('[data-neg-heading="true"]');
      expect(heading3).toBeTruthy();
      expect(heading3?.textContent).toBe('Second normal');
    });
    
    test('consecutive escaped and normal headings in single block', () => {
      const p = document.createElement('p');
      p.textContent = '\\-# Escaped line\n-# Normal line\n-# Another normal\n\\-# Another escaped';
      
      plugin.transformMarkdown(p);
      
      const headings = p.querySelectorAll('[data-neg-heading="true"]');
      // Should have 2 styled headings (the normal ones)
      expect(headings.length).toBe(2);
      expect(headings[0].textContent).toBe('Normal line');
      expect(headings[1].textContent).toBe('Another normal');
    });
  });

  describe('Issue 2: Admonition/Callout Rendering in Live Preview', () => {
    test('negative headings SHOULD render inside callouts in reader mode', () => {
      const callout = document.createElement('div');
      callout.className = 'callout';
      
      const content = document.createElement('div');
      content.className = 'callout-content';
      
      const p = document.createElement('p');
      p.textContent = '-# Heading in callout';
      
      content.appendChild(p);
      callout.appendChild(content);
      
      plugin.transformMarkdown(callout);
      
      // Should render inside callout (matching native heading behavior)
      const heading = callout.querySelector('[data-neg-heading="true"]');
      expect(heading).toBeTruthy();
      expect(heading?.textContent).toBe('Heading in callout');
    });
    
    test('multiple negative headings in callout', () => {
      const callout = document.createElement('div');
      callout.className = 'callout';
      
      const p = document.createElement('p');
      p.textContent = '-# First heading\n-# Second heading';
      callout.appendChild(p);
      
      plugin.transformMarkdown(callout);
      
      const headings = callout.querySelectorAll('[data-neg-heading="true"]');
      expect(headings.length).toBe(2);
      expect(headings[0].textContent).toBe('First heading');
      expect(headings[1].textContent).toBe('Second heading');
    });
    
    test('nested callouts with negative headings', () => {
      const outerCallout = document.createElement('div');
      outerCallout.className = 'callout';
      
      const p1 = document.createElement('p');
      p1.textContent = '-# Outer callout heading';
      outerCallout.appendChild(p1);
      
      const innerCallout = document.createElement('div');
      innerCallout.className = 'callout';
      
      const p2 = document.createElement('p');
      p2.textContent = '-# Inner callout heading';
      innerCallout.appendChild(p2);
      
      outerCallout.appendChild(innerCallout);
      
      plugin.transformMarkdown(outerCallout);
      
      const headings = outerCallout.querySelectorAll('[data-neg-heading="true"]');
      expect(headings.length).toBe(2);
      expect(headings[0].textContent).toBe('Outer callout heading');
      expect(headings[1].textContent).toBe('Inner callout heading');
    });
  });

  describe('Issue 3: Code Block Exclusion in Live Preview', () => {
    test('should NOT render inside code blocks', () => {
      const container = document.createElement('div');
      
      // Create a code block structure
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = '-# This should not be a heading\n-# Neither should this';
      pre.appendChild(code);
      container.appendChild(pre);
      
      plugin.transformMarkdown(container);
      
      // Should NOT find any headings inside code blocks
      const headings = container.querySelectorAll('[data-neg-heading="true"]');
      expect(headings.length).toBe(0);
      
      // Content should remain unchanged
      expect(code.textContent).toContain('-# This should not be a heading');
      expect(code.textContent).toContain('-# Neither should this');
    });
    
    test('should NOT render inside inline code', () => {
      const p = document.createElement('p');
      p.innerHTML = 'Some text with <code>-# inline code</code> here';
      
      plugin.transformMarkdown(p);
      
      // Should NOT transform inside code elements
      const headings = p.querySelectorAll('[data-neg-heading="true"]');
      expect(headings.length).toBe(0);
      
      // Code content should be preserved
      const codeElement = p.querySelector('code');
      expect(codeElement?.textContent).toBe('-# inline code');
    });
    
    test('should NOT render inside math blocks', () => {
      const container = document.createElement('div');
      
      // Math block structure
      const mathBlock = document.createElement('div');
      mathBlock.className = 'math-block';
      mathBlock.textContent = '-# Not a heading in math\n-# Still not a heading';
      container.appendChild(mathBlock);
      
      plugin.transformMarkdown(container);
      
      const headings = container.querySelectorAll('[data-neg-heading="true"]');
      expect(headings.length).toBe(0);
    });
    
    test('should render outside but not inside code blocks', () => {
      const container = document.createElement('div');
      
      // Before code block
      const p1 = document.createElement('p');
      p1.textContent = '-# Before code block';
      container.appendChild(p1);
      
      // Code block
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = '-# Inside code block';
      pre.appendChild(code);
      container.appendChild(pre);
      
      // After code block
      const p2 = document.createElement('p');
      p2.textContent = '-# After code block';
      container.appendChild(p2);
      
      plugin.transformMarkdown(container);
      
      const allHeadings = container.querySelectorAll('[data-neg-heading="true"]');
      expect(allHeadings.length).toBe(2); // Only before and after
      
      // Check specific locations
      expect(p1.querySelector('[data-neg-heading="true"]')?.textContent).toBe('Before code block');
      expect(pre.querySelector('[data-neg-heading="true"]')).toBeNull();
      expect(p2.querySelector('[data-neg-heading="true"]')?.textContent).toBe('After code block');
    });
  });
  
  describe('Combined Issues', () => {
    test('escaped heading near callout with normal heading', () => {
      const container = document.createElement('div');
      
      // Escaped heading before callout
      const p1 = document.createElement('p');
      p1.textContent = '\\-# Escaped before callout';
      container.appendChild(p1);
      
      // Callout with normal heading
      const callout = document.createElement('div');
      callout.className = 'callout';
      const p2 = document.createElement('p');
      p2.textContent = '-# Inside callout';
      callout.appendChild(p2);
      container.appendChild(callout);
      
      // Normal heading after callout
      const p3 = document.createElement('p');
      p3.textContent = '-# After callout';
      container.appendChild(p3);
      
      plugin.transformMarkdown(container);
      
      // Check each section
      expect(p1.querySelector('[data-neg-heading="true"]')).toBeNull(); // Escaped
      expect(p2.querySelector('[data-neg-heading="true"]')?.textContent).toBe('Inside callout');
      expect(p3.querySelector('[data-neg-heading="true"]')?.textContent).toBe('After callout');
    });
    
    test('complex scenario with all three issues', () => {
      const container = document.createElement('div');
      
      // Normal heading
      const p1 = document.createElement('p');
      p1.textContent = '-# First normal heading';
      container.appendChild(p1);
      
      // Escaped heading
      const p2 = document.createElement('p');
      p2.textContent = '\\-# Escaped heading';
      container.appendChild(p2);
      
      // Another normal heading (tests adjacency)
      const p3 = document.createElement('p');
      p3.textContent = '-# Second normal heading';
      container.appendChild(p3);
      
      // Callout with heading
      const callout = document.createElement('div');
      callout.className = 'callout';
      const p4 = document.createElement('p');
      p4.textContent = '-# Heading in callout';
      callout.appendChild(p4);
      container.appendChild(callout);
      
      // Code block
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = '-# Not a heading in code';
      pre.appendChild(code);
      container.appendChild(pre);
      
      // Final normal heading
      const p5 = document.createElement('p');
      p5.textContent = '-# Final normal heading';
      container.appendChild(p5);
      
      plugin.transformMarkdown(container);
      
      // Verify all expected behaviors
      const allHeadings = container.querySelectorAll('[data-neg-heading="true"]');
      expect(allHeadings.length).toBe(4); // First, Second, Callout, Final
      
      expect(p1.querySelector('[data-neg-heading="true"]')?.textContent).toBe('First normal heading');
      expect(p2.querySelector('[data-neg-heading="true"]')).toBeNull(); // Escaped
      expect(p3.querySelector('[data-neg-heading="true"]')?.textContent).toBe('Second normal heading');
      expect(p4.querySelector('[data-neg-heading="true"]')?.textContent).toBe('Heading in callout');
      expect(pre.querySelector('[data-neg-heading="true"]')).toBeNull(); // Code block
      expect(p5.querySelector('[data-neg-heading="true"]')?.textContent).toBe('Final normal heading');
    });
  });
});