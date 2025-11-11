// Test the actual transformation process
const { JSDOM } = require('jsdom');

// Create DOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.Text = dom.window.Text;
global.DocumentFragment = dom.window.DocumentFragment;
global.Range = dom.window.Range;
global.NodeFilter = dom.window.NodeFilter;

// Create test element
const block = document.createElement('p');
block.textContent = '-# First\n-# Second';

console.log('=== Initial State ===');
console.log('textContent:', JSON.stringify(block.textContent));
console.log('innerHTML:', block.innerHTML);

// Simulate the first transformation
const textNode = block.childNodes[0];
console.log('\n=== First Transformation ===');

// Create range for "First" content (after "-# ")
const range1 = document.createRange();
range1.setStart(textNode, 3); // After "-# "
range1.setEnd(textNode, 8);   // Before "\n"

console.log('Range1 content:', range1.toString());

// Extract the fragment
const fragment1 = range1.extractContents();
console.log('After extraction, textContent:', JSON.stringify(block.textContent));

// Remove the token "-# " from position 0
textNode.nodeValue = textNode.nodeValue.slice(3);
console.log('After token removal, textContent:', JSON.stringify(block.textContent));

// Create and insert heading element
const heading1 = document.createElement('div');
heading1.className = 'neg-heading neg-h1';
heading1.dataset.negHeading = 'true';
heading1.appendChild(fragment1);
range1.insertNode(heading1);

console.log('After heading insertion:');
console.log('  innerHTML:', block.innerHTML);
console.log('  textContent:', JSON.stringify(block.textContent));

// Try to remove the delimiter (newline after heading)
// This is where the bug might be...
const remainingText = textNode.nodeValue;
console.log('Remaining text node value:', JSON.stringify(remainingText));

if (remainingText && remainingText[0] === '\n') {
  textNode.nodeValue = remainingText.slice(1);
  console.log('After delimiter removal, textContent:', JSON.stringify(block.textContent));
}

console.log('\n=== Trying to find second heading ===');
// Now try to find the second heading
const walker = document.createTreeWalker(block, NodeFilter.SHOW_ALL);
let foundSecond = false;

while (walker.nextNode()) {
  const node = walker.currentNode;

  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.nodeValue || "";

    if (node.parentElement?.dataset?.negHeading === 'true') {
      console.log('Skipping text in already-processed heading:', JSON.stringify(value));
      continue;
    }

    console.log('Checking text node:', JSON.stringify(value));

    if (value.match(/^-#\s+/)) {
      console.log('Found second heading match!');
      foundSecond = true;
    }
  }

  if (node.nodeType === Node.ELEMENT_NODE && node.dataset?.negHeading === 'true') {
    console.log('Found existing heading element');
  }
}

console.log('\nSecond heading found:', foundSecond);

console.log('\n=== Final State ===');
console.log('Block innerHTML:', block.innerHTML);