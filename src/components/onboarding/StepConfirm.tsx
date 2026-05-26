"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

import { computeGoalsTotal } from "@/lib/onboarding";
import type { OnboardingData } from "@/types/onboarding";

interface Props {
  data: OnboardingData;
  errorMessage: string;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}

function Row(props: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between py-2"
      style={{ borderBottom: "0.5px solid rgba(255,255,255,.04)" }}
    >
      <span style={{ color: "var(--s5)", fontSize: 12 }}>{props.label}</span>
      <span style={{ color: "var(--cream)", fontSize: 13, fontWeight: 600 }}>
        {props.value}
      </span>
    </div>
  );
}

function Section(props: { children: React.ReactNode; className?: string; title: string }) {
  return (
    <div
      className={`rounded-xl p-4 ${props.className ?? ""}`}
      style={{ background: "var(--s2)", border: "0.5px solid var(--s3)" }}
    >
      <p className="field-label" style={{ marginBottom: 10 }}>
        {props.title}
      </p>
      {props.children}
    </div>
  );
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    currency: "BRL",
    minimumFractionDigits: 0,
    style: "currency",
  });
}

export default function StepConfirm({
  data,
  errorMessage,
  onBack,
  onSubmit,
  submitting,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const total = computeGoalsTotal(data.goals);
  const platformGoals = [
    data.goals.enableUber && data.goals.uberGoal
      ? { color: "#ffffff", label: "Uber", value: formatBRL(Number(data.goals.uberGoal)) }
      : null,
    data.goals.enable99 && data.goals.n99Goal
      ? { color: "#FFD200", label: "99", value: formatBRL(Number(data.goals.n99Goal)) }
      : null,
    data.goals.enableIndrive && data.goals.indriveGoal
      ? { color: "#00C853", label: "inDrive", value: formatBRL(Number(data.goals.indriveGoal)) }
      : null,
  ].filter(Boolean) as { color: string; label: string; value: string }[];

  return (
    <div>
      <div className={`mb-5 ${mounted ? "anim-fadeUp" : ""}`}>
        <p style={{ color: "var(--s5)", fontSize: 13 }}>
          Revise tudo antes de criar a conta. Depois você cai direto no painel já configurado.
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
      <Section title="Conta">
        <Row label="Nome" value={`${data.personal.firstName} ${data.personal.lastName}`} />
        <Row label="E-mail" value={data.personal.email} />
        <Row label="Número" value={data.personal.phone} />
      </Section>

      {data.vehicle.brand ? (
        <Section title="Veículo">
          <Row label="Veículo" value={`${data.vehicle.brand} ${data.vehicle.model}`} />
          <Row label="Versão" value={`${data.vehicle.version || "—"} · ${data.vehicle.year}`} />
          <Row label="Combustível" value={data.vehicle.fuel || "—"} />
          {data.vehicle.avgConsumption ? (
            <Row
              label="Consumo médio"
              value={`${data.vehicle.avgConsumption} ${data.vehicle.fuel === "Elétrico" ? "km/kWh" : "km/L"}`}
            />
          ) : null}
          {data.vehicle.monthlyKmEstimate ? (
            <Row label="Km por mês" value={`${Number(data.vehicle.monthlyKmEstimate).toLocaleString("pt-BR")} km`} />
          ) : null}
          {data.vehicle.ownershipStatus ? (
            <Row
              label="Situação"
              value={
                data.vehicle.ownershipStatus === "Quitado"
                  ? "Quitado"
                  : data.vehicle.ownershipStatus === "Alugado"
                    ? `Alugado · ${formatBRL(Number(data.vehicle.monthlyOwnershipCost) || 0)}/mês`
                    : `Financiamento · ${formatBRL(Number(data.vehicle.monthlyOwnershipCost) || 0)}/mês`
              }
            />
          ) : null}
          {data.vehicle.vehicleValue ? (
            <Row
              label="Valor de referência"
              value={`R$${Number(data.vehicle.vehicleValue).toLocaleString("pt-BR")}`}
            />
          ) : null}
        </Section>
      ) : null}

      {total > 0 ? (
        <Section title="Metas">
          <Row label="Total" value={formatBRL(total)} />
          {platformGoals.map((goal) => (
            <div
              key={goal.label}
              className="flex items-center justify-between py-2"
              style={{ borderBottom: "0.5px solid rgba(255,255,255,.04)" }}
            >
              <span className="flex items-center gap-2" style={{ color: "var(--s5)", fontSize: 12 }}>
                <span
                  style={{
                    background: goal.color,
                    borderRadius: 2,
                    display: "inline-block",
                    height: 8,
                    width: 8,
                  }}
                />
                {goal.label}
              </span>
              <span style={{ color: "var(--cream)", fontSize: 13, fontWeight: 600 }}>
                {goal.value}
              </span>
            </div>
          ))}
        </Section>
      ) : null}

      <Section title="Plano">
        <Row
          label="Plano escolhido"
          value={
            data.plan.selectedPlan === "pro"
              ? "Pro · R$24,90 por 2 meses"
              : "Essencial · R$14,90 por 2 meses"
          }
        />
        <Row
          label="Condição"
          value={data.plan.selectedPlan === "pro" ? "7 dias grátis · depois R$29,90/mês" : "7 dias grátis · depois R$19,90/mês"}
        />
      </Section>
      </div>

      <div className={`flex items-start gap-3 mb-3 mt-5 ${mounted ? "anim-fadeUp d-200" : ""}`}>
        <button
          className="rounded flex items-center justify-center flex-shrink-0 mt-[2px]"
          style={{
            background: agreed ? "var(--green)" : "var(--s2)",
            border: `0.5px solid ${agreed ? "var(--green)" : "var(--s4)"}`,
            height: 20,
            transition: "all .2s",
            width: 20,
          }}
          type="button"
          onClick={() => setAgreed((current) => !current)}
        >
          {agreed ? <CheckCircle2 size={13} style={{ color: "#ffffff" }} /> : null}
        </button>
        <p style={{ color: "var(--s5)", fontSize: 12, lineHeight: 1.7 }}>
          Concordo com os{" "}
          <a href="#" style={{ color: "var(--cream)", textDecoration: "underline" }}>
            Termos de Uso
          </a>{" "}
          e a{" "}
          <a href="#" style={{ color: "var(--cream)", textDecoration: "underline" }}>
            Política de Privacidade
          </a>
          .
        </p>
      </div>

      {errorMessage ? <p className="field-error mb-4">{errorMessage}</p> : null}

      <div className="flex gap-3">
        <button className="btn-ghost flex-1 justify-center" disabled={submitting} onClick={onBack}>
          <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.5" />
          </svg>
          Voltar
        </button>
        <button
          className="btn-primary flex-[2] justify-center"
          disabled={!agreed || submitting}
          onClick={onSubmit}
        >
          {submitting ? (
            <>
              <span
                style={{
                  animation: "spin 0.7s linear infinite",
                  border: "2px solid rgba(0,0,0,.2)",
                  borderRadius: "50%",
                  borderTopColor: "#000000",
                  display: "inline-block",
                  height: 14,
                  width: 14,
                }}
              />
              Criando conta...
            </>
          ) : (
            <>
              Criar conta
              <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" />
              </svg>
            </>
          )}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
