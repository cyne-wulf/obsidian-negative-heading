/**
 * Test utilities for DOM comparison and visual regression testing
 */

export interface TestElement {
  tagName: string;
  className?: string;
  textContent?: string;
  attributes?: Record<string, string>;
  children?: TestElement[];
}

export interface VisualTestCase {
  name: string;
  input: string;
  expected: TestElement;
  description?: string;
  edgeCase?: boolean;
}

/**
 * Creates a mock DOM environment that mimics Obsidian's rendering
 */
export function createMockDOM(): {
  document: Document;
  element: HTMLElement;
  body: HTMLElement;
} {
  // Create mock DOM without JSDOM to avoid TextEncoder issues
  const document = {
    createElement: (tagName: string): HTMLElement => {
      return {
        tagName: tagName.toUpperCase(),
        className: '',
        textContent: '',
        children: [],
        childNodes: [],
        parentNode: null,
        nextSibling: null,
        previousSibling: null,
        firstChild: null,
        lastChild: null,
        attributes: [],
        ownerDocument: document,
        nodeType: Node.ELEMENT_NODE,
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        insertBefore: jest.fn(),
        replaceChild: jest.fn(),
        removeAttribute: jest.fn(),
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
        hasAttribute: jest.fn(),
        matches: jest.fn(),
        closest: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(),
        getElementsByTagName: jest.fn(),
        cloneNode: jest.fn(),
        dataset: {},
        style: {
          getPropertyValue: jest.fn(),
          setProperty: jest.fn(),
          removeProperty: jest.fn()
        }
      } as any;
    },
    createTextNode: (text: string): Text => {
      return {
        nodeValue: text,
        textContent: text,
        nodeType: Node.TEXT_NODE,
        parentNode: null,
        nextSibling: null,
        previousSibling: null,
        firstChild: null,
        lastChild: null,
        childNodes: [],
        ownerDocument: document,
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        insertBefore: jest.fn(),
        replaceChild: jest.fn(),
        cloneNode: jest.fn()
      } as any;
    },
    createDocumentFragment: (): DocumentFragment => {
      return {
        nodeType: Node.DOCUMENT_FRAGMENT_NODE,
        childNodes: [],
        firstChild: null,
        lastChild: null,
        parentNode: null,
        nextSibling: null,
        previousSibling: null,
        ownerDocument: document,
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        insertBefore: jest.fn(),
        replaceChild: jest.fn(),
        cloneNode: jest.fn()
      } as any;
    },
    createRange: (): Range => {
      return {
        setStart: jest.fn(),
        setEnd: jest.fn(),
        setStartBefore: jest.fn(),
        setStartAfter: jest.fn(),
        setEndBefore: jest.fn(),
        setEndAfter: jest.fn(),
        collapse: jest.fn(),
        selectNodeContents: jest.fn(),
        extractContents: jest.fn(),
        insertNode: jest.fn(),
        surroundContents: jest.fn()
      } as any;
    },
    createTreeWalker: jest.fn(),
    body: {
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      style: {
        setProperty: jest.fn(),
        removeProperty: jest.fn()
      }
    } as any
  };

  const element = document.createElement('div');
  element.id = 'app';
  element.className = 'workspace';
  
  const body = document.body;

  return { document, element, body };
}

/**
 * Converts a DOM element to a TestElement structure for comparison
 */
export function elementToTestElement(element: Element | Node): TestElement {
  if (element.nodeType === Node.TEXT_NODE) {
    return {
      tagName: '#text',
      textContent: (element as Text).nodeValue || '',
    };
  }
  
  if (element.nodeType === Node.ELEMENT_NODE) {
    const el = element as Element;
    const children: TestElement[] = [];
    
    for (const child of el.childNodes) {
      children.push(elementToTestElement(child));
    }
    
    return {
      tagName: el.tagName.toLowerCase(),
      className: el.className || undefined,
      textContent: el.textContent || undefined,
      attributes: Object.fromEntries(
        Array.from(el.attributes).map(attr => [attr.name, attr.value])
      ),
      children: children.length > 0 ? children : undefined,
    };
  }
  
  return {
    tagName: '#unknown',
    textContent: '',
  };
}

/**
 * Compares two DOM structures and returns differences
 */
