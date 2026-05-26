/**
 * Patches global fetch on the client so requests to TanStack Start's
 * server-fn endpoints (`/_serverFn/...`) carry the Supabase access token
 * as a Bearer header. This is what `requireSupabaseAuth` middleware
 * reads on the server.
 *
 * Without this, every protected server function would 401 because the
 * Supabase session is stored in localStorage (no cookies) and is never
 * automatically forwarded by the browser.
 */
import { supabase } from "./client";

if (typeof window !== "undefined" && !(window as any).__wh_serverfn_fetch_patched) {
  (window as any).__wh_serverfn_fetch_patched = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : (input as Request).url;

      const isServerFn = typeof url === "string" && url.includes("/_serverFn/");
      if (!isServerFn) return originalFetch(input as any, init);

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return originalFetch(input as any, init);

      // Build new headers with Authorization, preserving existing ones.
      const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined),
      );
      if (!headers.has("authorization")) {
        headers.set("authorization", `Bearer ${token}`);
      }

      if (input instanceof Request) {
        const cloned = new Request(input, { headers });
        return originalFetch(cloned, init);
      }
      return originalFetch(input as any, { ...(init ?? {}), headers });
    } catch {
      return originalFetch(input as any, init);
    }
  }) as typeof window.fetch;
}

export {};
