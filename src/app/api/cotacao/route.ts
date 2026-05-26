import { NextResponse } from "next/server";

const pricePerMinute = 1;
const pricePerKm = 2.15;
const minimumFare = 45;
const cghExtraFare = 15;
const gruExtraFare = 30;
const busTerminalExtraFare = 12;
const lateNightMultiplier = 1.15;

type QuoteRequest = {
  origin?: string;
  destination?: string;
  stop?: string;
  departureTime?: string;
};

type GoogleRouteResponse = {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
  }>;
  error?: {
    message?: string;
  };
};

type FareAdjustment = {
  label: string;
  amount: number;
};

const googleTimeoutMs = 12000;

const parseDurationSeconds = (duration?: string) => {
  if (!duration) {
    return 0;
  }

  return Number.parseFloat(duration.replace("s", ""));
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const getLocationAdjustments = (origin: string, destination: string) => {
  const text = normalizeText(`${origin} ${destination}`);
  const adjustments: FareAdjustment[] = [];

  if (
    text.includes("guarulhos") ||
    text.includes("gru") ||
    text.includes("aeroporto internacional de sao paulo")
  ) {
    adjustments.push({
      label: "Adicional aeroporto GRU",
      amount: gruExtraFare,
    });
  } else if (
    text.includes("congonhas") ||
    text.includes("cgh") ||
    text.includes("deputado freitas nobre")
  ) {
    adjustments.push({
      label: "Adicional aeroporto CGH",
      amount: cghExtraFare,
    });
  }

  if (
    text.includes("rodoviaria") ||
    text.includes("terminal tiete") ||
    text.includes("terminal tiete") ||
    text.includes("barra funda") ||
    text.includes("jabaquara")
  ) {
    adjustments.push({
      label: "Adicional rodoviaria",
      amount: busTerminalExtraFare,
    });
  }

  return adjustments;
};

const getLateNightAdjustment = (departureTime: string, baseFare: number) => {
  const hour = new Date(departureTime).getHours();

  if (hour >= 22 || hour < 6) {
    return {
      label: "Adicional madrugada",
      amount: Math.ceil(baseFare * (lateNightMultiplier - 1)),
    };
  }

  return null;
};

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Chave do Google Maps não configurada." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as QuoteRequest;

  if (!body.origin || !body.destination || !body.departureTime) {
    return NextResponse.json(
      { error: "Origem, destino e horário são obrigatórios." },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), googleTimeoutMs);

  let googleResponse: Response;
  let data: GoogleRouteResponse;

  try {
    googleResponse = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
        },
        body: JSON.stringify({
          origin: { address: body.origin },
          destination: { address: body.destination },
          intermediates: body.stop ? [{ address: body.stop }] : undefined,
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE_OPTIMAL",
          departureTime: body.departureTime,
          languageCode: "pt-BR",
          units: "METRIC",
        }),
        signal: controller.signal,
      },
    );

    data = (await googleResponse.json()) as GoogleRouteResponse;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json(
        { error: "A consulta demorou demais para responder." },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { error: "Falha ao consultar a rota no Google Maps." },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!googleResponse.ok || !data.routes?.[0]) {
    return NextResponse.json(
      {
        error:
          data.error?.message ??
          "Não foi possível calcular a cotação desta corrida.",
      },
      { status: 502 },
    );
  }

  const route = data.routes[0];
  const distanceMeters = route.distanceMeters ?? 0;
  const durationSeconds = parseDurationSeconds(route.duration);
  const distanceKm = distanceMeters / 1000;
  const durationMinutes = Math.ceil(durationSeconds / 60);
  const routeBasedFare = Math.ceil(
    durationMinutes * pricePerMinute + distanceKm * pricePerKm,
  );
  const minimumAppliedFare = Math.max(minimumFare, routeBasedFare);
  const locationAdjustments = getLocationAdjustments(
    body.origin,
    body.destination,
  );
  const lateNightAdjustment = getLateNightAdjustment(
    body.departureTime,
    minimumAppliedFare,
  );
  const adjustments = lateNightAdjustment
    ? [...locationAdjustments, lateNightAdjustment]
    : locationAdjustments;
  const adjustmentTotal = adjustments.reduce(
    (total, adjustment) => total + adjustment.amount,
    0,
  );
  const estimatedFare = minimumAppliedFare + adjustmentTotal;

  return NextResponse.json({
    distanceKm: Number(distanceKm.toFixed(1)),
    durationMinutes,
    estimatedFare,
    routeBasedFare,
    minimumFare,
    adjustmentTotal,
    adjustments,
    currency: "BRL",
    pricePerMinute,
    pricePerKm,
  });
}
