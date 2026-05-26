import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getFiscalCompany, upsertFiscalCompany, listFiscalProviders, upsertFiscalProvider } from "@/lib/fiscal.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Save } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";

export const Route = createFileRoute("/admin/fiscal")({ component: FiscalSettings });

function FiscalSettings() {
  const getCompany = useServerFn(getFiscalCompany);
  const upCompany = useServerFn(upsertFiscalCompany);
  const listProv = useServerFn(listFiscalProviders);
  const upProv = useServerFn(upsertFiscalProvider);
  const [c, setC] = useState<any>({ legal_name: "", cnpj: "", tax_regime: "simples_nacional", address: {}, default_iss_rate: 2 });
  const [provs, setProvs] = useState<any[]>([]);
  const [pf, setPf] = useState<any>({ name: "", provider_type: "focus_nfe", supports: ["nfse"], is_test: true, active: false, is_default: false, secret_ref: "", config: {} });

  // fix(B3): tratar erro de carga inicial.
  const reloadProvs = async () => {
    try { const r: any = await listProv(); setProvs(r ?? []); }
    catch (e) { notifyError(e); setProvs([]); }
  };
  useEffect(() => {
    (async () => {
      try { const d: any = await getCompany(); if (d) setC(d); }
      catch (e) { notifyError(e); }
    })();
    reloadProvs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-8 max-w-5xl space-y-8">
      <h1 className="text-3xl font-bold flex items-center gap-2"><FileText className="h-7 w-7" />Configurações Fiscais</h1>
      <p className="text-sm text-muted-foreground">Base pronta para emissão de NF-e/NFS-e. Cadastre empresa e provedor agora — a integração com a API do provedor pode ser ativada depois.</p>

      <section className="bg-card border rounded-lg p-5 space-y-3">
        <h2 className="font-semibold">Empresa emissora</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <Input placeholder="Razão social" value={c.legal_name ?? ""} onChange={(e) => setC({ ...c, legal_name: e.target.value })} />
          <Input placeholder="Nome fantasia" value={c.trade_name ?? ""} onChange={(e) => setC({ ...c, trade_name: e.target.value })} />
          <Input placeholder="CNPJ" value={c.cnpj ?? ""} onChange={(e) => setC({ ...c, cnpj: e.target.value })} />
          <Input placeholder="Inscrição Estadual" value={c.ie ?? ""} onChange={(e) => setC({ ...c, ie: e.target.value })} />
          <Input placeholder="Inscrição Municipal" value={c.im ?? ""} onChange={(e) => setC({ ...c, im: e.target.value })} />
          <select className="border rounded px-3 py-2 bg-background" value={c.tax_regime ?? "simples_nacional"} onChange={(e) => setC({ ...c, tax_regime: e.target.value })}>
            <option value="simples_nacional">Simples Nacional</option>
            <option value="lucro_presumido">Lucro Presumido</option>
            <option value="lucro_real">Lucro Real</option>
            <option value="mei">MEI</option>
          </select>
          <Input placeholder="Código de serviço (NFS-e)" value={c.default_service_code ?? ""} onChange={(e) => setC({ ...c, default_service_code: e.target.value })} />
          <Input placeholder="CNAE" value={c.default_cnae ?? ""} onChange={(e) => setC({ ...c, default_cnae: e.target.value })} />
          <Input type="number" step="0.01" placeholder="Alíquota ISS (%)" value={c.default_iss_rate ?? ""} onChange={(e) => setC({ ...c, default_iss_rate: parseFloat(e.target.value) })} />
          <Input placeholder="E-mail fiscal" value={c.email ?? ""} onChange={(e) => setC({ ...c, email: e.target.value })} />
          <Input placeholder="Telefone" value={c.phone ?? ""} onChange={(e) => setC({ ...c, phone: e.target.value })} />
        </div>
        <Textarea placeholder='Endereço (JSON: {"logradouro","numero","bairro","cidade","uf","cep"})' rows={3} value={JSON.stringify(c.address ?? {}, null, 2)} onChange={(e) => { try { setC({ ...c, address: JSON.parse(e.target.value) }); } catch { /* ignore */ } }} className="font-mono text-xs" />
        <Button onClick={async () => { try { await upCompany({ data: c }); notifySuccess("Dados salvos"); } catch (e) { notifyError(e); } }}>
          <Save className="h-4 w-4 mr-2" />Salvar empresa
        </Button>
      </section>

      <section className="bg-card border rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Provedores fiscais</h2>
          <Link to="/admin/fiscal-invoices" className="text-sm text-primary hover:underline">Ver notas →</Link>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <Input placeholder="Nome" value={pf.name} onChange={(e) => setPf({ ...pf, name: e.target.value })} />
          <select className="border rounded px-3 py-2 bg-background" value={pf.provider_type} onChange={(e) => setPf({ ...pf, provider_type: e.target.value })}>
            <option value="focus_nfe">Focus NFe</option>
            <option value="nfe_io">NFE.io</option>
            <option value="enotas">eNotas</option>
            <option value="manual">Manual (sem API)</option>
          </select>
          <Input placeholder="Nome do secret (ex: FOCUS_NFE_TOKEN)" value={pf.secret_ref} onChange={(e) => setPf({ ...pf, secret_ref: e.target.value })} />
          <div className="flex gap-4 items-center text-sm">
            <label className="flex gap-2 items-center"><input type="checkbox" checked={pf.is_test} onChange={(e) => setPf({ ...pf, is_test: e.target.checked })} />Sandbox</label>
            <label className="flex gap-2 items-center"><input type="checkbox" checked={pf.active} onChange={(e) => setPf({ ...pf, active: e.target.checked })} />Ativo</label>
            <label className="flex gap-2 items-center"><input type="checkbox" checked={pf.is_default} onChange={(e) => setPf({ ...pf, is_default: e.target.checked })} />Padrão</label>
          </div>
        </div>
        <Button onClick={async () => {
          // fix(B4): tratar erro do salvar provedor.
          try {
            await upProv({ data: pf });
            notifySuccess("Provedor salvo");
            setPf({ name: "", provider_type: "focus_nfe", supports: ["nfse"], is_test: true, active: false, is_default: false, secret_ref: "", config: {} });
            await reloadProvs();
          } catch (e) { notifyError(e); }
        }}>
          <Save className="h-4 w-4 mr-2" />Salvar provedor
        </Button>
        <div className="border rounded mt-4 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr><th className="text-left p-3">Nome</th><th className="text-left p-3">Tipo</th><th className="text-left p-3">Secret</th><th className="text-left p-3">Status</th></tr></thead>
            <tbody>
              {provs.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{p.name}</td>
                  <td className="p-3 text-xs uppercase">{p.provider_type}</td>
                  <td className="p-3 font-mono text-xs">{p.secret_ref ?? "—"}</td>
                  <td className="p-3 text-xs">{p.active ? "ativo" : "inativo"}{p.is_default ? " · padrão" : ""}{p.is_test ? " · sandbox" : ""}</td>
                </tr>
              ))}
              {provs.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nenhum provedor cadastrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}