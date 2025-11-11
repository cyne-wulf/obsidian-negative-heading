#!/usr/bin/env node

/**
 * Simple test runner for Negative Heading Plugin edge cases
 * This provides immediate testing without complex setup
 */

const fs = require('fs');
const path = require('path');

// Import our test utilities
const { EDGE_CASE_TESTS, SimpleNegativeHeadingPlugin, runAllEdgeCaseTests, generateTestReport } = require('./tests/simple-tests.ts');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log('\n' + '='.repeat(60), 'cyan');
  log(title, 'bright');
  log('='.repeat(60), 'cyan');
}

function runQuickTest() {
  logSection('Quick Functionality Test');
  
  const plugin = new SimpleNegativeHeadingPlugin();
  
  // Test basic functionality
  const basicTest = EDGE_CASE_TESTS[0]; // 'basic-heading'
  const result = plugin.runTest(basicTest);
  
  if (result.pass) {
    log('✅ Basic functionality test PASSED', 'green');
    log(`   Input: "${basicTest.input}"`, 'blue');
    log(`   Output: Transformation working correctly`, 'blue');
  } else {
    log('❌ Basic functionality test FAILED', 'red');
    log(`   Error: ${result.message}`, 'red');
  }
  
  return result.pass;
}

function runFullTestSuite() {
  logSection('Full Edge Case Test Suite');
  
  const startTime = Date.now();
  const results = runAllEdgeCaseTests();
  const endTime = Date.now();
  
  // Summary
  log(`\n📊 Test Results Summary:`, 'bright');
  log(`   Total Tests: ${results.total}`, 'cyan');
  log(`   Passed: ${results.passed}`, 'green');
  log(`   Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`   Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`, 'cyan');
  log(`   Duration: ${endTime - startTime}ms`, 'cyan');
  
  // Category breakdown
  const edgeCases = results.results.filter(r => r.test.edgeCase);
  const coreTests = results.results.length - edgeCases.length;
  
  log(`\n📋 Test Categories:`, 'bright');
  log(`   Core Functionality: ${coreTests}`, 'green');
  log(`   Edge Cases: ${edgeCases.length}`, 'yellow');
  
  // Show failed tests
  if (results.failed > 0) {
    log(`\n❌ Failed Tests:`, 'red');
    results.results.forEach(({ test, result }) => {
      if (!result.pass) {
        log(`   • ${test.name}: ${result.message}`, 'red');
        if (test.edgeCase) log(`     (Edge Case)`, 'yellow');
      }
    });
  } else {
    log('\n🎉 All tests passed!', 'green');
    log('Your plugin is ready for production with confidence.', 'green');
  }
  
  // Save detailed report
  const report = generateTestReport(results);
  const reportPath = path.join(__dirname, 'test-results.md');
  fs.writeFileSync(reportPath, report);
  log(`\n📄 Detailed report saved to: ${reportPath}`, 'blue');
  
  return results.failed === 0;
}

function main() {
  const args = process.argv.slice(2);
  
  log('🚀 Visual Regression Testing for Negative Heading Plugin', 'bright');
  log('=====================================================', 'cyan');
  
  if (args.includes('--help') || args.includes('-h')) {
    log('\n📖 Usage:', 'bright');
    log('  node run-simple-tests.js          # Run full test suite');
    log('  node run-simple-tests.js --quick  # Run quick functionality test');
    log('  node run-simple-tests.js --edge   # Run only edge cases');
    log('  node run-simple-tests.js --help   # Show this help');
    return;
  }
  
  if (args.includes('--quick')) {
    const success = runQuickTest();
    process.exit(success ? 0 : 1);
  }
  
  if (args.includes('--edge')) {
    logSection('Edge Case Only Tests');
    const results = runAllEdgeCaseTests();
    const edgeCases = results.results.filter(r => r.test.edgeCase);
    const passed = edgeCases.filter(r => r.result.pass).length;
    const failed = edgeCases.length - passed;
    
    log(`\nEdge Case Results: ${passed}/${edgeCases.length} passed`, failed > 0 ? 'red' : 'green');
    process.exit(failed > 0 ? 1 : 0);
  }
  
  // Default: run full test suite
  const success = runFullTestSuite();
  process.exit(success ? 0 : 1);
}

// Check if this file is being run directly
if (require.main === module) {
  main();
}

module.exports = {
  EDGE_CASE_TESTS,
  SimpleNegativeHeadingPlugin,
  runAllEdgeCaseTests,
  generateTestReport
};