import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-04-22.dahlia",
    });
  }
  return _stripe;
}

// Convenience alias kept for callers that already imported `stripe`
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as any)[prop];
  },
});

export const PRICE_IDS: Record<string, { monthly?: string; yearly?: string }> = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    yearly: process.env.STRIPE_PRICE_STARTER_YEARLY,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
  },
  agency: {
    monthly: process.env.STRIPE_PRICE_AGENCY_MONTHLY,
    yearly: process.env.STRIPE_PRICE_AGENCY_YEARLY,
  },
};

export async function createCheckoutSession({
  workspaceId,
  userId,
  userEmail,
  plan,
  interval,
  returnUrl,
}: {
  workspaceId: string;
  userId: string;
  userEmail: string;
  plan: "starter" | "pro" | "agency";
  interval: "monthly" | "yearly";
  returnUrl: string;
}): Promise<string> {
  const priceId = PRICE_IDS[plan]?.[interval];
  if (!priceId) throw new Error(`No price ID configured for ${plan}/${interval}`);

  const s = getStripe();
  const session = await s.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: userEmail,
    metadata: { workspaceId, userId, plan },
    success_url: `${returnUrl}/billing?session_id={CHECKOUT_SESSION_ID}&status=success`,
    cancel_url: `${returnUrl}/billing?status=cancelled`,
    subscription_data: {
      metadata: { workspaceId, userId, plan },
    },
  });

  return session.url!;
}

export async function createCustomerPortalSession(
  stripeCustomerId: string,
  returnUrl: string,
): Promise<string> {
  const s = getStripe();
  const session = await s.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${returnUrl}/billing`,
  });
  return session.url;
}
