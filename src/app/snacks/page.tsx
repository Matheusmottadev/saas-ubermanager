"use client";

import { Payment, initMercadoPago } from "@mercadopago/sdk-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { snacksCatalog } from "@/lib/snacks-catalog";

const filters = ["Doces", "Salgados", "Bebidas"];

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;

if (publicKey) {
  initMercadoPago(publicKey, { locale: "pt-BR" });
}

export default function SnacksPage() {
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const paymentStatus =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("payment_status");
  const visibleProducts = selectedFilter
    ? snacksCatalog.filter((product) => product.category === selectedFilter)
    : snacksCatalog;
  const totalItems = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const subtotal = snacksCatalog.reduce(
    (sum, product) => sum + product.price * (cart[product.id] ?? 0),
    0,
  );
  const cartItems = snacksCatalog.filter((product) => (cart[product.id] ?? 0) > 0);
  const paymentFeedback = useMemo(() => {
    if (paymentStatus === "success") {
      return "Pagamento aprovado no Mercado Pago.";
    }

    if (paymentStatus === "pending") {
      return "Pagamento pendente. Assim que confirmar, o pedido segue.";
    }

    if (paymentStatus === "failure") {
      return "Pagamento nao concluido. Voce pode tentar novamente.";
    }

    return null;
  }, [paymentStatus]);

  const addToCart = (productId: string) => {
    setCart((current) => ({
      ...current,
      [productId]: (current[productId] ?? 0) + 1,
    }));
  };

  useEffect(() => {
    if (!isCartOpen) {
      document.body.style.overflow = "";
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isCartOpen]);

  return (
    <main className="page-shell black-shell corrida-shell snacks-shell">
      {paymentFeedback ? (
        <div className="snacks-payment-feedback" role="status">
          {paymentFeedback}
        </div>
      ) : null}

      <section className="black-hero">
        <Link className="black-back-button" href="/black">
          Voltar
        </Link>
        <p className="black-hero-welcome">Snacks & Conveniencia</p>
        <h1 className="corrida-title">
          <span>
            <span className="corrida-highlight">Escolha</span> agora
          </span>
          <span>seu snack</span>
          <span>durante o trajeto</span>
        </h1>
        <div className="snacks-filter-row" aria-label="Filtros">
          {filters.map((filter) => (
            <button
              aria-pressed={selectedFilter === filter}
              className={`snacks-filter-button ${
                selectedFilter === filter ? "is-selected" : ""
              }`}
              key={filter}
              type="button"
              onClick={() =>
                setSelectedFilter((current) =>
                  current === filter ? null : filter,
                )
              }
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      <section className="snacks-products-grid" aria-label="Produtos">
        {visibleProducts.map((product) => (
          <article className="snacks-product-card" key={product.id}>
            <div className="snacks-product-image-wrap">
              <img
                alt={product.name}
                className="snacks-product-image"
                src={product.image}
              />
            </div>
            <div className="snacks-product-copy">
              <p className="snacks-product-name">{product.name}</p>
              <div className="snacks-product-footer">
                <span className="snacks-product-price">
                  {formatCurrency(product.price)}
                </span>
                <button
                  className="snacks-add-button"
                  type="button"
                  onClick={() => addToCart(product.id)}
                >
                  {cart[product.id] ? `+ ${cart[product.id]}` : "+ Adicionar"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>

      <button
        className="snacks-cart-popup"
        type="button"
        onClick={() => {
          if (totalItems > 0) {
            setIsCartOpen(true);
            setShowPaymentOptions(false);
          }
        }}
      >
        <span className="snacks-cart-icon-wrap" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="snacks-cart-icon">
            <path
              d="M7 18a1.75 1.75 0 1 0 0 3.5A1.75 1.75 0 0 0 7 18Zm10 0a1.75 1.75 0 1 0 0 3.5A1.75 1.75 0 0 0 17 18ZM5.2 5l.52 2.6h13.63a1 1 0 0 1 .98 1.2l-1.27 6a1 1 0 0 1-.98.8H8.1a1 1 0 0 1-.98-.8L5.1 4.6H3.5a1 1 0 1 1 0-2h2.43a1 1 0 0 1 .98.8L7.14 4H20a1 1 0 0 1 0 2H5.2Z"
              fill="currentColor"
            />
          </svg>
          <span className="snacks-cart-count">{totalItems}</span>
        </span>
        <span className="snacks-cart-copy">
          <span className="snacks-cart-label">Carrinho</span>
          <span className="snacks-cart-subtitle">
            {totalItems === 0
              ? "Adicione itens para continuar"
              : `${totalItems} item${totalItems > 1 ? "s" : ""} • ${formatCurrency(subtotal)}`}
          </span>
        </span>
        <span className="snacks-cart-cta">
          {totalItems === 0 ? "Selecionar" : "Ver pedido"}
        </span>
      </button>

      {isCartOpen ? (
        <>
          <button
            aria-label="Fechar pedido"
            className="snacks-sheet-backdrop"
            type="button"
            onClick={() => setIsCartOpen(false)}
          />
          <section className="snacks-cart-sheet" aria-label="Resumo do pedido">
            <button
              aria-label="Fechar pedido"
              className="snacks-sheet-close"
              type="button"
              onClick={() => {
                setIsCartOpen(false);
                setShowPaymentOptions(false);
              }}
            >
              ×
            </button>

            <div className="snacks-sheet-header">
              <p className="snacks-sheet-eyebrow">Seu pedido</p>
              <h2 className="snacks-sheet-title">Resumo da compra</h2>
            </div>

            <div className="snacks-sheet-items">
              {cartItems.map((product) => {
                const quantity = cart[product.id] ?? 0;
                const itemTotal = product.price * quantity;

                return (
                  <div className="snacks-sheet-item" key={product.id}>
                    <div className="snacks-sheet-item-copy">
                      <p className="snacks-sheet-item-name">{product.name}</p>
                      <span className="snacks-sheet-item-meta">
                        {quantity}x • {formatCurrency(product.price)}
                      </span>
                    </div>
                    <span className="snacks-sheet-item-total">
                      {formatCurrency(itemTotal)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="snacks-sheet-total-row">
              <span className="snacks-sheet-total-label">Total</span>
              <strong className="snacks-sheet-total-value">
                {formatCurrency(subtotal)}
              </strong>
            </div>

            <p className="snacks-checkout-note">
              Pague aqui ou direto ao motorista.
            </p>

            <div className="snacks-sheet-payments">
              <div className="snacks-payment-stage">
                {!showPaymentOptions ? (
                  <button
                    className="snacks-payment-trigger snacks-payment-stage-enter"
                    type="button"
                    onClick={() => setShowPaymentOptions(true)}
                  >
                    Pagar
                  </button>
                ) : (
                  <div className="snacks-payment-options snacks-payment-stage-enter">
                    <p className="snacks-payment-title">Escolha a forma de pagamento</p>
                    <p className="snacks-payment-subtitle">Finalize com Pix dentro do site.</p>
                    {checkoutError ? (
                      <p className="snacks-payment-error">{checkoutError}</p>
                    ) : null}
                    <div className="snacks-payment-brick-wrap">
                      {publicKey ? (
                        <Payment
                          initialization={{
                            amount: subtotal,
                          }}
                          customization={{
                            paymentMethods: {
                              bankTransfer: ["pix"],
                            },
                            visual: {
                              style: {
                                theme: "dark",
                              },
                            },
                          }}
                          onReady={() => {
                            setCheckoutError(null);
                          }}
                          onError={(error) => {
                            setCheckoutError(
                              error?.message || "Falha ao carregar o Brick do Pix.",
                            );
                          }}
                          onSubmit={({ formData }) => {
                            return new Promise<void>((resolve, reject) => {
                              fetch("/api/mercadopago/process-payment", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  formData,
                                  items: cartItems.map((product) => ({
                                    id: product.id,
                                    quantity: cart[product.id] ?? 0,
                                  })),
                                }),
                              })
                                .then(async (response) => {
                                  const data = await response.json();

                                  if (!response.ok) {
                                    throw new Error(
                                      data.message || "Nao foi possivel processar o pagamento.",
                                    );
                                  }

                                  resolve();
                                })
                                .catch((error) => {
                                  setCheckoutError(
                                    error instanceof Error
                                      ? error.message
                                      : "Falha ao processar o pagamento.",
                                  );
                                  reject();
                                });
                            });
                          }}
                        />
                      ) : (
                        <p className="snacks-payment-error">
                          Chave publica do Mercado Pago nao configurada.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
