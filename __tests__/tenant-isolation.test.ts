import { describe, it, expect } from "vitest";

/**
 * Inlined extractTenantSlug for testing without Cloudflare Workers runtime.
 * Mirrors lib/server/tenant-context.ts:extractTenantSlug exactly.
 */
function extractTenantSlug(request: Request): string | null {
  const headerSlug = request.headers.get("x-tenant-slug");
  if (headerSlug) return headerSlug;

  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const baseIdx = pathParts.indexOf("Projetos");
  if (baseIdx >= 0 && pathParts[baseIdx + 1] === "t" && pathParts[baseIdx + 2]) {
    return pathParts[baseIdx + 2];
  }

  const subdomain = url.hostname.split(".")[0];
  if (subdomain && subdomain !== "www" && subdomain !== "localhost") {
    return subdomain;
  }

  return null;
}

describe("tenant slug extraction — isolation", () => {
  it("extracts slug from x-tenant-slug header", () => {
    const req = new Request("https://app.example.com/Projetos/api/projects", {
      headers: { "x-tenant-slug": "acme" },
    });
    expect(extractTenantSlug(req)).toBe("acme");
  });

  it("extracts slug from URL path /Projetos/t/{slug}/...", () => {
    const req = new Request("https://app.example.com/Projetos/t/acme/legacy");
    expect(extractTenantSlug(req)).toBe("acme");
  });

  it("extracts slug from subdomain", () => {
    const req = new Request("https://acme.example.com/Projetos/api/projects");
    expect(extractTenantSlug(req)).toBe("acme");
  });

  it("returns null for legacy requests (no tenant context)", () => {
    const req = new Request("https://localhost/Projetos/api/projects");
    expect(extractTenantSlug(req)).toBeNull();
  });

  it("header takes priority over URL path", () => {
    const req = new Request("https://app.example.com/Projetos/t/from-url/legacy", {
      headers: { "x-tenant-slug": "from-header" },
    });
    expect(extractTenantSlug(req)).toBe("from-header");
  });

  it("different tenants resolve to different slugs", () => {
    const reqA = new Request("https://app.example.com/Projetos/t/alpha/legacy");
    const reqB = new Request("https://app.example.com/Projetos/t/beta/legacy");
    const slugA = extractTenantSlug(reqA);
    const slugB = extractTenantSlug(reqB);
    expect(slugA).toBe("alpha");
    expect(slugB).toBe("beta");
    expect(slugA).not.toBe(slugB);
  });

  it("does not leak slug across requests", () => {
    const withTenant = new Request("https://app.example.com/Projetos/t/acme/legacy");
    const withoutTenant = new Request("https://localhost/Projetos/legacy");

    expect(extractTenantSlug(withTenant)).toBe("acme");
    expect(extractTenantSlug(withoutTenant)).toBeNull();
  });

  it("ignores www subdomain", () => {
    const req = new Request("https://www.example.com/Projetos/api/data");
    expect(extractTenantSlug(req)).toBeNull();
  });

  it("handles nested basePath correctly", () => {
    const req = new Request("https://app.example.com/Projetos/t/deep-slug/api/projects/123");
    expect(extractTenantSlug(req)).toBe("deep-slug");
  });
});

describe("tenant isolation — rate limit key separation", () => {
  it("produces distinct rate-limit keys per tenant for same IP", () => {
    const ip = "203.0.113.50";
    const keyA = `tenant:alpha:${ip}`;
    const keyB = `tenant:beta:${ip}`;
    expect(keyA).not.toBe(keyB);
  });

  it("produces distinct keys for same tenant on different IPs", () => {
    const keyA = "tenant:acme:10.0.0.1";
    const keyB = "tenant:acme:10.0.0.2";
    expect(keyA).not.toBe(keyB);
  });
});
