import {
  createTestScenario,
  createHeadingElement,
  expectElementsToMatch,
  type TestElement,
  createMockPluginContext
} from './utils';
import { setupDOM, createWorkingMockPlugin } from './test-environment';

// Setup DOM environment before any tests
beforeAll(() => {
  setupDOM();
});

// Use the properly working mock plugin
const MockNegativeHeadingPlugin = createWorkingMockPlugin();

describe('Edge Cases - Negative Heading Plugin', () => {
  let plugin: InstanceType<typeof MockNegativeHeadingPlugin>;

  beforeEach(() => {
    plugin = new MockNegativeHeadingPlugin();
  });

  describe('Empty and Whitespace Edge Cases', () => {
    test('should handle empty heading token', () => {
      const input = '-#';
      const block = document.createElement('p');
      block.textContent = input;

      plugin.transformMarkdown(block);

      // Should not transform since there's no content after the token
      expect(block.innerHTML).toContain('-#');
    });

    test('should handle heading token with only spaces', () => {
      const input = '-#   ';
      const block = document.createElement('p');
      block.textContent = input;

      plugin.transformMarkdown(block);

      // Token with only whitespace should be completely removed (no heading created)
      expect(block.innerHTML).toBe('');
    });

    test('should handle multiple heading tokens on same line', () => {
      const input = '-# First\n-# Second';
      const block = document.createElement('p');
      block.textContent = input;
      
      plugin.transformMarkdown(block);
      
      const headings = block.querySelectorAll('[data-neg-heading="true"]');
      expect(headings.length).toBe(2);
    });
  });

  describe('Syntax Edge Cases', () => {
    test('should not transform inside code blocks', () => {
      const input = '-# This should not be a heading';
      const codeBlock = document.createElement('pre');
      const codeContent = document.createElement('code');
      codeContent.textContent = input;
      codeBlock.appendChild(codeContent);
      
      plugin.transformMarkdown(codeBlock);
      
      // Should remain unchanged
      expect(codeBlock.textContent).toContain('-# This should not be a heading');
    });

    test('should not transform inside inline code', () => {
      const p = document.createElement('p');
      const code = document.createElement('code');
      code.textContent = '-#';
      p.appendChild(document.createTextNode('This contains '));
      p.appendChild(code);
      p.appendChild(document.createTextNode(' which should not be transformed'));
      
      plugin.transformMarkdown(p);
      
      expect(p.textContent).toContain('-#');
    });

    test('should not transform inside math blocks', () => {
      const input = '-# math content';
      const mathBlock = document.createElement('div');
      mathBlock.className = 'math-block';
      mathBlock.textContent = input;
      
      plugin.transformMarkdown(mathBlock);
      
      expect(mathBlock.textContent).toContain('-# math content');
    });
  });

  describe('DOM Structure Edge Cases', () => {
    test('should handle headings within lists', () => {
      const input = '-# List Item';
      const li = document.createElement('li');
      li.textContent = input;
      
      plugin.transformMarkdown(li);
      
      // Should transform the list item
      expect(li.querySelector('[data-neg-heading="true"]')).toBeTruthy();
    });

    test('should handle headings in nested containers', () => {
      const input = '-# Nested Content';
      const container = document.createElement('div');
      const nested = document.createElement('div');
      const p = document.createElement('p');
      p.textContent = input;
      nested.appendChild(p);
      container.appendChild(nested);
      
      plugin.transformMarkdown(container);
      
      expect(p.querySelector('[data-neg-heading="true"]')).toBeTruthy();
    });

    test('should handle line breaks within headings', () => {
      const input = '-# Line 1\nLine 2';
      const p = document.createElement('p');
      p.textContent = input;
      
      plugin.transformMarkdown(p);
      
      // Should only transform the first line
      const heading = p.querySelector('[data-neg-heading="true"]');
      expect(heading?.textContent).toBe('Line 1');
      expect(p.textContent).toContain('Line 2');
    });
  });

  describe('Character and Encoding Edge Cases', () => {
    test('should handle Unicode characters in headings', () => {
      const input = '-# Héllö Wörld 🔥';
      const p = document.createElement('p');
      p.textContent = input;
      
      plugin.transformMarkdown(p);
      
      const heading = p.querySelector('[data-neg-heading="true"]');
      expect(heading?.textContent).toBe('Héllö Wörld 🔥');
    });

    test('should handle special characters', () => {
      const input = '-# Special: !@#$%^&*()[]{}|;:,.<>?';
      const p = document.createElement('p');
      p.textContent = input;
      
      plugin.transformMarkdown(p);
      
      const heading = p.querySelector('[data-neg-heading="true"]');
      expect(heading?.textContent).toBe('Special: !@#$%^&*()[]{}|;:,.<>?');
    });

    test('should handle tabs and mixed whitespace', () => {
      const input = '-#\tTabbed heading';
      const p = document.createElement('p');
      p.textContent = input;
      
      plugin.transformMarkdown(p);
      
      const heading = p.querySelector('[data-neg-heading="true"]');
      expect(heading?.textContent).toBe('Tabbed heading');
    });
  });

  describe('Contextual Edge Cases', () => {
    test('should not transform if heading already processed', () => {
      const p = document.createElement('p');
      // First, create an already-processed heading
      const existingHeading = document.createElement('div');
      existingHeading.dataset.negHeading = 'true';
      existingHeading.classList.add('neg-heading', 'neg-h1');
      existingHeading.textContent = 'Already processed';
      p.appendChild(existingHeading);
      // Add another potential heading after it
      p.appendChild(document.createTextNode('\n-# New heading'));

      // Store initial state
      const initialHeadings = p.querySelectorAll('[data-neg-heading="true"]').length;

      plugin.transformMarkdown(p);

      // Should transform the new heading but not re-transform the existing one
      const finalHeadings = p.querySelectorAll('[data-neg-heading="true"]');
      expect(finalHeadings.length).toBe(2); // Both the existing and new should be present
      expect(finalHeadings[0]).toBe(existingHeading); // First should be the original
    });

    test('should handle headings after other elements', () => {
      const input = 'Some text\n-# After text';
      const p = document.createElement('p');
      p.textContent = input;
      
      plugin.transformMarkdown(p);
      
      const heading = p.querySelector('[data-neg-heading="true"]');
      expect(heading?.textContent).toBe('After text');
      expect(p.textContent).toContain('Some text');
    });

    test('should handle empty blocks', () => {
      const p = document.createElement('p');
      
      plugin.transformMarkdown(p);
      
      // Should not throw errors on empty blocks
      expect(p).toBeTruthy();
    });
  });

  describe('Preprocessing Edge Cases', () => {
    test('should handle mixed heading styles', () => {
      const input = '-# Negative\n# Regular\n## Regular 2';
      const p = document.createElement('p');
      p.textContent = input;
      
      plugin.transformMarkdown(p);
      
      const negativeHeading = p.querySelector('[data-neg-heading="true"]');
      expect(negativeHeading?.textContent).toBe('Negative');
      expect(p.textContent).toContain('# Regular');
      expect(p.textContent).toContain('## Regular 2');
    });

    test('should handle indented headings', () => {
      const input = '  -# Indented heading';
      const p = document.createElement('p');
      p.textContent = input;
      
      plugin.transformMarkdown(p);
      
      // Should not transform indented headings (not at line start)
      expect(p.querySelector('[data-neg-heading="true"]')).toBeNull();
    });
  });
});