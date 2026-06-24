#!/bin/bash

# Script to run all tests in sequence: backend, frontend, E2E
# Usage: ./run_all_tests.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to run backend tests
run_backend_tests() {
    print_info "Running backend tests..."
    cd /Users/a.shkondin/Documents/Projects/Other/Bioritmic
    
    if command_exists ./gradlew; then
        if ./gradlew :api:test; then
            print_info "✅ Backend tests passed"
            return 0
        else
            print_error "❌ Backend tests failed"
            return 1
        fi
    else
        print_error "❌ Gradle not found"
        return 1
    fi
}

# Function to run frontend unit tests
run_frontend_tests() {
    print_info "Running frontend unit tests..."
    cd /Users/a.shkondin/Documents/Projects/Other/Bioritmic/ui
    
    if command_exists npm; then
        if npm test -- --watch=false --browsers=ChromeHeadless; then
            print_info "✅ Frontend unit tests passed"
            return 0
        else
            print_error "❌ Frontend unit tests failed"
            return 1
        fi
    else
        print_error "❌ npm not found"
        return 1
    fi
}

# Function to run E2E tests (requires additional setup)
run_e2e_tests() {
    print_warning "Running E2E tests..."
    print_warning "Note: E2E tests require backend and frontend to be running."
    print_warning "Skipping E2E tests in this script."
    print_warning "To run E2E tests manually:"
    print_warning "  1. Start backend: ./gradlew :api:bootRun"
    print_warning "  2. Start frontend dev server: npm start (in ui/)"
    print_warning "  3. Run E2E: npm run test:e2e (in ui/)"
    return 0
}

# Main function
main() {
    print_info "Starting all tests..."
    print_info "============================================"
    
    # Run backend tests
    if ! run_backend_tests; then
        exit 1
    fi
    
    # Run frontend tests
    if ! run_frontend_tests; then
        exit 1
    fi
    
    # Run E2E tests
    run_e2e_tests
    
    print_info "============================================"
    print_info "All tests completed successfully!"
    print_info "Note: E2E tests were skipped due to setup requirements."
}

# Run main function
main
