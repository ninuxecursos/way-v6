import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/analytics/ping")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204 }),
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => null) as { session_id?: string } | null;
          if (!body?.session_id) return Response.json({ ok: false }, { status: 400 });
          await supabaseAdmin
            .from("analytics_sessions")
            .update({ last_seen_at: new Date().toISOString() })
            .eq("session_id", body.session_id);
          return Response.json({ ok: true });
        } catch {
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});