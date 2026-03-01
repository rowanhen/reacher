# reacher

A CLI tool for scraping business listings from Google Maps and LinkedIn by business type and location.

## Installation

```bash
npm install -g @shepherd-terminal/reacher
```

Or run without installing:

```bash
npx @shepherd-terminal/reacher search --type "dentist" --location "London"
```

## Requirements

- Node.js >= 18.0.0
- Playwright Chromium browser (installed automatically with the package)

If Chromium is not installed, run:

```bash
npx playwright install chromium
```

## Usage

```
reacher search [options]
```

### Options

| Flag | Alias | Description | Default |
|------|-------|-------------|---------|
| `--type <business-type>` | `-t` | Business type to search for (required) | — |
| `--location <location>` | `-l` | Location to search in | — |
| `--limit <number>` | `-n` | Maximum number of results | `20` |
| `--source <source>` | `-s` | Data source: `google`, `linkedin`, or `all` | `google` |
| `--no-headless` | | Show the browser window while scraping | headless |
| `--json` | `-j` | Output results as JSON | table |

### Examples

Search for dentists in London on Google Maps:

```bash
reacher search --type "dentist" --location "London"
```

Search both Google Maps and LinkedIn with a higher limit:

```bash
reacher search --type "gym" --location "Manchester" --source all --limit 50
```

Output results as JSON:

```bash
reacher search --type "restaurant" --location "Edinburgh" --json
```

Show the browser while scraping (useful for debugging):

```bash
reacher search --type "plumber" --location "Bristol" --no-headless
```

## Output

By default, results are printed as a formatted table:

```
Name                  Address                  Phone          Rating  Source
--------------------  -----------------------  -------------  ------  ------
Dental Care London    123 High St, London      020 1234 5678  4.8     google
City Smiles           45 Baker St, London      020 9876 5432  4.6     google
```

With `--json`, results are output as a JSON array:

```json
[
  {
    "name": "Dental Care London",
    "businessType": "dentist",
    "address": "123 High St, London",
    "phone": "020 1234 5678",
    "website": "https://dentalcarelondon.co.uk",
    "rating": 4.8,
    "reviewCount": 312,
    "googleMapsUrl": "https://maps.google.com/...",
    "source": "google",
    "scrapedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

## Library Usage

Reacher can also be used programmatically:

```typescript
import { scrapeGoogle, scrapeLinkedIn } from "@shepherd-terminal/reacher";
import type { BusinessResult, BrowserOptions } from "@shepherd-terminal/reacher";

const options: BrowserOptions = { headless: true };

const googleResults: BusinessResult[] = await scrapeGoogle("dentist", "London", 20, options);
const linkedinResults: BusinessResult[] = await scrapeLinkedIn("dentist", "London", 20, options);
```

## License

MIT
