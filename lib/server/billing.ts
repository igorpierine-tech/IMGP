import { eq } from "drizzle-orm";
import { getMasterDb } from "../../db";
import { tenants, plans } from "../../db/master-schema";
import { env } from "cloudflare:workers";

function getStripeSecret(): string {
  const key = (env as Record<string, unknown>).STRIPE_SECRET_KEY as string | undefined;
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada.");
  return key;
}

function stripeBaseUrl() {
  return "https://api.stripe.com/v1";
}

async function stripeRequest(path: string, method: string, body?: Record<string, string>) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getStripeSecret()}`,
  };
  let bodyStr: string | undefined;
  if (body) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    bodyStr = new URLSearchParams(body).toString();
  }
  const resp = await fetch(`${stripeBaseUrl()}${path}`, { method, headers, body: bodyStr });
  const data = await resp.json() as Record<string, unknown>;
  if (!resp.ok) throw new Error((data.error as Record<string, string>)?.message ?? "Erro na API do Stripe.");
  return data;
}

export async function getOrCreateCustomer(tenantId: string): Promise<string> {
  const db = getMasterDb();
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) throw new Error("Tenant não encontrado.");

  if (tenant.stripeCustomerId) return tenant.stripeCustomerId;

  const customer = await stripeRequest("/customers", "POST", {
    name: tenant.name,
    metadata_tenant_id: tenantId,
    metadata_slug: tenant.slug,
  }) as { id: string };

  await db.update(tenants).set({
    stripeCustomerId: customer.id,
    updatedAt: new Date(),
  }).where(eq(tenants.id, tenantId));

  return customer.id;
}

export async function createCheckoutSession(
  tenantId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
): Promise<{ url: string }> {
  const customerId = await getOrCreateCustomer(tenantId);
  const session = await stripeRequest("/checkout/sessions", "POST", {
    customer: customerId,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    "metadata[tenant_id]": tenantId,
  }) as { url: string };
  return { url: session.url };
}

export async function createPortalSession(tenantId: string, returnUrl: string): Promise<{ url: string }> {
  const customerId = await getOrCreateCustomer(tenantId);
  const session = await stripeRequest("/billing_portal/sessions", "POST", {
    customer: customerId,
    return_url: returnUrl,
  }) as { url: string };
  return { url: session.url };
}

export async function handleStripeWebhook(
  request: Request,
): Promise<Response> {
  const sigHeader = request.headers.get("stripe-signature");
  const webhookSecret = (env as Record<string, unknown>).STRIPE_WEBHOOK_SECRET as string | undefined;

  if (!sigHeader || !webhookSecret) {
    return new Response("Webhook secret not configured", { status: 400 });
  }

  const body = await request.text();

  const parts = sigHeader.split(",").reduce((acc, part) => {
    const [key, val] = part.split("=");
    acc[key] = val;
    return acc;
  }, {} as Record<string, string>);

  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) {
    return new Response("Invalid signature format", { status: 400 });
  }

  const payload = `${timestamp}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expectedSig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)),
  );
  const expectedHex = Array.from(expectedSig).map((b) => b.toString(16).padStart(2, "0")).join("");

  if (expectedHex !== signature) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(body) as { type: string; data: { object: Record<string, unknown> } };
  const db = getMasterDb();

  switch (event.type) {
    case "checkout.session.completed": {
      const tenantId = (event.data.object.metadata as Record<string, string>)?.tenant_id;
      const subscriptionId = event.data.object.subscription as string;
      if (tenantId && subscriptionId) {
        await db.update(tenants).set({
          stripeSubscriptionId: subscriptionId,
          status: "active",
          updatedAt: new Date(),
        }).where(eq(tenants.id, tenantId));
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subId = event.data.object.id as string;
      const [tenant] = await db.select().from(tenants).where(eq(tenants.stripeSubscriptionId, subId)).limit(1);
      if (tenant) {
        await db.update(tenants).set({
          status: "cancelled",
          stripeSubscriptionId: null,
          updatedAt: new Date(),
        }).where(eq(tenants.id, tenant.id));
      }
      break;
    }
    case "customer.subscription.updated": {
      const subId = event.data.object.id as string;
      const status = event.data.object.status as string;
      if (status === "past_due" || status === "unpaid") {
        const [tenant] = await db.select().from(tenants).where(eq(tenants.stripeSubscriptionId, subId)).limit(1);
        if (tenant) {
          await db.update(tenants).set({
            status: "suspended",
            updatedAt: new Date(),
          }).where(eq(tenants.id, tenant.id));
        }
      }
      break;
    }
  }

  return new Response("ok", { status: 200 });
}

export async function listPlans() {
  const db = getMasterDb();
  return db.select().from(plans).where(eq(plans.active, true)).orderBy(plans.priceMonthly);
}
