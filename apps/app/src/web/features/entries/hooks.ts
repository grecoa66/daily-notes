import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/web/lib/api";

import type { DailyEntry } from "./types";

export function entriesQueryKey(threadId: string | null) {
  return ["entries", threadId] as const;
}

export function useEntriesQuery(threadId: string | null, options: { enabled: boolean }) {
  return useQuery({
    queryKey: entriesQueryKey(threadId),
    queryFn: () =>
      apiFetch<{ entries: DailyEntry[] }>(
        `/api/threads/${threadId}/entries?limit=2000&offset=0`,
      ),
    enabled: options.enabled && Boolean(threadId),
  });
}

type EntryWriteInput = {
  threadId: string;
  localDate: string;
  contentJson: unknown;
};

function sortEntries(entries: DailyEntry[]): DailyEntry[] {
  return [...entries].sort((a, b) =>
    a.localDate > b.localDate ? -1 : a.localDate < b.localDate ? 1 : 0,
  );
}

function mergeEntry(
  previous: { entries: DailyEntry[] } | undefined,
  next: DailyEntry,
): { entries: DailyEntry[] } | undefined {
  if (!previous) {
    return previous;
  }

  const exists = previous.entries.some((entry) => entry.id === next.id);
  const merged = exists
    ? previous.entries.map((entry) => (entry.id === next.id ? next : entry))
    : [next, ...previous.entries];

  return { entries: sortEntries(merged) };
}

export function useSaveEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: EntryWriteInput) => {
      return apiFetch<{ entry: DailyEntry }>(
        `/api/threads/${input.threadId}/entries/${input.localDate}`,
        {
          method: "PUT",
          body: JSON.stringify({ contentJson: input.contentJson }),
        },
      );
    },
    onSuccess: (payload, variables) => {
      queryClient.setQueryData<{ entries: DailyEntry[] }>(
        entriesQueryKey(variables.threadId),
        (previous) => mergeEntry(previous, payload.entry),
      );
    },
  });
}

export function useCreateTodayEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: EntryWriteInput) => {
      return apiFetch<{ entry: DailyEntry }>(
        `/api/threads/${input.threadId}/entries/${input.localDate}`,
        {
          method: "PUT",
          body: JSON.stringify({ contentJson: input.contentJson }),
        },
      );
    },
    onSuccess: async (_payload, variables) => {
      await queryClient.invalidateQueries({
        queryKey: entriesQueryKey(variables.threadId),
      });
    },
  });
}

export function useBackfillEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: EntryWriteInput) => {
      return apiFetch<{ entry: DailyEntry }>(
        `/api/threads/${input.threadId}/entries/backfill`,
        {
          method: "POST",
          body: JSON.stringify({
            localDate: input.localDate,
            contentJson: input.contentJson,
          }),
        },
      );
    },
    onSuccess: async (_payload, variables) => {
      await queryClient.invalidateQueries({
        queryKey: entriesQueryKey(variables.threadId),
      });
      await queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
  });
}
