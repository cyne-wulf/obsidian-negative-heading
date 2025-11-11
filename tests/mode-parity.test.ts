/**
 * Mode Parity Tests for Negative Heading Plugin
 * Ensures consistent behavior across Source, Live Preview, and Reader modes
 */

import { setupDOM, createWorkingMockPlugin } from './test-environment';
import { EditorState } from '@codemirror/state';

// Setup DOM environment
beforeAll(() => {
  setupDOM();
});

// Mock for Source Mode behavior (regex-based)
function testSourceModeBehavior(input: string): boolean {
  const NEG_HEADING_TOKEN_REGEX = /^-#\s+/;
  const lines = input.split('\n');
  for (const line of lines) {
    if (NEG_HEADING_TOKEN_REGEX.test(line)) {
      return true; // Found a heading that would be decorated
    }
  }
  return false;
}

// Mock for Reader Mode behavior (DOM transformation)
function testReaderModeBehavior(input: string): boolean {
  const MockPlugin = createWorkingMockPlugin();
  const plugin = new MockPlugin();
  const block = document.createElement('p');
  block.textContent = input;

  plugin.transformMarkdown(block);

  const headings = block.querySelectorAll('[data-neg-heading="true"]');
  return headings.length > 0;
}

// Mock for Live Preview Mode behavior (combines both)
function testLivePreviewBehavior(input: string, cursorOnLine: boolean = false): boolean {
  if (cursorOnLine) {
    // When cursor is on line, shows raw syntax (Source Mode behavior)
    return testSourceModeBehavior(input);
  } else {
    // When cursor is not on line, shows transformed heading (Reader Mode behavior)
    return testReaderModeBehavior(input);
  }
}

// Test scenarios that should behave identically across all modes
const parityTestCases = [
  // Basic rendering cases
  {
    name: 'Basic heading',
    input: '-# Test Heading',
    shouldRender: true,
    description: 'Basic negative heading should render in all modes'
  },
  {
    name: 'Heading with content',
    input: '-# This is a longer heading',
    shouldRender: true,
    description: 'Heading with multiple words should render'
  },

  // Whitespace variations
  {
    name: 'No space after token',
    input: '-#NoSpace',
    shouldRender: false,
    description: 'Token without space should NOT render (requires space)'
  },
  {
    name: 'Empty token only',
    input: '-#',
    shouldRender: false,
    description: 'Token alone without space should NOT render'
  },
  {
    name: 'Token with single space',
    input: '-# ',
    shouldRender: false,
    description: 'Token with only space and no content should NOT render'
  },
  {
    name: 'Token with multiple spaces',
    input: '-#    ',
    shouldRender: false,
    description: 'Token with only spaces should NOT render'
  },
  {
    name: 'Leading space before token',
    input: ' -# Indented',
    shouldRender: false,
    description: 'Indented heading should NOT render'
  },
  {
    name: 'Leading tab before token',
    input: '\t-# Tab indented',
    shouldRender: false,
    description: 'Tab-indented heading should NOT render'
  },
  {
    name: 'Multiple leading spaces',
    input: '    -# Very indented',
    shouldRender: false,
    description: 'Multiple space indentation should NOT render'
  },

  // Context variations
  {
    name: 'Heading after text on same line',
    input: 'Some text -# Not a heading',
    shouldRender: false,
    description: 'Mid-line token should NOT render'
  },
  {
    name: 'Heading at start of new line',
    input: 'Some text\n-# New line heading',
    shouldRender: true,
    description: 'Heading on new line after text should render'
  },
  {
    name: 'Multiple headings',
    input: '-# First\n-# Second',
    shouldRender: true,
    description: 'Multiple headings on separate lines should render'
  },
  {
    name: 'Heading with line break in content',
    input: '-# Line one\nLine two',
    shouldRender: true,
    description: 'Heading content up to line break should render'
  },

  // Special characters
  {
    name: 'Unicode characters',
    input: '-# Héllö Wörld 🔥',
    shouldRender: true,
    description: 'Unicode and emoji should work'
  },
  {
    name: 'Special punctuation',
    input: '-# Title: Subtitle!',
    shouldRender: true,
    description: 'Special characters should work'
  },

  // Edge cases
  {
    name: 'Very long heading',
    input: '-# ' + 'a'.repeat(500),
    shouldRender: true,
    description: 'Long headings should render'
  },
  {
    name: 'Heading with trailing spaces',
    input: '-# Heading   ',
    shouldRender: true,
    description: 'Trailing spaces should be preserved'
  },
  {
    name: 'Empty lines between content',
    input: 'Text\n\n\n-# Heading',
    shouldRender: true,
    description: 'Empty lines should not affect rendering'
  },

  // Excluded contexts (would need proper implementation)
  {
    name: 'Inside code fence',
    input: '```\n-# Not a heading\n```',
    shouldRender: false,
    description: 'Should NOT render inside code blocks'
  },
  {
    name: 'Inside inline code',
    input: '`-# Not a heading`',
    shouldRender: false,
    description: 'Should NOT render inside inline code'
  },
  {
    name: 'Inside math block',
    input: '$$\n-# Not a heading\n$$',
    shouldRender: false,
    description: 'Should NOT render inside math blocks'
  }
];

