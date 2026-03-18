import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Spot, InsertSpot } from "@shared/schema";

export function useSpots() {
  return useQuery<Spot[]>({
    queryKey: ["spots"],
    queryFn: async () => {
      const res = await fetch("/api/spots");
      if (!res.ok) throw new Error("Failed to fetch spots");
      return res.json();
    },
  });
}

export function useCreateSpot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (spot: InsertSpot) => {
      const res = await fetch("/api/spots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(spot),
      });
      if (!res.ok) throw new Error("Failed to create spot");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spots"] });
    },
  });
}

export function useDeleteSpot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/spots/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete spot");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spots"] });
    },
  });
}
