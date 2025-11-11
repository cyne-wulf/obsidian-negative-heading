import {
  createTestScenario,
  createHeadingElement,
  expectElementsToMatch,
  testElementToHTML,
  type VisualTestCase,
  type TestElement
} from './utils';
import { setupDOM, createWorkingMockPlugin } from './test-environment';

// Setup DOM environment before any tests
beforeAll(() => {
  setupDOM();
});

// Use the properly working mock plugin
const MockNegativeHeadingPlugin = createWorkingMockPlugin();

describe('Visual Regression Tests - Negative Heading Plugin', () => {
  let plugin: InstanceType<typeof MockNegativeHeadingPlugin>;

  beforeEach(() => {
    plugin = new MockNegativeHeadingPlugin();
  });

  // Core functionality test cases
  const coreTestCases: VisualTestCase[] = [
    createTestScenario(
      'basic-heading',
      '-# Simple heading',
      createHeadingElement(1, 'Simple heading'),
      'Basic negative heading transformation'
    ),
    createTestScenario(
      'heading-with-content',
      '-# This is a longer heading with more content',
      createHeadingElement(1, 'This is a longer heading with more content'),
      'Heading with substantial text content'
    ),
    createTestScenario(
      'heading-in-paragraph',
      'Some text before\n-# Heading text\nSome text after',
      {
        tagName: 'div',
        className: 'cm-s-obsidian',
        children: [
          {
            tagName: '#text',
            textContent: 'Some text before\n'
          },
          {
            tagName: 'div',
            className: 'neg-heading neg-h1',
            attributes: {
              'data-neg-heading': 'true',
              'role': 'heading',
              'aria-level': '7'
            },
            children: [
              {
                tagName: '#text',
                textContent: 'Heading text'
              }
            ]
          },
          {
            tagName: '#text',
            textContent: '\nSome text after'
          }
        ]
      },
      'Heading embedded within paragraph content'
    ),
    createTestScenario(
      'multiple-headings',
      '-# First heading\nSome content\n-# Second heading',
      {
        tagName: 'div',
        className: 'cm-s-obsidian',
        children: [
          {
            tagName: 'div',
            className: 'neg-heading neg-h1',
            attributes: {
              'data-neg-heading': 'true',
              'role': 'heading',
              'aria-level': '7'
            },
            children: [
              {
                tagName: '#text',
                textContent: 'First heading'
              }
            ]
          },
          {
            tagName: '#text',
            textContent: '\nSome content\n'
          },
          {
            tagName: 'div',
            className: 'neg-heading neg-h1',
            attributes: {
              'data-neg-heading': 'true',
              'role': 'heading',
              'aria-level': '7'
            },
            children: [
              {
                tagName: '#text',
                textContent: 'Second heading'
              }
            ]
          }
        ]
      },
      'Multiple headings in same block'
    )
  ];

  describe('Core Functionality', () => {
    test.each(coreTestCases)('$name: $description', (testCase) => {
      const block = document.createElement('p');
      block.textContent = testCase.input;
      
      plugin.transformMarkdown(block);
      
      // Generate visual snapshot for comparison
      const actualHTML = testElementToHTML({
        tagName: 'div',
        className: 'cm-s-obsidian',
        children: Array.from(block.childNodes).map(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            return {
              tagName: (node as Element).tagName.toLowerCase(),
              className: (node as Element).className,
              textContent: node.textContent,
              attributes: Object.fromEntries(
                Array.from((node as Element).attributes).map(attr => [attr.name, attr.value])
              ),
              children: Array.from(node.childNodes).map(childNode => {
                if (childNode.nodeType === Node.TEXT_NODE) {
                  return {
                    tagName: '#text',
                    textContent: childNode.textContent
                  };
                }
                return {
                  tagName: (childNode as Element).tagName.toLowerCase(),
                  textContent: childNode.textContent
                };
              })
            };
          } else {
            return {
              tagName: '#text',
              textContent: (node as Text).nodeValue
            };
          }
        })
      });
      
      // Store snapshot for visual regression testing
      expect(actualHTML).toMatchSnapshot(`visual-${testCase.name}`);
    });
  });

  describe('Edge Case Visual Verification', () => {
    test('should preserve indentation structure', () => {
      const input = '  Normal text\n  -# Indented heading';
      const block = document.createElement('p');
      block.textContent = input;
      
      plugin.transformMarkdown(block);
      
      // Should not transform indented heading
      expect(block.querySelector('[data-neg-heading="true"]')).toBeNull();
      expect(block.textContent).toBe(input);
    });

    test('should handle code block boundaries', () => {
      const input = 'Normal text\n```\n-# Not a heading\n```';
      const container = document.createElement('div');
      const p = document.createElement('p');
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      
      p.textContent = 'Normal text';
      code.textContent = '-# Not a heading';
      pre.appendChild(code);
      
      container.appendChild(p);
      container.appendChild(pre);
      
      plugin.transformMarkdown(container);
      
      // Only the paragraph should be processed
      expect(p.querySelector('[data-neg-heading="true"]')).toBeNull();
      expect(pre.textContent).toContain('-# Not a heading');
    });

    test('should handle list structure', () => {
      const input = '-# List heading';
      const li = document.createElement('li');
      li.textContent = input;
      
      plugin.transformMarkdown(li);
      
      const heading = li.querySelector('[data-neg-heading="true"]');
      expect(heading).toBeTruthy();
      expect(heading?.textContent).toBe('List heading');
      expect(heading?.getAttribute('role')).toBe('heading');
      expect(heading?.getAttribute('aria-level')).toBe('7');
    });
  });

  describe('Performance Visual Tests', () => {
    test('should handle large document efficiently', () => {
      const largeContent = Array.from({ length: 100 }, (_, i) => 
        `-# Heading ${i}\nContent for heading ${i}\n\n`
      ).join('');
      
      const block = document.createElement('div');
      const p = document.createElement('p');
      p.textContent = largeContent;
      block.appendChild(p);
      
      const startTime = performance.now();
      plugin.transformMarkdown(block);
      const endTime = performance.now();
      
      const headings = block.querySelectorAll('[data-neg-heading="true"]');
      expect(headings.length).toBe(100);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Accessibility Visual Tests', () => {
    test('should add proper ARIA attributes', () => {
      const input = '-# Accessible heading';
      const p = document.createElement('p');
      p.textContent = input;
      
      plugin.transformMarkdown(p);
      
      const heading = p.querySelector('[data-neg-heading="true"]') as HTMLElement;
      expect(heading).toBeTruthy();
      expect(heading.getAttribute('role')).toBe('heading');
      expect(heading.getAttribute('aria-level')).toBe('7');
    });

    test('should maintain data attributes for plugin tracking', () => {
      const input = '-# Tracked heading';
      const p = document.createElement('p');
      p.textContent = input;
      
      plugin.transformMarkdown(p);
      
      const heading = p.querySelector('[data-neg-heading="true"]') as HTMLElement;
      expect(heading).toBeTruthy();
      expect(heading.dataset.negHeading).toBe('true');
    });
  });

  describe('CSS Class Visual Tests', () => {
    test('should apply correct CSS classes', () => {
      const input = '-# Styled heading';
      const p = document.createElement('p');
      p.textContent = input;
      
      plugin.transformMarkdown(p);
      
      const heading = p.querySelector('.neg-heading');
      expect(heading).toBeTruthy();
      expect(heading?.classList.contains('neg-h1')).toBe(true);
    });

    test('should not duplicate CSS classes on re-processing', () => {
      const input = '-# Duplicate test';
      const p = document.createElement('p');
      p.textContent = input;
      
      // Process twice
      plugin.transformMarkdown(p);
      plugin.transformMarkdown(p);
      
      const heading = p.querySelector('.neg-heading');
      expect(heading).toBeTruthy();
      expect(heading?.classList.contains('neg-h1')).toBe(true);
      // Should not have duplicate classes
      expect(heading?.className.split(' ').filter(c => c === 'neg-h1').length).toBe(1);
    });
  });
});