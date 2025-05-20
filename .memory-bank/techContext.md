# Technical Context: mle-tools-node

## Technologies Used

### Core Technologies
- **Node.js** - Runtime environment
- **TypeScript** - Programming language
- **CommonJS** - Module system

### Key Dependencies
- **axios** (^1.8.4) - HTTP client for making requests
- **cache-manager** (^5.6.1) - Flexible caching library
- **cache-manager-redis-yet** (^5.1.1) - Redis store for cache-manager
- **fast-csv** (^5.0.0) - CSV parsing and formatting
- **form-data** (^4.0.0) - Form data handling
- **mle-tools-configuration** (^1.0.12) - Configuration management
- **object-hash** (^3.0.0) - Object hashing for caching
- **on-headers** (^1.0.2) - HTTP header handling
- **pidusage** (^3.0.2) - Process/CPU usage monitoring
- **polling-timer** (^0.1.2) - Timer utilities
- **winston** (^3.11.0) - Logging framework
- **winston-daily-rotate-file** (^4.7.1) - Log rotation

### Development Dependencies
- **@testdeck/mocha** (^0.3.3) - Test decorators
- **chai** (^4.3.10) - Assertion library
- **mocha** (^10.2.0) - Test framework
- **nyc** (^15.1.0) - Code coverage
- **redis-memory-server** (^0.11.0) - In-memory Redis for testing
- **termination** (^1.0.3) - Process termination handling
- **tslint** (^6.1.3) - Linting
- **typescript** (^5.0.3) - TypeScript compiler

## Development Setup

### Prerequisites
- Node.js (compatible with the dependencies in package.json)
- npm

### Installation
```bash
npm install
```

### Build Process
```bash
npm run build
```

This command:
- Removes the existing dist/ directory
- Compiles TypeScript files to JavaScript
- Copies markdown files and package.json to the dist/ directory
- Copies the asThread.js file to the dist/launchers/ directory

### Clean and Reinstall
```bash
npm run _clean
```

This removes generated files, logs, and node_modules, then reinstalls dependencies.

### Testing
```bash
# Run all tests
npm run test

# Run specific tests using pattern matching
npm run test -- -g "pattern"

# Generate test coverage report
npm run test-coverage
```

## Technical Constraints

### TypeScript Configuration
- Target: ES6
- Module system: CommonJS
- Declaration files are generated
- Inline source maps are included

### Code Style
- Maximum line length: 140 characters
- Single quotes for strings
- Member ordering: static fields, instance fields, static methods, instance methods
- No more than 2 consecutive blank lines

### Error Handling
- Use the `MError` class from `src/errors/MError` for custom errors
- For specific error codes, use `MErrorCode` from `src/errors/MErrorCode`

### Documentation
- Use JSDoc comments for classes, methods, and properties
- Include parameter descriptions, return types, and thrown exceptions

## Dependencies

### Direct Dependencies
The project relies on several key libraries:
- **winston** for logging
- **cache-manager** for caching
- **axios** for HTTP requests
- **fast-csv** for CSV processing
- **mle-tools-configuration** for configuration management

### Optional Dependencies
Some features require additional dependencies:
- Redis support requires a Redis server
- Thread-based processing requires Node.js worker_threads support

### Compatibility
- Requires Node.js 12.x or higher
- TypeScript 4.x or higher for development
