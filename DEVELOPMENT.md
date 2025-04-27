# Development Guidelines for mle-tools-node

This document provides essential information for developers working on the mle-tools-node project.

## Build and Configuration Instructions

### Prerequisites

- Node.js (compatible with the dependencies in package.json)
- npm

### Setup and Build

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```
   This command:
    - Removes the existing dist/ directory
    - Compiles TypeScript files to JavaScript
    - Copies markdown files and package.json to the dist/ directory
    - Copies the asThread.js file to the dist/launchers/ directory

3. Clean and reinstall (if needed):
   ```bash
   npm run _clean
   ```
   This removes generated files, logs, and node_modules, then reinstalls dependencies.

### Project Structure

- `src/` - Source code
    - `errors/` - Error classes
    - `launchers/` - Worker thread and queue management
    - `tools/` - Utility tools
    - `middlewares/` - Middleware components
    - `logs/` - Logging functionality
- `specs/` - Test files
- `dist/` - Compiled output

## Testing Information

### Test Framework

The project uses:

- Mocha as the test runner
- Chai for assertions
- NYC (Istanbul) for code coverage

### Running Tests

1. Run all tests:
   ```bash
   npm run test
   ```

2. Run specific tests using pattern matching:
   ```bash
   npm run test -- -g "pattern"
   ```
   Where "pattern" is a string that matches test descriptions.

3. Generate test coverage report:
   ```bash
   npm run test-coverage
   ```

### Creating New Tests

1. Create a test file with the `.spec.ts` extension in the `specs/` directory, mirroring the structure of the `src/`
   directory.

2. Use the Mocha/Chai pattern with describe/it blocks:
   ```typescript
   import { expect } from 'chai';
   import { YourClass } from '../../src/path/to/YourClass';

   describe('YourClass', () => {
       describe('methodName', () => {
           it('should do something specific', () => {
               // Arrange
               const instance = new YourClass();

               // Act
               const result = instance.methodName();

               // Assert
               expect(result).to.equal(expectedValue);
           });
       });
   });
   ```

3. For testing error cases, use the following pattern:
   ```typescript
   it('should throw an error when condition', () => {
       expect(() => yourFunction(invalidInput)).to.throw(ErrorType, 'error message');
   });
   ```

### Example Test

Here's a simple example of a utility class and its test:

**src/example/StringUtils.ts**:

```typescript
import { MError } from '../errors/MError';

export class StringUtils {
    public static reverse(input: string): string {
        if (typeof input !== 'string') {
            throw new MError('Input must be a string');
        }
        return input.split('').reverse().join('');
    }

    public static isPalindrome(input: string): boolean {
        if (typeof input !== 'string') {
            throw new MError('Input must be a string');
        }
        const normalized = input.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normalized === this.reverse(normalized);
    }
}
```

**specs/example/StringUtils.spec.ts**:

```typescript
import { expect } from 'chai';
import { StringUtils } from '../../src/example/StringUtils';
import { MError } from '../../src/errors/MError';

