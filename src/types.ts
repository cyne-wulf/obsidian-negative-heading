/**
 * Type definitions for the toggle command
 */

import { EditorPosition } from 'obsidian';

/**
 * Information about a parsed line
 */
export interface LineInfo {
  lineNumber: number;
  text: string;
  isNegativeHeading: boolean;
  isEligible: boolean;
  isListItem: boolean;
  listItemPrefix?: string;
  from: number;
  to: number;
}

/**
 * Analysis result for determining SET vs UNSET operation
 */
export interface AnalysisResult {
  operation: 'SET' | 'UNSET';
  totalLines: number;
  negativeHeadingCount: number;
  regularTextCount: number;
}

/**
 * Editor state to save and restore
 */
export interface EditorState {
  cursor: EditorPosition;
  selection?: {
    anchor: EditorPosition;
    head: EditorPosition;
  };
}

/**
 * Minimal shape for the syntax tree nodes we traverse.
 * Helps avoid depending directly on @lezer/common types.
 */
export interface SyntaxNodeLike {
  type: { name: string };
  parent: SyntaxNodeLike | null;
}
