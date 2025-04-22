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
