"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";

import FieldStatusIcon from "@/components/onboarding/FieldStatusIcon";
import { maskPhone, passwordStrength } from "@/lib/onboarding";
import type { PersonalData } from "@/types/onboarding";

interface Props {
  data: PersonalData;
  onChange: (data: PersonalData) => void;
  onNext: () => void;
}

export default function StepPersonal({ data, onChange, onNext }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof PersonalData, boolean>>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const setField = (key: keyof PersonalData, value: string) => {
    onChange({ ...data, [key]: value });
    if (value.length > 0) {
      setTouched((current) => ({ ...current, [key]: true }));
    }
  };

  const touch = (key: keyof PersonalData) => {
    setTouched((current) => ({ ...current, [key]: true }));
  };

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
  const phoneOk = data.phone.replace(/\D/g, "").length >= 10;
  const passwordInfo = passwordStrength(data.password);
  const passwordOk = passwordInfo.score >= 2;
  const confirmOk =
    data.password === data.confirmPassword && data.confirmPassword.length > 0;
  const firstNameOk = data.firstName.trim().length >= 2;
  const lastNameOk = data.lastName.trim().length >= 2;
  const canNext =
    emailOk && phoneOk && passwordOk && confirmOk && firstNameOk && lastNameOk;

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className={mounted ? "anim-fadeUp d-50" : ""}>
          <label className="field-label">Nome</label>
          <div className="relative">
            <input
              className={`field-input pr-10 ${touched.firstName && !firstNameOk ? "error" : touched.firstName && firstNameOk ? "success" : ""}`}
              placeholder="Marcelo"
              value={data.firstName}
              onBlur={() => touch("firstName")}
              onChange={(event) => setField("firstName", event.target.value)}
            />
            {touched.firstName && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <FieldStatusIcon valid={firstNameOk} />
              </span>
            )}
          </div>
          {touched.firstName && !firstNameOk ? (
            <p className="field-error">Mínimo de 2 caracteres.</p>
          ) : null}
        </div>

        <div className={mounted ? "anim-fadeUp d-100" : ""}>
          <label className="field-label">Sobrenome</label>
          <div className="relative">
            <input
              className={`field-input pr-10 ${touched.lastName && !lastNameOk ? "error" : touched.lastName && lastNameOk ? "success" : ""}`}
              placeholder="Santos"
              value={data.lastName}
              onBlur={() => touch("lastName")}
              onChange={(event) => setField("lastName", event.target.value)}
            />
            {touched.lastName && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <FieldStatusIcon valid={lastNameOk} />
              </span>
            )}
          </div>
          {touched.lastName && !lastNameOk ? (
            <p className="field-error">Mínimo de 2 caracteres.</p>
          ) : null}
        </div>
      </div>

      <div className={`mb-5 ${mounted ? "anim-fadeUp d-150" : ""}`}>
        <label className="field-label">E-mail</label>
        <div className="relative">
          <input
            className={`field-input pr-10 ${touched.email && !emailOk ? "error" : touched.email && emailOk ? "success" : ""}`}
            placeholder="marcelo@gmail.com"
            type="email"
            value={data.email}
            onBlur={() => touch("email")}
            onChange={(event) => setField("email", event.target.value)}
          />
          {touched.email && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <FieldStatusIcon valid={emailOk} />
            </span>
          )}
        </div>
        {touched.email && !emailOk ? (
          <p className="field-error">Digite um e-mail válido.</p>
        ) : null}
      </div>

      <div className={`mb-5 ${mounted ? "anim-fadeUp d-200" : ""}`}>
        <label className="field-label">Número</label>
        <div className="relative">
          <input
            className={`field-input pr-10 ${touched.phone && !phoneOk ? "error" : touched.phone && phoneOk ? "success" : ""}`}
            maxLength={15}
            placeholder="(11) 99999-0000"
            value={data.phone}
            onBlur={() => touch("phone")}
            onChange={(event) => setField("phone", maskPhone(event.target.value))}
          />
          {touched.phone && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <FieldStatusIcon valid={phoneOk} />
            </span>
          )}
        </div>
        {touched.phone && !phoneOk ? (
          <p className="field-error">Informe um número válido.</p>
        ) : null}
      </div>

      <div className={`mb-2 ${mounted ? "anim-fadeUp d-250" : ""}`}>
        <label className="field-label">Senha</label>
        <div className="relative">
          <input
            className={`field-input pr-20 ${touched.password && !passwordOk ? "error" : touched.password && passwordOk ? "success" : ""}`}
            placeholder="Mínimo de 8 caracteres"
            type={showPassword ? "text" : "password"}
            value={data.password}
            onBlur={() => touch("password")}
            onChange={(event) => setField("password", event.target.value)}
          />
          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
            {touched.password ? <FieldStatusIcon valid={passwordOk} /> : null}
            <button
              className="text-gray-500 transition-colors hover:text-white"
              type="button"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {data.password.length > 0 ? (
          <div>
            <div className="strength-wrap">
              {[1, 2, 3, 4, 5].map((bar) => (
                <div
                  key={bar}
                  className="strength-bar"
                  style={{
                    background: bar <= passwordInfo.score ? passwordInfo.color : undefined,
                  }}
                />
              ))}
            </div>
            <p className="field-hint" style={{ color: passwordInfo.color, marginTop: 6 }}>
              {passwordInfo.label}
            </p>
          </div>
        ) : null}
      </div>

      <div className={`mb-8 ${mounted ? "anim-fadeUp d-300" : ""}`}>
        <label className="field-label">Código de indicação (opcional)</label>
        <input
          className="field-input"
          placeholder="Ex: URBANN123"
          value={data.referralCode}
          onChange={(event) => setField("referralCode", event.target.value.toUpperCase())}
        />
      </div>

      <div className={`mb-8 ${mounted ? "anim-fadeUp d-300" : ""}`}>
        <label className="field-label">Confirmar senha</label>
        <div className="relative">
          <input
            className={`field-input pr-20 ${touched.confirmPassword && !confirmOk ? "error" : touched.confirmPassword && confirmOk ? "success" : ""}`}
            placeholder="Repita a senha"
            type={showConfirmPassword ? "text" : "password"}
            value={data.confirmPassword}
            onBlur={() => touch("confirmPassword")}
            onChange={(event) => setField("confirmPassword", event.target.value)}
          />
          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
            {touched.confirmPassword ? <FieldStatusIcon valid={confirmOk} /> : null}
            <button
              className="text-gray-500 transition-colors hover:text-white"
              type="button"
              onClick={() => setShowConfirmPassword((current) => !current)}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        {touched.confirmPassword && !confirmOk ? (
          <p className="field-error">As senhas precisam ser iguais.</p>
        ) : null}
      </div>

      <button className="btn-primary w-full justify-center" disabled={!canNext} onClick={onNext}>
        Continuar
        <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
          <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      </button>
    </div>
  );
}
