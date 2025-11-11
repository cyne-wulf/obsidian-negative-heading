/**
 * Analysis algorithm for determining SET vs UNSET operation
 * Uses majority detection: if >50% are negative headings, UNSET; otherwise SET
 */

import { LineInfo, AnalysisResult } from '../types';

/**
 * Analyze lines to determine whether to SET or UNSET negative heading tokens
 * 
 * Algorithm:
 * - Count negative headings vs regular text
 * - If >50% are negative headings: UNSET (remove tokens)
 * - If ≤50% are negative headings: SET (add tokens)
 * - On 50/50 tie: default to SET
 */
export function analyzeLines(lines: LineInfo[]): AnalysisResult {
  // Handle empty array
  if (lines.length === 0) {
    return {
      operation: 'SET',
      totalLines: 0,
      negativeHeadingCount: 0,
      regularTextCount: 0,
    };
  }

  // Count negative headings vs regular text
  let negativeHeadingCount = 0;
  let regularTextCount = 0;

  for (const line of lines) {
    if (line.isNegativeHeading) {
      negativeHeadingCount++;
    } else {
      regularTextCount++;
    }
  }

  const totalLines = lines.length;

  // Determine operation based on majority
  // If >50% are negative headings, UNSET (remove tokens)
  // Otherwise (≤50%), SET (add tokens)
  // This means on a 50/50 tie, we default to SET
  const operation = negativeHeadingCount > regularTextCount ? 'UNSET' : 'SET';

  return {
    operation,
    totalLines,
    negativeHeadingCount,
    regularTextCount,
  };
}