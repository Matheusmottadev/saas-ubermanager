import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { updateMercadoPagoSubscription } from "@/lib/mercadopago-subscriptions";
import { prisma } from "@/lib/prisma";
import { canUseAppFromStatus, deriveAccessStatus } from "@/lib/subscription";

export async function POST() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      include: {
        subscription: true,
      },
      where: {
        id: currentUser.id,
      },
    });

    if (!user?.subscription?.providerSubscriptionId) {
      return NextResponse.json({ error: "Nenhuma assinatura ativa encontrada." }, { status: 404 });
    }

    const remote = await updateMercadoPagoSubscription({
      planId: user.subscription.planId === "pro" ? "pro" : "basic",
      preapprovalId: user.subscription.providerSubscriptionId,
      reason: `Urbann ${user.subscription.planId === "pro" ? "Pro" : "Essencial"}`,
      status: "cancelled",
    });

    const accessStatus = deriveAccessStatus({
      accessEndsAt: user.subscription.accessEndsAt,
      providerStatus: "cancelled",
      trialEndsAt: user.subscription.trialEndsAt,
    });

    const subscription = await prisma.subscription.update({
      data: {
        accessStatus,
        cancelledAt: new Date(),
        status: remote.status ?? "cancelled",
      },
      where: {
        userId: user.id,
      },
    });

    await prisma.subscriptionEvent.create({
      data: {
        payload: JSON.parse(JSON.stringify(remote)) as object,
        subscriptionId: subscription.id,
        type: "subscription.cancelled",
      },
    });

    return NextResponse.json({
      accessStatus,
      canUseApp: canUseAppFromStatus(accessStatus),
      ok: true,
    });
  } catch (error) {
    console.error("billing cancel failed", error);
    return NextResponse.json({ error: "Não foi possível cancelar a assinatura agora." }, { status: 500 });
  }
}
