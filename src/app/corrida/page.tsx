"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const highlights = [
  {
    eyebrow: "Porta-malas",
    title: "Mais espaço para malas e aeroporto",
    copy:
      "O BYD King GS entrega um porta-malas generoso para viagens, conexões e bagagens, sem deixar o passageiro apertado.",
    image: "/luggage-PC.webp",
    alt: "Porta-malas do BYD King",
  },
  {
    eyebrow: "Interior",
    title: "Cabine confortável para quem vai junto",
    copy:
      "O espaço interno ajuda a transformar o trajeto em uma experiência mais tranquila, silenciosa e agradável.",
    image: "/interior.png",
    alt: "Interior do BYD King",
  },
  {
    eyebrow: "Exterior",
    title: "Chegada com presença e discrição",
    copy:
      "O visual do carro passa sensação de cuidado e profissionalismo, reforçando o padrão do seu serviço logo na chegada.",
    image: "/de lado frente.png",
    alt: "BYD King vista externa lateral",
  },
];

const timeSlots = Array.from({ length: 24 }, (_, hour) =>
  `${String(hour).padStart(2, "0")}:00`,
);

const timeGroups = [
  { label: "Madrugada", start: 0, end: 5 },
  { label: "Manhã", start: 6, end: 11 },
  { label: "Tarde", start: 12, end: 17 },
  { label: "Noite", start: 18, end: 23 },
];

const bookingSteps = [
  "Data",
  "Origem",
  "Destino",
  "Informações",
  "Confirmar",
];

const passengerCounts = ["1", "2", "3", "4"];

const luggageOptions = [
  { label: "Sem malas", value: "0" },
  { label: "1 mala", value: "1" },
  { label: "2 malas", value: "2" },
  { label: "3 ou mais", value: "3+" },
];

const waitingOptions = [
  { label: "Nao", value: "no" },
  { label: "Sim, poucos minutos", value: "short" },
];

const whatsappNumber = "5511934618004";

type AddressField =
  | "cep"
  | "street"
  | "number"
  | "complement"
  | "neighborhood"
  | "city";

type AddressKind = "pickup" | "destination" | "stop";

type Quote = {
  distanceKm: number;
  durationMinutes: number;
  estimatedFare: number;
  routeBasedFare: number;
  minimumFare: number;
  adjustmentTotal: number;
  adjustments: Array<{
    label: string;
    amount: number;
  }>;
};

type QuoteErrorResponse = {
  error?: string;
};

type AddressSuggestion = {
  placeId: string;
  text: string;
  mainText: string;
  secondaryText: string;
};

type AddressDetailsResponse = {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  cep: string;
  formattedAddress: string;
};

const emptyAddress: Record<AddressField, string> = {
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
};

const formatAddressSummary = (address: Record<AddressField, string>) =>
  [address.street, address.neighborhood, address.city]
    .filter(Boolean)
    .join(" • ");

const formatFullAddress = (address: Record<AddressField, string>) =>
  [
    [address.street, address.number].filter(Boolean).join(", "),
    address.complement,
    address.neighborhood,
    address.city,
  ]
    .filter(Boolean)
    .join(" • ");

const formatRouteAddress = (address: Record<AddressField, string>) =>
  [
    [address.street, address.number].filter(Boolean).join(", "),
    address.neighborhood,
    address.city,
    "Brasil",
  ]
    .filter(Boolean)
    .join(", ");

const formatCep = (value: string) => {
  const numbers = value.replace(/\D/g, "").slice(0, 8);

  return numbers.length > 5
    ? `${numbers.slice(0, 5)}-${numbers.slice(5)}`
    : numbers;
};

const hasFoundAddress = (address: Record<AddressField, string>) =>
  Boolean(address.street || address.neighborhood || address.city);

const hasCompleteAddress = (address: Record<AddressField, string>) =>
  hasFoundAddress(address) && Boolean(address.number.trim());

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

const selectedDayFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const weekDays = [
  { key: "sun", label: "D" },
  { key: "mon", label: "S" },
  { key: "tue", label: "T" },
  { key: "wed", label: "Q" },
  { key: "thu", label: "Q" },
  { key: "fri", label: "S" },
  { key: "sat", label: "S" },
];

function buildAvailabilityDays(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const today = referenceDate.getDate();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay.getDay();

  const cells: Array<{
    label: string;
    available: boolean;
    placeholder?: boolean;
  }> = [];

  for (let index = 0; index < startOffset; index += 1) {
    cells.push({ label: "", available: false, placeholder: true });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const weekday = date.getDay();
    const available = weekday !== 0 && day >= today;

    cells.push({
      label: String(day),
      available,
    });
  }

  return cells;
}

function getFirstAvailableDay(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const today = referenceDate.getDate();

  for (
    let day = today;
    day <= new Date(year, month + 1, 0).getDate();
    day += 1
  ) {
    if (new Date(year, month, day).getDay() !== 0) {
      return day;
    }
  }

  return referenceDate.getDate();
}

export default function CorridaPage() {
  const [open, setOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() =>
    getFirstAvailableDay(),
  );
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedTimeGroup, setSelectedTimeGroup] = useState(timeGroups[0].label);
  const [selectedPassengers, setSelectedPassengers] = useState("");
  const [selectedLuggage, setSelectedLuggage] = useState("");
  const [selectedWaiting, setSelectedWaiting] = useState("");
  const [pickupAddress, setPickupAddress] = useState(() => ({ ...emptyAddress }));
  const [destinationAddress, setDestinationAddress] = useState(() => ({
    ...emptyAddress,
  }));
  const [stopAddress, setStopAddress] = useState(() => ({ ...emptyAddress }));
  const [hasStop, setHasStop] = useState(false);
  const [cepStatus, setCepStatus] = useState<
    Record<AddressKind, "idle" | "loading" | "error">
  >({
    pickup: "idle",
    destination: "idle",
    stop: "idle",
  });
  const [notes, setNotes] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [quoteError, setQuoteError] = useState("");
  const [addressSearch, setAddressSearch] = useState<
    Record<AddressKind, string>
  >({
    pickup: "",
    destination: "",
    stop: "",
  });
  const [addressSuggestions, setAddressSuggestions] = useState<
    Record<AddressKind, AddressSuggestion[]>
  >({
    pickup: [],
    destination: [],
    stop: [],
  });

  const availabilityDays = buildAvailabilityDays();
  const selectedGroup = timeGroups.find(
    (group) => group.label === selectedTimeGroup,
  );
  const visibleTimes = timeSlots.filter((slot) => {
    const hour = Number(slot.slice(0, 2));

    return selectedGroup
      ? hour >= selectedGroup.start && hour <= selectedGroup.end
      : true;
  });
  const selectedDateLabel = selectedDayFormatter.format(
    new Date(new Date().getFullYear(), new Date().getMonth(), selectedDate),
  );
  const selectedDateTimeIso = (() => {
    const [hour = 0, minute = 0] = selectedTime.split(":").map(Number);

    return new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      selectedDate,
      hour,
      minute,
    ).toISOString();
  })();
  const canContinue =
    (bookingStep === 0 && Boolean(selectedTime)) ||
    (bookingStep === 1 && hasCompleteAddress(pickupAddress)) ||
    (bookingStep === 2 &&
      hasCompleteAddress(destinationAddress) &&
      (!hasStop || hasCompleteAddress(stopAddress))) ||
    (bookingStep === 3 &&
      Boolean(selectedPassengers && selectedLuggage && selectedWaiting)) ||
    bookingStep === 4;
  const canUsePrimaryButton =
    canContinue && !(bookingStep === 4 && quoteStatus === "loading");

  useEffect(() => {
    if (
      bookingStep !== 4 ||
      !selectedTime ||
      !hasCompleteAddress(pickupAddress) ||
      !hasCompleteAddress(destinationAddress) ||
      (hasStop && !hasCompleteAddress(stopAddress))
    ) {
      return;
    }

    const controller = new AbortController();

    const loadQuote = async () => {
      setQuoteStatus("loading");
      setQuote(null);
      setQuoteError("");

      try {
        const response = await fetch("/api/cotacao", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            origin: formatRouteAddress(pickupAddress),
            destination: formatRouteAddress(destinationAddress),
            stop: hasStop ? formatRouteAddress(stopAddress) : undefined,
            departureTime: selectedDateTimeIso,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = (await response.json()) as QuoteErrorResponse;

          throw new Error(
            errorData.error ?? "Não foi possível calcular a cotação.",
          );
        }

        const data = (await response.json()) as Quote;

        setQuote(data);
        setQuoteStatus("success");
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setQuoteError(
          error instanceof Error
            ? error.message
            : "Não foi possível calcular a cotação.",
        );
        setQuoteStatus("error");
      }
    };

    void loadQuote();

    return () => {
      controller.abort();
    };
  }, [
    bookingStep,
    destinationAddress,
    hasStop,
    pickupAddress,
    selectedDateTimeIso,
    selectedTime,
    stopAddress,
  ]);

  useEffect(() => {
    const controller = new AbortController();
    const entries = Object.entries(addressSearch) as Array<[AddressKind, string]>;

    entries.forEach(([kind, value]) => {
      if (value.trim().length < 3 && addressSuggestions[kind].length > 0) {
        setAddressSuggestions((current) => ({
          ...current,
          [kind]: [],
        }));
      }
    });

    const activeSearches = entries.filter(
      ([, value]) => value.trim().length >= 3,
    );

    if (activeSearches.length === 0) {
      return () => controller.abort();
    }

    const timeoutId = setTimeout(() => {
      activeSearches.forEach(([kind, value]) => {
        fetch("/api/address-suggestions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ input: value }),
          signal: controller.signal,
        })
          .then(async (response) => {
            if (!response.ok) {
              return { suggestions: [] as AddressSuggestion[] };
            }

            return (await response.json()) as {
              suggestions: AddressSuggestion[];
            };
          })
          .then((data) => {
            setAddressSuggestions((current) => ({
              ...current,
              [kind]: data.suggestions,
            }));
          })
          .catch(() => {
            setAddressSuggestions((current) => ({
              ...current,
              [kind]: [],
            }));
          });
      });
    }, 260);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [addressSearch, addressSuggestions]);

  const updateAddress = (
    kind: AddressKind,
    field: AddressField,
    value: string,
  ) => {
    const setter =
      kind === "pickup"
        ? setPickupAddress
        : kind === "destination"
          ? setDestinationAddress
          : setStopAddress;

    setter((current) => {
      if (field === "cep") {
        return {
          ...current,
          cep: formatCep(value),
          street: "",
          neighborhood: "",
          city: "",
        };
      }

      return { ...current, [field]: value };
    });

    if (field === "cep") {
      setCepStatus((current) => ({ ...current, [kind]: "idle" }));
    }
  };
  const findAddressByCep = async (kind: AddressKind) => {
    const address =
      kind === "pickup"
        ? pickupAddress
        : kind === "destination"
          ? destinationAddress
          : stopAddress;
    const cep = address.cep.replace(/\D/g, "");

    if (cep.length !== 8) {
      setCepStatus((current) => ({ ...current, [kind]: "error" }));
      return;
    }

    setCepStatus((current) => ({ ...current, [kind]: "loading" }));

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (!response.ok || data.erro) {
        setCepStatus((current) => ({ ...current, [kind]: "error" }));
        return;
      }

      const setter =
        kind === "pickup"
          ? setPickupAddress
          : kind === "destination"
            ? setDestinationAddress
            : setStopAddress;

      setter((current) => ({
        ...current,
        cep: formatCep(cep),
        street: data.logradouro ?? "",
        neighborhood: data.bairro ?? "",
        city: [data.localidade, data.uf].filter(Boolean).join(" - "),
      }));
      setCepStatus((current) => ({ ...current, [kind]: "idle" }));
    } catch {
      setCepStatus((current) => ({ ...current, [kind]: "error" }));
    }
  };
  const renderAddressFields = (
    kind: AddressKind,
    address: Record<AddressField, string>,
  ) => {
    const isAddressFound = hasFoundAddress(address);
    const addressSummary = formatAddressSummary(address);
    const suggestions = addressSuggestions[kind];

    return (
      <div className="corrida-address-fields corrida-address-fields-step">
        <div className="corrida-address-search">
          <label className="corrida-field">
            <span>Busca rapida</span>
            <input
              placeholder="Digite rua, avenida, aeroporto..."
              value={addressSearch[kind]}
              onChange={(event) =>
                setAddressSearch((current) => ({
                  ...current,
                  [kind]: event.target.value,
                }))
              }
            />
          </label>

          {suggestions.length > 0 && (
            <div className="corrida-suggestions">
              {suggestions.map((suggestion) => (
                <button
                  className="corrida-suggestion-item"
                  key={`${kind}-${suggestion.text}`}
                  type="button"
                  onClick={async () => {
                    let details: AddressDetailsResponse | null = null;

                    if (suggestion.placeId) {
                      const response = await fetch("/api/address-details", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          placeId: suggestion.placeId,
                        }),
                      });

                      if (response.ok) {
                        details =
                          (await response.json()) as AddressDetailsResponse;
                      }
                    }

                    updateAddress(
                      kind,
                      "street",
                      details?.street || suggestion.mainText,
                    );
                    updateAddress(
                      kind,
                      "city",
                      details?.city || suggestion.secondaryText,
                    );
                    updateAddress(
                      kind,
                      "neighborhood",
                      details?.neighborhood || "",
                    );
                    updateAddress(kind, "cep", details?.cep || "");

                    if (details?.number) {
                      updateAddress(kind, "number", details.number);
                    }

                    setAddressSearch((current) => ({
                      ...current,
                      [kind]: details?.formattedAddress || suggestion.text,
                    }));
                    setAddressSuggestions((current) => ({
                      ...current,
                      [kind]: [],
                    }));
                  }}
                >
                  <strong>{suggestion.mainText}</strong>
                  {suggestion.secondaryText && (
                    <span>{suggestion.secondaryText}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="corrida-cep-row">
          <label className="corrida-field corrida-field-cep">
            <span>CEP</span>
            <input
              inputMode="numeric"
              maxLength={9}
              placeholder="00000-000"
              value={address.cep}
              onChange={(event) =>
                updateAddress(kind, "cep", event.target.value)
              }
            />
          </label>

          <button
            className="corrida-cep-button"
            disabled={cepStatus[kind] === "loading"}
            type="button"
            onClick={() => void findAddressByCep(kind)}
          >
            {cepStatus[kind] === "loading" ? "..." : "OK"}
          </button>
        </div>

        {cepStatus[kind] === "error" && (
          <p className="corrida-cep-error">Confira o CEP e tente novamente.</p>
        )}

        {isAddressFound && (
          <p className="corrida-address-summary">
            {addressSummary}
          </p>
        )}

        {isAddressFound && (
          <div className="corrida-address-extra-fields">
            <label className="corrida-field">
              <span>Número</span>
              <input
                placeholder="Nº"
                value={address.number}
                onChange={(event) =>
                  updateAddress(kind, "number", event.target.value)
                }
              />
            </label>

            <label className="corrida-field">
              <span>Complemento</span>
              <input
                placeholder="Apto, bloco, referência"
                value={address.complement}
                onChange={(event) =>
                  updateAddress(kind, "complement", event.target.value)
                }
              />
            </label>
          </div>
        )}
      </div>
    );
  };
  const progressSummaryParts = [
    bookingStep > 0 && selectedTime
      ? `Data: ${selectedDateLabel} • ${selectedTime}`
      : null,
    bookingStep > 1 && hasFoundAddress(pickupAddress)
      ? `Origem: ${formatAddressSummary(pickupAddress)}`
      : null,
    bookingStep > 2 && hasFoundAddress(destinationAddress)
      ? `Destino: ${formatAddressSummary(destinationAddress)}`
      : null,
    bookingStep > 3 && selectedPassengers && selectedLuggage
      ? `Informacoes: ${selectedPassengers} pax • ${selectedLuggage} malas`
      : null,
  ].filter(Boolean) as string[];
  const summaryItems = [
    {
      label: "Data e horário",
      value: `${selectedDateLabel} • ${selectedTime}`,
    },
    {
      label: "Origem",
      value: formatFullAddress(pickupAddress),
    },
    {
      label: "Destino",
      value: formatFullAddress(destinationAddress),
    },
    ...(hasStop
      ? [
          {
            label: "Parada",
            value: formatFullAddress(stopAddress),
          },
        ]
      : []),
    {
      label: "Passageiros",
      value: selectedPassengers
        ? `${selectedPassengers} passageiro${selectedPassengers === "1" ? "" : "s"}`
        : "",
    },
    {
      label: "Malas",
      value: `${selectedLuggage || "0"} mala${selectedLuggage === "1" ? "" : "s"}`,
    },
    {
      label: "Espera no local",
      value:
        selectedWaiting === "short"
          ? "Sim, poucos minutos"
          : "Nao precisa",
    },
    {
      label: "Observações",
      value: notes || "Sem observações",
    },
  ];
  const whatsappMessage = [
    "Olá, gostaria de agendar uma corrida.",
    "",
    `Data e horário: ${selectedDateLabel} • ${selectedTime}`,
    `Origem: ${formatFullAddress(pickupAddress)}`,
    ...(hasStop ? [`Parada: ${formatFullAddress(stopAddress)}`] : []),
    `Destino: ${formatFullAddress(destinationAddress)}`,
    `Passageiros: ${selectedPassengers}`,
    `Malas: ${selectedLuggage}`,
    `Espera no local: ${
      selectedWaiting === "short" ? "Sim, poucos minutos" : "Nao precisa"
    }`,
    `Observações: ${notes || "Sem observações"}`,
    ...(quote
      ? [
          `Valor estimado: ${moneyFormatter.format(quote.estimatedFare)}`,
          `Distância/tempo: ${quote.distanceKm} km • ${quote.durationMinutes} min`,
          ...(quote.adjustments.length > 0
            ? quote.adjustments.map(
                (adjustment) =>
                  `${adjustment.label}: ${moneyFormatter.format(adjustment.amount)}`,
              )
            : []),
        ]
      : []),
  ].join("\n");
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    whatsappMessage,
  )}`;
  const quickWhatsappMessage = encodeURIComponent(
    "Ola, vim pelo site e prefiro continuar o agendamento pelo WhatsApp.",
  );
  const quickWhatsappUrl = `https://wa.me/${whatsappNumber}?text=${quickWhatsappMessage}`;

  return (
    <main className="page-shell black-shell corrida-shell">
      <section className="black-hero">
        <Link className="black-back-button" href="/black">
          Voltar
        </Link>
        <p className="black-hero-welcome">Agendamento</p>
        <h1 className="corrida-title">
          <span>
            <span className="corrida-highlight">Agende</span> sua
          </span>
          <span>corrida com</span>
          <span>tranquilidade</span>
        </h1>
      </section>

      <section className="corrida-visual-stack">
        <div className="corrida-image-stage">
          <Image
            alt="BYD King em captura de tela"
            className="corrida-image"
            height={1612}
            priority
            src="/Captura de Tela 2026-05-14 às 13.00.00.png"
            width={1372}
          />

          <button
            aria-expanded={open}
            className="corrida-details-toggle corrida-details-toggle-overlay"
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            <span>Detalhes do carro</span>
            <span className={`corrida-details-plus ${open ? "is-open" : ""}`}>
              +
            </span>
          </button>
        </div>

        <div className="corrida-details-shell">

            <div className={`corrida-details-panel ${open ? "is-open" : ""}`}>
          <div className="corrida-details-panel-inner">
            <div className="corrida-details-header">
              <p className="corrida-details-kicker">BYD KING GS</p>
              <h2 className="corrida-details-title">
                Conforto executivo para o seu trajeto
              </h2>
              <p className="corrida-details-copy">
                Ideal para aeroportos, reuniões e viagens. O BYD King GS
                oferece espaço, silêncio e autonomia para deixar a sua
                experiência mais confortável do início ao fim.
              </p>
            </div>

            <div className="corrida-showcase">
              {highlights.map((item, index) => (
                <article
                  className={`corrida-showcase-row ${
                    index % 2 === 1 ? "is-reversed" : ""
                  }`}
                  key={item.title}
                >
                  <figure className="corrida-showcase-media">
                    <Image
                      alt={item.alt}
                      className="corrida-showcase-image"
                      height={1200}
                      src={item.image}
                      width={1600}
                    />
                  </figure>

                  <div className="corrida-showcase-copy">
                    <p className="corrida-details-kicker">{item.eyebrow}</p>
                    <h3 className="corrida-showcase-title">{item.title}</h3>
                    <p className="corrida-showcase-text">{item.copy}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
          </div>
        </div>

        <section className="corrida-booking-shell" aria-label="Agendamento rápido">
          <div className="corrida-booking-header">
            <p className="corrida-details-kicker corrida-booking-kicker">
              Agendamento rápido
            </p>
            <h2 className="corrida-booking-title">
              Monte sua corrida em poucos passos
            </h2>
            <p className="corrida-booking-copy">
              Escolha uma etapa por vez para manter a experiência leve e
              elegante no celular.
            </p>
          </div>

          <div className="corrida-stepper" aria-label="Etapas do agendamento">
            {bookingSteps.map((step, index) => (
              <span
                className={`corrida-step-pill ${
                  bookingStep === index ? "is-active" : ""
                } ${bookingStep > index ? "is-complete" : ""}`}
                key={step}
              >
                <span className="corrida-step-text">{step}</span>
              </span>
            ))}
          </div>

          <div className="corrida-booking-grid">
            <div className="corrida-booking-card corrida-booking-calendar">
              {bookingStep > 0 && (
                <div className="corrida-booking-card-head corrida-selected-line corrida-progress-summary">
                  <p className="corrida-progress-text">
                    {progressSummaryParts.join("  •  ")}
                  </p>
                </div>
              )}

              {bookingStep === 0 && (
                <div className="corrida-step-panel corrida-step-panel-calendar">
                  <div className="corrida-calendar-block">
                    <div className="corrida-booking-card-head">
                      <p className="corrida-booking-label">Calendário</p>
                      <p className="corrida-booking-subtitle">
                        {monthFormatter.format(new Date())}
                      </p>
                    </div>

                    <div className="corrida-calendar-week">
                      {weekDays.map((day) => (
                        <span key={day.key}>{day.label}</span>
                      ))}
                    </div>

                    <div className="corrida-calendar-grid">
                      {availabilityDays.map((cell, index) => {
                        const isSelected =
                          cell.available && Number(cell.label) === selectedDate;

                        if (cell.placeholder) {
                          return (
                            <span
                              aria-hidden="true"
                              className="corrida-calendar-cell is-muted"
                              key={`muted-${index}`}
                            />
                          );
                        }

                        return (
                          <button
                            aria-pressed={isSelected}
                            className={`corrida-calendar-cell ${cell.available ? "is-available" : "is-unavailable"} ${isSelected ? "is-selected" : ""}`}
                            disabled={!cell.available}
                            key={cell.label}
                            type="button"
                            onClick={() => {
                              setSelectedDate(Number(cell.label));
                              setSelectedTime("");
                            }}
                          >
                            {cell.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="corrida-time-block">
                    <div className="corrida-time-tabs" aria-label="Períodos do dia">
                      {timeGroups.map((group) => (
                        <button
                          aria-pressed={selectedTimeGroup === group.label}
                          className={`corrida-time-tab ${selectedTimeGroup === group.label ? "is-selected" : ""}`}
                          key={group.label}
                          type="button"
                          onClick={() => setSelectedTimeGroup(group.label)}
                        >
                          {group.label}
                        </button>
                      ))}
                    </div>

                    <div className="corrida-booking-chip-row">
                      {visibleTimes.map((slot) => (
                        <button
                          aria-pressed={selectedTime === slot}
                          className={`corrida-booking-chip ${selectedTime === slot ? "is-selected" : ""}`}
                          key={slot}
                          type="button"
                          onClick={() => {
                            setSelectedTime(slot);
                          }}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {bookingStep === 1 && (
                <div className="corrida-step-panel corrida-step-panel-details">
                  <div className="corrida-booking-card corrida-booking-form">
                    <div className="corrida-booking-card-head">
                      <p className="corrida-booking-label">Origem</p>
                      <p className="corrida-booking-subtitle">
                        De onde vamos sair?
                      </p>
                    </div>

                    <div className="corrida-form-grid">
                      {renderAddressFields("pickup", pickupAddress)}
                    </div>
                  </div>
                </div>
              )}

              {bookingStep === 2 && (
                <div className="corrida-step-panel corrida-step-panel-details">
                  <div className="corrida-booking-card corrida-booking-form">
                    <div className="corrida-booking-card-head">
                      <p className="corrida-booking-label">Destino</p>
                      <p className="corrida-booking-subtitle">
                        Para onde vamos?
                      </p>
                    </div>

                    <div className="corrida-form-grid">
                      {renderAddressFields("destination", destinationAddress)}

                      <button
                        className={`corrida-stop-toggle ${hasStop ? "is-active" : ""}`}
                        type="button"
                        onClick={() => {
                          setHasStop((value) => !value);
                        }}
                      >
                        <span>{hasStop ? "Remover parada" : "Incluir parada"}</span>
                        <strong>{hasStop ? "−" : "+"}</strong>
                      </button>

                      {hasStop && (
                        <div className="corrida-stop-fields">
                          <p className="corrida-booking-label">Parada</p>
                          {renderAddressFields("stop", stopAddress)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {bookingStep === 3 && (
                <div className="corrida-step-panel corrida-step-panel-details">
                  <div className="corrida-booking-card corrida-booking-form">
                    <div className="corrida-booking-card-head">
                      <p className="corrida-booking-label">Passageiros e malas</p>
                    </div>

                    <div className="corrida-selector-group">
                      <div className="corrida-selector">
                        <p>Passageiros</p>
                        <div className="corrida-booking-chip-row">
                          {passengerCounts.map((count) => (
                            <button
                              aria-pressed={selectedPassengers === count}
                              className={`corrida-booking-chip ${selectedPassengers === count ? "is-selected" : ""}`}
                              key={count}
                              type="button"
                              onClick={() => setSelectedPassengers(count)}
                            >
                              {count}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="corrida-selector">
                        <p>Malas</p>
                        <div className="corrida-booking-chip-row">
                          {luggageOptions.map((option) => (
                            <button
                              aria-pressed={selectedLuggage === option.value}
                              className={`corrida-booking-chip ${selectedLuggage === option.value ? "is-selected" : ""}`}
                              key={option.value}
                              type="button"
                              onClick={() => setSelectedLuggage(option.value)}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="corrida-selector">
                        <p>Vai precisar de espera no local?</p>
                        <div className="corrida-booking-chip-row">
                          {waitingOptions.map((option) => (
                            <button
                              aria-pressed={selectedWaiting === option.value}
                              className={`corrida-booking-chip ${selectedWaiting === option.value ? "is-selected" : ""}`}
                              key={option.value}
                              type="button"
                              onClick={() => setSelectedWaiting(option.value)}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <label className="corrida-field corrida-field-textarea">
                        <span>Observações</span>
                        <textarea
                          placeholder="Parada extra, bebê conforto, preferência de trajeto..."
                          value={notes}
                          onChange={(event) => setNotes(event.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {bookingStep === 4 && (
                <div className="corrida-step-panel corrida-step-panel-details">
                  <div className="corrida-booking-card corrida-booking-form">
                    <div className="corrida-booking-card-head">
                      <p className="corrida-booking-label">Confirmação</p>
                      <p className="corrida-booking-subtitle">
                        Confira os dados antes de finalizar.
                      </p>
                    </div>

                    <div className="corrida-confirmation-list">
                      {summaryItems.map((item) => (
                        <div className="corrida-confirmation-item" key={item.label}>
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </div>
                      ))}
                    </div>

                    <div className="corrida-estimate-card">
                      <span>Valor estimado</span>
                      {quoteStatus === "loading" && (
                        <strong>Calculando rota...</strong>
                      )}
                      {quoteStatus === "success" && quote && (
                        <>
                          <strong>{moneyFormatter.format(quote.estimatedFare)}</strong>
                          <small>
                            {quote.distanceKm} km • {quote.durationMinutes} min
                            com trânsito previsto
                          </small>
                        </>
                      )}
                      {quoteStatus === "error" && (
                        <>
                          <strong>Não foi possível calcular agora</strong>
                          <small>
                            {quoteError ||
                              "Você ainda pode confirmar pelo WhatsApp para eu passar o valor."}
                          </small>
                        </>
                      )}
                    </div>

                    <p className="corrida-confirmation-note">
                      Seu trajeto sera revisado e confirmado diretamente no
                      WhatsApp, com o mesmo cuidado de um atendimento concierge.
                    </p>

                    <p className="corrida-confirmation-note">
                      Espera inclusa sugerida: ate 10 min em corridas urbanas,
                      15 min em rodoviaria, 15 min em Congonhas e 20 min em
                      Guarulhos. Excedente pode ser ajustado no atendimento.
                    </p>
                  </div>
                </div>
              )}

              <div className="corrida-actions-block">
                <div className="corrida-step-actions">
                  <div className="corrida-primary-actions">
                    <button
                      disabled={!canUsePrimaryButton}
                      className="corrida-step-button"
                      type="button"
                      onClick={() => {
                        if (bookingStep === bookingSteps.length - 1) {
                          window.open(whatsappUrl, "_blank", "noopener,noreferrer");
                          return;
                        }

                        setBookingStep((value) =>
                          Math.min(bookingSteps.length - 1, value + 1),
                        );
                      }}
                    >
                      {bookingStep === bookingSteps.length - 1
                        ? quoteStatus === "loading"
                          ? "Calculando..."
                          : "Confirmar no WhatsApp"
                        : "Continuar"}
                    </button>

                    {bookingStep > 0 ? (
                      <button
                        className="corrida-step-button is-secondary"
                        type="button"
                        onClick={() =>
                          setBookingStep((value) => Math.max(0, value - 1))
                        }
                      >
                        Voltar
                      </button>
                    ) : (
                      <button
                        className="corrida-whatsapp-button"
                        type="button"
                        onClick={() =>
                          window.open(
                            quickWhatsappUrl,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                      >
                        <svg
                          aria-hidden="true"
                          className="corrida-whatsapp-icon"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 3.2a8.6 8.6 0 0 0-7.3 13.2l-.9 3.3 3.4-.9A8.6 8.6 0 1 0 12 3.2Zm0 15.7a7 7 0 0 1-3.6-1l-.3-.2-2 .5.5-1.9-.2-.3A7 7 0 1 1 12 18.9Zm3.9-5.2c-.2-.1-1.2-.6-1.4-.7-.2-.1-.4-.1-.5.1l-.6.7c-.1.2-.3.2-.5.1a5.7 5.7 0 0 1-2.8-2.4c-.2-.2 0-.4.1-.5l.4-.5c.1-.1.1-.3.2-.4v-.4c0-.1-.5-1.2-.7-1.6-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.4c.1.2 1.6 2.5 3.9 3.5.5.2 1 .4 1.3.5.6.2 1.1.2 1.5.1.5-.1 1.2-.5 1.4-1 .2-.5.2-.9.1-1 0-.2-.2-.2-.4-.3Z" />
                        </svg>
                        Prefiro pelo WhatsApp
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
