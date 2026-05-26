import { useEffect } from "react";
import { Bell, Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["notifications", user?.id ?? "anon"];

  const { data: items = [] } = useQuery({
    queryKey,
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id,type,title,body,link,read_at,created_at")
        .order("created_at", { ascending: false })
        .limit(15);
      return (data ?? []) as Notification[];
    },
  });
  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif:${user.id}:${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
    qc.invalidateQueries({ queryKey });
  };

  const markOne = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey });
  };

  return (
    <Popover>
      <PopoverTrigger
        className="relative grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-foreground hover:bg-accent transition-colors cursor-pointer"
        aria-label="Notificações"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-display font-bold text-sm">Notificações</h3>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer">
              <Check size={12} /> Marcar todas
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-border">
          {items.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Sem novidades por aqui.</p>
          )}
          {items.map((n) => {
            const inner = (
              <div className={`px-4 py-3 text-sm transition-colors ${n.read_at ? "opacity-70" : "bg-accent/30"} hover:bg-accent`}>
                <div className="flex items-start gap-2">
                  {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                </div>
              </div>
            );
            return n.link ? (
              <a key={n.id} href={n.link} onClick={() => markOne(n.id)} className="block">{inner}</a>
            ) : (
              <button key={n.id} type="button" onClick={() => markOne(n.id)} className="block w-full text-left">{inner}</button>
            );
          })}
        </div>
        <div className="border-t border-border px-4 py-2 text-center">
          <Link to="/conta/notificacoes" className="text-xs text-muted-foreground hover:text-foreground">
            Ver todas
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}