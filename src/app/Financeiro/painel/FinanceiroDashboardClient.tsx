"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Bell,
  Brain,
  Calendar,
  Car,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Droplets,
  Fuel,
  Gauge,
  LayoutDashboard,
  MapPinned,
  Menu,
  Minus,
  Plus,
  Pencil,
  Receipt,
  Settings,
  Shield,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { Fragment, useEffect, useState } from "react";

import {
  bestRegions,
  dashboardInsights,
  fontOptions,
  heatmapLabels,
  heatmapRows,
  monthlyReports,
  pageLabels,
  platformMeta,
  platformMetrics as basePlatformMetrics,
  platformOrder,
  popularBrazilVehicles,
  settingsSections,
  type CostItem,
  type FontOptionKey,
  type MaintenanceTask,
  type PageKey,
  type PlatformKey,
  type PlatformMetrics,
  type Ride,
  type VehicleDatabaseEntry,
  type VehicleFuelKind,
  type VehiclePowertrain,
  upcomingEvents,
} from "./data";
import RegisterModal, { type RegisterModalPayload } from "./RegisterModal";
import {
  createInitialDashboardState,
  createVehicleProfile,
  defaultPlatforms,
  defaultSettings,
  type DashboardStatePayload,
  type IdleTimeEntry,
  type RideQualityThreshold,
  type RideQualityThresholds,
  type ScheduledMaintenanceItem,
  type SettingsState,
  type VehicleProfile,
} from "@/lib/dashboard-state";

const SIDEBAR_STORAGE_KEY = "urbann-sidebar-collapsed";
const FONT_STORAGE_KEY = "urbann-dashboard-display-font";
const PLATFORM_STORAGE_KEY = "urbann-active-platforms";
const PROJECTION_MULTIPLIER = 1.375;

const fontFamilyMap: Record<FontOptionKey, string> = {
  bricolage: "var(--panel-font-bricolage)",
  sora: "var(--panel-font-sora)",
  space: "var(--panel-font-space)",
  syne: "var(--panel-font-syne)",
};

type SettingsSectionKey = (typeof settingsSections)[number]["key"];

type ExpenseDraft = {
  amount: string;
  category: "apps" | "food" | "fuel" | "insurance" | "maintenance" | "other";
  fixedMonths: string;
  isFixed: boolean;
  note: string;
};

type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

type AssistantAnalytics = {
  costs: CostItem[];
  monthGoal: number;
  rides: Ride[];
};

type MaintenanceDraft = {
  dueDate: string;
  dueKm: string;
  label: string;
};

type NotificationItem = {
  description: string;
  id: string;
  title: string;
  tone: "danger" | "neutral" | "success" | "warning";
};

const expenseCategoryMeta: Record<
  ExpenseDraft["category"],
  { color: string; icon: string; label: string }
> = {
  apps: {
    color: "#61d37c",
    icon: "phone",
    label: "Dados / app",
  },
  food: {
    color: "#ff9f68",
    icon: "receipt",
    label: "Alimentação",
  },
  fuel: {
    color: "#f5b74d",
    icon: "fuel",
    label: "Combustível",
  },
  insurance: {
    color: "#ef5350",
    icon: "shield",
    label: "Seguro",
  },
  maintenance: {
    color: "#54a6ff",
    icon: "tool",
    label: "Manutenção",
  },
  other: {
    color: "#787878",
    icon: "dots",
    label: "Outros",
  },
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatCurrency(value: number, digits = 0) {
  return (
    "R$" +
    value.toLocaleString("pt-BR", {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    })
  );
}

function formatPercent(value: number) {
  return (
    value.toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    }) + "%"
  );
}

function formatSignedCurrency(value: number, digits = 0) {
  const absValue = Math.abs(value);
  return `${value >= 0 ? "+" : "-"}${formatCurrency(absValue, digits)}`;
}

