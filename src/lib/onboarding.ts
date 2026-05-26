import {
  createInitialDashboardState,
  type DashboardStatePayload,
} from "@/lib/dashboard-state";
import type {
  GoalData,
  OnboardingData,
  Step,
  VehicleData,
  VehicleSuggestion,
} from "@/types/onboarding";

const ONBOARDING_VEHICLE_DB: VehicleSuggestion[] = [
  { brand: "Toyota", model: "Corolla", version: "2.0 Flex", year: "2025", fuel: "Flex", avgConsumption: "11.8", vehicleValue: "158000", annualDepreciation: "11.6" },
  { brand: "Toyota", model: "Corolla", version: "2.0 Flex", year: "2024", fuel: "Flex", avgConsumption: "11.8", vehicleValue: "149000", annualDepreciation: "11.6" },
  { brand: "Toyota", model: "Corolla", version: "2.0 Flex", year: "2023", fuel: "Flex", avgConsumption: "11.8", vehicleValue: "138000", annualDepreciation: "11.6" },
  { brand: "Toyota", model: "Yaris", version: "1.5 XL", year: "2024", fuel: "Flex", avgConsumption: "13.2", vehicleValue: "98000", annualDepreciation: "14.0" },
  { brand: "Volkswagen", model: "Polo", version: "1.0 TSI", year: "2024", fuel: "Flex", avgConsumption: "14.2", vehicleValue: "95000", annualDepreciation: "13.0" },
  { brand: "Volkswagen", model: "Virtus", version: "1.0 TSI", year: "2024", fuel: "Flex", avgConsumption: "13.6", vehicleValue: "102000", annualDepreciation: "13.2" },
  { brand: "Chevrolet", model: "Onix", version: "1.0 Turbo LT", year: "2024", fuel: "Flex", avgConsumption: "13.4", vehicleValue: "88000", annualDepreciation: "14.0" },
  { brand: "Chevrolet", model: "Onix Plus", version: "1.0 Turbo LTZ", year: "2024", fuel: "Flex", avgConsumption: "13.0", vehicleValue: "96000", annualDepreciation: "13.8" },
  { brand: "Hyundai", model: "HB20", version: "1.0 Diamond", year: "2024", fuel: "Flex", avgConsumption: "13.5", vehicleValue: "82000", annualDepreciation: "14.2" },
  { brand: "Fiat", model: "Argo", version: "1.3 Drive", year: "2024", fuel: "Flex", avgConsumption: "13.8", vehicleValue: "80000", annualDepreciation: "14.5" },
  { brand: "Honda", model: "City", version: "1.5 EXL CVT", year: "2024", fuel: "Flex", avgConsumption: "12.6", vehicleValue: "118000", annualDepreciation: "12.0" },
  { brand: "Renault", model: "Kwid", version: "1.0 Intense", year: "2024", fuel: "Flex", avgConsumption: "14.8", vehicleValue: "68000", annualDepreciation: "16.0" },
  { brand: "BYD", model: "Dolphin", version: "Plus", year: "2024", fuel: "Elétrico", avgConsumption: "6.0", vehicleValue: "178000", annualDepreciation: "18.0" },
  { brand: "BYD", model: "Dolphin", version: "Standard", year: "2024", fuel: "Elétrico", avgConsumption: "6.2", vehicleValue: "158000", annualDepreciation: "18.0" },
  { brand: "BYD", model: "King", version: "GL", year: "2024", fuel: "Gasolina", avgConsumption: "16.8", vehicleValue: "175800", annualDepreciation: "17.4" },
  { brand: "BYD", model: "King", version: "GS", year: "2024", fuel: "Gasolina", avgConsumption: "16.5", vehicleValue: "187800", annualDepreciation: "17.4" },
  { brand: "Caoa Chery", model: "iCar 03", version: "Elétrico", year: "2024", fuel: "Elétrico", avgConsumption: "6.1", vehicleValue: "145000", annualDepreciation: "18.0" },
];

export const ONBOARDING_STEPS: Step[] = [
  { id: "personal", number: 1, title: "Conta", subtitle: "Seus dados de acesso" },
  { id: "vehicle", number: 2, title: "Veículo", subtitle: "Seu carro de trabalho" },
  { id: "goals", number: 3, title: "Metas", subtitle: "Quanto quer ganhar" },
  { id: "plan", number: 4, title: "Plano", subtitle: "Escolha sua assinatura" },
  { id: "confirm", number: 5, title: "Confirmação", subtitle: "Revisar e criar conta" },
];

