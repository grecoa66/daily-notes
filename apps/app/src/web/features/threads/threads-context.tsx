import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useCurrentUser } from "@/web/features/auth/hooks";

import { useThreadsQuery } from "./hooks";
import type { Thread } from "./types";

type ThreadsContextValue = {
  threads: Thread[];
  isLoading: boolean;
  selectedThreadId: string | null;
  selectedThread: Thread | null;
  selectThread: (threadId: string | null) => void;
};

const ThreadsContext = createContext<ThreadsContextValue | null>(null);

export function ThreadsProvider({ children }: { children: ReactNode }) {
  const me = useCurrentUser();
  const isAuthenticated = me.status === "success";

  const threadsQuery = useThreadsQuery({ enabled: isAuthenticated });
  const threads = threadsQuery.data?.threads ?? [];

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedThreadId && threads.length > 0) {
      setSelectedThreadId(threads[0]!.id);
    }
  }, [selectedThreadId, threads]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [threads, selectedThreadId],
  );

  const value = useMemo<ThreadsContextValue>(
    () => ({
      threads,
      isLoading: threadsQuery.isLoading,
      selectedThreadId,
      selectedThread,
      selectThread: setSelectedThreadId,
    }),
    [threads, threadsQuery.isLoading, selectedThreadId, selectedThread],
  );

  return <ThreadsContext.Provider value={value}>{children}</ThreadsContext.Provider>;
}

export function useThreads(): ThreadsContextValue {
  const context = useContext(ThreadsContext);
  if (!context) {
    throw new Error("useThreads must be used within a ThreadsProvider");
  }
  return context;
}
