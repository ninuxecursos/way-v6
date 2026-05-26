import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, QrCode, Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { testCheckoutPreference } from "@/lib/payment-gateway-tests.functions";

const TEST_CARDS = [
  { brand: "Visa", number: "4509 9535 6623 3704", cvv: "123", exp: "11/30", scenario: "APRO (aprovado)" },
  { brand: "Mastercard", number: "5031 4332 1540 6351", cvv: "123", exp: "11/30", scenario: "APRO (aprovado)" },
  { brand: "Amex", number: "3711 803032 57522", cvv: "1234", exp: "11/30", scenario: "APRO (aprovado)" },
  { brand: "Qualquer", number: "—", cvv: "—", exp: "—", scenario: "Nome OTHE = recusado / CONT = pendente" },
];

export function GatewaysQAPanel() {
  const [gateways, setGateways] = useState<any[]>([]);
  const [gatewayId, setGatewayId] = useState<string>("");
  const [history, setHistory] = useState<any[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const runPref = useServerFn(testCheckoutPreference);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("payment_gateways").select("*").eq("active", true).order("priority");
      const list = (data ?? []).filter((g: any) => g.provider_type === "mercadopago");
      setGateways(list);
      if (list[0]?.id) setGatewayId(list[0].id);
    })();
  }, []);

  const selected = gateways.find((g) => g.id === gatewayId);

  async function runTest(label: string, paymentMethod: "pix" | "credit_card", amountCents = 100) {
    if (!gatewayId) { notifyError(null, "Selecione um gateway."); return; }
    setRunning(label);
    try {
      const r: any = await runPref({ data: { gatewayId, amountCents, paymentMethod } as any });
      if (!r.ok) { notifyError(null, r.error || "Falha"); return; }
      const entry = { ts: Date.now(), label, ...r, paymentMethod, amountCents };
      setHistory((h) => [entry, ...h].slice(0, 20));
      if (r.checkoutUrl) window.open(r.checkoutUrl, "_blank", "noopener");
      notifySuccess(`${label} criado com sucesso`);
    } catch (e) {
      notifyError(e);
    } finally {
      setRunning(null);
    }
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-6">
        Crie preferências reais de pagamento no Mercado Pago para validar PIX, cartão à vista e parcelado.
        Use sempre um gateway em <strong>modo TESTE</strong> com token <code>TEST-</code>.
      </p>

      <div className="bg-card border rounded-lg p-5 mb-6">
        <label className="text-xs text-muted-foreground">Gateway</label>
        <Select value={gatewayId} onValueChange={setGatewayId}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um gateway Mercado Pago" /></SelectTrigger>
          <SelectContent>
            {gateways.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name} · {g.is_test ? "TESTE" : "LIVE"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected && !selected.is_test && (
          <div className="mt-3 text-xs text-amber-500 font-semibold">
            ⚠ Este gateway está em modo LIVE — testes vão gerar cobranças reais.
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-3 mb-6">
        <TestButton
          icon={<QrCode className="h-5 w-5" />}
          title="PIX (R$ 1,00)"
          subtitle="Valida fluxo de pagamento instantâneo"
          loading={running === "PIX"}
          onClick={() => runTest("PIX", "pix", 100)}
        />
        <TestButton
          icon={<CreditCard className="h-5 w-5" />}
          title="Cartão à vista (R$ 1,00)"
          subtitle="Crédito 1x"
          loading={running === "Cartão 1x"}
          onClick={() => runTest("Cartão 1x", "credit_card", 100)}
        />
        <TestButton
          icon={<CreditCard className="h-5 w-5" />}
          title="Cartão parcelado (R$ 30,00)"
          subtitle="3x — valida parcelamento"
          loading={running === "Cartão 3x"}
          onClick={() => runTest("Cartão 3x", "credit_card", 3000)}
        />
        <TestButton
          icon={<CreditCard className="h-5 w-5" />}
          title="Cartão 12x (R$ 120,00)"
          subtitle="Valida parcelas máximas + juros"
          loading={running === "Cartão 12x"}
          onClick={() => runTest("Cartão 12x", "credit_card", 12000)}
        />
      </div>

      <div className="bg-card border rounded-lg p-5 mb-6">
        <h2 className="font-semibold mb-3">Cartões de teste do Mercado Pago</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr><th className="text-left p-2">Bandeira</th><th className="text-left p-2">Número</th><th className="text-left p-2">CVV</th><th className="text-left p-2">Validade</th><th className="text-left p-2">Cenário</th></tr>
            </thead>
            <tbody>
              {TEST_CARDS.map((c, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{c.brand}</td>
                  <td className="p-2 font-mono">{c.number}</td>
                  <td className="p-2 font-mono">{c.cvv}</td>
                  <td className="p-2 font-mono">{c.exp}</td>
                  <td className="p-2">{c.scenario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Dica: no nome do titular use <code>APRO</code> para aprovar, <code>OTHE</code> para recusar e <code>CONT</code> para pendente.
        </p>
      </div>

      <div className="bg-card border rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Histórico desta sessão</h2>
          <Button size="sm" variant="ghost" onClick={() => setHistory([])}>
            <RefreshCw className="h-3 w-3 mr-1" />Limpar
          </Button>
        </div>
        {history.length === 0 && <p className="text-xs text-muted-foreground">Nenhum teste executado ainda.</p>}
        <div className="space-y-2">
          {history.map((h) => (
            <div key={h.ts} className="border rounded p-3 text-xs flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{h.label} · R$ {(h.amountCents / 100).toFixed(2)}</div>
                <div className="text-muted-foreground font-mono">{h.preferenceId} · {h.latencyMs}ms</div>
              </div>
              {h.checkoutUrl && (
                <a href={h.checkoutUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />Reabrir
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TestButton({ icon, title, subtitle, loading, onClick }: { icon: React.ReactNode; title: string; subtitle: string; loading?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="text-left p-4 bg-card border rounded-lg hover:bg-accent/40 transition-colors disabled:opacity-50 flex items-center gap-3"
    >
      <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : icon}
      </div>
      <div>
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </button>
  );
}