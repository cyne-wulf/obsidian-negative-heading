// Test: what does ESCAPED_NEG_HEADING_REGEX actually match?

// From source: /^\\-#\s+/
// In a regex literal, \\ is a literal backslash character
const ESCAPED_NEG_HEADING_REGEX = /^\\-#\s+/;

const s1 = '-# hello';                      // normal -# heading
const s2 = String.fromCharCode(92) + '-# hello'; // \-# hello (backslash + -#)

console.log('Regex source:', ESCAPED_NEG_HEADING_REGEX.source);
console.log('s1:', JSON.stringify(s1), 'matches:', ESCAPED_NEG_HEADING_REGEX.test(s1));
console.log('s2:', JSON.stringify(s2), 'matches:', ESCAPED_NEG_HEADING_REGEX.test(s2));

// So the issue: if /^\\-#\s+/ does NOT match '-# hello',
// then the escaped check was correct all along,
// but something else is causing the blockquote lines to fail
console.log('');
console.log('> -# hello test:');
const bqLine = '> -# hello';
const bqMatch = bqLine.match(/^((?:>\s*)+)/);
const quotePrefix = bqMatch ? bqMatch[1] : '';
const content = bqLine.slice(quotePrefix.length);
console.log('quotePrefix:', JSON.stringify(quotePrefix));
console.log('content:', JSON.stringify(content));
console.log('content escaped?', ESCAPED_NEG_HEADING_REGEX.test(content));
console.log('content has token?', /^-#\s+/.test(content));
