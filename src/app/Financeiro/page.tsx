"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function FinanceiroPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (email === "123@g.com" && password === "123") {
      setErrorMessage("");
      router.push("/Financeiro/painel");
      return;
    }

    setErrorMessage("Email ou senha incorretos.");
  }

  return (
    <main className="financeiro-login-shell">
      <div className="financeiro-login-background" aria-hidden="true">
        <video
          autoPlay
          className="financeiro-login-video"
          loop
          muted
          playsInline
        >
          <source src="/urbann-bg.mp4" type="video/mp4" />
        </video>
        <div className="financeiro-login-mask" />
      </div>

      <div className="financeiro-login-stack">
        <div className="financeiro-login-logo" aria-hidden="true">
          <Image
            alt="Logo Urbann"
            height={220}
            priority
            src="/urbann-logo.png"
            width={220}
          />
        </div>

        <section className="financeiro-login-card" aria-label="Entrar no financeiro">
          <div className="financeiro-login-copy">
            <p className="financeiro-login-kicker">Urbann</p>
            <h1 className="financeiro-login-title">Acesse sua conta</h1>
            <p className="financeiro-login-subtitle">
              Entre para gerenciar corridas, clientes e ganhos em um so lugar.
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

            <button className="financeiro-login-button" type="submit">
              Entrar
            </button>

            <p className="financeiro-login-hint">
              Use <strong>123@g.com</strong> e senha <strong>123</strong>.
            </p>

            {errorMessage ? (
              <p className="financeiro-login-error">{errorMessage}</p>
            ) : null}

            <div className="financeiro-login-actions">
              <button className="financeiro-login-forgot" type="button">
                Esqueci minha senha
              </button>

              <button className="financeiro-login-code" type="button">
                Entrar com Codigo
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
