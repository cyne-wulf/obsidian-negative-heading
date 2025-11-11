// Debug script for multiple heading transformation
import { setupDOM, createWorkingMockPlugin } from './tests/test-environment.js';

// Setup DOM
setupDOM();

const MockPlugin = createWorkingMockPlugin();
const plugin = new MockPlugin();

console.log('=== Testing Multiple Heading Transformation ===\n');

const block = document.createElement('p');
block.textContent = '-# First\n-# Second';

console.log('Initial DOM:');
console.log('  textContent:', JSON.stringify(block.textContent));
console.log('  innerHTML:', block.innerHTML);
console.log('');

// Transform
plugin.transformMarkdown(block);

console.log('After transformation:');
console.log('  innerHTML:', block.innerHTML);
console.log('');

const headings = block.querySelectorAll('[data-neg-heading="true"]');
console.log('Headings found:', headings.length);
headings.forEach((h, i) => {
    const el = h as HTMLElement;
    console.log(`  Heading ${i+1}:`, {
        tagName: el.tagName,
        className: el.className,
        textContent: JSON.stringify(el.textContent),
        dataset: el.dataset
    });
});

// Also check remaining text
console.log('\nRemaining DOM structure:');
function printNode(node: Node, indent = '') {
    if (node.nodeType === Node.TEXT_NODE) {
        console.log(indent + 'TEXT:', JSON.stringify(node.nodeValue));
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        console.log(indent + `<${el.tagName}>`, el.dataset?.negHeading ? '[data-neg-heading="true"]' : '');
        Array.from(node.childNodes).forEach(child => printNode(child, indent + '  '));
    }
}
printNode(block);