import { MercadoPagoConfig, Payment } from "mercadopago";
import { NextRequest, NextResponse } from "next/server";

import { snacksCatalogMap } from "@/lib/snacks-catalog";

const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

type CartItem = {
  id: string;
  quantity: number;
};

type PaymentBrickPayload = {
  transaction_amount?: number;
  payment_method_id?: string;
  payer?: {
    email?: string;
    identification?: {
      type?: string;
      number?: string;
    };
  };
};

export async function POST(request: NextRequest) {
  if (!accessToken) {
    return NextResponse.json(
      { message: "Credenciais do Mercado Pago nao configuradas." },
      { status: 500 },
    );
  }

  try {
    const payload = (await request.json()) as {
      formData?: PaymentBrickPayload;
      items?: CartItem[];
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
          unit_price: product.price,
          currency_id: "BRL",
        };
      })
      .filter((item) => item !== null);

    if (validItems.length === 0) {
      return NextResponse.json({ message: "Carrinho vazio." }, { status: 400 });
    }

    const amount = validItems.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0,
    );

    const formData = payload.formData ?? {};
    const payerEmail = formData.payer?.email;
    const paymentMethodId = formData.payment_method_id ?? "pix";

    if (!payerEmail) {
      return NextResponse.json(
        { message: "Informe o e-mail para gerar o pagamento." },
        { status: 400 },
      );
    }

    const client = new MercadoPagoConfig({
      accessToken,
      options: {
        timeout: 10000,
      },
    });

    const payment = new Payment(client);
    const response = await payment.create({
      body: {
        transaction_amount: amount,
        description: "Pedido de snacks a bordo",
        payment_method_id: paymentMethodId,
        payer: {
          email: payerEmail,
          identification: formData.payer?.identification,
        },
        additional_info: {
          items: validItems,
        },
        external_reference: `snacks-${Date.now()}`,
        statement_descriptor: "MATHEUS MOTA",
      },
      requestOptions: {
        idempotencyKey: crypto.randomUUID(),
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao processar pagamento.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
