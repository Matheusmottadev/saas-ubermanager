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
import { buildDashboardStateFromOnboarding } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { addMonths } from "@/lib/subscription";
import type { OnboardingData } from "@/types/onboarding";

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OnboardingData;

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

    await prisma.subscription.create({
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
    return NextResponse.json(
      { error: "Não foi possível criar sua conta agora." },
      { status: 500 },
    );
  }
}
