"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, Camera, CreditCard, Heart, Image as ImageIcon, MessageSquare, Pencil, Save, Ticket, Trash2, UsersRound, X } from "lucide-react";
import type { DemoRole } from "@/lib/demo-session";
import { getClientUserScope, scopedStorageKey } from "@/lib/client-user-scope";
import { formatBRL, ticketsStorageBaseKey, type FakeTicket } from "@/lib/fake-tickets";
import { queueOfflineAction } from "@/lib/offline-sync";
import type { FeaturedEvent, Venue } from "@/lib/types";

type Props = {
  role: DemoRole;
  name: string;
  email: string;
  events: FeaturedEvent[];
  venues: Venue[];
};

type Feedback = {
  id: string;
  venueId?: string;
  venue: string;
  rating: string;
  text: string;
  createdAt?: string;
  userId?: string | null;
  imageDataUrl?: string;
  imageUrl?: string;
  pending?: boolean;
};

export function AccountDashboard({ role, name, email, events, venues }: Props) {
  return (
    <section className="surface-grid mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {role === "owner" ? (
        <OwnerPanel name={name} email={email} events={events} />
      ) : (
        <GuestPanel name={name} email={email} events={events} venues={venues} />
      )}
    </section>
  );
}

function GuestPanel({ name, email, events, venues }: { name: string; email: string; events: FeaturedEvent[]; venues: Venue[] }) {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [tickets, setTickets] = useState<FakeTicket[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [savedKey, setSavedKey] = useState("nightguide-saved-events:guest");
  const [ticketKey, setTicketKey] = useState(scopedStorageKey(ticketsStorageBaseKey, "guest"));
  const [feedbackKey, setFeedbackKey] = useState("nightguide-feedbacks:guest");
  const [venue, setVenue] = useState(venues[0]?.name ?? "");
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [savingFeedback, setSavingFeedback] = useState(false);

  const savedEvents = events.filter((event) => savedIds.includes(event.id));

  useEffect(() => {
    let active = true;

    async function loadUserData() {
      const scope = await getClientUserScope();
      const nextSavedKey = scopedStorageKey("nightguide-saved-events", scope.storageScope);
      const nextTicketKey = scopedStorageKey(ticketsStorageBaseKey, scope.storageScope);
      const nextFeedbackKey = scopedStorageKey("nightguide-feedbacks", scope.storageScope);
      if (!active) return;

      setSavedKey(nextSavedKey);
      setTicketKey(nextTicketKey);
      setFeedbackKey(nextFeedbackKey);
      setUserId(scope.userId);
      setSavedIds(JSON.parse(localStorage.getItem(nextSavedKey) || "[]") as string[]);
      setTickets(JSON.parse(localStorage.getItem(nextTicketKey) || "[]") as FakeTicket[]);
      setFeedbacks(JSON.parse(localStorage.getItem(nextFeedbackKey) || "[]") as Feedback[]);
    }

    void loadUserData();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  async function addFeedback() {
    if (!comment.trim()) return;
    setSavingFeedback(true);
    const selectedVenue = venues.find((item) => item.name === venue);
    const feedback: Feedback = {
      id: crypto.randomUUID(),
      venueId: selectedVenue?.id,
      venue,
      rating,
      text: comment.trim(),
      createdAt: new Date().toISOString(),
      userId,
      imageDataUrl: photoDataUrl || undefined,
      pending: true,
    };
    const next = [feedback, ...feedbacks];
    setFeedbacks(next);
    localStorage.setItem(feedbackKey, JSON.stringify(next));
    await queueOfflineAction({
      id: feedback.id,
      type: "review_created",
      entityType: "review",
      entityId: selectedVenue?.id ?? venue,
      payload: {
        venueId: selectedVenue?.id,
        venueName: venue,
        rating: Number(rating),
        comment: feedback.text,
        imageDataUrl: photoDataUrl || undefined,
        imageName: photoName || undefined,
      },
    });
    setComment("");
    setPhotoDataUrl(null);
    setPhotoName("");
    setSavingFeedback(false);
  }

  async function choosePhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 6 * 1024 * 1024) {
      window.alert("A foto precisa ter no máximo 6 MB.");
      return;
    }

    try {
      setPhotoDataUrl(await compressImage(file));
      setPhotoName(file.name);
    } catch {
      window.alert("Não foi possível carregar essa foto.");
    }
  }

  function removeFavorite(eventId: string) {
    const removedEvent = events.find((event) => event.id === eventId);
    const next = savedIds.filter((id) => id !== eventId);
    setSavedIds(next);
    localStorage.setItem(savedKey, JSON.stringify(next));
    void queueOfflineAction({
      type: "favorite_removed",
      entityType: "event",
      entityId: eventId,
      payload: {
        eventId,
        title: removedEvent?.title,
        venue: removedEvent?.venue,
      },
    });
  }

  function cancelTicket(ticketId: string) {
    const ticket = tickets.find((item) => item.id === ticketId);
    const next = tickets.filter((item) => item.id !== ticketId);
    setTickets(next);
    localStorage.setItem(ticketKey, JSON.stringify(next));
    void queueOfflineAction({
      type: "ticket_cancelled",
      entityType: "ticket",
      entityId: ticket?.eventId ?? ticketId,
      payload: {
        ticketId,
        cancelledInDemo: true,
        eventTitle: ticket?.eventTitle,
      },
    });
  }

  return (
    <>
      <Hero eyebrow="Cliente" title={`Olá, ${name}`} text={email} />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Metric icon={<Ticket size={20} aria-hidden />} label="Ingressos" value={String(tickets.length)} text="Compras teste aprovadas" />
        <Metric icon={<Heart size={20} aria-hidden />} label="Favoritos" value={String(savedIds.length)} text="Sincronizado com a home" />
        <Metric icon={<MessageSquare size={20} aria-hidden />} label="Feedbacks" value={String(feedbacks.length)} text="Comentários enviados" />
      </div>

      <Panel title="Meus ingressos" className="mt-6">
        {tickets.length ? (
          <div className="grid gap-3">
            {tickets.map((ticket) => (
              <Row
                key={ticket.id}
                title={ticket.eventTitle}
                meta={`${ticket.quantity}x - ${ticket.venue} - ${ticket.date} as ${ticket.time} - ${ticket.paymentLabel}`}
                action={formatBRL(ticket.totalAmount)}
              >
                <span className="hidden rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-[color:var(--muted)] sm:inline">
                  {ticket.id}
                </span>
                <button onClick={() => cancelTicket(ticket.id)} className="icon-button" aria-label="Remover ingresso">
                  <Trash2 size={17} aria-hidden />
                </button>
              </Row>
            ))}
          </div>
        ) : (
          <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-4">
            <CreditCard className="text-[color:var(--accent)]" size={22} aria-hidden />
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
              Quando voce comprar um ingresso no modo teste, ele aparece aqui com codigo, valor e forma de pagamento.
            </p>
          </div>
        )}
      </Panel>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Panel title="Meus favoritos">
          {savedEvents.length ? (
            savedEvents.map((event) => (
              <Row key={event.id} title={event.title} meta={`${event.date} às ${event.time} · ${event.venue}`} action={event.price}>
                <button onClick={() => removeFavorite(event.id)} className="icon-button" aria-label="Remover favorito">
                  <Trash2 size={17} aria-hidden />
                </button>
              </Row>
            ))
          ) : (
            <p className="text-sm leading-6 text-[color:var(--muted)]">
              Favorita um evento na página inicial que ele aparece aqui.
            </p>
          )}
        </Panel>

        <Panel title="Criar publicação com foto">
          <div className="grid gap-3">
            <label className="field-label">
              Local
              <select value={venue} onChange={(event) => setVenue(event.target.value)} className="field-input">
                {venues.map((item) => (
                  <option key={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Nota
              <select value={rating} onChange={(event) => setRating(event.target.value)} className="field-input">
                <option value="5">5 estrelas</option>
                <option value="4">4 estrelas</option>
                <option value="3">3 estrelas</option>
              </select>
            </label>
            <label className="field-label">
              Comentário
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} className="field-input min-h-28 resize-none" />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-white/10 px-4 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--accent)]">
                <ImageIcon size={18} aria-hidden />
                Escolher da galeria
                <input type="file" accept="image/*" className="sr-only" onChange={(event) => void choosePhoto(event.target.files?.[0])} />
              </label>
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-white/10 px-4 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--accent)]">
                <Camera size={18} aria-hidden />
                Tirar foto
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => void choosePhoto(event.target.files?.[0])} />
              </label>
            </div>
            {photoDataUrl ? (
              <div className="relative overflow-hidden rounded-[8px] border border-white/10">
                <img src={photoDataUrl} alt="Prévia da publicação" className="max-h-72 w-full object-cover" />
                <button type="button" onClick={() => { setPhotoDataUrl(null); setPhotoName(""); }} className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/75 text-white" aria-label="Remover foto">
                  <X size={17} aria-hidden />
                </button>
              </div>
            ) : null}
            <p className="text-xs leading-5 text-[color:var(--muted)]">{online ? "Publica agora e mantém uma cópia offline." : "Sem internet: fica salvo neste aparelho e será enviado quando voltar."}</p>
            <button onClick={() => void addFeedback()} disabled={savingFeedback || !comment.trim()} className="primary-button disabled:cursor-not-allowed disabled:opacity-60">
              <MessageSquare size={18} aria-hidden />
              {savingFeedback ? "Salvando…" : "Publicar comentário"}
            </button>
          </div>
        </Panel>
      </div>

      <Panel title="Meus comentários" className="mt-6">
        {feedbacks.length ? (
          feedbacks.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-[8px] border border-white/10 bg-white/[0.04]">
              <div className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-[color:var(--foreground)]">📍 {item.venue}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-[color:var(--muted)]">{item.text}</p>
                  <p className="mt-2 text-xs text-[color:var(--muted)]">{item.pending ? "Salvo offline · aguardando sincronização" : "Publicado"}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-[color:var(--accent)]">{item.rating}/5</span>
              </div>
              {item.imageDataUrl || item.imageUrl ? <img src={item.imageDataUrl || item.imageUrl} alt={`Foto publicada em ${item.venue}`} className="max-h-80 w-full object-cover" /> : null}
            </article>
          ))
        ) : (
          <p className="text-sm text-[color:var(--muted)]">Nenhum feedback enviado ainda.</p>
        )}
      </Panel>
    </>
  );
}

