"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  FiGlobe,
  FiInbox,
  FiMessageSquare,
  FiSend,
  FiCompass,
  FiUsers,
  FiMapPin,
  FiMonitor,
} from "react-icons/fi";
import { adminApi } from "@/services/api";
import Card from "../ui/Card";
import { ADM } from "./adminModuleLayout";

type PanelTab = "overview" | "visitors" | "chat" | "leads" | "recommendations";

type PublicVisitorRow = Awaited<ReturnType<typeof adminApi.getPublicVisitors>>[number];

type ChatThread = {
  id: string;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  publicVisitor: { id: string; visitorId: string; lastSeenAt: string } | null;
  messages: Array<{ id: string; content: string; senderType: string; createdAt: string }>;
  _count: { messages: number };
};

type ChatMessage = {
  id: string;
  senderType: string;
  content: string;
  createdAt: string;
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function truncate(text: string, max = 80) {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function formatLocation(v: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  countryCode?: string | null;
}) {
  const parts = [v.city, v.region, v.country || v.countryCode].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Non déterminée";
}

function deviceTypeLabel(type: string | null | undefined) {
  switch (type) {
    case "desktop":
      return "Ordinateur";
    case "mobile":
      return "Mobile";
    case "tablet":
      return "Tablette";
    case "bot":
      return "Bot";
    default:
      return "Inconnu";
  }
}

function formatDevice(v: {
  deviceType?: string | null;
  browser?: string | null;
  os?: string | null;
}) {
  const parts = [
    deviceTypeLabel(v.deviceType),
    v.browser && v.browser !== "Inconnu" ? v.browser : null,
    v.os && v.os !== "Inconnu" ? v.os : null,
  ].filter(Boolean);
  return parts.join(" · ") || "Inconnu";
}

const EVENT_LABELS: Record<string, string> = {
  PAGE_VIEW: "Page vue",
  CONTACT_LEAD_SUBMIT: "Contact",
  ADMISSION_SUBMIT: "Pré-inscription",
  ADMISSION_TRACK: "Suivi dossier",
  RECOMMENDATION_REQUEST: "Orientation",
  CHAT_THREAD_CREATE: "Chat ouvert",
  CHAT_MESSAGE_SUBMIT: "Message chat",
};

const PublicVisitorsAdminPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<PanelTab>("overview");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-public-visitor-stats"],
    queryFn: () => adminApi.getPublicVisitorStats(),
    refetchInterval: 60_000,
  });

  const { data: visitors = [], isLoading: visitorsLoading } = useQuery({
    queryKey: ["admin-public-visitors"],
    queryFn: () => adminApi.getPublicVisitors({ limit: 80 }),
    enabled: tab === "visitors" || tab === "overview",
    refetchInterval: tab === "visitors" ? 30_000 : false,
  });

  const { data: visitorDetail, isLoading: visitorDetailLoading } = useQuery({
    queryKey: ["admin-public-visitor", selectedVisitorId],
    queryFn: () => adminApi.getPublicVisitorDetail(selectedVisitorId!),
    enabled: Boolean(selectedVisitorId) && tab === "visitors",
  });

  const { data: threads = [], isLoading: threadsLoading } = useQuery({
    queryKey: ["admin-public-chat-threads"],
    queryFn: () => adminApi.getPublicChatThreads({ limit: 50 }),
    enabled: tab === "chat" || tab === "overview",
    refetchInterval: tab === "chat" ? 10_000 : false,
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["admin-public-contact-leads"],
    queryFn: () => adminApi.getPublicContactLeads({ limit: 50 }),
    enabled: tab === "leads",
  });

  const { data: recommendations = [], isLoading: recoLoading } = useQuery({
    queryKey: ["admin-public-recommendations"],
    queryFn: () => adminApi.getPublicRecommendations({ limit: 50 }),
    enabled: tab === "recommendations",
  });

  const {
    data: threadDetail,
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["admin-public-chat-thread", selectedThreadId],
    queryFn: () => adminApi.getPublicChatThreadMessages(selectedThreadId!),
    enabled: Boolean(selectedThreadId),
    refetchInterval: selectedThreadId ? 5_000 : false,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadDetail?.messages, selectedThreadId]);

  useEffect(() => {
    if (tab !== "chat") return;
    const list = threads as ChatThread[];
    if (!selectedThreadId && list.length > 0) {
      setSelectedThreadId(list[0].id);
    }
  }, [tab, threads, selectedThreadId]);

  useEffect(() => {
    if (tab !== "visitors") return;
    const list = visitors as PublicVisitorRow[];
    if (!selectedVisitorId && list.length > 0) {
      setSelectedVisitorId(list[0].id);
    }
  }, [tab, visitors, selectedVisitorId]);

  const sendReply = useMutation({
    mutationFn: async () => {
      if (!selectedThreadId) throw new Error("Aucun fil");
      const text = reply.trim();
      if (!text) throw new Error("Message vide");
      return adminApi.sendPublicChatStaffMessage(selectedThreadId, text);
    },
    onSuccess: async () => {
      setReply("");
      await refetchMessages();
      await queryClient.invalidateQueries({ queryKey: ["admin-public-chat-threads"] });
      toast.success("Réponse envoyée");
    },
    onError: () => toast.error("Envoi impossible"),
  });

  const toggleThreadStatus = useMutation({
    mutationFn: async (status: "OPEN" | "CLOSED") => {
      if (!selectedThreadId) throw new Error("Aucun fil");
      return adminApi.updatePublicChatThreadStatus(selectedThreadId, status);
    },
    onSuccess: async () => {
      await refetchMessages();
      await queryClient.invalidateQueries({ queryKey: ["admin-public-chat-threads"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-public-visitor-stats"] });
      toast.success("Statut mis à jour");
    },
    onError: () => toast.error("Mise à jour impossible"),
  });

  const subTabs: { id: PanelTab; label: string; icon: typeof FiGlobe }[] = [
    { id: "overview", label: "Vue d’ensemble", icon: FiGlobe },
    { id: "visitors", label: "Liste visiteurs", icon: FiUsers },
    { id: "chat", label: "Chat site public", icon: FiMessageSquare },
    { id: "leads", label: "Leads contact", icon: FiInbox },
    { id: "recommendations", label: "Orientation", icon: FiCompass },
  ];

  const openThreads = (threads as ChatThread[]).filter((t) => t.status === "OPEN").length;

  const renderVisitors = () => {
    const detail = visitorDetail?.visitor;
    const events = visitorDetail?.events ?? [];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-4">
        <Card className="p-3 border border-stone-200 max-h-[36rem] overflow-y-auto">
          <p className="text-xs font-semibold text-stone-600 mb-2">Visiteurs récents</p>
          {visitorsLoading ? (
            <p className="text-xs text-stone-500">Chargement…</p>
          ) : (visitors as PublicVisitorRow[]).length === 0 ? (
            <p className="text-xs text-stone-500">Aucun visiteur enregistré pour l’instant.</p>
          ) : (
            <ul className="space-y-1">
              {(visitors as PublicVisitorRow[]).map((v) => {
                const active = v.id === selectedVisitorId;
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedVisitorId(v.id)}
                      className={`w-full text-left rounded-xl px-3 py-2 text-xs transition ${
                        active
                          ? "bg-teal-50 ring-1 ring-teal-200 text-teal-950"
                          : "hover:bg-stone-50 text-stone-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold truncate">{v.visitorId.slice(0, 10)}…</span>
                        <span className="text-[10px] text-stone-400 shrink-0">
                          {formatDate(v.lastSeenAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-stone-500 truncate flex items-center gap-1">
                        <FiMapPin className="shrink-0 opacity-70" />
                        {formatLocation(v)}
                      </p>
                      <p className="mt-0.5 text-stone-500 truncate flex items-center gap-1">
                        <FiMonitor className="shrink-0 opacity-70" />
                        {formatDevice(v)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-stone-400">
                        {v._count.events} événement(s) · {v._count.contactLeads} lead(s) ·{" "}
                        {v._count.chatThreads} chat(s)
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="border border-stone-200 p-4 max-h-[36rem] overflow-y-auto space-y-4">
          {!selectedVisitorId ? (
            <p className="text-xs text-stone-500">Sélectionnez un visiteur.</p>
          ) : visitorDetailLoading && !detail ? (
            <p className="text-xs text-stone-500">Chargement du détail…</p>
          ) : !detail ? (
            <p className="text-xs text-stone-500">Visiteur introuvable.</p>
          ) : (
            <>
              <div>
                <p className="text-sm font-semibold text-stone-900">
                  Visiteur {detail.visitorId.slice(0, 12)}…
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Première visite {formatDate(detail.firstSeenAt)} · Dernière{" "}
                  {formatDate(detail.lastSeenAt)}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl bg-stone-50 ring-1 ring-stone-200/70 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500 flex items-center gap-1">
                    <FiMapPin /> Localisation
                  </p>
                  <p className="text-xs font-semibold text-stone-900 mt-1">
                    {formatLocation(detail)}
                  </p>
                  {detail.lastIp && (
                    <p className="text-[11px] text-stone-500 mt-1">IP : {detail.lastIp}</p>
                  )}
                  <p className="text-[10px] text-stone-400 mt-1">
                    Approximative (via IP), pas de GPS
                  </p>
                </div>
                <div className="rounded-xl bg-stone-50 ring-1 ring-stone-200/70 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500 flex items-center gap-1">
                    <FiMonitor /> Appareil
                  </p>
                  <p className="text-xs font-semibold text-stone-900 mt-1">
                    {formatDevice(detail)}
                  </p>
                  {detail.language && (
                    <p className="text-[11px] text-stone-500 mt-1">Langue : {detail.language}</p>
                  )}
                  {detail.timezone && (
                    <p className="text-[11px] text-stone-500">Fuseau : {detail.timezone}</p>
                  )}
                </div>
              </div>

              {detail.contactLeads.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-stone-700 mb-1">Leads contact</p>
                  <ul className="text-xs text-stone-600 space-y-1">
                    {detail.contactLeads.map((l) => (
                      <li key={l.id}>
                        {l.name} · {l.email}
                        {l.subject ? ` — ${l.subject}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detail.chatThreads.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-stone-700 mb-1">Chats</p>
                  <ul className="text-xs text-stone-600 space-y-1">
                    {detail.chatThreads.map((t) => (
                      <li key={t.id}>
                        {t.status === "OPEN" ? "Ouvert" : "Fermé"} · {t._count.messages} msg ·{" "}
                        {formatDate(t.updatedAt)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-stone-700 mb-2">Parcours / événements</p>
                {events.length === 0 ? (
                  <p className="text-xs text-stone-500">Aucun événement.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {events.map((e) => (
                      <li
                        key={e.id}
                        className="rounded-lg bg-white ring-1 ring-stone-100 px-2.5 py-1.5 text-[11px]"
                      >
                        <div className="flex justify-between gap-2">
                          <span className="font-semibold text-stone-800">
                            {EVENT_LABELS[e.eventType] ?? e.eventType}
                          </span>
                          <span className="text-stone-400 shrink-0">{formatDate(e.createdAt)}</span>
                        </div>
                        {e.pageUrl && (
                          <p className="text-stone-600 truncate mt-0.5">{e.pageUrl}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    );
  };

  const renderChat = () => {
    const messages = (threadDetail?.messages ?? []) as ChatMessage[];
    const threadStatus = threadDetail?.thread.status;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4">
        <Card className="p-3 border border-stone-200 max-h-[32rem] overflow-y-auto">
          <p className="text-xs font-semibold text-stone-600 mb-2">Fils de conversation</p>
          {threadsLoading ? (
            <p className="text-xs text-stone-500">Chargement…</p>
          ) : (threads as ChatThread[]).length === 0 ? (
            <p className="text-xs text-stone-500">Aucun message visiteur pour l’instant.</p>
          ) : (
            <ul className="space-y-1">
              {(threads as ChatThread[]).map((t) => {
                const last = t.messages[0];
                const active = t.id === selectedThreadId;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedThreadId(t.id)}
                      className={`w-full text-left rounded-xl px-3 py-2 text-xs transition ${
                        active
                          ? "bg-teal-50 ring-1 ring-teal-200 text-teal-950"
                          : "hover:bg-stone-50 text-stone-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold truncate">
                          Visiteur {t.publicVisitor?.visitorId?.slice(0, 8) ?? "—"}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            t.status === "OPEN"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-stone-200 text-stone-600"
                          }`}
                        >
                          {t.status === "OPEN" ? "Ouvert" : "Fermé"}
                        </span>
                      </div>
                      {last && (
                        <p className="mt-1 text-stone-500 truncate">
                          {last.senderType === "STAFF" ? "Équipe : " : ""}
                          {truncate(last.content, 60)}
                        </p>
                      )}
                      <p className="mt-0.5 text-[10px] text-stone-400">{formatDate(t.updatedAt)}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col border border-stone-200 min-h-[20rem] max-h-[32rem]">
          {!selectedThreadId ? (
            <p className="p-4 text-xs text-stone-500">Sélectionnez un fil.</p>
          ) : messagesLoading && !threadDetail ? (
            <p className="p-4 text-xs text-stone-500">Chargement des messages…</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-stone-800">Conversation</p>
                  <p className="text-[10px] text-stone-500">
                    {threadDetail?.thread.publicVisitor?.visitorId?.slice(0, 12) ?? "Anonyme"}
                  </p>
                </div>
                <div className="flex gap-1">
                  {threadStatus === "OPEN" ? (
                    <button
                      type="button"
                      onClick={() => toggleThreadStatus.mutate("CLOSED")}
                      disabled={toggleThreadStatus.isPending}
                      className="rounded-lg px-2 py-1 text-[10px] font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200"
                    >
                      Fermer
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleThreadStatus.mutate("OPEN")}
                      disabled={toggleThreadStatus.isPending}
                      className="rounded-lg px-2 py-1 text-[10px] font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                    >
                      Rouvrir
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 ? (
                  <p className="text-xs text-stone-500">Aucun message.</p>
                ) : (
                  messages.map((m) => {
                    const isStaff = m.senderType === "STAFF";
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isStaff ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                            isStaff
                              ? "bg-teal-700 text-white"
                              : "bg-stone-100 text-stone-800"
                          }`}
                        >
                          <p className="text-[10px] font-semibold opacity-80 mb-0.5">
                            {isStaff ? "Équipe" : "Visiteur"}
                          </p>
                          <p>{m.content}</p>
                          <p className="text-[10px] opacity-70 mt-1">{formatDate(m.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {threadStatus === "OPEN" ? (
                <form
                  className="border-t border-stone-100 p-2 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendReply.mutate();
                  }}
                >
                  <input
                    type="text"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Répondre au visiteur…"
                    maxLength={2000}
                    className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                  <button
                    type="submit"
                    disabled={sendReply.isPending || !reply.trim()}
                    className="inline-flex items-center gap-1 rounded-xl bg-teal-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    <FiSend className="h-3.5 w-3.5" />
                    Envoyer
                  </button>
                </form>
              ) : (
                <p className="border-t border-stone-100 p-3 text-[11px] text-stone-500">
                  Fil fermé — rouvrez-le pour répondre.
                </p>
              )}
            </>
          )}
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className={ADM.tabRow}>
        {subTabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={ADM.tabBtn(active, "bg-teal-700 text-white ring-1 ring-teal-600/30")}
            >
              <Icon className={ADM.tabIcon} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && (
        <div className={ADM.section}>
          <div className={ADM.grid5}>
            <Card className={`${ADM.statCard} border border-stone-200`}>
              <p className={ADM.statLabel}>Visiteurs uniques</p>
              <p className={ADM.statVal}>{statsLoading ? "…" : (stats?.visitorsCount ?? 0)}</p>
            </Card>
            <Card className={`${ADM.statCard} border border-sky-100 bg-sky-50/40`}>
              <p className={ADM.statLabel}>Pages vues</p>
              <p className={`${ADM.statValTone} text-sky-900`}>
                {statsLoading ? "…" : (stats?.pageViewsCount ?? 0)}
              </p>
            </Card>
            <Card className={`${ADM.statCard} border border-amber-100 bg-amber-50/40`}>
              <p className={ADM.statLabel}>Leads contact</p>
              <p className={`${ADM.statValTone} text-amber-900`}>
                {statsLoading ? "…" : (stats?.contactLeadsCount ?? 0)}
              </p>
            </Card>
            <Card className={`${ADM.statCard} border border-teal-100 bg-teal-50/40`}>
              <p className={ADM.statLabel}>Chats ouverts</p>
              <p className={`${ADM.statValTone} text-teal-900`}>
                {statsLoading ? "…" : (stats?.openThreadsCount ?? openThreads)}
              </p>
            </Card>
            <Card className={`${ADM.statCard} border border-violet-100 bg-violet-50/40`}>
              <p className={ADM.statLabel}>Demandes orientation</p>
              <p className={`${ADM.statValTone} text-violet-900`}>
                {statsLoading ? "…" : (stats?.recommendationsCount ?? 0)}
              </p>
            </Card>
          </div>
          <Card className={ADM.helpCard}>
            <p className="text-xs text-stone-700 leading-relaxed">
              Les visiteurs non connectés sont identifiés par un cookie anonyme. L’onglet{" "}
              <strong>Liste visiteurs</strong> affiche la localisation approximative (via IP),
              l’appareil / navigateur, et le parcours de pages. L’identité (nom, e-mail) n’apparaît
              que s’ils ont rempli un formulaire.
            </p>
          </Card>
        </div>
      )}

      {tab === "visitors" && renderVisitors()}

      {tab === "chat" && renderChat()}

      {tab === "leads" && (
        <Card className="p-4 border border-stone-200">
          {leadsLoading ? (
            <p className="text-xs text-stone-500">Chargement…</p>
          ) : (leads as any[]).length === 0 ? (
            <p className="text-xs text-stone-500">Aucun lead contact.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {(leads as any[]).map((lead) => (
                <li key={lead.id} className="py-3 first:pt-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{lead.name}</p>
                      <p className="text-xs text-stone-600">{lead.email}</p>
                      {lead.phone && <p className="text-xs text-stone-500">{lead.phone}</p>}
                    </div>
                    <p className="text-[10px] text-stone-400">{formatDate(lead.createdAt)}</p>
                  </div>
                  {lead.subject && (
                    <p className="mt-1 text-xs font-medium text-stone-700">{lead.subject}</p>
                  )}
                  <p className="mt-1 text-xs text-stone-600 whitespace-pre-wrap">{lead.message}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "recommendations" && (
        <Card className="p-4 border border-stone-200">
          {recoLoading ? (
            <p className="text-xs text-stone-500">Chargement…</p>
          ) : (recommendations as any[]).length === 0 ? (
            <p className="text-xs text-stone-500">Aucune demande d’orientation.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {(recommendations as any[]).map((row) => {
                const criteria = row.criteria as Record<string, unknown> | null;
                const result = row.result as { suggestions?: Array<{ title: string }> } | null;
                return (
                  <li key={row.id} className="py-3 first:pt-0">
                    <div className="flex justify-between gap-2">
                      <p className="text-xs font-semibold text-stone-800">
                        Niveau : {String(criteria?.currentLevel ?? "—")}
                      </p>
                      <p className="text-[10px] text-stone-400">{formatDate(row.createdAt)}</p>
                    </div>
                    <p className="text-xs text-stone-600 mt-1">
                      Intentions : {String(criteria?.intent ?? "—")}
                    </p>
                    {Array.isArray(criteria?.interests) && criteria!.interests.length > 0 && (
                      <p className="text-xs text-stone-500 mt-0.5">
                        Intérêts : {(criteria!.interests as string[]).join(", ")}
                      </p>
                    )}
                    {result?.suggestions && result.suggestions.length > 0 && (
                      <ul className="mt-2 text-xs text-stone-700 list-disc list-inside">
                        {result.suggestions.slice(0, 3).map((s, i) => (
                          <li key={i}>{s.title}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
};

export default PublicVisitorsAdminPanel;
