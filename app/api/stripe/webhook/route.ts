import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/billing/stripe";
import { db } from "@/lib/db/client";
import { workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import type { Plan } from "@/lib/billing/plans";

const SUBSCRIPTION_TO_PLAN: Record<string, Plan> = {
  [process.env.STRIPE_PRICE_STARTER_MONTHLY ?? ""]: "starter",
  [process.env.STRIPE_PRICE_STARTER_YEARLY ?? ""]: "starter",
  [process.env.STRIPE_PRICE_PRO_MONTHLY ?? ""]: "pro",
  [process.env.STRIPE_PRICE_PRO_YEARLY ?? ""]: "pro",
  [process.env.STRIPE_PRICE_AGENCY_MONTHLY ?? ""]: "agency",
  [process.env.STRIPE_PRICE_AGENCY_YEARLY ?? ""]: "agency",
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: "Webhook signature invalid" }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    await handleSubscriptionChange(event);
  }

  return NextResponse.json({ received: true });
}

async function handleSubscriptionChange(event: Stripe.Event) {
  let subscription: Stripe.Subscription;
  let workspaceId: string | undefined;
  let customerId: string | undefined;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    workspaceId = session.metadata?.workspaceId;
    customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
  } else {
    subscription = event.data.object as Stripe.Subscription;
    workspaceId = subscription.metadata?.workspaceId;
    customerId = subscription.customer as string;
  }

  if (!workspaceId) return;

  const priceId = subscription.items.data[0]?.price?.id ?? "";
  const plan: Plan =
    event.type === "customer.subscription.deleted"
      ? "free"
      : (SUBSCRIPTION_TO_PLAN[priceId] ?? "free");

  await db
    .update(workspaces)
    .set({
      plan,
      stripeCustomerId: customerId,
      stripeSubscriptionId:
        event.type === "customer.subscription.deleted" ? null : subscription.id,
    })
    .where(eq(workspaces.id, workspaceId));
}
