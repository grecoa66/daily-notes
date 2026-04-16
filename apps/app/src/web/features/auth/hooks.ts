import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/web/lib/api";

import type { User } from "./types";

export type AuthMode = "login" | "register";

export type CredentialAuthInput =
  | { mode: "login"; identifier: string; password: string }
  | {
      mode: "register";
      username: string;
      email: string;
      password: string;
      timezone: string;
    };

export const meQueryKey = ["me"] as const;

export function useCurrentUser() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: () => apiFetch<{ user: User }>("/api/me"),
    retry: false,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiFetch<void>("/api/auth/logout", { method: "POST" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
  });
}

export function useCredentialAuth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CredentialAuthInput) => {
      if (input.mode === "login") {
        return apiFetch<{ user: User }>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            identifier: input.identifier,
            password: input.password,
          }),
        });
      }

      return apiFetch<{ user: User }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: input.username,
          email: input.email,
          password: input.password,
          timezone: input.timezone,
        }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
  });
}
