"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Bolt,
  Check,
  Clock3,
  DollarSign,
  Gauge,
  Home as HomeIcon,
  Map,
  MapPinned,
  Plus,
  Target,
  UserRound,
  Wrench,
} from "lucide-react";
import type { MouseEvent } from "react";

import { pricingPlans } from "@/lib/pricing";

const features = [
  {
    description:
      "Acompanhe faturamento bruto, lucro líquido e custos do dia, semana e mês com atualização instantânea.",
    icon: DollarSign,
    title: "Faturamento em tempo real",
  },
  {
    description:
      "Defina sua meta, acompanhe a barra de progresso e veja quanto precisa faturar por dia para fechar o mês.",
    icon: Target,
    title: "Meta mensal inteligente",
  },
  {
    description:
      "Km rodados, custo por km, consumo de combustível ou energia elétrica e ganho por quilômetro.",
    icon: Map,
    title: "Análise de km e consumo",
  },
  {
    description:
      "Interface pensada para mobile. Adicione uma corrida com o mínimo de toques possível, mesmo em movimento.",
    icon: Bolt,
    title: "Registro em 15 segundos",
  },
  {
    description:
      "Gráficos de faturamento diário, mapa de calor por horário, ranking de regiões e comparativos semanais.",
    icon: BarChart3,
    title: "Relatórios detalhados",
  },
  {
    description:
      "O app avisa quando sua revisão se aproxima com base nos km rodados. Evite surpresas caras.",
    icon: Wrench,
    title: "Alerta de manutenção",
  },
] as const;

const platforms = [
  {
    badge: "U",
    badgeClass: "urbann-platform-badge--uber",
    description:
      "Acompanhe todas as corridas, bônus e lucro específico da Uber separadamente.",
    metrics: [
      ["Faturamento hoje", "R$178"],
      ["Corridas", "8"],
      ["Ganho/km", "R$1.82"],
      ["% do total", "57%"],
    ],
    title: "Uber",
  },
  {
    badge: "99",
    badgeClass: "urbann-platform-badge--99",
    description:
      "Compare a rentabilidade da 99 com as outras plataformas e otimize sua estratégia.",
    metrics: [
      ["Faturamento hoje", "R$89"],
      ["Corridas", "4"],
      ["Ganho/km", "R$1.55"],
      ["% do total", "29%"],
    ],
    title: "99",
  },
  {
    badge: "iD",
    badgeClass: "urbann-platform-badge--indrive",
    description:
      "Monitore as corridas negociadas no inDrive e veja se compensa o tempo investido.",
    metrics: [
      ["Faturamento hoje", "R$45"],
      ["Corridas", "2"],
      ["Ganho/km", "R$1.40"],
      ["% do total", "14%"],
    ],
    title: "inDrive",
  },
] as const;

const insights = [
  {
    badge: "+34%",
    description: "Sexta 17h–21h gera +34% vs média",
    icon: Clock3,
    tone: "green",
    title: "Melhor horário",
  },
  {
    badge: "R$2.10",
    description: "Pinheiros → Itaim: R$2.10/km",
    icon: MapPinned,
    tone: "amber",
    title: "Melhor região",
  },
  {
    badge: "🔥 quente",
    description: "Show Allianz — Sáb 21h, alta demanda",
    icon: Target,
    tone: "violet",
    title: "Evento próximo",
  },
  {
    badge: "+R$200",
    description: "No ritmo atual, fechará em R$6.400",
    icon: BarChart3,
    tone: "blue",
    title: "Projeção do mês",
  },
  {
    badge: "-R$18",
    description: "12% acima da média — revise rotas longas",
    icon: AlertTriangle,
    tone: "red",
    title: "Alerta de consumo",
  },
] as const;

const heatmapHours = ["0h", "3h", "6h", "9h", "12h", "15h", "18h", "21h"];

