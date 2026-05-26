export type PlatformKey = "uber" | "99" | "indrive";

export type PageKey =
  | "dashboard"
  | "corridas"
  | "financeiro"
  | "analise"
  | "consumo"
  | "manutencao"
  | "metas"
  | "relatorios"
  | "configuracoes";

export type SettingsSectionKey =
  | "perfil"
  | "plataformas"
  | "metas"
  | "veiculo"
  | "notificacoes"
  | "aparencia"
  | "plano"
  | "privacidade";

export type PlatformMetrics = {
  avgDayKm: number;
  currentGainPerKm: number;
  currentHourly: number;
  dayKm: number;
  dayNet: number;
  dayRevenue: number;
  efficiency: number;
  fuelAverage: number;
  fuelEstimate: number;
  hourlyBenchmark: number;
  monthCost: number;
  monthGoal: number;
  monthGross: number;
  monthRides: number;
  onlineMinutes: number;
  prevWeekGainPerKm: number;
  previousAvgRide: number;
  previousMonthGross: number;
  previousMonthRides: number;
  ridesToday: number;
  ridesYesterday: number;
  yesterdayRevenue: number;
};

export type Ride = {
  createdAt?: string;
  distanceKm: number;
  earnings: number;
  id: string;
  note?: string;
  platform: PlatformKey;
  quality: "baixo" | "excelente" | "normal" | "ok" | "otimo";
  route: string;
  timeLabel: string;
};

export type CostItem = {
  amount: number;
  color: string;
  icon: string;
  id: string;
  label: string;
  percentage: number;
  subtitle: string;
};

export type DashboardInsight = {
  badge: string;
  description: string;
  icon: string;
  title: string;
  tone: "amber" | "blue" | "green" | "violet";
};

export type HeatmapRow = {
  day: string;
  values: number[];
};

export type BestRegion = {
  label: string;
  value: string;
};

export type UpcomingEvent = {
  boost: string;
  label: string;
  subtitle: string;
};

export type FuelEntry = {
  label: string;
  subtitle: string;
  value: string;
};

export type MaintenanceTask = {
  id: string;
  label: string;
  status: "Atenção" | "Ok" | "Urgente";
  subtitle: string;
};

export type MonthlyReport = {
  id: string;
  label: string;
  meta: string;
  value: string;
};

export type VehiclePowertrain = "combustao" | "eletrico" | "hibrido";

export type VehicleFuelKind = "diesel" | "eletrico" | "etanol" | "flex" | "gasolina" | "hibrido";

export type VehicleDatabaseEntry = {
  annualDepreciationPct: number;
  brand: string;
  defaultEfficiency: number;
  defaultEnergyCost: number;
  efficiencyUnit: "km/L" | "km/kWh";
  estimatedValue: number;
  fuelKind: VehicleFuelKind;
  id: string;
  model: string;
  powertrain: VehiclePowertrain;
  rankingLabel: string;
  segment: string;
  transmission: string;
  version: string;
  year: number;
};

export const platformOrder: PlatformKey[] = ["uber", "99", "indrive"];

export const pageLabels: Record<PageKey, string> = {
  analise: "Análise IA",
  configuracoes: "Configurações",
  consumo: "Consumo",
  corridas: "Corridas",
  dashboard: "Dashboard",
  financeiro: "Financeiro",
  manutencao: "Manutenção",
  metas: "Metas",
  relatorios: "Relatórios",
};

function combustionVehicle(
  id: string,
  brand: string,
  model: string,
  version: string,
  year: number,
  segment: string,
  transmission: string,
  fuelKind: Exclude<VehicleFuelKind, "eletrico" | "hibrido">,
  defaultEfficiency: number,
  estimatedValue: number,
  annualDepreciationPct: number,
  rankingLabel: string,
): VehicleDatabaseEntry {
  return {
    annualDepreciationPct,
    brand,
    defaultEfficiency,
    defaultEnergyCost: 6.19,
    efficiencyUnit: "km/L",
    estimatedValue,
    fuelKind,
    id,
    model,
    powertrain: "combustao",
    rankingLabel,
    segment,
    transmission,
    version,
    year,
  };
}

function hybridVehicle(
  id: string,
  brand: string,
  model: string,
  version: string,
  year: number,
  segment: string,
  defaultEfficiency: number,
  estimatedValue: number,
  annualDepreciationPct: number,
  rankingLabel: string,
): VehicleDatabaseEntry {
  return {
    annualDepreciationPct,
    brand,
    defaultEfficiency,
    defaultEnergyCost: 6.19,
    efficiencyUnit: "km/L",
    estimatedValue,
    fuelKind: "hibrido",
    id,
    model,
    powertrain: "hibrido",
    rankingLabel,
    segment,
    transmission: "Automático",
    version,
    year,
  };
}

