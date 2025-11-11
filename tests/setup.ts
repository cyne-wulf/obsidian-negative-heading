// Jest setup file
import '@testing-library/jest-dom';

// Polyfill for JSDOM
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock the Obsidian environment
if (typeof global.window === 'undefined') {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.Element = dom.window.Element;
  global.Node = dom.window.Node;
  global.Text = dom.window.Text;
  global.DocumentFragment = dom.window.DocumentFragment;
}

// Mock the CodeMirror and EditorView classes
const mockEditorView = {
  state: {
    doc: {
      lineAt: jest.fn(),
      length: 1000,
    },
    visibleRanges: [],
  },
  visibleRanges: [],
  decorations: {
    map: jest.fn(),
    update: jest.fn(),
  },
};

// Mock DecorationSet
const MockDecorationSet = {
  map: jest.fn(),
  update: jest.fn(),
  iter: jest.fn(),
};

// Mock Decoration
const MockDecoration = {
  mark: jest.fn(() => ({})),
  widget: jest.fn(() => ({})),
};

// Mock the CodeMirror modules
jest.mock('@codemirror/state', () => ({
  RangeSetBuilder: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    finish: jest.fn(() => MockDecorationSet),
  })),
  StateEffect: {
    define: jest.fn(),
  },
}));

jest.mock('@codemirror/view', () => ({
  Decoration: MockDecoration,
  DecorationSet: MockDecorationSet,
  EditorView: jest.fn(() => mockEditorView),
  ViewPlugin: {
    fromClass: jest.fn(() => ({})),
  },
  ViewUpdate: {
    docChanged: false,
    viewportChanged: false,
  },
}));

jest.mock('@codemirror/language', () => ({
  syntaxTree: jest.fn(() => ({
    resolveInner: jest.fn(),
    length: 1000,
  })),
}));

// Mock CSS
const originalCreateElement = document.createElement;
document.createElement = function(tagName: string) {
  const element = originalCreateElement.call(this, tagName);
  
  // Mock getComputedStyle for CSS-related tests
  if (element.style) {
    element.style.getPropertyValue = jest.fn();
    element.style.setProperty = jest.fn();
    element.style.removeProperty = jest.fn();
  }
  
  return element;
};