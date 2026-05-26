import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listFiscalInvoices, createFiscalInvoiceForOrder, updateFiscalInvoiceStatus } from "@/lib/fiscal.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Receipt, Plus } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { useConfirmDelete } from "@/components/common/ConfirmDeleteProvider";

export const Route = createFileRoute("/admin/fiscal-invoices")({ component: InvoicesList });

function InvoicesList() {
  const list = useServerFn(listFiscalInvoices);
  const create = useServerFn(createFiscalInvoiceForOrder);
  const update = useServerFn(updateFiscalInvoiceStatus);
  const confirmDelete = useConfirmDelete();
  const [rows, setRows] = useState<any[]>([]);
  const [orderId, setOrderId] = useState("");

  // fix(B3): tratar erro de carregamento.
  const reload = async () => {
    try { const r: any = await list({ data: { limit: 200 } as any }); setRows(r ?? []); }
    catch (e) { notifyError(e); setRows([]); }
  };
  useEffect(() => { reload(); }, []);

  return (
    <div className="p-8 max-w-6xl">
      <Link to="/admin/fiscal" className="text-sm text-primary hover:underline">← Configurações fiscais</Link>
      <div className="flex items-center justify-between mt-2 mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2"><Receipt className="h-7 w-7" />Notas Fiscais</h1>
      </div>

      <div className="bg-card border rounded-lg p-4 mb-6 flex gap-2">
        <Input placeholder="UUID do pedido" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
        <Button onClick={async () => { if (!orderId.trim()) return; try { await create({ data: { orderId, invoiceType: "nfse" } as any }); notifySuccess("NF-e/NFS-e criada"); setOrderId(""); reload(); } catch (e) { notifyError(e); } }}>
          <Plus className="h-4 w-4 mr-2" />Criar NFS-e (manual)
        </Button>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>
            <th className="text-left p-3">Pedido</th><th className="text-left p-3">Tipo</th><th className="text-left p-3">Número</th><th className="text-left p-3">Status</th><th className="text-left p-3">Valor</th><th className="text-left p-3">Emitida</th><th></th>
          </tr></thead>
          <tbody>
            {rows.map((n) => (
              <tr key={n.id} className="border-t">
                <td className="p-3"><Link to="/admin/orders/$id" params={{ id: n.order_id }} className="text-primary hover:underline font-mono text-xs">{n.order_id.slice(0, 8)}…</Link></td>
                <td className="p-3 uppercase text-xs">{n.invoice_type}</td>
                <td className="p-3 font-mono text-xs">{n.number ?? "—"}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${n.status === "issued" ? "bg-green-500/20" : n.status === "rejected" || n.status === "cancelled" ? "bg-destructive/20" : "bg-muted"}`}>{n.status}</span></td>
                <td className="p-3">R$ {(n.amount_cents / 100).toFixed(2)}</td>
                <td className="p-3 text-xs">{n.issued_at ? new Date(n.issued_at).toLocaleString("pt-BR") : "—"}</td>
                <td className="p-3 flex gap-1">
                  {n.status === "pending" && (
                    <>
                      <Button size="sm" variant="outline" onClick={async () => {
                        const num = prompt("Número da nota:");
                        if (!num) return;
                        // fix(B4): tratar erro do update.
                        try { await update({ data: { id: n.id, status: "issued", number: num } as any }); notifySuccess("Nota marcada como emitida"); await reload(); }
                        catch (e) { notifyError(e); }
                      }}>Marcar emitida</Button>
                      <Button size="sm" variant="outline" onClick={async () => {
                        const err = prompt("Motivo da rejeição:") ?? "";
                        try { await update({ data: { id: n.id, status: "rejected", last_error: err } as any }); notifySuccess("Nota rejeitada"); await reload(); }
                        catch (e) { notifyError(e); }
                      }}>Rejeitar</Button>
                    </>
                  )}
                  {n.status === "issued" && (
                    <Button size="sm" variant="outline" onClick={async () => {
                      const ok = await confirmDelete({
                        title: "Cancelar nota fiscal?",
                        description: "A nota será marcada como cancelada e não poderá ser reemitida.",
                        resourceLabel: n.number ?? n.id,
                        confirmButtonLabel: "Cancelar nota",
                        confirmWord: "CANCELAR",
                      });
                      if (!ok) return;
                      try { await update({ data: { id: n.id, status: "cancelled" } as any }); notifySuccess("Nota cancelada"); await reload(); }
                      catch (e) { notifyError(e); }
                    }}>Cancelar</Button>
                  )}
                  {n.pdf_url && <a href={n.pdf_url} target="_blank" rel="noreferrer" className="text-primary text-xs hover:underline self-center">PDF</a>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma nota fiscal.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}