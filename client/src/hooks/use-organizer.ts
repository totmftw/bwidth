import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";
import { useToast } from "./use-toast";
import { useAuth } from "./use-auth";

type OrganizerProfile = z.infer<typeof api.organizer.profile.get.responses[200]>;
type OrganizerProfileStatus = z.infer<typeof api.organizer.profile.status.responses[200]>;
type UpdateOrganizerInput = z.infer<typeof api.organizer.profile.update.input>;
type OnboardingInput = z.infer<typeof api.organizer.profile.complete.input>;

export function useOrganizerProfile() {
  return useQuery({
    queryKey: [api.organizer.profile.get.path],
    queryFn: async () => {
      const res = await fetch(api.organizer.profile.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch organizer profile");
      return await res.json() as OrganizerProfile;
    },
  });
}

export function useOrganizerProfileStatus() {
  const { user } = useAuth();
  const role = user?.role;

  return useQuery({
    queryKey: [api.organizer.profile.status.path],
    queryFn: async () => {
      const res = await fetch(api.organizer.profile.status.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch profile status");
      return await res.json() as OrganizerProfileStatus;
    },
    enabled: role === "organizer" || role === "promoter",
  });
}

export function useUpdateOrganizerProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UpdateOrganizerInput) => {
      const res = await fetch(api.organizer.profile.update.path, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update profile");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.organizer.profile.get.path] });
      toast({ title: "Profile Updated", description: "Your organizer profile has been saved." });
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: OnboardingInput) => {
      const res = await fetch(api.organizer.profile.complete.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to complete onboarding");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.organizer.profile.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.organizer.profile.status.path] });
      toast({ title: "Welcome!", description: "Your organizer profile is now complete." });
    },
    onError: (error: Error) => {
      toast({ title: "Onboarding Failed", description: error.message, variant: "destructive" });
    },
  });
}
