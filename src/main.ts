import { Plugin, MarkdownPostProcessorContext, Editor } from "obsidian";
import { syntaxTree } from "@codemirror/language";
import type { SyntaxNode } from "@lezer/common";
import { RangeSetBuilder } from "@codemirror/state";
import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
} from "@codemirror/view";
import { smartToggleNegativeHeading } from "./commands/toggle-command";

const NEG_HEADING_TOKEN_REGEX = /^-#\s+/;
const ESCAPED_NEG_HEADING_REGEX = /^\\-#\s+/; // Detect escaped syntax \-#
const TRAILING_SPACE_REGEX = /\s+$/;
const BLOCK_SELECTOR = "p, li";
// NOTE: .callout removed - native headings work in callouts, so should negative headings
const DISALLOWED_CONTAINER_SELECTOR = "pre, code, .math-block, .math";

const headingTextDecoration = Decoration.mark({
	class: "cm-neg-heading-text",
});
const headingTokenDecoration = Decoration.mark({
	class: "cm-neg-heading-token",
});
const headingTokenSoloDecoration = Decoration.mark({
	class: "cm-neg-heading-token cm-neg-heading-token-solo",
});

const negativeHeadingViewPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildDecorations(view);
		}

		update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged) {
				this.decorations = buildDecorations(update.view);
			}
		}
	},
	{
		decorations: (instance) => instance.decorations,
	},
);

export default class NegativeHeadingPlugin extends Plugin {
	onload() {
		this.registerMarkdownPostProcessor((element, ctx) => {
			this.transformMarkdown(element, ctx);
		});
		this.registerEditorExtension(negativeHeadingViewPlugin);
		this.applyCommentColorFallback();

		// Register toggle command
		this.addCommand({
			id: "toggle",
			name: "Smart toggle",
			editorCallback: (editor: Editor) => {
				smartToggleNegativeHeading(editor);
			},
		});
	}

