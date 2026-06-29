import { describe, expect, it } from 'vitest';
import { advancedSearch, getSearchSuggestions } from './advanced-search';

describe('advancedSearch', () => {
  it('does not crash on malformed tag data and still matches SKU queries', () => {
    const items = [
      {
        id: '1',
        name: 'Deck Screw',
        sku: 'SKU-123',
        category: 'Fasteners',
        description: 'Exterior coated screw',
        tags: { primary: 'deck' } as any,
        status: 'active',
        priceTier1: 12,
        quantityOnHand: 5,
      },
    ];

    expect(() => advancedSearch(items as any, 'SKU-123', { maxResults: 10 })).not.toThrow();

    const results = advancedSearch(items as any, 'SKU-123', { maxResults: 10 });
    expect(results[0]?.item.id).toBe('1');
  });

  it('performs robust dimension-aware matching', () => {
    const items = [
      {
        id: '1',
        name: 'PT BROWN 2X6"X10\'',
        sku: 'SKU-BROWN-2610',
        category: 'Lumber',
        description: 'Pressure treated brown lumber board',
        status: 'active',
        priceTier1: 15,
        quantityOnHand: 10,
      },
    ];

    // Check with spaces around dimension
    let results = advancedSearch(items as any, '2 x 6 10\'', { maxResults: 10 });
    expect(results.length).toBe(1);
    expect(results[0].item.id).toBe('1');

    // Check with hyphen dimension
    results = advancedSearch(items as any, '2x6-10', { maxResults: 10 });
    expect(results.length).toBe(1);
    expect(results[0].item.id).toBe('1');

    // Check with normal dimension
    results = advancedSearch(items as any, '2x6x10', { maxResults: 10 });
    expect(results.length).toBe(1);
  });

  it('performs robust length-aware matching with different formats', () => {
    const items = [
      {
        id: '1',
        name: 'PT Joist (8\')',
        sku: 'SKU-JOIST-8',
        category: 'Lumber',
        description: 'PT Joist',
        status: 'active',
        priceTier1: 15,
        quantityOnHand: 10,
      },
    ];

    // "8ft" matches (8')
    let results = advancedSearch(items as any, 'joist 8ft', { maxResults: 10 });
    expect(results.length).toBe(1);

    // "8 ft" matches (8')
    results = advancedSearch(items as any, 'joist 8 ft', { maxResults: 10 });
    expect(results.length).toBe(1);

    // "8-ft" matches (8')
    results = advancedSearch(items as any, 'joist 8-ft', { maxResults: 10 });
    expect(results.length).toBe(1);

    // "8'" matches (8')
    results = advancedSearch(items as any, 'joist 8\'', { maxResults: 10 });
    expect(results.length).toBe(1);
  });

  it('getSearchSuggestions does not crash when fields are undefined/null', () => {
    const items = [
      {
        id: '1',
        name: undefined,
        sku: null,
        category: undefined,
        description: 'Mystery item',
      },
      {
        id: '2',
        name: 'Pine Plank',
        sku: 'PINE-100',
        category: 'Wood',
        description: 'Nice wood plank',
      }
    ];

    expect(() => getSearchSuggestions(items as any, 'pine', 5)).not.toThrow();
    const suggestions = getSearchSuggestions(items as any, 'pine', 5);
    expect(suggestions).toContain('Pine Plank');
  });
});
