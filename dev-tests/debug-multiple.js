// Debug multiple heading transformation
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Setup DOM
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

// Add TreeWalker
global.document.createTreeWalker = function(root, whatToShow = -1) {
  let currentNode = root;
  const nodes = [];

  function collectNodes(node) {
    if (whatToShow === -1 || whatToShow === NodeFilter.SHOW_ALL) {
      nodes.push(node);
    } else if (whatToShow === NodeFilter.SHOW_TEXT && node.nodeType === Node.TEXT_NODE) {
      nodes.push(node);
    } else if (whatToShow === NodeFilter.SHOW_ELEMENT && node.nodeType === Node.ELEMENT_NODE) {
      nodes.push(node);
    } else if ((whatToShow & NodeFilter.SHOW_TEXT) && node.nodeType === Node.TEXT_NODE) {
      nodes.push(node);
    } else if ((whatToShow & NodeFilter.SHOW_ELEMENT) && node.nodeType === Node.ELEMENT_NODE) {
      nodes.push(node);
    }

    for (let child of Array.from(node.childNodes)) {
      collectNodes(child);
    }
  }

  collectNodes(root);
  let currentIndex = 0;

  return {
    root,
    whatToShow,
    filter: null,
    currentNode,
    nextNode() {
      if (currentIndex < nodes.length - 1) {
        currentIndex++;
        currentNode = nodes[currentIndex];
        return currentNode;
      }
      return null;
    }
  };
};

// Load plugin code
const pluginCode = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
eval(pluginCode);

if (typeof NegativeHeadingPlugin !== 'undefined') {
  console.log('=== Testing Multiple Heading Transformation ===\n');

  const plugin = new NegativeHeadingPlugin();
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
    console.log(`  Heading ${i+1}:`, {
      tagName: h.tagName,
      className: h.className,
      textContent: JSON.stringify(h.textContent),
      dataset: h.dataset
    });
  });

  // Also check remaining text
  console.log('\nRemaining text nodes:');
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let node;
  let count = 0;
  while (node = walker.nextNode()) {
    if (node.parentElement?.dataset?.negHeading !== 'true') {
      count++;
      console.log(`  Text ${count}:`, JSON.stringify(node.nodeValue));
    }
  }
} else {
  console.log('Plugin class not found');
}