function electricVehicle(
  id: string,
  brand: string,
  model: string,
  version: string,
  year: number,
  segment: string,
  defaultEfficiency: number,
  estimatedValue: number,
  annualDepreciationPct: number,
  rankingLabel: string,
): VehicleDatabaseEntry {
  return {
    annualDepreciationPct,
    brand,
    defaultEfficiency,
    defaultEnergyCost: 0.95,
    efficiencyUnit: "km/kWh",
    estimatedValue,
    fuelKind: "eletrico",
    id,
    model,
    powertrain: "eletrico",
    rankingLabel,
    segment,
    transmission: "Automático",
    version,
    year,
  };
}

export const popularBrazilVehicles: VehicleDatabaseEntry[] = [
  combustionVehicle("vw-polo-track-2024", "Volkswagen", "Polo", "Track 1.0", 2024, "Hatch compacto", "Manual", "flex", 13.9, 79000, 11.8, "Muito comum em app urbano"),
  combustionVehicle("vw-polo-tsi-2026", "Volkswagen", "Polo", "1.0 TSI", 2026, "Hatch compacto", "Automático", "flex", 13.4, 92000, 12.2, "Hatch econômico para cidade"),
  combustionVehicle("gm-onix-lt-2024", "Chevrolet", "Onix", "LT 1.0", 2024, "Hatch compacto", "Manual", "flex", 14.1, 78000, 11.9, "Muito comum em corridas curtas"),
  combustionVehicle("gm-onix-turbo-2026", "Chevrolet", "Onix", "1.0 Turbo", 2026, "Hatch compacto", "Automático", "flex", 13.1, 98000, 12.3, "Hatch equilibrado para app"),
  combustionVehicle("fiat-argo-drive-2024", "Fiat", "Argo", "Drive 1.0", 2024, "Hatch compacto", "Manual", "flex", 13.8, 76000, 11.4, "Popular entre autônomos"),
  combustionVehicle("fiat-argo-cvt-2026", "Fiat", "Argo", "1.3 CVT", 2026, "Hatch compacto", "Automático", "flex", 12.8, 96000, 12.1, "Hatch confortável para uso diário"),
  combustionVehicle("hyundai-hb20-comfort-2024", "Hyundai", "HB20", "Comfort 1.0", 2024, "Hatch compacto", "Manual", "flex", 14.0, 79000, 11.6, "Muito escolhido para app"),
  combustionVehicle("hyundai-hb20-tgdi-2026", "Hyundai", "HB20", "1.0 TGDI", 2026, "Hatch compacto", "Automático", "flex", 13.2, 101000, 12.4, "Hatch ágil para cidade"),
  combustionVehicle("renault-kwid-zen-2024", "Renault", "Kwid", "Zen 1.0", 2024, "Subcompacto", "Manual", "flex", 15.1, 65000, 11.1, "Entrada econômica para rodar"),
  combustionVehicle("renault-kwid-intense-2026", "Renault", "Kwid", "Intense 1.0", 2026, "Subcompacto", "Manual", "flex", 14.7, 71000, 11.5, "Baixo custo para cidade"),
  combustionVehicle("fiat-mobi-like-2024", "Fiat", "Mobi", "Like 1.0", 2024, "Subcompacto", "Manual", "flex", 14.3, 63000, 11.2, "Compacto para regiões centrais"),
  combustionVehicle("fiat-mobi-trekking-2026", "Fiat", "Mobi", "Trekking 1.0", 2026, "Subcompacto", "Manual", "flex", 13.9, 69000, 11.6, "Compacto leve e urbano"),
  combustionVehicle("vw-gol-2022", "Volkswagen", "Gol", "1.0", 2022, "Hatch compacto", "Manual", "flex", 13.4, 56000, 9.8, "Frota antiga muito comum"),
  combustionVehicle("vw-up-tsi-2021", "Volkswagen", "Up", "1.0 TSI", 2021, "Subcompacto", "Manual", "flex", 15.0, 62000, 10.2, "Muito econômico em app"),
  combustionVehicle("vw-fox-connect-2021", "Volkswagen", "Fox", "Connect 1.6", 2021, "Hatch compacto", "Manual", "flex", 12.1, 59000, 9.7, "Usado comum em app"),
  combustionVehicle("ford-ka-se-2021", "Ford", "Ka", "SE 1.0", 2021, "Hatch compacto", "Manual", "flex", 13.7, 52000, 9.6, "Usado popular em cidades"),
  combustionVehicle("fiat-palio-2018", "Fiat", "Palio", "1.0 Fire", 2018, "Hatch compacto", "Manual", "flex", 12.9, 36000, 8.4, "Frota de entrada ainda comum"),
  combustionVehicle("fiat-punto-2017", "Fiat", "Punto", "1.6 Essence", 2017, "Hatch compacto", "Manual", "flex", 11.3, 39000, 8.1, "Usado com bom espaço"),
  combustionVehicle("gm-onix-plus-2026", "Chevrolet", "Onix Plus", "1.0 Turbo", 2026, "Sedã compacto", "Automático", "flex", 14.3, 108000, 12.4, "Sedã econômico para app"),
  combustionVehicle("vw-virtus-2025", "Volkswagen", "Virtus", "1.0 TSI", 2025, "Sedã compacto", "Automático", "flex", 14.0, 118000, 12.5, "Sedã espaçoso para aeroporto"),
  combustionVehicle("vw-virtus-exclusive-2026", "Volkswagen", "Virtus", "Exclusive 1.4", 2026, "Sedã compacto", "Automático", "flex", 12.7, 145000, 13.2, "Sedã premium de app"),
  combustionVehicle("hyundai-hb20s-comfort-2024", "Hyundai", "HB20S", "Comfort 1.0", 2024, "Sedã compacto", "Manual", "flex", 14.1, 83000, 11.8, "Sedã econômico para rodar"),
  combustionVehicle("hyundai-hb20s-tgdi-2026", "Hyundai", "HB20S", "1.0 TGDI", 2026, "Sedã compacto", "Automático", "flex", 13.8, 109000, 12.5, "Sedã moderno para app"),
  combustionVehicle("nissan-versa-advance-2025", "Nissan", "Versa", "Advance 1.6", 2025, "Sedã compacto", "Automático", "flex", 14.2, 121000, 12.2, "Muito usado em viagens urbanas"),
  combustionVehicle("nissan-versa-sense-2024", "Nissan", "Versa", "Sense 1.6", 2024, "Sedã compacto", "Manual", "flex", 13.8, 104000, 11.7, "Sedã confortável e racional"),
  combustionVehicle("fiat-cronos-drive-2025", "Fiat", "Cronos", "Drive 1.3 CVT", 2025, "Sedã compacto", "Automático", "flex", 13.6, 103000, 11.8, "Sedã de custo controlado"),
  combustionVehicle("fiat-grand-siena-2021", "Fiat", "Grand Siena", "1.4 Attractive", 2021, "Sedã compacto", "Manual", "flex", 12.2, 54000, 9.6, "Frota antiga muito presente"),
  combustionVehicle("fiat-siena-2019", "Fiat", "Siena", "1.4", 2019, "Sedã compacto", "Manual", "flex", 11.8, 43000, 8.9, "Sedã simples de rodagem"),
  combustionVehicle("chevrolet-prisma-2020", "Chevrolet", "Prisma", "1.4 LT", 2020, "Sedã compacto", "Manual", "flex", 12.6, 51000, 9.4, "Sedã usado de app"),
  combustionVehicle("chevrolet-cobalt-2020", "Chevrolet", "Cobalt", "1.8 LTZ", 2020, "Sedã médio", "Automático", "flex", 10.6, 58000, 9.1, "Espaço interno valorizado"),
  combustionVehicle("ford-ka-sedan-2021", "Ford", "Ka Sedan", "SE 1.5", 2021, "Sedã compacto", "Manual", "flex", 13.1, 55000, 9.5, "Sedã econômico usado"),
  combustionVehicle("renault-logan-life-2021", "Renault", "Logan", "Life 1.0", 2021, "Sedã compacto", "Manual", "flex", 13.3, 52000, 9.4, "Muito comum em frota"),
  combustionVehicle("renault-logan-zen-2022", "Renault", "Logan", "Zen 1.6 CVT", 2022, "Sedã compacto", "Automático", "flex", 12.5, 63000, 9.8, "Sedã robusto para app"),
  combustionVehicle("renault-fluence-2019", "Renault", "Fluence", "2.0 CVT", 2019, "Sedã médio", "Automático", "flex", 10.1, 56000, 8.8, "Sedã confortável de usado"),
  combustionVehicle("honda-city-sedan-2025", "Honda", "City", "Sedan EX", 2025, "Sedã compacto", "Automático", "flex", 14.1, 128000, 12.4, "Sedã eficiente e confortável"),
  combustionVehicle("honda-city-sedan-2026", "Honda", "City", "Sedan Touring", 2026, "Sedã compacto", "Automático", "flex", 13.4, 143000, 12.8, "Sedã premium para viagens"),
  combustionVehicle("honda-civic-exl-2021", "Honda", "Civic", "EXL 2.0", 2021, "Sedã médio", "Automático", "flex", 11.2, 115000, 10.1, "Sedã de conforto para app"),
  combustionVehicle("nissan-sentra-advance-2024", "Nissan", "Sentra", "Advance 2.0", 2024, "Sedã médio", "Automático", "gasolina", 12.0, 155000, 12.6, "Sedã médio confortável"),
  combustionVehicle("toyota-corolla-2025", "Toyota", "Corolla", "2.0 Flex", 2025, "Sedã médio", "Automático", "flex", 11.8, 158000, 11.6, "Referência de conforto em app"),
  hybridVehicle("byd-king-gl-2026", "BYD", "King", "GL DM-i", 2026, "Sedã médio", 16.8, 173000, 15.4, "Híbrido plug-in muito procurado"),
  hybridVehicle("byd-king-gs-2026", "BYD", "King", "GS DM-i", 2026, "Sedã médio", 16.2, 187000, 15.8, "Híbrido plug-in com foco em conforto"),
  combustionVehicle("toyota-yaris-sedan-2024", "Toyota", "Yaris Sedan", "1.5 CVT", 2024, "Sedã compacto", "Automático", "flex", 13.4, 98000, 11.5, "Sedã confiável para rodar"),
  combustionVehicle("toyota-etios-sedan-2021", "Toyota", "Etios Sedan", "1.5 X Plus", 2021, "Sedã compacto", "Automático", "flex", 13.6, 64000, 9.5, "Usado durável e econômico"),
  combustionVehicle("hyundai-elantra-2020", "Hyundai", "Elantra", "2.0", 2020, "Sedã médio", "Automático", "flex", 10.5, 92000, 9.6, "Sedã médio ainda desejado"),
  combustionVehicle("kia-cerato-2021", "Kia", "Cerato", "2.0", 2021, "Sedã médio", "Automático", "flex", 10.4, 99000, 9.8, "Sedã confortável para viagens"),
  combustionVehicle("vw-voyage-2022", "Volkswagen", "Voyage", "1.0", 2022, "Sedã compacto", "Manual", "flex", 13.0, 58000, 9.7, "Sedã simples de operação"),
  combustionVehicle("gm-joy-plus-2021", "Chevrolet", "Joy Plus", "1.0", 2021, "Sedã compacto", "Manual", "flex", 13.5, 50000, 9.2, "Sedã enxuto para rodar"),
  combustionVehicle("honda-fit-ex-2021", "Honda", "Fit", "EX 1.5 CVT", 2021, "Monovolume compacto", "Automático", "flex", 12.8, 76000, 9.4, "Versátil e bem aceito"),
  combustionVehicle("toyota-etios-hatch-2021", "Toyota", "Etios", "X Plus 1.5", 2021, "Hatch compacto", "Automático", "flex", 13.8, 61000, 9.3, "Usado muito confiável"),
  combustionVehicle("renault-sandero-2021", "Renault", "Sandero", "Zen 1.0", 2021, "Hatch compacto", "Manual", "flex", 13.5, 51000, 9.2, "Espaço bom para preço"),
  combustionVehicle("nissan-march-2020", "Nissan", "March", "1.6 SV", 2020, "Hatch compacto", "Manual", "flex", 13.1, 48000, 9.0, "Compacto ágil para cidade"),
  combustionVehicle("honda-city-hatch-2025", "Honda", "City", "Hatch EXL", 2025, "Hatch premium", "Automático", "flex", 13.6, 129000, 12.3, "Hatch refinado para app"),
  combustionVehicle("toyota-yaris-hatch-2024", "Toyota", "Yaris", "XS 1.5 CVT", 2024, "Hatch compacto", "Automático", "flex", 13.2, 94000, 11.4, "Hatch confiável e equilibrado"),
  combustionVehicle("peugeot-208-style-2026", "Peugeot", "208", "Style 1.0 Turbo", 2026, "Hatch compacto", "Automático", "flex", 13.7, 101000, 12.3, "Hatch moderno para app"),
  combustionVehicle("citroen-c3-live-2026", "Citroën", "C3", "Live 1.0", 2026, "Hatch compacto", "Manual", "flex", 13.5, 79000, 11.8, "Entrada espaçosa para cidade"),
  combustionVehicle("citroen-c4-cactus-2023", "Citroën", "C4 Cactus", "Feel 1.6", 2023, "SUV compacto", "Automático", "flex", 11.8, 92000, 10.7, "SUV leve para uso urbano"),
  combustionVehicle("citroen-basalt-2026", "Citroën", "Basalt", "1.0 Turbo", 2026, "SUV cupê", "Automático", "flex", 12.9, 107000, 12.8, "Crossover espaçoso para app"),
  combustionVehicle("peugeot-2008-2026", "Peugeot", "2008", "1.0 Turbo", 2026, "SUV compacto", "Automático", "flex", 12.4, 128000, 13.1, "SUV compacto para corridas longas"),
  combustionVehicle("hyundai-creta-comfort-2025", "Hyundai", "Creta", "Comfort 1.0 TGDI", 2025, "SUV compacto", "Automático", "flex", 12.1, 142000, 12.8, "SUV muito pedido em app"),
  combustionVehicle("hyundai-creta-limited-2026", "Hyundai", "Creta", "Limited 1.0 TGDI", 2026, "SUV compacto", "Automático", "flex", 11.8, 156000, 13.1, "SUV confortável para aeroporto"),
  combustionVehicle("vw-tcross-200tsi-2026", "Volkswagen", "T-Cross", "200 TSI", 2026, "SUV compacto", "Automático", "flex", 12.2, 149000, 12.9, "SUV popular de uso misto"),
  combustionVehicle("vw-nivus-comfortline-2026", "Volkswagen", "Nivus", "Comfortline 200 TSI", 2026, "SUV cupê", "Automático", "flex", 12.5, 145000, 12.8, "Crossover moderno e econômico"),
  combustionVehicle("vw-taos-comfortline-2025", "Volkswagen", "Taos", "Comfortline 1.4", 2025, "SUV médio", "Automático", "gasolina", 11.0, 187000, 13.3, "SUV médio para corridas premium"),
  combustionVehicle("chevrolet-tracker-at-2026", "Chevrolet", "Tracker", "AT Turbo", 2026, "SUV compacto", "Automático", "flex", 12.6, 143000, 12.8, "SUV prático para cidade"),
  combustionVehicle("chevrolet-spin-lt-2025", "Chevrolet", "Spin", "LT 1.8", 2025, "Monovolume", "Automático", "flex", 10.4, 129000, 11.9, "Muito útil para passageiros e bagagem"),
  combustionVehicle("chevrolet-montana-lt-2026", "Chevrolet", "Montana", "LT Turbo", 2026, "Picape compacta", "Automático", "flex", 11.7, 146000, 13.0, "Uso misto entre cidade e trabalho"),
  combustionVehicle("fiat-pulse-drive-2026", "Fiat", "Pulse", "Drive 1.3 CVT", 2026, "SUV compacto", "Automático", "flex", 12.4, 127000, 12.7, "SUV leve para app urbano"),
  combustionVehicle("fiat-fastback-t200-2026", "Fiat", "Fastback", "T200", 2026, "SUV cupê", "Automático", "flex", 12.1, 142000, 13.1, "Crossover com porta-malas forte"),
  combustionVehicle("fiat-toro-freedom-2026", "Fiat", "Toro", "Freedom Turbo 270", 2026, "Picape média", "Automático", "flex", 9.8, 165000, 13.6, "Uso misto e viagens longas"),
  combustionVehicle("jeep-renegade-longitude-2026", "Jeep", "Renegade", "Longitude T270", 2026, "SUV compacto", "Automático", "flex", 10.9, 152000, 13.5, "SUV robusto para app"),
  combustionVehicle("jeep-compass-sport-2026", "Jeep", "Compass", "Sport T270", 2026, "SUV médio", "Automático", "flex", 10.6, 192000, 13.7, "SUV premium para viagens"),
  combustionVehicle("jeep-commander-limited-2025", "Jeep", "Commander", "Limited T270", 2025, "SUV grande", "Automático", "flex", 9.9, 219000, 14.2, "Mais espaço para corridas executivas"),
  combustionVehicle("nissan-kicks-sense-2026", "Nissan", "Kicks", "Sense 1.0 Turbo", 2026, "SUV compacto", "Automático", "flex", 12.9, 149000, 12.9, "SUV confortável para cidade"),
  combustionVehicle("honda-hrv-ex-2026", "Honda", "HR-V", "EX 1.5 Turbo", 2026, "SUV compacto", "Automático", "flex", 11.9, 168000, 13.1, "SUV valorizado por conforto"),
  combustionVehicle("honda-wrv-2026", "Honda", "WR-V", "1.5", 2026, "SUV compacto", "Automático", "flex", 12.8, 131000, 12.6, "SUV urbano com boa altura"),
  combustionVehicle("renault-duster-iconic-2025", "Renault", "Duster", "Iconic 1.3 Turbo", 2025, "SUV compacto", "Automático", "flex", 11.3, 136000, 12.4, "SUV espaçoso para app"),
  combustionVehicle("renault-kardian-techno-2026", "Renault", "Kardian", "Techno 1.0 Turbo", 2026, "SUV compacto", "Automático", "flex", 13.1, 124000, 12.7, "SUV compacto recente"),
  combustionVehicle("renault-captur-intense-2021", "Renault", "Captur", "Intense 1.6 CVT", 2021, "SUV compacto", "Automático", "flex", 10.8, 78000, 10.1, "SUV usado para rodagem"),
  combustionVehicle("renault-oroch-pro-2025", "Renault", "Oroch", "Pro 1.3 Turbo", 2025, "Picape compacta", "Automático", "flex", 10.6, 135000, 12.9, "Uso misto em cidade e estrada"),
  combustionVehicle("caoa-tiggo5x-sport-2026", "CAOA Chery", "Tiggo 5x", "Sport 1.5T", 2026, "SUV compacto", "Automático", "gasolina", 11.4, 136000, 13.4, "SUV confortável para viagens"),
  combustionVehicle("caoa-tiggo7-sport-2026", "CAOA Chery", "Tiggo 7", "Sport 1.6T", 2026, "SUV médio", "Automático", "gasolina", 10.7, 169000, 13.8, "SUV médio com bom espaço"),
  combustionVehicle("caoa-tiggo8-2025", "CAOA Chery", "Tiggo 8", "1.6T", 2025, "SUV grande", "Automático", "gasolina", 10.1, 184000, 14.0, "SUV grande para viagens"),
  combustionVehicle("caoa-arrizo6-2025", "CAOA Chery", "Arrizo 6", "PRO 1.5T", 2025, "Sedã médio", "Automático", "gasolina", 12.1, 126000, 12.7, "Sedã com bom custo-benefício"),
  combustionVehicle("caoa-arrizo5-2024", "CAOA Chery", "Arrizo 5", "1.5 CVT", 2024, "Sedã compacto", "Automático", "flex", 12.9, 93000, 11.8, "Sedã confortável para cidade"),
  combustionVehicle("toyota-corolla-cross-2026", "Toyota", "Corolla Cross", "XR 2.0", 2026, "SUV médio", "Automático", "flex", 11.2, 189000, 12.9, "SUV médio muito valorizado"),
  combustionVehicle("mitsubishi-asx-2021", "Mitsubishi", "ASX", "2.0 CVT", 2021, "SUV compacto", "Automático", "gasolina", 10.1, 99000, 10.1, "SUV usado de boa robustez"),
  combustionVehicle("mitsubishi-eclipse-cross-2025", "Mitsubishi", "Eclipse Cross", "1.5T", 2025, "SUV médio", "Automático", "gasolina", 10.4, 182000, 13.1, "SUV médio de perfil premium"),
  combustionVehicle("hyundai-ix35-2021", "Hyundai", "ix35", "2.0", 2021, "SUV compacto", "Automático", "flex", 9.5, 98000, 9.8, "SUV usado muito comum"),
  combustionVehicle("ford-ecosport-se-2021", "Ford", "EcoSport", "SE 1.5", 2021, "SUV compacto", "Automático", "flex", 10.7, 74000, 9.9, "SUV urbano de usado"),
  combustionVehicle("ford-fiesta-sedan-2019", "Ford", "Fiesta Sedan", "1.6", 2019, "Sedã compacto", "Manual", "flex", 12.0, 47000, 8.9, "Sedã usado para app"),
  combustionVehicle("ford-focus-sedan-2018", "Ford", "Focus Sedan", "2.0", 2018, "Sedã médio", "Automático", "flex", 10.1, 52000, 8.6, "Sedã espaçoso de rodagem"),
  combustionVehicle("peugeot-301-2019", "Peugeot", "301", "1.6", 2019, "Sedã compacto", "Manual", "flex", 12.2, 44000, 8.7, "Sedã pouco comum, mas útil"),
  combustionVehicle("omoda-5-2026", "Omoda", "Omoda 5", "1.5T", 2026, "SUV compacto", "Automático", "gasolina", 11.0, 164000, 14.0, "SUV novo com proposta urbana"),
  combustionVehicle("ford-territory-2026", "Ford", "Territory", "1.5T", 2026, "SUV médio", "Automático", "gasolina", 10.2, 215000, 14.1, "SUV médio focado em conforto"),
  combustionVehicle("vw-tera-2026", "Volkswagen", "Tera", "1.0 TSI", 2026, "SUV compacto", "Automático", "flex", 12.8, 118000, 13.1, "SUV novo com foco urbano"),
  combustionVehicle("renault-boreal-2026", "Renault", "Boreal", "1.3 Turbo", 2026, "SUV médio", "Automático", "flex", 11.1, 175000, 13.6, "SUV médio para viagens"),
  electricVehicle("byd-dolphin-mini-2026", "BYD", "Dolphin Mini", "EV", 2026, "Hatch compacto", 7.5, 118000, 16.5, "Elétrico popular de baixo custo"),
  electricVehicle("byd-dolphin-gs-2025", "BYD", "Dolphin", "GS", 2025, "Hatch médio", 6.8, 144000, 15.9, "Elétrico urbano bem difundido"),
  electricVehicle("byd-dolphin-plus-2026", "BYD", "Dolphin", "Plus", 2026, "Hatch médio", 6.6, 159000, 16.2, "Elétrico confortável para rodar"),
  electricVehicle("byd-yuan-pro-2026", "BYD", "Yuan Pro", "EV", 2026, "SUV compacto", 6.1, 176000, 16.8, "SUV elétrico para cidade"),
  electricVehicle("byd-seal-2026", "BYD", "Seal", "EV", 2026, "Sedã médio", 5.9, 244000, 17.4, "Elétrico premium de rodagem"),
  electricVehicle("byd-han-2025", "BYD", "Han", "EV", 2025, "Sedã grande", 5.5, 338000, 17.9, "Executivo elétrico"),
  electricVehicle("renault-e-kwid-2026", "Renault", "Kwid E-Tech", "EV", 2026, "Subcompacto", 6.9, 102000, 15.6, "Elétrico de entrada"),
  electricVehicle("gwm-ora-03-skin-2026", "GWM", "ORA 03", "Skin", 2026, "Hatch médio", 6.1, 158000, 16.7, "Elétrico com visual urbano"),
  electricVehicle("gwm-ora-03-gt-2026", "GWM", "ORA 03", "GT", 2026, "Hatch médio", 5.8, 184000, 17.2, "Elétrico mais forte para uso misto"),
  electricVehicle("geely-ex2-2026", "Geely", "EX2", "EV", 2026, "SUV compacto", 5.8, 135000, 16.0, "Elétrico urbano compacto"),
  electricVehicle("volvo-ex30-2026", "Volvo", "EX30", "Core", 2026, "SUV compacto", 5.6, 239000, 17.5, "Elétrico premium compacto"),
  electricVehicle("volvo-xc40-recharge-2025", "Volvo", "XC40 Recharge", "Pure Electric", 2025, "SUV médio", 5.2, 279000, 17.7, "SUV elétrico premium"),
  electricVehicle("mini-cooper-se-2025", "Mini", "Cooper SE", "EV", 2025, "Hatch compacto", 6.0, 229000, 17.0, "Elétrico urbano premium"),
  electricVehicle("bmw-ix1-2025", "BMW", "iX1", "eDrive20", 2025, "SUV compacto", 5.4, 312000, 18.1, "SUV elétrico executivo"),
  electricVehicle("peugeot-e2008-2025", "Peugeot", "e-2008", "EV", 2025, "SUV compacto", 5.8, 219000, 17.1, "SUV elétrico de uso urbano"),
  electricVehicle("kia-ev5-2026", "Kia", "EV5", "EV", 2026, "SUV médio", 5.5, 255000, 17.6, "SUV elétrico familiar"),
  electricVehicle("jac-ejs1-2025", "JAC", "E-JS1", "EV", 2025, "Subcompacto", 6.4, 129000, 15.9, "Elétrico leve para cidade"),
  electricVehicle("jac-ejs4-2025", "JAC", "E-JS4", "EV", 2025, "SUV compacto", 5.7, 188000, 16.6, "SUV elétrico compacto"),
  electricVehicle("nissan-leaf-2024", "Nissan", "Leaf", "EV", 2024, "Hatch médio", 5.9, 189000, 16.4, "Elétrico tradicional"),
  electricVehicle("seres-3-2025", "Seres", "3", "EV", 2025, "SUV compacto", 5.4, 199000, 16.8, "SUV elétrico para cidade"),
  electricVehicle("caoa-icar-2025", "CAOA", "iCar", "EV", 2025, "Subcompacto", 6.7, 120000, 16.0, "Elétrico urbano de entrada"),
  electricVehicle("chevrolet-bolt-euv-2024", "Chevrolet", "Bolt EUV", "EV", 2024, "SUV compacto", 5.6, 229000, 17.0, "Elétrico com boa autonomia"),
];