const heatmapRows = [
  { day: "Seg", values: [0, 0, 1, 3, 2, 3, 4, 2] },
  { day: "Ter", values: [0, 0, 1, 2, 2, 3, 4, 2] },
  { day: "Qua", values: [0, 0, 1, 3, 3, 4, 5, 3] },
  { day: "Qui", values: [0, 0, 1, 2, 3, 4, 5, 3] },
  { day: "Sex", values: [1, 0, 1, 3, 4, 5, 6, 5] },
  { day: "Sab", values: [2, 1, 0, 2, 4, 5, 6, 6] },
  { day: "Dom", values: [1, 0, 0, 1, 3, 3, 4, 3] },
] as const;

const phoneMetrics = [
  {
    accent: "up",
    dark: false,
    label: "Faturamento",
    sub: "14 corridas",
    value: "R$312",
  },
  {
    accent: "up",
    dark: true,
    label: "Lucro líquido",
    sub: "Após custos",
    value: "R$198",
  },
  {
    accent: null,
    dark: true,
    label: "Km rodados",
    sub: "13.4km/corrida",
    value: "187km",
  },
  {
    accent: null,
    dark: true,
    label: "Ganho/hora",
    sub: "7.4h online",
    value: "R$42",
  },
] as const;

export default function Home() {
  const scrollToSection = (event: MouseEvent<HTMLAnchorElement>, targetId: string) => {
    event.preventDefault();

    const section = document.getElementById(targetId);
    if (!section) {
      return;
    }

    const headerOffset = 96;
    const top = section.getBoundingClientRect().top + window.scrollY - headerOffset;

    window.scrollTo({
      behavior: "smooth",
      top,
    });
  };

  return (
    <main className="urbann-home">
      <div className="urbann-home__noise" />

      <nav className="urbann-nav">
        <div className="urbann-nav__logo">
          urbann<span>.</span>
        </div>
        <div className="urbann-nav__links">
          <a href="#features" onClick={(event) => scrollToSection(event, "features")}>Funcionalidades</a>
          <a href="#plataformas" onClick={(event) => scrollToSection(event, "plataformas")}>Plataformas</a>
          <a href="#analise" onClick={(event) => scrollToSection(event, "analise")}>Análise IA</a>
          <a href="#precos" onClick={(event) => scrollToSection(event, "precos")}>Preços</a>
          <Link className="urbann-nav__cta" href="/Financeiro">
            Entrar
          </Link>
        </div>
      </nav>

      <section className="urbann-hero">
        <div className="urbann-hero__glow" />
        <div className="urbann-hero__badge">
          <span className="urbann-hero__badge-dot" />
          Gestão inteligente para motoristas
        </div>
        <h1 className="urbann-hero__title">
          Seu dinheiro,
          <br />
          <span>sob controle.</span>
        </h1>
        <p className="urbann-hero__sub">
          Acompanhe faturamento, lucro, km e metas em tempo real. Para motoristas de
          Uber, 99 e inDrive.
        </p>
        <div className="urbann-hero__actions">
          <Link className="urbann-btn urbann-btn--solid" href="/onboarding">
            Começar com 7 dias grátis
          </Link>
          <a
            className="urbann-btn urbann-btn--ghost"
            href="#features"
            onClick={(event) => scrollToSection(event, "features")}
          >
            Ver funcionalidades
          </a>
        </div>
        <div className="urbann-hero__platforms">
          <span>Compatível com</span>
          <div className="urbann-pill">
            <i className="urbann-pill__dot urbann-pill__dot--uber" />
            Uber
          </div>
          <div className="urbann-pill">
            <i className="urbann-pill__dot urbann-pill__dot--99" />
            99
          </div>
          <div className="urbann-pill">
            <i className="urbann-pill__dot urbann-pill__dot--indrive" />
            inDrive
          </div>
        </div>
      </section>

      <section className="urbann-mockup">
        <div className="urbann-phone-glow" />
        <div className="urbann-phone">
          <div className="urbann-phone__notch" />
          <div className="urbann-phone__screen">
            <div className="urbann-phone__header">
              <div className="urbann-phone__logo">
                urbann<span>.</span>
              </div>
              <div className="urbann-phone__date">Dom, 25 Mai</div>
            </div>

            <div className="urbann-phone__quick">
              <div className="urbann-phone__quick-icon">
                <Plus size={16} />
              </div>
              <div>
                <p>Registrar corrida</p>
                <span>Toque para adicionar</span>
              </div>
            </div>

            <div className="urbann-phone__section">
              <div className="urbann-phone__section-title">Hoje</div>
              <div className="urbann-phone__grid">
                {phoneMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className={`urbann-phone-card${metric.dark ? "" : " urbann-phone-card--light"}`}
                  >
                    <div className="urbann-phone-card__label">{metric.label}</div>
                    <div className="urbann-phone-card__value">{metric.value}</div>
                    <div className="urbann-phone-card__sub">{metric.sub}</div>
                    {metric.accent && (
                      <div className={`urbann-phone-card__badge urbann-phone-card__badge--${metric.accent}`}>
                        ↑ +18%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="urbann-phone__platform-row">
              <div className="urbann-phone__platform urbann-phone__platform--active">
                <p>Uber</p>
                <span>R$178</span>
              </div>
              <div className="urbann-phone__platform">
                <p>99</p>
                <span>R$89</span>
              </div>
              <div className="urbann-phone__platform">
                <p>inDrive</p>
                <span>R$45</span>
              </div>
            </div>

            <div className="urbann-phone__goal">
              <div className="urbann-phone__goal-top">
                <div className="urbann-phone__goal-value">
                  R$4.250 <span>/ R$6.200</span>
                </div>
                <div className="urbann-phone__goal-pill">68%</div>
              </div>
              <div className="urbann-phone__goal-bar">
                <div className="urbann-phone__goal-fill" />
              </div>
              <div className="urbann-phone__goal-sub">
                Faltam <span>R$1.950</span> em <span>17 dias</span>
              </div>
            </div>

              <div className="urbann-phone__nav">
              <div className="urbann-phone__nav-item urbann-phone__nav-item--active">
                <HomeIcon size={18} />
                <span>Início</span>
              </div>
              <div className="urbann-phone__nav-item">
                <BarChart3 size={18} />
                <span>Relatórios</span>
              </div>
              <div className="urbann-phone__nav-add">
                <Plus size={18} />
              </div>
              <div className="urbann-phone__nav-item">
                <Map size={18} />
                <span>Regiões</span>
              </div>
              <div className="urbann-phone__nav-item">
                <UserRound size={18} />
                <span>Perfil</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="urbann-stats-band">
        <div className="urbann-stat">
          <div className="urbann-stat__number">+34%</div>
          <div className="urbann-stat__label">Aumento médio de lucro em 3 meses</div>
        </div>
        <div className="urbann-stat">
          <div className="urbann-stat__number">3</div>
          <div className="urbann-stat__label">Plataformas integradas</div>
        </div>
        <div className="urbann-stat">
          <div className="urbann-stat__number">15s</div>
          <div className="urbann-stat__label">Para registrar uma corrida</div>
        </div>
        <div className="urbann-stat">
          <div className="urbann-stat__number">100%</div>
          <div className="urbann-stat__label">Mobile-first</div>
        </div>
      </div>

      <section className="urbann-section" id="features">
        <div className="urbann-section__eyebrow">Funcionalidades</div>
        <div className="urbann-section__title">
          Tudo que você precisa
          <br />
          <span>para crescer.</span>
        </div>
        <div className="urbann-features-grid">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="urbann-feature-card">
                <div className="urbann-feature-card__icon">
                  <Icon size={22} />
                </div>
                <div className="urbann-feature-card__title">{feature.title}</div>
                <div className="urbann-feature-card__desc">{feature.description}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="urbann-section" id="plataformas">
        <div className="urbann-section__eyebrow">Plataformas</div>
        <div className="urbann-section__title">
          Trabalha em mais
          <br />
          <span>de uma plataforma?</span>
        </div>
        <div className="urbann-platforms">
          {platforms.map((platform) => (
            <div key={platform.title} className="urbann-platform-card">
              <div className={`urbann-platform-badge ${platform.badgeClass}`}>{platform.badge}</div>
              <div className="urbann-platform-card__title">{platform.title}</div>
              <div className="urbann-platform-card__desc">{platform.description}</div>
              <div className="urbann-platform-card__metrics">
                {platform.metrics.map(([label, value]) => (
                  <div key={label} className="urbann-platform-card__metric">
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="urbann-analyse" id="analise">
        <div className="urbann-analyse__inner">
          <div>
            <div className="urbann-section__eyebrow">Análise inteligente</div>
            <div className="urbann-section__title">
              A IA que
              <br />
              <span>trabalha por você.</span>
            </div>
            <p className="urbann-analyse__intro">
              O Urbann analisa seu histórico e identifica quando, onde e como você
              ganha mais dinheiro.
            </p>
          </div>
          <div className="urbann-analyse__list">
            {insights.map((insight) => {
              const Icon = insight.icon;
              return (
                <div key={insight.title} className="urbann-analyse-item">
                  <div className={`urbann-analyse-item__icon urbann-analyse-item__icon--${insight.tone}`}>
                    <Icon size={18} />
                  </div>
                  <div className="urbann-analyse-item__text">
                    <p>{insight.title}</p>
                    <span>{insight.description}</span>
                  </div>
                  <div className="urbann-analyse-item__badge">{insight.badge}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="urbann-heatmap">
          <div className="urbann-heatmap__title">Mapa de calor — ganho por horário da semana</div>
          <div className="urbann-heatmap__hours">
            {heatmapHours.map((hour) => (
              <span key={hour}>{hour}</span>
            ))}
          </div>
          <div className="urbann-heatmap__rows">
            {heatmapRows.map((row) => (
              <div key={row.day} className="urbann-heatmap__row">
                <div className="urbann-heatmap__day">{row.day}</div>
                {row.values.map((value, index) => (
                  <div key={`${row.day}-${index}`} className={`urbann-heatmap__cell urbann-heatmap__cell--${value}`}>
                    {value > 0 ? value : ""}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="urbann-heatmap__legend">
            <span>Menor</span>
            {[0, 2, 3, 4, 5, 6].map((step) => (
              <i key={step} className={`urbann-heatmap__legend-box urbann-heatmap__cell--${step}`} />
            ))}
            <span className="urbann-heatmap__legend-highlight">Maior ganho</span>
          </div>
        </div>
      </section>

      <section className="urbann-pricing" id="precos">
        <div className="urbann-section__eyebrow">Preços</div>
        <div className="urbann-section__title urbann-section__title--center">
          Simples e
          <br />
          <span>acessível.</span>
        </div>
        <div className="urbann-pricing__grid">
          {pricingPlans.map((plan) => (
            <div
              key={plan.name}
              className={`urbann-pricing-card${plan.featured ? " urbann-pricing-card--featured" : ""}`}
            >
              <div className="urbann-pricing-card__badge">{plan.badge}</div>
              <div className="urbann-pricing-card__name">{plan.name}</div>
              <div className="urbann-pricing-card__price">
                {plan.promoPrice}
                <span>/mês</span>
              </div>
              <div className="urbann-pricing-card__divider" />
              <div className="urbann-pricing-card__features">
                {plan.features.map((feature) => (
                  <div key={feature.text} className="urbann-pricing-card__feature">
                    <Check size={14} />
                    {feature.text}
                  </div>
                ))}
              </div>
              <Link
                className={`urbann-pricing-card__button${plan.featured ? " urbann-pricing-card__button--solid" : ""}`}
                href="/Financeiro"
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="urbann-cta">
        <div className="urbann-cta__title">
          Comece hoje.
          <br />
          <span>Teste por 7 dias.</span>
        </div>
        <p className="urbann-cta__sub">
          Crie sua conta em menos de 1 minuto e ative seu plano com 7 dias grátis.
        </p>
        <Link className="urbann-btn urbann-btn--solid urbann-btn--large" href="/Financeiro">
          Começar agora →
        </Link>
      </section>

      <footer className="urbann-footer">
        <div className="urbann-footer__logo">urbann.</div>
        <div className="urbann-footer__copy">© 2025 Urbann. Todos os direitos reservados.</div>
        <div className="urbann-footer__links">
          <a href="#">Termos</a>
          <a href="#">Privacidade</a>
          <a href="#">Contato</a>
        </div>
      </footer>
    </main>
  );
}
