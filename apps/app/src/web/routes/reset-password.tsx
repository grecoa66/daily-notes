import { useState } from "react";
import { createRoute, useNavigate, useSearch } from "@tanstack/react-router";

import { Button } from "@/web/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/web/components/ui/card";
import { Input } from "@/web/components/ui/input";
import { useResetPassword } from "@/web/features/auth/hooks";
import { rootRoute } from "@/web/routes/__root";

export const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reset-password",
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: ResetPasswordPage,
});

const MIN_PASSWORD_LENGTH = 8;

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

function ResetPasswordPage() {
  const { token } = useSearch({ from: resetPasswordRoute.id });
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  const resetPassword = useResetPassword();

  if (!token) {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Invalid link</CardTitle>
          <p className="text-sm text-muted-foreground">
            This password reset link is missing or malformed. Please request a new one.
          </p>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => void navigate({ to: "/" })}>
            Back to login
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (resetPassword.isSuccess) {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5 shrink-0" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
            </svg>
            <CardTitle>Password updated</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">{resetPassword.data.message}</p>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void navigate({ to: "/" })}>Sign in</Button>
        </CardContent>
      </Card>
    );
  }

  const serverError =
    resetPassword.isError && resetPassword.error instanceof Error
      ? resetPassword.error.message
      : null;

  const errorMessage = clientError ?? serverError;

  const submit = () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setClientError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (password !== confirm) {
      setClientError("Passwords do not match");
      return;
    }
    setClientError(null);
    resetPassword.mutate({ token, password });
  };

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Set new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choose a strong password for your account.</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-5">
          <Input
            type="password"
            value={password}
            onChange={(event) => { setPassword(event.target.value); setClientError(null); resetPassword.reset(); }}
            placeholder={`New password (min. ${MIN_PASSWORD_LENGTH} characters)`}
          />
          <Input
            type="password"
            value={confirm}
            onChange={(event) => { setConfirm(event.target.value); setClientError(null); resetPassword.reset(); }}
            placeholder="Confirm new password"
          />
          <Button disabled={resetPassword.isPending} onClick={submit} className="w-full">
            {resetPassword.isPending ? "Updating..." : "Set new password"}
          </Button>
          {errorMessage ? <ErrorCallout message={errorMessage} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
