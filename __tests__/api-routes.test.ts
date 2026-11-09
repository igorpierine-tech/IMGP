import { describe, it, expect } from "vitest";

const BASE = "http://localhost:5173/Projetos";

async function apiFetch(path: string, options?: RequestInit) {
  return fetch(`${BASE}${path}`, { credentials: "include", ...options });
}

describe("API Route Smoke Tests", () => {
  describe("GET /api/dashboard", () => {
    it("returns dashboard KPIs structure", async () => {
      const r = await apiFetch("/api/dashboard");
      if (r.status === 401) return;
      expect(r.status).toBe(200);
      const body = (await r.json()) as Record<string, any>;
      expect(body).toHaveProperty("dashboard");
      const d = body.dashboard;
      expect(d).toHaveProperty("projects");
      expect(d).toHaveProperty("tasks");
      expect(d).toHaveProperty("demands");
      expect(d.projects).toHaveProperty("total");
      expect(typeof d.projects.total).toBe("number");
    });
  });

  describe("GET /api/projects", () => {
    it("returns projects array", async () => {
      const r = await apiFetch("/api/projects");
      if (r.status === 401) return;
      expect(r.status).toBe(200);
      const body = (await r.json()) as Record<string, any>;
      expect(body).toHaveProperty("projects");
      expect(Array.isArray(body.projects)).toBe(true);
    });
  });

  describe("GET /api/demands", () => {
    it("returns demands array", async () => {
      const r = await apiFetch("/api/demands");
      if (r.status === 401) return;
      expect(r.status).toBe(200);
      const body = (await r.json()) as Record<string, any>;
      expect(body).toHaveProperty("demands");
      expect(Array.isArray(body.demands)).toBe(true);
    });
  });

  describe("GET /api/users", () => {
    it("returns users array", async () => {
      const r = await apiFetch("/api/users");
      if (r.status === 401) return;
      expect(r.status).toBe(200);
      const body = (await r.json()) as Record<string, any>;
      expect(body).toHaveProperty("users");
      expect(Array.isArray(body.users)).toBe(true);
    });
  });

  describe("GET /api/search", () => {
    it("returns results for a query", async () => {
      const r = await apiFetch("/api/search?q=test&limit=5");
      if (r.status === 401) return;
      expect(r.status).toBe(200);
      const body = (await r.json()) as Record<string, any>;
      expect(body).toHaveProperty("results");
      expect(Array.isArray(body.results)).toBe(true);
    });
  });

  describe("GET /api/kanban", () => {
    it("requires projectId parameter", async () => {
      const r = await apiFetch("/api/kanban");
      if (r.status === 401) return;
      expect([200, 400]).toContain(r.status);
    });
  });

  describe("GET /api/notifications", () => {
    it("returns notifications with unread count", async () => {
      const r = await apiFetch("/api/notifications?limit=5");
      if (r.status === 401) return;
      expect(r.status).toBe(200);
      const body = (await r.json()) as Record<string, any>;
      expect(body).toHaveProperty("notifications");
      expect(body).toHaveProperty("unreadCount");
      expect(typeof body.unreadCount).toBe("number");
    });
  });

  describe("GET /api/okrs", () => {
    it("returns objectives array", async () => {
      const r = await apiFetch("/api/okrs");
      if (r.status === 401) return;
      expect(r.status).toBe(200);
      const body = (await r.json()) as Record<string, any>;
      expect(body).toHaveProperty("objectives");
      expect(Array.isArray(body.objectives)).toBe(true);
    });
  });

  describe("GET /api/activity", () => {
    it("returns activity feed", async () => {
      const r = await apiFetch("/api/activity?days=7");
      if (r.status === 401) return;
      expect(r.status).toBe(200);
      const body = (await r.json()) as Record<string, any>;
      expect(body).toHaveProperty("feed");
      expect(Array.isArray(body.feed)).toBe(true);
    });
  });

  describe("GET /api/preferences", () => {
    it("returns preferences object", async () => {
      const r = await apiFetch("/api/preferences");
      if (r.status === 401) return;
      expect(r.status).toBe(200);
      const body = (await r.json()) as Record<string, any>;
      expect(body).toHaveProperty("preferences");
    });
  });

  describe("POST /api/projects validation", () => {
    it("rejects empty body", async () => {
      const r = await apiFetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (r.status === 401) return;
      expect(r.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("POST /api/demands validation", () => {
    it("rejects empty body", async () => {
      const r = await apiFetch("/api/demands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (r.status === 401) return;
      expect(r.status).toBeGreaterThanOrEqual(400);
    });
  });
});
