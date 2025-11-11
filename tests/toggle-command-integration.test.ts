import { createMockEditor } from "./toggle-command-mocks";
import { smartToggleNegativeHeading } from "../src/commands/toggle-command";

describe("smartToggleNegativeHeading - Integration Tests", () => {
  describe("Single line operations", () => {
    test("should add token to regular text line", () => {
      const editor = createMockEditor({ lines: ["Hello world"] });
      editor.setCursor({ line: 0, ch: 5 });

      smartToggleNegativeHeading(editor);

      expect(editor.getLine(0)).toBe("-# Hello world");
      // Cursor should maintain relative position
      expect(editor.getCursor()).toEqual({ line: 0, ch: 8 }); // +3 for "-# "
    });

    test("should remove token from negative heading line", () => {
      const editor = createMockEditor({ lines: ["-# Hello world"] });
      editor.setCursor({ line: 0, ch: 8 });

      smartToggleNegativeHeading(editor);

      expect(editor.getLine(0)).toBe("Hello world");
      // Cursor should maintain relative position
      expect(editor.getCursor()).toEqual({ line: 0, ch: 5 }); // -3 for "-# "
    });

    test("should handle list item with cursor", () => {
      const editor = createMockEditor({ lines: ["- Regular item"] });
      editor.setCursor({ line: 0, ch: 10 });

      smartToggleNegativeHeading(editor);

      expect(editor.getLine(0)).toBe("- -# Regular item");
      expect(editor.getCursor()).toEqual({ line: 0, ch: 13 }); // +3 for "-# "
    });
  });

  describe("Multi-line selection operations", () => {
    test("should SET tokens when majority are regular text", () => {
      const editor = createMockEditor({
        lines: ["Line 1", "Line 2", "-# Line 3"]
      });
      editor.setSelection(
        { line: 0, ch: 0 },
        { line: 2, ch: 9 }
      );

      smartToggleNegativeHeading(editor);

      expect(editor.getLine(0)).toBe("-# Line 1");
      expect(editor.getLine(1)).toBe("-# Line 2");
      expect(editor.getLine(2)).toBe("-# Line 3");
    });

    test("should UNSET tokens when majority are negative headings", () => {
      const editor = createMockEditor({
        lines: ["-# Line 1", "-# Line 2", "Line 3"]
      });
      editor.setSelection(
        { line: 0, ch: 0 },
        { line: 2, ch: 6 }
      );

      smartToggleNegativeHeading(editor);

      expect(editor.getLine(0)).toBe("Line 1");
      expect(editor.getLine(1)).toBe("Line 2");
      expect(editor.getLine(2)).toBe("Line 3");
    });

    test("should SET on 50/50 tie (default behavior)", () => {
      const editor = createMockEditor({
        lines: ["-# Line 1", "Line 2"]
      });
      editor.setSelection(
        { line: 0, ch: 0 },
        { line: 1, ch: 6 }
      );

      smartToggleNegativeHeading(editor);

      expect(editor.getLine(0)).toBe("-# Line 1");
      expect(editor.getLine(1)).toBe("-# Line 2");
    });

    test("should preserve list markers when setting", () => {
      const editor = createMockEditor({
        lines: ["- Item 1", "- Item 2", "- -# Item 3"]
      });
      editor.setSelection(
        { line: 0, ch: 0 },
        { line: 2, ch: 13 }
      );

      smartToggleNegativeHeading(editor);

      expect(editor.getLine(0)).toBe("- -# Item 1");
      expect(editor.getLine(1)).toBe("- -# Item 2");
      expect(editor.getLine(2)).toBe("- -# Item 3");
    });

    test("should preserve list markers when unsetting", () => {
      const editor = createMockEditor({
        lines: ["- -# Item 1", "- -# Item 2", "- Item 3"]
      });
      editor.setSelection(
        { line: 0, ch: 0 },
        { line: 2, ch: 9 }
      );

      smartToggleNegativeHeading(editor);

      expect(editor.getLine(0)).toBe("- Item 1");
      expect(editor.getLine(1)).toBe("- Item 2");
      expect(editor.getLine(2)).toBe("- Item 3");
    });
  });

  describe("Cursor and selection preservation", () => {
    test("should adjust cursor position when adding token", () => {
      const editor = createMockEditor({ lines: ["Hello world"] });
      editor.setCursor({ line: 0, ch: 6 }); // After "Hello "

      smartToggleNegativeHeading(editor);

      expect(editor.getCursor()).toEqual({ line: 0, ch: 9 }); // +3 for "-# "
    });

    test("should adjust cursor position when removing token", () => {
      const editor = createMockEditor({ lines: ["-# Hello world"] });
      editor.setCursor({ line: 0, ch: 9 }); // After "-# Hello "

      smartToggleNegativeHeading(editor);

      expect(editor.getCursor()).toEqual({ line: 0, ch: 6 }); // -3 for "-# "
    });

    test("should preserve selection range when adding tokens", () => {
      const editor = createMockEditor({
        lines: ["Line 1", "Line 2"]
      });
      editor.setSelection(
        { line: 0, ch: 0 },
        { line: 1, ch: 6 }
      );

      smartToggleNegativeHeading(editor);

      const selection = editor.selectionRange!;
      expect(selection.anchor.line).toBe(0);
      expect(selection.head.line).toBe(1);
      // Selection end should adjust for added tokens
      expect(selection.head.ch).toBeGreaterThan(6);
    });

    test("should preserve selection range when removing tokens", () => {
      const editor = createMockEditor({
        lines: ["-# Line 1", "-# Line 2"]
      });
      editor.setSelection(
        { line: 0, ch: 3 },
        { line: 1, ch: 9 }
      );

      smartToggleNegativeHeading(editor);

      const selection = editor.selectionRange!;
      expect(selection.anchor.line).toBe(0);
      expect(selection.head.line).toBe(1);
      // Selection end should adjust for removed tokens
      expect(selection.head.ch).toBeLessThan(9);
    });
  });

  describe("Complex scenarios", () => {
    test("should handle numbered lists", () => {
      const editor = createMockEditor({
        lines: ["1. Item one", "2. Item two", "3. -# Item three"]
      });
      editor.setSelection(
        { line: 0, ch: 0 },
        { line: 2, ch: 17 }
      );

      smartToggleNegativeHeading(editor);

      expect(editor.getLine(0)).toBe("1. -# Item one");
      expect(editor.getLine(1)).toBe("2. -# Item two");
      expect(editor.getLine(2)).toBe("3. -# Item three");
    });

    test("should handle indented content", () => {
      const editor = createMockEditor({
        lines: ["  Indented line", "  -# Already negative"]
      });
      editor.setSelection(
        { line: 0, ch: 0 },
        { line: 1, ch: 20 }
      );

      smartToggleNegativeHeading(editor);

      expect(editor.getLine(0)).toBe("  -# Indented line");
      expect(editor.getLine(1)).toBe("  -# Already negative");
    });

    test("should handle mixed indented list items", () => {
      const editor = createMockEditor({
        lines: ["- Item 1", "  - Nested item", "- -# Item 2"]
      });
      editor.setSelection(
        { line: 0, ch: 0 },
        { line: 2, ch: 11 }
      );

      smartToggleNegativeHeading(editor);

      expect(editor.getLine(0)).toBe("- -# Item 1");
      expect(editor.getLine(1)).toBe("  - -# Nested item");
      expect(editor.getLine(2)).toBe("- -# Item 2");
    });

    test("should handle empty lines in selection", () => {
      const editor = createMockEditor({
        lines: ["Line 1", "", "Line 3"]
      });
      editor.setSelection(
        { line: 0, ch: 0 },
        { line: 2, ch: 6 }
      );

      smartToggleNegativeHeading(editor);

      expect(editor.getLine(0)).toBe("-# Line 1");
      expect(editor.getLine(1)).toBe(""); // Empty line unchanged
      expect(editor.getLine(2)).toBe("-# Line 3");
    });
  });

  describe("Edge cases", () => {
    test("should handle selection with no eligible lines", () => {
      const editor = createMockEditor({
        lines: ["", ""]
      });
      editor.setSelection(
        { line: 0, ch: 0 },
        { line: 1, ch: 0 }
      );

      smartToggleNegativeHeading(editor);

      expect(editor.getLine(0)).toBe("");
      expect(editor.getLine(1)).toBe("");
    });

    test("should handle escaped token", () => {
      const editor = createMockEditor({ lines: ["\\-# Not a heading"] });
      editor.setCursor({ line: 0, ch: 10 });

      smartToggleNegativeHeading(editor);

      // Should add token after escape sequence
      expect(editor.getLine(0)).toBe("-# \\-# Not a heading");
    });

    test("should handle whitespace-only line", () => {
      const editor = createMockEditor({
        lines: ["   ", "Line 2"]
      });
      editor.setSelection(
        { line: 0, ch: 0 },
        { line: 1, ch: 6 }
      );

      smartToggleNegativeHeading(editor);

      expect(editor.getLine(0)).toBe("   "); // Whitespace-only unchanged
      expect(editor.getLine(1)).toBe("-# Line 2");
    });
  });

});