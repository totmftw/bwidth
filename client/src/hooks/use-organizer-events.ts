import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { useToast } from "./use-toast";

type Event = z.infer<typeof api.organizer.events.list.responses[200]>[number];
type CreateEventInput = z.infer<typeof api.organizer.events.create.input>;
type UpdateEventInput = z.infer<typeof api.organizer.events.update.input>;

export function useOrganizerEvents(status?: string) {
  return useQuery({
    queryKey: [api.organizer.events.list.path, status],
    queryFn: async () => {
      let url = api.organizer.events.list.path;
      if (status) {
        url += `?status=${encodeURIComponent(status)}`;
      }
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch organizer events");
      return await res.json() as Event[];
    },
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateEventInput) => {
      const res = await fetch(api.organizer.events.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create event");
      }
      return await res.json() as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.organizer.events.list.path] });
      toast({ title: "Event Created", description: "Your event has been created." });
    },
    onError: (error: Error) => {
      toast({ title: "Creation Failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateEventInput }) => {
      const url = buildUrl(api.organizer.events.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update event");
      }
      return await res.json() as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.organizer.events.list.path] });
      toast({ title: "Event Updated", description: "Your event has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.organizer.events.delete.path, { id });
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete event");
      }
      return await res.json() as { message: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.organizer.events.list.path] });
      toast({ title: "Event Deleted", description: "The event has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
    },
  });
}

export function usePublishEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.organizer.events.publish.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to publish event");
      }
      return await res.json() as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.organizer.events.list.path] });
      toast({ title: "Event Published", description: "Your event is now visible to artists." });
    },
    onError: (error: Error) => {
      toast({ title: "Publish Failed", description: error.message, variant: "destructive" });
    },
  });
}
