# Visual Regression Test Report

## Summary
- Total Tests: 43
- Passed: 37
- Failed: 6
- Success Rate: 86.0%

## Failed Tests

### heading-in-code
- Input: ````
-# Not a heading
````
- Expected: No transform
- Result: Should not transform, but got "```
TRANSFORMED: Not a heading
```"
- Type: Edge Case

### heading-in-math
- Input: `$$
-# Not a heading
$$`
- Expected: No transform
- Result: Should not transform, but got "$$
TRANSFORMED: Not a heading
$$"
- Type: Edge Case

### indented-heading
- Input: `  -# Indented`
- Expected: No transform
- Result: Should not transform, but got "TRANSFORMED: Indented"
- Type: Edge Case

### already-processed
- Input: `-# Already processed`
- Expected: No transform
- Result: Should not transform, but got "TRANSFORMED: Already processed"
- Type: Edge Case

### leading-tabs
- Input: `		-# Tabbed heading`
- Expected: No transform
- Result: Should not transform, but got "TRANSFORMED: Tabbed heading"
- Type: Edge Case

### mixed-tabs-spaces
- Input: `	 -# Mixed whitespace`
- Expected: No transform
- Result: Should not transform, but got "TRANSFORMED: Mixed whitespace"
- Type: Edge Case

## Test Categories

- Edge Cases: 39
- Core Functionality: 4

