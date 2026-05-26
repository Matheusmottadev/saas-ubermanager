import {
  popularBrazilVehicles,
  type CostItem,
  type PlatformKey,
  type Ride,
  type VehicleDatabaseEntry,
  type VehicleFuelKind,
  type VehiclePowertrain,
} from "@/app/Financeiro/painel/data";

export type VehicleProfile = {
  annualDepreciationPct: number;
  brand: string;
  efficiency: number;
  efficiencyUnit: "km/L" | "km/kWh";
  energyCost: number;
  estimatedValue: number;
  fuelKind: VehicleFuelKind;
  model: string;
  monthlyOwnershipCost: number;
  ownershipStatus: "alugado" | "financiado" | "quitado";
  powertrain: VehiclePowertrain;
  segment: string;
  selectedVehicleId: string;
  transmission: string;
  version: string;
  year: number;
};

export type SettingsState = {
  accent: "green" | "red" | "white";
  autoFuel: boolean;
  goalAlerts: boolean;
  multiSession: boolean;
  notifications: boolean;
  platformGoals: Record<PlatformKey, number>;
  twoFactor: boolean;
  vehicle: VehicleProfile;
};

export type ScheduledMaintenanceItem = {
  dueDate: string;
  dueKm: string;
  id: string;
  label: string;
  subtitle: string;
};

export type DashboardStatePayload = {
  activePlatforms: Record<PlatformKey, boolean>;
  costs: CostItem[];
  rides: Ride[];
  scheduledMaintenance: ScheduledMaintenanceItem[];
  settings: SettingsState;
};

export const defaultPlatforms: Record<PlatformKey, boolean> = {
  "99": true,
  indrive: true,
  uber: true,
};

const defaultVehicleEntry =
  popularBrazilVehicles.find((vehicle) => vehicle.id === "toyota-corolla-2025") ?? popularBrazilVehicles[0];

export function createVehicleProfile(entry: VehicleDatabaseEntry): VehicleProfile {
  return {
    annualDepreciationPct: entry.annualDepreciationPct,
    brand: entry.brand,
    efficiency: entry.defaultEfficiency,
    efficiencyUnit: entry.efficiencyUnit,
    energyCost: entry.defaultEnergyCost,
    estimatedValue: entry.estimatedValue,
    fuelKind: entry.fuelKind,
    model: entry.model,
    monthlyOwnershipCost: 0,
    ownershipStatus: "quitado",
    powertrain: entry.powertrain,
    segment: entry.segment,
    selectedVehicleId: entry.id,
    transmission: entry.transmission,
    version: entry.version,
    year: entry.year,
  };
}

export const defaultSettings: SettingsState = {
  accent: "white",
  autoFuel: true,
  goalAlerts: true,
  multiSession: true,
  notifications: true,
  platformGoals: {
    "99": 1500,
    indrive: 500,
    uber: 3000,
  },
  twoFactor: false,
  vehicle: createVehicleProfile(defaultVehicleEntry),
};

export function createInitialDashboardState(): DashboardStatePayload {
  return {
    activePlatforms: { ...defaultPlatforms },
    costs: [],
    rides: [],
    scheduledMaintenance: [],
    settings: JSON.parse(JSON.stringify(defaultSettings)) as SettingsState,
  };
}

export function normalizeDashboardState(input: unknown): DashboardStatePayload {
  const fallback = createInitialDashboardState();
  if (!input || typeof input !== "object") {
    return fallback;
  }

  const candidate = input as Partial<DashboardStatePayload>;

  return {
    activePlatforms: {
      ...fallback.activePlatforms,
      ...(candidate.activePlatforms ?? {}),
    },
    costs: Array.isArray(candidate.costs) ? candidate.costs : fallback.costs,
    rides: Array.isArray(candidate.rides) ? candidate.rides : fallback.rides,
    scheduledMaintenance: Array.isArray(candidate.scheduledMaintenance)
      ? candidate.scheduledMaintenance
      : fallback.scheduledMaintenance,
    settings: {
      ...fallback.settings,
      ...(candidate.settings ?? {}),
      platformGoals: {
        ...fallback.settings.platformGoals,
        ...(candidate.settings?.platformGoals ?? {}),
      },
      vehicle: {
        ...fallback.settings.vehicle,
        ...(candidate.settings?.vehicle ?? {}),
      },
    },
  };
}
