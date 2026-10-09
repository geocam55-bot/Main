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

  it('matches treated lumber when the retailer uses the PT abbreviation', () => {
    const item: InventoryItem = {
      sku: 'INTERNAL-PT',
      name: 'Pressure treated 2x4 lumber',
      description: 'pressure treated 2x4 lumber',
    };
    const candidate: CandidateProduct = {
      title: 'PT 2x4x8 Premium Lumber',
      priceText: '$8.99',
      url: 'https://example.test/product/pt-lumber',
    };

    expect(calculateMatchScore(item, candidate)).toBeGreaterThan(0);
  });

  it('rejects non-SPF species for SPF dimensional lumber', () => {
    const item: InventoryItem = {
      sku: '0971041',
      name: 'SPF #3&BTR KD 1X3X8',
      description: 'SPF #3&BTR KD 1X3X8',
    };
    const candidate: CandidateProduct = {
      title: "1 x 3 x 8' Maple Board",
      priceText: '$44.78',
      url: 'https://example.test/product/maple-board',
    };

    expect(calculateMatchScore(item, candidate)).toBe(0);
  });

  it('scores SPF lumber when a caller passes the full description as dimensions', () => {
    const item: InventoryItem = {
      sku: '0971041',
      name: 'SPF #3&BTR KD 1X3X8',
      description: 'SPF #3&BTR KD 1X3X8',
      dimensions: 'SPF #3&BTR KD 1X3X8',
    };
    const candidate: CandidateProduct = {
      title: "1 x 3 x 8' SPF Lumber Kiln Dried",
      priceText: '$3.99',
      url: 'https://example.test/product/spf-lumber',
    };

    expect(calculateMatchScore(item, candidate)).toBeGreaterThanOrEqual(65);
  });

  it('matches dimensionally equivalent spruce strapping from retailer results', () => {
    const item: InventoryItem = {
      sku: '0971041',
      name: 'SPF #3&BTR KD 1X3X8',
      description: 'SPF #3&BTR KD 1X3X8',
      dimensions: 'SPF #3&BTR KD 1X3X8',
    };
    const candidate: CandidateProduct = {
      title: '1 in. x 3 in. x 8 ft. Spruce Strapping',
      priceText: '$2.68',
      url: 'https://example.test/product/spruce-strapping',
    };

    expect(calculateMatchScore(item, candidate)).toBeGreaterThanOrEqual(65);
  });

  it('rejects SPF lumber candidates with a different board size', () => {
    const item: InventoryItem = {
      sku: '0971041',
      name: 'SPF #3&BTR KD 1X3X8',
      description: 'SPF #3&BTR KD 1X3X8',
    };
    const candidate: CandidateProduct = {
      title: "2 x 3 x 10' #2 & Better SPF Lumber Kiln Dried",
      priceText: '$5.09',
      url: 'https://example.test/product/wrong-spf-size',
    };

    expect(calculateMatchScore(item, candidate)).toBe(0);
  });

  it('does not treat an unmarked retailer listing as an untreated lumber mismatch', () => {
    const item: InventoryItem = {
      sku: 'INTERNAL-PT',
      name: 'Pressure treated 2x4 lumber',
      description: 'pressure treated 2x4 lumber',
    };
    const candidate: CandidateProduct = {
      title: '2x4x8 Lumber',
      priceText: '$8.99',
      url: 'https://example.test/product/lumber',
    };

    expect(calculateMatchScore(item, candidate)).toBeGreaterThan(0);
  });

  it('rejects an explicitly untreated listing for treated inventory', () => {
    const item: InventoryItem = {
      sku: 'INTERNAL-PT',
      name: 'Pressure treated 2x4 lumber',
      description: 'pressure treated 2x4 lumber',
    };
    const candidate: CandidateProduct = {
      title: 'Untreated 2x4x8 Lumber',
      priceText: '$8.99',
      url: 'https://example.test/product/untreated-lumber',
    };

    expect(calculateMatchScore(item, candidate)).toBe(0);
  });

  it('uses a retailer description for similarity when its title is abbreviated', () => {
    const item: InventoryItem = {
      sku: 'INTERNAL-003',
      name: 'Roof anchor',
      description: 'blue roof anchor 16 inch galvanized steel for residential roof framing applications',
    };
    const candidate: CandidateProduct = {
      title: 'Roof Anchor',
      description: 'Blue roof anchor 16 inch galvanized steel for residential roof framing applications',
      priceText: '$12.99',
      url: 'https://example.test/product/roof-anchor',
    };

    expect(calculateMatchScore(item, candidate)).toBeGreaterThanOrEqual(75);
  });

  it('matches compressed dimensions and common building-material abbreviations', () => {
    const item: InventoryItem = {
      sku: '8480008',
      name: 'BULLNOSE CRNRBN TRMTEX D/W 8',
      description: 'BULLNOSE CRNRBN TRMTEX D/W 8',
    };
    const candidate: CandidateProduct = {
      title: 'Trim-Tex 90 Degree Bullnose Drywall Corner Bead 8 ft',
      priceText: '$4.99',
      url: 'https://example.test/product/corner-bead',
    };

    expect(calculateMatchScore(item, candidate)).toBeGreaterThanOrEqual(55);
  });

  it('builds expanded search terms for SPF, plywood, and PT Brown SKUs', () => {
    const cases = [
      {
        item: { sku: '0971041', name: 'SPF #3&BTR KD 1X3X8', description: 'SPF #3&BTR KD 1X3X8' },
        expected: 'SPF 3 and better kiln dried 1 x 3 x 8',
      },
      {
        item: { sku: '0938011', name: '3/8 SPRUCE SELECT PLY *Y*', description: '3/8 SPRUCE SELECT PLY *Y*' },
        expected: '3/8 SPRUCE SELECT plywood *Y*',
      },
      {
        item: { sku: '0938042', name: 'OSB SQUARE (10.5)7/16X4X8 WHITE', description: 'OSB SQUARE (10.5)7/16X4X8 WHITE' },
        expected: 'OSB SQUARE (10.5)7/16 x 4 x 8 WHITE',
        focused: '7/16 OSB 4 x 8',
      },
      {
        item: { sku: '84895021', name: "PT BROWN 2X4\"X8'", description: "PT BROWN 2X4\"X8'" },
        expected: "pressure treated BROWN 2 x 4 x 8'",
      },
    ];

    for (const { item, expected, focused } of cases) {
      const terms = getSearchTerms(item);
      expect(terms[1]).toBe(expected);
      if (focused) expect(terms).toContain(focused);
    }
    expect(getSearchTerms(cases[0].item)).toContain('SPF 1 x 3 x 8');
    expect(getSearchTerms(cases[0].item)).toContain('1 x 3 x 8 spruce lumber');
  });

  it('rejects handrail results for PT Brown dimensional lumber', () => {
    const item: InventoryItem = {
      sku: '84895021',
      name: 'PT BROWN 2X4 X8',
      description: 'PT BROWN 2X4 X8',
    };
    const candidate: CandidateProduct = {
      title: "Marwood Wood Handrail 2 x 4 x 8' Brown",
      priceText: '$23.39',
      url: 'https://example.test/product/handrail',
    };

    expect(calculateMatchScore(item, candidate)).toBe(0);
  });

  it('does not give a strong match bonus when product dimensions disagree', () => {
    const item: InventoryItem = {
      sku: 'DRYWALL-4X8',
      name: 'Drywall lightweight 1/2 x 4 x 8',
      description: 'Drywall lightweight 1/2 x 4 x 8',
    };
    const candidate: CandidateProduct = {
      title: 'CGC Lightweight Drywall Panel 1/2 in x 4 ft x 10 ft',
      priceText: '$15.99',
      url: 'https://example.test/product/drywall-4x10',
    };

    expect(calculateMatchScore(item, candidate)).toBeLessThan(55);
  });

  it('matches trim-board dimensions after retailer wording expands the fractions', () => {
    const item: InventoryItem = {
      sku: '10200034',
      name: 'VERSATEX 3/4X3 1/2X12 PVC TRIM',
      description: 'VERSATEX 3/4X3 1/2X12 PVC TRIM',
    };
    const candidate: CandidateProduct = {
      title: 'Versatex 3/4 in. x 3-1/2 in. x 12 ft. PVC trim board',
      priceText: '$41.99',
      url: 'https://example.test/product/versatex-trim',
    };

    expect(calculateMatchScore(item, candidate)).toBeGreaterThanOrEqual(55);
  });

  it('rejects a same-product trim listing with the wrong length', () => {
    const item: InventoryItem = {
      sku: '10200034',
      name: 'VERSATEX 3/4X3 1/2X12 PVC TRIM',
      description: 'VERSATEX 3/4X3 1/2X12 PVC TRIM',
    };
    const candidate: CandidateProduct = {
      title: '3-1/2 in. x 3/4 in. x 14 ft. primed MDF casing moulding',
      priceText: '$73.48',
      url: 'https://example.test/product/wrong-length-moulding',
    };

    expect(calculateMatchScore(item, candidate)).toBeLessThan(55);
  });

  it('accepts equivalent mixed-fraction trim dimensions in swapped width order', () => {
    const item: InventoryItem = {
      sku: '10200034',
      name: 'VERSATEX 3/4X3 1/2X12 PVC TRIM',
      description: 'VERSATEX 3/4X3 1/2X12 PVC TRIM',
    };
    const candidate: CandidateProduct = {
      title: "3-1/2 in. x 3/4 in. x 12 ft. Versatex PVC trim board",
      priceText: '$41.99',
      url: 'https://example.test/product/versatex-trim',
    };

    expect(calculateMatchScore(item, candidate)).toBeGreaterThanOrEqual(55);
  });

  it('rejects plywood with the wrong thickness when inventory omits sheet length and width', () => {
    const item: InventoryItem = {
      sku: '0938011',
      name: '3/8 SPRUCE SELECT PLY',
      description: '3/8 SPRUCE SELECT PLY',
    };
    const candidate: CandidateProduct = {
      title: '3/4 in. x 4 ft. x 8 ft. Spruce Plywood Select',
      priceText: '$71.48',
      url: 'https://example.test/product/wrong-plywood-thickness',
    };

    expect(calculateMatchScore(item, candidate)).toBe(0);
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
