import { NextResponse } from "next/server";

import {
  buildSessionCookie,
  createReferralCode,
  createUserSession,
  hashPassword,
  normalizeEmail,
  normalizePhone,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { createMercadoPagoSubscription } from "@/lib/mercadopago-subscriptions";
import { buildDashboardStateFromOnboarding } from "@/lib/onboarding";
import { getPricingPlan } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { addMonths, deriveAccessStatus } from "@/lib/subscription";
import type { OnboardingData } from "@/types/onboarding";

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

function validatePayload(data: OnboardingData) {
  const fullNameOk =
    data.personal.firstName.trim().length >= 2 &&
    data.personal.lastName.trim().length >= 2;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.personal.email);
  const phoneOk = data.personal.phone.replace(/\D/g, "").length >= 10;
  const passwordOk = data.personal.password.length >= 8;
  const confirmOk =
    data.personal.password.length > 0 &&
    data.personal.password === data.personal.confirmPassword;

  return fullNameOk && emailOk && phoneOk && passwordOk && confirmOk;
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OnboardingData & {
      cardLastFour?: string;
      formData?: CardBrickPayload;
    };

    if (!validatePayload(body)) {
      return NextResponse.json(
        { error: "Confira seus dados antes de continuar." },
        { status: 400 },
      );
    }

    const email = normalizeEmail(body.personal.email);
    const phone = normalizePhone(body.personal.phone);
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Esse e-mail já está em uso. Entre na sua conta ou use outro." },
        { status: 409 },
      );
    }

    const existingPhoneUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingPhoneUser) {
      return NextResponse.json(
        { error: "Esse número já está cadastrado. Use outro ou entre na sua conta." },
        { status: 409 },
      );
    }

    const referralCodeInput = body.personal.referralCode.trim().toUpperCase();
    const referrer =
      referralCodeInput.length > 0
        ? await prisma.user.findUnique({
            where: { referralCode: referralCodeInput },
          })
        : null;

    if (referralCodeInput.length > 0 && !referrer) {
      return NextResponse.json(
        { error: "Código de indicação inválido." },
        { status: 400 },
      );
    }

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);
    const promoPriceEndsAt = new Date(now);
    promoPriceEndsAt.setMonth(promoPriceEndsAt.getMonth() + 2);

    const selectedPlan = body.plan.selectedPlan;
    const promoMonthlyPrice = selectedPlan === "pro" ? 2490 : 1490;
    const regularMonthlyPrice = selectedPlan === "pro" ? 2990 : 1990;
    const token = body.formData?.token?.trim();
    const payerEmail = body.formData?.payer?.email?.trim() || email;

    if (!token) {
      return NextResponse.json(
        { error: "Informe um cartão válido para ativar o período grátis." },
        { status: 400 },
      );
    }

    const user = await prisma.user.create({
      data: {
        email,
        firstName: body.personal.firstName.trim(),
        lastName: body.personal.lastName.trim(),
        passwordHash: await hashPassword(body.personal.password),
        phone,
        referralCode: createReferralCode(),
        referredById: referrer?.id ?? null,
        bonusFreeMonths: referrer ? 1 : 0,
        selectedPlan,
        promoMonthlyPrice,
        regularMonthlyPrice,
        promoPriceEndsAt,
        trialEndsAt,
      },
    });

    if (referrer) {
      await prisma.user.update({
        where: { id: referrer.id },
        data: {
          bonusFreeMonths: {
            increment: 1,
          },
        },
      });
    }

    await prisma.dashboardWorkspace.upsert({
      create: {
        state: buildDashboardStateFromOnboarding(body),
        userId: user.id,
      },
      update: {
        state: buildDashboardStateFromOnboarding(body),
      },
      where: {
        userId: user.id,
      },
    });

    const subscription = await prisma.subscription.create({
      data: {
        accessEndsAt: trialEndsAt,
        accessStatus: "trialing",
        currentAmountCents: promoMonthlyPrice,
        externalReference: `user:${user.id}`,
        planId: selectedPlan,
        promoAmountCents: promoMonthlyPrice,
        promoEndsAt: addMonths(now, 2),
        provider: "mercadopago",
        regularAmountCents: regularMonthlyPrice,
        startedAt: now,
        status: "trialing",
        trialEndsAt,
        userId: user.id,
      },
    });

    try {
      const startDate = addMonths(trialEndsAt, user.bonusFreeMonths).toISOString();
      const remote = await createMercadoPagoSubscription({
        amount: promoMonthlyPrice / 100,
        backUrl: `${new URL(request.url).origin}/Financeiro/painel?billing=success`,
        cardToken: token,
        externalReference: `user:${user.id}`,
        payerEmail,
        planId: selectedPlan,
        reason: `Urbann ${getPricingPlan(selectedPlan).name}`,
        startDate,
      });

      const providerStatus = remote.status ?? "authorized";
      const nextBillingAt =
        toIsoOrNull(remote.auto_recurring?.next_payment_date) ??
        toIsoOrNull(remote.auto_recurring?.start_date) ??
        addMonths(trialEndsAt, user.bonusFreeMonths);
      const accessStatus = deriveAccessStatus({
        accessEndsAt: trialEndsAt,
        providerStatus,
        trialEndsAt,
      });

      await prisma.subscription.update({
        data: {
          accessEndsAt: trialEndsAt,
          accessStatus,
          cardLastFour: body.cardLastFour ?? null,
          nextBillingAt,
          paymentMethodId: body.formData?.payment_method_id ?? remote.payment_method_id ?? null,
          providerSubscriptionId: remote.id ?? null,
          status: providerStatus,
        },
        where: {
          userId: user.id,
        },
      });

      await prisma.subscriptionEvent.create({
        data: {
          payload: JSON.parse(JSON.stringify(remote)) as object,
          subscriptionId: subscription.id,
          type: "subscription.created",
        },
      });
    } catch (error) {
      console.error("auth register subscription failed", error);
      const message = toErrorMessage(
        error,
        "Não foi possível validar o cartão e criar a assinatura agora.",
      );

      try {
        if (referrer) {
          await prisma.user.update({
            where: {
              id: referrer.id,
            },
            data: {
              bonusFreeMonths: {
                decrement: 1,
              },
            },
          });
        }

        await prisma.user.delete({
          where: {
            id: user.id,
          },
        });
      } catch (cleanupError) {
        console.error("auth register cleanup failed", cleanupError);
      }

      return NextResponse.json(
        { error: message },
        { status: 500 },
      );
    }

    const session = await createUserSession(user.id);
    const response = NextResponse.json({
      ok: true,
      user: {
        email: user.email,
        id: user.id,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      ...buildSessionCookie(session.token, session.expiresAt),
    });

    return response;
  } catch (error) {
    console.error("auth register failed", error);
    const message = toErrorMessage(
      error,
      "Não foi possível criar sua conta agora.",
    );
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
