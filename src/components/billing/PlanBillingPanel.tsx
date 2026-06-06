"use client";

import { CircleAlert, CreditCard, Gift, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { pricingPlans } from "@/lib/pricing";
import type { BillingSummary } from "@/lib/subscription";

type Props = {
  title?: string;
};

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar a cobrança.");
      } finally {
        setLoading(false);
      }
    }

    void loadSummary();
  }, []);

  const selectedPlanMeta = useMemo(
    () => pricingPlans.find((plan) => plan.id === summary?.currentPlanId) ?? pricingPlans[0],
    [summary?.currentPlanId],
  );

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="text-[1.5rem] font-bold tracking-[-0.04em]" style={{ fontFamily: "var(--panel-font-display)" }}>
            {title}
          </div>
          <div className="mt-1 text-sm text-neutral-500">
            A estrutura de cobrança ja esta pronta para receber a Stripe.
          </div>
        </div>
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
                Trial atual
              </div>
              <div className="text-xl font-bold text-white">
                {summary.accessStatus === "trialing" ? "7 dias ativos" : "Aguardando cobrança"}
              </div>
              <div className="mt-1 text-sm text-neutral-400">
                até {formatDate(summary.trialEndsAt)}
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
                Próximo passo
              </div>
              <div className="text-xl font-bold text-white">Conectar Stripe</div>
              <div className="mt-1 text-sm text-neutral-400">Checkout aguardando credenciais</div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-[#232323] p-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">Status da integração</div>
            <div className="mt-3 text-lg font-bold text-white">Stripe pronta para configuração</div>
            <div className="mt-2 text-sm text-neutral-400">
              O cadastro e o plano continuam funcionando com trial local. Depois que as credenciais forem adicionadas,
              o checkout entra aqui e tambem no onboarding.
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
