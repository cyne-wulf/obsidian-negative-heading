/**
 * Comprehensive test environment setup for Negative Heading Plugin
 * Provides proper DOM environment and helper functions for all test modes
 */

import { JSDOM } from 'jsdom';

// Setup proper DOM environment with all required APIs
export function setupDOM(): void {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable'
  });

  // Assign DOM globals
  global.window = dom.window as any;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.Element = dom.window.Element;
  global.Node = dom.window.Node;
  global.Text = dom.window.Text;
  global.DocumentFragment = dom.window.DocumentFragment;
  global.Range = dom.window.Range;
  global.NodeFilter = dom.window.NodeFilter;

  // Additional global assignments for proper instanceof checks
  Object.assign(global, {
    HTMLParagraphElement: dom.window.HTMLParagraphElement,
    HTMLLIElement: dom.window.HTMLLIElement,
    HTMLDivElement: dom.window.HTMLDivElement,
    HTMLBRElement: dom.window.HTMLBRElement,
  });

  // Add createRange if not available
  if (!global.document.createRange) {
    global.document.createRange = () => new dom.window.Range();
  }

  // Add missing NodeFilter constants if not present
  if (!global.NodeFilter.SHOW_ALL) {
    Object.defineProperty(global.NodeFilter, 'SHOW_ALL', { value: -1 });
  }
  if (!global.NodeFilter.SHOW_TEXT) {
    Object.defineProperty(global.NodeFilter, 'SHOW_TEXT', { value: 4 });
  }
  if (!global.NodeFilter.SHOW_ELEMENT) {
    Object.defineProperty(global.NodeFilter, 'SHOW_ELEMENT', { value: 1 });
  }

  // Create TreeWalker implementation
  global.document.createTreeWalker = function(root: Node, whatToShow: number = -1) {
    let currentNode: Node = root; // Current node should start at root for compatibility
    const nodes: Node[] = [];

    // Collect all nodes based on whatToShow filter
    function collectNodes(node: Node) {
      // Check if node passes filter
      let passesFilter = false;
      if (whatToShow === -1 || whatToShow === NodeFilter.SHOW_ALL) {
        passesFilter = true;
      } else if (whatToShow === NodeFilter.SHOW_TEXT && node.nodeType === Node.TEXT_NODE) {
        passesFilter = true;
      } else if (whatToShow === NodeFilter.SHOW_ELEMENT && node.nodeType === Node.ELEMENT_NODE) {
        passesFilter = true;
      } else if ((whatToShow & NodeFilter.SHOW_TEXT) && node.nodeType === Node.TEXT_NODE) {
        passesFilter = true;
      } else if ((whatToShow & NodeFilter.SHOW_ELEMENT) && node.nodeType === Node.ELEMENT_NODE) {
        passesFilter = true;
      }

      if (passesFilter) {
        nodes.push(node);
      }

      // Always recurse into children
      for (let child of Array.from(node.childNodes)) {
        collectNodes(child);
      }
    }

    // Collect all descendant nodes, but not the root itself
    const children = Array.from(root.childNodes);
    for (let child of children) {
      collectNodes(child);
    }
    let currentIndex = -1; // Start at -1 so first nextNode() gets index 0

    return {
      root,
      whatToShow,
      filter: null,
      get currentNode() { return currentNode; }, // Use getter to return current value
      nextNode() {
        if (currentIndex + 1 < nodes.length) {
          currentIndex++;
          currentNode = nodes[currentIndex];
          return currentNode;
        }
        return null;
      },
      previousNode() {
        if (currentIndex > 0) {
          currentIndex--;
          currentNode = nodes[currentIndex];
          return currentNode;
        }
        return null;
      }
    };
  };

  // Mock computed styles
  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = function(element: Element) {
    const style = originalGetComputedStyle.call(this, element);
    // Add mock values for common properties
    return new Proxy(style, {
      get(target, prop) {
        if (prop === 'color') return 'rgb(128, 128, 128)';
        if (prop === 'fontSize') return '14px';
        if (prop === 'lineHeight') return '1.5';
        return target[prop as keyof CSSStyleDeclaration];
      }
    });
  };
}

// Helper function that matches the one in main.ts
export function matchesBlockSelector(element: any): boolean {
  const BLOCK_SELECTOR = "p, li";
  // More robust check that doesn't rely on instanceof
  return Boolean(
    element &&
      element.nodeType === 1 && // Element node
      typeof element.matches === "function" &&
      element.matches(BLOCK_SELECTOR),
  );
}

