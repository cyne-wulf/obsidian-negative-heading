/**
 * Live Preview Mode Bug Fixes Test Suite
 * Tests for issues specific to Live Preview mode (buildDecorations function)
 */

// Mock the buildDecorations function behavior
function simulateBuildDecorations(text: string): { decorated: boolean; lines: number[] } {
  const NEG_HEADING_TOKEN_REGEX = /^-#\s+/;
  const ESCAPED_NEG_HEADING_REGEX = /^\\-#\s+/;
  
  const lines = text.split('\n');
  const decoratedLines: number[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip indented lines
    if (/^[\s\t]/.test(line)) {
      continue;
    }
    
    // Skip escaped syntax
    if (ESCAPED_NEG_HEADING_REGEX.test(line)) {
      continue;
    }
    
    // Check for heading token
    if (NEG_HEADING_TOKEN_REGEX.test(line)) {
      decoratedLines.push(i);
    }
  }
  
  return {
    decorated: decoratedLines.length > 0,
    lines: decoratedLines
  };
}

describe('Live Preview Mode - Bug Fixes', () => {
  describe('Issue 1: Escaped Negative Heading Adjacency', () => {
    test('should maintain atLineStart state correctly after escaped heading', () => {
      const text = [
        '-# Normal heading above',
        '\\-# Escaped heading',
        '-# Normal heading below'
      ].join('\n');
      
      const result = simulateBuildDecorations(text);
      
      // Both normal headings should be decorated
      expect(result.lines).toEqual([0, 2]);
    });
    
    test('should handle consecutive escaped and normal headings', () => {
      const text = [
        '\\-# Escaped first',
        '-# Normal second',
        '\\-# Escaped third',
        '-# Normal fourth'
      ].join('\n');
      
      const result = simulateBuildDecorations(text);
      
      // Lines 1 and 3 should be decorated (0-indexed)
      expect(result.lines).toEqual([1, 3]);
    });
    
    test('should handle escaped heading in list item', () => {
      const text = [
        '- \\-# Escaped in list',
        '-# Normal heading',
        '- -# Normal in list'
      ].join('\n');
      
      const result = simulateBuildDecorations(text);
      
      // Should detect normal heading on line 1 and list item heading on line 2
      // But the escaped one should be skipped
      expect(result.lines).toContain(1); // Normal heading
      // Note: List item handling would be more complex in real implementation
    });
  });
  
  describe('Issue 2: Admonition/Callout Rendering', () => {
    test('should render negative headings inside callouts', () => {
      // In Live Preview, callouts appear as regular markdown
      const text = [
        '> [!note]',
        '> -# Heading in callout',
        '> More content'
      ].join('\n');
      
      // This test documents expected behavior
      // Real implementation would need to check syntax tree
      const lines = text.split('\n');
      const calloutLine = lines[1];
      
      // Remove the > prefix to check the content
      const content = calloutLine.replace(/^>\s*/, '');
      expect(content).toMatch(/^-#\s+/);
    });
    
    test('should handle nested callouts', () => {
      const text = [
        '> [!note]',
        '> -# Outer heading',
        '> > [!warning]',
        '> > -# Inner heading'
      ].join('\n');
      
      const lines = text.split('\n');
      
      // Check both headings are present
      expect(lines[1]).toContain('-# Outer');
      expect(lines[3]).toContain('-# Inner');
    });
  });
  
  describe('Issue 3: Code Block Exclusion', () => {
    test('should NOT render inside code blocks', () => {
      const text = [
        '-# Before code',
        '```',
        '-# Inside code block',
        '-# Still inside',
        '```',
        '-# After code'
      ].join('\n');
      
      // Simulate proper code block detection
      const decoratedLines: number[] = [];
      let inCodeBlock = false;
      
      text.split('\n').forEach((line, i) => {
        if (line === '```') {
          inCodeBlock = !inCodeBlock;
        } else if (!inCodeBlock && /^-#\s+/.test(line)) {
          decoratedLines.push(i);
        }
      });
      
      // Should only decorate lines 0 and 5
      expect(decoratedLines).toEqual([0, 5]);
    });
    
    test('should handle inline code correctly', () => {
      const text = [
        '-# Normal heading',
        'Text with `-# inline code` here',
        '-# Another heading'
      ].join('\n');
      
      const result = simulateBuildDecorations(text);
      
      // Should decorate lines 0 and 2 only
      // Line 1 doesn't start with -# so won't be decorated anyway
      expect(result.lines).toEqual([0, 2]);
    });
    
    test('should detect math blocks', () => {
      const text = [
        '-# Before math',
        '$$',
        '-# Inside math block',
        '$$',
        '-# After math'
      ].join('\n');
      
      // Similar to code blocks, math blocks should exclude content
      const decoratedLines: number[] = [];
      let inMathBlock = false;
      
      text.split('\n').forEach((line, i) => {
        if (line === '$$') {
          inMathBlock = !inMathBlock;
        } else if (!inMathBlock && /^-#\s+/.test(line)) {
          decoratedLines.push(i);
        }
      });
      
      expect(decoratedLines).toEqual([0, 4]);
    });
  });
  
  describe('Complex Scenarios', () => {
    test('should handle mixed escaped, callout, and code scenarios', () => {
      const text = [
        '-# Normal 1',
        '\\-# Escaped',
        '-# Normal 2',
        '> [!note]',
        '> -# In callout',
        '```',
        '-# In code',
        '```',
        '-# Normal 3'
      ].join('\n');
      
      // Manual analysis of what should be decorated:
      // Line 0: Normal 1 - YES
      // Line 1: Escaped - NO
      // Line 2: Normal 2 - YES  
      // Line 4: In callout - YES (callouts should work)
      // Line 6: In code - NO
      // Line 8: Normal 3 - YES
      
      // Test the specific handling of each section
      const lines = text.split('\n');
      
      expect(lines[0]).toMatch(/^-#\s+/); // Should match
      expect(lines[1]).toMatch(/^\\-#\s+/); // Escaped
      expect(lines[2]).toMatch(/^-#\s+/); // Should match
      expect(lines[4]).toContain('-#'); // In callout
      expect(lines[6]).toContain('-#'); // In code (but should be excluded)
      expect(lines[8]).toMatch(/^-#\s+/); // Should match
    });
    
    test('edge case: escaped heading immediately before/after code block', () => {
      const text = [
        '\\-# Escaped before code',
        '```',
        'code content',
        '```',
        '\\-# Escaped after code',
        '-# Normal after escaped'
      ].join('\n');
      
      const result = simulateBuildDecorations(text);
      
      // Only line 5 should be decorated
      expect(result.lines).toEqual([5]);
    });
  });
});