import { setupDOM, createWorkingMockPlugin } from './test-environment';

describe('Debug Multiple Headings', () => {
  let plugin: any;

  beforeEach(() => {
    setupDOM();
    const MockPlugin = createWorkingMockPlugin();
    plugin = new MockPlugin();
  });

  test('detailed multiple heading debug', () => {
    // Ensure we're using the right document
    const block = global.document.createElement('p');
    block.textContent = '-# First\n-# Second';

    console.log('\n=== BEFORE TRANSFORMATION ===');
    console.log('textContent:', JSON.stringify(block.textContent));
    console.log('innerHTML:', block.innerHTML);
    console.log('childNodes.length:', block.childNodes.length);

    // Check if block matches selector
    const BLOCK_SELECTOR = "p, li";
    console.log('\nBlock matches selector:', block.matches(BLOCK_SELECTOR));
    console.log('Block tagName:', block.tagName);
    console.log('Block instanceof HTMLElement:', block instanceof HTMLElement);

    // Transform
    console.log('\nCalling transformMarkdown...');
    plugin.transformMarkdown(block);

    console.log('\n=== AFTER TRANSFORMATION ===');
    console.log('innerHTML:', block.innerHTML);
    console.log('childNodes.length:', block.childNodes.length);

    // List all child nodes
    console.log('\nChild nodes:');
    Array.from(block.childNodes).forEach((node, i) => {
      if (node.nodeType === Node.TEXT_NODE) {
        console.log(`  [${i}] TEXT: "${(node as Text).nodeValue}"`);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        console.log(`  [${i}] ELEMENT: <${el.tagName}> data-neg-heading="${el.dataset.negHeading}" textContent="${el.textContent}"`);
      }
    });

    const headings = block.querySelectorAll('[data-neg-heading="true"]');
    console.log('\nHeadings found:', headings.length);

    // Also try to manually call findNextHeadingMatch to see what it finds
    console.log('\n=== MANUAL DETECTION ===');
    const NEG_HEADING_TOKEN_REGEX = /^-#\s+/;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_ALL);
    let atLineStart = true;
    let matchCount = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeType === Node.TEXT_NODE) {
        const textNode = node as Text;
        const value = textNode.nodeValue ?? "";
        console.log(`Text node: "${value.substring(0, 20)}..."`);

        let i = 0;
        while (i < value.length) {
          const char = value[i];
          if (char === "\n") {
            console.log(`  Found newline at position ${i}`);
            atLineStart = true;
            i++;
            continue;
          }
          if (atLineStart) {
            const slice = value.slice(i);
            const match = slice.match(NEG_HEADING_TOKEN_REGEX);
            if (match) {
              matchCount++;
              console.log(`  MATCH ${matchCount} found at position ${i}: "${match[0]}"`);
            }
            atLineStart = false;
          }
          i++;
        }
      }
    }
    console.log(`Total matches found manually: ${matchCount}`);

    expect(headings.length).toBe(2);
  });
});