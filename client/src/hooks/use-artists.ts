import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { useToast } from "./use-toast";

type ArtistListResponse = z.infer<typeof api.artists.list.responses[200]>;
type ArtistFilters = z.infer<typeof api.artists.list.input>;

export function useArtists(filters?: ArtistFilters) {
  return useQuery({
    queryKey: [api.artists.list.path, filters],
    queryFn: async () => {
      // Build query string
      const params = new URLSearchParams();
      if (filters?.genre) params.append("genre", filters.genre);
      if (filters?.minFee) params.append("minFee", filters.minFee.toString());
      if (filters?.maxFee) params.append("maxFee", filters.maxFee.toString());
      
      const url = `${api.artists.list.path}?${params.toString()}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch artists");
      return await res.json() as ArtistListResponse;
    },
  });
}

export function useArtist(id: number) {
  return useQuery({
    queryKey: [api.artists.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.artists.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Artist not found");
      return await res.json() as z.infer<typeof api.artists.get.responses[200]>;
    },
    enabled: !!id,
  });
}

export function useUpdateArtist() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & z.infer<typeof api.artists.update.input>) => {
      const url = buildUrl(api.artists.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to update profile");
      return await res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.artists.get.path, variables.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] }); // Refresh auth user to see changes
      toast({ title: "Profile Updated", description: "Your artist details have been saved." });
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });
}
