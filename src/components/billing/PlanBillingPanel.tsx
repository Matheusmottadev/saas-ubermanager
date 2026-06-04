"use client";

import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { Check, CircleAlert, CreditCard, Gift, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { pricingPlans, type PricingPlanId } from "@/lib/pricing";
import { currencyStringToCents, type BillingSummary } from "@/lib/subscription";

type Props = {
  title?: string;
};

type CardBrickPayload = {
  payer?: {
    email?: string;
  };
  payment_method_id?: string;
  token: string;
  transaction_amount: number;
};

const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;

if (publicKey) {
  initMercadoPago(publicKey, { locale: "pt-BR" });
}

function formatCurrencyFromCents(value: number) {
  return (value / 100).toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency",
  });
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
  });
}

export default function PlanBillingPanel({ title = "Plano & cobrança" }: Props) {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlanId>("basic");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadSummary() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/billing/summary", { cache: "no-store" });
      const payload = (await response.json()) as BillingSummary & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível carregar a cobrança.");
      }

      setSummary(payload);
      setSelectedPlan(payload.currentPlanId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar a cobrança.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSummary();
  }, []);

  const selectedPlanMeta = useMemo(
    () => pricingPlans.find((plan) => plan.id === selectedPlan) ?? pricingPlans[0],
    [selectedPlan],
  );
  const selectedPlanPromoAmount = useMemo(
    () => currencyStringToCents(selectedPlanMeta.promoPrice),
    [selectedPlanMeta],
  );

  async function handleCancel() {
    setCanceling(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/billing/cancel", { method: "POST" });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível cancelar a assinatura.");
      }

      setSuccess("Assinatura cancelada. Seu acesso atual foi mantido conforme o ciclo já liberado.");
      await loadSummary();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Não foi possível cancelar a assinatura.");
    } finally {
      setCanceling(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="text-[1.5rem] font-bold tracking-[-0.04em]" style={{ fontFamily: "var(--panel-font-display)" }}>
            {title}
          </div>
          <div className="mt-1 text-sm text-neutral-500">
            Ative, troque ou acompanhe sua assinatura sem sair do Urbann.
          </div>
        </div>
        {summary ? (
          <div className="rounded-2xl border border-white/8 bg-[#232323] px-4 py-3 text-sm text-neutral-300">
            <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">Status</div>
            <div className="mt-1 flex items-center gap-2 font-semibold text-white">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-lime-400" />
              {summary.accessStatus === "trialing"
                ? "Em teste grátis"
                : summary.accessStatus === "active"
                  ? "Assinatura ativa"
                  : summary.accessStatus === "pending_payment"
                    ? "Pagamento pendente"
                    : "Acesso expirado"}
            </div>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/8 bg-[#232323] p-5 text-sm text-neutral-400">
          Carregando cobrança...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-3xl border border-lime-500/20 bg-lime-500/10 p-4 text-sm text-lime-200">
          {success}
        </div>
      ) : null}

      {summary ? (
        <>
          <div className="grid gap-3 lg:grid-cols-4">
            <div className="rounded-3xl border border-white/8 bg-[#232323] p-4">
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-neutral-500">
                <CreditCard className="h-3.5 w-3.5" />
                Plano atual
              </div>
              <div className="text-xl font-bold text-white">{selectedPlanMeta.name}</div>
              <div className="mt-1 text-sm text-neutral-400">
                {formatCurrencyFromCents(summary.currentAmountCents)}/mês
              </div>
            </div>
            <div className="rounded-3xl border border-white/8 bg-[#232323] p-4">
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-neutral-500">
                <Gift className="h-3.5 w-3.5" />
                Próxima etapa
              </div>
              <div className="text-xl font-bold text-white">
                {summary.accessStatus === "trialing" ? "Fim do trial" : "Próxima cobrança"}
              </div>
              <div className="mt-1 text-sm text-neutral-400">
                {formatDate(summary.accessStatus === "trialing" ? summary.trialEndsAt : summary.nextBillingAt)}
              </div>
            </div>
            <div className="rounded-3xl border border-white/8 bg-[#232323] p-4">
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-neutral-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                Promo ativa
              </div>
              <div className="text-xl font-bold text-white">{formatCurrencyFromCents(summary.promoAmountCents)}</div>
              <div className="mt-1 text-sm text-neutral-400">até {formatDate(summary.promoEndsAt)}</div>
            </div>
            <div className="rounded-3xl border border-white/8 bg-[#232323] p-4">
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-neutral-500">
                <CircleAlert className="h-3.5 w-3.5" />
                Indicação
              </div>
              <div className="text-xl font-bold text-white">{summary.referralCode ?? "—"}</div>
              <div className="mt-1 text-sm text-neutral-400">
                {summary.bonusFreeMonths > 0
                  ? `${summary.bonusFreeMonths} mês(es) bônus pendente(s)`
                  : "Compartilhe seu código e ganhe 1 mês."}
              </div>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="grid gap-3 md:grid-cols-2">
              {pricingPlans.map((plan) => {
                const active = selectedPlan === plan.id;

                return (
                  <button
                    key={plan.id}
                    className={`rounded-3xl border p-5 text-left transition ${
                      active
                        ? "border-white/30 bg-white/6"
                        : "border-white/8 bg-[#232323] hover:border-white/20"
                    }`}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-bold text-white">{plan.name}</div>
                        <div className="text-sm text-neutral-400">{plan.description}</div>
                      </div>
                      {active ? (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f5f4f0] text-black">
                          <Check className="h-4 w-4" />
                        </div>
                      ) : null}
                    </div>
                    <div className="mb-4">
                      <div className="text-3xl font-black tracking-[-0.06em] text-white">{plan.promoPrice}</div>
                      <div className="text-xs text-neutral-500">2 meses promocionais, depois {plan.regularPrice}/mês</div>
                    </div>
                    <div className="space-y-2">
                      {plan.features.map((feature) => (
                        <div
                          key={feature.text}
                          className={`flex items-center gap-2 text-sm ${feature.ok ? "text-neutral-200" : "text-neutral-500"}`}
                        >
                          <span className={feature.ok ? "text-lime-400" : "text-neutral-600"}>
                            <Check className="h-3.5 w-3.5" />
                          </span>
                          {feature.text}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-3xl border border-white/8 bg-[#232323] p-5">
              <div className="mb-1 text-[11px] uppercase tracking-[0.14em] text-neutral-500">
                Cobrança segura no próprio site
              </div>
              <div className="text-2xl font-bold tracking-[-0.04em] text-white" style={{ fontFamily: "var(--panel-font-display)" }}>
                {selectedPlanMeta.name}
              </div>
              <div className="mt-2 text-sm text-neutral-400">
                Seu cartão fica dentro do fluxo do Urbann. Você ativa agora e o primeiro ciclo respeita seus 7 dias grátis.
              </div>

              <div className="mt-4 rounded-2xl border border-white/8 bg-[#1b1b1b] p-4 text-sm text-neutral-300">
                <div className="flex items-center justify-between gap-3">
                  <span>Valor promocional</span>
                  <strong className="text-white">{selectedPlanMeta.promoPrice}/mês</strong>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span>Valor normal</span>
                  <strong className="text-white">{selectedPlanMeta.regularPrice}/mês</strong>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span>Cartão atual</span>
                  <strong className="text-white">
                    {summary.cardLastFour ? `•••• ${summary.cardLastFour}` : "Ainda não cadastrado"}
                  </strong>
                </div>
              </div>

              <div className="mt-4">
                {summary.publicKeyReady ? (
                  <CardPayment
                    key={selectedPlan}
                    initialization={{
                      amount: selectedPlanPromoAmount / 100,
                      payer: {},
                    }}
                    customization={{
                      paymentMethods: {
                        maxInstallments: 1,
                        minInstallments: 1,
                        types: {
                          included: ["credit_card"],
                        },
                      },
                      visual: {
                        hideFormTitle: true,
                        style: {
                          theme: "dark",
                        },
                      },
                    }}
                    onError={(brickError) => {
                      setError(brickError.message || "Não foi possível carregar o formulário do cartão.");
                    }}
                    onReady={() => {
                      setError(null);
                    }}
                    onSubmit={(formData, additionalData) =>
                      new Promise<void>((resolve, reject) => {
                        setSaving(true);
                        setError(null);
                        setSuccess(null);

                        fetch("/api/billing/subscribe", {
                          body: JSON.stringify({
                            cardLastFour: additionalData?.lastFourDigits,
                            formData: formData as CardBrickPayload,
                            planId: selectedPlan,
                          }),
                          headers: {
                            "Content-Type": "application/json",
                          },
                          method: "POST",
                        })
                          .then(async (response) => {
                            const payload = (await response.json()) as { error?: string };

                            if (!response.ok) {
                              throw new Error(payload.error ?? "Não foi possível ativar a assinatura.");
                            }

                            setSuccess("Assinatura ativada com sucesso. O plano já foi vinculado à sua conta.");
                            await loadSummary();
                            resolve();
                          })
                          .catch((submitError) => {
                            const message = submitError instanceof Error ? submitError.message : "Não foi possível ativar a assinatura.";
                            setError(message);
                            reject(submitError);
                          })
                          .finally(() => {
                            setSaving(false);
                          });
                      })
                    }
                  />
                ) : (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                    Configure a chave pública do Mercado Pago para liberar a assinatura dentro do site.
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className="rounded-xl bg-[#f5f4f0] px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={saving}
                  type="button"
                >
                  {saving ? "Salvando cobrança..." : "Preencha o cartão acima para ativar"}
                </button>
                <button
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-neutral-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={canceling || !summary.providerStatus || summary.providerStatus === "trialing"}
                  onClick={() => void handleCancel()}
                  type="button"
                >
                  {canceling ? "Cancelando..." : "Cancelar assinatura"}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
