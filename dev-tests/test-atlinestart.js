// Test atLineStart state corruption
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.Node = dom.window.Node;
global.NodeFilter = dom.window.NodeFilter;
global.HTMLElement = dom.window.HTMLElement;

// Simulate state after first heading is processed
const block = document.createElement('p');
const heading = document.createElement('div');
heading.dataset.negHeading = 'true';
heading.textContent = 'First';  // This does NOT end with newline

block.appendChild(heading);
block.appendChild(document.createTextNode('\n-# Second'));

console.log('DOM structure:', block.innerHTML);

// Simulate the findNextHeadingMatch logic
const walker = document.createTreeWalker(block, NodeFilter.SHOW_ALL);
let atLineStart = true;  // We start at beginning of block

console.log('\nWalking through nodes:');
console.log('Initial atLineStart:', atLineStart);

while (walker.nextNode()) {
  const node = walker.currentNode;

  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node;
    console.log(`\nElement: <${element.tagName}> data-neg-heading="${element.dataset?.negHeading}"`);

    if (element.dataset?.negHeading === "true") {
      console.log('  -> Skipping already-processed heading element');
      continue;
    }
  } else if (node.nodeType === Node.TEXT_NODE) {
    const textNode = node;
    console.log(`\nText node: "${JSON.stringify(textNode.nodeValue)}"`);

    // Check if inside already-processed heading
    const parent = textNode.parentElement;
    if (parent && parent.closest && parent.closest("[data-neg-heading='true']")) {
      console.log('  -> Inside already-processed heading, skipping');
      console.log('  -> OLD atLineStart:', atLineStart);

      // BUG: This corrupts atLineStart state!
      atLineStart = textNode.nodeValue?.endsWith("\n") ?? false;

      console.log('  -> NEW atLineStart:', atLineStart, '(based on skipped text ending)');
      continue;
    }

    console.log('  -> Current atLineStart:', atLineStart);

    // Check for heading pattern
    const value = textNode.nodeValue || '';
    let i = 0;

    while (i < value.length) {
      const char = value[i];

      if (char === '\n') {
        atLineStart = true;
        i++;
        continue;
      }

      if (atLineStart) {
        if (char === ' ' || char === '\t' || char === '\r') {
          atLineStart = false;
        } else {
          const slice = value.slice(i);
          if (slice.match(/^-#\s+/)) {
            console.log(`  -> MATCH FOUND at position ${i}!`);
            console.log('     But atLineStart was:', atLineStart);
          }
          atLineStart = false;
        }
      }
      i++;
    }
  }
}

console.log('\nFinal atLineStart:', atLineStart);