describe('StringUtils', () => {
    describe('reverse', () => {
        it('should reverse a string', () => {
            expect(StringUtils.reverse('hello')).to.equal('olleh');
            expect(StringUtils.reverse('12345')).to.equal('54321');
            expect(StringUtils.reverse('')).to.equal('');
        });

        it('should throw an error if input is not a string', () => {
            // @ts-ignore - Testing invalid input
            expect(() => StringUtils.reverse(123)).to.throw(MError, 'Input must be a string');
            // @ts-ignore - Testing invalid input
            expect(() => StringUtils.reverse(null)).to.throw(MError, 'Input must be a string');
        });
    });

    describe('isPalindrome', () => {
        it('should return true for palindromes', () => {
            expect(StringUtils.isPalindrome('racecar')).to.be.true;
            expect(StringUtils.isPalindrome('A man, a plan, a canal: Panama')).to.be.true;
            expect(StringUtils.isPalindrome('No lemon, no melon')).to.be.true;
        });

        it('should return false for non-palindromes', () => {
            expect(StringUtils.isPalindrome('hello')).to.be.false;
            expect(StringUtils.isPalindrome('typescript')).to.be.false;
        });

        it('should throw an error if input is not a string', () => {
            // @ts-ignore - Testing invalid input
            expect(() => StringUtils.isPalindrome(123)).to.throw(MError, 'Input must be a string');
            // @ts-ignore - Testing invalid input
            expect(() => StringUtils.isPalindrome(null)).to.throw(MError, 'Input must be a string');
        });
    });
});
```

## Code Style and Development Guidelines

### TypeScript Configuration

- Target: ES6
- Module system: CommonJS
- Declaration files are generated
- Inline source maps are included

### Code Style

The project uses TSLint with the following key rules:

- Maximum line length: 140 characters
- Single quotes for strings
- Member ordering: static fields, instance fields, static methods, instance methods
- No more than 2 consecutive blank lines

### Error Handling

- Use the `MError` class from `src/errors/MError` for custom errors
- For specific error codes, use `MErrorCode` from `src/errors/MErrorCode`

### Worker Thread Pattern

The project implements a worker thread pattern with:

- `AbstractWorkerProcessor` - Base class for worker processors
- `Launcher` - Manages worker processes
- `QueueLauncher` - Manages queued worker processes
- Thread strategies: DIRECT, THREAD, QUEUE

### Logging

- The project uses Winston for logging
- `loggerFactory` provides centralized logger creation
- Log levels are defined in `LoggerLevels` enum
- Performance logging is available via `LoggerPerf`

### Documentation

- Use JSDoc comments for classes, methods, and properties
- Include parameter descriptions, return types, and thrown exceptions

## Release Process

### Preparing a Release

1. Ensure all tests pass:
   ```bash
   npm run test
   ```

2. Update the version in package.json:
   ```bash
   npm run bump
   ```
   This command:
    - Increments the patch version in package.json
    - Updates the version in MleToolsNode.ts

3. Update the CHANGELOG.md file:
    - Add a new entry for the release with the new version number
    - Document the changes in the appropriate categories (Added, Changed, Fixed)
    - Run the update-changelog-date.js script to update the date of the latest version:
      ```bash
      node scripts/update-changelog-date.js
      ```

4. Create a Git tag for the new version:
   ```bash
   VERSION=$(node -p "require('./package.json').version")
   git tag -a "v$VERSION" -m "Release v$VERSION"
   git push origin "v$VERSION"
   ```
   This creates an annotated Git tag for the new version and pushes it to the remote repository.

5. Build the distribution package:
   ```bash
   npm run build
   ```
   This ensures that all the latest changes are included in the distribution package.

### GitHub CI Release Process

The project uses GitHub Actions for continuous integration and automated releases:

1. When changes are pushed to the main branch, the CI workflow is triggered automatically.
2. The workflow performs the following steps:
    - Checks out the code
    - Sets up Node.js
    - Installs dependencies
    - Builds the project
    - Runs tests
    - Creates and pushes a Git tag based on the version in package.json
    - Publishes the package to npm

The CI workflow configuration is located in `.github/workflows/ci.yml`.

The Git tag is created with the format `v{version}` (e.g., v1.11.16) and includes an annotation with the release
message. This provides a way to track versions in the Git repository and makes it easier to reference specific releases.

### Release Best Practices

1. **Semantic Versioning**: Follow semantic versioning (MAJOR.MINOR.PATCH) when updating the version number:
    - MAJOR: Breaking changes
    - MINOR: New features (backward compatible)
    - PATCH: Bug fixes (backward compatible)

2. **Changelog Management**:
    - Keep the CHANGELOG.md file up to date
    - Follow the "Keep a Changelog" format
    - Categorize changes as Added, Changed, or Fixed
    - Include the release date for each version

3. **Testing Before Release**:
    - Ensure all tests pass before creating a release
    - Consider adding additional tests for new features or bug fixes

4. **Documentation**:
    - Update documentation to reflect any changes in the API
    - Ensure README.md is up to date with the latest features

5. **Dependency Management**:
    - Review and update dependencies regularly
    - Use the switch-dependencies.js script to switch between local and remote dependencies for testing:
      ```bash
      node scripts/switch-dependencies.js local|remote
      ```

6. **Manual Verification**:
    - Perform manual verification of critical features before release
    - Consider creating a pre-release version for testing if needed
