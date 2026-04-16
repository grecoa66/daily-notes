import { useState } from "react";

import { Button } from "@/web/components/ui/button";
import { getApiBase, signInWithProvider } from "@/web/lib/api";

import { useCredentialAuth, type AuthMode } from "./hooks";

export function AuthScreen() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const credentialAuth = useCredentialAuth();
  const apiBase = getApiBase();

  const submit = () => {
    if (authMode === "login") {
      credentialAuth.mutate({ mode: "login", identifier, password });
      return;
    }

    credentialAuth.mutate({
      mode: "register",
      username,
      email,
      password,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  };

  const errorMessage =
    credentialAuth.isError && credentialAuth.error instanceof Error
      ? credentialAuth.error.message
      : null;

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">Daily Notes</h1>
      <p className="text-sm text-muted-foreground">
        Sign in with GitHub or use username/password.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void signInWithProvider("github")}>
          Continue with GitHub
        </Button>
        <Button
          variant="outline"
          onClick={() => window.open(`${apiBase}/api/health`, "_blank")}
        >
          API Health
        </Button>
      </div>

      <div className="max-w-md space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="flex gap-2">
          <Button
            variant={authMode === "login" ? "default" : "outline"}
            onClick={() => setAuthMode("login")}
          >
            Login
          </Button>
          <Button
            variant={authMode === "register" ? "default" : "outline"}
            onClick={() => setAuthMode("register")}
          >
            Register
          </Button>
        </div>

        {authMode === "register" ? (
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        ) : null}

        <input
          value={authMode === "login" ? identifier : email}
          onChange={(event) => {
            if (authMode === "login") {
              setIdentifier(event.target.value);
            } else {
              setEmail(event.target.value);
            }
          }}
          placeholder={authMode === "login" ? "Email or username" : "Email"}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
        <Button
          disabled={credentialAuth.isPending}
          onClick={submit}
          className="w-full"
        >
          {credentialAuth.isPending
            ? authMode === "login"
              ? "Logging in..."
              : "Creating account..."
            : authMode === "login"
              ? "Login"
              : "Create Account"}
        </Button>

        {errorMessage ? (
          <p className="text-xs text-destructive">{errorMessage}</p>
        ) : null}
      </div>
    </section>
  );
}
