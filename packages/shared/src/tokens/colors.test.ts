import { describe, expect, it } from 'vitest';
import { colors, withAlpha } from './colors';

describe('withAlpha', () => {
  it('converts a hex token to rgba', () => {
    expect(withAlpha(colors.secondary, 0)).toBe('rgba(19, 22, 23, 0)');
    expect(withAlpha('#FFFFFF', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
  });

  it('rejects other formats', () => {
    expect(() => withAlpha('#FFF', 1)).toThrow();
  });
});
