// Quick debug script to understand what's happening
const { JSDOM } = require('jsdom');
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

// Add createRange if not available
if (!global.document.createRange) {
  global.document.createRange = () => new dom.window.Range();
}

// Import test environment
const { createWorkingMockPlugin } = require('./tests/test-environment');

const MockPlugin = createWorkingMockPlugin();
const plugin = new MockPlugin();

// Test case 1: Multiple headings
console.log('\n=== Test 1: Multiple headings ===');
const block1 = document.createElement('p');
block1.textContent = '-# First\n-# Second';
console.log('Input:', block1.textContent);
console.log('Initial HTML:', block1.innerHTML);

plugin.transformMarkdown(block1);

console.log('After transform HTML:', block1.innerHTML);
console.log('Headings found:', block1.querySelectorAll('[data-neg-heading="true"]').length);

// Test case 2: List item
console.log('\n=== Test 2: List item ===');
const li = document.createElement('li');
li.textContent = '-# List heading';
console.log('Input:', li.textContent);

plugin.transformMarkdown(li);

console.log('After transform:', li.innerHTML);
console.log('Heading found:', li.querySelector('[data-neg-heading="true"]') ? 'Yes' : 'No');

// Test case 3: Unicode
console.log('\n=== Test 3: Unicode ===');
const block3 = document.createElement('p');
block3.textContent = '-# Héllö Wörld 🔥';
console.log('Input:', block3.textContent);

plugin.transformMarkdown(block3);

console.log('After transform:', block3.innerHTML);
const heading3 = block3.querySelector('[data-neg-heading="true"]');
console.log('Heading text:', heading3?.textContent);