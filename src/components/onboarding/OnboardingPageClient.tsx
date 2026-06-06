"use client";

import { ArrowRight, CarFront, CircleDollarSign, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import StepConfirm from "@/components/onboarding/StepConfirm";
import StepGoals from "@/components/onboarding/StepGoals";
import StepPersonal from "@/components/onboarding/StepPersonal";
import StepPlan from "@/components/onboarding/StepPlan";
import StepVehicle from "@/components/onboarding/StepVehicle";
import { ONBOARDING_STEPS, computeGoalsTotal } from "@/lib/onboarding";
import { getPricingSummary } from "@/lib/pricing";
import type { OnboardingData, OnboardingPaymentData } from "@/types/onboarding";

const INITIAL_DATA: OnboardingData = {
  goals: {
    enable99: true,
    enableIndrive: true,
    enableUber: true,
    hoursGoal: "",
    indriveGoal: "700",
    kmGoal: "",
    n99Goal: "1450",
    totalGoal: "5000",
    uberGoal: "2850",
  },
  personal: {
    confirmPassword: "",
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    phone: "",
    referralCode: "",
  },
  plan: {
    selectedPlan: "basic",
  },
  vehicle: {
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
  },
};

export default function OnboardingPageClient() {
  const router = useRouter();
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<"back" | "forward">("forward");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [mounted, setMounted] = useState(false);
  const [paymentData, setPaymentData] = useState<OnboardingPaymentData | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentStep = ONBOARDING_STEPS[stepIndex];
  const progress = ((stepIndex + 1) / ONBOARDING_STEPS.length) * 100;
  const animationClass = direction === "forward" ? "anim-slideL" : "anim-slideR";
  const totalGoal = computeGoalsTotal(data.goals);
  const pricingSummary = getPricingSummary(data.plan.selectedPlan);
  const activePlatforms = [
    data.goals.enableUber ? "Uber" : null,
    data.goals.enable99 ? "99" : null,
    data.goals.enableIndrive ? "inDrive" : null,
  ].filter(Boolean) as string[];

  const goNext = () => {
    if (stepIndex < ONBOARDING_STEPS.length - 1) {
      setDirection("forward");
      setStepIndex((current) => current + 1);
      window.scrollTo({ behavior: "smooth", top: 0 });
    }
  };

  const goBack = () => {
    if (stepIndex > 0) {
      setDirection("back");
      setStepIndex((current) => current - 1);
      window.scrollTo({ behavior: "smooth", top: 0 });
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMessage("");

    const payload = {
      ...data,
      goals: {
        ...data.goals,
        totalGoal: String(computeGoalsTotal(data.goals)),
      },
      payment: paymentData,
    };

    try {
      const response = await fetch("/api/auth/register", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        const message = result.error ?? "Não foi possível criar a conta agora.";
        setErrorMessage(message);
        throw new Error(message);
      }

      router.push("/Financeiro/painel");
      router.refresh();
    } catch (error) {
      console.error("onboarding register failed", error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível criar a conta agora.";
      setErrorMessage(message);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen p-4 lg:px-8 lg:py-8 xl:px-10" style={{ background: "var(--black)" }}>
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-[1360px] gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className={`card flex flex-col overflow-hidden p-6 lg:sticky lg:top-8 lg:h-[calc(100vh-4rem)] lg:p-7 ${mounted ? "anim-scaleIn" : ""}`}>
          <div>
            <div
              style={{
                color: "var(--cream)",
                fontFamily: "var(--font-display), sans-serif",
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: -2,
              }}
            >
              urbann<span style={{ color: "rgba(245,244,240,.25)" }}>.</span>
            </div>
            <p className="mt-3 text-sm leading-6" style={{ color: "var(--s5)" }}>
              Configure sua conta e entre no financeiro com metas, veículo e plano já prontos para uso.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
            <div>
              <p className="field-label !mb-1">Progresso</p>
              <p className="text-sm font-semibold text-white">
                Passo {stepIndex + 1} de {ONBOARDING_STEPS.length}
              </p>
            </div>
            <div className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white/75">
              {Math.round(progress)}%
            </div>
          </div>

          <div className="mt-4">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2">
                <UserRound size={15} style={{ color: "var(--s6)" }} />
                <p className="field-label !mb-0">Conta</p>
              </div>
              <p className="mt-3 text-sm font-semibold text-white">
                {data.personal.firstName || data.personal.lastName
                  ? `${data.personal.firstName} ${data.personal.lastName}`.trim()
                  : "Dados pessoais"}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--s5)" }}>
                {data.personal.email || "Seu acesso ao painel"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2">
                <CarFront size={15} style={{ color: "var(--s6)" }} />
                <p className="field-label !mb-0">Veículo e metas</p>
              </div>
              <p className="mt-3 text-sm font-semibold text-white">
                {data.vehicle.brand && data.vehicle.model
                  ? `${data.vehicle.brand} ${data.vehicle.model}`
                  : "Veículo ainda não selecionado"}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--s5)" }}>
                {activePlatforms.length > 0
                  ? `${activePlatforms.join(" · ")} · ${totalGoal.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                      minimumFractionDigits: 0,
                    })}`
                  : "Escolha suas plataformas"}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} style={{ color: "#7dd97a" }} />
                <p className="field-label !mb-0" style={{ color: "#7dd97a" }}>
                  Plano ativo
                </p>
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {pricingSummary.activeLabel}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--s5)" }}>
                    {pricingSummary.promoLabel}
                  </p>
                </div>
                <ArrowRight size={16} style={{ color: "var(--s6)" }} />
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          <div className={`mb-6 ${mounted ? "anim-fadeIn d-50" : ""}`}>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className={`mb-8 flex items-center justify-between ${mounted ? "anim-fadeIn d-100" : ""}`}>
            {ONBOARDING_STEPS.map((step, index) => {
              const isDone = index < stepIndex;
              const isActive = index === stepIndex;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`step-dot ${isDone ? "done" : isActive ? "active" : ""}`}>
                      {isDone ? (
                        <svg fill="none" height="12" viewBox="0 0 24 24" width="12">
                          <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" />
                        </svg>
                      ) : (
                        step.number
                      )}
                    </div>
                    <span
                      style={{
                        color: isActive ? "var(--cream)" : isDone ? "var(--green)" : "var(--s5)",
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: ".5px",
                        textTransform: "uppercase",
                        transition: "color .3s",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < ONBOARDING_STEPS.length - 1 ? (
                    <div className="flex-1 mx-2" style={{ height: 1, marginBottom: 16 }}>
                      <div
                        style={{
                          background: index < stepIndex ? "var(--green)" : "var(--s3)",
                          height: 1,
                          transition: "background .4s",
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className={`mb-4 flex items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 lg:hidden ${mounted ? "anim-fadeIn d-50" : ""}`}>
            <CircleDollarSign size={16} style={{ color: "var(--green)" }} />
            <p className="text-sm" style={{ color: "var(--s6)" }}>
              {currentStep.subtitle}
            </p>
          </div>

          <div className={`card flex-1 p-6 sm:p-7 lg:p-8 xl:p-10 ${mounted ? "anim-scaleIn d-50" : ""}`}>
            <div className={`mb-8 ${mounted ? animationClass : ""}`} key={`header-${stepIndex}`}>
              <div className="flex flex-col gap-3 border-b border-white/5 pb-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h1
                    style={{
                      fontFamily: "var(--font-title), sans-serif",
                      fontSize: 22,
                      fontWeight: 800,
                      letterSpacing: -1,
                      marginBottom: 4,
                    }}
                  >
                    {currentStep.title}
                  </h1>
                  <p style={{ color: "var(--s5)", fontSize: 13 }}>
                    {currentStep.subtitle}
                    <span style={{ color: "var(--s4)", marginLeft: 6 }}>
                      · Passo {stepIndex + 1} de {ONBOARDING_STEPS.length}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div key={`step-${stepIndex}`} className={mounted ? animationClass : ""}>
              {currentStep.id === "personal" ? (
                <StepPersonal
                  data={data.personal}
                  onChange={(personal) => setData((current) => ({ ...current, personal }))}
                  onNext={goNext}
                />
              ) : null}
              {currentStep.id === "vehicle" ? (
                <StepVehicle
                  data={data.vehicle}
                  onBack={goBack}
                  onChange={(vehicle) => setData((current) => ({ ...current, vehicle }))}
                  onNext={goNext}
                />
              ) : null}
              {currentStep.id === "goals" ? (
                <StepGoals
                  data={data.goals}
                  onBack={goBack}
                  onChange={(goals) => setData((current) => ({ ...current, goals }))}
                  onNext={goNext}
                />
              ) : null}
              {currentStep.id === "plan" ? (
                <StepPlan
                  data={data.plan}
                  email={data.personal.email}
                  fullName={`${data.personal.firstName} ${data.personal.lastName}`.trim()}
                  payment={paymentData}
                  onBack={goBack}
                  onChange={(plan) => setData((current) => ({ ...current, plan }))}
                  onNext={goNext}
                  onPaymentChange={setPaymentData}
                />
              ) : null}
              {currentStep.id === "confirm" ? (
                <StepConfirm
                  data={data}
                  errorMessage={errorMessage}
                  onBack={goBack}
                  payment={paymentData}
                  onSubmit={handleSubmit}
                  submitting={submitting}
                />
              ) : null}
            </div>
          </div>

          <p className={`mt-4 text-center ${mounted ? "anim-fadeIn d-300" : ""}`} style={{ color: "var(--s5)", fontSize: 11 }}>
            Já tem conta? <a href="/Financeiro" style={{ color: "var(--cream)", textDecoration: "underline" }}>Entrar</a>
          </p>
        </section>
      </div>
    </main>
  );
}
