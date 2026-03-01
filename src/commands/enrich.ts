import { readFileSync } from "node:fs";
import { Command } from "commander";
import { scrapeEmails } from "../scrapers/email.js";
import type { BusinessResult } from "../core/types.js";

async function readInput(inputPath: string | undefined): Promise<BusinessResult[]> {
  let raw: string;

  if (inputPath) {
    raw = readFileSync(inputPath, "utf-8");
  } else {
    // Read from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    raw = Buffer.concat(chunks).toString("utf-8");
  }

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Input must be a JSON array of BusinessResult objects");
  }
  return parsed as BusinessResult[];
}

async function enrichWithEmails(
  results: BusinessResult[],
  concurrency: number
): Promise<BusinessResult[]> {
  const enriched = [...results];
  const withWebsite = enriched.filter((r) => r.website);

  // Process in batches of `concurrency`
  for (let i = 0; i < withWebsite.length; i += concurrency) {
    const batch = withWebsite.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (result) => {
        try {
          const emails = await scrapeEmails(result.website!);
          if (emails.length > 0) {
            result.emails = emails;
          }
        } catch {
          // skip silently
        }
      })
    );
  }

  return enriched;
}

export const enrichCommand = new Command("enrich")
  .description("Enrich saved search results with additional data (e.g. emails from company websites)")
  .option("-i, --input <file>", "Path to JSON file of BusinessResult[] (reads stdin if omitted)")
  .option("--emails", "Enrich with emails scraped from company websites")
  .option("-c, --concurrency <n>", "Number of parallel fetches (max 5)", "3")
  .option("-j, --json", "Output as JSON (default)")
  .option("--no-json", "Output as table")
  .action(async (opts) => {
    let results: BusinessResult[];

    try {
      results = await readInput(opts.input);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`Error reading input: ${msg}\n`);
      process.exit(1);
    }

    const concurrency = Math.min(5, Math.max(1, parseInt(opts.concurrency, 10) || 3));

    // Default to emails enrichment if no flags given
    const doEmails = opts.emails || true;

    if (doEmails) {
      const withWebsite = results.filter((r) => r.website).length;
      process.stderr.write(
        `Enriching ${withWebsite} result(s) with emails (concurrency: ${concurrency})...\n`
      );
      results = await enrichWithEmails(results, concurrency);
    }

    if (opts.json !== false) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      if (results.length === 0) {
        console.log("No results.");
        return;
      }

      const cols = {
        name: Math.min(30, Math.max(4, ...results.map((r) => r.name.length))),
        emails: Math.min(50, Math.max(6, ...results.map((r) => (r.emails ?? []).join(", ").length))),
      };

      const pad = (s: string, n: number) => s.slice(0, n).padEnd(n);
      const sep = `${"-".repeat(cols.name)}-+-${"-".repeat(cols.emails)}`;
      console.log(`${pad("Name", cols.name)} | ${pad("Emails", cols.emails)}`);
      console.log(sep);

      for (const r of results) {
        const emailStr = (r.emails ?? []).join(", ");
        console.log(`${pad(r.name, cols.name)} | ${pad(emailStr, cols.emails)}`);
      }
    }
  });
