import { Plugin } from "obsidian";
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

const NEG_HEADING_TOKEN_REGEX = /^-#\s+/;
const TRAILING_SPACE_REGEX = /\s+$/;
const BLOCK_SELECTOR = "p, li";
const DISALLOWED_CONTAINER_SELECTOR = "pre, code, .math-block, .math, .callout";

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
	async onload() {
		this.registerMarkdownPostProcessor((element) => {
			this.transformMarkdown(element);
		});
		this.registerEditorExtension(negativeHeadingViewPlugin);
		this.applyCommentColorFallback();
	}

	private transformMarkdown(root: HTMLElement) {
		const targets: HTMLElement[] = [];
		if (matchesBlockSelector(root)) {
			targets.push(root);
		}
		root
			.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)
			.forEach((block) => targets.push(block));
		targets.forEach((block) => this.tryPromoteBlock(block));
	}

	private tryPromoteBlock(block: HTMLElement) {
		if (!this.isEligibleBlock(block)) {
			return;
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
			removeDelimiterAfterHeading(lineEnd);
			match = findNextHeadingMatch(block);
		}
	}

	private isEligibleBlock(block: HTMLElement): boolean {
		if (!(block instanceof HTMLElement)) {
			return false;
		}
		if (block.dataset.negHeading === "true") {
			return false;
		}
		if (block.closest(DISALLOWED_CONTAINER_SELECTOR)) {
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
		container.style.position = "absolute";
		container.style.pointerEvents = "none";
		container.style.opacity = "0";
		container.style.height = "0";
		container.className = "cm-s-obsidian";

		const sample = document.createElement("span");
		sample.className = "cm-comment";
		sample.textContent = "comment";

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
				const tokenMatch = NEG_HEADING_TOKEN_REGEX.exec(line.text);
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
					if (
						tokenTo > tokenFrom &&
						!isInExcludedNode(tree, Math.min(line.to, tokenFrom + 1))
					) {
						builder.add(tokenFrom, tokenTo, tokenDecoration);
					}
					if (hasContent) {
						if (
							textTo > tokenTo &&
							!isInExcludedNode(tree, Math.max(tokenTo, textTo - 1))
						) {
							builder.add(tokenTo, textTo, headingTextDecoration);
						}
					}
				}
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
		if (
			name.includes("Code") ||
			name.includes("Math") ||
			name.includes("HTML") ||
			name === "Frontmatter"
		) {
			return true;
		}
		node = node.parent;
	}
	return false;
}

function matchesBlockSelector(element: HTMLElement): boolean {
	return Boolean(
		element instanceof HTMLElement &&
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
			atLineStart = textNode.nodeValue?.endsWith("\n") ?? false;
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
				if (char === " " || char === "\t" || char === "\r") {
					i++;
					continue;
				}
				const slice = value.slice(i);
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
		info.node.nodeValue = text.slice(info.offset + 1);
	} else if (info.type === "break") {
		info.node.parentNode?.removeChild(info.node);
	}
}
