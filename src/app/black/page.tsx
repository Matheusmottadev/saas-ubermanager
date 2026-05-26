import Image from "next/image";
import Link from "next/link";

export default function BlackPage() {
  return (
    <main className="page-shell black-shell">
      <section className="black-hero">
        <p className="black-hero-welcome">Bem vindo.</p>
        <h1 className="black-hero-title">
          <span>Pontualidade,</span>
          <span>Conforto e</span>
          <span>Discrição</span>
        </h1>
        <p className="black-hero-legend">Motorista Particular</p>
        <p className="black-hero-copy">
          Transporte executivo com presença, cuidado e confiança para o seu
          dia a dia.
        </p>
      </section>

      <div className="black-car-stage" aria-hidden="true">
        <Image
          alt="Carro preto"
          className="black-image"
          height={674}
          priority
          src="/preto.png"
          width={1200}
        />
      </div>

      <div className="black-actions" aria-label="Ações rápidas">
        <Link className="black-action-button" href="/corrida">
          Agende uma corrida
        </Link>
        <Link className="black-action-button" href="/snacks">
          Snacks &amp; Conveniência
        </Link>
      </div>
    </main>
  );
}
