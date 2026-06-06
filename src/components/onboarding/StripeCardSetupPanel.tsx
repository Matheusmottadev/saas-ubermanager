"use client";

import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { AlertCircle, CheckCircle2, CreditCard, LockKeyhole } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { OnboardingPaymentData, Plan } from "@/types/onboarding";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

const elementOptions = {
  style: {
    base: {
      "::placeholder": {
        color: "rgba(245,244,240,.32)",
      },
      color: "#f5f4f0",
      fontFamily: "var(--font-body), sans-serif",
      fontSize: "18px",
      iconColor: "#f5f4f0",
    },
    invalid: {
      color: "#f59191",
      iconColor: "#f59191",
    },
  },
};

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function CardField(props: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={`block ${props.className ?? ""}`}>
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--s5)" }}>
        {props.label}
      </span>
      <div
        className="rounded-2xl px-4 py-4"
        style={{
          background: "rgba(255,255,255,.03)",
          border: "0.5px solid rgba(255,255,255,.08)",
        }}
      >
        {props.children}
      </div>
    </label>
  );
}

function StripeCardSetupPanelInner(props: {
  email: string;
  fullName: string;
  initialPayment: OnboardingPaymentData | null;
  onPaymentChange: (payment: OnboardingPaymentData | null) => void;
  planId: Plan;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = useState("");
  const [loadingIntent, setLoadingIntent] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [cardholderName, setCardholderName] = useState(props.initialPayment?.cardholderName || props.fullName);
  const [cpf, setCpf] = useState(props.initialPayment?.cpf || "");
  const [successLabel, setSuccessLabel] = useState(
    props.initialPayment ? `Cartão validado •••• ${props.initialPayment.cardLastFour}` : "",
  );

  useEffect(() => {
    setCardholderName((current) => current || props.fullName);
  }, [props.fullName]);

  useEffect(() => {
    async function createSetupIntent() {
      setLoadingIntent(true);
      setErrorMessage("");

      try {
        const response = await fetch("/api/stripe/setup-intent", {
          body: JSON.stringify({
            planId: props.planId,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        const payload = (await response.json()) as {
          clientSecret?: string;
          error?: string;
        };

        if (!response.ok || !payload.clientSecret) {
          throw new Error(payload.error ?? "Não foi possível preparar o cartão.");
        }

        setClientSecret(payload.clientSecret);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível preparar o cartão.");
      } finally {
        setLoadingIntent(false);
      }
    }

    void createSetupIntent();
  }, [props.planId]);

  const cardSummary = useMemo(() => {
    if (!props.initialPayment) {
      return null;
    }

    return `${props.initialPayment.cardBrand.toUpperCase()} •••• ${props.initialPayment.cardLastFour}`;
  }, [props.initialPayment]);

  async function handleSaveCard() {
    if (!stripe || !elements) {
      setErrorMessage("A Stripe ainda está carregando. Tente novamente em alguns segundos.");
      return;
    }

    const name = cardholderName.trim();
    const cpfDigits = cpf.replace(/\D/g, "");
    const numberElement = elements.getElement(CardNumberElement);

    if (!clientSecret || !numberElement) {
      setErrorMessage("Não foi possível preparar o cartão.");
      return;
    }

    if (name.length < 3) {
      setErrorMessage("Informe o nome do titular como aparece no cartão.");
      return;
    }

    if (cpfDigits.length !== 11) {
      setErrorMessage("Informe um CPF válido para continuar.");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const paymentMethodResult = await stripe.createPaymentMethod({
        billing_details: {
          email: props.email,
          name,
        },
        card: numberElement,
        type: "card",
      });

      if (paymentMethodResult.error || !paymentMethodResult.paymentMethod) {
        throw new Error(paymentMethodResult.error?.message ?? "Não foi possível validar o cartão.");
      }

      const confirmResult = await stripe.confirmCardSetup(clientSecret, {
        payment_method: paymentMethodResult.paymentMethod.id,
      });

      if (confirmResult.error || !confirmResult.setupIntent) {
        throw new Error(confirmResult.error?.message ?? "Não foi possível autorizar o cartão.");
      }

      const payment: OnboardingPaymentData = {
        cardBrand: paymentMethodResult.paymentMethod.card?.brand ?? "card",
        cardLastFour: paymentMethodResult.paymentMethod.card?.last4 ?? "",
        cardholderName: name,
        cpf: cpfDigits,
        paymentMethodId: paymentMethodResult.paymentMethod.id,
        setupIntentId: confirmResult.setupIntent.id,
      };

      props.onPaymentChange(payment);
      setSuccessLabel(`Cartão validado •••• ${payment.cardLastFour}`);
    } catch (error) {
      props.onPaymentChange(null);
      setSuccessLabel("");
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível validar o cartão.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="rounded-[28px] p-5"
      style={{
        background: "linear-gradient(180deg, rgba(12,18,35,.96) 0%, rgba(15,20,38,.96) 100%)",
        border: "0.5px solid rgba(125,217,122,.14)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.04)",
      }}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[22px] font-black tracking-[-0.04em]" style={{ color: "var(--cream)" }}>
            Cartão para ativar sua assinatura
          </p>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--s5)" }}>
            Você continua com 7 dias grátis, mas já valida o cartão agora para a cobrança entrar automaticamente depois do período gratuito.
          </p>
        </div>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: "rgba(125,217,122,.08)", color: "#7dd97a" }}
        >
          <CreditCard size={20} />
        </div>
      </div>

      {cardSummary ? (
        <div
          className="mb-5 rounded-2xl px-4 py-3 text-sm"
          style={{
            background: "rgba(125,217,122,.08)",
            border: "0.5px solid rgba(125,217,122,.18)",
            color: "#d9fdd3",
          }}
        >
          {cardSummary}
        </div>
      ) : null}

      <div className="grid gap-4">
        <CardField label="Número do cartão">
          <CardNumberElement options={elementOptions} />
        </CardField>

        <div className="grid gap-4 md:grid-cols-2">
          <CardField label="Validade">
            <CardExpiryElement options={elementOptions} />
          </CardField>
          <CardField label="CVC">
            <CardCvcElement options={elementOptions} />
          </CardField>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <label className="block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--s5)" }}>
              Nome no cartão
            </span>
            <input
              className="w-full rounded-2xl px-4 py-4 text-base outline-none"
              style={{
                background: "rgba(255,255,255,.03)",
                border: "0.5px solid rgba(255,255,255,.08)",
                color: "var(--cream)",
              }}
              value={cardholderName}
              onChange={(event) => setCardholderName(event.target.value)}
              placeholder="Nome como aparece no cartão"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--s5)" }}>
              CPF do titular
            </span>
            <input
              className="w-full rounded-2xl px-4 py-4 text-base outline-none"
              style={{
                background: "rgba(255,255,255,.03)",
                border: "0.5px solid rgba(255,255,255,.08)",
                color: "var(--cream)",
              }}
              value={cpf}
              onChange={(event) => setCpf(formatCpf(event.target.value))}
              inputMode="numeric"
              placeholder="000.000.000-00"
            />
          </label>
        </div>
      </div>

      {loadingIntent ? (
        <div className="mt-5 text-sm" style={{ color: "var(--s5)" }}>
          Preparando validação segura do cartão...
        </div>
      ) : null}

      {errorMessage ? (
        <div
          className="mt-5 flex items-start gap-3 rounded-2xl px-4 py-3 text-sm"
          style={{
            background: "rgba(245,145,145,.08)",
            border: "0.5px solid rgba(245,145,145,.18)",
            color: "#ffb7b7",
          }}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {successLabel ? (
        <div
          className="mt-5 flex items-start gap-3 rounded-2xl px-4 py-3 text-sm"
          style={{
            background: "rgba(125,217,122,.08)",
            border: "0.5px solid rgba(125,217,122,.18)",
            color: "#d9fdd3",
          }}
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{successLabel}</span>
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--s5)" }}>
          <LockKeyhole size={14} />
          O cartão fica tokenizado pela Stripe
        </div>
        <button
          className="rounded-2xl px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: "var(--cream)" }}
          disabled={!stripe || loadingIntent || saving}
          onClick={() => {
            void handleSaveCard();
          }}
          type="button"
        >
          {saving ? "Validando cartão..." : props.initialPayment ? "Trocar cartão" : "Validar cartão"}
        </button>
      </div>
    </div>
  );
}

export default function StripeCardSetupPanel(props: {
  email: string;
  fullName: string;
  initialPayment: OnboardingPaymentData | null;
  onPaymentChange: (payment: OnboardingPaymentData | null) => void;
  planId: Plan;
}) {
  if (!stripePromise) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-200">
        Configure a chave pública da Stripe para liberar a validação do cartão no onboarding.
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <StripeCardSetupPanelInner {...props} />
    </Elements>
  );
}