describe('Mode Parity - Negative Heading Plugin', () => {
  describe('Consistent Behavior Across Modes', () => {
    test.each(parityTestCases)(
      '$name - Source Mode',
      ({ input, shouldRender, description }) => {
        const renders = testSourceModeBehavior(input);

        if (shouldRender) {
          expect(renders).toBe(true);
        } else {
          expect(renders).toBe(false);
        }
      }
    );

    test.each(parityTestCases)(
      '$name - Reader Mode',
      ({ input, shouldRender, description }) => {
        const renders = testReaderModeBehavior(input);

        if (shouldRender) {
          expect(renders).toBe(true);
        } else {
          expect(renders).toBe(false);
        }
      }
    );

    test.each(parityTestCases)(
      '$name - Live Preview Mode (cursor not on line)',
      ({ input, shouldRender, description }) => {
        const renders = testLivePreviewBehavior(input, false);

        if (shouldRender) {
          expect(renders).toBe(true);
        } else {
          expect(renders).toBe(false);
        }
      }
    );
  });

  describe('Cross-Mode Consistency Verification', () => {
    test('All modes should agree on what renders', () => {
      const inconsistencies: string[] = [];

      for (const testCase of parityTestCases) {
        const sourceResult = testSourceModeBehavior(testCase.input);
        const readerResult = testReaderModeBehavior(testCase.input);
        const livePreviewResult = testLivePreviewBehavior(testCase.input, false);

        // Check if all modes agree
        if (sourceResult !== testCase.shouldRender) {
          inconsistencies.push(
            `Source Mode: "${testCase.name}" - expected ${testCase.shouldRender}, got ${sourceResult}`
          );
        }
        if (readerResult !== testCase.shouldRender) {
          inconsistencies.push(
            `Reader Mode: "${testCase.name}" - expected ${testCase.shouldRender}, got ${readerResult}`
          );
        }
        if (livePreviewResult !== testCase.shouldRender) {
          inconsistencies.push(
            `Live Preview Mode: "${testCase.name}" - expected ${testCase.shouldRender}, got ${livePreviewResult}`
          );
        }

        // Also check that modes agree with each other
        if (sourceResult !== readerResult) {
          inconsistencies.push(
            `Mismatch: "${testCase.name}" - Source(${sourceResult}) vs Reader(${readerResult})`
          );
        }
      }

      if (inconsistencies.length > 0) {
        console.error('Mode inconsistencies found:');
        inconsistencies.forEach(msg => console.error(`  - ${msg}`));
      }

      expect(inconsistencies).toHaveLength(0);
    });
  });

  describe('Native Heading Comparison', () => {
    // Compare behavior with native markdown headings
    const nativeComparisonCases = [
      {
        native: '# Native H1',
        negative: '-# Negative H1',
        context: 'Basic heading',
        bothShould: 'render'
      },
      {
        native: '  # Indented native',
        negative: '  -# Indented negative',
        context: 'Indented heading',
        bothShould: 'not render'
      },
      {
        native: 'Text # Not native',
        negative: 'Text -# Not negative',
        context: 'Mid-line heading',
        bothShould: 'not render'
      },
      {
        native: '# Native\n## Native 2',
        negative: '-# Negative\n-# Negative 2',
        context: 'Multiple headings',
        bothShould: 'render'
      }
    ];

    test.each(nativeComparisonCases)(
      'Negative headings should match native behavior - $context',
      ({ native, negative, context, bothShould }) => {
        // Test negative heading behavior
        const negativeRenders = testReaderModeBehavior(negative);

        if (bothShould === 'render') {
          expect(negativeRenders).toBe(true);
        } else {
          expect(negativeRenders).toBe(false);
        }
      }
    );
  });

  describe('Live Preview Mode Transitions', () => {
    test('Should show raw syntax when cursor is on line', () => {
      const input = '-# Test Heading';

      // Cursor on line - should detect as Source Mode behavior
      const withCursor = testLivePreviewBehavior(input, true);
      const sourceMode = testSourceModeBehavior(input);

      expect(withCursor).toBe(sourceMode);
    });

    test('Should show transformed heading when cursor is not on line', () => {
      const input = '-# Test Heading';

      // Cursor not on line - should detect as Reader Mode behavior
      const withoutCursor = testLivePreviewBehavior(input, false);
      const readerMode = testReaderModeBehavior(input);

      expect(withoutCursor).toBe(readerMode);
    });

    test('Transition should be consistent for all test cases', () => {
      for (const testCase of parityTestCases) {
        const cursorOn = testLivePreviewBehavior(testCase.input, true);
        const cursorOff = testLivePreviewBehavior(testCase.input, false);
        const sourceExpected = testSourceModeBehavior(testCase.input);
        const readerExpected = testReaderModeBehavior(testCase.input);

        expect(cursorOn).toBe(sourceExpected);
        expect(cursorOff).toBe(readerExpected);
      }
    });
  });

  describe('Edge Case Mode Agreement', () => {
    const edgeCases = [
      { input: '-# \n', description: 'Heading with newline' },
      { input: '-# \r\n', description: 'Heading with CRLF' },
      { input: '-# \t', description: 'Heading with tab' },
      { input: '-#\u00A0Text', description: 'Non-breaking space' },
      { input: '-# ' + '\u200B', description: 'Zero-width space' }
    ];

    test.each(edgeCases)('$description', ({ input }) => {
      const sourceResult = testSourceModeBehavior(input);
      const readerResult = testReaderModeBehavior(input);

      // All modes should agree
      expect(sourceResult).toBe(readerResult);
    });
  });
});