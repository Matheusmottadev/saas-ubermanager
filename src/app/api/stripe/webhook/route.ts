import { NextResponse } from "next/server";
import Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { deriveAccessStatus } from "@/lib/subscription";

const STRIPE_SUPPORTED_EVENTS = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY não configurado.");
  }

  return new Stripe(secretKey);
}

function toDateFromUnix(value?: number | null) {
  if (!value) {
    return null;
  }

  return new Date(value * 1000);
}

function normalizeProviderStatus(status?: string | null) {
  if (!status) {
    return "pending_payment";
  }

  if (status === "canceled") {
    return "cancelled";
  }

  return status;
}

function buildExternalReferenceCandidates(value?: string | null) {
  if (!value) {
    return [];
  }

  return [value, value.startsWith("user:") ? value : `user:${value}`];
}

async function findLocalSubscriptionFromObject(
  object:
    | Stripe.Checkout.Session
    | Stripe.Invoice
    | Stripe.Subscription,
) {
  const candidates: Array<{ field: "externalReference" | "providerSubscriptionId"; value: string }> = [];

  if ("subscription" in object && typeof object.subscription === "string") {
    candidates.push({ field: "providerSubscriptionId", value: object.subscription });
  }

  if ("id" in object && object.object === "subscription") {
    candidates.push({ field: "providerSubscriptionId", value: object.id });
  }

  if ("client_reference_id" in object && object.client_reference_id) {
    for (const value of buildExternalReferenceCandidates(object.client_reference_id)) {
      candidates.push({ field: "externalReference", value });
    }
  }

  if ("metadata" in object && object.metadata) {
    for (const raw of [
      object.metadata.externalReference,
      object.metadata.external_reference,
      object.metadata.userId,
      object.metadata.user_id,
    ]) {
      for (const value of buildExternalReferenceCandidates(raw)) {
        candidates.push({ field: "externalReference", value });
      }
    }
  }

  for (const candidate of candidates) {
    const subscription =
      candidate.field === "providerSubscriptionId"
        ? await prisma.subscription.findUnique({
            where: {
              providerSubscriptionId: candidate.value,
            },
          })
        : await prisma.subscription.findUnique({
            where: {
              externalReference: candidate.value,
            },
          });

    if (subscription) {
      return subscription;
    }
  }

  return null;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const invoiceWithSubscription = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  };

  return typeof invoiceWithSubscription.subscription === "string"
    ? invoiceWithSubscription.subscription
    : invoiceWithSubscription.subscription?.id ?? null;
}

async function recordSubscriptionEvent(
  subscriptionId: string,
  type: string,
  payload: unknown,
) {
  await prisma.subscriptionEvent.create({
    data: {
      payload: JSON.parse(JSON.stringify(payload)) as object,
      subscriptionId,
      type,
    },
  });
}

async function syncStripeSubscription(
  stripeSubscriptionId: string,
  fallback?: Stripe.Checkout.Session | Stripe.Invoice | Stripe.Subscription,
) {
  const stripe = getStripeClient();
  const remote =
    fallback && fallback.object === "subscription"
      ? fallback
      : await stripe.subscriptions.retrieve(stripeSubscriptionId);

  const local = await findLocalSubscriptionFromObject(remote);

  if (!local) {
    return null;
  }

  const periodEnd =
    remote.items.data[0]?.current_period_end ??
    null;
  const providerStatus = normalizeProviderStatus(remote.status);
  const trialEndsAt = toDateFromUnix(remote.trial_end);
  const accessEndsAt = toDateFromUnix(periodEnd) ?? trialEndsAt ?? local.accessEndsAt;
  const nextBillingAt = toDateFromUnix(periodEnd);
  const paymentMethodId =
    typeof remote.default_payment_method === "string"
      ? remote.default_payment_method
      : remote.default_payment_method?.id ?? local.paymentMethodId;

  const updated = await prisma.subscription.update({
    data: {
      accessEndsAt,
      accessStatus: deriveAccessStatus({
        accessEndsAt,
        providerStatus,
        trialEndsAt,
      }),
      nextBillingAt,
      paymentMethodId,
      provider: "stripe",
      providerSubscriptionId: remote.id,
      startedAt: toDateFromUnix(remote.start_date) ?? local.startedAt,
      status: providerStatus,
      trialEndsAt,
    },
    where: {
      id: local.id,
    },
  });

  return updated;
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json(
        { error: "STRIPE_WEBHOOK_SECRET não configurado." },
        { status: 500 },
      );
    }

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Assinatura do webhook não enviada." },
        { status: 400 },
      );
    }

    const stripe = getStripeClient();
    const body = await request.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    if (!STRIPE_SUPPORTED_EVENTS.has(event.type)) {
      return NextResponse.json({ ignored: true, received: true });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (typeof session.subscription === "string") {
          const local = await syncStripeSubscription(session.subscription, session);
          if (local) {
            await recordSubscriptionEvent(local.id, event.type, session);
          } else {
            console.warn("stripe webhook checkout session without local subscription", {
              clientReferenceId: session.client_reference_id,
              subscriptionId: session.subscription,
            });
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const local = await syncStripeSubscription(subscription.id, subscription);

        if (local) {
          await recordSubscriptionEvent(local.id, event.type, subscription);
        } else {
          console.warn("stripe webhook subscription without local subscription", {
            subscriptionId: subscription.id,
          });
        }
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = getInvoiceSubscriptionId(invoice);

        if (subscriptionId) {
          const local = await syncStripeSubscription(subscriptionId, invoice);
          if (local) {
            await recordSubscriptionEvent(local.id, event.type, invoice);
          } else {
            console.warn("stripe webhook invoice without local subscription", {
              invoiceId: invoice.id,
              subscriptionId,
            });
          }
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("stripe webhook failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível processar o webhook da Stripe." },
      { status: 400 },
    );
  }
}
