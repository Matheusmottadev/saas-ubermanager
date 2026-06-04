import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getPricingPlan, type PricingPlanId } from "@/lib/pricing";
import { createMercadoPagoSubscription, updateMercadoPagoSubscription, type MercadoPagoPreapproval } from "@/lib/mercadopago-subscriptions";
import { prisma } from "@/lib/prisma";
import { addMonths, canUseAppFromStatus, deriveAccessStatus, planAmountCents } from "@/lib/subscription";

type CardBrickPayload = {
  payer?: {
    email?: string;
  };
  payment_method_id?: string;
  token?: string;
};

function toIsoOrNull(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function ensureSubscription(userId: string) {
  const user = await prisma.user.findUnique({
    include: {
      subscription: true,
    },
    where: { id: userId },
  });

  if (!user) {
    return null;
  }

  if (user.subscription) {
    return user;
  }

  const planId = user.selectedPlan === "pro" ? "pro" : "basic";
  const amounts = planAmountCents(planId);
  const now = new Date();

  await prisma.subscription.create({
    data: {
      accessEndsAt: user.trialEndsAt ?? now,
      accessStatus: user.trialEndsAt && user.trialEndsAt > now ? "trialing" : "pending_payment",
      currentAmountCents: user.promoMonthlyPrice ?? amounts.promo,
      externalReference: `user:${user.id}`,
      planId,
      promoAmountCents: user.promoMonthlyPrice ?? amounts.promo,
      promoEndsAt: user.promoPriceEndsAt ?? addMonths(now, 2),
      regularAmountCents: user.regularMonthlyPrice ?? amounts.regular,
      startedAt: user.createdAt,
      status: user.trialEndsAt && user.trialEndsAt > now ? "trialing" : "pending_payment",
      trialEndsAt: user.trialEndsAt,
      userId: user.id,
    },
  });

  return prisma.user.findUnique({
    include: {
      subscription: true,
    },
    where: { id: userId },
  });
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    const body = (await request.json()) as {
      cardLastFour?: string;
      formData?: CardBrickPayload;
      planId?: PricingPlanId;
    };

    const planId = body.planId === "pro" ? "pro" : "basic";
    const token = body.formData?.token?.trim();
    const payerEmail = body.formData?.payer?.email?.trim() || currentUser.email;

    if (!token) {
      return NextResponse.json({ error: "Cartão inválido. Tente novamente." }, { status: 400 });
    }

    const user = await ensureSubscription(currentUser.id);

    if (!user || !user.subscription) {
      return NextResponse.json({ error: "Assinatura local não encontrada." }, { status: 404 });
    }

    const amounts = planAmountCents(planId);
    const reason = `Urbann ${getPricingPlan(planId).name}`;
    const now = new Date();
    const startReference = user.subscription.trialEndsAt && user.subscription.trialEndsAt > now
      ? user.subscription.trialEndsAt
      : now;
    const startDate = addMonths(startReference, user.bonusFreeMonths).toISOString();
    const externalReference = user.subscription.externalReference || `user:${user.id}`;

    let remote: MercadoPagoPreapproval;

    if (user.subscription.providerSubscriptionId) {
      remote = await updateMercadoPagoSubscription({
        amount: amounts.promo / 100,
        cardToken: token,
        planId,
        preapprovalId: user.subscription.providerSubscriptionId,
        reason,
        status: "authorized",
      });
    } else {
      remote = await createMercadoPagoSubscription({
        amount: amounts.promo / 100,
        backUrl: `${request.nextUrl.origin}/Financeiro/painel?billing=success`,
        cardToken: token,
        externalReference,
        payerEmail,
        planId,
        reason,
        startDate,
      });
    }

    const providerStatus = remote.status ?? "authorized";
    const promoEndsAt = addMonths(now, 2);
    const nextBillingAt =
      toIsoOrNull(remote.auto_recurring?.next_payment_date) ??
      toIsoOrNull(remote.auto_recurring?.start_date) ??
      addMonths(startReference, user.bonusFreeMonths);
    const accessEndsAt = nextBillingAt ?? user.subscription.accessEndsAt ?? user.subscription.trialEndsAt ?? now;
    const accessStatus = deriveAccessStatus({
      accessEndsAt,
      providerStatus,
      trialEndsAt: user.subscription.trialEndsAt,
    });

    const subscription = await prisma.subscription.update({
      data: {
        accessEndsAt,
        accessStatus,
        cardLastFour: body.cardLastFour ?? user.subscription.cardLastFour ?? null,
        currentAmountCents: amounts.promo,
        nextBillingAt,
        paymentMethodId: body.formData?.payment_method_id ?? remote.payment_method_id ?? null,
        planId,
        promoAmountCents: amounts.promo,
        promoEndsAt,
        providerSubscriptionId: remote.id ?? user.subscription.providerSubscriptionId,
        regularAmountCents: amounts.regular,
        startedAt: user.subscription.startedAt ?? now,
        status: providerStatus,
      },
      where: {
        userId: user.id,
      },
    });

    await prisma.user.update({
      data: {
        promoMonthlyPrice: amounts.promo,
        regularMonthlyPrice: amounts.regular,
        selectedPlan: planId,
      },
      where: {
        id: user.id,
      },
    });

    await prisma.subscriptionEvent.create({
      data: {
        payload: JSON.parse(JSON.stringify(remote)) as object,
        subscriptionId: subscription.id,
        type: user.subscription.providerSubscriptionId ? "subscription.updated" : "subscription.created",
      },
    });

    return NextResponse.json({
      accessStatus,
      canUseApp: canUseAppFromStatus(accessStatus),
      ok: true,
      providerStatus,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error("billing subscribe failed", error);
    return NextResponse.json({ error: "Não foi possível ativar a assinatura agora." }, { status: 500 });
  }
}
