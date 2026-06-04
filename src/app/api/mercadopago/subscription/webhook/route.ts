import { NextRequest, NextResponse } from "next/server";

import { getMercadoPagoSubscription } from "@/lib/mercadopago-subscriptions";
import { prisma } from "@/lib/prisma";
import { deriveAccessStatus } from "@/lib/subscription";

function parseDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const url = request.nextUrl;
    const remoteId =
      body?.data?.id ??
      body?.id ??
      url.searchParams.get("data.id") ??
      url.searchParams.get("id");

    if (!remoteId) {
      return NextResponse.json({ ok: true });
    }

    const remote = await getMercadoPagoSubscription(String(remoteId));
    const subscription = await prisma.subscription.findFirst({
      where: {
        OR: [
          { providerSubscriptionId: remote.id ?? String(remoteId) },
          { externalReference: remote.external_reference ?? undefined },
        ],
      },
    });

    if (!subscription) {
      return NextResponse.json({ ok: true });
    }

    const nextBillingAt = parseDate(remote.auto_recurring?.next_payment_date) ?? subscription.nextBillingAt;
    const accessEndsAt = nextBillingAt ?? subscription.accessEndsAt;
    const status = remote.status ?? subscription.status;
    const accessStatus = deriveAccessStatus({
      accessEndsAt,
      providerStatus: status,
      trialEndsAt: subscription.trialEndsAt,
    });

    await prisma.subscription.update({
      data: {
        accessEndsAt,
        accessStatus,
        currentAmountCents:
          typeof remote.auto_recurring?.transaction_amount === "number"
            ? Math.round(remote.auto_recurring.transaction_amount * 100)
            : subscription.currentAmountCents,
        nextBillingAt,
        paymentMethodId: remote.payment_method_id ?? subscription.paymentMethodId,
        providerSubscriptionId: remote.id ?? subscription.providerSubscriptionId,
        status,
      },
      where: {
        id: subscription.id,
      },
    });

    await prisma.subscriptionEvent.create({
      data: {
        payload: JSON.parse(JSON.stringify(remote)) as object,
        subscriptionId: subscription.id,
        type: "subscription.webhook",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("mercadopago subscription webhook failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
