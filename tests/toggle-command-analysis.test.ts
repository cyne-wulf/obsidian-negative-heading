/**
 * Unit tests for toggle command analysis algorithm
 * Tests the majority detection logic for determining SET vs UNSET operation
 */

import { describe, it, expect } from '@jest/globals';
import { analyzeLines } from '../src/commands/toggle-analysis';
import { LineInfo } from '../src/types';

// Helper to create line info objects
function createLineInfo(text: string, lineNumber: number): LineInfo {
  const isNeg = /^-#\s+/.test(text) || /^[\s]*([-*+]|\d+\.)\s+-#\s+/.test(text);
  const listMatch = text.match(/^([\s]*([-*+]|\d+\.)\s+)/);
  
  return {
    lineNumber,
    text,
    isNegativeHeading: isNeg,
    isEligible: true,
    isListItem: !!listMatch,
    listItemPrefix: listMatch?.[1],
    from: lineNumber * 100,
    to: lineNumber * 100 + text.length,
  };
}

describe('analyzeLines', () => {
  describe('SET operation (add tokens)', () => {
    it('should SET when all lines are regular text', () => {
      const lines = [
        createLineInfo('Line 1', 0),
        createLineInfo('Line 2', 1),
        createLineInfo('Line 3', 2),
      ];
      
      const result = analyzeLines(lines);
      expect(result.operation).toBe('SET');
      expect(result.negativeHeadingCount).toBe(0);
      expect(result.regularTextCount).toBe(3);
    });

    it('should SET when minority are negative headings', () => {
      const lines = [
        createLineInfo('-# Already heading', 0),
        createLineInfo('Regular text 1', 1),
        createLineInfo('Regular text 2', 2),
      ];
      
      const result = analyzeLines(lines);
      expect(result.operation).toBe('SET');
      expect(result.negativeHeadingCount).toBe(1);
      expect(result.regularTextCount).toBe(2);
    });

    it('should SET on 50/50 tie (default behavior)', () => {
      const lines = [
        createLineInfo('-# Heading 1', 0),
        createLineInfo('-# Heading 2', 1),
        createLineInfo('Regular text 1', 2),
        createLineInfo('Regular text 2', 3),
      ];
      
      const result = analyzeLines(lines);
      expect(result.operation).toBe('SET');
      expect(result.negativeHeadingCount).toBe(2);
      expect(result.regularTextCount).toBe(2);
    });
  });

  describe('UNSET operation (remove tokens)', () => {
    it('should UNSET when all lines are negative headings', () => {
      const lines = [
        createLineInfo('-# Heading 1', 0),
        createLineInfo('-# Heading 2', 1),
        createLineInfo('-# Heading 3', 2),
      ];
      
      const result = analyzeLines(lines);
      expect(result.operation).toBe('UNSET');
      expect(result.negativeHeadingCount).toBe(3);
      expect(result.regularTextCount).toBe(0);
    });

    it('should UNSET when majority are negative headings', () => {
      const lines = [
        createLineInfo('-# Heading 1', 0),
        createLineInfo('-# Heading 2', 1),
        createLineInfo('-# Heading 3', 2),
        createLineInfo('Regular text', 3),
      ];
      
      const result = analyzeLines(lines);
      expect(result.operation).toBe('UNSET');
      expect(result.negativeHeadingCount).toBe(3);
      expect(result.regularTextCount).toBe(1);
    });

    it('should UNSET when majority are negative headings (larger set)', () => {
      const lines = [
        createLineInfo('-# Heading 1', 0),
        createLineInfo('-# Heading 2', 1),
        createLineInfo('-# Heading 3', 2),
        createLineInfo('-# Heading 4', 3),
        createLineInfo('-# Heading 5', 4),
        createLineInfo('Regular text 1', 5),
        createLineInfo('Regular text 2', 6),
      ];
      
      const result = analyzeLines(lines);
      expect(result.operation).toBe('UNSET');
      expect(result.negativeHeadingCount).toBe(5);
      expect(result.regularTextCount).toBe(2);
    });
  });

  describe('Single line behavior', () => {
    it('should SET for single regular text line', () => {
      const lines = [createLineInfo('Single line', 0)];
      
      const result = analyzeLines(lines);
      expect(result.operation).toBe('SET');
      expect(result.negativeHeadingCount).toBe(0);
      expect(result.regularTextCount).toBe(1);
    });

    it('should UNSET for single negative heading line', () => {
      const lines = [createLineInfo('-# Single heading', 0)];
      
      const result = analyzeLines(lines);
      expect(result.operation).toBe('UNSET');
      expect(result.negativeHeadingCount).toBe(1);
      expect(result.regularTextCount).toBe(0);
    });
  });

  describe('List items', () => {
    it('should handle list items with negative headings', () => {
      const lines = [
        createLineInfo('- -# List heading 1', 0),
        createLineInfo('- -# List heading 2', 1),
        createLineInfo('- Regular list item', 2),
      ];
      
      const result = analyzeLines(lines);
      expect(result.operation).toBe('UNSET');
      expect(result.negativeHeadingCount).toBe(2);
      expect(result.regularTextCount).toBe(1);
    });

    it('should handle numbered list items', () => {
      const lines = [
        createLineInfo('1. -# Numbered heading', 0),
        createLineInfo('2. Regular item', 1),
        createLineInfo('3. Regular item', 2),
      ];
      
      const result = analyzeLines(lines);
      expect(result.operation).toBe('SET');
      expect(result.negativeHeadingCount).toBe(1);
      expect(result.regularTextCount).toBe(2);
    });

    it('should handle indented list items', () => {
      const lines = [
        createLineInfo('  - -# Indented heading', 0),
        createLineInfo('  - Regular item', 1),
      ];
      
      const result = analyzeLines(lines);
      expect(result.operation).toBe('SET');
      expect(result.negativeHeadingCount).toBe(1);
      expect(result.regularTextCount).toBe(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty lines array', () => {
      const lines: LineInfo[] = [];
      
      const result = analyzeLines(lines);
      expect(result.operation).toBe('SET'); // Default to SET
      expect(result.negativeHeadingCount).toBe(0);
      expect(result.regularTextCount).toBe(0);
      expect(result.totalLines).toBe(0);
    });

    it('should return correct total line count', () => {
      const lines = [
        createLineInfo('-# Heading', 0),
        createLineInfo('Text 1', 1),
        createLineInfo('Text 2', 2),
        createLineInfo('Text 3', 3),
      ];
      
      const result = analyzeLines(lines);
      expect(result.totalLines).toBe(4);
    });
  });

  describe('Percentage thresholds', () => {
    it('should UNSET at 51% negative headings', () => {
      const lines = [
        createLineInfo('-# H1', 0),
        createLineInfo('-# H2', 1),
        createLineInfo('-# H3', 2),
        createLineInfo('-# H4', 3),
        createLineInfo('-# H5', 4),
        createLineInfo('-# H6', 5),
        createLineInfo('T1', 6),
        createLineInfo('T2', 7),
        createLineInfo('T3', 8),
        createLineInfo('T4', 9),
      ];
      
      const result = analyzeLines(lines);
      expect(result.operation).toBe('UNSET');
      expect(result.negativeHeadingCount).toBe(6);
      expect(result.regularTextCount).toBe(4);
    });

    it('should SET at 49% negative headings', () => {
      const lines = [
        createLineInfo('-# H1', 0),
        createLineInfo('-# H2', 1),
        createLineInfo('-# H3', 2),
        createLineInfo('-# H4', 3),
        createLineInfo('T1', 4),
        createLineInfo('T2', 5),
        createLineInfo('T3', 6),
        createLineInfo('T4', 7),
        createLineInfo('T5', 8),
      ];
      
      const result = analyzeLines(lines);
      expect(result.operation).toBe('SET');
      expect(result.negativeHeadingCount).toBe(4);
      expect(result.regularTextCount).toBe(5);
    });
  });
});