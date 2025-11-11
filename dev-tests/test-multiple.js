// Test multiple headings issue
const { JSDOM } = require('jsdom');

// Create DOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;
global.Text = dom.window.Text;
global.DocumentFragment = dom.window.DocumentFragment;
global.Range = dom.window.Range;
global.NodeFilter = dom.window.NodeFilter;

// Constants
const NEG_HEADING_TOKEN_REGEX = /^-#\s+/;

// Create test element
const block = document.createElement('p');
block.textContent = '-# First\n-# Second';

console.log('Initial block:');
console.log('textContent:', JSON.stringify(block.textContent));
console.log('innerHTML:', block.innerHTML);
console.log('childNodes:', block.childNodes.length);

// Try to find matches manually
const walker = document.createTreeWalker(block, NodeFilter.SHOW_ALL);
let atLineStart = true;
let matches = [];

while (walker.nextNode()) {
  const node = walker.currentNode;

  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.nodeValue || "";
    console.log('\nText node value:', JSON.stringify(value));

    let i = 0;
    while (i < value.length) {
      const char = value[i];
      console.log(`  Position ${i}: char="${char}" (code: ${char.charCodeAt(0)}) atLineStart=${atLineStart}`);

      if (char === "\n") {
        console.log('    -> Found newline, setting atLineStart=true');
        atLineStart = true;
        i++;
        continue;
      }

      if (atLineStart) {
        if (char === " " || char === "\t" || char === "\r") {
          console.log('    -> Found whitespace at line start, skipping line');
          atLineStart = false;
          i++;
          continue;
        }

        const slice = value.slice(i);
        const match = slice.match(NEG_HEADING_TOKEN_REGEX);
        if (match) {
          console.log(`    -> Found match! "${match[0]}" at position ${i}`);
          matches.push({ offset: i, length: match[0].length });
        }
        atLineStart = false;
      }
      i++;
    }
  }
}

console.log('\nTotal matches found:', matches.length);
matches.forEach((m, idx) => {
  console.log(`  Match ${idx + 1}: offset=${m.offset}, length=${m.length}`);
});