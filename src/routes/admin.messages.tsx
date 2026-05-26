import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listContactMessages,
  updateContactMessage,
  deleteContactMessage,
  type ContactMessageRow,
} from "@/lib/contact.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Trash2, CheckCircle2, MessageSquare } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";

export const Route = createFileRoute("/admin/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  const listFn = useServerFn(listContactMessages);
  const updateFn = useServerFn(updateContactMessage);
  const deleteFn = useServerFn(deleteContactMessage);
  const [rows, setRows] = useState<ContactMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "new" | "read" | "replied" | "archived">("all");

  const reload = async () => {
    setLoading(true);
    try {
      const r = await listFn({ data: { status: filter, limit: 200 } });
      setRows(r.messages);
    } catch (e) {
      console.error(e);
      notifyError("Falha ao carregar mensagens");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [filter]);

  const setStatus = async (id: string, status: "read" | "replied" | "archived") => {
    try {
      await updateFn({ data: { id, status } });
      notifySuccess("Atualizado");
      reload();
    } catch { notifyError("Falha ao atualizar"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta mensagem?")) return;
    try {
      await deleteFn({ data: { id } });
      notifySuccess("Excluída");
      reload();
    } catch { notifyError("Falha ao excluir"); }
  };

  const statusTone: Record<string, string> = {
    new: "bg-brand text-brand-foreground",
    read: "bg-muted text-foreground",
    replied: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
    archived: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mensagens de contato</h1>
        <p className="text-muted-foreground mt-1">Envios do formulário da página /contato</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "new", "read", "replied", "archived"] as const).map((s) => (
          <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)}>
            {s === "all" ? "Todas" : s === "new" ? "Novas" : s === "read" ? "Lidas" : s === "replied" ? "Respondidas" : "Arquivadas"}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>{loading ? "Carregando…" : `${rows.length} mensagem(ns)`}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!loading && rows.length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhuma mensagem.</div>
          )}
          {rows.map((m) => (
            <div key={m.id} className="rounded-xl border p-4 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{m.name}</span>
                    <Badge className={statusTone[m.status] ?? ""}>{m.status}</Badge>
                    <Badge variant="outline">{m.locale}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <a href={`mailto:${m.email}`} className="hover:underline">{m.email}</a>
                    {m.phone ? <> · <a href={`https://wa.me/${m.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="hover:underline">{m.phone}</a></> : null}
                    {" · "}{new Date(m.created_at).toLocaleString()}
                  </div>
                  {m.subject && <p className="text-sm font-medium mt-1">{m.subject}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setStatus(m.id, "read")} title="Marcar como lida">
                    <CheckCircle2 size={14} />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setStatus(m.id, "replied")} title="Marcar como respondida">
                    <MessageSquare size={14} />
                  </Button>
                  <Button size="sm" variant="outline" asChild title="Responder por email">
                    <a href={`mailto:${m.email}?subject=${encodeURIComponent("Re: " + (m.subject || "sua mensagem"))}`}>
                      <Mail size={14} />
                    </a>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remove(m.id)} title="Excluir">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.message}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}