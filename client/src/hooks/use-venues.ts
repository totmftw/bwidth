import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useVenues() {
  return useQuery({
    queryKey: ["/api/venues"],
    queryFn: async () => {
      const response = await fetch(api.venues.list.path);
      if (!response.ok) {
        throw new Error("Failed to fetch venues");
      }
      return response.json();
    },
  });
}
