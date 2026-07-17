"use client";

import { useEffect, useRef, useState } from "react";
import { FiMessageSquare, FiSend, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api/client";

type ChatTurn = { role: "user" | "assistant"; content: string };

const ALLOWED = new Set(["ADMIN", "SUPER_ADMIN", "TEACHER", "EDUCATOR", "STAFF"]);

export default function AssistantPanel() {
  const { user, token } = useAuth();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"llm" | "local" | null>(null);
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const role = user?.role?.toUpperCase() || "";
  const visible = Boolean(token && user && ALLOWED.has(role));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, open]);

  if (!visible) return null;

  const send = async () => {
    const text = prompt.trim();
    if (!text || loading) return;
    setLoading(true);
    setPrompt("");
    const nextHistory = [...history, { role: "user" as const, content: text }];
    setHistory(nextHistory);
    try {
      const { data } = await api.post<{ reply: string; mode: "llm" | "local" }>(
        "/assistant/chat",
        {
          prompt: text,
          history: nextHistory.slice(-10),
        },
      );
      setMode(data.mode);
      setHistory((h) => [...h, { role: "assistant", content: data.reply }]);
    } catch {
      toast.error("Assistant indisponible");
      setHistory((h) => h.slice(0, -1));
      setPrompt(text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[60] flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-amber-100 shadow-lg ring-1 ring-amber-500/30 transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
        aria-label="Ouvrir l’assistant pédagogique"
        title="Assistant pédagogique"
      >
        <FiMessageSquare className="h-5 w-5" aria-hidden />
      </button>

      {open ? (
        <div className="fixed bottom-5 right-5 z-[70] flex w-[min(100vw-1.5rem,22rem)] flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-white/95 shadow-2xl backdrop-blur-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-stone-200/80 bg-stone-900 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Assistant pédagogique</p>
              <p className="text-[11px] text-stone-300">
                {mode === "llm"
                  ? "IA générative"
                  : mode === "local"
                    ? "Mode local (sans clé API)"
                    : "Bulletins, parents, décrochage…"}
              </p>
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

          <div className="flex max-h-72 min-h-[12rem] flex-col gap-3 overflow-y-auto px-3 py-3 text-sm">
            {history.length === 0 ? (
              <p className="text-stone-500 leading-relaxed">
                Ex. : « Rédige un avis de conseil pour un élève assidu mais en baisse en maths. »
              </p>
            ) : (
              history.map((m, i) => (
                <div
                  key={`${m.role}-${i}`}
                  className={
                    m.role === "user"
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
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={2}
                placeholder="Votre question…"
                className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={loading || !prompt.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-xl bg-amber-800 text-white disabled:opacity-40"
                aria-label="Envoyer"
              >
                <FiSend className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
