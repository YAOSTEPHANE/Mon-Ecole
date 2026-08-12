"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { adminApi } from "@/services/api";
import { teacherApi } from "@/services/api/teacher.api";
import { staffApi } from "@/services/api/staff.api";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Précharge hors ligne via React Query (mêmes clés que les dashboards)
 * pour éviter le double-fetch api.get + useQuery.
 */
async function prefetchEssential(role: string, queryClient: ReturnType<typeof useQueryClient>) {
  const tasks: Promise<unknown>[] = [];

  switch (role) {
    case "STUDENT":
      tasks.push(
        queryClient.prefetchQuery({
          queryKey: ["student-profile"],
          queryFn: () => api.get("/student/profile").then((r) => r.data),
        }),
        queryClient.prefetchQuery({
          queryKey: ["student-grades"],
          queryFn: () => api.get("/student/grades").then((r) => r.data),
        }),
        queryClient.prefetchQuery({
          queryKey: ["student-schedule"],
          queryFn: () => api.get("/student/schedule").then((r) => r.data),
        }),
        queryClient.prefetchQuery({
          queryKey: ["student-announcements"],
          queryFn: () => api.get("/student/announcements").then((r) => r.data),
        }),
      );
      break;
    case "PARENT":
      tasks.push(
        queryClient.prefetchQuery({
          queryKey: ["parent-children"],
          queryFn: () => api.get("/parent/children").then((r) => r.data),
        }),
        queryClient.prefetchQuery({
          queryKey: ["parent-appointments"],
          queryFn: () => api.get("/parent/appointments").then((r) => r.data),
        }),
      );
      break;
    case "TEACHER":
      tasks.push(
        queryClient.prefetchQuery({
          queryKey: ["teacher-courses-lean"],
          queryFn: () => teacherApi.getCourses({ lean: true }),
        }),
        queryClient.prefetchQuery({
          queryKey: ["teacher-schedule"],
          queryFn: () => api.get("/teacher/schedule").then((r) => r.data),
        }),
        queryClient.prefetchQuery({
          queryKey: ["teacher-upcoming-assignments"],
          queryFn: () => teacherApi.getUpcomingAssignments(5),
        }),
      );
      break;
    case "EDUCATOR":
      tasks.push(
        queryClient.prefetchQuery({
          queryKey: ["educator-profile"],
          queryFn: () => api.get("/educator/profile").then((r) => r.data),
        }),
        queryClient.prefetchQuery({
          queryKey: ["educator-stats"],
          queryFn: () => api.get("/educator/stats").then((r) => r.data),
        }),
      );
      break;
    case "ADMIN":
    case "SUPER_ADMIN":
      tasks.push(
        queryClient.prefetchQuery({
          queryKey: ["admin-dashboard"],
          queryFn: adminApi.getDashboard,
        }),
      );
      break;
    case "STAFF":
      tasks.push(
        queryClient.prefetchQuery({
          queryKey: ["staff-workspace"],
          queryFn: staffApi.getWorkspace,
        }),
      );
      break;
    default:
      break;
  }

  await Promise.allSettled(tasks);
}

/**
 * En ligne : précharge différée des endpoints essentiels (cache hors ligne + RQ).
 */
export default function OfflinePrefetch() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const prefetchedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id || !token || typeof navigator === "undefined" || !navigator.onLine) {
      return;
    }

    if (prefetchedForUser.current === user.id) {
      return;
    }

    const run = () => {
      prefetchedForUser.current = user.id;
      void prefetchEssential(user.role, queryClient);
    };

    // Laisser le first paint / waterfall auth–école se terminer avant de précharger.
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(run, { timeout: 2500 });
    } else {
      timeoutId = setTimeout(run, 1500);
    }

    return () => {
      if (idleId != null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, [user?.id, user?.role, token, queryClient]);

  useEffect(() => {
    const onOnline = () => {
      prefetchedForUser.current = null;
      if (user?.id && token && navigator.onLine) {
        prefetchedForUser.current = user.id;
        void prefetchEssential(user.role, queryClient);
      }
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [user?.id, user?.role, token, queryClient]);

  return null;
}
