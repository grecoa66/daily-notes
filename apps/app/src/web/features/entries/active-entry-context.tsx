import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useThreads } from "@/web/features/threads/threads-context";

type ActiveEntryContextValue = {
  activeEntryId: string | null;
  setActiveEntryId: (entryId: string | null) => void;
};

const ActiveEntryContext = createContext<ActiveEntryContextValue | null>(null);

export function ActiveEntryProvider({ children }: { children: ReactNode }) {
  const { selectedThreadId } = useThreads();
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);

  useEffect(() => {
    setActiveEntryId(null);
  }, [selectedThreadId]);

  const value = useMemo<ActiveEntryContextValue>(
    () => ({ activeEntryId, setActiveEntryId }),
    [activeEntryId],
  );

  return (
    <ActiveEntryContext.Provider value={value}>{children}</ActiveEntryContext.Provider>
  );
}

export function useActiveEntry(): ActiveEntryContextValue {
  const context = useContext(ActiveEntryContext);
  if (!context) {
    throw new Error("useActiveEntry must be used within an ActiveEntryProvider");
  }
  return context;
}
