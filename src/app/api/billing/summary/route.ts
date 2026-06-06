import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addMonths, planAmountCents } from "@/lib/subscription";
import { canUseAppFromStatus, deriveAccessStatus, type BillingSummary } from "@/lib/subscription";

async function ensureSubscription(userId: string) {
  const user = await prisma.user.findUnique({
    include: {
      subscription: true,
    },
    where: {
      id: userId,
    },
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
    where: {
      id: userId,
    },
  });
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    const user = await ensureSubscription(currentUser.id);

    if (!user || !user.subscription) {
      return NextResponse.json({ error: "Assinatura não encontrada." }, { status: 404 });
    }

    const derivedStatus = deriveAccessStatus({
      accessEndsAt: user.subscription.accessEndsAt,
      providerStatus: user.subscription.status,
      trialEndsAt: user.subscription.trialEndsAt,
    });

    const payload: BillingSummary = {
      accessEndsAt: user.subscription.accessEndsAt?.toISOString() ?? null,
      accessStatus: derivedStatus,
      bonusFreeMonths: user.bonusFreeMonths,
      canUseApp: canUseAppFromStatus(derivedStatus),
      cardLastFour: user.subscription.cardLastFour,
      currentAmountCents: user.subscription.currentAmountCents,
      currentPlanId: (user.subscription.planId === "pro" ? "pro" : "basic"),
      nextBillingAt: user.subscription.nextBillingAt?.toISOString() ?? null,
      promoAmountCents: user.subscription.promoAmountCents,
      promoEndsAt: user.subscription.promoEndsAt?.toISOString() ?? null,
      providerStatus: user.subscription.status,
      publicKeyReady: Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
      referralCode: user.referralCode,
      regularAmountCents: user.subscription.regularAmountCents,
      startedAt: user.subscription.startedAt?.toISOString() ?? null,
      trialEndsAt: user.subscription.trialEndsAt?.toISOString() ?? null,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("billing summary failed", error);
    return NextResponse.json({ error: "Não foi possível carregar a cobrança." }, { status: 500 });
  }
}