export const platformMeta: Record<
  PlatformKey,
  {
    badge: string;
    color: string;
    label: string;
    shortLabel: string;
    todayRevenue: number;
  }
> = {
  "99": {
    badge: "99",
    color: "#ffd200",
    label: "99",
    shortLabel: "99",
    todayRevenue: 0,
  },
  indrive: {
    badge: "iD",
    color: "#51c26d",
    label: "inDrive",
    shortLabel: "iD",
    todayRevenue: 0,
  },
  uber: {
    badge: "U",
    color: "#f5f4f0",
    label: "Uber",
    shortLabel: "Uber",
    todayRevenue: 0,
  },
};

export const platformMetrics: Record<PlatformKey, PlatformMetrics> = {
  "99": {
    avgDayKm: 0,
    currentGainPerKm: 0,
    currentHourly: 0,
    dayKm: 0,
    dayNet: 0,
    dayRevenue: 0,
    efficiency: 0,
    fuelAverage: 0,
    fuelEstimate: 0,
    hourlyBenchmark: 0,
    monthCost: 0,
    monthGoal: 0,
    monthGross: 0,
    monthRides: 0,
    onlineMinutes: 0,
    prevWeekGainPerKm: 0,
    previousAvgRide: 0,
    previousMonthGross: 0,
    previousMonthRides: 0,
    ridesToday: 0,
    ridesYesterday: 0,
    yesterdayRevenue: 0,
  },
  indrive: {
    avgDayKm: 0,
    currentGainPerKm: 0,
    currentHourly: 0,
    dayKm: 0,
    dayNet: 0,
    dayRevenue: 0,
    efficiency: 0,
    fuelAverage: 0,
    fuelEstimate: 0,
    hourlyBenchmark: 0,
    monthCost: 0,
    monthGoal: 0,
    monthGross: 0,
    monthRides: 0,
    onlineMinutes: 0,
    prevWeekGainPerKm: 0,
    previousAvgRide: 0,
    previousMonthGross: 0,
    previousMonthRides: 0,
    ridesToday: 0,
    ridesYesterday: 0,
    yesterdayRevenue: 0,
  },
  uber: {
    avgDayKm: 0,
    currentGainPerKm: 0,
    currentHourly: 0,
    dayKm: 0,
    dayNet: 0,
    dayRevenue: 0,
    efficiency: 0,
    fuelAverage: 0,
    fuelEstimate: 0,
    hourlyBenchmark: 0,
    monthCost: 0,
    monthGoal: 0,
    monthGross: 0,
    monthRides: 0,
    onlineMinutes: 0,
    prevWeekGainPerKm: 0,
    previousAvgRide: 0,
    previousMonthGross: 0,
    previousMonthRides: 0,
    ridesToday: 0,
    ridesYesterday: 0,
    yesterdayRevenue: 0,
  },
};

