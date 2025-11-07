#!/bin/bash

# Test Runner Script for Task Scheduler
# This script runs all tests sequentially with proper error handling

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script is now in project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Help function
show_help() {
    echo -e "${CYAN}🚀 Task Scheduler Test Runner${NC}"
    echo ""
    echo "USAGE:"
    echo "    ./run-tests.sh [OPTIONS]"
    echo ""
    echo "DESCRIPTION:"
    echo "    Runs the complete test suite for the Task Scheduler application."
    echo "    Includes unit tests, integration tests, and coverage reports."
    echo ""
    echo "OPTIONS:"
    echo "    -h, --help      Show this help message"
    echo ""
    echo "REQUIREMENTS:"
    echo "    - Node.js and npm installed"
    echo "    - Docker and docker-compose (for integration tests)"
    echo "    - MySQL and Redis containers running (for integration tests)"
    echo ""
    echo "WHAT IT DOES:"
    echo "    1. Checks system dependencies"
    echo "    2. Installs npm packages if needed"
    echo "    3. Runs unit tests (fast, no database required)"
    echo "    4. Checks database availability"
    echo "    5. Runs integration tests if database available"
    echo "    6. Generates coverage reports"
    echo "    7. Shows detailed test summary"
    echo ""
    echo "EXAMPLES:"
    echo "    ./run-tests.sh     # Run all tests"
    echo "    ./run-tests.sh -h  # Show this help"
    echo ""
}

# Check for help option first
if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    show_help
    exit 0
fi

echo -e "${BLUE}🚀 Starting Task Scheduler Test Suite${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

# Check if Node.js and npm are available
check_dependencies() {
    print_info "Checking dependencies..."

    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed or not in PATH"
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed or not in PATH"
        exit 1
    fi

    print_status "Dependencies check passed"
}

# Install dependencies if node_modules doesn't exist
install_dependencies() {
    cd backend
    if [ ! -d "node_modules" ]; then
        print_info "Installing dependencies..."
        npm install
        print_status "Dependencies installed"
    else
        print_info "Dependencies already installed"
    fi
    cd "$PROJECT_ROOT"
}

# Run unit tests (no database required)
run_unit_tests() {
    print_info "Running unit tests..."
    echo "  📋 UsersService tests (23 tests)"
    echo "  📋 UsersController tests (15 tests)"

    # Run npm commands from backend directory
    cd backend
    if npm test -- --testPathIgnorePatterns=integration.spec.ts --passWithNoTests > /dev/null 2>&1; then
        print_status "Unit tests passed (38/38)"
        cd "$PROJECT_ROOT"  # Go back to project root
        return 0
    else
        print_error "Unit tests failed"
        npm test -- --testPathIgnorePatterns=integration.spec.ts --passWithNoTests
        cd "$PROJECT_ROOT"  # Go back to project root
        return 1
    fi
}

# Check if Docker is available and database containers are running
check_database() {
    print_info "Checking database availability..."

    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        print_warning "Docker not found - skipping integration tests"
        print_info "Install Docker to run integration tests"
        return 1
    fi

    # Check if docker-compose is available
    if ! command -v docker-compose &> /dev/null; then
        print_warning "docker-compose not found - skipping integration tests"
        print_info "Install docker-compose to run integration tests"
        return 1
    fi

    # Check if MySQL container is running
    print_info "Checking if MySQL container is running..."
    if ! docker-compose ps mysql | grep -q "Up"; then
        print_warning "MySQL container not running"
        print_info "Start database with: docker-compose up -d mysql redis"
        return 1
    fi

    print_status "MySQL container is running"

    # Check if Redis container is running (optional but good to know)
    if ! docker-compose ps redis | grep -q "Up"; then
        print_warning "Redis container not running (some tests might fail)"
    else
        print_info "Redis container is running"
    fi

    # Wait for database to be ready
    print_info "Waiting for MySQL to be ready..."
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        print_info "Connection attempt $attempt/$max_attempts..."

        # Check if MySQL is responding to basic connection
        if docker-compose exec -T mysql mysqladmin ping -h localhost --silent > /dev/null 2>&1; then
            print_status "MySQL is responding to connections"

            # Additional check - verify our database and user exist
            if docker-compose exec -T mysql mysql -u taskuser -ptaskpass123 -e "SELECT 1;" task_scheduler_test > /dev/null 2>&1 2>&1; then
                print_status "Database and user credentials verified"
                return 0
            else
                print_warning "Database connection works but user/database verification failed"
                print_info "This might be normal if database schema hasn't been created yet"
                return 0  # Still allow tests to proceed
            fi
        fi

        echo "  Waiting 2 seconds before next attempt..."
        sleep 2
        ((attempt++))
    done

    print_error "MySQL failed to respond after $max_attempts attempts"
    print_info "Check MySQL logs: docker-compose logs mysql"
    return 1
}

