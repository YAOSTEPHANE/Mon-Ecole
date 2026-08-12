"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FiCompass, FiMessageSquare, FiSend, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ensurePublicVisitorId } from "@/lib/public-visitor";
import {
  buildPublicRecommendations,
  PUBLIC_RECO_INTERESTS,
  PUBLIC_RECO_LEVEL_OPTIONS,
  type PublicRecoInterestId,
  type PublicRecoIntent,
  type PublicRecoResult,
} from "@/lib/public-recommendations";
import { publicApi } from "@/services/api/public";

const CHAT_THREAD_STORAGE_KEY = "sm_public_chat_thread";

type ChatMessage = {
  id: string;
  senderType: string;
  content: string;
  createdAt: string;
};

type PanelTab = "chat" | "orientation";

export default function PublicVisitorPanel() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<PanelTab>("chat");

  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatBooting, setChatBooting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [recoLevel, setRecoLevel] = useState("");
  const [recoIntent, setRecoIntent] = useState<PublicRecoIntent>("info");
  const [recoInterests, setRecoInterests] = useState<PublicRecoInterestId[]>([]);
  const [recoResult, setRecoResult] = useState<PublicRecoResult | null>(null);
  const [recoSubmitting, setRecoSubmitting] = useState(false);

  const visible = !loading && !user;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, tab]);

  const ensureThread = useCallback(async (): Promise<string> => {
    const stored = sessionStorage.getItem(CHAT_THREAD_STORAGE_KEY);
    if (stored?.trim()) {
      setThreadId(stored);
      return stored;
    }
    const { threadId: newId } = await publicApi.createPublicChatThread();
    sessionStorage.setItem(CHAT_THREAD_STORAGE_KEY, newId);
    setThreadId(newId);
    return newId;
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    const data = await publicApi.getPublicChatMessages(id);
    setMessages(data.messages ?? []);
  }, []);

  useEffect(() => {
    if (!open || !visible || tab !== "chat") return;
    let cancelled = false;
    setChatBooting(true);
    void (async () => {
      try {
        ensurePublicVisitorId();
        const id = await ensureThread();
        if (cancelled) return;
        await loadMessages(id);
      } catch {
        if (!cancelled) toast.error("Impossible de charger la messagerie.");
      } finally {
        if (!cancelled) setChatBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, visible, tab, ensureThread, loadMessages]);

  useEffect(() => {
    if (!open || !visible || tab !== "chat" || !threadId) return;
    const interval = window.setInterval(() => {
      void loadMessages(threadId).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [open, visible, tab, threadId, loadMessages]);

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatLoading(true);
    setChatInput("");
    try {
      const id = threadId ?? (await ensureThread());
      const { message } = await publicApi.sendPublicChatMessage(id, text);
      setMessages((prev) => [
        ...prev,
        {
          id: message.id,
          senderType: message.senderType,
          content: message.content,
          createdAt: message.createdAt,
        },
      ]);
    } catch {
      toast.error("Message non envoyé. Réessayez.");
      setChatInput(text);
    } finally {
      setChatLoading(false);
    }
  };

  const toggleInterest = (id: PublicRecoInterestId) => {
    setRecoInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const submitReco = async () => {
    if (!recoLevel.trim()) {
      toast.error("Choisissez un niveau.");
      return;
    }
    setRecoSubmitting(true);
    try {
      ensurePublicVisitorId();
      const criteria = {
        currentLevel: recoLevel,
        interests: recoInterests,
        intent: recoIntent,
      };
      const result = buildPublicRecommendations(criteria);
      setRecoResult(result);
      await publicApi.submitPublicRecommendationRequest({ criteria, result });
      toast.success("Recommandations enregistrées");
    } catch {
      toast.error("Impossible d’enregistrer la demande.");
    } finally {
      setRecoSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[60] flex h-12 w-12 items-center justify-center rounded-2xl bg-tran-mauve-900 text-tran-mustard-100 shadow-lg ring-1 ring-tran-mustard-500/35 transition hover:bg-tran-mauve-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tran-mustard-500/50"
        aria-label="Ouvrir chat et orientation"
        title="Chat & orientation"
      >
        <FiMessageSquare className="h-5 w-5" aria-hidden />
      </button>

      {open ? (
        <div
          className="fixed bottom-5 right-5 z-[70] flex w-[min(100vw-1.5rem,24rem)] flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-white/95 shadow-2xl backdrop-blur-xl sm:w-[min(100vw-2rem,26rem)]"
          role="dialog"
          aria-label="Assistance visiteurs"
        >
          <div className="flex items-center justify-between border-b border-stone-200/80 bg-stone-900 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Besoin d&apos;aide ?</p>
              <p className="text-[11px] text-stone-300">Chat anonyme ou orientation</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-stone-300 hover:bg-white/10 hover:text-white"
              aria-label="Fermer"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          <div className="flex border-b border-stone-200/80 bg-stone-50/90">
            <button
              type="button"
              onClick={() => setTab("chat")}
              className={`flex-1 px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition ${
                tab === "chat"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <FiMessageSquare className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              Chat
            </button>
            <button
              type="button"
              onClick={() => setTab("orientation")}
              className={`flex-1 px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition ${
                tab === "orientation"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <FiCompass className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              Orientation
            </button>
          </div>

          {tab === "chat" ? (
            <>
              <div className="flex max-h-72 min-h-[12rem] flex-col gap-3 overflow-y-auto px-3 py-3 text-sm">
                {chatBooting ? (
                  <p className="text-stone-500">Chargement…</p>
                ) : messages.length === 0 ? (
                  <p className="text-stone-500 leading-relaxed">
                    Posez une question sur les admissions, les niveaux ou la vie scolaire. Un
                    responsable pourra vous répondre.
                  </p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={
                        m.senderType === "VISITOR"
                          ? "ml-6 rounded-xl bg-amber-50 px-3 py-2 text-stone-800"
                          : "mr-4 rounded-xl bg-stone-100 px-3 py-2 text-stone-800 whitespace-pre-wrap"
                      }
                    >
                      {m.content}
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>
              <div className="border-t border-stone-200/80 p-2">
                <div className="flex gap-2">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendChat();
                      }
                    }}
                    rows={2}
                    placeholder="Votre message…"
                    disabled={chatBooting}
                    className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => void sendChat()}
                    disabled={chatLoading || chatBooting || !chatInput.trim()}
                    className="flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-xl bg-amber-800 text-white disabled:opacity-40"
                    aria-label="Envoyer"
                  >
                    <FiSend className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex max-h-[min(24rem,55vh)] flex-col gap-3 overflow-y-auto px-4 py-4 text-sm">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-stone-700">Niveau actuel ou visé</span>
                <select
                  value={recoLevel}
                  onChange={(e) => setRecoLevel(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                >
                  <option value="">— Choisir —</option>
                  {PUBLIC_RECO_LEVEL_OPTIONS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-stone-700">Votre demande</span>
                <select
                  value={recoIntent}
                  onChange={(e) => setRecoIntent(e.target.value as PublicRecoIntent)}
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                >
                  <option value="info">Informations générales</option>
                  <option value="pre_inscription">Pré-inscription</option>
                  <option value="orientation">Orientation / parcours</option>
                </select>
              </label>

              <div>
                <span className="mb-2 block text-xs font-semibold text-stone-700">Centres d&apos;intérêt</span>
                <div className="flex flex-wrap gap-2">
                  {PUBLIC_RECO_INTERESTS.map(({ id, label }) => {
                    const active = recoInterests.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleInterest(id)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ${
                          active
                            ? "bg-tran-mauve-900 text-white ring-tran-mauve-900"
                            : "bg-white text-stone-700 ring-stone-200 hover:ring-amber-400/60"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => void submitReco()}
                disabled={recoSubmitting}
                className="w-full rounded-xl bg-tran-mauve-900 py-2.5 text-sm font-bold text-white shadow-md hover:bg-tran-mauve-800 disabled:opacity-50"
              >
                {recoSubmitting ? "Analyse…" : "Voir les recommandations"}
              </button>

              {recoResult ? (
                <div className="rounded-xl border border-stone-200/90 bg-stone-50/80 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-tran-mustard-800">
                    {recoResult.summary}
                  </p>
                  <ul className="mt-3 space-y-2 text-stone-700">
                    {recoResult.suggestions.map((s) => (
                      <li key={s} className="leading-relaxed">{s}</li>
                    ))}
                  </ul>
                  {recoResult.nextSteps.length > 0 ? (
                    <div className="mt-4 flex flex-col gap-2">
                      {recoResult.nextSteps.map((step) => (
                        <Link
                          key={step.href}
                          href={step.href}
                          className="text-sm font-semibold text-tran-mauve-800 underline-offset-2 hover:underline"
                          onClick={() => setOpen(false)}
                        >
                          → {step.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
