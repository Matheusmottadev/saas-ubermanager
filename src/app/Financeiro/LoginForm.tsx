"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type LoginFormProps = {
  demoEmail: string;
  demoPassword: string;
};

export default function LoginForm(props: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        body: JSON.stringify({
          email,
          password,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setErrorMessage(payload.error ?? "Não foi possível entrar.");
        return;
      }

      router.push("/Financeiro/painel");
      router.refresh();
    } catch (error) {
      console.error("login submit failed", error);
      setErrorMessage("Não foi possível entrar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="financeiro-login-shell">
      <div className="financeiro-login-background" aria-hidden="true">
        <video autoPlay className="financeiro-login-video" loop muted playsInline>
          <source src="/urbann-bg.mp4" type="video/mp4" />
        </video>
        <div className="financeiro-login-mask" />
      </div>

      <div className="financeiro-login-stack">
        <div className="financeiro-login-logo" aria-hidden="true">
          <Image alt="Logo Urbann" height={220} priority src="/urbann-logo.png" width={220} />
        </div>

        <section className="financeiro-login-card" aria-label="Entrar no financeiro">
          <div className="financeiro-login-copy">
            <p className="financeiro-login-kicker">Urbann</p>
            <h1 className="financeiro-login-title">Acesse sua conta</h1>
            <p className="financeiro-login-subtitle">
              Entre para gerenciar corridas, clientes e ganhos em um só lugar.
            </p>
          </div>

          <form className="financeiro-login-form" onSubmit={handleSubmit}>
            <label className="financeiro-login-field">
              <span>Email</span>
              <input
                autoComplete="email"
                name="email"
                placeholder="voce@empresa.com"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="financeiro-login-field">
              <span>Senha</span>
              <input
                autoComplete="current-password"
                name="password"
                placeholder="Digite sua senha"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            <button className="financeiro-login-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Entrando..." : "Entrar"}
            </button>

            <p className="financeiro-login-hint">
              Enquanto o cadastro não entra, use <strong>{props.demoEmail}</strong> e senha{" "}
              <strong>{props.demoPassword}</strong>.
            </p>

            {errorMessage ? <p className="financeiro-login-error">{errorMessage}</p> : null}

            <div className="financeiro-login-actions">
              <button className="financeiro-login-forgot" type="button">
                Esqueci minha senha
              </button>

              <button className="financeiro-login-code" type="button">
                Entrar com código
              </button>
            </div>

            <p className="financeiro-login-signup">
              Não tem conta?{" "}
              <button className="financeiro-login-signup-button" type="button">
                Crie agora mesmo
              </button>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
