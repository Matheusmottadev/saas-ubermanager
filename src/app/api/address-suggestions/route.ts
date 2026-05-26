import { NextResponse } from "next/server";

type SuggestionRequest = {
  input?: string;
};

type PlacesAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: {
        text?: string;
      };
      structuredFormat?: {
        mainText?: {
          text?: string;
        };
        secondaryText?: {
          text?: string;
        };
      };
    };
  }>;
  error?: {
    message?: string;
  };
};

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Chave do Google Maps não configurada." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as SuggestionRequest;

  if (!body.input || body.input.trim().length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text",
    },
    body: JSON.stringify({
      input: body.input,
      includedRegionCodes: ["BR"],
      languageCode: "pt-BR",
      regionCode: "BR",
    }),
  });

  const data = (await response.json()) as PlacesAutocompleteResponse;

  if (!response.ok) {
    return NextResponse.json(
      {
        error:
          data.error?.message ??
          "Nao foi possivel buscar sugestoes de endereco.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    suggestions: (data.suggestions ?? [])
      .map((item) => {
        const prediction = item.placePrediction;

        if (!prediction?.text?.text) {
          return null;
        }

        return {
          placeId: prediction.placeId ?? "",
          text: prediction.text.text,
          mainText: prediction.structuredFormat?.mainText?.text ?? prediction.text.text,
          secondaryText: prediction.structuredFormat?.secondaryText?.text ?? "",
        };
      })
      .filter(Boolean),
  });
}