function OwnerPanel({ name, email, events }: { name: string; email: string; events: FeaturedEvent[] }) {
  const initialProfile = getInitialOwnerProfile(name);
  const [venueName, setVenueName] = useState(initialProfile.venueName);
  const [description, setDescription] = useState(initialProfile.description);
  const [cover, setCover] = useState(initialProfile.cover);
  const [ownerEvents, setOwnerEvents] = useState<FeaturedEvent[]>(events.filter((event) => event.venue === "Vila Gastrobar"));
  const [profileKey, setProfileKey] = useState("nightguide-owner-profile:guest");
  const [ownerEventsKey, setOwnerEventsKey] = useState("nightguide-owner-events:guest");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => emptyEvent());

  const interested = useMemo(() => ownerEvents.length * 31 + 43, [ownerEvents.length]);

  useEffect(() => {
    let active = true;

    async function loadOwnerData() {
      const scope = await getClientUserScope();
      const nextProfileKey = scopedStorageKey("nightguide-owner-profile", scope.storageScope);
      const nextOwnerEventsKey = scopedStorageKey("nightguide-owner-events", scope.storageScope);
      if (!active) return;

      setProfileKey(nextProfileKey);
      setOwnerEventsKey(nextOwnerEventsKey);

      const storedProfile = localStorage.getItem(nextProfileKey);
      if (storedProfile) {
        const profile = JSON.parse(storedProfile) as ReturnType<typeof getInitialOwnerProfile>;
        setVenueName(profile.venueName);
        setDescription(profile.description);
        setCover(profile.cover);
      }

      setOwnerEvents(
        JSON.parse(
          localStorage.getItem(nextOwnerEventsKey) || JSON.stringify(events.filter((event) => event.venue === "Vila Gastrobar")),
        ) as FeaturedEvent[],
      );
    }

    void loadOwnerData();
    return () => {
      active = false;
    };
  }, [events]);

  function saveProfile() {
    const profile = { venueName, description, cover };
    localStorage.setItem(profileKey, JSON.stringify(profile));
    void queueOfflineAction({
      type: "venue_profile_updated",
      entityType: "venue",
      entityId: venueName,
      payload: profile,
    });
  }

  function saveEvent() {
    const eventToSave: FeaturedEvent = {
      ...draft,
      id: editingId ?? `event-${Date.now()}`,
      venue: venueName,
      image: draft.image || cover,
      distance: draft.distance || "1.0 km",
      mood: draft.mood || "Ao vivo",
    };
    const next = editingId
      ? ownerEvents.map((event) => (event.id === editingId ? eventToSave : event))
      : [eventToSave, ...ownerEvents];
    setOwnerEvents(next);
    localStorage.setItem(ownerEventsKey, JSON.stringify(next));
    void queueOfflineAction({
      type: "owner_event_upserted",
      entityType: "event",
      entityId: eventToSave.id,
      payload: eventToSave as unknown as Record<string, unknown>,
    });
    setEditingId(null);
    setDraft(emptyEvent());
  }

  function editEvent(event: FeaturedEvent) {
    setEditingId(event.id);
    setDraft(event);
  }

  function deleteEvent(eventId: string) {
    const removedEvent = ownerEvents.find((event) => event.id === eventId);
    const next = ownerEvents.filter((event) => event.id !== eventId);
    setOwnerEvents(next);
    localStorage.setItem(ownerEventsKey, JSON.stringify(next));
    void queueOfflineAction({
      type: "owner_event_deleted",
      entityType: "event",
      entityId: eventId,
      payload: {
        eventId,
        title: removedEvent?.title,
        venue: removedEvent?.venue,
      },
    });
  }

  return (
    <>
      <Hero eyebrow="Estabelecimento" title={venueName} text={email} />
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Metric icon={<CalendarDays size={20} aria-hidden />} label="Eventos ativos" value={String(ownerEvents.length)} text="Editáveis no demo" />
        <Metric icon={<UsersRound size={20} aria-hidden />} label="Interessados" value={String(interested)} text="Cliques simulados" />
        <Metric icon={<Heart size={20} aria-hidden />} label="Salvos" value="42" text="Favoritos esta semana" />
        <Metric icon={<BarChart3 size={20} aria-hidden />} label="Alcance" value="+18%" text="Comparado à semana passada" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Editar estabelecimento">
          <div className="relative mb-4 h-44 overflow-hidden rounded-[8px] border border-white/10">
            <Image src={cover} alt="" fill className="object-cover" sizes="420px" />
          </div>
          <div className="grid gap-3">
            <label className="field-label">
              Nome do local
              <input value={venueName} onChange={(event) => setVenueName(event.target.value)} className="field-input" />
            </label>
            <label className="field-label">
              URL/caminho da capa
              <input value={cover} onChange={(event) => setCover(event.target.value)} className="field-input" />
            </label>
            <label className="field-label">
              Descrição
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="field-input min-h-28 resize-none" />
            </label>
            <button onClick={saveProfile} className="primary-button">
              <Camera size={18} aria-hidden />
              Salvar estabelecimento
            </button>
          </div>
        </Panel>

        <Panel title={editingId ? "Editar evento" : "Criar evento"}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Título" value={draft.title} onChange={(value) => setDraft({ ...draft, title: value })} />
            <Field label="Preço" value={draft.price} onChange={(value) => setDraft({ ...draft, price: value })} />
            <Field label="Dia" value={draft.date} onChange={(value) => setDraft({ ...draft, date: value })} />
            <Field label="Horário" value={draft.time} onChange={(value) => setDraft({ ...draft, time: value })} />
            <Field label="Gênero" value={draft.genre} onChange={(value) => setDraft({ ...draft, genre: value })} />
            <Field label="Imagem" value={draft.image} onChange={(value) => setDraft({ ...draft, image: value })} />
            <label className="field-label sm:col-span-2">
              Descrição do evento
              <textarea
                value={draft.highlight}
                onChange={(event) => setDraft({ ...draft, highlight: event.target.value })}
                className="field-input min-h-24 resize-none"
              />
            </label>
          </div>
          <button onClick={saveEvent} className="primary-button mt-4">
            <Save size={18} aria-hidden />
            {editingId ? "Salvar edição" : "Publicar evento"}
          </button>
        </Panel>
      </div>

      <Panel title="Eventos do estabelecimento" className="mt-6">
        {ownerEvents.map((event) => (
          <Row key={event.id} title={event.title} meta={`${event.date} às ${event.time} · ${event.highlight}`} action={event.price}>
            <button onClick={() => editEvent(event)} className="icon-button" aria-label="Editar evento">
              <Pencil size={17} aria-hidden />
            </button>
            <button onClick={() => deleteEvent(event.id)} className="icon-button" aria-label="Excluir evento">
              <Trash2 size={17} aria-hidden />
            </button>
          </Row>
        ))}
      </Panel>
    </>
  );
}

