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

		const rawText = block.textContent ?? "";
		if (!hasHeadingToken(rawText)) {
			return;
		}

		const headingContent = this.extractHeadingContent(block);
		if (!headingContent) {
			return;
		}

		const headingEl = block.ownerDocument?.createElement("div");
		if (!headingEl) {
			return;
		}

		headingEl.classList.add("neg-heading", "neg-h1");
		headingEl.setAttribute("role", "heading");
		headingEl.setAttribute("aria-level", "7");
		headingEl.appendChild(headingContent);
		this.injectTokenSpan(headingEl);

		if (block.tagName === "LI") {
			block.insertBefore(headingEl, block.firstChild);
		} else {
			block.parentElement?.insertBefore(headingEl, block);
		}

		if (!block.textContent || !block.textContent.trim().length) {
			block.remove();
		}
	}

	private isEligibleBlock(block: HTMLElement): boolean {
		if (!(block instanceof HTMLElement)) {
			return false;
		}
		if (block.closest(DISALLOWED_CONTAINER_SELECTOR)) {
			return false;
		}
		return Boolean(block.textContent && block.textContent.length);
	}

	private extractHeadingContent(block: HTMLElement): DocumentFragment | null {
		const doc = block.ownerDocument ?? document;
		const fragment = doc.createDocumentFragment();
		let node: ChildNode | null = block.firstChild;
		let consumedSomething = false;

		while (node) {
			const next = node.nextSibling;

			if (isLineBreakNode(node)) {
				block.removeChild(node);
				break;
			}

			if (node.nodeType === Node.TEXT_NODE) {
				const textNode = node as Text;
				const newlineIndex = textNode.nodeValue?.indexOf("\n") ?? -1;
				if (newlineIndex !== -1) {
					const currentValue = textNode.nodeValue ?? "";
					const headingPart = currentValue.slice(0, newlineIndex);
					const restPart = currentValue.slice(newlineIndex + 1);
					textNode.nodeValue = headingPart;
					if (restPart.length) {
						const restNode = doc.createTextNode(restPart);
						block.insertBefore(restNode, next);
					}
					fragment.appendChild(textNode);
					consumedSomething = true;
					break;
				}
			}

			fragment.appendChild(node);
			consumedSomething = true;
			node = next;
		}

		if (!consumedSomething) {
			return null;
		}

		trimLeadingBreaks(block);
		return fragment;
	}

	private injectTokenSpan(block: HTMLElement) {
		const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
		while (walker.nextNode()) {
			const textNode = walker.currentNode as Text;
			const value = textNode.nodeValue ?? "";
			if (!value.length) {
				continue;
			}
			const match = value.match(NEG_HEADING_TOKEN_REGEX);
			if (match) {
				const tokenSpan = block.ownerDocument?.createElement("span");
				if (tokenSpan) {
					tokenSpan.classList.add("neg-heading-token");
					tokenSpan.setAttribute("aria-hidden", "true");
					tokenSpan.style.display = "none";
					tokenSpan.textContent = match[0];
					block.insertBefore(tokenSpan, textNode);
				}
				textNode.nodeValue = value.slice(match[0].length);
				break;
			}
			if (value.trim().length) {
				break;
			}
		}
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

function hasHeadingToken(text: string): boolean {
	const trimmed = text.replace(/^\s+/, "");
	return NEG_HEADING_TOKEN_REGEX.test(trimmed);
}

function matchesBlockSelector(element: HTMLElement): boolean {
	return Boolean(
		element instanceof HTMLElement &&
			typeof element.matches === "function" &&
			element.matches(BLOCK_SELECTOR),
	);
}

function isLineBreakNode(node: ChildNode): boolean {
	return (
		node.nodeName === "BR" ||
		(node.nodeType === Node.TEXT_NODE &&
			(node.nodeValue?.includes("\n") ?? false))
	);
}

function trimLeadingBreaks(block: HTMLElement) {
	while (block.firstChild && block.firstChild.nodeName === "BR") {
		block.removeChild(block.firstChild);
	}
}