export const weeklyRevenueBars = [
  { day: "Seg", indrive: 0, n99: 0, uber: 0 },
  { day: "Ter", indrive: 0, n99: 0, uber: 0 },
  { day: "Qua", indrive: 0, n99: 0, uber: 0 },
  { day: "Qui", indrive: 0, n99: 0, uber: 0 },
  { day: "Sex", indrive: 0, n99: 0, uber: 0 },
  { day: "Sáb", indrive: 0, n99: 0, uber: 0 },
  { day: "Hoje", indrive: 0, n99: 0, uber: 0 },
];

export const dashboardInsights: DashboardInsight[] = [];

export const rides: Ride[] = [];

export const monthlyCosts: CostItem[] = [];

export const heatmapLabels = ["0h", "3h", "6h", "9h", "12h", "15h", "18h", "21h"];

export const heatmapRows: HeatmapRow[] = [
  { day: "Seg", values: [0, 0, 0, 0, 0, 0, 0, 0] },
  { day: "Ter", values: [0, 0, 0, 0, 0, 0, 0, 0] },
  { day: "Qua", values: [0, 0, 0, 0, 0, 0, 0, 0] },
  { day: "Qui", values: [0, 0, 0, 0, 0, 0, 0, 0] },
  { day: "Sex", values: [0, 0, 0, 0, 0, 0, 0, 0] },
  { day: "Sáb", values: [0, 0, 0, 0, 0, 0, 0, 0] },
  { day: "Dom", values: [0, 0, 0, 0, 0, 0, 0, 0] },
];