export function searchVehicles(query: string): VehicleSuggestion[] {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const normalized = query.trim().toLowerCase();

  return ONBOARDING_VEHICLE_DB.filter((vehicle) =>
    `${vehicle.brand} ${vehicle.model} ${vehicle.version} ${vehicle.year} ${vehicle.fuel}`
      .toLowerCase()
      .includes(normalized),
  ).slice(0, 8);
}

export function passwordStrength(password: string): {
  color: string;
  label: "Boa" | "Forte" | "Fraca" | "Média";
  score: number;
} {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (password.length >= 12) score += 1;

  if (score <= 1) {
    return { color: "#EF5350", label: "Fraca", score };
  }

  if (score <= 2) {
    return { color: "#FFB300", label: "Média", score };
  }

  if (score <= 3) {
    return { color: "#42a5f5", label: "Boa", score };
  }

  return { color: "#4CAF50", label: "Forte", score };
}

export function maskPhone(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

export function computeGoalsTotal(goals: GoalData) {
  return (
    (goals.enableUber ? Number(goals.uberGoal) || 0 : 0) +
    (goals.enable99 ? Number(goals.n99Goal) || 0 : 0) +
    (goals.enableIndrive ? Number(goals.indriveGoal) || 0 : 0)
  );
}

function mapVehicleProfile(vehicle: VehicleData) {
  const state = createInitialDashboardState();
  const currentVehicle = state.settings.vehicle;
  const efficiencyUnit =
    vehicle.fuel === "Elétrico" || vehicle.vehicleType === "Elétrico" ? "km/kWh" : "km/L";

  return {
    ...currentVehicle,
    annualDepreciationPct: Number(vehicle.annualDepreciation) || currentVehicle.annualDepreciationPct,
    brand: vehicle.brand || currentVehicle.brand,
    efficiency: Number(vehicle.avgConsumption) || currentVehicle.efficiency,
    efficiencyUnit,
    energyCost: Number(vehicle.fuelPrice) || currentVehicle.energyCost,
    estimatedValue: Number(vehicle.vehicleValue) || currentVehicle.estimatedValue,
    fuelKind:
      vehicle.fuel === "Diesel"
        ? "diesel"
        : vehicle.fuel === "Etanol"
          ? "etanol"
          : vehicle.fuel === "Gasolina"
            ? "gasolina"
            : vehicle.fuel === "Elétrico"
              ? "eletrico"
              : "flex",
    model: vehicle.model || currentVehicle.model,
    monthlyOwnershipCost: Number(vehicle.monthlyOwnershipCost) || 0,
    ownershipStatus:
      vehicle.ownershipStatus === "Alugado"
        ? "alugado"
        : vehicle.ownershipStatus === "Em financiamento"
          ? "financiado"
          : "quitado",
    powertrain:
      vehicle.vehicleType === "Elétrico"
        ? "eletrico"
        : vehicle.vehicleType === "Híbrido"
          ? "hibrido"
          : "combustao",
    selectedVehicleId:
      `${vehicle.brand}-${vehicle.model}-${vehicle.year}`.toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
      currentVehicle.selectedVehicleId,
    version: vehicle.version || currentVehicle.version,
    year: Number(vehicle.year) || currentVehicle.year,
  } as DashboardStatePayload["settings"]["vehicle"];
}

export function buildDashboardStateFromOnboarding(data: OnboardingData): DashboardStatePayload {
  const state = createInitialDashboardState();

  state.activePlatforms = {
    "99": data.goals.enable99,
    indrive: data.goals.enableIndrive,
    uber: data.goals.enableUber,
  };

  state.settings.platformGoals = {
    "99": data.goals.enable99 ? Number(data.goals.n99Goal) || 0 : 0,
    indrive: data.goals.enableIndrive ? Number(data.goals.indriveGoal) || 0 : 0,
    uber: data.goals.enableUber ? Number(data.goals.uberGoal) || 0 : 0,
  };

  if (data.vehicle.brand && data.vehicle.model) {
    state.settings.vehicle = mapVehicleProfile(data.vehicle);
  }

  return state;
}
