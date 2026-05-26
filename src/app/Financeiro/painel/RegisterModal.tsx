"use client";

import { useEffect, useState } from "react";

import { platformMeta, platformOrder, type PlatformKey } from "./data";
import { brazilLocationSuggestions } from "@/lib/brazil-location-suggestions";

type RegisterMode = "corrida" | "diario";

type RegisterRideDraft = {
  date: string;
  destination: string;
  end: string;
  id: string;
  idleAfter: string;
  km: string;
  obs: string;
  origin: string;
  platform: PlatformKey;
  start: string;
  value: string;
};

type DailySummaryDraft = {
  indriveRevenue: string;
  ninetyNineRevenue: string;
  onlineHours: string;
  totalKm: string;
  totalRides: string;
  uberRevenue: string;
};

export type RegisterModalPayload =
  | {
      mode: "corrida";
      rides: RegisterRideDraft[];
    }
  | {
      mode: "diario";
      summary: DailySummaryDraft;
    };

function createEmptyRide(): RegisterRideDraft {
  return {
    date: "",
    destination: "",
    end: "",
    id: Math.random().toString(36).slice(2),
    idleAfter: "",
    km: "",
    obs: "",
    origin: "",
    platform: "uber",
    start: "",
    value: "",
  };
}

function createEmptyDaily(): DailySummaryDraft {
  return {
    indriveRevenue: "",
    ninetyNineRevenue: "",
    onlineHours: "",
    totalKm: "",
    totalRides: "",
    uberRevenue: "",
  };
}

