import { describe, expect, it } from 'vitest';
import { normalizeInventorySearchQuery } from './inventory-keywords';

describe('normalizeInventorySearchQuery', () => {
  it('removes conversational filler without removing item descriptors', () => {
    expect(normalizeInventorySearchQuery('Show me all the spruce lumber')).toBe('spruce lumber');
    expect(normalizeInventorySearchQuery('Show me all products that have Spruce and 2x4 in description'))
      .toBe('Spruce and 2x4');
  });

  it('keeps inventory constraints and dimensions in the search', () => {
    expect(normalizeInventorySearchQuery('Could you show me all 2x4 spruce lumber under $50?'))
      .toBe('2x4 spruce lumber under $50');
  });

  it('removes generic item words but preserves stock intent', () => {
    expect(normalizeInventorySearchQuery('Show low stock lumber items')).toBe('low stock lumber');
  });
});
