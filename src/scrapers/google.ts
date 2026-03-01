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

  try {
    const mapsUrl = `https://www.google.co.uk/maps/search/${encodeURIComponent(query)}?gl=gb&hl=en-GB`;
    await page.goto(mapsUrl, { waitUntil: "networkidle" });

    // Dismiss GDPR consent banner if present (Google redirects to consent.google.com in EU)
    const acceptBtn = page.locator('button:has-text("Accept all"), form[action*="consent"] button[value="1"]').first();
    if (await acceptBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await acceptBtn.click();
      await page.waitForNavigation({ waitUntil: "networkidle", timeout: 10000 }).catch(() => null);
    }

    // Wait for results panel
    await page.waitForSelector('[role="feed"]', { timeout: 15000 });

    // Scroll to load more results
    const feed = page.locator('[role="feed"]');
    let prevCount = 0;

    while (results.length < limit) {
      const cards = await page.locator('.Nv2PK').all();

      for (const card of cards) {
        if (results.length >= limit) break;

        try {
          await card.click();
          await page.waitForTimeout(1200);

          const name = await page
            .locator('h1[class*="DUwDvf"]')
            .first()
            .textContent()
            .catch(() => null);

          if (!name) continue;

          const address = await page
            .locator('button[data-item-id="address"]')
            .first()
            .textContent()
            .catch(() => null);

          const phone = await page
            .locator('button[data-item-id*="phone"]')
            .first()
            .textContent()
            .catch(() => null);

          const website = await page
            .locator('a[data-item-id="authority"]')
            .first()
            .getAttribute("href")
            .catch(() => null);

          const ratingText = await page
            .locator('div[class*="F7nice"] span[aria-hidden="true"]')
            .first()
            .textContent()
            .catch(() => null);

          const reviewText = await page
            .locator('div[class*="F7nice"] span[aria-label*="review"]')
            .first()
            .getAttribute("aria-label")
            .catch(() => null);

          const mapsUrl = page.url();

          results.push({
            name: name.trim(),
            businessType,
            address: address?.trim(),
            location,
            phone: phone?.trim(),
            website: website ?? undefined,
            rating: ratingText ? parseFloat(ratingText) : undefined,
            reviewCount: reviewText
              ? parseInt(reviewText.replace(/[^0-9]/g, ""), 10)
              : undefined,
            googleMapsUrl: mapsUrl,
            source: "google",
            scrapedAt: new Date().toISOString(),
          });
        } catch {
          // skip card on error
        }
      }

      const newCount = (await page.locator('.Nv2PK').count());
      if (newCount === prevCount) break;
      prevCount = newCount;

      // Scroll feed to load more
      await feed.evaluate((el) => el.scrollBy(0, 600));
      await page.waitForTimeout(1000);
    }
  } finally {
    await browser.close();
  }

  return results.slice(0, limit);
}
