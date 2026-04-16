import { Button } from "@/web/components/ui/button";
import { getApiBase, signInWithProvider } from "@/web/lib/api";

type AuthMode = "login" | "register";

type AuthScreenProps = {
  authMode: AuthMode;
  onAuthModeChange: (mode: AuthMode) => void;
  identifier: string;
  onIdentifierChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  username: string;
  onUsernameChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  statusMessage: string | null;
};

export function AuthScreen({
  authMode,
  onAuthModeChange,
  identifier,
  onIdentifierChange,
  email,
  onEmailChange,
  username,
  onUsernameChange,
  password,
  onPasswordChange,
  onSubmit,
  isSubmitting,
  statusMessage,
}: AuthScreenProps) {
  const apiBase = getApiBase();

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
            onClick={() => onAuthModeChange("login")}
          >
            Login
          </Button>
          <Button
            variant={authMode === "register" ? "default" : "outline"}
            onClick={() => onAuthModeChange("register")}
          >
            Register
          </Button>
        </div>

        {authMode === "register" ? (
          <input
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            placeholder="Username"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        ) : null}

        <input
          value={authMode === "login" ? identifier : email}
          onChange={(event) => {
            if (authMode === "login") {
              onIdentifierChange(event.target.value);
            } else {
              onEmailChange(event.target.value);
            }
          }}
          placeholder={authMode === "login" ? "Email or username" : "Email"}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder="Password"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
        <Button
          disabled={isSubmitting}
          onClick={onSubmit}
          className="w-full"
        >
          {isSubmitting
            ? authMode === "login"
              ? "Logging in..."
              : "Creating account..."
            : authMode === "login"
              ? "Login"
              : "Create Account"}
        </Button>
      </div>

      {statusMessage ? (
        <p className="text-xs text-muted-foreground">{statusMessage}</p>
      ) : null}
    </section>
  );
}

export type { AuthMode };
