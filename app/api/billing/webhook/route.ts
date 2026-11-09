import { handleStripeWebhook } from "@/lib/server/billing";

export async function POST(request: Request) {
  return handleStripeWebhook(request);
}
