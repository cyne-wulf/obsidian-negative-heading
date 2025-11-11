// Test the actual plugin with our fixes
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

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

// Load the actual plugin code
const pluginCode = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');

// Extract the transform logic (simplified for testing)
eval(pluginCode);

// Test multiple headings
console.log('=== Test: Multiple headings in same block ===');
const block = document.createElement('p');
block.textContent = '-# First\n-# Second';
console.log('Before:', JSON.stringify(block.textContent));

// Find the NegativeHeadingPlugin class and test it
if (typeof NegativeHeadingPlugin !== 'undefined') {
  const plugin = new NegativeHeadingPlugin();
  plugin.transformMarkdown(block);
} else {
  console.log('Plugin class not found, testing transform directly...');

  // Test the transform logic directly if we can't instantiate the plugin
  const targets = [];
  if (block.matches && block.matches('p, li')) {
    targets.push(block);
  }

  // Mock the transformation
  console.log('Attempting transformation...');
}

console.log('After:', block.innerHTML);

const headings = block.querySelectorAll('[data-neg-heading="true"]');
console.log('Headings found:', headings.length);
headings.forEach((h, i) => {
  console.log(`  Heading ${i+1}: "${h.textContent}"`);
});

// Test other cases
console.log('\n=== Test: List item ===');
const li = document.createElement('li');
li.textContent = '-# List heading';
console.log('Before:', JSON.stringify(li.textContent));

if (typeof NegativeHeadingPlugin !== 'undefined') {
  const plugin = new NegativeHeadingPlugin();
  plugin.transformMarkdown(li);
}

console.log('After:', li.innerHTML);
const liHeading = li.querySelector('[data-neg-heading="true"]');
console.log('Heading found:', liHeading ? 'Yes' : 'No');
if (liHeading) {
  console.log('  Content:', liHeading.textContent);