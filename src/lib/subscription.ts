import { getPricingPlan, type PricingPlanId } from "@/lib/pricing";

export type SubscriptionAccessStatus = "active" | "expired" | "pending_payment" | "trialing";

export type BillingSummary = {
  accessEndsAt: string | null;
  accessStatus: SubscriptionAccessStatus;
  bonusFreeMonths: number;
  canUseApp: boolean;
  cardLastFour: string | null;
  currentAmountCents: number;
  currentPlanId: PricingPlanId;
  nextBillingAt: string | null;
  promoAmountCents: number;
  promoEndsAt: string | null;
  providerStatus: string | null;
  publicKeyReady: boolean;
  referralCode: string | null;
  regularAmountCents: number;
  startedAt: string | null;
  trialEndsAt: string | null;
};

export const BILLING_CURRENCY = "BRL";
export const TRIAL_DAYS = 7;

export function planAmountCents(planId: PricingPlanId) {
  const plan = getPricingPlan(planId);
  return {
    promo: currencyStringToCents(plan.promoPrice),
    regular: currencyStringToCents(plan.regularPrice),
  };
}

export function currencyStringToCents(label: string) {
  const digits = label.replace(/[^\d,]/g, "").replace(".", "").replace(",", ".");
  return Math.round(Number(digits) * 100);
}

export function addMonths(baseDate: Date, months: number) {
  const date = new Date(baseDate);
  date.setMonth(date.getMonth() + months);
  return date;
}

export function addDays(baseDate: Date, days: number) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date;
}

export function deriveAccessStatus(params: {
  providerStatus?: string | null;
  accessEndsAt?: Date | null;
  trialEndsAt?: Date | null;
}) {
  const now = new Date();
  const accessEndsAt = params.accessEndsAt ?? params.trialEndsAt ?? null;

  if (accessEndsAt && accessEndsAt.getTime() > now.getTime()) {
    const providerStatus = params.providerStatus ?? "";
    return providerStatus === "authorized" || providerStatus === "active" ? "active" : "trialing";
  }

  if (params.providerStatus === "authorized" || params.providerStatus === "active") {
    return "active";
  }

  if (params.providerStatus === "cancelled") {
    return "expired";
  }

  return "pending_payment";
}

export function canUseAppFromStatus(status: SubscriptionAccessStatus) {
  return status === "active" || status === "trialing";
}
