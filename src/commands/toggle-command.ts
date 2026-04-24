import { Editor, EditorPosition } from "obsidian";
import { getEligibleLines } from "./toggle-utils";
import { analyzeLines } from "./toggle-analysis";
import { addNegativeHeadingToken, removeNegativeHeadingToken } from "./toggle-utils";

/**
 * Smart toggle command for negative headings
 * Analyzes selection and intelligently chooses to SET or UNSET tokens
 * based on majority detection
 */
export function smartToggleNegativeHeading(editor: Editor): void {
  // Get eligible lines from selection or cursor position
  const eligibleLines = getEligibleLines(editor);

  // If no eligible lines, exit early
  if (eligibleLines.length === 0) {
    return;
  }

  // Analyze lines to determine operation
  const analysis = analyzeLines(eligibleLines);

  // Store cursor/selection state BEFORE transformation
  const selectionRange = editor.somethingSelected()
    ? {
        anchor: editor.getCursor("anchor"),
        head: editor.getCursor("head"),
      }
    : null;
  const cursorPosBefore = selectionRange ? null : editor.getCursor();

  // Execute transformations (Obsidian batches these automatically)
  for (const lineInfo of eligibleLines) {
    const currentLine = editor.getLine(lineInfo.lineNumber);

    let newLine: string;
    if (analysis.operation === "SET") {
      newLine = addNegativeHeadingToken(currentLine);
    } else {
      newLine = removeNegativeHeadingToken(currentLine);
    }

    // Only update if line changed
    if (newLine !== currentLine) {
      editor.setLine(lineInfo.lineNumber, newLine);
    }
  }

  // Restore/adjust cursor or selection position
  if (selectionRange) {
    // Multi-line selection: adjust positions
    const anchorAdjusted = adjustPosition(
      selectionRange.anchor,
      eligibleLines,
      analysis.operation
    );
    const headAdjusted = adjustPosition(
      selectionRange.head,
      eligibleLines,
      analysis.operation
    );

    editor.setSelection(anchorAdjusted, headAdjusted);
  } else {
    // Single cursor: adjust position based on saved pre-transform cursor
    const adjustedPos = adjustPosition(
      cursorPosBefore!,
      eligibleLines,
      analysis.operation
    );

    editor.setCursor(adjustedPos);
  }
}

/**
 * Adjust cursor/selection position after transformation
 * Accounts for added/removed token length
 */
function adjustPosition(
  pos: EditorPosition,
  eligibleLines: Array<{ lineNumber: number; text: string }>,
  operation: "SET" | "UNSET"
): EditorPosition {
  // Check if position is on an eligible line
  const affectedLine = eligibleLines.find(
    (line) => line.lineNumber === pos.line
  );

  if (!affectedLine) {
    return pos; // Position not on an affected line, no adjustment needed
  }

  // Calculate offset based on operation
  const tokenLength = 3; // "-# " length
  const offset = operation === "SET" ? tokenLength : -tokenLength;

  // Adjust character position, but don't go negative or past line end
  const newCh = Math.max(0, pos.ch + offset);

  return {
    line: pos.line,
    ch: newCh,
  };
}