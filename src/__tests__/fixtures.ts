import type { BusinessResult } from "../core/types.js";

export const mockGoogleResult: BusinessResult = {
  name: "Acme Dental",
  businessType: "dentist",
  address: "123 Main St, Austin, TX 78701",
  location: "Austin, TX",
  phone: "(512) 555-0100",
  website: "https://acmedental.com",
  rating: 4.7,
  reviewCount: 312,
  googleMapsUrl: "https://www.google.com/maps/place/Acme+Dental",
  source: "google",
  scrapedAt: "2025-01-01T00:00:00.000Z",
};

export const mockLinkedInResult: BusinessResult = {
  name: "Acme Health Group",
  businessType: "dentist",
  location: "Austin, Texas, United States",
  description: "Leading dental care provider in Central Texas.",
  linkedinUrl: "https://www.linkedin.com/company/acme-health-group",
  source: "linkedin",
  scrapedAt: "2025-01-01T00:00:00.000Z",
};
