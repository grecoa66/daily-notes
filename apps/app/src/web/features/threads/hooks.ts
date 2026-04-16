import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/web/lib/api";

import type { Thread } from "./types";

export const threadsQueryKey = ["threads"] as const;

export function useThreadsQuery(options: { enabled: boolean }) {
  return useQuery({
    queryKey: threadsQueryKey,
    queryFn: () => apiFetch<{ threads: Thread[] }>("/api/threads"),
    enabled: options.enabled,
  });
}

export function useCreateThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title: string) => {
      return apiFetch<{ thread: Thread }>("/api/threads", {
        method: "POST",
        body: JSON.stringify({ title }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: threadsQueryKey });
    },
  });
}
