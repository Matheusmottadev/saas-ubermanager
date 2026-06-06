import { NextResponse } from "next/server";

import { getStripeServerClient } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      planId?: "basic" | "pro";
    };

    const stripe = getStripeServerClient();
    const setupIntent = await stripe.setupIntents.create({
      metadata: {
        planId: body.planId === "pro" ? "pro" : "basic",
        source: "onboarding",
      },
      payment_method_types: ["card"],
      usage: "off_session",
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    });
  } catch (error) {
    console.error("stripe setup intent failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível iniciar a validação do cartão." },
      { status: 500 },
    );
  }
}
