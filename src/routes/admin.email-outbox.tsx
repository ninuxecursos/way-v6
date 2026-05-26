import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listOutbox, enqueueTestEmail } from "@/lib/email.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { notifyError, notifySuccess } from "@/lib/notify";

export const Route = createFileRoute("/admin/email-outbox")({ component: OutboxPage });

function OutboxPage() {
  const list = useServerFn(listOutbox);
  const enqueue = useServerFn(enqueueTestEmail);
  const [rows, setRows] = useState<any[]>([]);
  const [test, setTest] = useState({ to: "", subject: "Teste Way Home", html: "<h1>Olá!</h1><p>E-mail de teste.</p>" });

  const reload = () => list({ data: { limit: 100 } as any }).then((r: any) => setRows(r));
  useEffect(() => { reload(); }, []);

  return (
    <div className="p-8 max-w-6xl">
      <Link to="/admin/email-templates" className="text-sm text-primary hover:underline">← Templates</Link>
      <h1 className="text-3xl font-bold mt-2 mb-2">Caixa de saída</h1>
      <p className="text-sm text-muted-foreground mb-6">E-mails enfileirados aguardando despacho. Quando um provedor estiver ativo, o sistema enviará automaticamente.</p>

      <div className="bg-card border rounded-lg p-5 mb-6 space-y-2">
        <h3 className="font-semibold text-sm">Enfileirar e-mail de teste</h3>
        <Input placeholder="para@email.com" value={test.to} onChange={(e) => setTest({ ...test, to: e.target.value })} />
        <Input placeholder="Assunto" value={test.subject} onChange={(e) => setTest({ ...test, subject: e.target.value })} />
        <Textarea rows={4} value={test.html} onChange={(e) => setTest({ ...test, html: e.target.value })} />
        <Button onClick={async () => { try { await enqueue({ data: test as any }); notifySuccess("E-mail enfileirado"); reload(); } catch (e) { notifyError(e); } }}>Enfileirar</Button>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr><th className="text-left p-3">Para</th><th className="text-left p-3">Assunto</th><th className="text-left p-3">Status</th><th className="text-left p-3">Tentativas</th><th className="text-left p-3">Criado</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 text-xs">{r.to_email}</td>
                <td className="p-3">{r.subject}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${r.status === "sent" ? "bg-green-500/20" : r.status === "failed" ? "bg-destructive/20" : "bg-muted"}`}>{r.status}</span></td>
                <td className="p-3 text-xs">{r.attempts}</td>
                <td className="p-3 text-xs">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Caixa de saída vazia.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}