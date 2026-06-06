import Stripe from "stripe";

import { getPricingPlan, type PricingPlanId } from "@/lib/pricing";

const STRIPE_PROMO_AMOUNT_OFF = 500;
const STRIPE_PROMO_DURATION_MONTHS = 2;

export function getStripeServerClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY não configurado.");
  }

  return new Stripe(secretKey);
}

export async function getOrCreatePlanProduct(stripe: Stripe, planId: PricingPlanId) {
  const expectedName = `Urbann ${getPricingPlan(planId).name}`;
  const products = await stripe.products.list({
    active: true,
    limit: 100,
  });

  const existing = products.data.find((product) => product.metadata.planId === planId);
  if (existing) {
    return existing;
  }

  return stripe.products.create({
    metadata: {
      planId,
    },
    name: expectedName,
  });
}

export async function getOrCreateRecurringPrice(
  stripe: Stripe,
  params: {
    amountCents: number;
    planId: PricingPlanId;
    productId: string;
  },
) {
  const prices = await stripe.prices.list({
    active: true,
    limit: 100,
    product: params.productId,
    type: "recurring",
  });

  const existing = prices.data.find(
    (price) =>
      price.currency === "brl" &&
      price.recurring?.interval === "month" &&
      price.unit_amount === params.amountCents &&
      price.metadata.planId === params.planId,
  );

  if (existing) {
    return existing;
  }

  return stripe.prices.create({
    currency: "brl",
    metadata: {
      planId: params.planId,
    },
    product: params.productId,
    recurring: {
      interval: "month",
    },
    unit_amount: params.amountCents,
  });
}

export async function getOrCreatePromoCoupon(stripe: Stripe) {
  const coupons = await stripe.coupons.list({
    limit: 100,
  });

  const existing = coupons.data.find(
    (coupon) =>
      coupon.amount_off === STRIPE_PROMO_AMOUNT_OFF &&
      coupon.currency === "brl" &&
      coupon.duration === "repeating" &&
      coupon.duration_in_months === STRIPE_PROMO_DURATION_MONTHS &&
      coupon.metadata?.promoType === "urbann_launch_discount",
  );

  if (existing) {
    return existing;
  }

  return stripe.coupons.create({
    amount_off: STRIPE_PROMO_AMOUNT_OFF,
    currency: "brl",
    duration: "repeating",
    duration_in_months: STRIPE_PROMO_DURATION_MONTHS,
    metadata: {
      promoType: "urbann_launch_discount",
    },
    name: "Promoção Urbann 2 meses",
  });
}
