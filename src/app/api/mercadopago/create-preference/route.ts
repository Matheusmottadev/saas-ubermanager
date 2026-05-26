import { MercadoPagoConfig, Preference } from "mercadopago";
import type { PaymentMethods } from "mercadopago/dist/clients/preference/commonTypes";
import { NextRequest, NextResponse } from "next/server";

import { snacksCatalogMap } from "@/lib/snacks-catalog";

type RequestItem = {
  id: string;
  quantity: number;
};

const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

const paymentMethodsByChoice: Record<string, PaymentMethods> = {
  applePay: {},
  googlePay: {},
  pix: {
    default_payment_method_id: "pix",
    excluded_payment_types: [
      { id: "credit_card" },
      { id: "debit_card" },
      { id: "ticket" },
      { id: "atm" },
    ],
  },
} as const;

export async function POST(request: NextRequest) {
  if (!accessToken) {
    return NextResponse.json(
      { message: "Credenciais do Mercado Pago nao configuradas." },
      { status: 500 },
    );
  }

  try {
    const payload = (await request.json()) as {
      items?: RequestItem[];
      method?: keyof typeof paymentMethodsByChoice;
    };

    const requestedItems = Array.isArray(payload.items) ? payload.items : [];

    const validItems = requestedItems
      .map((item) => {
        const product = snacksCatalogMap.get(item.id);
        const quantity = Number(item.quantity);

        if (!product || !Number.isFinite(quantity) || quantity < 1) {
          return null;
        }

        return {
          id: product.id,
          title: product.name,
          quantity,
          currency_id: "BRL",
          unit_price: product.price,
        };
      })
      .filter((item) => item !== null);

    if (validItems.length === 0) {
      return NextResponse.json(
        { message: "Carrinho vazio." },
        { status: 400 },
      );
    }

    const client = new MercadoPagoConfig({
      accessToken,
      options: {
        timeout: 10000,
      },
    });

    const preference = new Preference(client);
    const checkout = await preference.create({
      body: {
        items: validItems,
        statement_descriptor: "MATHEUS MOTA",
        external_reference: `snacks-${Date.now()}`,
        back_urls: {
          success: `${request.nextUrl.origin}/snacks?payment_status=success`,
          pending: `${request.nextUrl.origin}/snacks?payment_status=pending`,
          failure: `${request.nextUrl.origin}/snacks?payment_status=failure`,
        },
        auto_return: "approved",
        payment_methods:
          paymentMethodsByChoice[payload.method ?? "pix"] ??
          paymentMethodsByChoice.pix,
      },
    });

    return NextResponse.json({
      initPoint: preferencePoint(checkout.init_point, checkout.sandbox_init_point),
      preferenceId: checkout.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao criar checkout.";

    return NextResponse.json({ message }, { status: 500 });
  }
}

function preferencePoint(initPoint?: string, sandboxInitPoint?: string) {
  return sandboxInitPoint || initPoint || null;
}
