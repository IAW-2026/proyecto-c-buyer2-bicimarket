"use client";

import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { AxiosError } from "axios";

interface ApiErrorBody {
  error?: { code: string; message: string; details?: unknown };
  message?: string;
}

export type ApiError = AxiosError<ApiErrorBody>;

interface UseApiMutationOptions<TData, TVariables>
  extends Omit<UseMutationOptions<TData, ApiError, TVariables, any>, "mutationFn"> {
  mutationFn: (vars: TVariables) => Promise<TData>;
  invalidateKeys?: QueryKey[];
  successMessage?: string;
  errorMessage?: string;
  /** Si se omite, no se muestra toast de carga */
  loadingMessage?: string;
}

export function useApiMutation<TData, TVariables>({
  mutationFn,
  invalidateKeys,
  successMessage,
  errorMessage,
  loadingMessage,
  onMutate,
  onSuccess,
  onError,
  onSettled,
  ...options
}: UseApiMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();

  return useMutation<TData, ApiError, TVariables, any>({
    mutationFn,

    onMutate: async (variables, mutation) => {
      const toastId = loadingMessage ? toast.loading(loadingMessage) : null;
      const custom = onMutate ? await onMutate(variables, mutation) : undefined;
      return { ...(custom ?? {}), toastId };
    },

    onSuccess: async (data, variables, context, mutation) => {
      if (invalidateKeys) {
        await Promise.all(
          invalidateKeys.map((key) =>
            queryClient.invalidateQueries({ queryKey: key, exact: false }),
          ),
        );
      }
      if (successMessage) {
        toast.success(successMessage, context?.toastId ? { id: context.toastId } : undefined);
      } else if (context?.toastId) {
        toast.dismiss(context.toastId);
      }
      await onSuccess?.(data, variables, context, mutation);
    },

    onError: (error, variables, context, mutation) => {
      const body = error.response?.data;
      const msg =
        body?.error?.message ||
        body?.message ||
        errorMessage ||
        "Ocurrió un error inesperado";
      toast.error(msg, context?.toastId ? { id: context.toastId } : undefined);
      onError?.(error, variables, context, mutation);
    },

    onSettled: async (data, error, variables, context, mutation) => {
      await onSettled?.(data, error, variables, context, mutation);
    },

    ...options,
  });
}
