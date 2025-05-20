# Development Examples: mle-tools-node

This file contains detailed examples and specific instructions for developers working on the mle-tools-node project. It preserves the most valuable parts of the original DEVELOPMENT.md file.

## Example Test

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

## Detailed Release Process

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
