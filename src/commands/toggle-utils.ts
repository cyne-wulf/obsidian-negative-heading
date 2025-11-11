/**
 * Utility functions for the smart toggle command
 */

import { Editor } from 'obsidian';
import { LineInfo } from '../types';

// Regex patterns for detection
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
  
  // Check for leading whitespace
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
  
  for (let i = startLine; i <= endLine; i++) {
    const text = editor.getLine(i);
    
    // For multi-line selections, skip empty lines
    // For single-line, include even if empty
    if (isMultiLine && text.trim() === '') {
      continue;
    }
    
    // TODO: Check for code blocks using syntax tree
    // For now, skip lines that look like code fence markers
    if (text.trim() === '```') {
      continue;
    }
    
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