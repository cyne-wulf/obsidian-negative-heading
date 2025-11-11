#!/bin/bash

# Visual Regression Test Runner for Negative Heading Plugin
# This script runs comprehensive tests to verify all 200+ edge cases

set -e

echo "🚀 Starting Visual Regression Testing for Negative Heading Plugin"
echo "============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if dependencies are installed
echo -e "${BLUE}📦 Checking dependencies...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is required but not installed${NC}"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📥 Installing dependencies...${NC}"
    npm install
fi

# Function to run test suite
run_test_suite() {
    local suite_name=$1
    local test_pattern=$2
    local description=$3
    
    echo -e "\n${BLUE}🧪 Running $description${NC}"
    echo "----------------------------------------"
    
    if npm test -- --testPathPattern="$test_pattern" --verbose; then
        echo -e "${GREEN}✅ $suite_name - PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $suite_name - FAILED${NC}"
        return 1
    fi
}

# Track test results
total_tests=0
passed_tests=0
failed_tests=0

# Test suites
declare -a test_suites=(
    "Edge Cases|edge-cases|Edge Case Testing"
    "Visual Regression|visual|Visual Regression Testing"
)

# Run each test suite
for suite in "${test_suites[@]}"; do
    total_tests=$((total_tests + 1))
    
    IFS='|' read -r name pattern description <<< "$suite"
    
    if run_test_suite "$name" "$pattern" "$description"; then
        passed_tests=$((passed_tests + 1))
    else
        failed_tests=$((failed_tests + 1))
    fi
done

# Generate test report
echo -e "\n${BLUE}📊 Test Report Summary${NC}"
echo "========================"
echo -e "Total test suites run: ${total_tests}"
echo -e "${GREEN}Passed: ${passed_tests}${NC}"
echo -e "${RED}Failed: ${failed_tests}${NC}"

if [ $failed_tests -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Visual regression testing complete.${NC}"
    echo -e "${BLUE}Your plugin is ready for production with confidence.${NC}"
    exit 0
else
    echo -e "\n${RED}💥 Some tests failed. Please review the output above.${NC}"
    echo -e "${YELLOW}This prevents regression issues from being deployed.${NC}"
    exit 1
fi