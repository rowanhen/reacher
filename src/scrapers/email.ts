const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const PATHS_TO_CHECK = ["/", "/contact", "/contact-us", "/about", "/about-us"];

const FETCH_TIMEOUT_MS = 5000;

const BLOCKED_PREFIXES = [
  "noreply@",
  "no-reply@",
  "donotreply@",
  "do-not-reply@",
  "support@",
  "mailer@",
  "bounce@",
  "postmaster@",
  "webmaster@",
  "admin@",
  "info@",
  "hello@",
  "contact@",
  "enquiries@",
];

const BLOCKED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".pdf"];

function isLikelyPersonEmail(email: string): boolean {
  const lower = email.toLowerCase();
  if (BLOCKED_PREFIXES.some((p) => lower.startsWith(p))) return false;
  if (BLOCKED_EXTENSIONS.some((ext) => lower.endsWith(ext))) return false;
  // Skip very short local parts (e.g. "a@example.com")
  const local = lower.split("@")[0];
  if (local.length < 3) return false;
  return true;
}

function extractEmails(html: string): string[] {
  const found = new Set<string>();

  // Extract from mailto: hrefs
  const mailtoMatches = html.matchAll(/href=["']mailto:([^"'?#\s]+)/gi);
  for (const m of mailtoMatches) {
    const email = m[1].trim().toLowerCase();
    if (EMAIL_REGEX.test(email)) found.add(email);
  }

  // Reset lastIndex after using the regex with global flag
  EMAIL_REGEX.lastIndex = 0;

  // Extract via regex over full body
  const regexMatches = html.matchAll(EMAIL_REGEX);
  for (const m of regexMatches) {
    found.add(m[0].trim().toLowerCase());
  }

  return [...found];
}

async function fetchWithTimeout(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Reacher/1.0; +https://github.com/rowanhen/reacher)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html") && !ct.includes("text")) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeBase(websiteUrl: string): string {
  try {
    const u = new URL(websiteUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    // If parsing fails, try adding https://
    return `https://${websiteUrl.replace(/^https?:\/\//, "")}`;
  }
}

export async function scrapeEmails(websiteUrl: string): Promise<string[]> {
  const base = normalizeBase(websiteUrl);
  const allEmails = new Set<string>();

  for (const path of PATHS_TO_CHECK) {
    const url = `${base}${path}`;
    const html = await fetchWithTimeout(url);
    if (!html) continue;
    for (const email of extractEmails(html)) {
      if (isLikelyPersonEmail(email)) {
        allEmails.add(email);
      }
    }
  }

  return [...allEmails].sort();
}
