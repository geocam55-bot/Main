import { describe, expect, it } from 'vitest';
import {
  calculateMatchScore,
  extractPrice,
  extractKentStorePrice,
  getSearchTerms,
  type CandidateProduct,
  type InventoryItem,
} from './playwright-scraper';

describe('competitor price scraper helpers', () => {
  it('searches product text before inventory-only identifiers', () => {
    const terms = getSearchTerms({
      sku: 'INTERNAL-001',
      supplier_sku: 'SUP-002',
      upc: '123456789012',
      mfg: 'MFG-003',
      name: 'Building Materials',
      description: 'Simpson strong tie H2.5A hurricane tie',
    });

    expect(terms[0]).toContain('Simpson strong tie H2.5A');
    expect(terms).toContain('123456789012');
  });

  it('scores a product using descriptive inventory text when the name is generic', () => {
    const item: InventoryItem = {
      sku: 'INTERNAL-001',
      name: 'Miscellaneous',
      description: 'blue roof anchor 16 inch',
    };
    const candidate: CandidateProduct = {
      title: 'Blue Roof Anchor 16 Inch',
      priceText: '$12.99',
      url: 'https://example.test/product',
    };

    expect(calculateMatchScore(item, candidate)).toBeGreaterThanOrEqual(65);
  });

  it('parses grouped currency values and retailer verbal prices', () => {
    expect(extractPrice('$1,299.99')).toBe(1299.99);
    expect(extractPrice('$3 And 98 Cents / each')).toBe(3.98);
  });

  it('uses the Kent price group for the selected Bayers Lake store', () => {
    const groupPrices = '55:4251:8.99;41:3081:8.30;39:3060:8.30;37:3050:8.30';

    expect(extractKentStorePrice(groupPrices, '3060')).toBe(8.3);
    expect(extractKentStorePrice(groupPrices, '4251')).toBe(8.99);
    expect(extractKentStorePrice(groupPrices, '9999')).toBeNull();
  });
});
