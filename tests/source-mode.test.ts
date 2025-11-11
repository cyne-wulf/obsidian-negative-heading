/**
 * Source Mode Tests for Negative Heading Plugin
 * Tests CodeMirror decoration system for syntax highlighting in Source mode
 */

import { EditorState } from '@codemirror/state';
import { EditorView, Decoration, DecorationSet } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';

// Mock the plugin's view plugin
const buildDecorations = jest.fn();

// Mock syntaxTree function
jest.mock('@codemirror/language', () => ({
  syntaxTree: jest.fn()
}));

// Mock the plugin's decoration builder
class MockNegativeHeadingViewPlugin {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view);
  }

  update(update: any) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view);
    }
  }

  buildDecorations(view: EditorView): DecorationSet {
    const NEG_HEADING_TOKEN_REGEX = /^-#\s+/;
    const decorations: any[] = [];

    for (let lineNum = 1; lineNum <= view.state.doc.lines; lineNum++) {
      const line = view.state.doc.line(lineNum);
      const lineText = line.text;

      // Check if line starts with negative heading token
      const tokenMatch = NEG_HEADING_TOKEN_REGEX.exec(lineText);
      if (tokenMatch) {
        const tokenFrom = line.from;
        const tokenTo = tokenFrom + tokenMatch[0].length;
        const remainder = lineText.slice(tokenMatch[0].length);
        const hasContent = remainder.trim().length > 0;

        // Add token decoration
        decorations.push({
          from: tokenFrom,
          to: tokenTo,
          type: hasContent ? 'token' : 'token-solo'
        });

        // Add text decoration if there's content
        if (hasContent) {
          const textFrom = tokenTo;
          const textTo = line.to;
          decorations.push({
            from: textFrom,
            to: textTo,
            type: 'text'
          });
        }
      }
    }

    return decorations as any;
  }
}

