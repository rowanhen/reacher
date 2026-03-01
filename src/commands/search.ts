import { Command } from "commander";
import { scrapeGoogle } from "../scrapers/google.js";
import { scrapeLinkedIn } from "../scrapers/linkedin.js";
import type { BusinessResult, Source } from "../core/types.js";

function printTable(results: BusinessResult[]): void {
  if (results.length === 0) {
    console.log("No results found.");
    return;
  }

  const cols = {
    name: Math.min(30, Math.max(4, ...results.map((r) => r.name.length))),
    address: Math.min(35, Math.max(7, ...results.map((r) => (r.address ?? r.location ?? "").length))),
    phone: Math.min(16, Math.max(5, ...results.map((r) => (r.phone ?? "").length))),
    rating: 6,
    source: 8,
  };

  const pad = (s: string, n: number) => s.slice(0, n).padEnd(n);
  const sep = ["-".repeat(cols.name), "-".repeat(cols.address), "-".repeat(cols.phone), "-".repeat(cols.rating), "-".repeat(cols.source)].join("-+-");
  const header = [pad("Name", cols.name), pad("Address", cols.address), pad("Phone", cols.phone), pad("Rating", cols.rating), pad("Source", cols.source)].join(" | ");

  console.log(header);
  console.log(sep);

  for (const r of results) {
    const rating = r.rating != null ? r.rating.toFixed(1) : "–";
    const line = [
      pad(r.name, cols.name),
      pad(r.address ?? r.location ?? "", cols.address),
      pad(r.phone ?? "", cols.phone),
      pad(rating, cols.rating),
      pad(r.source, cols.source),
    ].join(" | ");
    console.log(line);
  }
}

export const searchCommand = new Command("search")
  .description("Search for businesses by type and location")
  .requiredOption("-t, --type <business-type>", "Business type to search for (e.g. dentist, gym, restaurant)")
  .option("-l, --location <location>", "Location to search in (e.g. 'London', 'Manchester', 'Edinburgh')")
  .option("-n, --limit <number>", "Maximum number of results", "20")
  .option(
    "-s, --source <source>",
    "Data source: google, linkedin, or all",
    "google"
  )
  .option("--no-headless", "Show the browser window while scraping")
  .option("-j, --json", "Output results as JSON")
  .action(async (opts) => {
    const limit = parseInt(opts.limit, 10);
    const source = opts.source as Source;
    const headless = opts.headless as boolean;

    if (!["google", "linkedin", "all"].includes(source)) {
      console.error(`Error: --source must be one of: google, linkedin, all`);
      process.exit(1);
    }

    if (isNaN(limit) || limit < 1) {
      console.error("Error: --limit must be a positive integer");
      process.exit(1);
    }

    const results: BusinessResult[] = [];

    if (source === "google" || source === "all") {
      process.stderr.write(`Scraping Google Maps for "${opts.type}"...\n`);
      const google = await scrapeGoogle(opts.type, opts.location, limit, { headless });
      results.push(...google);
    }

    if (source === "linkedin" || source === "all") {
      const remaining = limit - results.length;
      if (remaining > 0) {
        process.stderr.write(`Scraping LinkedIn for "${opts.type}"...\n`);
        const linkedin = await scrapeLinkedIn(opts.type, opts.location, remaining, { headless });
        results.push(...linkedin);
      }
    }

    if (opts.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      printTable(results);
    }
  });
