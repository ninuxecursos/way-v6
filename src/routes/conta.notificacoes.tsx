import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Check } from "lucide-react";
import { useT, useFormatters } from "@/components/i18n/LocaleProvider";

export const Route = createFileRoute("/conta/notificacoes")({
  component: NotificationsPage,
});

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

function NotificationsPage() {
  const t = useT();
  const { formatDateTime } = useFormatters();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id,type,title,body,link,read_at,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data ?? []) as Notification[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (ids.length === 0) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
    load();
  };

  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Bell className="text-brand" /> {t("account.notifications.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unread > 0
              ? t(unread === 1 ? "account.notifications.unreadOne" : "account.notifications.unreadMany", { n: unread })
              : t("account.notifications.allRead")}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <Check size={14} className="mr-1.5" /> {t("account.notifications.markAllRead")}
          </Button>
        )}
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loadingShort")}</p>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <BellOff className="mx-auto mb-3 opacity-60" />
          <p className="text-sm">{t("account.notifications.empty")}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card key={n.id} className={`p-4 transition-all ${n.read_at ? "opacity-70" : "border-brand/40"}`}>
              <div className="flex items-start gap-3">
                {!n.read_at && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{n.title}</p>
                  {n.body && <p className="text-sm text-muted-foreground mt-1">{n.body}</p>}
                  <div className="mt-2 flex items-center gap-3">
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(n.created_at)}
                    </p>
                    {n.link && (
                      <a href={n.link} className="text-xs text-brand hover:underline">
                        {t("account.notifications.viewDetails")}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}