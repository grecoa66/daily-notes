import type { ReactNode } from "react";

import { AuthScreen } from "./auth-screen";
import { useCurrentUser } from "./hooks";

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const me = useCurrentUser();

  if (me.isLoading) {
    return <div className="text-sm text-muted-foreground">Checking session...</div>;
  }

  if (me.status !== "success") {
    return <AuthScreen />;
  }

  return <>{children}</>;
}
