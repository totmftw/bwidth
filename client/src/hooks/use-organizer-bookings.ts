import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "./use-toast";
import { z } from "zod";

type CompletionInput = z.infer<typeof api.organizer.bookings.complete.input>;

export function useOrganizerBookings(status?: string) {
  const queryKey = status 
    ? [api.organizer.bookings.list.path, { status }]
    : [api.organizer.bookings.list.path];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const url = status 
        ? `${api.organizer.bookings.list.path}?status=${status}`
        : api.organizer.bookings.list.path;
      
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bookings");
      // API returns enriched bookings with artist, event, organizer, venue
      return await res.json() as any[];
    },
  });
}

export function useOrganizerBooking(id: number) {
  return useQuery({
    queryKey: [api.organizer.bookings.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.organizer.bookings.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch booking");
      // API returns enriched booking with artist, event, organizer, venue
      return await res.json() as any;
    },
    enabled: !!id,
  });
}

export function useCompleteBooking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & CompletionInput) => {
      const url = buildUrl(api.organizer.bookings.complete.path, { id });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to complete booking");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.organizer.bookings.list.path] });
      toast({ 
        title: "Completion Confirmed", 
        description: "Your feedback has been recorded." 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Completion Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });
}
