import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";
import { useOrganizerProfile } from "./use-organizer";

type OrganizerDashboardStats = z.infer<typeof api.organizer.dashboard.responses[200]>;
type ActivityEntry = z.infer<typeof api.organizer.activity.responses[200]>[number];

export function useOrganizerDashboardStats() {
  return useQuery({
    queryKey: [api.organizer.dashboard.path],
    queryFn: async () => {
      const res = await fetch(api.organizer.dashboard.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return await res.json() as OrganizerDashboardStats;
    },
  });
}

export function useOrganizerActivity(limit?: number) {
  return useQuery({
    queryKey: [api.organizer.activity.path, limit],
    queryFn: async () => {
      let url = api.organizer.activity.path;
      if (limit) {
        url += `?limit=${encodeURIComponent(limit)}`;
      }
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch organizer activity");
      return await res.json() as ActivityEntry[];
    },
  });
}

export interface BookingSummary {
  totalBookings: number;
  completedBookings: number;
  cancellationRate: number;
  averageBookingValue: number;
}

export function useOrganizerBookingSummary() {
  const { data: profile, isLoading, error } = useOrganizerProfile();

  return useQuery<BookingSummary>({
    queryKey: ["organizer-booking-summary", profile?.id],
    queryFn: async () => {
      // Derive booking summary from profile metadata if available
      const metadata = (profile?.metadata ?? {}) as Record<string, unknown>;
      return {
        totalBookings: (metadata.totalBookings as number) ?? 0,
        completedBookings: (metadata.completedBookings as number) ?? 0,
        cancellationRate: (metadata.cancellationRate as number) ?? 0,
        averageBookingValue: (metadata.averageBookingValue as number) ?? 0,
      };
    },
    enabled: !!profile && !isLoading && !error,
  });
}
