import Link from "next/link";

import { confirmEmailVerificationToken } from "@/lib/email-confirmation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function ConfirmarEmailPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const token = searchParams.token?.trim() ?? "";
  const result = token ? await confirmEmailVerificationToken(token) : { ok: false as const };

  return (
    <main
      className="min-h-screen px-4 py-10"
      style={{
        alignItems: "center",
        background: "#050505",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <section
        className="w-full max-w-[620px] rounded-[32px] px-8 py-12 text-center"
        style={{
          background: "rgba(13,13,13,.96)",
          border: "0.5px solid rgba(255,255,255,.08)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.03)",
        }}
      >
        <p
          style={{
            color: "var(--cream)",
            fontFamily: "var(--font-display), sans-serif",
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: -2,
            marginBottom: 24,
          }}
        >
          urbann.
        </p>

        <h1
          style={{
            color: "var(--cream)",
            fontFamily: "var(--font-title), sans-serif",
            fontSize: 38,
            fontWeight: 800,
            letterSpacing: -1.5,
            lineHeight: 1.05,
            marginBottom: 16,
          }}
        >
          {result.ok ? "E-mail confirmado com sucesso" : "Não foi possível confirmar o e-mail"}
        </h1>

        <p
          style={{
            color: "var(--s5)",
            fontSize: 16,
            lineHeight: 1.8,
            margin: "0 auto 28px",
            maxWidth: 420,
          }}
        >
          {result.ok
            ? "Seu e-mail foi confirmado e você já pode fechar esta tela com tranquilidade."
            : "Esse link pode ter expirado ou já ter sido usado. Volte ao painel e peça um novo e-mail de confirmação."}
        </p>

        <Link
          className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold"
          href="/Financeiro/painel"
          style={{
            background: "var(--cream)",
            color: "#050505",
          }}
        >
          Voltar ao painel
        </Link>
      </section>
    </main>
  );
}
