export type PricingPlanId = "basic" | "pro";

export type PricingPlan = {
  badge: string;
  cta: string;
  description: string;
  features: { ok: boolean; text: string }[];
  featured: boolean;
  id: PricingPlanId;
  name: string;
  period: string;
  promoPrice: string;
  regularPrice: string;
};

export const pricingPlans: PricingPlan[] = [
  {
    badge: "Promo 2 meses",
    cta: "Assinar Essencial",
    description: "Controle essencial com tudo que o motorista precisa para operar no azul",
    featured: false,
    features: [
      { ok: true, text: "Registro de corridas" },
      { ok: true, text: "Controle de despesas e custos fixos" },
      { ok: true, text: "Metas por plataforma" },
      { ok: true, text: "1 veículo e até 3 plataformas" },
      { ok: true, text: "Relatórios básicos" },
      { ok: false, text: "Análise IA" },
      { ok: false, text: "PDF/CSV e alertas avançados" },
    ],
    id: "basic",
    name: "Essencial",
    period: "/mês",
    promoPrice: "R$14,90",
    regularPrice: "R$19,90",
  },
  {
    badge: "Mais popular",
    cta: "Assinar Pro",
    description: "Para quem quer ganhar mais com visão completa da operação",
    featured: true,
    features: [
      { ok: true, text: "Tudo do Essencial" },
      { ok: true, text: "3 plataformas simultâneas" },
      { ok: true, text: "Mapa de calor" },
      { ok: true, text: "Relatórios PDF/CSV" },
      { ok: true, text: "Alertas e análise IA" },
      { ok: true, text: "Histórico ilimitado" },
    ],
    id: "pro",
    name: "Pro",
    period: "/mês",
    promoPrice: "R$24,90",
    regularPrice: "R$29,90",
  },
];

export function getPricingPlan(planId: PricingPlanId) {
  return pricingPlans.find((plan) => plan.id === planId) ?? pricingPlans[0];
}

export function getPricingSummary(planId: PricingPlanId) {
  const plan = getPricingPlan(planId);
  return {
    activeLabel: `${plan.name} · 7 dias grátis`,
    afterLabel: `7 dias grátis · depois ${plan.regularPrice}/mês`,
    promoLabel: `${plan.promoPrice} por 2 meses, depois ${plan.regularPrice}.`,
    promoPlanLabel: `${plan.name} · ${plan.promoPrice} por 2 meses`,
  };
}