export function compareElements(expected: TestElement, actual: TestElement): {
  match: boolean;
  differences: string[];
} {
  const differences: string[] = [];
  
  // Check tag name
  if (expected.tagName !== actual.tagName) {
    differences.push(`Expected tag "${expected.tagName}", got "${actual.tagName}"`);
  }
  
  // Check class names
  const expectedClasses = (expected.className || '').split(' ').filter(c => c);
  const actualClasses = (actual.className || '').split(' ').filter(c => c);
  
  if (expectedClasses.length !== actualClasses.length) {
    differences.push(`Expected classes [${expectedClasses.join(', ')}], got [${actualClasses.join(', ')}]`);
  } else {
    expectedClasses.forEach(cls => {
      if (!actualClasses.includes(cls)) {
        differences.push(`Missing class: ${cls}`);
      }
    });
    actualClasses.forEach(cls => {
      if (!expectedClasses.includes(cls)) {
        differences.push(`Unexpected class: ${cls}`);
      }
    });
  }
  
  // Check text content (ignoring whitespace differences)
  const expectedText = (expected.textContent || '').trim();
  const actualText = (actual.textContent || '').trim();
  
  if (expectedText && actualText && expectedText !== actualText) {
    differences.push(`Text mismatch: expected "${expectedText}", got "${actualText}"`);
  }
  
  // Check children
  const expectedChildren = expected.children || [];
  const actualChildren = actual.children || [];
  
  if (expectedChildren.length !== actualChildren.length) {
    differences.push(`Expected ${expectedChildren.length} children, got ${actualChildren.length}`);
  } else {
    expectedChildren.forEach((child, index) => {
      if (index < actualChildren.length) {
        const result = compareElements(child, actualChildren[index]);
        if (!result.match) {
          differences.push(`Child ${index}: ${result.differences.join('; ')}`);
        }
      }
    });
  }
  
  return {
    match: differences.length === 0,
    differences,
  };
}

/**
 * Generates HTML string from TestElement for visual comparison
 */
export function testElementToHTML(element: TestElement): string {
  let html = '';
  
  if (element.tagName === '#text') {
    return element.textContent || '';
  }
  
  const attrs = [];
  if (element.className) {
    attrs.push(`class="${element.className}"`);
  }
  
  if (element.attributes) {
    Object.entries(element.attributes).forEach(([key, value]) => {
      if (key !== 'class') {
        attrs.push(`${key}="${value}"`);
      }
    });
  }
  
  const attrString = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
  html += `<${element.tagName}${attrString}>`;
  
  if (element.children) {
    element.children.forEach(child => {
      html += testElementToHTML(child);
    });
  } else if (element.textContent) {
    html += element.textContent;
  }
  
  html += `</${element.tagName}>`;
  
  return html;
}

/**
 * Creates a test scenario for a specific markdown input
 */
export function createTestScenario(
  name: string,
  input: string,
  expectedStructure: TestElement,
  description?: string,
  edgeCase = false
): VisualTestCase {
  return {
    name,
    input,
    expected: expectedStructure,
    description,
    edgeCase,
  };
}

/**
 * Helper to create heading elements for testing
 */
export function createHeadingElement(
  level = 1,
  text = 'Test Heading',
  classes = ['neg-heading']
): TestElement {
  return {
    tagName: 'div',
    className: [...classes, `neg-h${level}`].join(' '),
    attributes: {
      'data-neg-heading': 'true',
      'role': 'heading',
      'aria-level': '7'
    },
    children: [
      {
        tagName: '#text',
        textContent: text
      }
    ]
  };
}

/**
 * Assertion helper for DOM comparison in tests
 */
export function expectElementsToMatch(actual: Element, expected: TestElement) {
  const actualTestElement = elementToTestElement(actual);
  const result = compareElements(expected, actualTestElement);
  
  if (!result.match) {
    throw new Error(`DOM elements don't match:\n${result.differences.join('\n')}`);
  }
}

/**
 * Generates a visual snapshot string for debugging
 */
export function generateSnapshot(element: Element): string {
  const elementTestData = elementToTestElement(element);
  return testElementToHTML(elementTestData);
}

/**
 * Mock Obsidian plugin context for testing
 */
export function createMockPluginContext() {
  const mockApp = {
    workspace: {
      on: jest.fn(),
      off: jest.fn(),
    },
  };
  
  const mockPlugin = {
    app: mockApp,
    registerMarkdownPostProcessor: jest.fn(),
    registerEditorExtension: jest.fn(),
    register: jest.fn(),
    loadData: jest.fn(() => Promise.resolve({})),
    saveData: jest.fn(() => Promise.resolve()),
  };
  
  return { mockApp, mockPlugin };
}