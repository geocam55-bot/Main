import { describe, expect, it } from 'vitest';
import { advancedSearch } from './advanced-search';

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
});
