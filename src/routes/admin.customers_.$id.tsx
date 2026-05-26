import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCustomerDetail, upsertCustomerNote, deleteCustomerNote, updateCustomerProfile } from "@/lib/customers.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pin, Trash2, Save } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";

export const Route = createFileRoute("/admin/customers_/$id")({ component: CustomerDetail });

function CustomerDetail() {
  const { id } = Route.useParams();
  const get = useServerFn(getCustomerDetail);
  const upNote = useServerFn(upsertCustomerNote);
  const delNote = useServerFn(deleteCustomerNote);
  const upProfile = useServerFn(updateCustomerProfile);
  const [d, setD] = useState<any>(null);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");

  // fix(B3): tratar erro de carregamento.
  const reload = async () => {
    try {
      const r: any = await get({ data: { userId: id } as any });
      setD(r);
      setTags((r?.profile?.tags ?? []).join(", "));
    } catch (e) { notifyError(e); }
  };
  useEffect(() => { reload(); }, [id]);

  if (!d) return <div className="p-8 text-muted-foreground">Carregando…</div>;
  const p = d.profile ?? {};
  const s = d.stats ?? {};

  return (
    <div className="p-8 max-w-6xl space-y-6">
      <Link to="/admin/customers" className="text-sm text-primary hover:underline">← Clientes</Link>
      <h1 className="text-3xl font-bold">{p.display_name || p.full_name || id.slice(0, 8)}</h1>

      <div className="grid md:grid-cols-4 gap-4">
        {[
          { l: "Pedidos", v: s.orders_count ?? 0 },
          { l: "Pagos", v: s.paid_orders_count ?? 0 },
          { l: "Total gasto", v: `R$ ${((s.total_spent_cents ?? 0) / 100).toFixed(2)}` },
          { l: "Último pedido", v: s.last_order_at ? new Date(s.last_order_at).toLocaleDateString("pt-BR") : "—" },
        ].map((c) => (
          <div key={c.l} className="bg-card border rounded-lg p-4">
            <div className="text-xs text-muted-foreground">{c.l}</div>
            <div className="text-xl font-bold mt-1">{c.v}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border rounded-lg p-5">
          <h2 className="font-semibold mb-3">Perfil</h2>
          <div className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Nome:</span> {p.full_name ?? "—"}</div>
            <div><span className="text-muted-foreground">Telefone:</span> {p.phone ?? "—"}</div>
            <div><span className="text-muted-foreground">Locale:</span> {p.locale ?? "pt"}</div>
            <div><span className="text-muted-foreground">Marketing opt-in:</span> {p.marketing_opt_in ? "sim" : "não"}</div>
          </div>
          <div className="mt-4 space-y-2">
            <label className="text-xs text-muted-foreground">Tags (vírgulas)</label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} />
            <Button size="sm" onClick={async () => {
              // fix(B4): tratar erro de save.
              try {
                await upProfile({ data: { userId: id, tags: tags.split(",").map((s) => s.trim()).filter(Boolean) } as any });
                notifySuccess("Tags salvas");
                await reload();
              } catch (e) { notifyError(e); }
            }}>
              <Save className="h-4 w-4 mr-2" />Salvar tags
            </Button>
          </div>
          <div className="mt-4">
            <div className="text-xs text-muted-foreground mb-2">Segmentos</div>
            <div className="flex flex-wrap gap-2">
              {d.segments.length === 0 && <span className="text-xs text-muted-foreground">Nenhum</span>}
              {d.segments.map((m: any) => (
                <span key={m.segment_id} className="text-xs px-2 py-1 rounded-full border" style={{ borderColor: m.customer_segments?.color ?? undefined }}>
                  {m.customer_segments?.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-5">
          <h2 className="font-semibold mb-3">Pedidos ({d.orders.length})</h2>
          <div className="space-y-2 max-h-96 overflow-auto">
            {d.orders.map((o: any) => (
              <Link key={o.id} to="/admin/orders/$id" params={{ id: o.id }} className="block p-2 border rounded hover:bg-muted/30 text-sm">
                <div className="flex justify-between">
                  <span className="font-mono text-xs">{o.id.slice(0, 8)}</span>
                  <span className={`text-xs px-2 rounded ${o.status === "paid" ? "bg-green-500/20" : "bg-muted"}`}>{o.status}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{new Date(o.created_at).toLocaleDateString("pt-BR")}</span>
                  <span>R$ {(o.total_cents / 100).toFixed(2)}</span>
                </div>
              </Link>
            ))}
            {d.orders.length === 0 && <div className="text-sm text-muted-foreground">Nenhum pedido.</div>}
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-5">
        <h2 className="font-semibold mb-3">Notas internas</h2>
        <div className="flex gap-2 mb-4">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Adicionar nota…" rows={2} />
          <Button onClick={async () => {
            if (!note.trim()) return;
            try { await upNote({ data: { userId: id, body: note } as any }); setNote(""); await reload(); }
            catch (e) { notifyError(e); }
          }}>Adicionar</Button>
        </div>
        <div className="space-y-2">
          {d.notes.map((n: any) => (
            <div key={n.id} className="p-3 border rounded flex justify-between gap-2">
              <div>
                <div className="text-sm whitespace-pre-wrap">{n.body}</div>
                <div className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("pt-BR")}</div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={async () => {
                  try { await upNote({ data: { id: n.id, userId: id, body: n.body, pinned: !n.pinned } as any }); await reload(); }
                  catch (e) { notifyError(e); }
                }}>
                  <Pin className={`h-4 w-4 ${n.pinned ? "text-primary" : ""}`} />
                </Button>
                <Button size="icon" variant="ghost" onClick={async () => {
                  try { await delNote({ data: { id: n.id } as any }); await reload(); }
                  catch (e) { notifyError(e); }
                }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {d.notes.length === 0 && <div className="text-sm text-muted-foreground">Nenhuma nota.</div>}
        </div>
      </div>
    </div>
  );
}