// Create a properly working mock plugin using actual implementation
export function createWorkingMockPlugin() {
  // Import the actual helper functions from main.ts
  const NEG_HEADING_TOKEN_REGEX = /^-#\s+/;
  const ESCAPED_NEG_HEADING_REGEX = /^\\-#\s+/; // Detect escaped syntax \-#
  const BLOCK_SELECTOR = "p, li";
  // NOTE: .callout removed - native headings work in callouts, so should negative headings
  const DISALLOWED_CONTAINER_SELECTOR = "pre, code, .math-block, .math";

  interface HeadingMatch {
    node: Text;
    offset: number;
    tokenLength: number;
  }

  type LineEndInfo =
    | { type: "newline"; node: Text; offset: number }
    | { type: "break"; node: Node }
    | { type: "end"; node: Node; offset: number };

  function findNextHeadingMatch(block: HTMLElement): HeadingMatch | null {
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_ALL);
    let atLineStart = true;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        if (
          element.dataset?.negHeading === "true" ||
          element.matches("code, pre, .math, .math-block")
        ) {
          continue;
        }
        if (element.tagName === "BR") {
          atLineStart = true;
        }
        continue;
      }

      const textNode = node as Text;
      if (
        textNode.parentElement?.closest(
          "code, pre, .math, .math-block, [data-neg-heading='true']",
        )
      ) {
        // Skip this text node without modifying atLineStart state
        // The state should be preserved for the next eligible text node
        continue;
      }

      const value = textNode.nodeValue ?? "";
      let i = 0;
      while (i < value.length) {
        const char = value[i];
        if (char === "\n") {
          atLineStart = true;
          i++;
          continue;
        }
        if (atLineStart) {
          // Check for heading token ONLY at the absolute start of a line
          // Skip the line if it starts with whitespace (indented)
          if (char === " " || char === "\t" || char === "\r") {
            // Indented content - skip to next line
            atLineStart = false;
            i++;
            continue;
          }
          const slice = value.slice(i);

          // Check for escaped syntax \-# first (matches native heading behavior)
          const escapedMatch = slice.match(ESCAPED_NEG_HEADING_REGEX);
          if (escapedMatch) {
            // This is escaped, skip it (like native \# doesn't render)
            atLineStart = false;
            i++;
            continue;
          }

          // Now check for normal heading token
          const match = slice.match(NEG_HEADING_TOKEN_REGEX);
          if (match) {
            return {
              node: textNode,
              offset: i,
              tokenLength: match[0].length,
            };
          }
          atLineStart = false;
        }
        i++;
      }
      atLineStart = value.endsWith("\n");
    }

    return null;
  }

  function findLineEnd(
    root: HTMLElement,
    startNode: Text,
    startOffset: number,
  ): LineEndInfo {
    let current: Node = startNode;
    let offset = startOffset;

    while (current) {
      if (current.nodeType === Node.TEXT_NODE) {
        const text = (current as Text).nodeValue ?? "";
        for (let i = offset; i < text.length; i++) {
          if (text[i] === "\n") {
            return { type: "newline", node: current as Text, offset: i };
          }
        }
        offset = text.length;
      }

      const next = getNextNodeWithin(root, current);
      if (!next) {
        break;
      }

      // Stop before block-level elements to prevent descending into nested lists
      if (next.nodeType === Node.ELEMENT_NODE) {
        const element = next as Element;
        const blockTags = ['UL', 'OL', 'BLOCKQUOTE', 'PRE', 'TABLE', 'HR'];
        if (blockTags.includes(element.tagName)) {
          // Found a block element - end the line here
          if (current.nodeType === Node.TEXT_NODE) {
            return {
              type: "end",
              node: current as Text,
              offset: ((current as Text).nodeValue ?? "").length,
            };
          }
          return { type: "end", node: current, offset: 0 };
        }
      }

      if (next.nodeName === "BR") {
        return { type: "break", node: next };
      }
      current = next;
      offset = current.nodeType === Node.TEXT_NODE ? 0 : 0;
    }

    if (current.nodeType === Node.TEXT_NODE) {
      return {
        type: "end",
        node: current as Text,
        offset: ((current as Text).nodeValue ?? "").length,
      };
    }

    return { type: "end", node: root, offset: root.childNodes.length };
  }

  function getNextNodeWithin(root: Node, node: Node): Node | null {
    if (node.firstChild) {
      return node.firstChild;
    }
    let current: Node | null = node;
    while (current && current !== root) {
      if (current.nextSibling) {
        return current.nextSibling;
      }
      current = current.parentNode;
    }
    return null;
  }

  function removeTokenFromMatch(match: HeadingMatch) {
    const value = match.node.nodeValue ?? "";
    const before = value.slice(0, match.offset);
    const after = value.slice(match.offset + match.tokenLength);
    match.node.nodeValue = before + after;
  }

  function trimFragmentLeadingWhitespace(fragment: DocumentFragment) {
    while (fragment.firstChild) {
      const first = fragment.firstChild;
      if (first.nodeType === Node.TEXT_NODE) {
        const value = (first as Text).nodeValue ?? "";
        const trimmed = value.replace(/^\s+/, "");
        if (trimmed.length === 0) {
          fragment.removeChild(first);
          continue;
        }
        if (trimmed !== value) {
          (first as Text).nodeValue = trimmed;
        }
        break;
      }
      if (
        first.nodeType === Node.ELEMENT_NODE &&
        !(first as HTMLElement).textContent?.trim().length
      ) {
        fragment.removeChild(first);
        continue;
      }
      break;
    }
  }

  function fragmentHasVisibleContent(fragment: DocumentFragment): boolean {
    const walker = document.createTreeWalker(
      fragment,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    );
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeType === Node.TEXT_NODE) {
        if ((node.nodeValue ?? "").trim().length > 0) {
          return true;
        }
      } else if (
        node.nodeType === Node.ELEMENT_NODE &&
        (node as HTMLElement).tagName !== "BR"
      ) {
        return true;
      }
    }
    return false;
  }

  function removeDelimiterAfterHeading(info: LineEndInfo) {
    if (info.type === "newline") {
      const text = info.node.nodeValue ?? "";
      info.node.nodeValue = text.slice(0, info.offset) + text.slice(info.offset + 1);
    } else if (info.type === "break") {
      info.node.parentNode?.removeChild(info.node);
    }
  }

  // Return the mock plugin class
  return class WorkingMockNegativeHeadingPlugin {
    transformMarkdown(root: HTMLElement, ctx?: any) {
      const targets: HTMLElement[] = [];
      if (matchesBlockSelector(root)) {
        targets.push(root);
      }
      Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR))
        .forEach((block) => targets.push(block));
      targets.forEach((block) => this.tryPromoteBlock(block, ctx));
    }

    private tryPromoteBlock(block: HTMLElement, ctx?: any) {
      if (!this.isEligibleBlock(block)) {
        return;
      }

      // Check original markdown source for escaped negative headings
      if (ctx) {
        const sectionInfo = ctx.getSectionInfo(block);
        if (sectionInfo && this.isBlockEscapedInSource(sectionInfo, block)) {
          // This block contains escaped negative heading(s) - skip processing
          return;
        }
      }

      const doc = block.ownerDocument ?? document;
      let match = findNextHeadingMatch(block);

      while (match) {
        const range = doc.createRange();
        const tokenLength = match.tokenLength;
        const tokenStart = match.offset;
        range.setStart(match.node, tokenStart + tokenLength);

        const lineEnd = findLineEnd(block, match.node, tokenStart + tokenLength);
        if (lineEnd.type === "break") {
          range.setEndAfter(lineEnd.node);
        } else {
          range.setEnd(lineEnd.node, lineEnd.offset);
        }

        const fragment = range.extractContents();
        removeTokenFromMatch(match);
        trimFragmentLeadingWhitespace(fragment);

        if (!fragmentHasVisibleContent(fragment)) {
          match = findNextHeadingMatch(block);
          continue;
        }

        const headingEl = this.createHeadingElement(doc, fragment);
        range.insertNode(headingEl);

        // Apply inline styles for list items (fallback for CSS loading issues)
        if (headingEl.closest('li')) {
          headingEl.style.display = 'inline-block';
          headingEl.style.marginBlock = '0';
          headingEl.style.marginInlineStart = '0';
          headingEl.style.verticalAlign = 'baseline';
        }

        removeDelimiterAfterHeading(lineEnd);
        match = findNextHeadingMatch(block);
      }
    }

    private isBlockEscapedInSource(sectionInfo: any, block: HTMLElement): boolean {
      // Extract original source text and line boundaries
      const { text, lineStart, lineEnd } = sectionInfo;
      const lines = text.split('\n');

      // Get the text content of the block to match it with source lines
      const blockText = block.textContent?.trim() || '';

      // Check each line in the section for escaped negative heading syntax
      for (let i = lineStart; i <= lineEnd && i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Check if this line starts with escaped negative heading
        if (ESCAPED_NEG_HEADING_REGEX.test(trimmedLine)) {
          // Verify this line corresponds to our block by checking content
          // Remove the escape and token to see if it matches block content
          const contentAfterToken = trimmedLine.replace(ESCAPED_NEG_HEADING_REGEX, '').trim();
          if (blockText.includes(contentAfterToken) || contentAfterToken.includes(blockText)) {
            return true;
          }
        }
      }

      return false;
    }

    private isEligibleBlock(block: HTMLElement): boolean {
      // More robust check that doesn't rely on instanceof
      if (!block || block.nodeType !== 1) {
        return false;
      }
      if (block.dataset?.negHeading === "true") {
        return false;
      }
      if (block.closest && block.closest(DISALLOWED_CONTAINER_SELECTOR)) {
        return false;
      }
      if (block.matches && block.matches(DISALLOWED_CONTAINER_SELECTOR)) {
        return false;
      }
      return Boolean(block.textContent && block.textContent.length);
    }

    private createHeadingElement(
      doc: Document,
      content: DocumentFragment,
    ): HTMLElement {
      const headingEl = doc.createElement("div");
      headingEl.classList.add("neg-heading", "neg-h1");
      headingEl.dataset.negHeading = "true";
      headingEl.setAttribute("role", "heading");
      headingEl.setAttribute("aria-level", "7");
      headingEl.appendChild(content);
      return headingEl;
    }
  };
}