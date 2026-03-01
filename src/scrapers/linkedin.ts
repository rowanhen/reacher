import { chromium } from "playwright";
import type { BusinessResult, BrowserOptions } from "../core/types.js";

export async function scrapeLinkedIn(
  businessType: string,
  location: string | undefined,
  limit: number,
  opts: BrowserOptions
): Promise<BusinessResult[]> {
  const keywords = location ? `${businessType} ${location}` : businessType;

  const browser = await chromium.launch({ headless: opts.headless });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
    locale: "en-GB",
    timezoneId: "Europe/London",
  });

  const page = await context.newPage();
  const results: BusinessResult[] = [];

  try {
    // geoUrn 101165590 = United Kingdom
    const ukGeoUrn = encodeURIComponent('["urn:li:geo:101165590"]');
    const searchUrl = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(keywords)}&geoUrn=${ukGeoUrn}`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Handle potential login wall - grab what we can from public results
    const cards = await page
      .locator(".reusable-search__result-container")
      .all();

    for (const card of cards) {
      if (results.length >= limit) break;

      try {
        const name = await card
          .locator(".entity-result__title-text a span[aria-hidden]")
          .first()
          .textContent()
          .catch(() => null);

        if (!name) continue;

        const linkedinUrl = await card
          .locator(".entity-result__title-text a")
          .first()
          .getAttribute("href")
          .catch(() => null);

        const description = await card
          .locator(".entity-result__summary")
          .first()
          .textContent()
          .catch(() => null);

        const locationText = await card
          .locator(".entity-result__secondary-subtitle")
          .first()
          .textContent()
          .catch(() => null);

        results.push({
          name: name.trim(),
          businessType,
          location: locationText?.trim() ?? location,
          description: description?.trim(),
          linkedinUrl: linkedinUrl
            ? `https://www.linkedin.com${linkedinUrl.split("?")[0]}`
            : undefined,
          source: "linkedin",
          scrapedAt: new Date().toISOString(),
        });
      } catch {
        // skip card on error
      }
    }
  } finally {
    await browser.close();
  }

  return results.slice(0, limit);
}
