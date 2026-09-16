import sys

def patch_file(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()

    start_idx = -1
    end_idx = -1

    for i, line in enumerate(lines):
        if "// Direct Scraping for Kent Building Supplies (Halifax - Bayers Lake store)" in line:
            start_idx = i
        if "// Verified Atlantic Canada Regional Retail Catalog fallback" in line:
            end_idx = i
            break

    if start_idx == -1 or end_idx == -1:
        print("Failed to find boundaries.")
        return

    replacement = """
    // Playwright Direct Scraping
    try {
      const { getPlaywrightBrowser, findBestProductMatch, COMPETITORS } = await import('./src/services/playwright-scraper.js');
      const browser = await getPlaywrightBrowser();
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      });
      const page = await context.newPage();

      const invItem = {
        sku: product.sku,
        name: product.productName,
        description: product.description,
        mfg: product.mfgPartNumber,
        upc: product.upc,
        category: product.category,
        dimensions: product.description || product.productName,
        unit_price: product.yourPrice ? (product.yourPrice > 100 ? product.yourPrice / 100 : product.yourPrice) : 0
      };

      diagnosticLogs.push(`[Playwright] Starting headless search for: ${primarySearchTerm}`);

      // Kent Playwright Scraping
      try {
        // Apply store cookies
        if (COMPETITORS.kent.cookies && COMPETITORS.kent.cookies.length) {
          const formattedCookies = COMPETITORS.kent.cookies.map(c => ({
            name: c.name,
            value: c.value,
            domain: c.domain,
            path: "/"
          }));
          await context.addCookies(formattedCookies);
        }
        
        const kentMatch = await findBestProductMatch(page, COMPETITORS.kent, invItem);
        if (kentMatch && kentMatch.price != null && kentMatch.score >= COMPETITORS.kent.matchThreshold) {
            freshKent = kentMatch.price;
            kentTitle = kentMatch.candidate.title;
            kentUrl = kentMatch.candidate.url;
            kentSku = kentUrl.split('/').pop() || '';
            kentMethod = 'PLAYWRIGHT_SCRAPE';
            kentConf = 'HIGH';
            diagnosticLogs.push(`[Kent Playwright] Found match: ${kentTitle} at $${freshKent}`);
        } else {
            diagnosticLogs.push(`[Kent Playwright] No qualified match found (Score: ${kentMatch ? kentMatch.score : 0})`);
        }
      } catch (err: any) {
        diagnosticLogs.push(`[Kent Playwright Error] ${err.message}`);
      }

      // Home Depot Playwright Scraping
      try {
        // Apply store cookies
        if (COMPETITORS.homeDepot.cookies && COMPETITORS.homeDepot.cookies.length) {
          const formattedCookies = COMPETITORS.homeDepot.cookies.map(c => ({
            name: c.name,
            value: c.value,
            domain: c.domain,
            path: "/"
          }));
          await context.addCookies(formattedCookies);
        }

        const hdMatch = await findBestProductMatch(page, COMPETITORS.homeDepot, invItem);
        if (hdMatch && hdMatch.price != null && hdMatch.score >= COMPETITORS.homeDepot.matchThreshold) {
            freshHd = hdMatch.price;
            hdTitle = hdMatch.candidate.title;
            hdUrl = hdMatch.candidate.url;
            hdSku = hdUrl.split('/').pop() || '';
            hdMethod = 'PLAYWRIGHT_SCRAPE';
            hdConf = 'HIGH';
            diagnosticLogs.push(`[Home Depot Playwright] Found match: ${hdTitle} at $${freshHd}`);
        } else {
            diagnosticLogs.push(`[Home Depot Playwright] No qualified match found (Score: ${hdMatch ? hdMatch.score : 0})`);
        }
      } catch (err: any) {
        diagnosticLogs.push(`[Home Depot Playwright Error] ${err.message}`);
      }

      await page.close();
      await context.close();
    } catch (err: any) {
      diagnosticLogs.push(`[Playwright Initialization Error] ${err.message}`);
      console.error("[Playwright Initialization Error]", err);
    }
"""

    lines[start_idx:end_idx] = [replacement + "\n"]

    with open(filepath, 'w') as f:
        f.writelines(lines)

patch_file('server.ts')
