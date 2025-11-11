/**
 * Unit tests for toggle command utility functions
 * Following TDD approach - these tests should FAIL until implementation is complete
 */

import { describe, it, expect } from '@jest/globals';
import { createMockEditor } from './toggle-command-mocks';

// Import the functions we'll implement
import {
  isNegativeHeading,
  addNegativeHeadingToken,
  removeNegativeHeadingToken,
  parseLineInfo,
  getEligibleLines,
  preserveListMarker,
} from '../src/commands/toggle-utils';

describe('isNegativeHeading', () => {
  it('should detect simple negative heading', () => {
    expect(isNegativeHeading('-# Hello')).toBe(true);
  });

  it('should detect negative heading with multiple spaces', () => {
    expect(isNegativeHeading('-#  Hello')).toBe(true);
  });

  it('should detect negative heading in list item', () => {
    expect(isNegativeHeading('- -# List item heading')).toBe(true);
    expect(isNegativeHeading('* -# List item heading')).toBe(true);
    expect(isNegativeHeading('+ -# List item heading')).toBe(true);
    expect(isNegativeHeading('1. -# Numbered list heading')).toBe(true);
  });

  it('should detect negative heading with indented list', () => {
    expect(isNegativeHeading('  - -# Indented list')).toBe(true);
    expect(isNegativeHeading('    1. -# Double indent')).toBe(true);
  });

  it('should NOT detect escaped negative heading', () => {
    expect(isNegativeHeading('\\-# Not a heading')).toBe(false);
  });

  it('should NOT detect negative heading without space', () => {
    expect(isNegativeHeading('-#NoSpace')).toBe(false);
  });

  it('should NOT detect normal text', () => {
    expect(isNegativeHeading('Regular text')).toBe(false);
  });

  it('should NOT detect regular markdown heading', () => {
    expect(isNegativeHeading('# Regular heading')).toBe(false);
  });

  it('should handle empty string', () => {
    expect(isNegativeHeading('')).toBe(false);
  });
});

describe('addNegativeHeadingToken', () => {
  it('should add token to plain text', () => {
    expect(addNegativeHeadingToken('Hello world')).toBe('-# Hello world');
  });

  it('should add token to list item', () => {
    expect(addNegativeHeadingToken('- List item')).toBe('- -# List item');
    expect(addNegativeHeadingToken('* List item')).toBe('* -# List item');
    expect(addNegativeHeadingToken('+ List item')).toBe('+ -# List item');
  });

  it('should add token to numbered list', () => {
    expect(addNegativeHeadingToken('1. Numbered item')).toBe('1. -# Numbered item');
    expect(addNegativeHeadingToken('42. Item')).toBe('42. -# Item');
  });

  it('should add token to indented list', () => {
    expect(addNegativeHeadingToken('  - Indented')).toBe('  - -# Indented');
    expect(addNegativeHeadingToken('    1. Double')).toBe('    1. -# Double');
  });

  it('should handle text with leading spaces', () => {
    expect(addNegativeHeadingToken('  Text')).toBe('  -# Text');
  });

  it('should handle empty string', () => {
    expect(addNegativeHeadingToken('')).toBe('-# ');
  });

  it('should not double-add if already present', () => {
    expect(addNegativeHeadingToken('-# Already here')).toBe('-# Already here');
  });

  it('should replace native H1 heading marker', () => {
    expect(addNegativeHeadingToken('# H1 Heading')).toBe('-# H1 Heading');
  });

  it('should replace native H2 heading marker', () => {
    expect(addNegativeHeadingToken('## H2 Heading')).toBe('-# H2 Heading');
  });

  it('should replace native H6 heading marker', () => {
    expect(addNegativeHeadingToken('###### H6 Heading')).toBe('-# H6 Heading');
  });

  it('should replace native heading in list item', () => {
    expect(addNegativeHeadingToken('- # List heading')).toBe('- -# List heading');
  });

  it('should replace native heading with leading spaces', () => {
    expect(addNegativeHeadingToken('  ## Indented heading')).toBe('  -# Indented heading');
  });
});

describe('removeNegativeHeadingToken', () => {
  it('should remove token from simple heading', () => {
    expect(removeNegativeHeadingToken('-# Hello')).toBe('Hello');
  });

  it('should remove token with extra spaces', () => {
    expect(removeNegativeHeadingToken('-#  Hello')).toBe('Hello');
    expect(removeNegativeHeadingToken('-#   Multiple')).toBe('Multiple');
  });

  it('should remove token from list item', () => {
    expect(removeNegativeHeadingToken('- -# Item')).toBe('- Item');
    expect(removeNegativeHeadingToken('* -# Item')).toBe('* Item');
    expect(removeNegativeHeadingToken('+ -# Item')).toBe('+ Item');
  });

  it('should remove token from numbered list', () => {
    expect(removeNegativeHeadingToken('1. -# Item')).toBe('1. Item');
  });

  it('should remove token from indented list', () => {
    expect(removeNegativeHeadingToken('  - -# Item')).toBe('  - Item');
  });

  it('should preserve escaped token', () => {
    expect(removeNegativeHeadingToken('\\-# Escaped')).toBe('\\-# Escaped');
  });

  it('should handle text without token', () => {
    expect(removeNegativeHeadingToken('No token')).toBe('No token');
  });

  it('should handle empty string', () => {
    expect(removeNegativeHeadingToken('')).toBe('');
  });
});

