"use client";

import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "./api";

/** GET a backend path with react-query. */
export function useApi<T>(path: string | null, options?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery<T>({
    queryKey: ["api", path],
    queryFn: () => apiFetch<T>(path as string),
    enabled: path !== null && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval,
  });
}

interface MutateOptions<T> {
  /** Paths (or key prefixes) to refetch after success. Defaults to every API query. */
  invalidate?: (string | null)[];
  success?: string;
  onSuccess?: (data: T) => void;
}

/** Send a mutating request. `fn` receives variables and returns [method, path, body?]. */
export function useApiMutation<V, T = unknown>(
  build: (vars: V) => { method: "POST" | "PUT" | "PATCH" | "DELETE"; path: string; body?: unknown },
  options: MutateOptions<T> = {},
) {
  const qc = useQueryClient();
  return useMutation<T, Error, V>({
    mutationFn: (vars) => {
      const { method, path, body } = build(vars);
      return apiFetch<T>(path, {
        method,
        body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      });
    },
    onSuccess: (data) => {
      const keys: QueryKey[] = options.invalidate
        ? options.invalidate.filter((p): p is string => Boolean(p)).map((p) => ["api", p])
        : [["api"]];
      for (const key of keys) {
        qc.invalidateQueries({ queryKey: key });
      }
      if (options.success) toast.success(options.success);
      options.onSuccess?.(data);
    },
    onError: (err) => {
      toast.error(err.message || "Something went wrong");
    },
  });
}

/** Refetch everything under the given path prefix (paths are query keys, so prefix matching is by key start). */
export function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: ["api"] });
}
