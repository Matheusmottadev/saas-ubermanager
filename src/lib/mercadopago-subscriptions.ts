import type { PricingPlanId } from "@/lib/pricing";

const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

type AutoRecurringBody = {
  currency_id: string;
  frequency: number;
  frequency_type: "months";
  start_date: string;
  transaction_amount: number;
};

type CreateSubscriptionInput = {
  amount: number;
  backUrl: string;
  cardToken: string;
  externalReference: string;
  payerEmail: string;
  planId: PricingPlanId;
  reason: string;
  startDate: string;
};

type UpdateSubscriptionInput = {
  amount?: number;
  cardToken?: string;
  planId: PricingPlanId;
  preapprovalId: string;
  reason: string;
  startDate?: string;
  status?: string;
};

export type MercadoPagoPreapproval = {
  auto_recurring?: {
    currency_id?: string;
    next_payment_date?: string;
    start_date?: string;
    transaction_amount?: number;
  };
  external_reference?: string;
  id?: string;
  payer_email?: string;
  payment_method_id?: string;
  reason?: string;
  status?: string;
};

function assertAccessToken() {
  if (!accessToken) {
    throw new Error("Credenciais do Mercado Pago nao configuradas.");
  }
}

async function mercadoPagoFetch<T>(path: string, init: RequestInit = {}) {
  assertAccessToken();

  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Mercado Pago respondeu ${response.status}.`);
  }

  return (await response.json()) as T;
}

export async function createMercadoPagoSubscription(input: CreateSubscriptionInput) {
  const body = {
    auto_recurring: {
      currency_id: "BRL",
      frequency: 1,
      frequency_type: "months",
      start_date: input.startDate,
      transaction_amount: input.amount,
    } satisfies AutoRecurringBody,
    back_url: input.backUrl,
    card_token_id: input.cardToken,
    external_reference: input.externalReference,
    payer_email: input.payerEmail,
    reason: input.reason,
    status: "authorized",
  };

  return mercadoPagoFetch<MercadoPagoPreapproval>("/preapproval", {
    body: JSON.stringify(body),
    method: "POST",
  });
}

export async function updateMercadoPagoSubscription(input: UpdateSubscriptionInput) {
  const body: Record<string, unknown> = {
    reason: input.reason,
  };

  if (typeof input.amount === "number" || input.startDate) {
    body.auto_recurring = {
      currency_id: "BRL",
      frequency: 1,
      frequency_type: "months",
      ...(input.startDate ? { start_date: input.startDate } : {}),
      ...(typeof input.amount === "number" ? { transaction_amount: input.amount } : {}),
    } satisfies Partial<AutoRecurringBody>;
  }

  if (input.cardToken) {
    body.card_token_id = input.cardToken;
  }

  if (input.status) {
    body.status = input.status;
  }

  return mercadoPagoFetch<MercadoPagoPreapproval>(`/preapproval/${input.preapprovalId}`, {
    body: JSON.stringify(body),
    method: "PUT",
  });
}

export async function getMercadoPagoSubscription(preapprovalId: string) {
  return mercadoPagoFetch<MercadoPagoPreapproval>(`/preapproval/${preapprovalId}`, {
    method: "GET",
  });
}