describe('parseLineInfo', () => {
  it('should parse simple negative heading', () => {
    const info = parseLineInfo('-# Hello', 5);
    expect(info.lineNumber).toBe(5);
    expect(info.text).toBe('-# Hello');
    expect(info.isNegativeHeading).toBe(true);
    expect(info.isListItem).toBe(false);
  });

  it('should parse list item with negative heading', () => {
    const info = parseLineInfo('- -# Item', 0);
    expect(info.isNegativeHeading).toBe(true);
    expect(info.isListItem).toBe(true);
    expect(info.listItemPrefix).toBe('- ');
  });

  it('should parse indented list', () => {
    const info = parseLineInfo('  - -# Item', 0);
    expect(info.isListItem).toBe(true);
    expect(info.listItemPrefix).toBe('  - ');
  });

  it('should parse numbered list', () => {
    const info = parseLineInfo('1. -# Item', 0);
    expect(info.isListItem).toBe(true);
    expect(info.listItemPrefix).toBe('1. ');
  });

  it('should parse plain text', () => {
    const info = parseLineInfo('Regular text', 0);
    expect(info.isNegativeHeading).toBe(false);
    expect(info.isListItem).toBe(false);
  });

  it('should detect empty line', () => {
    const info = parseLineInfo('', 0);
    expect(info.isNegativeHeading).toBe(false);
    expect(info.text).toBe('');
  });
});

describe('getEligibleLines', () => {
  it('should return single line when no selection', () => {
    const editor = createMockEditor(['Line 1', 'Line 2', 'Line 3']);
    editor.setCursor(1, 0);
    
    const lines = getEligibleLines(editor as any);
    expect(lines).toHaveLength(1);
    expect(lines[0].lineNumber).toBe(1);
    expect(lines[0].text).toBe('Line 2');
  });

  it('should return selected lines', () => {
    const editor = createMockEditor(['Line 1', 'Line 2', 'Line 3']);
    editor.setSelection({ line: 0, ch: 0 }, { line: 2, ch: 6 });
    
    const lines = getEligibleLines(editor as any);
    expect(lines).toHaveLength(3);
    expect(lines[0].text).toBe('Line 1');
    expect(lines[2].text).toBe('Line 3');
  });

  it('should exclude empty lines in multiline selection', () => {
    const editor = createMockEditor(['Line 1', '', 'Line 3']);
    editor.setSelection({ line: 0, ch: 0 }, { line: 2, ch: 6 });
    
    const lines = getEligibleLines(editor as any);
    expect(lines).toHaveLength(2);
    expect(lines[0].text).toBe('Line 1');
    expect(lines[1].text).toBe('Line 3');
  });

  it('should include empty line for single-line selection', () => {
    const editor = createMockEditor(['Line 1', '', 'Line 3']);
    editor.setCursor(1, 0);
    
    const lines = getEligibleLines(editor as any);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('');
  });

  it('should exclude code block fence markers', () => {
    const editor = createMockEditor([
      'Normal text',
      '```',
      'code line',
      '```',
      'More text'
    ]);
    editor.setSelection({ line: 0, ch: 0 }, { line: 4, ch: 9 });
    
    const lines = getEligibleLines(editor as any);
    // Should exclude fence markers (```)
    expect(lines.some((l: any) => l.lineNumber === 1)).toBe(false);
    expect(lines.some((l: any) => l.lineNumber === 3)).toBe(false);
    // Line 2 (code line) is included for now - full code block detection requires syntax tree
    expect(lines.some((l: any) => l.lineNumber === 2)).toBe(true);
  });
});

describe('preserveListMarker', () => {
  it('should extract list marker from bullet list', () => {
    const marker = preserveListMarker('- Item text');
    expect(marker).toBe('- ');
  });

  it('should extract list marker from numbered list', () => {
    const marker = preserveListMarker('1. Item text');
    expect(marker).toBe('1. ');
  });

  it('should extract indented list marker', () => {
    const marker = preserveListMarker('  - Item');
    expect(marker).toBe('  - ');
  });

  it('should return null for non-list text', () => {
    const marker = preserveListMarker('Regular text');
    expect(marker).toBeNull();
  });

  it('should handle different bullet types', () => {
    expect(preserveListMarker('* Item')).toBe('* ');
    expect(preserveListMarker('+ Item')).toBe('+ ');
    expect(preserveListMarker('- Item')).toBe('- ');
  });

  it('should handle multi-digit numbers', () => {
    expect(preserveListMarker('42. Item')).toBe('42. ');
  });
});