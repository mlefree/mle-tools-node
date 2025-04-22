import {MError} from '../errors';

/**
 * Utility class for string operations
 */
export class StringUtils {
    /**
     * Reverses a string
     * @param input The string to reverse
     * @returns The reversed string
     * @throws MError if input is not a string
     */
    public static reverse(input: string): string {
        if (typeof input !== 'string') {
            throw new MError('Input must be a string');
        }
        return input.split('').reverse().join('');
    }

    /**
     * Checks if a string is a palindrome (reads the same forward and backward)
     * @param input The string to check
     * @returns True if the string is a palindrome, false otherwise
     * @throws MError if input is not a string
     */
    public static isPalindrome(input: string): boolean {
        if (typeof input !== 'string') {
            throw new MError('Input must be a string');
        }
        const normalized = input.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normalized === this.reverse(normalized);
    }
}