function emptyEvent(): FeaturedEvent {
  return {
    id: "",
    title: "",
    venue: "",
    date: "Sábado",
    time: "21:00",
    genre: "",
    price: "R$ 20",
    image: "",
    highlight: "",
    mood: "Ao vivo",
    distance: "1.0 km",
  };
}

function getInitialOwnerProfile(name: string) {
  return {
    venueName: name,
    description: "Drinks autorais, samba ao vivo e jantar no centro de Saquarema.",
    cover: "/events/samba-da-vila-real.jpg",
  };
}

function Hero({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="rounded-[8px] border border-white/10 bg-[color:var(--panel)] p-6 shadow-2xl shadow-black/25">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">{eyebrow}</p>
      <h1 className="mt-2 text-4xl font-semibold text-[color:var(--foreground)]">{title}</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">{text}</p>
    </div>
  );
}

function Metric({ icon, label, value, text }: { icon: React.ReactNode; label: string; value: string; text: string }) {
  return (
    <article className="rounded-[8px] border border-white/10 bg-[color:var(--panel)] p-4">
      <div className="mb-4 grid h-10 w-10 place-items-center rounded-[8px] bg-[color:var(--accent)] text-[color:var(--ink)]">{icon}</div>
      <p className="text-sm text-[color:var(--muted)]">{label}</p>
      <strong className="mt-1 block text-3xl text-[color:var(--foreground)]">{value}</strong>
      <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">{text}</p>
    </article>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[8px] border border-white/10 bg-[color:var(--panel)] p-5 ${className}`}>
      <h2 className="text-xl font-semibold text-[color:var(--foreground)]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({ title, meta, action, children }: { title: string; meta: string; action: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[8px] border border-white/10 bg-white/[0.04] p-4">
      <div className="min-w-0">
        <h3 className="truncate font-semibold text-[color:var(--foreground)]">{title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-[color:var(--muted)]">{meta}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-semibold text-[color:var(--accent)]">{action}</span>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field-label">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="field-input" />
    </label>
  );
}

function compressImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Não foi possível ler a imagem."));
    reader.onload = () => {
      const image = new window.Image();
      image.onerror = () => reject(new Error("Imagem inválida."));
      image.onload = () => {
        const maxSide = 1400;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Seu navegador não suporta prévia de imagem."));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
