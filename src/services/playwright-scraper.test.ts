import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  calculateMatchScore,
  determineMatchConfidence,
  findBestProductMatch,
  extractPrice,
  extractKentStorePrice,
  getSearchTerms,
  kentStoreAvailability,
  parseHomeDepotCandidates,
  scrapeSearchResults,
  COMPETITORS,
  type CandidateProduct,
  type InventoryItem,
  type ScraperApiObservation,
} from './playwright-scraper';

describe('competitor price scraper helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it('preserves the full supplied description as the first retailer query', () => {
    const terms = getSearchTerms({
      sku: 'INTERNAL-002',
      name: 'Pipe fitting',
      description: 'Pipe fitting #123 & adapter',
    });

    expect(terms[0]).toBe('Pipe fitting #123 & adapter');
  });

  it('scores a product using descriptive inventory text when the name is generic', () => {
    const item: InventoryItem = {
      sku: 'INTERNAL-001',
      name: 'Miscellaneous',
      description: 'blue roof anchor 16 inch galvanized steel for residential roof framing applications',
    };
    const candidate: CandidateProduct = {
      title: 'Blue Roof Anchor 16 Inch',
      priceText: '$12.99',
      url: 'https://example.test/product',
    };

    expect(calculateMatchScore(item, candidate)).toBeGreaterThanOrEqual(55);
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

  it('reports store-level availability only when the response includes it', () => {
    expect(kentStoreAvailability('["3060","3050"]', '3060')).toBe('IN_STOCK');
    expect(kentStoreAvailability('["3050"]', '3060')).toBe('OUT_OF_STOCK');
    expect(kentStoreAvailability(undefined, '3060')).toBe('UNKNOWN');
  });

  it('prioritizes retailer identifiers before optional search keywords', () => {
    const terms = getSearchTerms({
      sku: 'INTERNAL-123',
      name: 'Simpson Strong-Tie connector',
      description: 'Simpson Strong-Tie galvanized hurricane tie for roof framing use',
      mfg: 'H2.5A',
      upc: '044315123456',
      search_keywords: ['roof framing connector', 'galvanized tie'],
    });

    expect(terms.slice(0, 4)).toEqual([
      'Simpson Strong-Tie galvanized hurricane tie for roof framing use',
      'H2.5A',
      '044315123456',
      'Simpson Strong-Tie galvanized hurricane',
    ]);
  });

  it('searches the full description first and stops after a strong priced match', async () => {
    const description = 'blue roof anchor 16 inch galvanized steel for residential roof framing applications';
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify({
      products: [{
        title: 'Blue Roof Anchor 16 Inch',
        price: 12.99,
        productUrl: '/product/blue-roof-anchor',
      }],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const match = await findBestProductMatch(null, COMPETITORS.homeDepot, {
      sku: 'INTERNAL-001',
      name: 'Miscellaneous',
      description,
    });

    expect(match).toMatchObject({ matchFound: true, price: 12.99 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get('q')).toBe(description);
  });

  it('normalizes common Home Depot search response shapes', () => {
    const candidates = parseHomeDepotCandidates({
      data: {
        results: [{
          title: 'Framing Connector',
          pricing: { displayPrice: { value: 4.98 } },
          sku: 'HD-123',
          manufacturerPartNumber: 'H2.5A',
          inStock: true,
          productUrl: '/product/framing-connector/100123',
        }],
      },
    });

    expect(candidates).toEqual([expect.objectContaining({
      title: 'Framing Connector',
      priceText: '4.98',
      sku: 'HD-123',
      mfg: 'H2.5A',
      availability: 'IN_STOCK',
      storePriceVerified: true,
      url: 'https://www.homedepot.ca/product/framing-connector/100123',
    })]);
    expect(parseHomeDepotCandidates({ products: 'invalid' })).toEqual([]);
    expect(determineMatchConfidence(58).confidence).toBe('MEDIUM');
  });

  it('follows Kent search pagination and preserves store-group prices', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(input.toString());
      const offset = Number(url.searchParams.get('paginationStartsFrom'));
      const products = Array.from({ length: offset === 0 ? 100 : 50 }, (_, index) => {
        const productIndex = offset + index;
        return {
          name: `Kent product ${productIndex}`,
          sku: `KENT-${productIndex}`,
          price: '999.99',
          salePrice: '999.99',
          groupPrices: '55:4251:8.99;39:3060:8.30',
          store_in_stock: '["3060"]',
          url: `https://kent.ca/product-${productIndex}`,
        };
      });
      return new Response(JSON.stringify({
        meta: { totalResultsFound: 150 },
        result: products,
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const apiResponses: ScraperApiObservation[] = [];
    const candidates = await scrapeSearchResults(null, COMPETITORS.kent, 'framing connector', {
      errors: [],
      apiResponses,
    });

    expect(candidates).toHaveLength(150);
    expect(candidates[0]).toMatchObject({
      priceText: '8.3',
      availability: 'IN_STOCK',
      storePriceVerified: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(apiResponses[0]).toMatchObject({ pagesRetrieved: 2, totalCount: 150 });
  });

  it('surfaces a failed Home Depot request without repeatedly retrying it', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network timeout'));
    vi.stubGlobal('fetch', fetchMock);
    const diagnostics: { errors: string[]; apiResponses: ScraperApiObservation[] } = {
      errors: [],
      apiResponses: [],
    };

    const match = await findBestProductMatch(null, COMPETITORS.homeDepot, {
      sku: 'INTERNAL-001',
      name: 'Framing connector',
    }, diagnostics);

    expect(match).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(diagnostics.errors?.[0]).toContain('Home Depot API: network timeout');
    expect(diagnostics.apiResponses?.[0]).toMatchObject({
      endpoint: '/api/search/v1/search',
      error: 'network timeout',
    });
  });

  it('does not retry failed Home Depot HTTP requests when diagnostics are omitted', async () => {
    const fetchMock = vi.fn(async () => new Response('service unavailable', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);

    const match = await findBestProductMatch(null, COMPETITORS.homeDepot, {
      sku: 'INTERNAL-001',
      name: 'Framing connector',
    });

    expect(match).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry failed Kent HTTP requests when the browser is unavailable', async () => {
    const fetchMock = vi.fn(async () => new Response('service unavailable', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);

    const match = await findBestProductMatch(null, COMPETITORS.kent, {
      sku: 'INTERNAL-001',
      name: 'Framing connector',
    });

    expect(match).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('disables repeated browser fallbacks after a navigation failure but keeps API searches', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ products: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const page = {
      on: vi.fn(),
      off: vi.fn(),
      goto: vi.fn().mockRejectedValue(new Error('net::ERR_HTTP2_PROTOCOL_ERROR')),
    };

    const match = await findBestProductMatch(page as any, COMPETITORS.homeDepot, {
      sku: 'INTERNAL-001',
      name: 'Framing connector',
      description: 'Framing connector galvanized steel residential roof support',
    });

    expect(match).toBeNull();
    expect(page.goto).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('bounds API-only search to the full description and two fallback terms', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ products: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const match = await findBestProductMatch(null, COMPETITORS.homeDepot, {
      sku: 'INTERNAL-001',
      name: 'Generic fitting',
      description: 'Structural framing connector',
      mfg: 'H2.5A',
      upc: '044315123456',
    });

    expect(match).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const queriedTerms = fetchMock.mock.calls.map(([input]) =>
      new URL(String(input)).searchParams.get('q')
    );
    expect(queriedTerms).toEqual([
      'Structural framing connector',
      'H2.5A',
      '044315123456',
    ]);
  });
});
