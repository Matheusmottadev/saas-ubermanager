export type Plan = "basic" | "pro";

export interface PersonalData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  referralCode: string;
  password: string;
  confirmPassword: string;
}

export interface VehicleData {
  searchQuery: string;
  brand: string;
  model: string;
  version: string;
  year: string;
  vehicleType: "Combustão" | "Elétrico" | "Híbrido" | "";
  fuel: "Flex" | "Gasolina" | "Etanol" | "Diesel" | "Elétrico" | "";
  avgConsumption: string;
  fuelPrice: string;
  vehicleValue: string;
  monthlyKmEstimate: string;
  monthlyOwnershipCost: string;
  ownershipStatus: "Alugado" | "Em financiamento" | "Quitado" | "";
  annualDepreciation: string;
  isManualEntry: boolean;
}

export interface GoalData {
  uberGoal: string;
  n99Goal: string;
  indriveGoal: string;
  totalGoal: string;
  kmGoal: string;
  hoursGoal: string;
  enableUber: boolean;
  enable99: boolean;
  enableIndrive: boolean;
}

export interface PlanData {
  selectedPlan: Plan;
}

export interface OnboardingPaymentData {
  cardLastFour?: string;
  formData: {
    payer?: {
      email?: string;
    };
    payment_method_id?: string;
    token?: string;
  };
}

export interface OnboardingData {
  personal: PersonalData;
  vehicle: VehicleData;
  goals: GoalData;
  plan: PlanData;
}

export type StepId = "personal" | "vehicle" | "goals" | "plan" | "confirm";

export interface Step {
  id: StepId;
  number: number;
  title: string;
  subtitle: string;
}

export interface VehicleSuggestion {
  annualDepreciation: string;
  avgConsumption: string;
  brand: string;
  fuel: string;
  model: string;
  vehicleValue: string;
  version: string;
  year: string;
}