export const bestRegions: BestRegion[] = [];

export const upcomingEvents: UpcomingEvent[] = [];

export const fuelEntries: FuelEntry[] = [];

export const maintenanceTasks: MaintenanceTask[] = [];

export const monthlyReports: MonthlyReport[] = [];

export const settingsSections: Array<{ key: SettingsSectionKey; label: string }> = [
  { key: "perfil", label: "Perfil" },
  { key: "plataformas", label: "Plataformas" },
  { key: "metas", label: "Metas" },
  { key: "veiculo", label: "Veículo" },
  { key: "notificacoes", label: "Notificações" },
  { key: "aparencia", label: "Aparência" },
  { key: "plano", label: "Plano & cobrança" },
  { key: "privacidade", label: "Dados & privacidade" },
];

export const fontOptions = [
  { key: "syne", label: "Syne", preview: "12.480", variable: "var(--panel-font-syne)" },
  { key: "sora", label: "Sora", preview: "12.480", variable: "var(--panel-font-sora)" },
  { key: "space", label: "Space Grotesk", preview: "12.480", variable: "var(--panel-font-space)" },
  { key: "bricolage", label: "Bricolage", preview: "12.480", variable: "var(--panel-font-bricolage)" },
] as const;

export type FontOptionKey = (typeof fontOptions)[number]["key"];
