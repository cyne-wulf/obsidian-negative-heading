/**
 * Mock utilities for testing the toggle command
 * These mocks simulate Obsidian's Editor API
 */

import { EditorPosition, EditorSelection } from 'obsidian';

export interface MockEditorOptions {
  lines: string[];
  cursor?: EditorPosition;
  selection?: EditorSelection;
  syntaxTree?: any;
}

/**
 * Create a mock Editor instance for testing
 */
export function createMockEditor(options: MockEditorOptions | string[]) {
  // Handle simple string array input
  const opts: MockEditorOptions = Array.isArray(options) 
    ? { lines: options }
    : options;

  const lines = opts.lines;
  let cursorPos: EditorPosition = opts.cursor || { line: 0, ch: 0 };
  let selectionRange: EditorSelection | null = opts.selection || null;

  // Calculate line offsets for position<->offset conversion
  const lineOffsets: number[] = [0];
  let totalOffset = 0;
  for (let i = 0; i < lines.length; i++) {
    totalOffset += lines[i].length + 1; // +1 for newline
    lineOffsets.push(totalOffset);
  }

  const editor = {
    // Content methods
    getValue(): string {
      return lines.join('\n');
    },

    setValue(text: string): void {
      lines.length = 0;
      lines.push(...text.split('\n'));
    },

    getLine(line: number): string {
      return lines[line] || '';
    },

    setLine(line: number, text: string): void {
      lines[line] = text;
    },

    lineCount(): number {
      return lines.length;
    },

    lastLine(): number {
      return lines.length - 1;
    },

    // Cursor methods
    somethingSelected(): boolean {
      return selectionRange !== null;
    },

    getCursor(type?: 'from' | 'to' | 'head' | 'anchor'): EditorPosition {
      if (selectionRange) {
        if (type === 'head') {
          return selectionRange.head;
        }
        if (type === 'anchor') {
          return selectionRange.anchor;
        }
        if (type === 'to') {
          return selectionRange.head;
        }
        if (type === 'from') {
          return selectionRange.anchor;
        }
        // Default: return head position when selection exists
        return selectionRange.head;
      }
      return cursorPos;
    },

    setCursor(pos: EditorPosition | number, ch?: number): void {
      if (typeof pos === 'number') {
        cursorPos = { line: pos, ch: ch || 0 };
      } else {
        cursorPos = pos;
      }
    },

    // Selection methods
    getSelection(): string {
      if (!selectionRange) return '';
      
      const from = selectionRange.anchor;
      const to = selectionRange.head;
      if (from.line === to.line) {
        return lines[from.line].substring(from.ch, to.ch);
      }
      
      const parts: string[] = [];
      for (let i = from.line; i <= to.line; i++) {
        if (i === from.line) {
          parts.push(lines[i].substring(from.ch));
        } else if (i === to.line) {
          parts.push(lines[i].substring(0, to.ch));
        } else {
          parts.push(lines[i]);
        }
      }
      return parts.join('\n');
    },

    setSelection(anchor: EditorPosition, head?: EditorPosition): void {
      const actualHead = head || anchor;
      selectionRange = {
        anchor,
        head: actualHead
      };
      // Update cursor to head position
      cursorPos = actualHead;
    },

    // Position conversion methods
    posToOffset(pos: EditorPosition): number {
      if (pos.line < 0 || pos.line >= lines.length) {
        return 0;
      }
      return lineOffsets[pos.line] + pos.ch;
    },

    offsetToPos(offset: number): EditorPosition {
      for (let i = 0; i < lineOffsets.length - 1; i++) {
        if (offset >= lineOffsets[i] && offset < lineOffsets[i + 1]) {
          return { line: i, ch: offset - lineOffsets[i] };
        }
      }
      const lastLine = lines.length - 1;
      return { line: lastLine, ch: lines[lastLine]?.length || 0 };
    },

    // Content replacement
    replaceRange(
      replacement: string,
      from: EditorPosition,
      to?: EditorPosition
    ): void {
      const toPos = to || from;
      
      // Handle single-line replacement
      if (from.line === toPos.line) {
        const line = lines[from.line];
        lines[from.line] = 
          line.substring(0, from.ch) + 
          replacement + 
          line.substring(toPos.ch);
        return;
      }
      
      // Handle multi-line replacement
      const firstPart = lines[from.line].substring(0, from.ch);
      const lastPart = lines[toPos.line].substring(toPos.ch);
      const newLines = replacement.split('\n');
      
      lines.splice(
        from.line,
        toPos.line - from.line + 1,
        firstPart + newLines[0],
        ...newLines.slice(1, -1),
        newLines[newLines.length - 1] + lastPart
      );
    },

    // Transaction support (for atomic operations)
    operation(fn: () => void): void {
      fn();
    },

    // For testing: track refresh calls
    _refreshCount: 0,
    refresh(): void {
      this._refreshCount++;
    },

    // Syntax tree access (for code block detection)
    syntaxTree: opts.syntaxTree || null,
    
    // Expose selection range for getEligibleLines
    get selectionRange() {
      return selectionRange;
    },
  };

  return editor;
}

/**
 * Create a mock syntax tree that marks certain lines as being in code blocks
 */
export function mockCodeBlockTree(codeBlockLines: number[]) {
  const lineSet = new Set(codeBlockLines);
  
  return {
    resolveInner(pos: number): any {
      // Very simplified - in reality would traverse tree structure
      let node: any = {
        type: { name: 'Document' },
        parent: null,
      };
      
      // Check if position is in a code block line
      for (const line of lineSet) {
        if (pos >= line * 100 && pos < (line + 1) * 100) {
          node = {
            type: { name: 'FencedCode' },
            parent: node,
          };
          break;
        }
      }
      
      return node;
    },
  };
}

/**
 * Helper to create LineInfo for testing transformations
 */
export function createMockLineInfo(
  text: string,
  lineNumber = 0,
  isEligible = true
) {
  return {
    lineNumber,
    text,
    from: lineNumber * 100,
    to: lineNumber * 100 + text.length,
    isNegativeHeading: /^-#\s+/.test(text) || /^[\s*+-]+([-*+]|\d+\.)\s+-#\s+/.test(text),
    isEligible,
    isListItem: /^[\s]*([-*+]|\d+\.)\s+/.test(text),
    listItemPrefix: text.match(/^([\s]*([-*+]|\d+\.)\s+)/)?.[1],
  };
}