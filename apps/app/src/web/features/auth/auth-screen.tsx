import { useState } from "react";

import { Button } from "@/web/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/web/components/ui/card";
import { Input } from "@/web/components/ui/input";
import { getApiBase, signInWithProvider } from "@/web/lib/api";

import { useCredentialAuth, useForgotPassword, type AuthMode } from "./hooks";

const MIN_USERNAME_LENGTH = 6;
const MIN_PASSWORD_LENGTH = 8;

type ScreenMode = AuthMode | "forgot";

function validate(
  authMode: AuthMode,
  fields: { identifier: string; email: string; username: string; password: string },
): string | null {
  if (authMode === "register") {
    if (!fields.username.trim()) {
      return "Username is required";
    }
    if (fields.username.trim().length < MIN_USERNAME_LENGTH) {
      return `Username must be at least ${MIN_USERNAME_LENGTH} characters`;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(fields.username.trim())) {
      return "Username may only contain letters, numbers, - and _";
    }
    if (!fields.email.trim()) {
      return "Email is required";
    }
  } else {
    if (!fields.identifier.trim()) {
      return "Email or username is required";
    }
  }

  if (!fields.password) {
    return "Password is required";
  }
  if (fields.password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }

  return null;
}

function ErrorCallout({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="mt-0.5 size-4 shrink-0"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
          clipRule="evenodd"
        />
      </svg>
      <span>{message}</span>
    </div>
  );
}

function SuccessCallout({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2.5 text-sm text-green-700 dark:text-green-400">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="mt-0.5 size-4 shrink-0"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
          clipRule="evenodd"
        />
      </svg>
      <span>{message}</span>
    </div>
  );
}

export function AuthScreen() {
  const [screenMode, setScreenMode] = useState<ScreenMode>("login");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  const credentialAuth = useCredentialAuth();
  const forgotPassword = useForgotPassword();
  const apiBase = getApiBase();

  const switchMode = (mode: ScreenMode) => {
    setScreenMode(mode);
    setClientError(null);
    credentialAuth.reset();
    forgotPassword.reset();
  };

  const submitCredentials = () => {
    if (screenMode === "forgot") {
      return;
    }
    const validationError = validate(screenMode, { identifier, email, username, password });
    if (validationError) {
      setClientError(validationError);
      return;
    }
    setClientError(null);

    if (screenMode === "login") {
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

  const submitForgotPassword = () => {
    if (!forgotIdentifier.trim()) {
      setClientError("Please enter your email or username");
      return;
    }
    setClientError(null);
    forgotPassword.mutate(forgotIdentifier.trim());
  };

  const serverError =
    credentialAuth.isError && credentialAuth.error instanceof Error
      ? credentialAuth.error.message
      : null;

  const errorMessage = clientError ?? serverError;

  if (screenMode === "forgot") {
    return (
      <section className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Daily Notes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in with GitHub or use username/password.</p>
        </div>

        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter your email address or username and we'll send you a reset link.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {forgotPassword.isSuccess ? (
              <SuccessCallout message={forgotPassword.data.message} />
            ) : (
              <>
                <Input
                  value={forgotIdentifier}
                  onChange={(event) => {
                    setForgotIdentifier(event.target.value);
                    setClientError(null);
                  }}
                  placeholder="Email or username"
                />
                <Button disabled={forgotPassword.isPending} onClick={submitForgotPassword} className="w-full">
                  {forgotPassword.isPending ? "Sending..." : "Send reset link"}
                </Button>
                {clientError ? <ErrorCallout message={clientError} /> : null}
              </>
            )}
          </CardContent>
          <CardFooter>
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← Back to login
            </button>
          </CardFooter>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Daily Notes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in with GitHub or use username/password.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void signInWithProvider("github")}>Continue with GitHub</Button>
        <Button variant="outline" onClick={() => window.open(`${apiBase}/api/health`, "_blank")}>
          API Health
        </Button>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <div className="flex gap-2">
            <Button
              variant={screenMode === "login" ? "default" : "outline"}
              onClick={() => switchMode("login")}
            >
              Login
            </Button>
            <Button
              variant={screenMode === "register" ? "default" : "outline"}
              onClick={() => switchMode("register")}
            >
              Register
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          {screenMode === "register" ? (
            <Input
              value={username}
              onChange={(event) => { setUsername(event.target.value); setClientError(null); }}
              placeholder="Username (min. 6 characters)"
            />
          ) : null}

          <Input
            value={screenMode === "login" ? identifier : email}
            onChange={(event) => {
              if (screenMode === "login") { setIdentifier(event.target.value); }
              else { setEmail(event.target.value); }
              setClientError(null);
            }}
            placeholder={screenMode === "login" ? "Email or username" : "Email"}
          />
          <Input
            type="password"
            value={password}
            onChange={(event) => { setPassword(event.target.value); setClientError(null); }}
            placeholder="Password"
          />
          <Button disabled={credentialAuth.isPending} onClick={submitCredentials} className="w-full">
            {credentialAuth.isPending
              ? screenMode === "login" ? "Logging in..." : "Creating account..."
              : screenMode === "login" ? "Login" : "Create Account"}
          </Button>

          {errorMessage ? <ErrorCallout message={errorMessage} /> : null}
        </CardContent>

        {screenMode === "login" ? (
          <CardFooter className="justify-end">
            <button
              type="button"
              onClick={() => switchMode("forgot")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </button>
          </CardFooter>
        ) : null}
      </Card>
    </section>
  );
}