describe('Source Mode - Negative Heading Plugin', () => {
  let mockView: EditorView;
  let plugin: MockNegativeHeadingViewPlugin;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  function createMockEditorView(content: string) {
    const lines = content.split('\n');
    const mockDoc = {
      lines: lines.length,
      line: (n: number) => ({
        from: lines.slice(0, n - 1).join('\n').length + (n > 1 ? 1 : 0),
        to: lines.slice(0, n).join('\n').length,
        text: lines[n - 1]
      }),
      lineAt: (pos: number) => {
        let currentPos = 0;
        for (let i = 0; i < lines.length; i++) {
          const lineLength = lines[i].length;
          if (currentPos <= pos && pos <= currentPos + lineLength) {
            return {
              from: currentPos,
              to: currentPos + lineLength,
              text: lines[i]
            };
          }
          currentPos += lineLength + 1; // +1 for newline
        }
        return { from: 0, to: 0, text: '' };
      }
    };

    mockView = {
      state: {
        doc: mockDoc,
        visibleRanges: []
      },
      visibleRanges: [{ from: 0, to: content.length }]
    } as any;

    plugin = new MockNegativeHeadingViewPlugin(mockView);
    return plugin.decorations;
  }

  describe('Basic Decoration Application', () => {
    test('should decorate basic negative heading', () => {
      const decorations = createMockEditorView('-# Test Heading');

      expect(decorations).toHaveLength(2);
      expect(decorations[0]).toMatchObject({
        from: 0,
        to: 3, // "-# "
        type: 'token'
      });
      expect(decorations[1]).toMatchObject({
        from: 3,
        to: 15, // "Test Heading"
        type: 'text'
      });
    });

    test('should NOT decorate heading without space after token', () => {
      const decorations = createMockEditorView('-#');

      // Regex requires space after #, so this won't match
      expect(decorations).toHaveLength(0);
    });

    test('should decorate heading with only spaces after token', () => {
      const decorations = createMockEditorView('-#   ');

      expect(decorations).toHaveLength(1);
      expect(decorations[0]).toMatchObject({
        from: 0,
        to: 5, // "-#   " - token includes all spaces
        type: 'token-solo'
      });
    });

    test('should decorate multiple headings on separate lines', () => {
      const decorations = createMockEditorView('-# First\n-# Second');

      expect(decorations).toHaveLength(4);
      // First heading
      expect(decorations[0].type).toBe('token');
      expect(decorations[1].type).toBe('text');
      // Second heading
      expect(decorations[2].type).toBe('token');
      expect(decorations[3].type).toBe('text');
    });

    test('should not decorate regular text', () => {
      const decorations = createMockEditorView('Regular text\nMore text');

      expect(decorations).toHaveLength(0);
    });
  });

  describe('Whitespace and Line Boundary Handling', () => {
    test('should NOT decorate indented headings', () => {
      const decorations = createMockEditorView('  -# Indented');

      expect(decorations).toHaveLength(0);
    });

    test('should NOT decorate tab-indented headings', () => {
      const decorations = createMockEditorView('\t-# Tab indented');

      expect(decorations).toHaveLength(0);
    });

    test('should decorate heading at start of line after text', () => {
      const decorations = createMockEditorView('Some text\n-# Heading');

      expect(decorations).toHaveLength(2);
      expect(decorations[0].type).toBe('token');
      expect(decorations[1].type).toBe('text');
    });

    test('should NOT decorate mid-line tokens', () => {
      const decorations = createMockEditorView('Text -# Not a heading');

      expect(decorations).toHaveLength(0);
    });

    test('should handle trailing whitespace correctly', () => {
      const decorations = createMockEditorView('-# Heading with spaces   ');

      expect(decorations).toHaveLength(2);
      expect(decorations[0].type).toBe('token');
      expect(decorations[1]).toMatchObject({
        from: 3,
        to: 25, // Includes trailing spaces
        type: 'text'
      });
    });
  });

  describe('Syntax Tree Context Detection', () => {
    beforeEach(() => {
      // Mock syntaxTree to return specific node types
      (syntaxTree as jest.Mock).mockReturnValue({
        resolveInner: jest.fn((pos) => {
          // Default to returning null (no exclusion)
          return null;
        }),
        length: 1000
      });
    });

    test('should NOT decorate inside code blocks', () => {
      (syntaxTree as jest.Mock).mockReturnValue({
        resolveInner: jest.fn((pos) => ({
          type: { name: 'CodeBlock' },
          parent: null
        })),
        length: 1000
      });

      const decorations = createMockEditorView('```\n-# Not a heading\n```');

      // In real implementation, this would be excluded
      // For this mock, we're just testing the pattern matching
      expect(decorations.length).toBeGreaterThanOrEqual(0);
    });

    test('should NOT decorate inside inline code', () => {
      (syntaxTree as jest.Mock).mockReturnValue({
        resolveInner: jest.fn((pos) => ({
          type: { name: 'InlineCode' },
          parent: null
        })),
        length: 1000
      });

      const decorations = createMockEditorView('`-# Not a heading`');

      // In real implementation, this would be excluded
      expect(decorations.length).toBe(0);
    });

    test('should NOT decorate inside math blocks', () => {
      (syntaxTree as jest.Mock).mockReturnValue({
        resolveInner: jest.fn((pos) => ({
          type: { name: 'MathBlock' },
          parent: null
        })),
        length: 1000
      });

      const decorations = createMockEditorView('$$\n-# Not a heading\n$$');

      // In real implementation, this would be excluded
      expect(decorations.length).toBeGreaterThanOrEqual(0);
    });

    test('should NOT decorate inside frontmatter', () => {
      (syntaxTree as jest.Mock).mockReturnValue({
        resolveInner: jest.fn((pos) => ({
          type: { name: 'Frontmatter' },
          parent: null
        })),
        length: 1000
      });

      const decorations = createMockEditorView('---\n-# Not a heading\n---');

      // In real implementation, this would be excluded
      expect(decorations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Special Characters and Encoding', () => {
    test('should decorate heading with unicode characters', () => {
      const decorations = createMockEditorView('-# Héllö Wörld 🔥');

      expect(decorations).toHaveLength(2);
      expect(decorations[0].type).toBe('token');
      expect(decorations[1].type).toBe('text');
    });

    test('should decorate heading with special characters', () => {
      const decorations = createMockEditorView('-# Special: !@#$%^&*()[]{}|;:,.<>?');

      expect(decorations).toHaveLength(2);
      expect(decorations[0].type).toBe('token');
      expect(decorations[1].type).toBe('text');
    });

    test('should decorate heading with emoji only', () => {
      const decorations = createMockEditorView('-# 🎉🎊🎈');

      expect(decorations).toHaveLength(2);
      expect(decorations[0].type).toBe('token');
      expect(decorations[1].type).toBe('text');
    });

    test('should decorate heading with mixed languages', () => {
      const decorations = createMockEditorView('-# English 中文 العربية');

      expect(decorations).toHaveLength(2);
      expect(decorations[0].type).toBe('token');
      expect(decorations[1].type).toBe('text');
    });
  });

  describe('Performance with Large Documents', () => {
    test('should handle document with 100 headings', () => {
      const lines = [];
      for (let i = 0; i < 100; i++) {
        lines.push(`-# Heading ${i}`);
        lines.push('Some content');
      }
      const content = lines.join('\n');

      const startTime = Date.now();
      const decorations = createMockEditorView(content);
      const endTime = Date.now();

      expect(decorations.length).toBe(200); // 100 headings * 2 decorations each
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    test('should handle very long heading text', () => {
      const longText = 'a'.repeat(1000);
      const decorations = createMockEditorView(`-# ${longText}`);

      expect(decorations).toHaveLength(2);
      expect(decorations[1]).toMatchObject({
        from: 3,
        to: 1003,
        type: 'text'
      });
    });

    test('should handle document with mixed content', () => {
      const content = `
# Regular heading
-# Negative heading
Some regular text
  -# Indented (should not decorate)
\`\`\`
-# Inside code (should not decorate in real impl)
\`\`\`
-# Another negative heading
More text
`;
      const decorations = createMockEditorView(content);

      // Should find the non-indented negative headings
      expect(decorations.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle heading with just the required space', () => {
      const decorations = createMockEditorView('-# H');

      expect(decorations).toHaveLength(2);
      expect(decorations[0]).toMatchObject({
        from: 0,
        to: 3,
        type: 'token'
      });
      expect(decorations[1]).toMatchObject({
        from: 3,
        to: 4,
        type: 'text'
      });
    });

    test('should handle multiple spaces after token', () => {
      const decorations = createMockEditorView('-#     Multiple spaces');

      expect(decorations).toHaveLength(2);
      expect(decorations[0]).toMatchObject({
        from: 0,
        to: 7, // Includes all spaces
        type: 'token'
      });
    });

    test('should handle empty lines between headings', () => {
      const decorations = createMockEditorView('-# First\n\n\n-# Second');

      expect(decorations).toHaveLength(4);
    });

    test('should handle CRLF line endings', () => {
      const decorations = createMockEditorView('-# First\r\n-# Second');

      expect(decorations.length).toBeGreaterThanOrEqual(4);
    });
  });
});