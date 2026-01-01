/**
 * Utility functions for the smart toggle command
 */

import { Editor } from 'obsidian';
import { EditorView } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { LineInfo, SyntaxNodeLike } from '../types';

// Type extension for accessing CodeMirror 6 editor instance
interface EditorWithCM extends Editor {
  cm: EditorView;
}

// Regex patterns for detection
// Note: Allow leading whitespace for toggle command (user might have indented text)
// The rendering logic in main.ts will skip indented content anyway
const NEG_HEADING_TOKEN = /^(\s*)-#\s+/;
const NEG_HEADING_IN_LIST = /^([\s]*([-*+]|\d+\.)\s+)-#\s+/;
const ESCAPED_NEG_HEADING = /^\\-#/;
const LIST_ITEM_PREFIX = /^([\s]*([-*+]|\d+\.)\s+)/;

/**
 * Check if a line contains a negative heading token
 */
export function isNegativeHeading(text: string): boolean {
  // Don't match escaped tokens
  if (ESCAPED_NEG_HEADING.test(text)) {
    return false;
  }
  
  // Check for negative heading in list or at line start
  return NEG_HEADING_TOKEN.test(text) || NEG_HEADING_IN_LIST.test(text);
}

/**
 * Add negative heading token to a line
 * Also strips native Markdown heading markers (# ## ### etc.)
 */
export function addNegativeHeadingToken(text: string): string {
  // Don't double-add if already present
  if (isNegativeHeading(text)) {
    return text;
  }

  // Check if it's a list item
  const listMatch = text.match(LIST_ITEM_PREFIX);
  if (listMatch) {
    const prefix = listMatch[1];
    let content = text.slice(prefix.length);

    // Strip native heading markers from list item content
    content = content.replace(/^#{1,6}\s+/, '');

    return `${prefix}-# ${content}`;
  }

  // Preserve leading whitespace for non-list items
  // Even though the rendering logic will skip indented content,
  // the toggle command should allow it for user convenience
  const leadingSpaces = text.match(/^(\s*)/)?.[1] || '';
  let content = text.slice(leadingSpaces.length);

  // Strip native Markdown heading markers (# through ######)
  content = content.replace(/^#{1,6}\s+/, '');

  return `${leadingSpaces}-# ${content}`;
}

/**
 * Remove negative heading token from a line
 */
export function removeNegativeHeadingToken(text: string): string {
  // Don't remove escaped tokens
  if (ESCAPED_NEG_HEADING.test(text)) {
    return text;
  }

  // If no token, return as-is
  if (!isNegativeHeading(text)) {
    return text;
  }

  // Handle list items with negative heading
  const listMatch = text.match(/^([\s]*([-*+]|\d+\.)\s+)-#\s+/);
  if (listMatch) {
    const prefix = listMatch[1];
    const afterToken = text.slice(listMatch[0].length);
    return `${prefix}${afterToken}`;
  }

  // Handle simple negative heading (with optional leading whitespace)
  const simpleMatch = text.match(/^(\s*)-#\s+/);
  if (simpleMatch) {
    const leadingSpaces = simpleMatch[1];
    const afterToken = text.slice(simpleMatch[0].length);
    return `${leadingSpaces}${afterToken}`;
  }

  return text;
}

/**
 * Parse a line and extract information about it
 */
export function parseLineInfo(text: string, lineNumber: number): LineInfo {
  const isNeg = isNegativeHeading(text);
  const listMatch = text.match(LIST_ITEM_PREFIX);
  
  return {
    lineNumber,
    text,
    isNegativeHeading: isNeg,
    isEligible: true,
    isListItem: !!listMatch,
    listItemPrefix: listMatch?.[1],
    from: lineNumber * 100, // Simplified offset calculation
    to: lineNumber * 100 + text.length,
  };
}

/**
 * Check if a position is inside an excluded context (code blocks, math, etc.)
 * Similar to isInExcludedNode in main.ts
 */
function isInExcludedNode(view: EditorView, lineNumber: number): boolean {
  try {
    const tree = syntaxTree(view.state);
    // Get the position at the start of the line
    const line = view.state.doc.line(lineNumber + 1); // CodeMirror lines are 1-indexed
    const pos = line.from;

    let node: SyntaxNodeLike | null = tree.resolveInner(pos, 1) as SyntaxNodeLike;
    while (node) {
      const name = node.type.name;
      // Check for code blocks, math blocks, HTML, frontmatter
      if (
        name.includes("Code") ||
        name.includes("code") ||
        name === "CodeBlock" ||
        name === "FencedCode" ||
        name === "IndentedCode" ||
        name === "InlineCode" ||
        name.includes("Math") ||
        name.includes("math") ||
        name.includes("HTML") ||
        name === "Frontmatter" ||
        name === "CodeText"
      ) {
        return true;
      }
      node = node.parent;
    }
    return false;
  } catch {
    // If we can't access the syntax tree, fail safe and allow the line
    return false;
  }
}

/**
 * Get eligible lines from the editor (respecting selection and filtering rules)
 */
export function getEligibleLines(editor: Editor): LineInfo[] {
  let startLine: number;
  let endLine: number;
  let isMultiLine: boolean;

  // Check if there's a selection using the actual Editor API
  // In Obsidian, when there's a selection, getCursor("from") and getCursor("to") differ
  const fromPos = editor.getCursor("from");
  const toPos = editor.getCursor("to");

  // Determine if there's a multi-line selection
  const hasSelection = fromPos.line !== toPos.line || fromPos.ch !== toPos.ch;

  if (hasSelection && fromPos.line !== toPos.line) {
    // Multi-line selection
    startLine = fromPos.line;
    endLine = toPos.line;
    isMultiLine = true;
  } else {
    // Single line (either no selection or selection on same line)
    const cursor = editor.getCursor();
    startLine = cursor.line;
    endLine = cursor.line;
    isMultiLine = false;
  }

  const lines: LineInfo[] = [];

  // Get the EditorView for syntax tree access
  const view = (editor as EditorWithCM).cm;

  for (let i = startLine; i <= endLine; i++) {
    const text = editor.getLine(i);

    // For multi-line selections, skip empty lines
    // For single-line, include even if empty
    if (isMultiLine && text.trim() === '') {
      continue;
    }

    // Skip code fence markers (```) and math block delimiters ($$)
    const trimmed = text.trim();
    if (trimmed === '```' || trimmed === '$$') {
      continue;
    }

    // Skip lines in code blocks, math blocks, etc. (when syntax tree available)
    if (view && isInExcludedNode(view, i)) {
      continue;
    }

    // Note: We don't skip indented lines here because the toggle command
    // should allow users to add/remove tokens even from indented text
    // The rendering logic in main.ts will skip indented content anyway

    const lineInfo = parseLineInfo(text, i);
    lines.push(lineInfo);
  }

  return lines;
}

/**
 * Extract list marker from a line (e.g., "- ", "1. ", "  * ")
 */
export function preserveListMarker(text: string): string | null {
  const match = text.match(LIST_ITEM_PREFIX);
  return match ? match[1] : null;
}
