"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleDashboardPath } from "@/lib/rolePaths";
import LoginBackground from "@/components/illustrations/LoginBackgroundLazy";
import { authApi } from "@/services/api";

export default function OAuthCallbackClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshUser, user, loading } = useAuth();
  const [status, setStatus] = useState<"working" | "error">("working");

  useEffect(() => {
    const err = searchParams.get("error");
    const code = searchParams.get("code");
    if (err) {
      setStatus("error");
      toast.error(err);
      const t = window.setTimeout(() => router.replace("/login"), 2500);
      return () => window.clearTimeout(t);
    }
    if (!code) {
      setStatus("error");
      toast.error("Code SSO manquant");
      const t = window.setTimeout(() => router.replace("/login"), 2500);
      return () => window.clearTimeout(t);
    }

    let cancelled = false;
    void (async () => {
      try {
        await authApi.exchangeOAuthCode(code);
        const sessionUser = await refreshUser();
        if (cancelled) return;
        if (!sessionUser) throw new Error("Session introuvable");
        toast.success("Connexion SSO réussie");
        router.replace(getRoleDashboardPath(sessionUser.role));
      } catch {
        if (cancelled) return;
        setStatus("error");
        toast.error("Impossible de finaliser la session SSO");
        router.replace("/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, refreshUser, router]);

  useEffect(() => {
    if (!loading && user) {
      router.replace(getRoleDashboardPath(user.role));
    }
  }, [loading, user, router]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden premium-body premium-body-v2 premium-body-v3">
      <LoginBackground />
      <div className="relative z-10 px-4 text-center">
        <div
          className="mx-auto h-14 w-14 animate-spin rounded-full border-[3px] border-amber-200/80 border-t-amber-700"
          aria-hidden
        />
        <p className="mt-6 text-lg font-semibold text-white drop-shadow-sm">
          {status === "error" ? "Échec SSO — redirection…" : "Finalisation de la connexion SSO…"}
        </p>
      </div>
    </div>
  );
}