function formatModalCurrency(value: string) {
  const parsed = Number(value || 0);
  return parsed.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function RegisterField(props: {
  label: string;
  placeholder?: string;
  step?: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">{props.label}</span>
      <input
        className="h-11 w-full rounded-[0.85rem] border border-white/10 bg-white/[0.04] px-3.5 text-sm text-[#f5f4f0] outline-none transition placeholder:text-neutral-600 focus:border-white/20"
        placeholder={props.placeholder}
        step={props.step}
        type={props.type ?? "text"}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}

function normalizeSuggestionText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function NeighborhoodField(props: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const normalizedInput = normalizeSuggestionText(props.value);
  const suggestions =
    normalizedInput.length >= 2
      ? brazilLocationSuggestions
          .filter((item) =>
            normalizeSuggestionText(`${item.label} ${item.city} ${item.state}`).includes(normalizedInput),
          )
          .slice(0, 6)
      : [];

  return (
    <label className="relative flex flex-1 flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">{props.label}</span>
      <input
        className="h-11 w-full rounded-[0.85rem] border border-white/10 bg-white/[0.04] px-3.5 text-sm text-[#f5f4f0] outline-none transition placeholder:text-neutral-600 focus:border-white/20"
        placeholder={props.placeholder}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
      {suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-[0.95rem] border border-white/10 bg-[#1a1a1a] shadow-2xl">
          {suggestions.map((suggestion) => (
            <button
              key={`${props.label}-${suggestion.label}-${suggestion.city}-${suggestion.state}`}
              className="flex w-full flex-col items-start px-3.5 py-2.5 text-left transition hover:bg-white/5 hover:text-white"
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => props.onChange(`${suggestion.label} - ${suggestion.city}/${suggestion.state}`)}
            >
              <span className="text-sm text-neutral-200">{suggestion.label}</span>
              <span className="text-[11px] text-neutral-500">
                {suggestion.city}, {suggestion.state}
              </span>
            </button>
          ))}
        </div>
      )}
    </label>
  );
}

function PlatformChip(props: {
  active: boolean;
  platform: PlatformKey;
  onClick: () => void;
}) {
  const color = props.platform === "99" ? "#111111" : platformMeta[props.platform].color;

  return (
    <button
      className="flex-1 rounded-[0.7rem] border px-3 py-2 text-sm font-semibold transition"
      style={{
        backgroundColor: props.active ? `${platformMeta[props.platform].color}18` : "transparent",
        borderColor: props.active ? `${platformMeta[props.platform].color}66` : "rgba(255,255,255,0.08)",
        color: props.active ? color : "rgba(255,255,255,0.35)",
      }}
      type="button"
      onClick={props.onClick}
    >
      {platformMeta[props.platform].label}
    </button>
  );
}

function RegisterRideCard(props: {
  canRemove: boolean;
  index: number;
  isLast: boolean;
  ride: RegisterRideDraft;
  onChange: (ride: RegisterRideDraft) => void;
  onRemove: () => void;
}) {
  const updateField =
    (field: keyof RegisterRideDraft) =>
    (value: string) =>
      props.onChange({ ...props.ride, [field]: value });

  return (
    <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] p-3.5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-600">
          Corrida #{props.index + 1}
        </span>
        {props.canRemove && (
          <button
            className="rounded-[0.6rem] border border-rose-400/20 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-400 transition hover:bg-rose-500/15"
            type="button"
            onClick={props.onRemove}
          >
            Remover
          </button>
        )}
      </div>

      <div className="mb-3 flex gap-2">
        {platformOrder.map((platform) => (
          <PlatformChip
            key={platform}
            active={props.ride.platform === platform}
            platform={platform}
            onClick={() => updateField("platform")(platform)}
          />
        ))}
      </div>

      <div className="mb-2.5 flex gap-2.5">
        <RegisterField label="Valor (R$)" placeholder="0,00" step="0.01" type="number" value={props.ride.value} onChange={updateField("value")} />
        <RegisterField label="Km" placeholder="0,0" step="0.1" type="number" value={props.ride.km} onChange={updateField("km")} />
      </div>

      <div className="mb-2.5 flex gap-2.5">
        <NeighborhoodField label="Origem" placeholder="Bairro" value={props.ride.origin} onChange={updateField("origin")} />
        <NeighborhoodField label="Destino" placeholder="Bairro" value={props.ride.destination} onChange={updateField("destination")} />
      </div>

      <div className="mb-2.5 flex gap-2.5">
        <RegisterField label="Data (opcional)" type="date" value={props.ride.date} onChange={updateField("date")} />
        <RegisterField label="Início" type="time" value={props.ride.start} onChange={updateField("start")} />
        <RegisterField label="Fim" type="time" value={props.ride.end} onChange={updateField("end")} />
      </div>

      <RegisterField label="Observação (opcional)" placeholder="Surge, bônus, evento..." value={props.ride.obs} onChange={updateField("obs")} />

      {!props.isLast && (
        <div className="mt-3 rounded-[0.9rem] border border-dashed border-white/10 bg-white/[0.02] p-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-600">
            Intervalo até a próxima corrida
          </div>
          <div className="flex items-end gap-2.5">
            <div className="min-w-0 flex-1 text-xs leading-5 text-neutral-500">
              Informe quanto tempo você ficou parado antes da corrida #{props.index + 2}. Se não houve pausa, deixe 00:00.
            </div>
            <div className="w-[150px] shrink-0">
              <RegisterField
                label="Tempo parado"
                placeholder="00:00"
                type="time"
                value={props.ride.idleAfter}
                onChange={updateField("idleAfter")}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RegisterModal(props: {
  onClose: () => void;
  onSubmit: (payload: RegisterModalPayload) => void;
  open: boolean;
}) {
  const [mode, setMode] = useState<RegisterMode | null>(null);
  const [rides, setRides] = useState<RegisterRideDraft[]>([createEmptyRide()]);
  const [daily, setDaily] = useState<DailySummaryDraft>(createEmptyDaily());
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!props.open) {
      return;
    }

    setMode(null);
    setRides([createEmptyRide()]);
    setDaily(createEmptyDaily());
    setSubmitted(false);
  }, [props.open]);

  if (!props.open) {
    return null;
  }

  const totalRideValue = rides.reduce((sum, ride) => sum + (Number(ride.value) || 0), 0);
  const totalDailyValue =
    (Number(daily.uberRevenue) || 0) +
    (Number(daily.ninetyNineRevenue) || 0) +
    (Number(daily.indriveRevenue) || 0);

  const saveCurrentMode = () => {
    setSubmitted(true);

    window.setTimeout(() => {
      if (mode === "corrida") {
        props.onSubmit({
          mode: "corrida",
          rides,
        });
        return;
      }

      if (mode === "diario") {
        props.onSubmit({
          mode: "diario",
          summary: daily,
        });
      }
    }, 900);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          props.onClose();
        }
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[1.6rem] border-t border-white/10 bg-[#111111] shadow-2xl">
        <div className="flex justify-center pb-1 pt-3">
          <div className="h-1 w-9 rounded-full bg-white/10" />
        </div>

        <div className="border-b border-white/5 px-6 pb-4 pt-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div
                className="text-[1.35rem] font-black tracking-[-0.05em] text-[#f5f4f0]"
                style={{ fontFamily: "var(--panel-font-display)" }}
              >
                Registrar
              </div>
              {mode && (
                <div className="mt-1 text-xs text-neutral-500">
                  {mode === "corrida" ? "Lançamento em tabela" : "Resumo diário manual"}
                </div>
              )}
            </div>
            {mode && (
              <button
                className="rounded-[0.65rem] border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold text-neutral-400 transition hover:text-white"
                type="button"
                onClick={() => setMode(null)}
              >
                Voltar
              </button>
            )}
          </div>
        </div>

        {!mode && (
          <div className="flex flex-col gap-3 px-6 pb-7 pt-5">
            <div className="text-sm text-neutral-500">Escolha como quer registrar hoje:</div>

            <button
              className="rounded-[0.95rem] border border-white/10 bg-white/[0.04] p-4 text-left transition hover:-translate-y-[1px]"
              type="button"
              onClick={() => setMode("corrida")}
            >
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9rem] border border-sky-400/20 bg-sky-400/10 text-xl">
                  📋
                </div>
                <div className="min-w-0">
                  <div
                    className="text-[1rem] font-bold tracking-[-0.03em] text-[#f5f4f0]"
                    style={{ fontFamily: "var(--panel-font-display)" }}
                  >
                    Lançamento em tabela
                  </div>
                  <div className="mt-1 text-xs leading-5 text-neutral-500">
                    Registre cada corrida individualmente com plataforma, valor, km, horário e observação.
                  </div>
                  <div className="mt-3 flex gap-2">
                    {platformOrder.map((platform) => (
                      <span
                        key={platform}
                        className="rounded-[0.45rem] border px-2 py-1 text-[10px] font-semibold"
                        style={{
                          backgroundColor: `${platformMeta[platform].color}18`,
                          borderColor: `${platformMeta[platform].color}55`,
                          color: platform === "99" ? "#111111" : platformMeta[platform].color,
                        }}
                      >
                        {platformMeta[platform].label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>

            <button
              className="rounded-[0.95rem] border border-white/10 bg-white/[0.04] p-4 text-left transition hover:-translate-y-[1px]"
              type="button"
              onClick={() => setMode("diario")}
            >
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9rem] border border-lime-400/20 bg-lime-400/10 text-xl">
                  📊
                </div>
                <div className="min-w-0">
                  <div
                    className="text-[1rem] font-bold tracking-[-0.03em] text-[#f5f4f0]"
                    style={{ fontFamily: "var(--panel-font-display)" }}
                  >
                    Resumo diário manual
                  </div>
                  <div className="mt-1 text-xs leading-5 text-neutral-500">
                    Informe só o total do dia: faturamento por plataforma, km rodado, horas online e corridas.
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["Faturamento", "Km total", "Horas", "Corridas"].map((tag) => (
                      <span key={tag} className="rounded-[0.45rem] bg-white/[0.06] px-2 py-1 text-[10px] font-semibold text-neutral-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          </div>
        )}

        {mode === "corrida" && !submitted && (
          <>
            <div className="flex-1 space-y-2.5 overflow-y-auto px-6 py-4">
              {rides.map((ride, index) => (
                <RegisterRideCard
                  key={ride.id}
                  canRemove={rides.length > 1}
                  index={index}
                  isLast={index === rides.length - 1}
                  ride={ride}
                  onChange={(updatedRide) =>
                    setRides((current) =>
                      current.map((item) => (item.id === updatedRide.id ? updatedRide : item)),
                    )
                  }
                  onRemove={() =>
                    setRides((current) => current.filter((item) => item.id !== ride.id))
                  }
                />
              ))}

              <button
                className="flex w-full items-center justify-center gap-2 rounded-[0.95rem] border border-dashed border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-neutral-400 transition hover:bg-white/[0.07]"
                type="button"
                onClick={() => setRides((current) => [...current, createEmptyRide()])}
              >
                <span className="text-lg leading-none">+</span>
                Adicionar corrida
              </button>
            </div>

            <div className="border-t border-white/5 px-6 pb-7 pt-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-xs text-neutral-500">
                  {rides.length} {rides.length === 1 ? "corrida pronta para salvar" : "corridas prontas para salvar"}
                </span>
                <span className="text-sm font-semibold text-[#f5f4f0]">
                  R$ {formatModalCurrency(String(totalRideValue))}
                </span>
              </div>
              <button
                className="w-full rounded-[0.9rem] bg-[#f5f4f0] px-4 py-4 text-sm font-bold text-black transition hover:opacity-90"
                style={{ fontFamily: "var(--panel-font-display)" }}
                type="button"
                onClick={saveCurrentMode}
              >
                Salvar {rides.length > 1 ? `${rides.length} corridas` : "corrida"}
              </button>
            </div>
          </>
        )}

        {mode === "diario" && !submitted && (
          <>
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
              <div>
                <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-600">
                  Faturamento por plataforma
                </div>
                <div className="space-y-2.5">
                  {(
                    [
                      { field: "uberRevenue", label: "Faturamento Uber", platform: "uber" as PlatformKey },
                      { field: "ninetyNineRevenue", label: "Faturamento 99", platform: "99" as PlatformKey },
                      { field: "indriveRevenue", label: "Faturamento inDrive", platform: "indrive" as PlatformKey },
                    ] as Array<{
                      field: keyof DailySummaryDraft;
                      label: string;
                      platform: PlatformKey;
                    }>
                  ).map((item) => (
                    <div key={item.field} className="flex items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: platformMeta[item.platform].color }}
                      />
                      <RegisterField
                        label={item.label}
                        placeholder="0,00"
                        step="0.01"
                        type="number"
                        value={daily[item.field]}
                        onChange={(value) =>
                          setDaily((current) => ({ ...current, [item.field]: value }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-white/6" />

              <div>
                <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-600">
                  Totais do dia
                </div>
                <div className="mb-2.5 flex gap-2.5">
                  <RegisterField
                    label="Km total"
                    placeholder="0,0"
                    step="0.1"
                    type="number"
                    value={daily.totalKm}
                    onChange={(value) => setDaily((current) => ({ ...current, totalKm: value }))}
                  />
                  <RegisterField
                    label="Horas online"
                    placeholder="0"
                    step="0.5"
                    type="number"
                    value={daily.onlineHours}
                    onChange={(value) => setDaily((current) => ({ ...current, onlineHours: value }))}
                  />
                </div>
                <RegisterField
                  label="Corridas totais"
                  placeholder="0"
                  type="number"
                  value={daily.totalRides}
                  onChange={(value) => setDaily((current) => ({ ...current, totalRides: value }))}
                />
              </div>

              {(daily.uberRevenue || daily.ninetyNineRevenue || daily.indriveRevenue) && (
                <div className="flex items-center justify-between rounded-[0.95rem] border border-white/8 bg-white/[0.04] px-4 py-3">
                  <span className="text-sm text-neutral-500">Total do dia</span>
                  <span
                    className="text-[1.2rem] font-black tracking-[-0.04em] text-lime-400"
                    style={{ fontFamily: "var(--panel-font-display)" }}
                  >
                    R$ {formatModalCurrency(String(totalDailyValue))}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-white/5 px-6 pb-7 pt-4">
              <button
                className="w-full rounded-[0.9rem] bg-[#f5f4f0] px-4 py-4 text-sm font-bold text-black transition hover:opacity-90"
                style={{ fontFamily: "var(--panel-font-display)" }}
                type="button"
                onClick={saveCurrentMode}
              >
                Salvar resumo do dia
              </button>
            </div>
          </>
        )}

        {submitted && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-lime-400/20 bg-lime-500/15 text-2xl text-lime-300">
              ✓
            </div>
            <div
              className="text-[1.1rem] font-black tracking-[-0.04em] text-[#f5f4f0]"
              style={{ fontFamily: "var(--panel-font-display)" }}
            >
              {mode === "corrida" ? "Corridas salvas!" : "Resumo salvo!"}
            </div>
            <div className="text-sm text-neutral-500">Dados registrados com sucesso.</div>
          </div>
        )}
      </div>
    </div>
  );
}
