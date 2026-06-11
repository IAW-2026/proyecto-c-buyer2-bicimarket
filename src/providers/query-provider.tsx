"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";

function AuthSync() {
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const prevRef = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (prevRef.current !== undefined && prevRef.current !== isSignedIn) {
      queryClient.clear();
    }
    prevRef.current = isSignedIn;
  }, [isSignedIn, queryClient]);

  return null;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSync />
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
