import { setupDOM, createWorkingMockPlugin } from './test-environment';

describe('Simple Debug Test', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('check if TreeWalker finds text nodes', () => {
    const block = document.createElement('p');
    block.textContent = '-# Test';

    // Check what children the P has
    console.log('P element childNodes:', block.childNodes.length);
    for (let i = 0; i < block.childNodes.length; i++) {
      const child = block.childNodes[i];
      console.log(`  Child ${i}: type=${child.nodeType}, value="${child.nodeValue}"`);
    }

    // Test TreeWalker directly
    console.log('createTreeWalker function:', typeof document.createTreeWalker);
    console.log('Is our mock?:', document.createTreeWalker.toString().includes('TreeWalker: Starting'));

    const walker = document.createTreeWalker(block, NodeFilter.SHOW_ALL);
    console.log('Walker object:', Object.keys(walker));
    const nodes: Node[] = [];

    while (walker.nextNode()) {
      const node = walker.currentNode;
      console.log('Walker returned:', node.nodeType, node.nodeValue);
      nodes.push(node);
    }

    console.log('TreeWalker found', nodes.length, 'nodes');
    nodes.forEach((node, i) => {
      console.log(`Node ${i}: type=${node.nodeType}, value="${node.nodeValue}"`);
    });

    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.some(n => n.nodeType === Node.TEXT_NODE)).toBe(true);
  });

  test('check if findNextHeadingMatch finds match', () => {
    const MockPlugin = createWorkingMockPlugin();
    const plugin = new MockPlugin();
    const block = document.createElement('p');
    block.textContent = '-# Test';

    // Test match finding
    const NEG_HEADING_TOKEN_REGEX = /^-#\s+/;
    const text = block.textContent!;

    console.log('Text content:', JSON.stringify(text));
    console.log('Regex test:', NEG_HEADING_TOKEN_REGEX.test(text));
    console.log('Match:', text.match(NEG_HEADING_TOKEN_REGEX));

    // Now test transformation
    plugin.transformMarkdown(block);

    console.log('After transformation:', block.innerHTML);
    const headings = block.querySelectorAll('[data-neg-heading="true"]');
    console.log('Headings found:', headings.length);

    expect(headings.length).toBe(1);
  });
});