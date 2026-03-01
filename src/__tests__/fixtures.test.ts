import { describe, test, expect } from "bun:test";
import { mockGoogleResult, mockLinkedInResult } from "./fixtures.js";
import type { BusinessResult } from "../core/types.js";

describe("BusinessResult fixtures", () => {
  test("mockGoogleResult has all required fields", () => {
    const result: BusinessResult = mockGoogleResult;
    expect(result.name).toBeString();
    expect(result.name.length).toBeGreaterThan(0);
    expect(result.businessType).toBeString();
    expect(result.source).toBe("google");
    expect(result.scrapedAt).toBeString();
  });

  test("mockGoogleResult scrapedAt is a valid ISO date", () => {
    const date = new Date(mockGoogleResult.scrapedAt);
    expect(isNaN(date.getTime())).toBe(false);
  });

  test("mockGoogleResult has google-specific fields", () => {
    expect(mockGoogleResult.rating).toBeNumber();
    expect(mockGoogleResult.reviewCount).toBeNumber();
    expect(mockGoogleResult.googleMapsUrl).toBeString();
    expect(mockGoogleResult.googleMapsUrl).toStartWith("https://");
  });

  test("mockLinkedInResult has all required fields", () => {
    const result: BusinessResult = mockLinkedInResult;
    expect(result.name).toBeString();
    expect(result.name.length).toBeGreaterThan(0);
    expect(result.businessType).toBeString();
    expect(result.source).toBe("linkedin");
    expect(result.scrapedAt).toBeString();
  });

  test("mockLinkedInResult scrapedAt is a valid ISO date", () => {
    const date = new Date(mockLinkedInResult.scrapedAt);
    expect(isNaN(date.getTime())).toBe(false);
  });

  test("mockLinkedInResult has linkedin-specific fields", () => {
    expect(mockLinkedInResult.linkedinUrl).toBeString();
    expect(mockLinkedInResult.linkedinUrl).toStartWith("https://www.linkedin.com/");
  });

  test("source is always 'google' or 'linkedin'", () => {
    const validSources = ["google", "linkedin"];
    expect(validSources).toContain(mockGoogleResult.source);
    expect(validSources).toContain(mockLinkedInResult.source);
  });

  test("both fixtures share the same businessType", () => {
    expect(mockGoogleResult.businessType).toBe(mockLinkedInResult.businessType);
  });
});
