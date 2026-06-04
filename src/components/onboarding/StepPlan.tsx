"use client";

import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import { getPricingPlan, pricingPlans } from "@/lib/pricing";
import { currencyStringToCents } from "@/lib/subscription";
import type { OnboardingPaymentData, PlanData } from "@/types/onboarding";

interface Props {
  data: PlanData;
  email: string;
  errorMessage: string;
  onBack: () => void;
  onChange: (data: PlanData) => void;
  onNext: () => void;
  onPaymentChange: (payment: OnboardingPaymentData) => void;
  submitting: boolean;
}

const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;

if (publicKey) {
  initMercadoPago(publicKey, { locale: "pt-BR" });
}

export default function StepPlan({ data, email, errorMessage, onBack, onChange, onNext, onPaymentChange, submitting }: Props) {
  const [mounted, setMounted] = useState(false);
  const [brickError, setBrickError] = useState("");
  const selectedPlan = getPricingPlan(data.selectedPlan);

  useEffect(() => {
    setMounted(true);
  }, []);

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
          <span style={{ color: "var(--cream)", fontWeight: 600 }}>
            +3.400 motoristas
          </span>{" "}
          já usam o Urbann Pro
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
        <svg fill="none" height="16" viewBox="0 0 24 24" width="16" style={{ flexShrink: 0, marginTop: 2 }}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#4CAF50" strokeWidth="2" />
        </svg>
        <div>
          <p style={{ color: "var(--cream)", fontSize: 13, fontWeight: 600 }}>
            7 dias grátis em qualquer plano
          </p>
          <p style={{ color: "var(--s5)", fontSize: 11, marginTop: 2 }}>
            Novos usuários pagam o valor promocional por 2 meses. Depois disso, o plano volta ao valor normal.
          </p>
        </div>
      </div>

      <div
        className={`rounded-2xl px-4 py-4 mb-8 ${mounted ? "anim-fadeUp d-300" : ""}`}
        style={{ background: "var(--s2)", border: "0.5px solid var(--s3)" }}
      >
        <div className="mb-4">
          <p style={{ color: "var(--cream)", fontSize: 15, fontWeight: 700 }}>
            Cartão para ativar sua assinatura
          </p>
          <p style={{ color: "var(--s5)", fontSize: 12, lineHeight: 1.7, marginTop: 6 }}>
            Você continua com 7 dias grátis, mas já deixa o cartão validado nesta etapa para a cobrança começar automaticamente depois do período gratuito.
          </p>
        </div>

        {publicKey ? (
          <CardPayment
            key={data.selectedPlan}
            initialization={{
              amount: currencyStringToCents(selectedPlan.promoPrice) / 100,
              payer: {
                email,
              },
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
            onError={(error) => {
              setBrickError(error.message || "Não foi possível carregar o formulário do cartão.");
            }}
            onReady={() => {
              setBrickError("");
            }}
            onSubmit={(formData, additionalData) => {
              onPaymentChange({
                cardLastFour: additionalData?.lastFourDigits,
                formData: formData as OnboardingPaymentData["formData"],
              });
              onNext();
              return Promise.resolve();
            }}
          />
        ) : (
          <p style={{ color: "#f0b36a", fontSize: 12 }}>
            Configure a chave pública do Mercado Pago para mostrar o formulário do cartão.
          </p>
        )}

        {brickError ? <p className="field-error mt-3">{brickError}</p> : null}
        {errorMessage ? <p className="field-error mt-3">{errorMessage}</p> : null}
      </div>

      <div className="flex gap-3">
        <button className="btn-ghost flex-1 justify-center" disabled={submitting} onClick={onBack}>
          <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.5" />
          </svg>
          Voltar
        </button>
        <button className="btn-primary flex-[2] justify-center" disabled>
          Preencha o cartão acima para continuar
        </button>
      </div>
    </div>
  );
}
