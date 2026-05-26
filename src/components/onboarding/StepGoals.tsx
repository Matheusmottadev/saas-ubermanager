"use client";

import { useEffect, useState } from "react";

import { computeGoalsTotal } from "@/lib/onboarding";
import type { GoalData } from "@/types/onboarding";

interface Props {
  data: GoalData;
  onBack: () => void;
  onChange: (data: GoalData) => void;
  onNext: () => void;
}

const PLATFORMS = [
  { color: "#ffffff", enableKey: "enableUber", id: "uber", key: "uberGoal", label: "Uber", textColor: "#000000" },
  { color: "#FFD200", enableKey: "enable99", id: "99", key: "n99Goal", label: "99", textColor: "#000000" },
  { color: "#00C853", enableKey: "enableIndrive", id: "indrive", key: "indriveGoal", label: "inDrive", textColor: "#000000" },
] as const;

const GOAL_PRESETS = [3000, 5000, 7000, 10000];

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    currency: "BRL",
    minimumFractionDigits: 0,
    style: "currency",
  });
}

export default function StepGoals({ data, onBack, onChange, onNext }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const setField = (key: keyof GoalData, value: string | boolean) => {
    const next = { ...data, [key]: value };
    next.totalGoal = String(computeGoalsTotal(next));
    onChange(next);
  };

  const total = computeGoalsTotal(data);
  const canNext = total > 0;

  return (
    <div>
      <div
        className={`rounded-2xl p-5 mb-6 ${mounted ? "anim-scaleIn" : ""}`}
        style={{ background: "var(--s2)", border: "0.5px solid var(--s3)" }}
      >
        <p className="field-label" style={{ marginBottom: 8 }}>
          Meta mensal total
        </p>
        <p
          style={{
            color: "var(--cream)",
            fontFamily: "var(--font-title), sans-serif",
            fontSize: 44,
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 1,
          }}
        >
          {formatBRL(total)}
        </p>
        <p style={{ color: "var(--s5)", fontSize: 12, marginTop: 8 }}>
          O total considera apenas as plataformas que estão ativas.
        </p>
      </div>

      <div className={`mb-6 grid gap-3 xl:grid-cols-2 ${mounted ? "anim-fadeUp d-100" : ""}`}>
        {PLATFORMS.map((platform) => {
          const enabled = data[platform.enableKey] as boolean;

          return (
            <div
              key={platform.id}
              className="rounded-xl p-4 transition-all"
              style={{
                background: enabled ? "var(--s2)" : "var(--s1)",
                border: `0.5px solid ${enabled ? "rgba(255,255,255,.1)" : "var(--s3)"}`,
                opacity: enabled ? 1 : 0.55,
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: platform.color,
                    color: platform.textColor,
                    fontSize: platform.id === "indrive" ? 8 : 11,
                    fontWeight: 800,
                    height: 34,
                    lineHeight: platform.id === "indrive" ? 1.2 : 1,
                    textAlign: "center",
                    width: 34,
                  }}
                >
                  {platform.id === "indrive" ? (
                    <>
                      in
                      <br />
                      Drive
                    </>
                  ) : (
                    platform.label
                  )}
                </div>

                <div className="flex-1">
                  <p style={{ color: "var(--cream)", fontSize: 14, fontWeight: 600 }}>
                    {platform.label}
                  </p>
                  <p style={{ color: "var(--s5)", fontSize: 11 }}>
                    Meta individual da plataforma
                  </p>
                </div>

                <button
                  aria-label={`${enabled ? "Desativar" : "Ativar"} ${platform.label}`}
                  className={`toggle ${enabled ? "on" : ""}`}
                  type="button"
                  onClick={() => setField(platform.enableKey, !enabled)}
                />
              </div>

              {enabled ? (
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      color: "var(--s5)",
                      flexShrink: 0,
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    R$
                  </span>
                  <input
                    className="field-input"
                    min="0"
                    placeholder="0"
                    step="100"
                    style={{
                      fontFamily: "var(--font-title), sans-serif",
                      fontSize: 18,
                      fontWeight: 700,
                    }}
                    type="number"
                    value={data[platform.key] as string}
                    onChange={(event) => setField(platform.key, event.target.value)}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className={`mb-6 ${mounted ? "anim-fadeUp d-200" : ""}`}>
        <p className="field-label" style={{ marginBottom: 12 }}>
          Metas adicionais
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="field-label">Km por mês</label>
            <input
              className="field-input"
              min="0"
              placeholder="3500"
              step="100"
              type="number"
              value={data.kmGoal}
              onChange={(event) => setField("kmGoal", event.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Horas por dia</label>
            <input
              className="field-input"
              max="24"
              min="0"
              placeholder="8"
              step="0.5"
              type="number"
              value={data.hoursGoal}
              onChange={(event) => setField("hoursGoal", event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className={`mb-8 ${mounted ? "anim-fadeUp d-250" : ""}`}>
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
          <p className="field-label" style={{ marginBottom: 10 }}>
            Presets rápidos
          </p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {GOAL_PRESETS.map((preset) => (
              <button
                key={preset}
                style={{
                  background: total === preset ? "rgba(245,244,240,.06)" : "transparent",
                  border: `0.5px solid ${total === preset ? "var(--cream)" : "var(--s4)"}`,
                  borderRadius: 10,
                  color: total === preset ? "var(--cream)" : "var(--s5)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "10px 14px",
                  transition: "all .15s",
                }}
                type="button"
                onClick={() =>
                  onChange({
                    ...data,
                    enable99: true,
                    enableIndrive: true,
                    enableUber: true,
                    indriveGoal: String(preset - Math.round(preset * 0.57) - Math.round(preset * 0.29)),
                    n99Goal: String(Math.round(preset * 0.29)),
                    totalGoal: String(preset),
                    uberGoal: String(Math.round(preset * 0.57)),
                  })
                }
              >
                {formatBRL(preset)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button className="btn-ghost flex-1 justify-center" onClick={onBack}>
          <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.5" />
          </svg>
          Voltar
        </button>
        <button className="btn-primary flex-[2] justify-center" disabled={!canNext} onClick={onNext}>
          Continuar
          <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
