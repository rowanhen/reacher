import { chromium } from "playwright";
import type { BusinessResult, BrowserOptions } from "../core/types.js";

export async function scrapeGoogle(
  businessType: string,
  location: string | undefined,
  limit: number,
  opts: BrowserOptions
): Promise<BusinessResult[]> {
  const query = location
    ? `${businessType} in ${location}`
    : businessType;

  const browser = await chromium.launch({ headless: opts.headless });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    locale: "en-GB",
    timezoneId: "Europe/London",
  });

  const page = await context.newPage();
  const results: BusinessResult[] = [];
  const seen = new Set<string>();

  try {
    const mapsUrl = `https://www.google.co.uk/maps/search/${encodeURIComponent(query)}?gl=gb&hl=en-GB`;
    await page.goto(mapsUrl, { waitUntil: "networkidle" });

    // Dismiss GDPR consent banner if present
    const acceptBtn = page.locator('button:has-text("Accept all"), form[action*="consent"] button[value="1"]').first();
    if (await acceptBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await acceptBtn.click();
      await page.waitForNavigation({ waitUntil: "networkidle", timeout: 10000 }).catch(() => null);
    }

    // Wait for results panel
    await page.waitForSelector('[role="feed"]', { timeout: 15000 });

    const feed = page.locator('[role="feed"]');
    let prevCount = 0;

    while (results.length < limit) {
      const cards = await page.locator('.Nv2PK').all();

      for (const card of cards) {
        if (results.length >= limit) break;

        try {
          // Name
          const name = await card.locator('.qBF1Pd').first().textContent().catch(() => null);
          if (!name?.trim() || seen.has(name.trim())) continue;

          // Rating and review count from aria-label e.g. "4.6 stars 9 reviews"
          const starLabel = await card.locator('[role="img"][aria-label*="stars"]').first().getAttribute('aria-label').catch(() => null);
          const ratingMatch = starLabel?.match(/([\d.]+)\s*stars?\s*([\d,]+)?\s*review/);
          const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;
          const reviewCount = ratingMatch?.[2] ? parseInt(ratingMatch[2].replace(/,/g, ''), 10) : undefined;

          // Address: second row of info spans ("Category · Street address")
          const infoRows = await card.locator('.W4Efsd .W4Efsd').all();
          let address: string | undefined;
          if (infoRows[0]) {
            const rowText = await infoRows[0].textContent().catch(() => null);
            // Format: "Category · Address" — take the part after ·
            const parts = rowText?.split('·');
            address = parts && parts.length > 1 ? parts[parts.length - 1].trim() : undefined;
          }

          // Phone: .UsdlK class
          const phone = await card.locator('.UsdlK').first().textContent().catch(() => null);

          // Maps URL
          const cardUrl = await card.locator('a[href*="maps"]').first().getAttribute('href').catch(() => null);

          seen.add(name.trim());
          results.push({
            name: name.trim(),
            businessType,
            address: address || undefined,
            location,
            phone: phone?.trim() || undefined,
            rating,
            reviewCount,
            googleMapsUrl: cardUrl ?? undefined,
            source: "google",
            scrapedAt: new Date().toISOString(),
          });
        } catch {
          // skip card on error
        }
      }

      const newCount = await page.locator('.Nv2PK').count();
      if (newCount === prevCount || results.length >= limit) break;
      prevCount = newCount;

      // Scroll to bottom of feed to trigger loading more results
      await feed.evaluate((el) => el.scrollTo(0, el.scrollHeight));
      await page.waitForTimeout(2000);
    }
  } finally {
    await browser.close();
  }

  return results.slice(0, limit);
}
