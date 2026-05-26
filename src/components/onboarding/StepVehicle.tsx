"use client";

import { AlertCircle, CheckCircle2, CircleHelp, Search, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { searchVehicles } from "@/lib/onboarding";
import type { VehicleData } from "@/types/onboarding";

interface Props {
  data: VehicleData;
  onBack: () => void;
  onChange: (data: VehicleData) => void;
  onNext: () => void;
}

const FUEL_TYPES = ["Flex", "Gasolina", "Etanol", "Diesel", "Elétrico"] as const;
const OWNERSHIP_OPTIONS = ["Quitado", "Em financiamento", "Alugado"] as const;
const VEHICLE_TYPES = ["Combustão", "Elétrico", "Híbrido"] as const;

function HelpTooltip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex items-center group">
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]"
        style={{ color: "var(--s5)" }}
      >
        <CircleHelp size={11} />
      </span>
      <span
        className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-[70] w-[240px] -translate-x-1/2 rounded-xl border border-white/10 bg-[#121212] px-3 py-2 text-[11px] leading-5 text-white opacity-0 shadow-[0_18px_40px_rgba(0,0,0,0.45)] transition-opacity duration-150 group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

export default function StepVehicle({ data, onBack, onChange, onNext }: Props) {
  const [suggestions, setSuggestions] = useState<ReturnType<typeof searchVehicles>>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const setField = (key: keyof VehicleData, value: string | boolean) => {
    onChange({ ...data, [key]: value });
  };

  const handleSearch = (query: string) => {
    setField("searchQuery", query);
    const results = searchVehicles(query);
    setSuggestions(results);
    setShowDropdown(results.length > 0);

    if (!query.length) {
      onChange({
        ...data,
        annualDepreciation: "",
        avgConsumption: "",
        brand: "",
        fuel: "",
        fuelPrice: "",
        isManualEntry: false,
        model: "",
        monthlyKmEstimate: "",
        monthlyOwnershipCost: "",
        ownershipStatus: "",
        searchQuery: "",
        vehicleType: "",
        vehicleValue: "",
        version: "",
        year: "",
      });
    }
  };

  const selectVehicle = (vehicle: ReturnType<typeof searchVehicles>[0]) => {
    onChange({
      ...data,
      annualDepreciation: vehicle.annualDepreciation,
      avgConsumption: vehicle.avgConsumption,
      brand: vehicle.brand,
      fuel: vehicle.fuel as VehicleData["fuel"],
      fuelPrice: vehicle.fuel === "Elétrico" ? "0.95" : "6.19",
      isManualEntry: false,
      model: vehicle.model,
      monthlyKmEstimate: data.monthlyKmEstimate,
      monthlyOwnershipCost: data.monthlyOwnershipCost,
      ownershipStatus: data.ownershipStatus,
      searchQuery: `${vehicle.brand} ${vehicle.model} ${vehicle.year}`,
      vehicleType: vehicle.fuel === "Elétrico" ? "Elétrico" : "Combustão",
      vehicleValue: vehicle.vehicleValue,
      version: vehicle.version,
      year: vehicle.year,
    });
    setSuggestions([]);
    setShowDropdown(false);
  };

  const enterManualMode = () => {
    onChange({ ...data, isManualEntry: true, searchQuery: "" });
    setShowDropdown(false);
  };

  const isElectric =
    data.fuel === "Elétrico" || data.vehicleType === "Elétrico";

  const depreciationPerMonth = data.monthlyKmEstimate
    ? (Number(data.monthlyKmEstimate) * 0.3).toFixed(0)
    : null;

  const canNext = data.isManualEntry
    ? Boolean(data.brand && data.model && data.year && data.fuel)
    : Boolean(data.searchQuery && data.brand);

  return (
    <div>
      {!data.isManualEntry ? (
        <div className={`mb-1 ${mounted ? "anim-fadeUp d-50" : ""}`}>
          <label className="field-label">Buscar seu veículo</label>
          <div className="relative" style={{ zIndex: showDropdown ? 40 : 1 }}>
            <div
              className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--s5)" }}
            >
              <Search size={15} />
            </div>
            <input
              ref={searchRef}
              className={`field-input ${data.brand ? "success" : ""}`}
              placeholder='Digite algo como "Corolla 24"'
              style={{ paddingLeft: 52 }}
              value={data.searchQuery}
              onChange={(event) => handleSearch(event.target.value)}
              onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            />
            {data.brand ? (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <CheckCircle2 size={16} style={{ color: "var(--green)" }} />
              </span>
            ) : null}

            {showDropdown ? (
              <div className="ac-dropdown" ref={dropdownRef}>
                {suggestions.map((vehicle) => (
                  <div
                    key={`${vehicle.brand}-${vehicle.model}-${vehicle.version}-${vehicle.year}`}
                    className="ac-item"
                    onClick={() => selectVehicle(vehicle)}
                  >
                    <span style={{ fontWeight: 600 }}>
                      {vehicle.brand} {vehicle.model}
                    </span>
                    <div className="ac-sub">
                      {vehicle.version} · {vehicle.year} · {vehicle.fuel}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <p className="field-hint" style={{ marginTop: 6 }}>
            Digite a marca, modelo ou ano para receber sugestões do banco.
          </p>
        </div>
      ) : null}

      {!data.isManualEntry && !showDropdown ? (
        <div className={`mb-6 ${mounted ? "anim-fadeUp d-100" : ""}`}>
          <button
            style={{
              background: "none",
              border: "none",
              color: "var(--s5)",
              cursor: "pointer",
              fontSize: 12,
              paddingLeft: 0,
              textDecoration: "underline",
            }}
            type="button"
            onClick={enterManualMode}
          >
            Não encontrei meu veículo. Preencher manualmente
          </button>
        </div>
      ) : null}

      {data.isManualEntry ? (
        <div
          className={`mb-6 flex items-center gap-3 rounded-xl px-4 py-3 ${mounted ? "anim-scaleIn" : ""}`}
          style={{
            background: "rgba(255,179,0,.08)",
            border: "0.5px solid rgba(255,179,0,.25)",
          }}
        >
          <AlertCircle size={16} style={{ color: "var(--amber)", flexShrink: 0 }} />
          <p style={{ color: "var(--amber)", fontSize: 12 }}>
            Preenchimento manual ativo. Os cálculos usam estimativas até você ajustar os campos.
            {" "}
            <button
              style={{
                background: "none",
                border: "none",
                color: "var(--amber)",
                cursor: "pointer",
                fontSize: 12,
                textDecoration: "underline",
              }}
              type="button"
              onClick={() => onChange({ ...data, isManualEntry: false, searchQuery: "" })}
            >
              Voltar para a busca
            </button>
          </p>
        </div>
      ) : null}

      {(data.brand || data.isManualEntry) && !showDropdown ? (
        <div>
          {!data.isManualEntry && data.vehicleValue && depreciationPerMonth ? (
            <div className={`mb-6 grid gap-3 md:grid-cols-2 ${mounted ? "anim-scaleIn" : ""}`}>
              <div className="rounded-xl p-4" style={{ background: "var(--s2)", border: "0.5px solid var(--s3)" }}>
                <p className="field-label" style={{ marginBottom: 4 }}>
                  Valor de referência
                </p>
                <p style={{ fontFamily: "var(--font-title), sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: -1 }}>
                  R${Number(data.vehicleValue).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ background: "var(--s2)", border: "0.5px solid var(--s3)" }}>
                <div className="mb-1 flex items-center gap-2">
                  <p className="field-label" style={{ marginBottom: 0 }}>
                    Depreciação estimada/mês
                  </p>
                  <HelpTooltip text="Usamos uma regra simples para explicar ao cliente: multiplicamos a estimativa de km por mês por R$ 0,30. Exemplo: 3.000 km/mês = R$ 900/mês." />
                </div>
                <p style={{ fontFamily: "var(--font-title), sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: -1 }}>
                  R${Number(depreciationPerMonth).toLocaleString("pt-BR")}
                </p>
                <p style={{ color: "var(--s5)", fontSize: 10, marginTop: 2 }}>
                  Calculada com base em R$ 0,30 por km rodado.
                </p>
              </div>
            </div>
          ) : null}

          {!data.isManualEntry && data.vehicleValue && !depreciationPerMonth ? (
            <div className={`mb-6 grid gap-3 md:grid-cols-2 ${mounted ? "anim-scaleIn" : ""}`}>
              <div className="rounded-xl p-4" style={{ background: "var(--s2)", border: "0.5px solid var(--s3)" }}>
                <p className="field-label" style={{ marginBottom: 4 }}>
                  Valor de referência
                </p>
                <p style={{ fontFamily: "var(--font-title), sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: -1 }}>
                  R${Number(data.vehicleValue).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ background: "var(--s2)", border: "0.5px solid var(--s3)" }}>
                <div className="mb-1 flex items-center gap-2">
                  <p className="field-label" style={{ marginBottom: 0 }}>
                    Depreciação estimada/mês
                  </p>
                  <HelpTooltip text="Primeiro precisamos saber quantos km você roda por mês. Depois multiplicamos esse número por R$ 0,30 para estimar a depreciação mensal." />
                </div>
                <p style={{ fontFamily: "var(--font-title), sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: -0.4 }}>
                  Informe seus km por mês
                </p>
                <p style={{ color: "var(--s5)", fontSize: 10, marginTop: 4 }}>
                  Depois calculamos automaticamente usando R$ 0,30/km.
                </p>
              </div>
            </div>
          ) : null}

          <div className={`mb-4 grid gap-4 md:grid-cols-2 ${mounted ? "anim-fadeUp d-50" : ""}`}>
            <div>
              <label className="field-label">Marca</label>
              <input
                className="field-input"
                placeholder="Toyota"
                readOnly={!data.isManualEntry}
                style={!data.isManualEntry ? { color: "var(--s5)" } : undefined}
                value={data.brand}
                onChange={(event) => setField("brand", event.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Modelo</label>
              <input
                className="field-input"
                placeholder="Corolla"
                readOnly={!data.isManualEntry}
                style={!data.isManualEntry ? { color: "var(--s5)" } : undefined}
                value={data.model}
                onChange={(event) => setField("model", event.target.value)}
              />
            </div>
          </div>

          <div className={`mb-4 grid gap-4 md:grid-cols-2 ${mounted ? "anim-fadeUp d-100" : ""}`}>
            <div>
              <label className="field-label">Versão</label>
              <input
                className="field-input"
                placeholder="2.0 Flex"
                readOnly={!data.isManualEntry}
                style={!data.isManualEntry ? { color: "var(--s5)" } : undefined}
                value={data.version}
                onChange={(event) => setField("version", event.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Ano</label>
              <input
                className="field-input"
                placeholder="2024"
                readOnly={!data.isManualEntry}
                style={!data.isManualEntry ? { color: "var(--s5)" } : undefined}
                value={data.year}
                onChange={(event) => setField("year", event.target.value)}
              />
            </div>
          </div>

          <div className={`mb-4 grid gap-4 md:grid-cols-2 ${mounted ? "anim-fadeUp d-150" : ""}`}>
            <div>
              <label className="field-label">Tipo de veículo</label>
              <select
                className="field-select"
                disabled={!data.isManualEntry}
                value={data.vehicleType}
                onChange={(event) => setField("vehicleType", event.target.value)}
              >
                <option value="">Selecionar</option>
                {VEHICLE_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Combustível</label>
              <select
                className="field-select"
                disabled={!data.isManualEntry}
                value={data.fuel}
                onChange={(event) => setField("fuel", event.target.value)}
              >
                <option value="">Selecionar</option>
                {FUEL_TYPES.map((fuel) => (
                  <option key={fuel}>{fuel}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={`mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] ${mounted ? "anim-fadeUp d-200" : ""}`}>
            <div>
              <label className="field-label">
                {isElectric ? "Consumo médio (km/kWh)" : "Consumo médio (km/L)"}
              </label>
              <input
                className="field-input"
                placeholder={isElectric ? "6.0" : "12.5"}
                step="0.1"
                type="number"
                value={data.avgConsumption}
                onChange={(event) => setField("avgConsumption", event.target.value)}
              />
            </div>
            <div>
              <label className="field-label">
                {isElectric ? "Preço médio (R$/kWh)" : "Preço médio combustível (R$/L)"}
              </label>
              <input
                className="field-input"
                placeholder={isElectric ? "0.95" : "6.19"}
                step="0.01"
                type="number"
                value={data.fuelPrice}
                onChange={(event) => setField("fuelPrice", event.target.value)}
              />
            </div>
          </div>

          <div className={`mb-4 grid gap-4 md:grid-cols-2 ${mounted ? "anim-fadeUp d-225" : ""}`}>
            <div>
              <label className="field-label">Situação do veículo</label>
              <select
                className="field-select"
                value={data.ownershipStatus}
                onChange={(event) => {
                  const ownershipStatus = event.target.value as VehicleData["ownershipStatus"];
                  onChange({
                    ...data,
                    monthlyOwnershipCost: ownershipStatus === "Quitado" ? "" : data.monthlyOwnershipCost,
                    ownershipStatus,
                  });
                }}
              >
                <option value="">Selecionar</option>
                {OWNERSHIP_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">
                {data.ownershipStatus === "Alugado" ? "Valor do aluguel/mês" : "Valor da parcela/mês"}
              </label>
              <input
                className="field-input"
                disabled={!data.ownershipStatus || data.ownershipStatus === "Quitado"}
                placeholder={
                  data.ownershipStatus === "Alugado"
                    ? "2500"
                    : data.ownershipStatus === "Em financiamento"
                      ? "1800"
                      : "Não se aplica"
                }
                step="100"
                type="number"
                value={data.ownershipStatus === "Quitado" ? "" : data.monthlyOwnershipCost}
                onChange={(event) => setField("monthlyOwnershipCost", event.target.value)}
              />
            </div>
          </div>

          <div className={`mb-6 grid gap-4 md:grid-cols-2 ${mounted ? "anim-fadeUp d-250" : ""}`}>
            <div>
              <label className="field-label">Valor de referência do veículo</label>
              <input
                className="field-input"
                placeholder="100000"
                readOnly={!data.isManualEntry}
                style={!data.isManualEntry ? { color: "var(--s5)" } : undefined}
                type="number"
                value={data.vehicleValue}
                onChange={(event) => setField("vehicleValue", event.target.value)}
              />
            </div>
            <div>
              <div className="mb-[7px] flex items-center gap-2">
                <label className="field-label" style={{ marginBottom: 0 }}>
                  Km estimado por mês
                </label>
                <HelpTooltip text="Esse número serve para calcular a depreciação com a regra de R$ 0,30 por km. Exemplo: se você roda 3.500 km/mês, a estimativa fica em R$ 1.050/mês." />
              </div>
              <input
                className="field-input"
                placeholder="3500"
                step="100"
                type="number"
                value={data.monthlyKmEstimate}
                onChange={(event) => setField("monthlyKmEstimate", event.target.value)}
              />
            </div>
          </div>

          {isElectric ? (
            <div
              className="flex items-center gap-2 mb-6 rounded-xl px-4 py-3"
              style={{
                background: "rgba(66,165,245,.08)",
                border: "0.5px solid rgba(66,165,245,.2)",
              }}
            >
              <Zap size={14} style={{ color: "var(--blue)", flexShrink: 0 }} />
              <p style={{ color: "var(--blue)", fontSize: 12 }}>
                Para carros elétricos, use a eficiência em km por kWh para manter o painel coerente com o restante do site.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex gap-3 mt-2">
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
