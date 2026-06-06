"use client";

import { Check, Shield } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import StripeCardSetupPanel, { type StripeCardSetupPanelHandle } from "@/components/onboarding/StripeCardSetupPanel";
import { pricingPlans } from "@/lib/pricing";
import type { OnboardingPaymentData, PlanData } from "@/types/onboarding";

interface Props {
  data: PlanData;
  email: string;
  fullName: string;
  payment: OnboardingPaymentData | null;
  onBack: () => void;
  onChange: (data: PlanData) => void;
  onNext: () => void;
  onPaymentChange: (payment: OnboardingPaymentData | null) => void;
}

export default function StepPlan({
  data,
  email,
  fullName,
  payment,
  onBack,
  onChange,
  onNext,
  onPaymentChange,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [validatingCard, setValidatingCard] = useState(false);
  const [cardPanelBusy, setCardPanelBusy] = useState(false);
  const cardPanelRef = useRef<StripeCardSetupPanelHandle | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleContinue() {
    if (!cardPanelRef.current || cardPanelBusy) {
      return;
    }

    setValidatingCard(true);

    try {
      const isValid = await cardPanelRef.current.validateCard();
      if (isValid) {
        onNext();
      }
    } finally {
      setValidatingCard(false);
    }
  }

  return (
    <div>
      <div
        className={`flex items-center gap-2 mb-6 rounded-xl px-4 py-3 ${mounted ? "anim-fadeUp" : ""}`}
        style={{ background: "var(--s2)", border: "0.5px solid var(--s3)" }}
      >
        <div className="flex -space-x-2">
          {["SP", "RJ", "BH", "POA"].map((initials) => (
            <div
              key={initials}
              className="rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: "var(--s4)",
                border: "1.5px solid var(--s1)",
                color: "var(--cream)",
                fontSize: 8,
                height: 26,
                width: 26,
              }}
            >
              {initials}
            </div>
          ))}
        </div>
        <p style={{ color: "var(--s5)", fontSize: 12 }}>
          <span style={{ color: "var(--cream)", fontWeight: 600 }}>+3.400 motoristas</span> ja usam o Urbann Pro
        </p>
      </div>

      <div className={`grid grid-cols-2 gap-4 mb-6 ${mounted ? "anim-fadeUp d-100" : ""}`}>
        {pricingPlans.map((plan) => {
          const selected = data.selectedPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`plan-card ${selected ? "selected" : ""}`}
              onClick={() => onChange({ selectedPlan: plan.id })}
            >
              {plan.badge ? (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: "var(--cream)",
                    color: "var(--black)",
                    fontSize: 10,
                    whiteSpace: "nowrap",
                  }}
                >
                  {plan.badge}
                </div>
              ) : null}

              {selected ? (
                <div
                  className="absolute top-3 right-3 rounded-full flex items-center justify-center"
                  style={{ background: "var(--cream)", height: 20, width: 20 }}
                >
                  <Check size={11} style={{ color: "var(--black)" }} />
                </div>
              ) : null}

              <div className="mb-3">
                <p style={{ fontFamily: "var(--font-title), sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>
                  {plan.name}
                </p>
                <p style={{ color: "var(--s5)", fontSize: 11, marginTop: 3 }}>
                  {plan.description}
                </p>
              </div>

              <div className="flex items-baseline gap-1 mb-4">
                <span style={{ fontFamily: "var(--font-title), sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>
                  {plan.promoPrice}
                </span>
                <span style={{ color: "var(--s5)", fontSize: 12 }}>{plan.period}</span>
              </div>
              <p style={{ color: "var(--s5)", fontSize: 10, marginTop: -10, marginBottom: 14 }}>
                {`Depois ${plan.regularPrice}/mês`}
              </p>

              <ul className="flex flex-col gap-2">
                {plan.features.map((feature) => (
                  <li
                    key={feature.text}
                    className="flex items-center gap-2"
                    style={{
                      color: feature.ok ? "var(--s6)" : "var(--s4)",
                      fontSize: 12,
                      opacity: feature.ok ? 1 : 0.5,
                    }}
                  >
                    <span style={{ color: feature.ok ? "var(--green)" : "var(--s4)", flexShrink: 0 }}>
                      {feature.ok ? (
                        <Check size={12} />
                      ) : (
                        <svg fill="none" height="12" viewBox="0 0 24 24" width="12">
                          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      )}
                    </span>
                    {feature.text}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div
        className={`flex items-start gap-3 rounded-xl px-4 py-3 mb-8 ${mounted ? "anim-fadeUp d-200" : ""}`}
        style={{
          background: "rgba(76,175,80,.07)",
          border: "0.5px solid rgba(76,175,80,.2)",
        }}
      >
        <Shield size={16} style={{ color: "#4CAF50", flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ color: "var(--cream)", fontSize: 13, fontWeight: 600 }}>
            7 dias gratis em qualquer plano
          </p>
          <p style={{ color: "var(--s5)", fontSize: 11, marginTop: 2 }}>
            Você já valida o cartão nesta etapa e a cobrança começa automaticamente depois do período gratuito.
          </p>
        </div>
      </div>

      <div
        className={`rounded-2xl px-4 py-4 mb-8 ${mounted ? "anim-fadeUp d-300" : ""}`}
        style={{ background: "transparent", border: "none", padding: 0 }}
      >
        <StripeCardSetupPanel
          email={email}
          fullName={fullName}
          initialPayment={payment}
          onProcessingChange={setCardPanelBusy}
          onPaymentChange={onPaymentChange}
          planId={data.selectedPlan}
          ref={cardPanelRef}
        />
      </div>

      <div className="flex gap-3">
        <button className="btn-ghost flex-1 justify-center" onClick={onBack}>
          <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.5" />
          </svg>
          Voltar
        </button>
        <button
          className="btn-primary flex-[2] justify-center"
          disabled={cardPanelBusy || validatingCard}
          onClick={() => {
            void handleContinue();
          }}
        >
          {validatingCard
            ? "Validando cartão..."
            : data.selectedPlan === "pro"
              ? "Continuar com Pro"
              : "Continuar com Essencial"}
          <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