function formatCompactValue(value: number, digits = 0) {
  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function formatHours(minutes: number) {
  const safe = Math.max(0, Math.round(minutes));
  return `${Math.floor(safe / 60)}h${String(safe % 60).padStart(2, "0")}`;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getVehicleSearchLabel(vehicle: Pick<VehicleProfile, "brand" | "model" | "version" | "year">) {
  return `${vehicle.brand} ${vehicle.model} ${vehicle.version} ${vehicle.year}`.replace(/\s+/g, " ").trim();
}

function buildVehicleDepreciationCost(vehicle: VehicleProfile): CostItem | null {
  if (!vehicle.estimatedValue || !vehicle.annualDepreciationPct) {
    return null;
  }

  const monthlyAmount = (vehicle.estimatedValue * (vehicle.annualDepreciationPct / 100)) / 12;
  if (monthlyAmount <= 0) {
    return null;
  }

  return {
    amount: Number(monthlyAmount.toFixed(2)),
    color: "#8f8f8f",
    icon: "car",
    id: "cost-vehicle-depreciation",
    label: "Depreciação do veículo",
    percentage: 0,
    subtitle: `${vehicle.brand} ${vehicle.model} · ${vehicle.annualDepreciationPct.toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    })}% ao ano`,
  };
}

function buildVehicleOwnershipCost(vehicle: VehicleProfile): CostItem | null {
  if (vehicle.ownershipStatus === "quitado" || vehicle.monthlyOwnershipCost <= 0) {
    return null;
  }

  const isRental = vehicle.ownershipStatus === "alugado";

  return {
    amount: Number(vehicle.monthlyOwnershipCost.toFixed(2)),
    color: isRental ? "#7dd97a" : "#f5c46b",
    icon: "car",
    id: "cost-vehicle-ownership",
    label: isRental ? "Aluguel do veículo" : "Parcela do veículo",
    percentage: 0,
    subtitle: isRental
      ? `${vehicle.brand} ${vehicle.model} · aluguel mensal`
      : `${vehicle.brand} ${vehicle.model} · financiamento mensal`,
  };
}

function withCostPercentages(costs: CostItem[]) {
  const totalAmount = sumCost(costs);
  return costs.map((cost) => ({
    ...cost,
    percentage: totalAmount ? Math.round((cost.amount / totalAmount) * 100) : 0,
  }));
}

function isFixedCost(cost: CostItem) {
  return cost.id === "cost-vehicle-depreciation" || cost.id === "cost-vehicle-ownership";
}

function createEmptyExpenseDraft(): ExpenseDraft {
  return {
    amount: "",
    category: "fuel",
    fixedMonths: "1",
    isFixed: false,
    note: "",
  };
}

function createEmptyMaintenanceDraft(): MaintenanceDraft {
  return {
    dueDate: "",
    dueKm: "",
    label: "",
  };
}

function sumGoalSettings(goals: Record<PlatformKey, number>) {
  return platformOrder.reduce((total, platform) => total + (Number(goals[platform]) || 0), 0);
}

function getMaintenanceStatus(dueDate: string): MaintenanceTask["status"] {
  if (!dueDate) {
    return "Ok";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(`${dueDate}T00:00:00`);
  targetDate.setHours(0, 0, 0, 0);

  const diffInDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays < 0) {
    return "Urgente";
  }

  if (diffInDays <= 7) {
    return "Atenção";
  }

  return "Ok";
}

function getDueDateDiffInDays(dueDate: string) {
  if (!dueDate) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(`${dueDate}T00:00:00`);
  targetDate.setHours(0, 0, 0, 0);

  return Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getFuelKindLabel(fuelKind: VehicleFuelKind) {
  switch (fuelKind) {
    case "diesel":
      return "Diesel";
    case "eletrico":
      return "Elétrico";
    case "etanol":
      return "Etanol";
    case "gasolina":
      return "Gasolina";
    case "hibrido":
      return "Híbrido";
    case "flex":
    default:
      return "Flex";
  }
}

function getVehicleUiCopy(vehicle: VehicleProfile) {
  const isElectric = vehicle.powertrain === "eletrico";
  const isHybrid = vehicle.powertrain === "hibrido";

  return {
    consumptionEmptyMessage: isElectric
      ? "Nenhuma recarga registrada ainda. Essa lista será preenchida automaticamente quando você lançar custos de recarga no Financeiro."
      : isHybrid
        ? "Ainda não há lançamentos de abastecimento ou recarga híbrida. Essa lista será preenchida quando você registrar combustível, recarga ou custos energéticos no Financeiro."
      : "Nenhum abastecimento registrado ainda. Essa lista será preenchida automaticamente quando você lançar despesas de combustível no Financeiro.",
    consumptionHistoryTitle: isElectric ? "Recargas do mês" : isHybrid ? "Energia do mês" : "Abastecimentos do mês",
    consumptionLabel: isElectric ? "Recarga est." : isHybrid ? "Energia híbrida" : "Consumo est.",
    efficiencyDescription: isElectric
      ? "Esse bloco deve ser baseado em recargas reais, quilometragem e faixas de horário para calcular km/kWh e custo por recarga."
      : isHybrid
        ? "Esse bloco deve cruzar abastecimentos, recargas, quilometragem e faixa de horário para estimar eficiência híbrida e custo energético por km."
      : "Esse bloco deve ser baseado em lançamentos específicos de consumo, com informação suficiente para cruzar abastecimento, quilometragem e faixa de horário.",
    efficiencyEmptyTitle: isElectric
      ? "Ainda não há dados suficientes para calcular a eficiência de recarga por período."
      : isHybrid
        ? "Ainda não há dados suficientes para calcular a eficiência híbrida por período."
        : "Ainda não há dados suficientes para calcular a eficiência por período.",
    efficiencyFieldLabel: isElectric ? "Eficiência média (km/kWh)" : isHybrid ? "Eficiência média híbrida (km/L)" : "Consumo médio (km/L)",
    energyCostLabel: isElectric ? "Custo médio da recarga (R$/kWh)" : isHybrid ? "Custo médio energético base (R$)" : "Preço médio do combustível (R$/L)",
    energyExpenseLabel: isElectric ? "Recarga elétrica" : isHybrid ? "Combustível / recarga" : "Combustível",
    energyHint: isElectric ? "km/kWh" : "km/L",
    maintenanceEmptyMessage: isElectric
      ? "Esse bloco deve ser preenchido com revisões reais do carro elétrico, como pneus, freios, filtros de cabine e sistema de bateria."
      : isHybrid
        ? "Esse bloco deve ser preenchido com manutenções do sistema híbrido, freios, pneus, motor térmico, fluídos e inspeções de bateria."
      : "Esse bloco deve ser preenchido com lançamentos reais de manutenção e lembretes do veículo, como óleo, filtros, pneus e freios.",
    maintenanceHistoryEmptyMessage: isElectric
      ? "Ainda não há histórico de manutenção do elétrico registrado. Assim que você lançar revisões, pneus, freios ou itens da bateria, eles aparecerão aqui."
      : isHybrid
        ? "Ainda não há histórico de manutenção híbrida registrado. Assim que você lançar revisões, freios, pneus, motor ou bateria, eles aparecerão aqui."
      : "Ainda não há histórico de manutenção registrado. Assim que você lançar serviços reais do veículo, eles aparecerão aqui.",
    maintenanceScheduleHint: isElectric
      ? "Cadastre revisões, pneus, freios e inspeções do sistema elétrico."
      : isHybrid
        ? "Cadastre motor térmico, bateria híbrida, freios, pneus e demais inspeções."
        : "Cadastre trocas de óleo, filtros, pneus, freios e outras revisões.",
    metricIcon: isElectric || isHybrid ? <Zap className="h-3.5 w-3.5" /> : <Droplets className="h-3.5 w-3.5" />,
    vehicleSubtitle: `${getFuelKindLabel(vehicle.fuelKind)} · ${vehicle.transmission} · ${vehicle.segment}`,
  };
}

function getRideDate(ride: Ride) {
  if (!ride.createdAt) {
    return new Date();
  }

  const parsed = new Date(ride.createdAt);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function getEntryDate(value?: string) {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isSameCalendarMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function getRideDurationMinutes(ride: Ride) {
  const matched = ride.timeLabel.match(/· (\d+) min/);
  if (matched) {
    return Number(matched[1]) || 0;
  }

  return Math.max(Math.round(ride.distanceKm * 3), 0);
}

function getRideDurationBreakdown(ride: Ride) {
  const matched = ride.timeLabel.match(/· (\d+) min/);
  if (matched) {
    return {
      estimatedMinutes: 0,
      realMinutes: Number(matched[1]) || 0,
    };
  }

  return {
    estimatedMinutes: Math.max(Math.round(ride.distanceKm * 3), 0),
    realMinutes: 0,
  };
}

function formatShortWeekday(date: Date) {
  const label = date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  return label.charAt(0).toUpperCase() + label.slice(1, 3);
}

function getRideDateLabel(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  if (isSameCalendarDay(target, today)) {
    return "Hoje";
  }

  if (isSameCalendarDay(target, yesterday)) {
    return "Ontem";
  }

  return target.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function parseDurationToMinutes(value: string) {
  if (!value) {
    return 0;
  }

  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw) || 0;
  const minutes = Number(minutesRaw) || 0;
  return Math.max(hours * 60 + minutes, 0);
}

function createEmptyPlatformMetricsMap() {
  return platformOrder.reduce(
    (accumulator, platform) => ({
      ...accumulator,
      [platform]: { ...basePlatformMetrics[platform] },
    }),
    {} as Record<PlatformKey, PlatformMetrics>,
  );
}

function buildPlatformMetricsMap(params: {
  costs: CostItem[];
  rides: Ride[];
  vehicle: VehicleProfile;
}) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthReference = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const metrics = createEmptyPlatformMetricsMap();
  const monthGrossTotal = params.rides.reduce((total, ride) => {
    const rideDate = getRideDate(ride);
    return isSameCalendarMonth(rideDate, now) ? total + ride.earnings : total;
  }, 0);
  const totalCosts = sumCost(params.costs);

  for (const platform of platformOrder) {
    const rides = params.rides.filter((ride) => ride.platform === platform);
    const todayRides = rides.filter((ride) => isSameCalendarDay(getRideDate(ride), now));
    const yesterdayRides = rides.filter((ride) => isSameCalendarDay(getRideDate(ride), yesterday));
    const monthRides = rides.filter((ride) => isSameCalendarMonth(getRideDate(ride), now));
    const previousMonthRides = rides.filter((ride) => isSameCalendarMonth(getRideDate(ride), previousMonthReference));

    const dayRevenue = todayRides.reduce((total, ride) => total + ride.earnings, 0);
    const dayKm = todayRides.reduce((total, ride) => total + ride.distanceKm, 0);
    const monthGross = monthRides.reduce((total, ride) => total + ride.earnings, 0);
    const monthKm = monthRides.reduce((total, ride) => total + ride.distanceKm, 0);
    const previousMonthGross = previousMonthRides.reduce((total, ride) => total + ride.earnings, 0);
    const onlineMinutes = todayRides.reduce((total, ride) => total + getRideDurationMinutes(ride), 0);
    const allocatedMonthCost = monthGrossTotal > 0 ? totalCosts * (monthGross / monthGrossTotal) : 0;
    const fuelEstimate = dayKm > 0 && params.vehicle.efficiency > 0
      ? (dayKm / params.vehicle.efficiency) * params.vehicle.energyCost
      : 0;
    const currentGainPerKm = dayKm > 0 ? dayRevenue / dayKm : monthKm > 0 ? monthGross / monthKm : 0;
    const currentHourly = onlineMinutes > 0 ? dayRevenue / (onlineMinutes / 60) : 0;

    metrics[platform] = {
      avgDayKm:
        monthRides.length > 0
          ? monthKm / Math.max(new Set(monthRides.map((ride) => getRideDate(ride).toDateString())).size, 1)
          : 0,
      currentGainPerKm,
      currentHourly,
      dayKm,
      dayNet: Math.max(dayRevenue - allocatedMonthCost, 0),
      dayRevenue,
      efficiency: params.vehicle.efficiency,
      fuelAverage: fuelEstimate,
      fuelEstimate,
      hourlyBenchmark: currentHourly,
      monthCost: allocatedMonthCost,
      monthGoal: 0,
      monthGross,
      monthRides: monthRides.length,
      onlineMinutes,
      prevWeekGainPerKm: currentGainPerKm,
      previousAvgRide: previousMonthRides.length > 0 ? previousMonthGross / previousMonthRides.length : 0,
      previousMonthGross,
      previousMonthRides: previousMonthRides.length,
      ridesToday: todayRides.length,
      ridesYesterday: yesterdayRides.length,
      yesterdayRevenue: yesterdayRides.reduce((total, ride) => total + ride.earnings, 0),
    };
  }

  return metrics;
}

function buildNotificationItems(params: {
  costs: CostItem[];
  monthGoal: number;
  monthNet: number;
  monthPct: number;
  rides: Ride[];
  scheduledMaintenance: ScheduledMaintenanceItem[];
  settings: SettingsState;
}) {
  const items: NotificationItem[] = [];
  const ridesRevenue = params.rides.reduce((total, ride) => total + ride.earnings, 0);
  const costsTotal = sumCost(params.costs);

  if (params.settings.notifications) {
    if (params.rides.length > 0) {
      items.push({
        description: `${params.rides.length} corridas registradas somando ${formatCurrency(ridesRevenue)} no período atual.`,
        id: `rides-${params.rides.length}-${Math.round(ridesRevenue)}`,
        title: "Resumo de corridas",
        tone: "neutral",
      });
    }

    if (params.costs.length > 0) {
      items.push({
        description: `${params.costs.length} despesas lançadas, totalizando ${formatCurrency(costsTotal)} em custos.`,
        id: `costs-${params.costs.length}-${Math.round(costsTotal)}`,
        title: "Resumo de despesas",
        tone: "neutral",
      });
    }
  }

  if (params.settings.goalAlerts && params.monthGoal > 0) {
    if (params.monthNet >= params.monthGoal) {
      items.push({
        description: `Seu líquido já chegou a ${formatCurrency(params.monthNet)} e passou a meta definida para o mês.`,
        id: `goal-hit-${Math.round(params.monthNet)}`,
        title: "Meta mensal batida",
        tone: "success",
      });
    } else if (params.monthNet > 0) {
      const remaining = Math.max(params.monthGoal - params.monthNet, 0);
      items.push({
        description:
          params.monthPct < 50
            ? `Você ainda está abaixo do ritmo ideal. Faltam ${formatCurrency(remaining)} para a meta do mês.`
            : `Bom ritmo até aqui. Ainda faltam ${formatCurrency(remaining)} para concluir a meta mensal.`,
        id: `goal-progress-${Math.round(params.monthNet)}-${Math.round(params.monthGoal)}`,
        title: params.monthPct < 50 ? "Alerta de meta" : "Progresso da meta",
        tone: params.monthPct < 50 ? "warning" : "success",
      });
    }
  }

  params.scheduledMaintenance.forEach((task) => {
    const status = getMaintenanceStatus(task.dueDate);
    const diffInDays = getDueDateDiffInDays(task.dueDate);

    if (status === "Urgente") {
      items.push({
        description: `${task.label} está vencida${diffInDays !== null ? ` há ${Math.abs(diffInDays)} ${Math.abs(diffInDays) === 1 ? "dia" : "dias"}` : ""}.`,
        id: `maintenance-urgent-${task.id}`,
        title: "Manutenção urgente",
        tone: "danger",
      });
    } else if (status === "Atenção") {
      items.push({
        description: `${task.label} vence em ${diffInDays ?? 0} ${diffInDays === 1 ? "dia" : "dias"}.`,
        id: `maintenance-attention-${task.id}`,
        title: "Manutenção próxima",
        tone: "warning",
      });
    }
  });

  return items;
}

function buildAssistantInitialMessage(data: AssistantAnalytics) {
  if (data.rides.length === 0 && data.costs.length === 0) {
    return "Ainda não há corridas nem despesas registradas. Assim que você lançar os primeiros dados, eu consigo resumir plataforma, ganho por km, ticket médio e custos.";
  }

  const totalRevenue = data.rides.reduce((sum, ride) => sum + ride.earnings, 0);
  const totalKm = data.rides.reduce((sum, ride) => sum + ride.distanceKm, 0);
  const totalCosts = sumCost(data.costs);
  const gainPerKm = totalKm > 0 ? totalRevenue / totalKm : 0;

  return `Já li os dados atuais do painel. Hoje você tem ${data.rides.length} ${data.rides.length === 1 ? "corrida registrada" : "corridas registradas"}, ${formatCurrency(totalRevenue)} em receita bruta e ${formatCurrency(totalCosts)} em despesas. Seu ganho médio por km está em ${formatCurrency(gainPerKm, 2)}.`;
}

function generateAssistantReply(question: string, data: AssistantAnalytics) {
  const normalized = question
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (data.rides.length === 0 && data.costs.length === 0) {
    return "Ainda não tenho base para responder isso porque o painel está sem corridas e sem despesas registradas. Comece lançando corridas ou um resumo do dia.";
  }

  const totalRevenue = data.rides.reduce((sum, ride) => sum + ride.earnings, 0);
  const totalKm = data.rides.reduce((sum, ride) => sum + ride.distanceKm, 0);
  const totalCosts = sumCost(data.costs);
  const net = totalRevenue - totalCosts;
  const avgRideValue = data.rides.length ? totalRevenue / data.rides.length : 0;
  const gainPerKm = totalKm > 0 ? totalRevenue / totalKm : 0;
  const monthPct = data.monthGoal > 0 ? (net / data.monthGoal) * 100 : 0;

  const platformSummaries = platformOrder.map((platform) => {
    const rides = data.rides.filter((ride) => ride.platform === platform);
    const revenue = rides.reduce((sum, ride) => sum + ride.earnings, 0);
    const km = rides.reduce((sum, ride) => sum + ride.distanceKm, 0);
    const ridesCount = rides.length;
    const avgPerKm = km > 0 ? revenue / km : 0;

    return {
      avgPerKm,
      km,
      platform,
      revenue,
      ridesCount,
    };
  });

  const topRevenuePlatform = [...platformSummaries].sort((left, right) => right.revenue - left.revenue)[0];
  const topGainPlatform = [...platformSummaries].sort((left, right) => right.avgPerKm - left.avgPerKm)[0];
  const bestRide = [...data.rides].sort(
    (left, right) => right.earnings / Math.max(right.distanceKm, 0.1) - left.earnings / Math.max(left.distanceKm, 0.1),
  )[0];
  const worstRide = [...data.rides].sort(
    (left, right) => left.earnings / Math.max(left.distanceKm, 0.1) - right.earnings / Math.max(right.distanceKm, 0.1),
  )[0];
  const topCost = [...data.costs].sort((left, right) => right.amount - left.amount)[0];

  if (normalized.includes("plataforma") || normalized.includes("uber") || normalized.includes("99") || normalized.includes("indrive")) {
    if (!topRevenuePlatform || topRevenuePlatform.revenue <= 0) {
      return "Ainda não há corridas suficientes para comparar plataformas.";
    }

    return `${platformMeta[topRevenuePlatform.platform].label} lidera em faturamento com ${formatCurrency(topRevenuePlatform.revenue)} em ${topRevenuePlatform.ridesCount} ${topRevenuePlatform.ridesCount === 1 ? "corrida" : "corridas"}. Em ganho por km, o melhor desempenho atual é da ${platformMeta[topGainPlatform.platform].label} com ${formatCurrency(topGainPlatform.avgPerKm, 2)}/km.`;
  }

  if (normalized.includes("km") || normalized.includes("ganho por km")) {
    if (totalKm <= 0) {
      return "Ainda não tenho km suficiente registrado para calcular ganho por km.";
    }

    return `Seu ganho médio atual está em ${formatCurrency(gainPerKm, 2)}/km, com ${totalKm.toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    })} km registrados e ${formatCurrency(totalRevenue)} de faturamento bruto.`;
  }

  if (normalized.includes("ticket") || normalized.includes("media") || normalized.includes("corrida")) {
    if (data.rides.length === 0) {
      return "Ainda não há corridas suficientes para calcular ticket médio.";
    }

    return `Seu ticket médio atual está em ${formatCurrency(avgRideValue, 2)} por corrida, considerando ${data.rides.length} ${data.rides.length === 1 ? "corrida registrada" : "corridas registradas"}.`;
  }

  if (normalized.includes("despesa") || normalized.includes("custo")) {
    if (data.costs.length === 0) {
      return "Ainda não existem despesas registradas no painel.";
    }

    return `Você tem ${formatCurrency(totalCosts)} em despesas registradas. A maior até agora é ${topCost.label} com ${formatCurrency(topCost.amount)}. O líquido estimado, descontando custos, está em ${formatCurrency(net)}.`;
  }

  if (normalized.includes("meta") || normalized.includes("projec")) {
    if (data.monthGoal <= 0) {
      return "Ainda não existe uma meta mensal definida no painel.";
    }

    return `Sua meta mensal atual é ${formatCurrency(data.monthGoal)}. Com os dados registrados agora, você está em ${formatCurrency(net)} líquidos, o que representa ${formatPercent(Math.max(monthPct, 0))} da meta.`;
  }

  if (normalized.includes("melhor") || normalized.includes("pior")) {
    if (!bestRide || !worstRide) {
      return "Ainda não existem corridas suficientes para apontar melhor e pior desempenho.";
    }

    return `Melhor corrida atual: ${bestRide.route} com ${formatCurrency(bestRide.earnings / Math.max(bestRide.distanceKm, 0.1), 2)}/km. Pior corrida atual: ${worstRide.route} com ${formatCurrency(worstRide.earnings / Math.max(worstRide.distanceKm, 0.1), 2)}/km.`;
  }

  return `Resumo rápido: ${data.rides.length} corridas, ${formatCurrency(totalRevenue)} de receita bruta, ${formatCurrency(totalCosts)} de despesas e ${formatCurrency(net)} líquidos até agora. Se quiser, me pergunte sobre plataforma, custos, ganho por km, ticket médio ou meta mensal.`;
}

function formatDateLabel() {
  const now = new Date();
  const raw = now.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function getQualityTone(quality: Ride["quality"]) {
  if (quality === "excelente" || quality === "otimo") {
    return "text-emerald-400";
  }

  if (quality === "baixo") {
    return "text-rose-400";
  }

  if (quality === "ok") {
    return "text-amber-300";
  }

  return "text-neutral-400";
}

function getRideQualityThreshold(
  thresholds: RideQualityThresholds,
  platform: PlatformKey,
): RideQualityThreshold {
  return thresholds[platform] ?? thresholds.all;
}

function sanitizeRideQualityThreshold(
  threshold: Partial<RideQualityThreshold> | undefined,
  fallback: RideQualityThreshold,
): RideQualityThreshold {
  const badBelow = Number.isFinite(Number(threshold?.badBelow))
    ? Math.max(Number(threshold?.badBelow), 0)
    : fallback.badBelow;
  const goodAbove = Number.isFinite(Number(threshold?.goodAbove))
    ? Math.max(Number(threshold?.goodAbove), badBelow)
    : fallback.goodAbove;

  return {
    badBelow,
    goodAbove,
  };
}

function applyRideQualityThresholds(rides: Ride[], thresholds: RideQualityThresholds) {
  return rides.map((ride) => ({
    ...ride,
    quality: getQualityFromRide(ride.earnings, ride.distanceKm, ride.platform, thresholds),
  }));
}

function getQualityFromRide(
  earnings: number,
  distanceKm: number,
  platform: PlatformKey,
  thresholds: RideQualityThresholds,
): Ride["quality"] {
  const gainPerKm = distanceKm > 0 ? earnings / distanceKm : 0;
  const threshold = getRideQualityThreshold(thresholds, platform);

  if (gainPerKm >= threshold.goodAbove) {
    return "excelente";
  }

  if (gainPerKm < threshold.badBelow) {
    return "baixo";
  }

  return "ok";
}

function buildRideTimeLabel(start: string, end: string, distanceKm: number, rideDate?: Date) {
  const safeDistance = distanceKm.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
  const dayLabel = getRideDateLabel(rideDate ?? new Date());

  if (start && end) {
    const [startHour, startMinute] = start.split(":").map(Number);
    const [endHour, endMinute] = end.split(":").map(Number);
    const startTotal = (startHour || 0) * 60 + (startMinute || 0);
    let endTotal = (endHour || 0) * 60 + (endMinute || 0);

    if (endTotal < startTotal) {
      endTotal += 24 * 60;
    }

    const duration = Math.max(endTotal - startTotal, 0);
    return `${dayLabel} ${start} · ${safeDistance} km · ${duration} min`;
  }

  if (start) {
    return `${dayLabel} ${start} · ${safeDistance} km`;
  }

  return `${dayLabel} · ${safeDistance} km`;
}

function getHeatClass(value: number) {
  const palette = [
    "bg-neutral-900",
    "bg-neutral-800",
    "bg-lime-950/70",
    "bg-lime-900/80",
    "bg-lime-700/90",
    "bg-lime-500/90",
    "bg-lime-300",
  ];

  return palette[value] ?? palette[0];
}

function getIconByKey(icon: string) {
  switch (icon) {
    case "car":
      return Car;
    case "calendar":
      return Calendar;
    case "clock":
      return Clock3;
    case "map":
      return MapPinned;
    case "target":
      return Target;
    case "fuel":
      return Fuel;
    case "tool":
      return Wrench;
    case "shield":
      return Shield;
    case "phone":
      return Bell;
    default:
      return Minus;
  }
}

function readStoredPlatforms() {
  if (typeof window === "undefined") {
    return defaultPlatforms;
  }

  try {
    const raw = window.localStorage.getItem(PLATFORM_STORAGE_KEY);
    if (!raw) {
      return defaultPlatforms;
    }

    return { ...defaultPlatforms, ...(JSON.parse(raw) as Partial<Record<PlatformKey, boolean>>) };
  } catch {
    return defaultPlatforms;
  }
}

function readStoredFont() {
  if (typeof window === "undefined") {
    return "syne" as FontOptionKey;
  }

  const raw = window.localStorage.getItem(FONT_STORAGE_KEY) as FontOptionKey | null;
  return raw && raw in fontFamilyMap ? raw : "syne";
}

function FinanceiroDashboardClient() {
  const router = useRouter();
  const initialDashboardState = createInitialDashboardState();
  const [currentPage, setCurrentPage] = useState<PageKey>("dashboard");
  const [dashboardFilter, setDashboardFilter] = useState<"all" | PlatformKey>("all");
  const [corridasFilter, setCorridasFilter] = useState<"all" | PlatformKey>("all");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  const [activePlatforms, setActivePlatforms] = useState<Record<PlatformKey, boolean>>(initialDashboardState.activePlatforms);
  const [savedFont, setSavedFont] = useState<FontOptionKey>("syne");
  const [draftFont, setDraftFont] = useState<FontOptionKey>("syne");
  const [settingsSection, setSettingsSection] = useState<SettingsSectionKey>("perfil");
  const [settings, setSettings] = useState<SettingsState>(initialDashboardState.settings);
  const [savedSettings, setSavedSettings] = useState<SettingsState>(initialDashboardState.settings);
  const [editableRides, setEditableRides] = useState<Ride[]>(initialDashboardState.rides);
  const [editableCosts, setEditableCosts] = useState<CostItem[]>(initialDashboardState.costs);
  const [idleTimeEntries, setIdleTimeEntries] = useState<IdleTimeEntry[]>(initialDashboardState.idleTimeEntries);
  const [scheduledMaintenance, setScheduledMaintenance] = useState<ScheduledMaintenanceItem[]>(
    initialDashboardState.scheduledMaintenance,
  );
  const [editingRide, setEditingRide] = useState<Ride | null>(null);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>(createEmptyExpenseDraft());
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [maintenanceDraft, setMaintenanceDraft] = useState<MaintenanceDraft>(createEmptyMaintenanceDraft());
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [seenNotificationKey, setSeenNotificationKey] = useState("");
  const [isStateLoaded, setIsStateLoaded] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setSidebarCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true");
    const storedFont = readStoredFont();
    setSavedFont(storedFont);
    setDraftFont(storedFont);
    setActivePlatforms(readStoredPlatforms());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardState() {
      try {
        const response = await fetch("/api/financeiro/state", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`state GET failed with status ${response.status}`);
        }

        const data = (await response.json()) as DashboardStatePayload;
        if (cancelled) {
          return;
        }

        const loadedSettings = {
          ...defaultSettings,
          ...(data.settings ?? {}),
          platformGoals: {
            ...defaultSettings.platformGoals,
            ...(data.settings?.platformGoals ?? {}),
          },
          rideQualityThresholds: {
            ...defaultSettings.rideQualityThresholds,
            ...(data.settings?.rideQualityThresholds ?? {}),
          },
          vehicle: {
            ...defaultSettings.vehicle,
            ...(data.settings?.vehicle ?? {}),
          },
        } as SettingsState;

        setActivePlatforms({
          ...defaultPlatforms,
          ...(data.activePlatforms ?? {}),
        });
        setSettings(loadedSettings);
        setSavedSettings(loadedSettings);
        setEditableRides(
          applyRideQualityThresholds(Array.isArray(data.rides) ? data.rides : [], loadedSettings.rideQualityThresholds),
        );
        setEditableCosts(Array.isArray(data.costs) ? data.costs : []);
        setIdleTimeEntries(Array.isArray(data.idleTimeEntries) ? data.idleTimeEntries : []);
        setScheduledMaintenance(Array.isArray(data.scheduledMaintenance) ? data.scheduledMaintenance : []);
      } catch (error) {
        console.error("dashboard state load failed", error);
      } finally {
        if (!cancelled) {
          setIsStateLoaded(true);
        }
      }
    }

    void loadDashboardState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(PLATFORM_STORAGE_KEY, JSON.stringify(activePlatforms));
  }, [activePlatforms]);

  useEffect(() => {
    if (dashboardFilter !== "all" && !activePlatforms[dashboardFilter]) {
      setDashboardFilter("all");
    }
  }, [activePlatforms, dashboardFilter]);

  useEffect(() => {
    if (corridasFilter !== "all" && !activePlatforms[corridasFilter]) {
      setCorridasFilter("all");
    }
  }, [activePlatforms, corridasFilter]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setToastMessage(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const persistedStateSnapshot = JSON.stringify({
    activePlatforms,
    costs: editableCosts,
    idleTimeEntries,
    rides: editableRides,
    scheduledMaintenance,
    settings,
  } satisfies DashboardStatePayload);

  useEffect(() => {
    if (!isStateLoaded) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void fetch("/api/financeiro/state", {
        body: persistedStateSnapshot,
        headers: {
          "Content-Type": "application/json",
        },
        method: "PUT",
      }).catch((error) => {
        console.error("dashboard state save failed", error);
      });
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [isStateLoaded, persistedStateSnapshot]);

  const activePlatformKeys = platformOrder.filter((platform) => activePlatforms[platform]);

  const sumMetric = (key: keyof PlatformMetrics) =>
    activePlatformKeys.reduce((total, platform) => total + Number(platformMetrics[platform][key] ?? 0), 0);

  const sumAllPlatformsMetric = (key: keyof PlatformMetrics) =>
    platformOrder.reduce((total, platform) => total + Number(platformMetrics[platform][key] ?? 0), 0);

  const weightedAverage = (
    metricKey: keyof PlatformMetrics,
    weightKey: keyof PlatformMetrics,
  ) => {
    const totalWeight = sumMetric(weightKey);
    if (!totalWeight) {
      return 0;
    }

    const weightedValue = activePlatformKeys.reduce((total, platform) => {
      const metric = Number(platformMetrics[platform][metricKey] ?? 0);
      const weight = Number(platformMetrics[platform][weightKey] ?? 0);
      return total + metric * weight;
    }, 0);

    return weightedValue / totalWeight;
  };

  const vehicleUi = getVehicleUiCopy(settings.vehicle);
  const depreciationCost = buildVehicleDepreciationCost(settings.vehicle);
  const ownershipCost = buildVehicleOwnershipCost(settings.vehicle);
  const allCosts = withCostPercentages(
    [depreciationCost, ownershipCost, ...editableCosts].filter(Boolean) as CostItem[],
  );
  const platformMetrics = buildPlatformMetricsMap({
    costs: allCosts,
    rides: editableRides,
    vehicle: settings.vehicle,
  });
  const today = new Date();
  const idleMinutesToday = idleTimeEntries
    .filter((entry) => isSameCalendarDay(getEntryDate(entry.createdAt), today))
    .reduce((total, entry) => total + entry.minutes, 0);

  const dayRevenue = sumMetric("dayRevenue");
  const yesterdayRevenue = sumMetric("yesterdayRevenue");
  const dayNet = sumMetric("dayNet");
  const dayKm = sumMetric("dayKm");
  const avgDayKm = sumMetric("avgDayKm");
  const onlineMinutes = sumMetric("onlineMinutes") + idleMinutesToday;
  const ridesToday = sumMetric("ridesToday");
  const ridesYesterday = sumMetric("ridesYesterday");
  const fuelEstimate = sumMetric("fuelEstimate");
  const fuelAverage = sumMetric("fuelAverage");
  const monthGross = sumMetric("monthGross");
  const monthCost = sumCost(allCosts);
  const monthGoal = sumGoalSettings(settings.platformGoals);
  const monthRides = sumMetric("monthRides");
  const previousMonthGross = sumMetric("previousMonthGross");
  const previousMonthRides = sumMetric("previousMonthRides");
  const fullMonthGross = sumAllPlatformsMetric("monthGross");
  const fullMonthCost = sumCost(allCosts);

  const revenueDeltaPct = yesterdayRevenue ? ((dayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;
  const netMarginPct = dayRevenue ? (dayNet / dayRevenue) * 100 : 0;
  const hourlyValue = onlineMinutes > 0 ? dayRevenue / (onlineMinutes / 60) : 0;
  const hourlyBenchmark = weightedAverage("hourlyBenchmark", "onlineMinutes");
  const gainPerKm = weightedAverage("currentGainPerKm", "dayKm");
  const previousGainPerKm = weightedAverage("prevWeekGainPerKm", "dayKm");
  const efficiency = weightedAverage("efficiency", "onlineMinutes");
  const monthNet = fullMonthGross - fullMonthCost;
  const monthPct = monthGoal ? Math.min((monthNet / monthGoal) * 100, 100) : 0;
  const monthRemaining = Math.max(monthGoal - monthNet, 0);
  const monthProjection = monthNet * PROJECTION_MULTIPLIER;
  const projectionDelta = monthProjection - monthGoal;
  const avgRideValue = monthRides ? monthGross / monthRides : 0;
  const previousAvgRide = weightedAverage("previousAvgRide", "monthRides");
  const monthRevenueDeltaPct = previousMonthGross
    ? ((monthGross - previousMonthGross) / previousMonthGross) * 100
    : 0;
  const costSharePct = monthGross ? (monthCost / monthGross) * 100 : 0;
  const profitMarginPct = monthGross ? (monthNet / monthGross) * 100 : 0;
  const fuelDeltaPct = fuelAverage ? ((fuelEstimate - fuelAverage) / fuelAverage) * 100 : 0;
  const notificationItems = buildNotificationItems({
    costs: allCosts,
    monthGoal,
    monthNet,
    monthPct,
    rides: editableRides,
    scheduledMaintenance,
    settings,
  });
  const notificationKey = notificationItems.map((item) => item.id).join("|");
  const unreadNotifications = notificationItems.length > 0 && seenNotificationKey !== notificationKey ? notificationItems.length : 0;

  useEffect(() => {
    if (notificationsOpen) {
      setSeenNotificationKey(notificationKey);
    }
  }, [notificationKey, notificationsOpen]);

  const dashboardRides = editableRides.filter((ride) => {
    const visiblePlatform = activePlatforms[ride.platform];
    const filterMatches = dashboardFilter === "all" || ride.platform === dashboardFilter;
    return visiblePlatform && filterMatches;
  });

  const corridasRides = editableRides.filter((ride) => {
    const visiblePlatform = activePlatforms[ride.platform];
    const filterMatches = corridasFilter === "all" || ride.platform === corridasFilter;
    return visiblePlatform && filterMatches;
  });

  const isSettingsDirty =
    draftFont !== savedFont || JSON.stringify(settings) !== JSON.stringify(savedSettings);

  const currentDisplayFont = fontFamilyMap[draftFont];

  const handlePlatformToggle = (platform: PlatformKey) => {
    setActivePlatforms((current) => ({
      ...current,
      [platform]: !current[platform],
    }));
  };

  const navigate = (page: PageKey) => {
    setCurrentPage(page);
    setSidebarOpenMobile(false);
    setNotificationsOpen(false);
  };

  const openRideEditor = (ride: Ride) => {
    setEditingRide({ ...ride });
  };

  const closeRideEditor = () => {
    setEditingRide(null);
  };

  const saveRideEditor = () => {
    if (!editingRide) {
      return;
    }

    setEditableRides((current) => current.map((ride) => (ride.id === editingRide.id ? editingRide : ride)));
    setEditingRide(null);
    setToastMessage("Corrida atualizada");
  };

  const deleteRide = () => {
    if (!editingRide) {
      return;
    }

    setEditableRides((current) => current.filter((ride) => ride.id !== editingRide.id));
    setEditingRide(null);
    setToastMessage("Corrida apagada");
  };

  const saveSettings = () => {
    setSavedFont(draftFont);
    setSavedSettings(settings);
    window.localStorage.setItem(FONT_STORAGE_KEY, draftFont);
    setToastMessage("Configuracoes salvas");
  };

  const discardSettings = () => {
    setDraftFont(savedFont);
    setSettings(savedSettings);
    setToastMessage("Alteracoes descartadas");
  };

  const handleSaveRideQualityThresholds = (
    target: "all" | PlatformKey,
    thresholdDraft: RideQualityThreshold,
  ) => {
    const fallback =
      target === "all"
        ? settings.rideQualityThresholds.all
        : settings.rideQualityThresholds[target];
    const sanitized = sanitizeRideQualityThreshold(thresholdDraft, fallback);
    const nextThresholds =
      target === "all"
        ? {
            all: sanitized,
            uber: sanitized,
            "99": sanitized,
            indrive: sanitized,
          }
        : {
            ...settings.rideQualityThresholds,
            [target]: sanitized,
          };
    const nextSettings = {
      ...settings,
      rideQualityThresholds: nextThresholds,
    };

    setSettings(nextSettings);
    setSavedSettings(nextSettings);
    setEditableRides((current) => applyRideQualityThresholds(current, nextThresholds));
    setToastMessage("Regua de status atualizada");
  };

  const handleUberConnect = () => {
    setToastMessage("Libere os Authorization Code scopes da Uber para ativar a conexao.");
  };

  const handleSignOut = () => {
    void fetch("/api/auth/logout", {
      method: "POST",
    })
      .catch((error) => {
        console.error("logout failed", error);
      })
      .finally(() => {
        setNotificationsOpen(false);
        setSidebarOpenMobile(false);
        router.push("/Financeiro");
        router.refresh();
      });
  };

  const openExpenseModal = () => {
    setExpenseDraft(createEmptyExpenseDraft());
    setExpenseModalOpen(true);
  };

  const closeExpenseModal = () => {
    setExpenseModalOpen(false);
  };

  const openMaintenanceModal = () => {
    setMaintenanceDraft(createEmptyMaintenanceDraft());
    setMaintenanceModalOpen(true);
  };

  const closeMaintenanceModal = () => {
    setMaintenanceModalOpen(false);
  };

  const saveExpense = () => {
    const amount = Number(expenseDraft.amount.replace(",", "."));
    if (!amount || amount <= 0) {
      setToastMessage("Informe um valor valido para a despesa.");
      return;
    }

    const fixedMonths = Math.max(Number(expenseDraft.fixedMonths) || 1, 1);

    const meta = expenseCategoryMeta[expenseDraft.category];
    const nextCosts = [
      {
        amount,
        color: meta.color,
        icon: meta.icon,
        id: `cost-${Date.now()}`,
        label: expenseDraft.category === "fuel" ? vehicleUi.energyExpenseLabel : meta.label,
        percentage: 0,
        subtitle: [
          expenseDraft.isFixed ? `Despesa fixa por ${fixedMonths} ${fixedMonths === 1 ? "mes" : "meses"}` : "Despesa avulsa",
          expenseDraft.note.trim(),
        ]
          .filter(Boolean)
          .join(" · "),
      },
      ...editableCosts,
    ];
    setEditableCosts(withCostPercentages(nextCosts));
    setExpenseModalOpen(false);
    setToastMessage("Despesa adicionada");
  };

  const saveMaintenanceSchedule = () => {
    const label = maintenanceDraft.label.trim();
    if (!label) {
      setToastMessage("Informe o nome da manutenção.");
      return;
    }

    const subtitleParts: string[] = [];
    if (maintenanceDraft.dueDate) {
      subtitleParts.push(`Data prevista ${maintenanceDraft.dueDate.split("-").reverse().join("/")}`);
    }
    if (maintenanceDraft.dueKm.trim()) {
      subtitleParts.push(`Previsão em ${maintenanceDraft.dueKm} km`);
    }

    setScheduledMaintenance((current) => [
      {
        dueDate: maintenanceDraft.dueDate,
        dueKm: maintenanceDraft.dueKm,
        id: `maintenance-${Date.now()}`,
        label,
        subtitle: subtitleParts.join(" · ") || "Manutenção agendada",
      },
      ...current,
    ]);
    setMaintenanceModalOpen(false);
    setToastMessage("Manutenção agendada");
  };

  const handleRegisterSubmit = (payload: RegisterModalPayload) => {
    if (payload.mode === "corrida") {
      const createdRides: Ride[] = payload.rides.map((ride, index) => {
        const distanceKm = Number(ride.km) || 0;
        const earnings = Number(ride.value) || 0;
        const origin = ride.origin.trim() || "Origem";
        const destination = ride.destination.trim() || "Destino";
        const createdAt = ride.date
          ? new Date(`${ride.date}T12:00:00`).toISOString()
          : new Date().toISOString();

        return {
          createdAt,
          distanceKm,
          earnings,
          id: `ride-${Date.now()}-${index}`,
          note: ride.obs.trim() || undefined,
          platform: ride.platform,
          quality: getQualityFromRide(earnings, distanceKm, ride.platform, settings.rideQualityThresholds),
          route: `${origin} → ${destination}`,
          timeLabel: buildRideTimeLabel(ride.start, ride.end, distanceKm, new Date(createdAt)),
        };
      });

      const idleEntries = payload.rides
        .slice(0, -1)
        .map((ride, index) => {
          const minutes = parseDurationToMinutes(ride.idleAfter);
          if (minutes <= 0) {
            return null;
          }

          const referenceDate = ride.date || payload.rides[index + 1]?.date;
          const createdAt = referenceDate
            ? new Date(`${referenceDate}T12:00:00`).toISOString()
            : new Date().toISOString();

          return {
            createdAt,
            id: `idle-${Date.now()}-${index}`,
            minutes,
          };
        })
        .filter(Boolean) as IdleTimeEntry[];

      if (idleEntries.length > 0) {
        setIdleTimeEntries((current) => [...idleEntries, ...current]);
      }

      setEditableRides((current) => [...createdRides, ...current]);
      setToastMessage(
        createdRides.length > 1 ? `${createdRides.length} corridas registradas` : "Corrida registrada",
      );
      setRegisterModalOpen(false);
      return;
    }

    setToastMessage("Resumo do dia salvo");
    setRegisterModalOpen(false);
  };

  return (
    <div
      className="min-h-screen bg-[#080808] text-[#f5f4f0]"
      style={
        {
          "--panel-font-display": currentDisplayFont,
        } as React.CSSProperties
      }
    >
      <div className="relative flex min-h-screen">
        <button
          aria-label="Mostrar menu lateral"
          className={cn(
            "fixed left-5 top-6 z-40 hidden h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#171717]/95 text-neutral-400 shadow-2xl backdrop-blur md:flex",
            !sidebarCollapsed && "pointer-events-none opacity-0",
          )}
          onClick={() => setSidebarCollapsed(false)}
        >
          <PanelIcon className="h-4 w-4" />
        </button>

        <div
          className={cn(
            "fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition md:hidden",
            sidebarOpenMobile ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={() => setSidebarOpenMobile(false)}
        />

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-[228px] flex-col overflow-hidden border-r border-white/5 bg-[#111111] transition duration-300 md:z-20",
            sidebarOpenMobile ? "translate-x-0" : "-translate-x-full",
            sidebarCollapsed ? "md:-translate-x-[252px]" : "md:translate-x-0",
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/5 px-5 pb-4 pt-0">
            <div>
              <Image
                alt="Urbann"
                className="-mb-7 -mt-4 h-auto w-[184px]"
                height={184}
                priority
                src="/urbann-logo.png"
                width={184}
              />
              <div className="mt-0 text-[10px] text-neutral-500">{formatDateLabel()}</div>
            </div>
            <button
              aria-label="Recolher menu lateral"
              className="mt-3 flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/10 bg-[#1a1a1a] text-neutral-500 transition hover:text-white"
              onClick={() => setSidebarCollapsed(true)}
            >
              <PanelIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <SidebarGroup label="Principal">
              <SidebarButton
                active={currentPage === "dashboard"}
                icon={<LayoutDashboard className="h-4 w-4" />}
                label="Dashboard"
                onClick={() => navigate("dashboard")}
              />
              <SidebarButton
                active={currentPage === "corridas"}
                badge={corridasRides.length > 0 ? String(corridasRides.length) : undefined}
                icon={<Car className="h-4 w-4" />}
                label="Corridas"
                onClick={() => navigate("corridas")}
              />
              <SidebarButton
                active={currentPage === "financeiro"}
                icon={<WalletIcon className="h-4 w-4" />}
                label="Financeiro"
                onClick={() => navigate("financeiro")}
              />
              <SidebarButton
                active={currentPage === "analise"}
                icon={<Brain className="h-4 w-4" />}
                label="Análise IA"
                onClick={() => navigate("analise")}
              />
            </SidebarGroup>

            <SidebarGroup label="Veículo">
              <SidebarButton
                active={currentPage === "consumo"}
                icon={<Fuel className="h-4 w-4" />}
                label="Consumo"
                onClick={() => navigate("consumo")}
              />
              <SidebarButton
                active={currentPage === "manutencao"}
                icon={<Wrench className="h-4 w-4" />}
                label="Manutenção"
                onClick={() => navigate("manutencao")}
              />
            </SidebarGroup>

            <SidebarGroup label="Conta">
              <SidebarButton
                active={currentPage === "metas"}
                icon={<Target className="h-4 w-4" />}
                label="Metas"
                onClick={() => navigate("metas")}
              />
              <SidebarButton
                active={currentPage === "relatorios"}
                icon={<Receipt className="h-4 w-4" />}
                label="Relatórios"
                onClick={() => navigate("relatorios")}
              />
            </SidebarGroup>

            <div className="mt-auto border-t border-white/5 px-4 py-4">
              <div className="mb-3 px-1 text-[10px] uppercase tracking-[0.24em] text-neutral-600">
                Plataformas ativas
              </div>
              <div className="space-y-1.5">
                {platformOrder.map((platform) => (
                  <button
                    key={platform}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left transition",
                      activePlatforms[platform] ? "opacity-100" : "opacity-45",
                    )}
                    onClick={() => handlePlatformToggle(platform)}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: platformMeta[platform].color }}
                      />
                      <div>
                        <div className="text-sm font-medium text-white">{platformMeta[platform].label}</div>
                        <div className="text-xs text-neutral-500">
                          {formatCurrency(platformMeta[platform].todayRevenue)} hoje
                        </div>
                      </div>
                    </div>
                    <ToggleSwitch checked={activePlatforms[platform]} />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-white/5 px-4 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1f1f1f] text-sm font-bold">
                MS
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Marcelo S.</div>
                <div className="text-xs text-neutral-500">Plano Pro ✦</div>
              </div>
            </div>
          </div>
        </aside>

        <main
          className={cn(
            "min-h-screen flex-1 transition-[padding] duration-300",
            sidebarCollapsed ? "md:pl-0" : "md:pl-[228px]",
          )}
        >
          <header className="sticky top-0 z-20 flex h-[60px] items-center justify-between border-b border-white/5 bg-[#080808]/90 px-4 backdrop-blur md:px-7">
            <div className="flex items-center gap-3">
              <button
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#1a1a1a] text-neutral-400 md:hidden"
                onClick={() => setSidebarOpenMobile(true)}
              >
                <Menu className="h-4 w-4" />
              </button>
              <div
                className="text-[1.15rem] font-bold tracking-[-0.04em]"
                style={{ fontFamily: "var(--panel-font-display)" }}
              >
                {pageLabels[currentPage]}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-[#1a1a1a] px-4 py-1.5 text-xs text-neutral-500 md:flex">
                <Calendar className="h-3.5 w-3.5" />
                {formatDateLabel()}
              </div>
              <TopbarIconButton onClick={() => navigate("analise")}>
                <Brain className="h-4 w-4" />
              </TopbarIconButton>
              <TopbarIconButton onClick={() => navigate("configuracoes")}>
                <Settings className="h-4 w-4" />
              </TopbarIconButton>
              <div className="relative">
                <TopbarIconButton onClick={() => setNotificationsOpen((current) => !current)}>
                  <Bell className="h-4 w-4" />
                  {unreadNotifications > 0 && (
                    <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-400 px-1 text-[9px] font-bold text-black">
                      {Math.min(unreadNotifications, 9)}
                    </span>
                  )}
                </TopbarIconButton>
                {notificationsOpen && (
                  <div className="absolute right-0 top-full z-40 mt-3 w-[360px] rounded-[1.6rem] border border-white/10 bg-[#121212] p-4 shadow-2xl">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">Notificações</div>
                        <div className="text-xs text-neutral-500">
                          {notificationItems.length > 0 ? `${notificationItems.length} aviso${notificationItems.length > 1 ? "s" : ""} ativo${notificationItems.length > 1 ? "s" : ""}` : "Nenhum aviso no momento"}
                        </div>
                      </div>
                      <button
                        className="rounded-xl border border-white/10 bg-[#1a1a1a] p-2 text-neutral-400 transition hover:text-white"
                        onClick={() => setNotificationsOpen(false)}
                        type="button"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {notificationItems.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/8 bg-[#1b1b1b] px-4 py-5 text-sm leading-6 text-neutral-500">
                        {settings.notifications || settings.goalAlerts
                          ? "Ainda não há notificações para mostrar. Assim que surgirem lançamentos, metas ou manutenções relevantes, os avisos aparecem aqui."
                          : "As notificações estão desativadas nas configurações. Ative os alertas para voltar a receber avisos aqui."}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {notificationItems.map((item) => (
                          <div
                            key={item.id}
                            className={cn(
                              "rounded-2xl border px-4 py-3",
                              item.tone === "danger" && "border-rose-500/20 bg-rose-500/8",
                              item.tone === "warning" && "border-amber-400/20 bg-amber-400/8",
                              item.tone === "success" && "border-lime-500/20 bg-lime-500/8",
                              item.tone === "neutral" && "border-white/6 bg-[#1b1b1b]",
                            )}
                          >
                            <div className="text-sm font-semibold text-white">{item.title}</div>
                            <div className="mt-1 text-xs leading-5 text-neutral-400">{item.description}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                className="hidden h-9 items-center gap-2 rounded-xl bg-[#f5f4f0] px-4 text-sm font-semibold text-black transition hover:opacity-90 md:flex"
                onClick={() => setRegisterModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Registrar
              </button>
            </div>
          </header>

          <div className="space-y-6 px-4 py-7 md:px-7">
            {currentPage === "dashboard" && (
              <DashboardPage
                dashboardFilter={dashboardFilter}
                dayKm={dayKm}
                dayNet={dayNet}
                dayRevenue={dayRevenue}
                efficiency={efficiency}
                fuelDeltaPct={fuelDeltaPct}
                fuelEstimate={fuelEstimate}
                fullMonthCost={fullMonthCost}
                gainPerKm={gainPerKm}
                hourlyBenchmark={hourlyBenchmark}
                hourlyValue={hourlyValue}
                monthGoal={monthGoal}
                monthNet={monthNet}
                monthPct={monthPct}
                monthProjection={monthProjection}
                monthRemaining={monthRemaining}
                onFilterChange={setDashboardFilter}
                idleTimeEntries={idleTimeEntries}
                platformGoals={settings.platformGoals}
                platformMetrics={platformMetrics}
                previousGainPerKm={previousGainPerKm}
                revenueDeltaPct={revenueDeltaPct}
                rides={dashboardRides}
                ridesToday={ridesToday}
                ridesYesterday={ridesYesterday}
                vehicleUi={vehicleUi}
                visiblePlatforms={activePlatformKeys}
                yesterdayRevenue={yesterdayRevenue}
              />
            )}

            {currentPage === "corridas" && (
              <CorridasPage
                avgRideValue={avgRideValue}
                corridasFilter={corridasFilter}
                monthRides={monthRides}
                onEditRide={openRideEditor}
                onFilterChange={setCorridasFilter}
                onSaveQualityThresholds={handleSaveRideQualityThresholds}
                previousAvgRide={previousAvgRide}
                previousMonthRides={previousMonthRides}
                qualityThresholds={settings.rideQualityThresholds}
                rides={corridasRides}
                visiblePlatforms={activePlatformKeys}
              />
            )}

            {currentPage === "financeiro" && (
              <FinanceiroPage
                costs={allCosts}
                costSharePct={costSharePct}
                monthCost={monthCost}
                monthGross={monthGross}
                monthNet={monthNet}
                monthRevenueDeltaPct={monthRevenueDeltaPct}
                onAddExpense={openExpenseModal}
                platformMetrics={platformMetrics}
                projectionDelta={projectionDelta}
                projectionValue={monthProjection}
                profitMarginPct={profitMarginPct}
                visiblePlatforms={activePlatformKeys}
              />
            )}

            {currentPage === "analise" && (
              <AnalisePage
                assistantData={{
                  costs: allCosts,
                  monthGoal,
                  rides: editableRides,
                }}
              />
            )}
            {currentPage === "consumo" && <ConsumoPage costs={editableCosts} vehicleUi={vehicleUi} />}
            {currentPage === "manutencao" && (
              <ManutencaoPage
                maintenanceHistory={editableCosts.filter((cost) => cost.icon === "tool")}
                maintenanceTasks={scheduledMaintenance}
                onSchedule={openMaintenanceModal}
                vehicleUi={vehicleUi}
              />
            )}
            {currentPage === "metas" && (
              <MetasPage
                monthGoal={monthGoal}
                monthNet={monthNet}
                monthPct={monthPct}
                monthProjection={monthProjection}
                monthRemaining={monthRemaining}
                onEditGoals={() => {
                  setCurrentPage("configuracoes");
                  setSettingsSection("metas");
                }}
                platformGoals={settings.platformGoals}
                platformMetrics={platformMetrics}
                settingsGoal={monthGoal}
                visiblePlatforms={activePlatformKeys}
              />
            )}
            {currentPage === "relatorios" && <RelatoriosPage />}
            {currentPage === "configuracoes" && (
              <ConfiguracoesPage
                activePlatforms={activePlatforms}
                draftFont={draftFont}
                isDirty={isSettingsDirty}
                onDiscard={discardSettings}
                onFontChange={setDraftFont}
                onSave={saveSettings}
                onSectionChange={setSettingsSection}
                onSignOut={handleSignOut}
                onUberConnect={handleUberConnect}
                section={settingsSection}
                settings={settings}
                setSettings={setSettings}
                vehicleUi={vehicleUi}
              />
            )}
          </div>
        </main>

        <RegisterModal
          open={registerModalOpen}
          onClose={() => setRegisterModalOpen(false)}
          onSubmit={handleRegisterSubmit}
        />

        {expenseModalOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
            onClick={closeExpenseModal}
          >
            <div
              className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#121212] p-7 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div
                    className="text-[1.8rem] font-black tracking-[-0.06em] text-white"
                    style={{ fontFamily: "var(--panel-font-display)" }}
                  >
                    Adicionar despesa
                  </div>
                  <div className="mt-1 text-sm text-neutral-500">Registre um custo manual no financeiro.</div>
                </div>
                <button
                  aria-label="Fechar modal de despesa"
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[#1d1d1d] text-neutral-400 transition hover:text-white"
                  onClick={closeExpenseModal}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Categoria">
                  <select
                    className={`${inputClassName} pr-10`}
                    style={{ backgroundPosition: "right 0.9rem center" }}
                    onChange={(event) =>
                      setExpenseDraft((current) => ({
                        ...current,
                        category: event.target.value as ExpenseDraft["category"],
                      }))
                    }
                    value={expenseDraft.category}
                  >
                    <option value="fuel">{vehicleUi.energyExpenseLabel}</option>
                    <option value="food">Alimentação</option>
                    <option value="maintenance">Manutenção</option>
                    <option value="insurance">Seguro</option>
                    <option value="apps">Dados / app</option>
                    <option value="other">Outros</option>
                  </select>
                </Field>
                <Field label="Valor da despesa">
                  <input
                    className={inputClassName}
                    placeholder="0,00"
                    step="0.01"
                    type="number"
                    value={expenseDraft.amount}
                    onChange={(event) =>
                      setExpenseDraft((current) => ({ ...current, amount: event.target.value }))
                    }
                  />
                </Field>
                <Field className="md:col-span-2" label="Observação">
                  <input
                    className={inputClassName}
                    placeholder="Ex: abastecimento, troca de óleo, estacionamento..."
                    value={expenseDraft.note}
                    onChange={(event) =>
                      setExpenseDraft((current) => ({ ...current, note: event.target.value }))
                    }
                  />
                </Field>
                <div className="md:col-span-2">
                  <button
                    className="flex w-full items-center justify-between rounded-2xl bg-[#232323] px-4 py-3 text-left"
                    onClick={() =>
                      setExpenseDraft((current) => ({
                        ...current,
                        fixedMonths:
                          !current.isFixed && (!current.fixedMonths || current.fixedMonths === "0")
                            ? "1"
                            : current.fixedMonths,
                        isFixed: !current.isFixed,
                      }))
                    }
                    type="button"
                  >
                    <div>
                      <div className="text-sm font-semibold text-white">Despesa fixa</div>
                      <div className="text-xs text-neutral-500">
                        Faz o sistema considerar essa despesa por mais de um mes.
                      </div>
                    </div>
                    <ToggleSwitch checked={expenseDraft.isFixed} />
                  </button>
                </div>
                {expenseDraft.isFixed && (
                  <Field className="md:col-span-2" label="Quantidade de meses">
                    <input
                      className={inputClassName}
                      min="1"
                      placeholder="1"
                      type="number"
                      value={expenseDraft.fixedMonths}
                      onChange={(event) =>
                        setExpenseDraft((current) => ({
                          ...current,
                          fixedMonths: event.target.value,
                        }))
                      }
                    />
                  </Field>
                )}
              </div>

              <button
                className="mt-6 w-full rounded-2xl bg-[#f5f4f0] px-4 py-4 text-sm font-semibold text-black transition hover:opacity-90"
                onClick={saveExpense}
                type="button"
              >
                Salvar despesa
              </button>
            </div>
          </div>
        )}

        {maintenanceModalOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
            onClick={closeMaintenanceModal}
          >
            <div
              className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#121212] p-7 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div
                    className="text-[1.8rem] font-black tracking-[-0.06em] text-white"
                    style={{ fontFamily: "var(--panel-font-display)" }}
                  >
                    Agendar manutenção
                  </div>
                  <div className="mt-1 text-sm text-neutral-500">Cadastre um lembrete futuro para o veículo.</div>
                </div>
                <button
                  aria-label="Fechar modal de manutenção"
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[#1d1d1d] text-neutral-400 transition hover:text-white"
                  onClick={closeMaintenanceModal}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field className="md:col-span-2" label="Manutenção">
                  <input
                    className={inputClassName}
                    placeholder="Ex: troca de óleo, revisão dos freios..."
                    value={maintenanceDraft.label}
                    onChange={(event) =>
                      setMaintenanceDraft((current) => ({ ...current, label: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Data prevista">
                  <input
                    className={inputClassName}
                    type="date"
                    value={maintenanceDraft.dueDate}
                    onChange={(event) =>
                      setMaintenanceDraft((current) => ({ ...current, dueDate: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Previsão em km">
                  <input
                    className={inputClassName}
                    placeholder="Ex: 85000"
                    type="number"
                    value={maintenanceDraft.dueKm}
                    onChange={(event) =>
                      setMaintenanceDraft((current) => ({ ...current, dueKm: event.target.value }))
                    }
                  />
                </Field>
              </div>

              <button
                className="mt-6 w-full rounded-2xl bg-[#f5f4f0] px-4 py-4 text-sm font-semibold text-black transition hover:opacity-90"
                onClick={saveMaintenanceSchedule}
                type="button"
              >
                Salvar agendamento
              </button>
            </div>
          </div>
        )}

        {editingRide && (
          <div
            className="fixed inset-0 z-[55] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
            onClick={closeRideEditor}
          >
            <div
              className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-[#121212] p-7 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div
                    className="text-[1.8rem] font-black tracking-[-0.06em] text-white"
                    style={{ fontFamily: "var(--panel-font-display)" }}
                  >
                    Editar corrida
                  </div>
                  <div className="mt-1 text-sm text-neutral-500">Atualize os dados ou apague esta corrida.</div>
                </div>
                <button
                  aria-label="Fechar editor de corrida"
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[#1d1d1d] text-neutral-400 transition hover:text-white"
                  onClick={closeRideEditor}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Plataforma">
                  <div className="grid grid-cols-3 gap-2">
                    {platformOrder.map((platform) => (
                      <button
                        key={platform}
                        className={cn(
                          "rounded-2xl border px-3 py-3 text-sm font-semibold transition",
                          editingRide.platform === platform
                            ? "border-white/20 bg-[#f5f4f0] text-black"
                            : "border-white/8 bg-[#232323] text-neutral-300 hover:text-white",
                        )}
                        onClick={() => setEditingRide((current) => (current ? { ...current, platform } : current))}
                        type="button"
                      >
                        {platformMeta[platform].label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Qualidade">
                  <select
                    className={inputClassName}
                    onChange={(event) =>
                      setEditingRide((current) =>
                        current ? { ...current, quality: event.target.value as Ride["quality"] } : current,
                      )
                    }
                    value={editingRide.quality}
                  >
                    <option value="otimo">otimo</option>
                    <option value="excelente">excelente</option>
                    <option value="ok">ok</option>
                    <option value="normal">normal</option>
                    <option value="baixo">baixo</option>
                  </select>
                </Field>
                <Field label="Rota">
                  <input
                    className={inputClassName}
                    onChange={(event) => setEditingRide((current) => (current ? { ...current, route: event.target.value } : current))}
                    value={editingRide.route}
                  />
                </Field>
                <Field label="Horário / resumo">
                  <input
                    className={inputClassName}
                    onChange={(event) => setEditingRide((current) => (current ? { ...current, timeLabel: event.target.value } : current))}
                    value={editingRide.timeLabel}
                  />
                </Field>
                <Field label="Valor recebido">
                  <input
                    className={inputClassName}
                    onChange={(event) =>
                      setEditingRide((current) =>
                        current
                          ? { ...current, earnings: Number(event.target.value.replace(",", ".")) || 0 }
                          : current,
                      )
                    }
                    step="0.01"
                    type="number"
                    value={editingRide.earnings}
                  />
                </Field>
                <Field label="Distância (km)">
                  <input
                    className={inputClassName}
                    onChange={(event) =>
                      setEditingRide((current) =>
                        current
                          ? { ...current, distanceKm: Number(event.target.value.replace(",", ".")) || 0 }
                          : current,
                      )
                    }
                    step="0.1"
                    type="number"
                    value={editingRide.distanceKm}
                  />
                </Field>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  className="flex items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/15"
                  onClick={deleteRide}
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                  Apagar corrida
                </button>
                <div className="flex gap-3">
                  <button
                    className="rounded-2xl bg-[#232323] px-5 py-3 text-sm font-semibold text-neutral-300 transition hover:text-white"
                    onClick={closeRideEditor}
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button
                    className="rounded-2xl bg-[#f5f4f0] px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
                    onClick={saveRideEditor}
                    type="button"
                  >
                    Salvar alterações
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-2xl bg-[#f5f4f0] px-5 py-3 text-sm font-semibold text-black shadow-2xl">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardPage(props: {
  dashboardFilter: "all" | PlatformKey;
  dayKm: number;
  dayNet: number;
  dayRevenue: number;
  efficiency: number;
  fuelDeltaPct: number;
  fuelEstimate: number;
  fullMonthCost: number;
  gainPerKm: number;
  hourlyBenchmark: number;
  hourlyValue: number;
  idleTimeEntries: IdleTimeEntry[];
  monthGoal: number;
  monthNet: number;
  monthPct: number;
  monthProjection: number;
  monthRemaining: number;
  onFilterChange: (value: "all" | PlatformKey) => void;
  platformGoals: Record<PlatformKey, number>;
  platformMetrics: Record<PlatformKey, PlatformMetrics>;
  previousGainPerKm: number;
  revenueDeltaPct: number;
  rides: Ride[];
  ridesToday: number;
  ridesYesterday: number;
  vehicleUi: ReturnType<typeof getVehicleUiCopy>;
  visiblePlatforms: PlatformKey[];
  yesterdayRevenue: number;
}) {
  const selectedPlatforms =
    props.dashboardFilter === "all"
      ? props.visiblePlatforms
      : props.visiblePlatforms.includes(props.dashboardFilter)
        ? [props.dashboardFilter]
        : [];
  const metaPlatforms =
    props.dashboardFilter === "all"
      ? platformOrder.filter((platform) => props.visiblePlatforms.includes(platform))
      : [props.dashboardFilter];

  const sumSelectedMetric = (key: keyof PlatformMetrics) =>
    selectedPlatforms.reduce((total, platform) => total + Number(props.platformMetrics[platform][key] ?? 0), 0);

  const sumMetaMetric = (key: keyof PlatformMetrics) =>
    metaPlatforms.reduce((total, platform) => total + Number(props.platformMetrics[platform][key] ?? 0), 0);

  const weightedSelectedMetric = (
    metricKey: keyof PlatformMetrics,
    weightKey: keyof PlatformMetrics,
  ) => {
    const totalWeight = sumSelectedMetric(weightKey);
    if (!totalWeight) {
      return 0;
    }

    return (
      selectedPlatforms.reduce((total, platform) => {
        const metric = Number(props.platformMetrics[platform][metricKey] ?? 0);
        const weight = Number(props.platformMetrics[platform][weightKey] ?? 0);
        return total + metric * weight;
      }, 0) / totalWeight
    );
  };

  const selectedDayRevenue = sumSelectedMetric("dayRevenue");
  const selectedDayNet = sumSelectedMetric("dayNet");
  const selectedDayKm = sumSelectedMetric("dayKm");
  const selectedRidesToday = sumSelectedMetric("ridesToday");
  const selectedRidesYesterday = sumSelectedMetric("ridesYesterday");
  const selectedFuelEstimate = sumSelectedMetric("fuelEstimate");
  const selectedFuelAverage = sumSelectedMetric("fuelAverage");
  const selectedIdleMinutes = props.idleTimeEntries
    .filter((entry) => isSameCalendarDay(getEntryDate(entry.createdAt), new Date()))
    .reduce((total, entry) => total + entry.minutes, 0);
  const selectedOnlineMinutes = sumSelectedMetric("onlineMinutes") + selectedIdleMinutes;
  const selectedHourlyValue = selectedOnlineMinutes > 0 ? selectedDayRevenue / (selectedOnlineMinutes / 60) : 0;
  const selectedHourlyBenchmark = weightedSelectedMetric("hourlyBenchmark", "onlineMinutes");
  const selectedGainPerKm = weightedSelectedMetric("currentGainPerKm", "dayKm");
  const selectedPreviousGainPerKm = weightedSelectedMetric("prevWeekGainPerKm", "dayKm");
  const selectedEfficiency = weightedSelectedMetric("efficiency", "onlineMinutes");
  const selectedYesterdayRevenue =
    props.dashboardFilter === "all"
      ? props.yesterdayRevenue
      : selectedPlatforms.reduce((total, platform) => total + props.platformMetrics[platform].yesterdayRevenue, 0);

  const selectedRevenueDeltaPct = selectedYesterdayRevenue
    ? ((selectedDayRevenue - selectedYesterdayRevenue) / selectedYesterdayRevenue) * 100
    : 0;
  const selectedFuelDeltaPct = selectedFuelAverage
    ? ((selectedFuelEstimate - selectedFuelAverage) / selectedFuelAverage) * 100
    : 0;
  const selectedNetMarginPct = selectedDayRevenue ? (selectedDayNet / selectedDayRevenue) * 100 : 0;
  const metaGoal = metaPlatforms.reduce((total, platform) => total + (props.platformGoals[platform] || 0), 0);
  const metaGross = sumMetaMetric("monthGross");
  const metaCost = sumMetaMetric("monthCost");
  const metaNet = metaGross - metaCost;
  const metaPct = metaGoal ? Math.min((metaNet / metaGoal) * 100, 100) : 0;
  const metaRemaining = Math.max(metaGoal - metaNet, 0);
  const metaProjection = metaNet * PROJECTION_MULTIPLIER;

  const selectedPlatformSet = new Set(selectedPlatforms);
  const historyDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });

  const weeklyRevenueSeries = historyDays.map((date) => {
    const rides = props.rides.filter(
      (ride) => selectedPlatformSet.has(ride.platform) && isSameCalendarDay(getRideDate(ride), date),
    );
    const uber = rides
      .filter((ride) => ride.platform === "uber")
      .reduce((total, ride) => total + ride.earnings, 0);
    const n99 = rides
      .filter((ride) => ride.platform === "99")
      .reduce((total, ride) => total + ride.earnings, 0);
    const indrive = rides
      .filter((ride) => ride.platform === "indrive")
      .reduce((total, ride) => total + ride.earnings, 0);

    return {
      day: isSameCalendarDay(date, new Date()) ? "Hoje" : formatShortWeekday(date),
      indrive,
      n99,
      total: uber + n99 + indrive,
      uber,
    };
  });

  const weeklyMaxTotal = Math.max(...weeklyRevenueSeries.map((bar) => bar.total), 1);
  const weeklyScaleMarks = [1, 0.66, 0.33, 0].map((ratio) => Math.round(weeklyMaxTotal * ratio));
  const weeklyAverageRevenue =
    weeklyRevenueSeries.reduce((total, item) => total + item.total, 0) / Math.max(weeklyRevenueSeries.length, 1);
  const selectedMarginRatio = selectedDayRevenue ? selectedDayNet / selectedDayRevenue : 0;
  const selectedFuelPerKm = selectedDayKm ? selectedFuelEstimate / selectedDayKm : 0;
  const selectedAvgRideValue = selectedRidesToday ? selectedDayRevenue / selectedRidesToday : 0;

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const rideHistorySnapshots = historyDays.map((date) => {
    const rides = props.rides.filter(
      (ride) => selectedPlatformSet.has(ride.platform) && isSameCalendarDay(getRideDate(ride), date),
    );
    const idleMinutes = props.idleTimeEntries
      .filter((entry) => isSameCalendarDay(getEntryDate(entry.createdAt), date))
      .reduce((total, entry) => total + entry.minutes, 0);
    const revenueWithRealTime = rides.reduce((total, ride) => {
      const breakdown = getRideDurationBreakdown(ride);
      return breakdown.realMinutes > 0 ? total + ride.earnings : total;
    }, 0);
    const revenueEstimatedTime = rides.reduce((total, ride) => {
      const breakdown = getRideDurationBreakdown(ride);
      return breakdown.realMinutes === 0 ? total + ride.earnings : total;
    }, 0);
    const onlineRealMinutes = rides.reduce((total, ride) => total + getRideDurationBreakdown(ride).realMinutes, 0);
    const onlineEstimatedMinutes = rides.reduce(
      (total, ride) => total + getRideDurationBreakdown(ride).estimatedMinutes,
      0,
    );

    return {
      day: isSameCalendarDay(date, new Date()) ? "Hoje" : formatShortWeekday(date),
      onlineEstimatedMinutes,
      onlineMinutes: onlineRealMinutes + onlineEstimatedMinutes + idleMinutes,
      onlineRealMinutes: onlineRealMinutes + idleMinutes,
      revenue: revenueWithRealTime + revenueEstimatedTime,
      revenueEstimatedTime,
      revenueWithRealTime,
    };
  });

  const dailySnapshots = weeklyRevenueSeries.map((item) => {
    if (item.day === "Hoje") {
      return {
        day: item.day,
        fuel: selectedFuelEstimate,
        gainPerKm: selectedGainPerKm,
        hourly: selectedHourlyValue,
        km: selectedDayKm,
        net: selectedDayNet,
        onlineMinutes: selectedOnlineMinutes,
        revenue: selectedDayRevenue,
        rides: selectedRidesToday,
      };
    }

    if (item.total <= 0) {
      return {
        day: item.day,
        fuel: 0,
        gainPerKm: 0,
        hourly: 0,
        km: 0,
        net: 0,
        onlineMinutes: 0,
        revenue: 0,
        rides: 0,
      };
    }

    const trend = weeklyAverageRevenue ? item.total / weeklyAverageRevenue : 1;
    const gainPerKm = clamp(selectedGainPerKm * (0.94 + (trend - 1) * 0.22), 1.4, 3.6);
    const hourly = clamp(selectedHourlyValue * (0.9 + (trend - 1) * 0.28), 18, 80);
    const revenue = item.total;
    const net = revenue * selectedMarginRatio;
    const km = gainPerKm ? revenue / gainPerKm : 0;
    const rides = selectedAvgRideValue ? Math.max(1, Math.round(revenue / selectedAvgRideValue)) : 0;
    const fuel = km * selectedFuelPerKm;
    const onlineMinutes = hourly ? (revenue / hourly) * 60 : 0;

    return {
      day: item.day,
      fuel,
      gainPerKm,
      hourly,
      km,
      net,
      onlineMinutes,
      revenue,
      rides,
    };
  });

  const buildHistoryBars = (formatter: (snapshot: (typeof dailySnapshots)[number]) => string, valueKey: keyof (typeof dailySnapshots)[number]) =>
    {
      const filteredSnapshots = dailySnapshots.filter((snapshot) => snapshot.day !== "Seg");
      const bestValue = Math.max(...filteredSnapshots.map((snapshot) => Number(snapshot[valueKey] ?? 0)), 0);

      return filteredSnapshots.map((snapshot) => ({
        highlight: Number(snapshot[valueKey] ?? 0) === bestValue && bestValue > 0,
        id: `${String(valueKey)}-${snapshot.day}`,
        label: snapshot.day === "Hoje" ? "Hoje" : snapshot.day,
        text: formatter(snapshot),
        value: Number(snapshot[valueKey] ?? 0),
      }));
    };

  const buildSplitHistoryBars = (
    snapshots: Array<{
      day: string;
      estimated: number;
      real: number;
      total: number;
    }>,
    formatter: (total: number) => string,
    prefix: string,
  ) =>
    snapshots.map((snapshot) => ({
      highlight: snapshot.day === "Hoje" && snapshot.total > 0,
      id: `${prefix}-${snapshot.day}`,
      label: snapshot.day,
      segments: [
        { colorClassName: "bg-neutral-500/80", value: snapshot.estimated },
        { colorClassName: "bg-lime-400", value: snapshot.real },
      ],
      text: formatter(snapshot.total),
      value: snapshot.total,
    }));

  const revenueHistoryBars = buildSplitHistoryBars(
    rideHistorySnapshots.map((snapshot) => ({
      day: snapshot.day,
      estimated: snapshot.revenueEstimatedTime,
      real: snapshot.revenueWithRealTime,
      total: snapshot.revenue,
    })),
    (total) => formatCompactValue(total),
    "revenue-split",
  );

  const onlineHistoryBars = buildSplitHistoryBars(
    rideHistorySnapshots.map((snapshot) => ({
      day: snapshot.day,
      estimated: snapshot.onlineEstimatedMinutes,
      real: snapshot.onlineRealMinutes,
      total: snapshot.onlineMinutes,
    })),
    (total) => formatHours(total),
    "online-split",
  );

  const insightToneStyles = {
    amber: {
      badge: "bg-amber-400/10 text-amber-300",
      icon: "bg-[#2a1f0a] text-amber-300",
    },
    blue: {
      badge: "bg-sky-500/10 text-sky-300",
      icon: "bg-[#0a1a2a] text-sky-300",
    },
    green: {
      badge: "bg-lime-500/10 text-lime-300",
      icon: "bg-[#0f2a0f] text-lime-300",
    },
    violet: {
      badge: "bg-violet-500/10 text-violet-300",
      icon: "bg-[#1a0a2a] text-violet-300",
    },
  } as const;

  return (
    <div className="space-y-5">
      <PlatformTabs
        current={props.dashboardFilter}
        onChange={props.onFilterChange}
        visiblePlatforms={props.visiblePlatforms}
      />

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<CircleDollarSign className="h-3.5 w-3.5" />}
          label="Faturamento do dia"
          legendItems={[
            { colorClassName: "bg-lime-400", label: "Com horário" },
            { colorClassName: "bg-neutral-500/80", label: "Sem horário" },
          ]}
          metricBars={revenueHistoryBars}
          subtitle={`vs ontem ${formatCurrency(selectedYesterdayRevenue)}`}
          tone="up"
          value={formatCurrency(selectedDayRevenue)}
          valueMeta={`${selectedRevenueDeltaPct >= 0 ? "+" : ""}${Math.round(selectedRevenueDeltaPct)}%`}
        />
        <MetricCard
          icon={<CircleDollarSign className="h-3.5 w-3.5" />}
          label="Lucro líquido"
          subtitle="margem do dia"
          metricBars={buildHistoryBars((snapshot) => formatCompactValue(snapshot.net), "net")}
          tone="up"
          value={formatCurrency(selectedDayNet)}
          valueMeta={`${Math.round(selectedNetMarginPct)}%`}
        />
        <MetricCard
          icon={<Gauge className="h-3.5 w-3.5" />}
          label="Km rodados hoje"
          metricBars={buildHistoryBars((snapshot) => String(Math.round(snapshot.km)), "km")}
          subtitle={`média ${Math.round(selectedDayKm > 0 ? selectedDayKm - 9 : 0)}km/dia`}
          tone="neutral"
          value={`${Math.round(selectedDayKm)}km`}
          valueMeta="≈"
        />
        <MetricCard
          icon={<Clock3 className="h-3.5 w-3.5" />}
          label="Ganho por hora"
          metricBars={buildHistoryBars((snapshot) => formatCompactValue(snapshot.hourly), "hourly")}
          subtitle="vs média mensal"
          tone="up"
          value={formatCurrency(selectedHourlyValue)}
          valueMeta={formatSignedCurrency(selectedHourlyValue - selectedHourlyBenchmark)}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="Ganho por km"
          metricBars={buildHistoryBars((snapshot) => formatCompactValue(snapshot.gainPerKm, 2), "gainPerKm")}
          subtitle="vs semana passada"
          tone="up"
          value={formatCurrency(selectedGainPerKm, 2)}
          valueMeta={formatSignedCurrency(selectedGainPerKm - selectedPreviousGainPerKm, 2)}
        />
        <MetricCard
          icon={<Car className="h-3.5 w-3.5" />}
          label="Corridas hoje"
          metricBars={buildHistoryBars((snapshot) => String(Math.round(snapshot.rides)), "rides")}
          subtitle={`vs ontem (${selectedRidesYesterday})`}
          tone="up"
          value={String(selectedRidesToday)}
          valueMeta={`${selectedRidesToday - selectedRidesYesterday >= 0 ? "+" : ""}${selectedRidesToday - selectedRidesYesterday}`}
        />
        <MetricCard
          icon={props.vehicleUi.metricIcon}
          label={props.vehicleUi.consumptionLabel}
          metricBars={buildHistoryBars((snapshot) => formatCompactValue(snapshot.fuel), "fuel")}
          subtitle="vs média"
          tone={selectedFuelDeltaPct > 0 ? "down" : "up"}
          value={formatCurrency(selectedFuelEstimate)}
          valueMeta={`${selectedFuelDeltaPct >= 0 ? "+" : ""}${Math.round(selectedFuelDeltaPct)}%`}
        />
        <MetricCard
          icon={<Clock3 className="h-3.5 w-3.5" />}
          label="Horas online"
          legendItems={[
            { colorClassName: "bg-lime-400", label: "Reais" },
            { colorClassName: "bg-neutral-500/80", label: "Estimadas" },
          ]}
          metricBars={onlineHistoryBars}
          subtitle={`eficiência ${Math.round(selectedEfficiency)}%`}
          tone="neutral"
          value={formatHours(selectedOnlineMinutes)}
          valueMeta="→"
        />
      </div>

      <SurfaceCard>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">Meta mensal</div>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <div
                className="text-[3rem] font-black tracking-[-0.08em] text-white"
                style={{ fontFamily: "var(--panel-font-display)" }}
              >
                {formatCurrency(metaNet)}
              </div>
              <div className="space-y-1 text-sm text-neutral-500">
                <div>
                  Faltam <span className="font-semibold text-white">{formatCurrency(metaRemaining)}</span> para{" "}
                  {formatCurrency(metaGoal)}
                </div>
                <div>
                  Projeção: <span className="font-semibold text-lime-400">{formatCurrency(metaProjection)}</span> 🎯
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-full bg-white/8 px-3 py-1 text-sm font-semibold text-white">
            {formatPercent(metaPct)}
          </div>
        </div>
        <div className="h-2 rounded-full bg-neutral-800">
          <div className="h-2 rounded-full bg-[#f5f4f0]" style={{ width: `${metaPct}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500">
          <span>R$0</span>
          <span>{`Dia ${new Date().getDate()}/${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()}`}</span>
          <span>{`Meta ${formatCurrency(metaGoal)}`}</span>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-4">
          {metaPlatforms.map((platform) => {
            const width = metaGoal ? (props.platformMetrics[platform].monthGross / metaGoal) * 100 : 0;
            return (
              <div key={platform} className="rounded-2xl bg-[#252525] p-4">
                <div className="text-xs text-neutral-500">{platformMeta[platform].label}</div>
                <div className="mt-1 text-2xl font-extrabold text-white">{formatCurrency(props.platformMetrics[platform].monthGross)}</div>
                <div className="mt-3 h-1.5 rounded-full bg-black/20">
                  <div
                    className="h-1.5 rounded-full"
                    style={{ backgroundColor: platformMeta[platform].color, width: `${Math.min(width, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
          <div className="rounded-2xl bg-[#252525] p-4">
            <div className="text-xs text-neutral-500">Custos mês</div>
            <div className="mt-1 text-2xl font-extrabold text-rose-400">{formatCurrency(metaCost)}</div>
            <div className="mt-3 h-1.5 rounded-full bg-black/20">
              <div className="h-1.5 rounded-full bg-rose-400" style={{ width: `${metaGoal ? Math.min((metaCost / metaGoal) * 100, 100) : 0}%` }} />
            </div>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <SurfaceCard className="min-h-[490px]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-[1.7rem] font-bold tracking-[-0.05em]" style={{ fontFamily: "var(--panel-font-display)" }}>
                Faturamento — 7 dias
              </div>
              <div className="text-[11px] text-neutral-500">Por plataforma</div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-neutral-500">
              {selectedPlatforms.map((platform) => (
                <div key={platform} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: platformMeta[platform].color }} />
                  {platformMeta[platform].shortLabel}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.15rem] bg-[#181818] px-5 pb-5 pt-5">
            <div className="flex gap-4">
              <div className="flex w-12 shrink-0 flex-col justify-between pb-7 pt-8 text-right text-[9px] font-medium text-neutral-600">
                {weeklyScaleMarks.map((value, index) => (
                  <div key={`${value}-${index}`}>{formatCurrency(value)}</div>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <div className="grid grid-cols-7 gap-3 px-1 pb-4 text-center text-[9px] font-medium text-neutral-500">
                  {weeklyRevenueSeries.map((bar) => (
                    <div key={`${bar.day}-value`}>{formatCurrency(bar.total)}</div>
                  ))}
                </div>
                <div className="relative grid h-[180px] grid-cols-7 items-end gap-3 pb-7">
                  <div className="absolute bottom-7 left-0 right-0 h-px bg-white/6" />
                  {weeklyRevenueSeries.map((bar) => {
                    const uberHeight = bar.total ? (bar.uber / bar.total) * 100 : 0;
                    const ninetyNineHeight = bar.total ? (bar.n99 / bar.total) * 100 : 0;
                    const indriveHeight = bar.total ? (bar.indrive / bar.total) * 100 : 0;
                    const totalHeight = Math.max((bar.total / weeklyMaxTotal) * 100, 18);
                    const isPeakDay = bar.total === weeklyMaxTotal && bar.total > 0;

                    return (
                      <div key={bar.day} className="relative flex h-full min-w-0 items-end justify-center">
                        <div className="absolute bottom-0 text-[9px] text-neutral-500">
                          <span
                            className={cn(
                              isPeakDay && "font-bold text-lime-400",
                              !isPeakDay && bar.day === "Hoje" && "text-neutral-600",
                            )}
                          >
                            {bar.day}
                          </span>
                        </div>
                        <div className="absolute inset-x-0 bottom-7 top-0 flex items-end justify-center">
                          <div
                            className={cn(
                              "flex w-[54px] flex-col justify-end overflow-hidden rounded-t-[3px]",
                              bar.day === "Hoje" && bar.total === 0 ? "bg-[#6f6f6f]" : "bg-transparent",
                            )}
                            style={{ height: `${totalHeight}%` }}
                          >
                            {bar.uber > 0 && (
                              <div
                                className="w-full bg-[#f5f4f0]"
                                style={{ height: `${uberHeight}%` }}
                              />
                            )}
                            {bar.n99 > 0 && (
                              <div
                                className="w-full bg-[#f0dd96]"
                                style={{ height: `${ninetyNineHeight}%` }}
                              />
                            )}
                            {bar.indrive > 0 && (
                              <div
                                className="w-full bg-[#75c772]"
                                style={{ height: `${indriveHeight}%` }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-neutral-600">
              <span>Escala de faturamento diário</span>
              <span>Barras empilhadas por plataforma</span>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="text-[1.7rem] font-bold tracking-[-0.05em]" style={{ fontFamily: "var(--panel-font-display)" }}>
                  Análise IA
                </div>
                <span className="rounded-full bg-lime-500/15 px-2 py-1 text-[10px] font-semibold text-lime-300">ao vivo</span>
              </div>
              <div className="text-[11px] text-neutral-500">Insights personalizados</div>
            </div>
            <button className="flex items-center gap-1 text-sm text-neutral-500 transition hover:text-white">
              Ver mais
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {dashboardInsights.map((insight) => (
              <div key={insight.title} className="flex items-center gap-3 rounded-[12px] bg-[#252525] px-[14px] py-3">
                <div
                  className={cn("flex h-[34px] w-[34px] items-center justify-center rounded-[9px]", insightToneStyles[insight.tone as keyof typeof insightToneStyles].icon)}
                >
                  {(() => {
                    const Icon = getIconByKey(insight.icon);
                    return <Icon className="h-4 w-4" />;
                  })()}
                </div>
                <div className="min-w-0 flex-1 leading-none">
                  <div className="text-[12px] font-semibold text-white">{insight.title}</div>
                  <div className="mt-1 text-[11px] text-neutral-500">{insight.description}</div>
                </div>
                <span
                  className={cn(
                    "ml-auto shrink-0 rounded-full px-2 py-1 text-[10px] font-bold",
                    insightToneStyles[insight.tone as keyof typeof insightToneStyles].badge,
                  )}
                >
                  {insight.badge}
                </span>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-[1.6rem] font-bold tracking-[-0.05em]" style={{ fontFamily: "var(--panel-font-display)" }}>
              Últimas corridas
            </div>
            <div className="text-sm text-neutral-500">
              Hoje, {selectedRidesToday} corridas · {formatCurrency(selectedDayRevenue)}
            </div>
          </div>
          <button className="flex items-center gap-1 text-sm text-neutral-500 transition hover:text-white">
            Ver todas
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-2">
          {props.rides.slice(0, 4).map((ride) => (
            <RideRow key={ride.id} ride={ride} />
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}

function CorridasPage(props: {
  avgRideValue: number;
  corridasFilter: "all" | PlatformKey;
  monthRides: number;
  onEditRide: (ride: Ride) => void;
  onFilterChange: (value: "all" | PlatformKey) => void;
  onSaveQualityThresholds: (target: "all" | PlatformKey, threshold: RideQualityThreshold) => void;
  previousAvgRide: number;
  previousMonthRides: number;
  qualityThresholds: RideQualityThresholds;
  rides: Ride[];
  visiblePlatforms: PlatformKey[];
}) {
  const selectedThreshold =
    props.corridasFilter === "all"
      ? props.qualityThresholds.all
      : props.qualityThresholds[props.corridasFilter];
  const [badBelowDraft, setBadBelowDraft] = useState(String(selectedThreshold.badBelow));
  const [goodAboveDraft, setGoodAboveDraft] = useState(String(selectedThreshold.goodAbove));

  useEffect(() => {
    setBadBelowDraft(String(selectedThreshold.badBelow));
    setGoodAboveDraft(String(selectedThreshold.goodAbove));
  }, [selectedThreshold.badBelow, selectedThreshold.goodAbove, props.corridasFilter]);

  const filterLabel = props.corridasFilter === "all" ? "todas as plataformas" : platformMeta[props.corridasFilter].label;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <PlatformTabs current={props.corridasFilter} onChange={props.onFilterChange} visiblePlatforms={props.visiblePlatforms} />
        <SurfaceCard className="space-y-3 p-4">
          <div>
            <div className="text-sm font-semibold text-white">Régua de status</div>
            <div className="mt-1 text-xs leading-5 text-neutral-500">
              Defina a referência de {filterLabel} em R$/km. Abaixo do mínimo fica ruim, acima do máximo fica excelente.
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Ruim abaixo de</span>
              <input
                className="h-11 rounded-[0.95rem] border border-white/10 bg-[#181818] px-3.5 text-sm text-white outline-none transition focus:border-white/20"
                step="0.1"
                type="number"
                value={badBelowDraft}
                onChange={(event) => setBadBelowDraft(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Bom acima de</span>
              <input
                className="h-11 rounded-[0.95rem] border border-white/10 bg-[#181818] px-3.5 text-sm text-white outline-none transition focus:border-white/20"
                step="0.1"
                type="number"
                value={goodAboveDraft}
                onChange={(event) => setGoodAboveDraft(event.target.value)}
              />
            </label>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] leading-5 text-neutral-500">
              O que ficar entre os dois valores aparece como <span className="font-semibold text-amber-300">ok</span>.
            </div>
            <button
              className="rounded-xl bg-[#f5f4f0] px-3.5 py-2 text-sm font-semibold text-black transition hover:opacity-90"
              type="button"
              onClick={() =>
                props.onSaveQualityThresholds(props.corridasFilter, {
                  badBelow: Number(badBelowDraft),
                  goodAbove: Number(goodAboveDraft),
                })
              }
            >
              Salvar
            </button>
          </div>
        </SurfaceCard>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <MetricCard
          contrast
          icon={<CircleDollarSign className="h-3.5 w-3.5" />}
          label="Total do mês"
          subtitle="vs mês anterior"
          tone="up"
          value={`${props.monthRides} corridas`}
          valueMeta={`${props.monthRides - props.previousMonthRides >= 0 ? "+" : ""}${props.monthRides - props.previousMonthRides}`}
        />
        <MetricCard
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="Média por corrida"
          subtitle="vs mês anterior"
          tone="up"
          value={formatCurrency(props.avgRideValue, 2)}
          valueMeta={formatSignedCurrency(props.avgRideValue - props.previousAvgRide, 2)}
        />
      </div>
      <SurfaceCard>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-[1.5rem] font-bold tracking-[-0.04em]" style={{ fontFamily: "var(--panel-font-display)" }}>
            Histórico de corridas
          </div>
          <div className="flex gap-2">
            <Pill text="Maio 2025" />
            <button className="rounded-xl border border-white/10 bg-[#1b1b1b] px-3 py-2 text-sm text-neutral-400 transition hover:text-white">
              Filtrar
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {props.rides.map((ride) => (
            <RideRow key={ride.id} onEdit={props.onEditRide} ride={ride} />
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}

function FinanceiroPage(props: {
  costs: CostItem[];
  costSharePct: number;
  monthCost: number;
  monthGross: number;
  monthNet: number;
  platformMetrics: Record<PlatformKey, PlatformMetrics>;
  monthRevenueDeltaPct: number;
  onAddExpense: () => void;
  projectionDelta: number;
  projectionValue: number;
  profitMarginPct: number;
  visiblePlatforms: PlatformKey[];
}) {
  const fixedCosts = props.costs.filter(isFixedCost);
  const variableCosts = props.costs.filter((cost) => !isFixedCost(cost));

  const renderCostGroup = (title: string, subtitle: string, costs: CostItem[]) => (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="text-xs text-neutral-500">{subtitle}</div>
        </div>
        <div className="text-sm font-semibold text-rose-400">-{formatCurrency(sumCost(costs))}</div>
      </div>

      {costs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/8 bg-[#232323] px-4 py-4 text-sm text-neutral-500">
          Nenhum item neste grupo ainda.
        </div>
      ) : (
        costs.map((cost) => {
          const Icon = getIconByKey(cost.icon);
          return (
            <div key={cost.id} className="flex items-center gap-3 rounded-2xl bg-[#232323] px-4 py-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${cost.color}1a`, color: cost.color }}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">{cost.label}</div>
                <div className="text-xs text-neutral-500">{cost.subtitle}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-rose-400">-{formatCurrency(cost.amount)}</div>
                <div className="text-xs text-neutral-500">{cost.percentage}%</div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-3 xl:grid-cols-4">
        <MetricCard contrast icon={<CircleDollarSign className="h-3.5 w-3.5" />} label="Receita do mês" subtitle="vs abril" tone="up" value={formatCurrency(props.monthGross)} valueMeta={`${props.monthRevenueDeltaPct >= 0 ? "+" : ""}${Math.round(props.monthRevenueDeltaPct)}%`} />
        <MetricCard icon={<TrendingDown className="h-3.5 w-3.5" />} label="Custos do mês" subtitle="da receita" tone="down" value={formatCurrency(props.monthCost)} valueMeta={`${Math.round(props.costSharePct)}%`} />
        <MetricCard icon={<CircleDollarSign className="h-3.5 w-3.5" />} label="Lucro líquido" subtitle="margem" tone="up" value={formatCurrency(props.monthNet)} valueMeta={`${Math.round(props.profitMarginPct)}%`} />
        <MetricCard icon={<Target className="h-3.5 w-3.5" />} label="Projeção" subtitle="vs meta" tone="up" value={formatCurrency(props.projectionValue)} valueMeta={formatSignedCurrency(props.projectionDelta)} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <SurfaceCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-[1.5rem] font-bold tracking-[-0.04em]" style={{ fontFamily: "var(--panel-font-display)" }}>
              Custos do mês
            </div>
            <button
              className="rounded-xl border border-white/10 bg-[#1b1b1b] px-3 py-2 text-sm text-neutral-400 transition hover:text-white"
              onClick={props.onAddExpense}
              type="button"
            >
              Adicionar
            </button>
          </div>
          <div className="space-y-5">
            {props.costs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/8 bg-[#232323] px-4 py-6 text-sm text-neutral-500">
                Nenhuma despesa registrada ainda.
              </div>
            )}
            {props.costs.length > 0 && (
              <>
                {renderCostGroup(
                  "Custos fixos",
                  "Despesas recorrentes do veículo e operação",
                  fixedCosts,
                )}
                {renderCostGroup(
                  "Custos variáveis",
                  "Gastos lançados conforme uso no dia a dia",
                  variableCosts,
                )}
              </>
            )}
            <div className="mt-1 flex items-center justify-between border-t border-white/5 pt-3 text-sm font-semibold text-white">
              <span>Total custos</span>
              <span className="text-rose-400">-{formatCurrency(sumCost(props.costs))}</span>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <div className="text-[1.5rem] font-bold tracking-[-0.04em]" style={{ fontFamily: "var(--panel-font-display)" }}>
                Receita por plataforma
              </div>
              <div className="text-sm text-neutral-500">Maio 2025</div>
            </div>
          </div>
          <div className="space-y-4">
            {props.visiblePlatforms.map((platform) => {
              const value = props.platformMetrics[platform].monthGross;
              const share = props.monthGross ? (value / props.monthGross) * 100 : 0;
              return (
                <div key={platform}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 font-semibold text-white">
                      <span className="h-2.5 w-2.5 rounded-[4px]" style={{ backgroundColor: platformMeta[platform].color }} />
                      {platformMeta[platform].label}
                    </div>
                    <div className="font-semibold text-white">
                      {formatCurrency(value)} <span className="font-normal text-neutral-500">({Math.round(share)}%)</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-[#1a1a1a]">
                    <div className="h-2 rounded-full" style={{ backgroundColor: platformMeta[platform].color, width: `${share}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 border-t border-white/5 pt-5">
            <div className="mb-3 text-sm font-semibold text-white">Ranking ganho/km por plataforma</div>
            <div className="space-y-2">
              {[...props.visiblePlatforms]
                .sort((left, right) => props.platformMetrics[right].currentGainPerKm - props.platformMetrics[left].currentGainPerKm)
                .map((platform, index) => (
                  <div key={platform} className="flex items-center gap-3 rounded-2xl bg-[#232323] px-4 py-3">
                    <div className="w-4 text-sm font-semibold text-neutral-500">{index + 1}</div>
                    <div className="min-w-[72px] text-sm font-semibold text-white">{platformMeta[platform].label}</div>
                    <div className="h-2 flex-1 rounded-full bg-black/20">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          backgroundColor: platformMeta[platform].color,
                          width: `${(props.platformMetrics[platform].currentGainPerKm / 3) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="text-sm font-semibold text-white">{formatCurrency(props.platformMetrics[platform].currentGainPerKm, 2)}</div>
                  </div>
                ))}
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}

function AnalisePage(props: { assistantData: AssistantAnalytics }) {
  const heatPalette = [
    "bg-transparent",
    "bg-[#20321a]",
    "bg-[#29441f]",
    "bg-[#335423]",
    "bg-[#427129]",
    "bg-[#8fc94a]",
    "bg-[#d4fb7c]",
  ];
  const highlightDays = new Set(
    [...heatmapRows]
      .sort((left, right) => right.values.reduce((sum, value) => sum + value, 0) - left.values.reduce((sum, value) => sum + value, 0))
      .slice(0, 2)
      .map((row) => row.day),
  );
  const regionValues = bestRegions.map((region) => Number(region.value.replace("R$", "").replace("/km", "").replace(",", ".")));
  const topRegionValue = Math.max(...regionValues, 1);
  const assistantDataSignature = JSON.stringify({
    costs: props.assistantData.costs.map((cost) => [cost.id, cost.amount]),
    monthGoal: props.assistantData.monthGoal,
    rides: props.assistantData.rides.map((ride) => [ride.id, ride.earnings, ride.distanceKm, ride.platform]),
  });
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      id: "assistant-initial",
      role: "assistant",
      text: buildAssistantInitialMessage(props.assistantData),
    },
  ]);
  const [assistantInput, setAssistantInput] = useState("");

  useEffect(() => {
    setAssistantMessages([
      {
        id: "assistant-initial",
        role: "assistant",
        text: buildAssistantInitialMessage(props.assistantData),
      },
    ]);
  }, [assistantDataSignature]);

  const sendAssistantQuestion = (question?: string) => {
    const nextQuestion = (question ?? assistantInput).trim();
    if (!nextQuestion) {
      return;
    }

    const reply = generateAssistantReply(nextQuestion, props.assistantData);

    setAssistantMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        text: nextQuestion,
      },
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: reply,
      },
    ]);
    setAssistantInput("");
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.82fr)_21.5rem]">
      <div className="space-y-4">
        <SurfaceCard className="rounded-[2rem] p-6">
          <div className="mb-5">
            <div className="text-[1.55rem] font-bold tracking-[-0.05em]" style={{ fontFamily: "var(--panel-font-display)" }}>
              Mapa de calor — Ganho/hora
            </div>
            <div className="mt-1 text-sm text-neutral-500">Últimas 4 semanas</div>
          </div>
          <div className="rounded-[1.8rem] bg-[#191919] px-4 py-4">
            <div className="grid grid-cols-[34px_repeat(8,minmax(0,1fr))] gap-x-1 gap-y-2">
              <div />
              {heatmapLabels.map((label) => (
                <div key={label} className="text-center text-[10px] font-medium text-neutral-500">
                  {label}
                </div>
              ))}
              {heatmapRows.map((row) => (
                <Fragment key={row.day}>
                  <div
                    className={cn(
                      "flex items-center text-[10px] font-medium text-neutral-500",
                      highlightDays.has(row.day) && "text-lime-400",
                    )}
                  >
                    {row.day}
                  </div>
                  {row.values.map((value, index) => (
                    <div
                      key={`${row.day}-${index}`}
                      className={cn(
                        "h-7 rounded-[0.3rem] transition",
                        value === 0 ? "bg-[#1a1a1a]/20" : heatPalette[value] ?? heatPalette[1],
                      )}
                    />
                  ))}
                </Fragment>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-1.5 text-[10px] text-neutral-500">
              <span>Menor</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <span key={level} className={cn("h-3 w-4 rounded-[0.2rem]", heatPalette[level])} />
                ))}
              </div>
              <span className="font-medium text-lime-400">Maior ganho</span>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="rounded-[2rem] p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="text-[1.55rem] font-bold tracking-[-0.05em]" style={{ fontFamily: "var(--panel-font-display)" }}>
              Melhores regiões
            </div>
            <div className="pt-1 text-sm text-neutral-500">Por ganho/km</div>
          </div>
          <div className="space-y-0.5">
            {bestRegions.map((region, index) => {
              const regionNumeric = regionValues[index];
              const width = topRegionValue ? (regionNumeric / topRegionValue) * 100 : 0;
              const isLast = index === bestRegions.length - 1;
              const barTone =
                index === 0
                  ? "bg-[#f5f4f0]"
                  : index === 1
                    ? "bg-[#b9b9b9]"
                    : index === 2
                      ? "bg-[#7d7d7d]"
                      : index === bestRegions.length - 1
                        ? "bg-[#b4594f]"
                        : "bg-[#5f5f5f]";

              return (
                <div
                  key={region.label}
                  className={cn(
                    "grid grid-cols-[32px_minmax(0,1fr)_132px_72px] items-center gap-4 py-4",
                    !isLast && "border-b border-white/5",
                  )}
                >
                  <div
                    className={cn(
                      "text-base font-semibold",
                      index < 3 ? "text-white" : "text-neutral-500",
                    )}
                  >
                    {index + 1}
                  </div>
                  <div className="text-[1rem] font-semibold text-white">{region.label}</div>
                  <div className="h-2 rounded-full bg-[#262626]">
                    <div className={cn("h-2 rounded-full", barTone)} style={{ width: `${width}%` }} />
                  </div>
                  <div className="text-right text-[1rem] font-semibold text-white">{region.value}</div>
                </div>
              );
            })}
          </div>
        </SurfaceCard>

        <SurfaceCard className="rounded-[2rem] p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="text-[1.55rem] font-bold tracking-[-0.05em]" style={{ fontFamily: "var(--panel-font-display)" }}>
              Eventos próximos
            </div>
            <div className="pt-1 text-sm text-neutral-500">Alta demanda esperada</div>
          </div>
          <div className="space-y-3">
            {upcomingEvents.map((event, index) => (
              <div key={event.label} className="flex items-center gap-4 rounded-[1.65rem] bg-[#252525] px-5 py-4">
                <div className={cn("h-3 w-3 rounded-full", index === 0 ? "bg-[#e36b5c]" : index === 1 ? "bg-[#b96bf7]" : "bg-[#53a5ff]")} />
                <div className="min-w-0 flex-1">
                  <div className="text-[1rem] font-semibold text-white">{event.label.replace(/^[^\s]+\s/, "")}</div>
                  <div className="mt-1 text-sm text-neutral-500">{event.subtitle}</div>
                </div>
                <div className="rounded-full bg-[#372523] px-4 py-3 text-sm font-semibold text-[#ff8167]">{event.boost}</div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard className="rounded-[2rem] p-4 xl:sticky xl:top-[88px] xl:self-start">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="text-[1.35rem] font-bold tracking-[-0.05em]" style={{ fontFamily: "var(--panel-font-display)" }}>
                Assistente IA
              </div>
              <span className="rounded-full bg-lime-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-lime-400">online</span>
            </div>
            <div className="mt-0.5 text-xs text-neutral-500">Pergunte sobre seus dados</div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="max-h-[430px] space-y-3 overflow-y-auto pr-1">
            {assistantMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "text-[0.87rem] leading-6",
                  message.role === "assistant"
                    ? "rounded-[1.35rem] bg-[#252525] p-4 text-white"
                    : "ml-auto w-[84%] rounded-[1.2rem] bg-[#f5f4f0] px-4 py-3 text-[0.9rem] font-medium text-black",
                )}
              >
                {message.text}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              "Qual plataforma está me dando mais retorno?",
              "Como estão minhas despesas?",
              "Qual meu ganho por km?",
            ].map((suggestion) => (
              <button
                key={suggestion}
                className="rounded-full border border-white/8 bg-[#202020] px-3 py-1.5 text-[11px] text-neutral-400 transition hover:text-white"
                type="button"
                onClick={() => sendAssistantQuestion(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5 rounded-[1rem] border border-white/6 bg-[#1f1f1f] px-3.5 py-2.5">
            <input
              className="h-9 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-neutral-500"
              placeholder="Ex: qual plataforma rende mais?"
              value={assistantInput}
              onChange={(event) => setAssistantInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  sendAssistantQuestion();
                }
              }}
            />
            <button
              className="flex h-9 w-9 items-center justify-center rounded-[0.9rem] bg-[#f5f4f0] text-black transition hover:opacity-90"
              type="button"
              onClick={() => sendAssistantQuestion()}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}

function ConsumoPage(props: { costs: CostItem[]; vehicleUi: ReturnType<typeof getVehicleUiCopy> }) {
  const fuelCosts = props.costs.filter((cost) => cost.icon === "fuel");

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
      <SurfaceCard>
        <div className="mb-4 text-[1.45rem] font-bold tracking-[-0.04em]" style={{ fontFamily: "var(--panel-font-display)" }}>
          {props.vehicleUi.consumptionHistoryTitle}
        </div>
        <div className="space-y-3">
          {fuelCosts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/8 bg-[#232323] px-4 py-6 text-sm leading-6 text-neutral-500">
              {props.vehicleUi.consumptionEmptyMessage}
            </div>
          )}
          {fuelCosts.map((cost) => (
            <div key={cost.id} className="flex items-center justify-between rounded-2xl bg-[#232323] px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-white">{cost.label}</div>
                <div className="text-xs text-neutral-500">{cost.subtitle}</div>
              </div>
              <div className="text-sm font-semibold text-rose-400">-{formatCurrency(cost.amount)}</div>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="mb-4 text-[1.45rem] font-bold tracking-[-0.04em]" style={{ fontFamily: "var(--panel-font-display)" }}>
          Eficiência por período
        </div>
        <div className="rounded-2xl border border-dashed border-white/8 bg-[#232323] px-4 py-6 text-sm leading-6 text-neutral-500">
          {props.vehicleUi.efficiencyEmptyTitle}
          <br />
          {props.vehicleUi.efficiencyDescription}
        </div>
      </SurfaceCard>
    </div>
  );
}

function ManutencaoPage(props: {
  maintenanceHistory: CostItem[];
  maintenanceTasks: ScheduledMaintenanceItem[];
  onSchedule: () => void;
  vehicleUi: ReturnType<typeof getVehicleUiCopy>;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
      <SurfaceCard>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-[1.45rem] font-bold tracking-[-0.04em]" style={{ fontFamily: "var(--panel-font-display)" }}>
            Próximas manutenções
          </div>
          <button
            className="rounded-xl border border-white/10 bg-[#1b1b1b] px-3 py-2 text-sm text-neutral-400 transition hover:text-white"
            onClick={props.onSchedule}
            type="button"
          >
            Agendar
          </button>
        </div>
        <div className="space-y-3">
          {props.maintenanceTasks.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/8 bg-[#232323] px-4 py-6 text-sm leading-6 text-neutral-500">
              Nenhuma manutenção programada ainda.
              <br />
              {props.vehicleUi.maintenanceScheduleHint}
            </div>
          )}
          {props.maintenanceTasks.map((task) => {
            const status = getMaintenanceStatus(task.dueDate);

            return (
              <div key={task.id} className="rounded-2xl bg-[#232323] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{task.label}</div>
                    <div className="text-xs text-neutral-500">{task.subtitle}</div>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-[11px] font-semibold",
                      status === "Urgente" && "bg-rose-500/15 text-rose-300",
                      status === "Atenção" && "bg-amber-400/15 text-amber-300",
                      status === "Ok" && "bg-lime-500/15 text-lime-300",
                    )}
                  >
                    {status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="mb-4 text-[1.45rem] font-bold tracking-[-0.04em]" style={{ fontFamily: "var(--panel-font-display)" }}>
          Histórico
        </div>
        <div className="space-y-2">
          {props.maintenanceHistory.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/8 bg-[#232323] px-4 py-6 text-sm leading-6 text-neutral-500">
              {props.vehicleUi.maintenanceHistoryEmptyMessage}
            </div>
          )}
          {props.maintenanceHistory.map((item) => (
            <div key={item.id} className="rounded-2xl bg-[#232323] px-4 py-3">
              <div className="text-sm font-semibold text-white">{item.label}</div>
              <div className="mt-1 text-xs text-neutral-500">{item.subtitle}</div>
              <div className="mt-2 text-sm font-semibold text-rose-400">-{formatCurrency(item.amount)}</div>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}

function MetasPage(props: {
  monthGoal: number;
  monthNet: number;
  monthPct: number;
  monthProjection: number;
  monthRemaining: number;
  onEditGoals: () => void;
  platformGoals: Record<PlatformKey, number>;
  platformMetrics: Record<PlatformKey, PlatformMetrics>;
  settingsGoal: number;
  visiblePlatforms: PlatformKey[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
      <SurfaceCard className="overflow-hidden">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[1.45rem] font-bold tracking-[-0.04em]" style={{ fontFamily: "var(--panel-font-display)" }}>
              Minha meta mensal
            </div>
            <div className="text-sm text-neutral-500">Meta de maio</div>
          </div>
          <button
            className="rounded-xl border border-white/10 bg-[#1b1b1b] px-3 py-2 text-sm text-neutral-400 transition hover:text-white"
            onClick={props.onEditGoals}
            type="button"
          >
            Editar
          </button>
        </div>
        <div className="rounded-[2rem] border border-white/5 bg-[#151515] p-6">
          <div
            className="text-[3rem] font-black tracking-[-0.08em] text-white"
            style={{ fontFamily: "var(--panel-font-display)" }}
          >
            {formatCurrency(props.monthGoal)}
          </div>
          <div className="mt-2 text-sm text-neutral-500">Faturamento bruto</div>
          <div className="mt-6 h-3 rounded-full bg-[#222]">
            <div className="h-3 rounded-full bg-[#f5f4f0]" style={{ width: `${props.monthPct}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
            <span>{formatCurrency(props.monthNet)} alcançado</span>
            <span className="font-semibold text-white">{formatPercent(props.monthPct)}</span>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <StatChip label="Faltam" value={formatCurrency(props.monthRemaining)} />
            <StatChip label="Dias restantes" value="7 dias" />
            <StatChip label="Preciso/dia" tone="green" value={formatCurrency(props.monthRemaining / 7)} />
          </div>
        </div>
      </SurfaceCard>

      <div className="space-y-4">
        <SurfaceCard>
          <div className="mb-4 text-[1.45rem] font-bold tracking-[-0.04em]" style={{ fontFamily: "var(--panel-font-display)" }}>
            Metas por plataforma
          </div>
          <div className="space-y-4">
            {props.visiblePlatforms.map((platform) => {
              const target = props.platformGoals[platform] || 0;
              const current = props.platformMetrics[platform].monthGross;
              const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
              const gap = Math.max(target - current, 0);

              return (
                <div key={platform}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 font-semibold text-white">
                      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: platformMeta[platform].color }} />
                      {platformMeta[platform].label}
                    </div>
                    <div className="text-neutral-500">
                      {formatCurrency(current)} / {formatCurrency(target)}
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-[#222]">
                    <div className="h-2 rounded-full" style={{ backgroundColor: platformMeta[platform].color, width: `${progress}%` }} />
                  </div>
                  <div className="mt-1 text-xs text-lime-400">
                    {gap > 0 ? `Quase lá! Faltam ${formatCurrency(gap)}` : `Meta batida! +${formatCurrency(current - target)}`}
                  </div>
                </div>
              );
            })}
          </div>
        </SurfaceCard>
        <SurfaceCard>
          <div className="mb-4 text-[1.45rem] font-bold tracking-[-0.04em]" style={{ fontFamily: "var(--panel-font-display)" }}>
            Conquistas
          </div>
          <div className="space-y-3">
            {[
              { emoji: "🏆", label: "100 corridas no mês", meta: "Alcançado em 14/05" },
              { emoji: "⚡", label: "Meta inDrive batida", meta: "+44% acima da meta" },
              { emoji: "🎯", label: `Meta mensal ${formatCurrency(props.settingsGoal)}`, meta: `Projeção ${formatCurrency(props.monthProjection)}` },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-2xl bg-[#232323] px-4 py-3">
                <span className="text-2xl">{item.emoji}</span>
                <div>
                  <div className="text-sm font-semibold text-white">{item.label}</div>
                  <div className="text-xs text-neutral-500">{item.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}

function RelatoriosPage() {
  return (
    <div className="space-y-5">
      <SurfaceCard>
        <div className="mb-4 text-[1.45rem] font-bold tracking-[-0.04em]" style={{ fontFamily: "var(--panel-font-display)" }}>
          Exportar relatórios
        </div>
        <div className="flex flex-wrap gap-3">
          {["PDF mensal", "Exportar CSV", "Compartilhar"].map((action) => (
            <button key={action} className="rounded-xl border border-white/10 bg-[#1b1b1b] px-4 py-2.5 text-sm text-neutral-300 transition hover:text-white">
              {action}
            </button>
          ))}
        </div>
      </SurfaceCard>
      <div className="space-y-3">
        {monthlyReports.map((report) => (
          <SurfaceCard key={report.id} className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-white">{report.label}</div>
              <div className="text-sm text-neutral-500">{report.meta}</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-xl font-bold text-white">{report.value}</div>
              <button className="rounded-xl border border-white/10 bg-[#1b1b1b] px-3 py-2 text-sm text-neutral-300">Baixar</button>
            </div>
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
}

function ConfiguracoesPage(props: {
  activePlatforms: Record<PlatformKey, boolean>;
  draftFont: FontOptionKey;
  isDirty: boolean;
  onDiscard: () => void;
  onFontChange: (value: FontOptionKey) => void;
  onSave: () => void;
  onSectionChange: (value: SettingsSectionKey) => void;
  onSignOut: () => void;
  onUberConnect: () => void;
  section: SettingsSectionKey;
  setSettings: React.Dispatch<React.SetStateAction<SettingsState>>;
  settings: SettingsState;
  vehicleUi: ReturnType<typeof getVehicleUiCopy>;
}) {
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState("");
  const [vehicleSearchOpen, setVehicleSearchOpen] = useState(false);

  useEffect(() => {
    setVehicleSearchQuery(getVehicleSearchLabel(props.settings.vehicle));
  }, [props.settings.vehicle.selectedVehicleId]);

  const normalizedVehicleQuery = normalizeText(vehicleSearchQuery);
  const filteredVehicles =
    normalizedVehicleQuery.length === 0
      ? []
      : popularBrazilVehicles
          .map((vehicle) => {
            const primaryLabel = getVehicleSearchLabel(vehicle);
            const modelLabel = `${vehicle.brand} ${vehicle.model}`;
            const searchableText = normalizeText(
              `${primaryLabel} ${vehicle.segment} ${vehicle.rankingLabel} ${vehicle.transmission}`,
            );

            let score = -1;
            if (normalizeText(primaryLabel).startsWith(normalizedVehicleQuery)) {
              score = 0;
            } else if (normalizeText(modelLabel).startsWith(normalizedVehicleQuery)) {
              score = 1;
            } else if (searchableText.includes(normalizedVehicleQuery)) {
              score = 2;
            }

            return { score, vehicle };
          })
          .filter((item) => item.score >= 0)
          .sort((left, right) => {
            if (left.score !== right.score) {
              return left.score - right.score;
            }

            return getVehicleSearchLabel(left.vehicle).localeCompare(getVehicleSearchLabel(right.vehicle), "pt-BR");
          })
          .slice(0, 8);

  const applyVehicleSelection = (selected: VehicleDatabaseEntry) => {
    props.setSettings((current) => ({
      ...current,
      autoFuel: selected.powertrain === "eletrico" ? false : current.autoFuel,
      vehicle: createVehicleProfile(selected),
    }));
    setVehicleSearchQuery(getVehicleSearchLabel(selected));
    setVehicleSearchOpen(false);
  };

  const monthlyVehicleDepreciation =
    (props.settings.vehicle.estimatedValue * (props.settings.vehicle.annualDepreciationPct / 100)) / 12;

  return (
    <div className="grid gap-4 xl:grid-cols-[250px_1fr]">
      <SurfaceCard className="xl:sticky xl:top-[88px] xl:self-start">
        <div className="space-y-2">
          {settingsSections.map((item) => (
            <button
              key={item.key}
              className={cn(
                "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition",
                props.section === item.key ? "bg-white/8 text-white" : "text-neutral-500 hover:text-white",
              )}
              onClick={() => props.onSectionChange(item.key)}
            >
              <span>{item.label}</span>
              {props.section === item.key && <ChevronRight className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </SurfaceCard>

      <div className="space-y-4">
        {props.section === "perfil" && (
          <SurfaceCard>
            <SectionHeader subtitle="Suas informações pessoais e de conta" title="Perfil do motorista" />
            <div className="mt-6 flex items-center gap-4 rounded-3xl bg-[#232323] p-4">
              <div
                className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-[#2d2d2d] text-3xl font-black"
                style={{ fontFamily: "var(--panel-font-display)" }}
              >
                MS
              </div>
              <div className="flex-1">
                <div className="text-sm text-neutral-400">Foto de perfil · JPEG ou PNG, máx. 2MB</div>
                <div className="mt-3 flex gap-2">
                  <button className="rounded-xl bg-[#f5f4f0] px-4 py-2 text-sm font-semibold text-black">Alterar foto</button>
                  <button className="rounded-xl border border-white/10 bg-[#1b1b1b] px-4 py-2 text-sm text-neutral-300">Remover</button>
                </div>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Nome">
                <input className={inputClassName} defaultValue="Marcelo" onChange={() => props.setSettings((current) => ({ ...current }))} />
              </Field>
              <Field label="Sobrenome">
                <input className={inputClassName} defaultValue="Santos" onChange={() => props.setSettings((current) => ({ ...current }))} />
              </Field>
              <Field label="Telefone / WhatsApp">
                <input className={inputClassName} defaultValue="(11) 99999-0000" onChange={() => props.setSettings((current) => ({ ...current }))} />
              </Field>
              <Field label="E-mail">
                <input className={inputClassName} defaultValue="marcelo@gmail.com" onChange={() => props.setSettings((current) => ({ ...current }))} />
              </Field>
            </div>
            <div className="mt-8 border-t border-white/5 pt-6">
              <div className="mb-3 text-[11px] uppercase tracking-[0.14em] text-neutral-500">Segurança</div>
              <div className="space-y-3">
                <ToggleRow
                  checked={props.settings.twoFactor}
                  description="Código SMS a cada login"
                  label="Autenticação em dois fatores"
                  onChange={() => props.setSettings((current) => ({ ...current, twoFactor: !current.twoFactor }))}
                />
                <ToggleRow
                  checked={props.settings.multiSession}
                  description="Permitir login simultâneo em celular e computador"
                  label="Sessões em outros dispositivos"
                  onChange={() => props.setSettings((current) => ({ ...current, multiSession: !current.multiSession }))}
                />
              </div>
              <div className="mt-6">
                <button
                  className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/15"
                  onClick={props.onSignOut}
                  type="button"
                >
                  Sair da conta
                </button>
              </div>
            </div>
          </SurfaceCard>
        )}

        {props.section === "plataformas" && (
          <SurfaceCard>
            <SectionHeader subtitle="Gerencie quais apps você usa" title="Plataformas conectadas" />
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {platformOrder.map((platform) => (
                <div key={platform} className="rounded-3xl border border-white/5 bg-[#232323] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold"
                      style={{ backgroundColor: `${platformMeta[platform].color}22`, color: platform === "99" ? "#111" : platformMeta[platform].color }}
                    >
                      {platformMeta[platform].badge}
                    </div>
                    <span className={cn("rounded-full px-2 py-1 text-[11px] font-semibold", props.activePlatforms[platform] ? "bg-lime-500/15 text-lime-300" : "bg-neutral-700/60 text-neutral-300")}>
                      {props.activePlatforms[platform] ? "Ativo" : "Desligado"}
                    </span>
                  </div>
                  <div className="mt-4 text-base font-semibold text-white">{platformMeta[platform].label}</div>
                  <div className="text-sm text-neutral-500">
                    {platform === "uber" ? "API pronta para conexao" : "Registro manual por enquanto"}
                  </div>
                  {platform === "uber" && (
                    <div className="mt-4 space-y-3">
                      <button
                        className="w-full rounded-2xl bg-[#f5f4f0] px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90"
                        onClick={props.onUberConnect}
                        type="button"
                      >
                        Conectar Uber
                      </button>
                      <div className="text-xs leading-5 text-neutral-500">
                        O app ja foi criado na Uber. Agora falta a liberacao dos Authorization Code scopes para concluir a conexao.
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SurfaceCard>
        )}

        {props.section === "metas" && (
          <SurfaceCard>
            <SectionHeader subtitle="Defina quanto quer ganhar e acompanhe seu progresso" title="Metas financeiras" />
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl bg-[#232323] p-5">
                <div className="text-sm text-neutral-400">Meta mensal total</div>
                <div
                  className="mt-2 text-[2.6rem] font-black tracking-[-0.08em] text-white"
                  style={{ fontFamily: "var(--panel-font-display)" }}
                >
                  {formatCurrency(sumGoalSettings(props.settings.platformGoals))}
                </div>
                <div className="mt-2 text-sm leading-6 text-neutral-500">
                  O valor total do mês é a soma das metas definidas para Uber, 99 e inDrive.
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {platformOrder.map((platform) => (
                  <div key={platform} className="rounded-3xl border border-white/5 bg-[#232323] p-5">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-[4px]" style={{ backgroundColor: platformMeta[platform].color }} />
                      <div className="text-base font-semibold text-white">{platformMeta[platform].label}</div>
                    </div>
                    <div className="mt-2 text-sm text-neutral-500">Meta individual da plataforma</div>
                    <div className="mt-4">
                      <label className="mb-2 block text-[11px] uppercase tracking-[0.14em] text-neutral-500">
                        Valor da meta
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-500">
                          R$
                        </span>
                        <input
                          className={cn(inputClassName, "pl-11")}
                          max={50000}
                          min={0}
                          step={100}
                          type="number"
                          value={props.settings.platformGoals[platform] ?? 0}
                          onChange={(event) =>
                            props.setSettings((current) => ({
                              ...current,
                              platformGoals: {
                                ...current.platformGoals,
                                [platform]: Math.max(0, Number(event.target.value) || 0),
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SurfaceCard>
        )}

        {props.section === "veiculo" && (
          <SurfaceCard>
            <SectionHeader subtitle="Dados do carro para cálculo de consumo e custos" title="Veículo" />
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl bg-[#232323] p-5">
                <div className="text-sm text-neutral-400">Modelo selecionado</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {props.settings.vehicle.brand} {props.settings.vehicle.model} {props.settings.vehicle.year}
                </div>
                <div className="text-sm text-neutral-500">{props.vehicleUi.vehicleSubtitle}</div>
                <div className="mt-2 text-xs leading-5 text-neutral-500">
                  Base inicial inspirada em modelos populares e frequentes entre motoristas de app. Você pode ajustar tudo manualmente depois de selecionar.
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/6 bg-[#1d1d1d] px-4 py-3">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">
                      Valor de referência
                    </div>
                    <div className="mt-1 text-base font-semibold text-white">
                      {formatCurrency(props.settings.vehicle.estimatedValue)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/6 bg-[#1d1d1d] px-4 py-3">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">
                      Depreciação estimada por mês
                    </div>
                    <div className="mt-1 text-base font-semibold text-white">
                      {formatCurrency(monthlyVehicleDepreciation)}
                    </div>
                    <div className="text-xs text-neutral-500">
                      Calculada a partir da depreciação anual do modelo.
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/6 bg-[#1d1d1d] px-4 py-3 md:col-span-2">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">
                      Situação do veículo
                    </div>
                    <div className="mt-1 text-base font-semibold text-white">
                      {props.settings.vehicle.ownershipStatus === "quitado"
                        ? "Quitado"
                        : props.settings.vehicle.ownershipStatus === "alugado"
                          ? "Alugado"
                          : "Em financiamento"}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {props.settings.vehicle.ownershipStatus === "quitado"
                        ? "Sem parcela fixa mensal."
                        : `${formatCurrency(props.settings.vehicle.monthlyOwnershipCost)} por mês entra automaticamente nas despesas.`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field className="md:col-span-2" label="Buscar carro na base do sistema">
                  <div className="relative">
                    <input
                      className={inputClassName}
                      placeholder="Digite marca, modelo, versão ou ano"
                      type="text"
                      value={vehicleSearchQuery}
                      onBlur={() => {
                        window.setTimeout(() => setVehicleSearchOpen(false), 120);
                      }}
                      onChange={(event) => {
                        setVehicleSearchQuery(event.target.value);
                        setVehicleSearchOpen(true);
                      }}
                      onFocus={() => {
                        if (vehicleSearchQuery.trim()) {
                          setVehicleSearchOpen(true);
                        }
                      }}
                    />
                    {vehicleSearchOpen && normalizedVehicleQuery.length > 0 && (
                      <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-20 overflow-hidden rounded-2xl border border-white/8 bg-[#171717] shadow-2xl">
                        {filteredVehicles.length === 0 ? (
                          <div className="px-4 py-4 text-sm text-neutral-500">
                            Nenhum carro parecido encontrado. Continue digitando ou preencha manualmente os campos abaixo.
                          </div>
                        ) : (
                          <div className="max-h-[320px] overflow-y-auto p-2">
                            {filteredVehicles.map(({ vehicle }) => (
                              <button
                                key={vehicle.id}
                                className="block w-full rounded-xl px-3 py-3 text-left transition hover:bg-white/6"
                                onClick={() => applyVehicleSelection(vehicle)}
                                type="button"
                              >
                                <div className="text-sm font-semibold text-white">{getVehicleSearchLabel(vehicle)}</div>
                                <div className="mt-1 text-xs text-neutral-500">
                                  {vehicle.rankingLabel} · {vehicle.segment} · {vehicle.transmission}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-xs leading-5 text-neutral-500">
                    A lista só aparece conforme você digita para reduzir excesso de informação. Selecione uma sugestão para preencher os dados automaticamente.
                  </div>
                </Field>

                <Field label="Marca">
                  <input
                    className={inputClassName}
                    value={props.settings.vehicle.brand}
                    onChange={(event) =>
                      props.setSettings((current) => ({
                        ...current,
                        vehicle: { ...current.vehicle, brand: event.target.value, selectedVehicleId: "" },
                      }))
                    }
                  />
                </Field>
                <Field label="Modelo">
                  <input
                    className={inputClassName}
                    value={props.settings.vehicle.model}
                    onChange={(event) =>
                      props.setSettings((current) => ({
                        ...current,
                        vehicle: { ...current.vehicle, model: event.target.value, selectedVehicleId: "" },
                      }))
                    }
                  />
                </Field>
                <Field label="Versão / motorização">
                  <input
                    className={inputClassName}
                    value={props.settings.vehicle.version}
                    onChange={(event) =>
                      props.setSettings((current) => ({
                        ...current,
                        vehicle: { ...current.vehicle, version: event.target.value, selectedVehicleId: "" },
                      }))
                    }
                  />
                </Field>
                <Field label="Ano">
                  <input
                    className={inputClassName}
                    min="2000"
                    step="1"
                    type="number"
                    value={props.settings.vehicle.year}
                    onChange={(event) =>
                      props.setSettings((current) => ({
                        ...current,
                        vehicle: {
                          ...current.vehicle,
                          selectedVehicleId: "",
                          year: Number(event.target.value) || current.vehicle.year,
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Tipo de veículo">
                  <select
                    className={inputClassName}
                    value={props.settings.vehicle.powertrain}
                    onChange={(event) =>
                      props.setSettings((current) => ({
                        ...current,
                        autoFuel: event.target.value === "eletrico" ? false : current.autoFuel,
                        vehicle: {
                          ...current.vehicle,
                          efficiencyUnit: event.target.value === "eletrico" ? "km/kWh" : "km/L",
                          energyCost:
                            event.target.value === "eletrico"
                              ? 0.95
                              : current.vehicle.powertrain === "eletrico"
                                ? 6.19
                                : current.vehicle.energyCost || 6.19,
                          fuelKind:
                            event.target.value === "eletrico"
                              ? "eletrico"
                              : event.target.value === "hibrido"
                                ? "hibrido"
                                : current.vehicle.fuelKind === "eletrico" || current.vehicle.fuelKind === "hibrido"
                                  ? "flex"
                                  : current.vehicle.fuelKind,
                          powertrain: event.target.value as VehiclePowertrain,
                          selectedVehicleId: "",
                        },
                      }))
                    }
                  >
                    <option value="combustao">Combustão</option>
                    <option value="hibrido">Híbrido</option>
                    <option value="eletrico">Elétrico</option>
                  </select>
                </Field>
                <Field label="Combustível / energia">
                  <select
                    className={inputClassName}
                    value={props.settings.vehicle.fuelKind}
                    onChange={(event) =>
                      props.setSettings((current) => ({
                        ...current,
                        vehicle: {
                          ...current.vehicle,
                          fuelKind: event.target.value as VehicleFuelKind,
                          selectedVehicleId: "",
                        },
                      }))
                    }
                  >
                    {props.settings.vehicle.powertrain === "eletrico" ? (
                      <option value="eletrico">Elétrico</option>
                    ) : props.settings.vehicle.powertrain === "hibrido" ? (
                      <>
                        <option value="hibrido">Híbrido plug-in</option>
                        <option value="flex">Flex</option>
                        <option value="gasolina">Gasolina</option>
                      </>
                    ) : (
                      <>
                        <option value="flex">Flex</option>
                        <option value="gasolina">Gasolina</option>
                        <option value="etanol">Etanol</option>
                        <option value="diesel">Diesel</option>
                      </>
                    )}
                  </select>
                </Field>
                <Field label={props.vehicleUi.efficiencyFieldLabel}>
                  <input
                    className={inputClassName}
                    step="0.1"
                    type="number"
                    value={props.settings.vehicle.efficiency}
                    onChange={(event) =>
                      props.setSettings((current) => ({
                        ...current,
                        vehicle: { ...current.vehicle, efficiency: Number(event.target.value) || 0 },
                      }))
                    }
                  />
                </Field>
                <Field label={props.vehicleUi.energyCostLabel}>
                  <input
                    className={inputClassName}
                    step="0.01"
                    type="number"
                    value={props.settings.vehicle.energyCost}
                    onChange={(event) =>
                      props.setSettings((current) => ({
                        ...current,
                        vehicle: { ...current.vehicle, energyCost: Number(event.target.value) || 0 },
                      }))
                    }
                  />
                </Field>
                <Field label="Valor de referência do veículo">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-500">
                      R$
                    </span>
                    <input
                      className={cn(inputClassName, "pl-11")}
                      step="1000"
                      type="number"
                      value={props.settings.vehicle.estimatedValue}
                      onChange={(event) =>
                        props.setSettings((current) => ({
                          ...current,
                          vehicle: { ...current.vehicle, estimatedValue: Number(event.target.value) || 0 },
                        }))
                      }
                    />
                  </div>
                </Field>
                <Field label="Situação do veículo">
                  <select
                    className={inputClassName}
                    value={props.settings.vehicle.ownershipStatus}
                    onChange={(event) =>
                      props.setSettings((current) => ({
                        ...current,
                        vehicle: {
                          ...current.vehicle,
                          monthlyOwnershipCost:
                            event.target.value === "quitado" ? 0 : current.vehicle.monthlyOwnershipCost,
                          ownershipStatus: event.target.value as VehicleProfile["ownershipStatus"],
                        },
                      }))
                    }
                  >
                    <option value="quitado">Quitado</option>
                    <option value="financiado">Em financiamento</option>
                    <option value="alugado">Alugado</option>
                  </select>
                </Field>
                <Field
                  label={
                    props.settings.vehicle.ownershipStatus === "alugado"
                      ? "Valor do aluguel mensal"
                      : "Valor da parcela mensal"
                  }
                >
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-500">
                      R$
                    </span>
                    <input
                      className={cn(inputClassName, "pl-11")}
                      disabled={props.settings.vehicle.ownershipStatus === "quitado"}
                      step="100"
                      type="number"
                      value={
                        props.settings.vehicle.ownershipStatus === "quitado"
                          ? 0
                          : props.settings.vehicle.monthlyOwnershipCost
                      }
                      onChange={(event) =>
                        props.setSettings((current) => ({
                          ...current,
                          vehicle: {
                            ...current.vehicle,
                            monthlyOwnershipCost: Number(event.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                </Field>
                <Field label="Depreciação anual estimada (%)">
                  <input
                    className={inputClassName}
                    step="0.1"
                    type="number"
                    value={props.settings.vehicle.annualDepreciationPct}
                    onChange={(event) =>
                      props.setSettings((current) => ({
                        ...current,
                        vehicle: { ...current.vehicle, annualDepreciationPct: Number(event.target.value) || 0 },
                      }))
                    }
                  />
                </Field>
              </div>
            </div>
          </SurfaceCard>
        )}

        {props.section === "notificacoes" && (
          <SurfaceCard>
            <SectionHeader subtitle="Controle alertas em tempo real" title="Notificações" />
            <div className="mt-6 space-y-3">
              <ToggleRow
                checked={props.settings.notifications}
                description="Resumo às 22h com o total do dia"
                label="Resumo diário"
                onChange={() => props.setSettings((current) => ({ ...current, notifications: !current.notifications }))}
              />
              <ToggleRow
                checked={props.settings.goalAlerts}
                description="Avisar quando estiver abaixo do ritmo necessário"
                label="Alertas de meta"
                onChange={() => props.setSettings((current) => ({ ...current, goalAlerts: !current.goalAlerts }))}
              />
            </div>
          </SurfaceCard>
        )}

        {props.section === "aparencia" && (
          <SurfaceCard>
            <SectionHeader subtitle="Personalize a cara do seu painel" title="Aparência" />
            <div className="mt-6">
              <div className="mb-3 text-[11px] uppercase tracking-[0.14em] text-neutral-500">Fonte dos valores do dashboard</div>
              <div className="grid gap-3 md:grid-cols-2">
                {fontOptions.map((option) => (
                  <button
                    key={option.key}
                    className={cn(
                      "flex items-center justify-between rounded-3xl border px-4 py-4 text-left transition",
                      props.draftFont === option.key
                        ? "border-white bg-white/5"
                        : "border-white/5 bg-[#232323] hover:border-white/20",
                    )}
                    onClick={() => props.onFontChange(option.key)}
                  >
                    <div className="text-sm font-semibold text-white">{option.label}</div>
                    <div className="text-2xl font-black text-white" style={{ fontFamily: option.variable }}>
                      {option.preview}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-8">
              <div className="mb-3 text-[11px] uppercase tracking-[0.14em] text-neutral-500">Ajustes rápidos</div>
              <div className="space-y-3">
                <ToggleRow
                  checked={props.settings.autoFuel}
                  description="Buscar média da sua região semanalmente"
                  label={
                    props.settings.vehicle.powertrain === "eletrico"
                      ? "Atualizar custo da recarga automaticamente"
                      : props.settings.vehicle.powertrain === "hibrido"
                        ? "Atualizar custo-base do híbrido automaticamente"
                        : "Atualizar preço do combustível automaticamente"
                  }
                  onChange={() => props.setSettings((current) => ({ ...current, autoFuel: !current.autoFuel }))}
                />
              </div>
            </div>
          </SurfaceCard>
        )}

        {props.section === "plano" && (
          <SurfaceCard>
            <SectionHeader subtitle="Seu acesso atual e opções de upgrade" title="Plano & cobrança" />
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <PlanCard active name="Pro" price="R$49" />
              <PlanCard name="Starter" price="R$29" />
            </div>
          </SurfaceCard>
        )}

        {props.section === "privacidade" && (
          <SurfaceCard>
            <SectionHeader subtitle="Baixe ou remova seus dados quando quiser" title="Dados & privacidade" />
            <div className="mt-6 space-y-3">
              <DataRow label="Backups automáticos" value="Ativos" />
              <DataRow label="Exportação de dados" value="Disponível" />
              <DataRow label="Compartilhamento com terceiros" value="Desativado" />
            </div>
            <div className="mt-6 rounded-3xl border border-rose-500/20 bg-rose-500/5 p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.14em] text-rose-300">Zona de risco</div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button className="rounded-xl border border-rose-400/30 px-4 py-2 text-sm text-rose-300">Exportar dados</button>
                <button className="rounded-xl border border-rose-400/30 px-4 py-2 text-sm text-rose-300">Excluir conta</button>
              </div>
            </div>
          </SurfaceCard>
        )}

        {props.isDirty && (
          <div className="sticky bottom-6 z-10 flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-[#121212] px-5 py-4 shadow-2xl">
            <div className="text-sm text-neutral-400">Você tem alterações pendentes.</div>
            <div className="flex gap-2">
              <button className="rounded-xl bg-[#2a2a2a] px-4 py-2 text-sm text-neutral-300" onClick={props.onDiscard}>
                Descartar
              </button>
              <button className="rounded-xl bg-[#f5f4f0] px-4 py-2 text-sm font-semibold text-black" onClick={props.onSave}>
                Salvar alterações
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SidebarGroup({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="px-3 pt-5">
      <div className="mb-2 px-2 text-[10px] uppercase tracking-[0.24em] text-neutral-600">{label}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SidebarButton(props: {
  active?: boolean;
  badge?: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
        props.active ? "bg-white/8 text-white" : "text-neutral-500 hover:bg-white/5 hover:text-white",
      )}
      onClick={props.onClick}
    >
      {props.icon}
      <span>{props.label}</span>
      {props.badge && (
        <span className="ml-auto rounded-full bg-[#f5f4f0] px-2 py-0.5 text-[10px] font-bold text-black">
          {props.badge}
        </span>
      )}
    </button>
  );
}

function TopbarIconButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#1a1a1a] text-neutral-400 transition hover:text-white"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function MetricCard(props: {
  children?: React.ReactNode;
  contrast?: boolean;
  icon: React.ReactNode;
  label: string;
  legendItems?: Array<{
    colorClassName: string;
    label: string;
  }>;
  metricBars?: Array<{
    id: string;
    label: string;
    segments?: Array<{
      colorClassName: string;
      value: number;
    }>;
    text: string;
    value: number;
  }>;
  subtitle: string;
  tone: "down" | "neutral" | "up";
  value: string;
  valueMeta: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.15rem] border border-white/6 px-5 py-5",
        props.contrast ? "bg-[#f5f4f0] text-black" : "bg-[#1f1f1f] text-white",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className={cn("flex items-center gap-2 text-[11px] uppercase tracking-[0.12em]", props.contrast ? "text-neutral-500" : "text-neutral-500")}>
          {props.icon}
          {props.label}
        </div>
        {props.legendItems && props.legendItems.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-2 text-[9px] font-medium uppercase tracking-[0.12em] text-neutral-500">
            {props.legendItems.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", item.colorClassName)} />
                {item.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div
        className={cn("text-[2.15rem] font-black tracking-[-0.08em]", props.contrast ? "text-black" : "text-white")}
        style={{ fontFamily: "var(--panel-font-display)" }}
      >
        {props.value}
      </div>
      <div className={cn("mt-2 flex items-center gap-2 text-xs", props.contrast ? "text-neutral-500" : "text-neutral-500")}>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-semibold",
            props.tone === "up" && "bg-lime-500/15 text-lime-300",
            props.tone === "down" && "bg-rose-500/15 text-rose-300",
            props.tone === "neutral" && "bg-white/8 text-neutral-400",
          )}
        >
          {props.valueMeta}
        </span>
        <span>{props.subtitle}</span>
      </div>
      {props.metricBars && props.metricBars.length > 0 && <MetricBarStrip items={props.metricBars} />}
      {props.children}
    </div>
  );
}

function MetricBarStrip(props: {
  items: Array<{
    highlight?: boolean;
    id: string;
    label: string;
    segments?: Array<{
      colorClassName: string;
      value: number;
    }>;
    text: string;
    value: number;
  }>;
}) {
  const maxValue = Math.max(
    ...props.items.map((item) =>
      item.segments ? item.segments.reduce((total, segment) => total + segment.value, 0) : item.value,
    ),
    1,
  );
  const chartHeight = 56;
  const minHeight = 16;

  return (
    <div className="mt-5">
      <div className="flex h-[80px] items-end gap-0.5">
        {props.items.map((item) => {
          const totalValue = item.segments
            ? item.segments.reduce((total, segment) => total + segment.value, 0)
            : item.value;
          const height = totalValue > 0 ? Math.max((totalValue / maxValue) * chartHeight, minHeight) : 0;

          return (
            <div key={item.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div className="flex h-[56px] w-full items-end">
                <div
                  className={cn(
                    "relative w-full overflow-hidden rounded-[0.18rem] transition-[height] duration-300",
                    item.highlight ? "bg-lime-500/90" : "bg-[#575757]/90",
                  )}
                  style={{ height: `${height}px` }}
                >
                  {item.segments && item.segments.length > 0 ? (
                    <div className="flex h-full w-full flex-col-reverse justify-end">
                      {item.segments.map((segment, index) =>
                        segment.value > 0 ? (
                          <div
                            key={`${item.id}-segment-${index}`}
                            className={cn("w-full", segment.colorClassName)}
                            style={{
                              height: `${(segment.value / totalValue) * 100}%`,
                            }}
                          />
                        ) : null,
                      )}
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      "absolute inset-0 flex items-center justify-center px-0 text-center text-[8px] font-medium leading-none tabular-nums",
                      item.highlight ? "text-[#0e1b08]/80" : "text-neutral-200/80",
                    )}
                  >
                    <span className="block w-full text-center whitespace-nowrap">
                      {item.text}
                    </span>
                  </div>
                </div>
              </div>
              <div className={cn("text-[10px] font-medium", item.highlight ? "text-lime-400" : "text-neutral-600")}>
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SurfaceCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("rounded-[1.35rem] border border-white/6 bg-[#1f1f1f] p-5", className)}>{children}</div>;
}

function PlatformTabs(props: {
  current: "all" | PlatformKey;
  onChange: (value: "all" | PlatformKey) => void;
  visiblePlatforms: PlatformKey[];
}) {
  return (
    <div className="inline-flex rounded-2xl border border-white/8 bg-[#1b1b1b] p-1.5">
      <PlatformTab active={props.current === "all"} label="Todas" onClick={() => props.onChange("all")} />
      {props.visiblePlatforms.map((platform) => (
        <PlatformTab
          key={platform}
          active={props.current === platform}
          color={platformMeta[platform].color}
          label={platformMeta[platform].label}
          onClick={() => props.onChange(platform)}
        />
      ))}
    </div>
  );
}

function PlatformTab(props: {
  active?: boolean;
  color?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "rounded-xl px-4 py-2 text-sm font-semibold transition",
        props.active ? "text-black" : "text-neutral-500 hover:text-white",
      )}
      style={props.active ? { backgroundColor: props.color ?? "#f5f4f0" } : undefined}
      onClick={props.onClick}
    >
      {props.label}
    </button>
  );
}

function RideRow({ onEdit, ride }: { onEdit?: (ride: Ride) => void; ride: Ride }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-[#232323] px-4 py-3">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold"
        style={{
          backgroundColor: `${platformMeta[ride.platform].color}22`,
          color: ride.platform === "99" ? "#111" : platformMeta[ride.platform].color,
        }}
      >
        {platformMeta[ride.platform].badge}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-white">{ride.route}</div>
        <div className="truncate text-xs text-neutral-500">{ride.timeLabel}</div>
      </div>
      <div className="grid grid-cols-[minmax(0,88px)_minmax(0,78px)] gap-5">
        <div className="px-1 text-center">
          <div className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">Valor</div>
          <div className="mt-1 text-sm font-semibold text-white">{formatCurrency(ride.earnings, 2)}</div>
          <div className="mt-0.5 text-[11px] text-neutral-500">{formatCurrency(ride.earnings / ride.distanceKm, 2)}/km</div>
        </div>
        <div className="px-1 text-center">
          <div className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">Status</div>
          <div className={cn("mt-1 text-sm font-semibold capitalize", getQualityTone(ride.quality))}>{ride.quality}</div>
          <div className="mt-0.5 text-[11px] text-neutral-500">{ride.distanceKm.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} km</div>
        </div>
      </div>
      {onEdit && (
        <button
          aria-label={`Editar corrida ${ride.route}`}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-[#1d1d1d] text-neutral-400 transition hover:text-white"
          onClick={() => onEdit(ride)}
          type="button"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function Field({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={cn("block", className)}>
      <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-neutral-500">{label}</div>
      {children}
    </label>
  );
}

function ToggleSwitch({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-5 w-9 rounded-full transition",
        checked ? "bg-lime-500" : "bg-neutral-700",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white transition",
          checked ? "left-[18px]" : "left-0.5",
        )}
      />
    </span>
  );
}

function ToggleRow(props: {
  checked: boolean;
  description: string;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      className="flex w-full items-center justify-between rounded-2xl bg-[#232323] px-4 py-3 text-left"
      onClick={props.onChange}
    >
      <div>
        <div className="text-sm font-semibold text-white">{props.label}</div>
        <div className="text-xs text-neutral-500">{props.description}</div>
      </div>
      <ToggleSwitch checked={props.checked} />
    </button>
  );
}

function SectionHeader({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <div>
      <div className="text-[1.55rem] font-bold tracking-[-0.05em]" style={{ fontFamily: "var(--panel-font-display)" }}>
        {title}
      </div>
      <div className="text-sm text-neutral-500">{subtitle}</div>
    </div>
  );
}

function Pill({ text }: { text: string }) {
  return <div className="rounded-full border border-white/10 bg-[#1a1a1a] px-4 py-2 text-sm text-neutral-400">{text}</div>;
}

function PlanCard({ active, name, price }: { active?: boolean; name: string; price: string }) {
  return (
    <div className={cn("rounded-3xl border p-5", active ? "border-white bg-white/5" : "border-white/5 bg-[#232323]")}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xl font-bold text-white" style={{ fontFamily: "var(--panel-font-display)" }}>
          {name}
        </div>
        {active && <span className="rounded-full bg-[#f5f4f0] px-2 py-1 text-[10px] font-bold uppercase text-black">Atual</span>}
      </div>
      <div
        className="mt-3 text-[2rem] font-black tracking-[-0.06em] text-white"
        style={{ fontFamily: "var(--panel-font-display)" }}
      >
        {price}
        <span className="ml-1 text-sm font-normal text-neutral-500">/mês</span>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-neutral-400">
        <li>Dashboard completo</li>
        <li>Relatórios por plataforma</li>
        <li>Fontes e aparência</li>
      </ul>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[#232323] px-4 py-3">
      <div className="text-sm text-neutral-400">{label}</div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function StatChip({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "green";
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[#232323] px-5 py-4 text-center">
      <div className="text-xs text-neutral-500">{label}</div>
      <div
        className={cn("mt-1 text-[1.35rem] font-black tracking-[-0.04em] text-white", tone === "green" && "text-lime-400")}
        style={{ fontFamily: "var(--panel-font-display)" }}
      >
        {value}
      </div>
    </div>
  );
}

function sumCost(costs: CostItem[]) {
  return costs.reduce((total, item) => total + item.amount, 0);
}

function PanelIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 20 20">
      <rect height="13" rx="3" stroke="currentColor" strokeWidth="1.6" width="14.5" x="2.75" y="3.5" />
      <path d="M7.75 4.25v11.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
      <path d="M12 8.25 9.5 10 12 11.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  );
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 20 20">
      <path d="M3.5 6.5A2.5 2.5 0 0 1 6 4h7.5a2.5 2.5 0 0 1 0 5H6A2.5 2.5 0 0 0 6 14h8a2.5 2.5 0 0 0 2.5-2.5V8.5A2.5 2.5 0 0 0 14 6H6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
      <circle cx="13.5" cy="10" fill="currentColor" r="1" />
    </svg>
  );
}

const inputClassName =
  "h-12 w-full rounded-2xl border border-white/6 bg-[#232323] px-4 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-white/20";

export default FinanceiroDashboardClient;
