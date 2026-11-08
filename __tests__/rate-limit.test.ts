import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit, rateLimitKey, rateLimitHeaders } from "../lib/server/rate-limit";

describe("rateLimitKey", () => {
  it("uses tenant slug when present", () => {
    const req = new Request("https://example.com/api/data", {
      headers: { "cf-connecting-ip": "1.2.3.4" },
    });
    expect(rateLimitKey(req, "acme")).toBe("tenant:acme:1.2.3.4");
  });

  it("uses global prefix without tenant", () => {
    const req = new Request("https://example.com/api/data", {
      headers: { "cf-connecting-ip": "1.2.3.4" },
    });
    expect(rateLimitKey(req)).toBe("global:1.2.3.4");
  });

  it("falls back to x-forwarded-for", () => {
    const req = new Request("https://example.com/api/data", {
      headers: { "x-forwarded-for": "10.0.0.1, 10.0.0.2" },
    });
    expect(rateLimitKey(req, "acme")).toBe("tenant:acme:10.0.0.1");
  });

  it("falls back to unknown if no IP headers", () => {
    const req = new Request("https://example.com/api/data");
    expect(rateLimitKey(req)).toBe("global:unknown");
  });
});

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("allows requests within the limit", () => {
    const key = `test-allow-${Date.now()}`;
    const result = checkRateLimit(key, 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks after exceeding the limit", () => {
    const key = `test-block-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, 5, 60_000);
    }
    const result = checkRateLimit(key, 5, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after the window expires", () => {
    const key = `test-reset-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, 5, 1_000);
    }
    expect(checkRateLimit(key, 5, 1_000).allowed).toBe(false);

    vi.advanceTimersByTime(1_100);

    const result = checkRateLimit(key, 5, 1_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("isolates rate limits between tenants", () => {
    const keyA = `tenant:alpha:1.1.1.1-${Date.now()}`;
    const keyB = `tenant:beta:1.1.1.1-${Date.now()}`;

    for (let i = 0; i < 3; i++) {
      checkRateLimit(keyA, 3, 60_000);
    }
    expect(checkRateLimit(keyA, 3, 60_000).allowed).toBe(false);
    expect(checkRateLimit(keyB, 3, 60_000).allowed).toBe(true);
  });
});

describe("rateLimitHeaders", () => {
  it("returns standard rate limit headers", () => {
    const result = { allowed: true, remaining: 118, resetAt: 1700000060000 };
    const headers = rateLimitHeaders(result);
    expect(headers["X-RateLimit-Remaining"]).toBe("118");
    expect(headers["X-RateLimit-Reset"]).toBe("1700000060");
  });
});
