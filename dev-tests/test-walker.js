// Test TreeWalker behavior after DOM manipulation
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.Node = dom.window.Node;
global.NodeFilter = dom.window.NodeFilter;

// Simulate state after first heading is processed
const block = document.createElement('p');
const heading = document.createElement('div');
heading.dataset.negHeading = 'true';
heading.textContent = 'First';

block.appendChild(heading);
block.appendChild(document.createTextNode('\n-# Second'));

console.log('DOM structure:');
console.log('innerHTML:', block.innerHTML);

console.log('\nTreeWalker iteration:');
const walker = document.createTreeWalker(block, NodeFilter.SHOW_ALL);

let nodeCount = 0;
while (walker.nextNode()) {
  const node = walker.currentNode;
  nodeCount++;

  if (node.nodeType === Node.ELEMENT_NODE) {
    console.log(`Node ${nodeCount}: ELEMENT <${node.tagName}> dataset.negHeading="${node.dataset?.negHeading}"`);
  } else if (node.nodeType === Node.TEXT_NODE) {
    console.log(`Node ${nodeCount}: TEXT "${JSON.stringify(node.nodeValue)}"`);

    // Check if parent is already processed
    if (node.parentElement?.dataset?.negHeading === 'true') {
      console.log('  -> Parent is already processed, would skip');
    } else {
      // Check for heading pattern
      const value = node.nodeValue || '';
      let atLineStart = true;
      let i = 0;

      while (i < value.length) {
        const char = value[i];

        if (char === '\n') {
          console.log(`  -> Position ${i}: newline, setting atLineStart=true`);
          atLineStart = true;
          i++;
          continue;
        }

        if (atLineStart) {
          console.log(`  -> Position ${i}: char="${char}" at line start`);

          // Check for indentation
          if (char === ' ' || char === '\t' || char === '\r') {
            console.log('     Whitespace at line start, skipping line');
            atLineStart = false;
          } else {
            // Check for heading token
            const slice = value.slice(i);
            if (slice.match(/^-#\s+/)) {
              console.log(`     MATCH FOUND at position ${i}!`);
            }
            atLineStart = false;
          }
        }
        i++;
      }
    }
  }
}