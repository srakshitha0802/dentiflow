"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: 1,
            enabled: typeof window !== "undefined",
          },
        },
      })
  );


  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionProvider>

  );
}
