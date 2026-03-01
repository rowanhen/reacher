export type Source = "google" | "linkedin" | "all";

export interface BusinessResult {
  name: string;
  businessType: string;
  address?: string;
  location?: string;
  phone?: string;
  website?: string;
  email?: string;
  rating?: number;
  reviewCount?: number;
  description?: string;
  linkedinUrl?: string;
  googleMapsUrl?: string;
  source: "google" | "linkedin";
  scrapedAt: string;
}

export interface SearchOptions {
  type: string;
  location?: string;
  limit: number;
  source: Source;
  json: boolean;
  headless: boolean;
}

export interface BrowserOptions {
  headless: boolean;
}
