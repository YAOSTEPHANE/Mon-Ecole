"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppBrandingProvider } from "@/contexts/AppBrandingContext";
import { SchoolProvider } from "@/contexts/SchoolContext";
import ServerConnectionError from "@/components/ServerConnectionError";
import SentryBootstrap from "@/components/SentryBootstrap";
import ServiceWorkerDevCleanup from "@/components/ServiceWorkerDevCleanup";
import ServiceWorkerBootstrap from "@/components/ServiceWorkerBootstrap";
import OfflineBanner from "@/components/OfflineBanner";
import PwaInstallBanner from "@/components/PwaInstallBanner";
import { ensureStaffPedagogyApiInterceptor } from "@/lib/staffPedagogyApi";
import { isOffline } from "@/lib/offline-api";
import PublicVisitorBootstrap from "@/components/public/PublicVisitorBootstrap";

const PushNotificationsBootstrap = dynamic(
  () => import("@/components/PushNotificationsBootstrap"),
  { ssr: false },
);
const RealtimeBootstrap = dynamic(() => import("@/components/RealtimeBootstrap"), { ssr: false });
const AssistantPanel = dynamic(() => import("@/components/AssistantPanel"), { ssr: false });
const OfflinePrefetch = dynamic(() => import("@/components/OfflinePrefetch"), { ssr: false });
const SyncQueueBootstrap = dynamic(() => import("@/components/SyncQueueBootstrap"), { ssr: false });
const PublicVisitorPanel = dynamic(
  () => import("@/components/public/PublicVisitorPanel"),
  { ssr: false },
);

if (typeof window !== "undefined") {
  ensureStaffPedagogyApiInterceptor();
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60_000,
            gcTime: 24 * 60 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            networkMode: "offlineFirst",
            retry: (failureCount, error) => {
              if (typeof window !== "undefined" && isOffline()) return false;
              const status =
                error && typeof error === "object" && "response" in error
                  ? Number((error as { response?: { status?: number } }).response?.status)
                  : NaN;
              if (status === 401 || status === 403 || status === 404) return false;
              const code =
                error && typeof error === "object" && "code" in error
                  ? String((error as { code?: string }).code)
                  : "";
              if (code === "ERR_NETWORK" || code === "ECONNREFUSED") return false;
              return failureCount < 2;
            },
          },
          mutations: {
            networkMode: "offlineFirst",
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <AppBrandingProvider>
        <AuthProvider>
          <PublicVisitorBootstrap />
          <SchoolProvider>
            <ServiceWorkerDevCleanup />
            <ServiceWorkerBootstrap />
            <OfflinePrefetch />
            <SyncQueueBootstrap />
            <OfflineBanner />
            <PushNotificationsBootstrap />
            <RealtimeBootstrap />
            <SentryBootstrap />
            <PwaInstallBanner />
            {children}
            <AssistantPanel />
            <PublicVisitorPanel />
            <Toaster
              position="top-right"
              gutter={12}
              toastOptions={{
                duration: 4200,
                className:
                  "!font-sans !bg-white/96 !backdrop-blur-xl !border !border-[#e4e8f2] !shadow-[0_24px_48px_-16px_rgba(28,39,76,0.22)] !rounded-2xl !text-stone-900 !px-4 !py-3.5 !ring-1 !ring-[#0018A8]/8",
                success: {
                  iconTheme: { primary: "#0018A8", secondary: "#fff" },
                },
                error: {
                  iconTheme: { primary: "#be123c", secondary: "#fff" },
                },
              }}
            />
            <ServerConnectionError />
          </SchoolProvider>
        </AuthProvider>
      </AppBrandingProvider>
    </QueryClientProvider>
  );
}
