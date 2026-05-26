import { NextResponse } from "next/server";

type AddressDetailsRequest = {
  placeId?: string;
};

type PlaceDetailsResponse = {
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];
  }>;
  formattedAddress?: string;
  error?: {
    message?: string;
  };
};

const getComponent = (
  components: NonNullable<PlaceDetailsResponse["addressComponents"]>,
  type: string,
) => components.find((component) => component.types?.includes(type));

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Chave do Google Maps não configurada." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as AddressDetailsRequest;

  if (!body.placeId) {
    return NextResponse.json(
      { error: "Place ID obrigatório." },
      { status: 400 },
    );
  }

  const response = await fetch(
    `https://places.googleapis.com/v1/places/${body.placeId}`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "addressComponents,formattedAddress",
      },
    },
  );

  const data = (await response.json()) as PlaceDetailsResponse;

  if (!response.ok) {
    return NextResponse.json(
      {
        error:
          data.error?.message ??
          "Nao foi possivel carregar os detalhes do endereco.",
      },
      { status: 502 },
    );
  }

  const components = data.addressComponents ?? [];
  const streetNumber = getComponent(components, "street_number")?.longText ?? "";
  const route = getComponent(components, "route")?.longText ?? "";
  const neighborhood =
    getComponent(components, "sublocality_level_1")?.longText ??
    getComponent(components, "sublocality")?.longText ??
    getComponent(components, "neighborhood")?.longText ??
    "";
  const city =
    getComponent(components, "locality")?.longText ??
    getComponent(components, "administrative_area_level_2")?.longText ??
    "";
  const state =
    getComponent(components, "administrative_area_level_1")?.shortText ?? "";
  const postalCode = getComponent(components, "postal_code")?.longText ?? "";

  return NextResponse.json({
    street: route,
    number: streetNumber,
    neighborhood,
    city: [city, state].filter(Boolean).join(" - "),
    cep: postalCode,
    formattedAddress: data.formattedAddress ?? "",
  });
}