	transformMarkdown(root: HTMLElement, ctx?: MarkdownPostProcessorContext) {
		const targets: HTMLElement[] = [];
		if (matchesBlockSelector(root)) {
			targets.push(root);
		}
		root
			.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)
			.forEach((block) => targets.push(block));
		targets.forEach((block) => this.tryPromoteBlock(block, ctx));
	}

	private tryPromoteBlock(block: HTMLElement, ctx?: MarkdownPostProcessorContext) {
		if (!this.isEligibleBlock(block)) {
			return;
		}

		// Build a set of escaped line contents for this block
		const escapedLineContents = new Set<string>();
		if (ctx) {
			const sectionInfo = ctx.getSectionInfo(block);
			if (sectionInfo) {
				const { text, lineStart, lineEnd } = sectionInfo;
				const lines = text.split('\n');

				// Find all escaped lines in this block's range
				for (let i = lineStart; i <= lineEnd && i < lines.length; i++) {
					const line = lines[i];
					const trimmedLine = line.trim();

					if (ESCAPED_NEG_HEADING_REGEX.test(trimmedLine)) {
						// This line is escaped, extract its content
						const content = trimmedLine.replace(ESCAPED_NEG_HEADING_REGEX, '').trim();
						escapedLineContents.add(content);
					}
				}
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

			// Clone the content to check if it's escaped
			const contentToCheck = range.cloneContents();
			const contentText = contentToCheck.textContent?.trim() || '';

			// Check if this specific line content is in our escaped set
			if (escapedLineContents.has(contentText)) {
				// This line is escaped - we need to remove the token to prevent
				// infinite loop, but we don't transform it into a heading
				removeTokenFromMatch(match);
				match = findNextHeadingMatch(block);
				continue;
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

			removeDelimiterAfterHeading(lineEnd);
			match = findNextHeadingMatch(block);
		}
	}


	private isEligibleBlock(block: HTMLElement): boolean {
		// More robust check that doesn't rely on instanceof
		if (!block || block.nodeType !== 1) {
			return false;
		}
		if (block.dataset?.negHeading === "true") {
			return false;
		}
		// Check if block is within a disallowed container
		if (block.closest && block.closest(DISALLOWED_CONTAINER_SELECTOR)) {
			return false;
		}
		// Also check if the block itself matches disallowed selectors
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

	private applyCommentColorFallback() {
		const root = document.body;
		if (!root) {
			return;
		}
		const commentColor = this.readCommentColor();
		if (!commentColor) {
			return;
		}
		root.style.setProperty("--neg-heading-comment-color", commentColor);
		this.register(() => {
			root.style.removeProperty("--neg-heading-comment-color");
		});
	}

	private readCommentColor(): string | null {
		const container = document.createElement("div");
		container.className = "cm-s-obsidian neg-heading-color-probe";

		const sample = document.createElement("span");
		sample.className = "cm-comment";
		sample.textContent = "Comment";

		container.appendChild(sample);
		document.body.appendChild(container);
		const color = window.getComputedStyle(sample).color;
		document.body.removeChild(container);
		return color || null;
	}
}

function buildDecorations(view: EditorView): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const tree = syntaxTree(view.state);

	for (const { from, to } of view.visibleRanges) {
		let pos = from;
		while (pos <= to) {
			const line = view.state.doc.lineAt(pos);
			
			// FIX 3: Enhanced code block detection
			// Check if ANY part of the line is within a code/math block
			// This prevents rendering inside code blocks more reliably
			let isLineInCodeBlock = false;
			for (let checkPos = line.from; checkPos <= line.to; checkPos++) {
				if (isInExcludedNode(tree, checkPos)) {
					isLineInCodeBlock = true;
					break;
				}
			}
			if (isLineInCodeBlock) {
				pos = line.to + 1;
				continue;
			}

			// Check if line is a list item (e.g., "- ", "* ", "+ ", "1. ", "2. ")
			const listMatch = line.text.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);

			if (listMatch) {
				// This is a list item - check content after marker
				const [, indent, marker, content] = listMatch;
				const markerOffset = indent.length + marker.length + 1; // +1 for space after marker

				// Skip escaped syntax in list items
				if (ESCAPED_NEG_HEADING_REGEX.test(content)) {
					// FIX 1: Don't skip to next line, just skip processing this one
					pos = line.to + 1;
					continue;
				}

				// Check if content starts with -#
				const tokenMatch = content.match(/^-#\s+/);
				if (tokenMatch) {
					// FIX 2: Check if we're in a callout/admonition
					// Callouts should be allowed (not excluded)
					const tokenFrom = line.from + markerOffset;
					const tokenTo = tokenFrom + tokenMatch[0].length;
					const remainder = content.slice(tokenMatch[0].length);
					const hasContent = remainder.trim().length > 0;
					const trailingSpaces = hasContent
						? remainder.match(TRAILING_SPACE_REGEX)?.[0].length ?? 0
						: remainder.length;
					const textTo = line.to - trailingSpaces;
					const tokenDecoration = hasContent
						? headingTokenDecoration
						: headingTokenSoloDecoration;
					if (tokenTo > tokenFrom) {
						builder.add(tokenFrom, tokenTo, tokenDecoration);
					}
					if (hasContent) {
						if (textTo > tokenTo) {
							builder.add(tokenTo, textTo, headingTextDecoration);
						}
					}
				}
			} else {
				// Not a list item - use regular processing
				// Skip indented lines - they should not be decorated as headings
				if (/^[\s\t]/.test(line.text)) {
					pos = line.to + 1;
					continue;
				}
				// Skip escaped syntax \-# (matches native \# behavior)
				if (ESCAPED_NEG_HEADING_REGEX.test(line.text)) {
					// FIX 1: Ensure we properly move to the next line
					pos = line.to + 1;
					continue;
				}
				// Only match if token is at the very start of the line
				const tokenMatch = line.text.match(/^-#\s+/);
				if (tokenMatch) {
					const tokenFrom = line.from;
					const tokenTo = tokenFrom + tokenMatch[0].length;
					const remainder = line.text.slice(tokenMatch[0].length);
					const hasContent = remainder.trim().length > 0;
					const trailingSpaces = hasContent
						? remainder.match(TRAILING_SPACE_REGEX)?.[0].length ?? 0
						: remainder.length;
					const textTo = line.to - trailingSpaces;
					const tokenDecoration = hasContent
						? headingTokenDecoration
						: headingTokenSoloDecoration;
					if (tokenTo > tokenFrom) {
						builder.add(tokenFrom, tokenTo, tokenDecoration);
					}
					if (hasContent) {
						if (textTo > tokenTo) {
							builder.add(tokenTo, textTo, headingTextDecoration);
						}
					}
				}
			}
			// Move to next line
			if (line.to + 1 > view.state.doc.length) {
				break;
			}
			pos = line.to + 1;
		}
	}

	return builder.finish();
}

function isInExcludedNode(tree: ReturnType<typeof syntaxTree>, pos: number): boolean {
	let node: SyntaxNode | null = tree.resolveInner(
		Math.max(0, Math.min(pos, tree.length - 1)),
		-1,
	);
	while (node) {
		const name = node.type.name;
		// FIX 3: More comprehensive code block detection
		// Check for various code block node types
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
		// FIX 2: Do NOT exclude Callout/Admonition nodes
		// Negative headings should render in callouts just like native headings do
		// (Callouts are NOT in the exclusion list)
		node = node.parent;
	}
	return false;
}

function matchesBlockSelector(element: HTMLElement): boolean {
	// More robust check that doesn't rely on instanceof
	return Boolean(
		element &&
			element.nodeType === 1 && // Element node
			typeof element.matches === "function" &&
			element.matches(BLOCK_SELECTOR),
	);
}

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
				element.dataset.negHeading === "true" ||
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
					// Indented content - skip to next line or end
					atLineStart = false;
					// Skip the entire indented line
					while (i < value.length && value[i] !== "\n") {
						i++;
					}
					// Don't increment again - the newline will be handled in the next iteration
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
		// Keep text before the newline, skip the newline character
		info.node.nodeValue = text.slice(0, info.offset) + text.slice(info.offset + 1);
	} else if (info.type === "break") {
		info.node.parentNode?.removeChild(info.node);
	}
}