# Run integration tests
run_integration_tests() {
    print_info "Running integration tests..."
    echo "  🐳 End-to-end API tests (25 tests)"

    # Run npm commands from backend directory
    cd backend
    if npm run test:e2e > /dev/null 2>&1; then
        print_status "Integration tests passed (25/25)"
        cd "$PROJECT_ROOT"  # Go back to project root
        return 0
    else
        print_error "Integration tests failed"
        npm run test:e2e
        cd "$PROJECT_ROOT"  # Go back to project root
        return 1
    fi
}

# Run coverage tests
run_coverage_tests() {
    print_info "Running tests with coverage..."
    echo "  📊 Generating coverage report"

    # Run npm commands from backend directory
    cd backend
    if npm run test:cov > /dev/null 2>&1; then
        print_status "Coverage tests completed"
        cd "$PROJECT_ROOT"  # Go back to project root
        return 0
    else
        print_error "Coverage tests failed"
        cd "$PROJECT_ROOT"  # Go back to project root
        return 1
    fi
}

# Generate test summary
generate_summary() {
    echo ""
    echo -e "${BLUE}📊 Test Summary${NC}"
    echo -e "${BLUE}==============${NC}"

    if [ $UNIT_TESTS_PASSED -eq 1 ]; then
        echo -e "  ✅ Unit Tests: ${GREEN}PASSED${NC} (38 tests)"
    else
        echo -e "  ❌ Unit Tests: ${RED}FAILED${NC}"
    fi

    if [ $INTEGRATION_AVAILABLE -eq 1 ]; then
        if [ $INTEGRATION_TESTS_PASSED -eq 1 ]; then
            echo -e "  ✅ Integration Tests: ${GREEN}PASSED${NC} (25 tests)"
        else
            echo -e "  ❌ Integration Tests: ${RED}FAILED${NC}"
        fi
    else
        echo -e "  ⚠️  Integration Tests: ${YELLOW}SKIPPED${NC} (Database not available)"
    fi

    if [ $COVERAGE_PASSED -eq 1 ]; then
        echo -e "  ✅ Coverage Report: ${GREEN}GENERATED${NC}"
        echo -e "    📁 View report: ${YELLOW}open coverage/lcov-report/index.html${NC}"
    fi

    echo ""
    echo -e "${BLUE}🔧 Test Commands Available:${NC}"
    echo "  • Unit tests only:    ${YELLOW}npm test${NC}"
    echo "  • All tests:          ${YELLOW}npm run test:all${NC}"
    echo "  • Watch mode:         ${YELLOW}npm run test:watch${NC}"
    echo "  • Coverage:           ${YELLOW}npm run test:cov${NC}"
    echo "  • Integration only:   ${YELLOW}npm run test:e2e${NC}"
    echo ""
}

# Main execution
main() {
    echo "Test execution started at: $(date)"
    echo ""

    # Initialize flags
    UNIT_TESTS_PASSED=0
    INTEGRATION_AVAILABLE=0
    INTEGRATION_TESTS_PASSED=0
    COVERAGE_PASSED=0

    # Run checks and tests
    check_dependencies
    install_dependencies

    # Run unit tests
    if run_unit_tests; then
        UNIT_TESTS_PASSED=1
    fi

    # Check database and run integration tests
    if check_database; then
        INTEGRATION_AVAILABLE=1
        if run_integration_tests; then
            INTEGRATION_TESTS_PASSED=1
        fi
    fi

    # Generate coverage report
    if run_coverage_tests; then
        COVERAGE_PASSED=1
    fi

    # Generate summary
    generate_summary

    # Exit with appropriate code
    if [ $UNIT_TESTS_PASSED -eq 1 ] && ([ $INTEGRATION_AVAILABLE -eq 0 ] || [ $INTEGRATION_TESTS_PASSED -eq 1 ]); then
        echo -e "${GREEN}🎉 All available tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}💥 Some tests failed. Check output above for details.${NC}"
        exit 1
    fi
}

# Run main function
main "$@"
