import { expect, test, describe } from 'bun:test';
import { parseSquashArgs, validateSquashN } from '../src/squash';

describe('parseSquashArgs', () => {
  test('parses tag variant', () => {
    expect(parseSquashArgs(['tag', 'v1.0'])).toEqual({ variant: 'tag', ref: 'v1.0' });
  });
  test('parses commit variant', () => {
    expect(parseSquashArgs(['commit', 'abc1234'])).toEqual({ variant: 'commit', ref: 'abc1234' });
  });
  test('parses last variant', () => {
    expect(parseSquashArgs(['last', '3'])).toEqual({ variant: 'last', ref: '3' });
  });
  test('returns null for unknown variant', () => {
    expect(parseSquashArgs(['unknown', 'ref'])).toBeNull();
  });
  test('returns null for missing ref', () => {
    expect(parseSquashArgs(['tag'])).toBeNull();
  });
});

describe('validateSquashN', () => {
  test('accepts n >= 2', () => {
    expect(validateSquashN('2')).toBeNull();
    expect(validateSquashN('10')).toBeNull();
  });
  test('rejects n < 2', () => {
    expect(validateSquashN('1')).toBe('Need at least 2 commits to squash');
    expect(validateSquashN('0')).toBe('Need at least 2 commits to squash');
  });
  test('rejects non-integer', () => {
    expect(validateSquashN('abc')).toBe('n must be a positive integer');
    expect(validateSquashN('1.5')).toBe('n must be a positive integer');
  });
});
