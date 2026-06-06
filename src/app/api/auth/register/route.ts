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
import {
  getOrCreatePlanProduct,
  getOrCreatePromoCoupon,
  getOrCreateRecurringPrice,
  getStripeServerClient,
} from "@/lib/stripe";
import { addMonths } from "@/lib/subscription";
import type { OnboardingData, OnboardingPaymentData } from "@/types/onboarding";

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
  let createdUserId: string | null = null;
  let referrerId: string | null = null;
  let referrerBonusIncremented = false;
  let stripeCustomerId: string | null = null;
  let stripeSubscriptionId: string | null = null;

  try {
    const body = (await request.json()) as OnboardingData & {
      payment?: OnboardingPaymentData | null;
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

    referrerId = referrer?.id ?? null;

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);
    const promoPriceEndsAt = new Date(now);
    promoPriceEndsAt.setMonth(promoPriceEndsAt.getMonth() + 2);

    const selectedPlan = body.plan.selectedPlan;
    const promoMonthlyPrice = selectedPlan === "pro" ? 2490 : 1490;
    const regularMonthlyPrice = selectedPlan === "pro" ? 2990 : 1990;
    const payment = body.payment;

    if (!payment?.paymentMethodId || !payment.cardLastFour || !payment.cardholderName) {
      return NextResponse.json(
        { error: "Valide o cartão antes de continuar." },
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
        promoPriceEndsAt: addMonths(trialEndsAt, 2),
        trialEndsAt,
      },
    });
    createdUserId = user.id;

    if (referrer) {
      await prisma.user.update({
        where: { id: referrer.id },
        data: {
          bonusFreeMonths: {
            increment: 1,
          },
        },
      });
      referrerBonusIncremented = true;
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

    const stripe = getStripeServerClient();
    const stripeCustomer = await stripe.customers.create({
      email,
      metadata: {
        cpf: payment.cpf,
        externalReference: `user:${user.id}`,
        planId: selectedPlan,
      },
      name: `${body.personal.firstName.trim()} ${body.personal.lastName.trim()}`.trim(),
      phone,
    });
    stripeCustomerId = stripeCustomer.id;

    await stripe.paymentMethods.attach(payment.paymentMethodId, {
      customer: stripeCustomer.id,
    });

    await stripe.customers.update(stripeCustomer.id, {
      invoice_settings: {
        default_payment_method: payment.paymentMethodId,
      },
      metadata: {
        cpf: payment.cpf,
        externalReference: `user:${user.id}`,
        planId: selectedPlan,
      },
      name: payment.cardholderName,
    });

    const product = await getOrCreatePlanProduct(stripe, selectedPlan);
    const price = await getOrCreateRecurringPrice(stripe, {
      amountCents: regularMonthlyPrice,
      planId: selectedPlan,
      productId: product.id,
    });
    const promoCoupon = await getOrCreatePromoCoupon(stripe);
    const remoteSubscription = await stripe.subscriptions.create({
      customer: stripeCustomer.id,
      default_payment_method: payment.paymentMethodId,
      discounts: [
        {
          coupon: promoCoupon.id,
        },
      ],
      items: [
        {
          price: price.id,
        },
      ],
      metadata: {
        cpf: payment.cpf,
        externalReference: `user:${user.id}`,
        planId: selectedPlan,
      },
      trial_end: Math.floor(trialEndsAt.getTime() / 1000),
      trial_settings: {
        end_behavior: {
          missing_payment_method: "cancel",
        },
      },
    });
    stripeSubscriptionId = remoteSubscription.id;

    await prisma.subscription.create({
      data: {
        accessEndsAt: trialEndsAt,
        accessStatus: "trialing",
        cardLastFour: payment.cardLastFour,
        currentAmountCents: promoMonthlyPrice,
        externalReference: `user:${user.id}`,
        metadata: {
          cpf: payment.cpf,
          stripeCouponId: promoCoupon.id,
          stripeCustomerId: stripeCustomer.id,
          stripePriceId: price.id,
        },
        nextBillingAt: trialEndsAt,
        paymentMethodId: payment.paymentMethodId,
        planId: selectedPlan,
        promoAmountCents: promoMonthlyPrice,
        promoEndsAt: addMonths(trialEndsAt, 2),
        provider: "stripe",
        providerSubscriptionId: remoteSubscription.id,
        regularAmountCents: regularMonthlyPrice,
        startedAt: now,
        status: remoteSubscription.status,
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
    const message = toErrorMessage(
      error,
      "Não foi possível criar sua conta agora.",
    );

    try {
      if (stripeSubscriptionId) {
        const stripe = getStripeServerClient();
        await stripe.subscriptions.cancel(stripeSubscriptionId);
      }

      if (stripeCustomerId) {
        const stripe = getStripeServerClient();
        await stripe.customers.del(stripeCustomerId);
      }

      if (referrerBonusIncremented && referrerId) {
        await prisma.user.update({
          where: {
            id: referrerId,
          },
          data: {
            bonusFreeMonths: {
              decrement: 1,
            },
          },
        });
      }

      if (createdUserId) {
        await prisma.user.delete({
          where: {
            id: createdUserId,
          },
        });
      }
    } catch (cleanupError) {
      console.error("auth register cleanup failed", cleanupError);
    }

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
