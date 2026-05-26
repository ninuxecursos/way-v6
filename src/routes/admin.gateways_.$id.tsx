import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Activity, Webhook, ShoppingCart, CheckCircle2, XCircle, Loader2, ExternalLink, Copy, AlertTriangle } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { getUserMessage } from "@/lib/errors";
import {
  testGatewayConnection,
  testWebhookEndpoint,
  testCheckoutPreference,
} from "@/lib/payment-gateway-tests.functions";

export const Route = createFileRoute("/admin/gateways_/$id")({ component: GatewayEditor });

function GatewayEditor() {
  const { id } = Route.useParams();
  const [g, setG] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const runConn = useServerFn(testGatewayConnection);
  const runHook = useServerFn(testWebhookEndpoint);
  const runPref = useServerFn(testCheckoutPreference);
  const [diag, setDiag] = useState<{ kind: string; loading?: boolean; result?: any } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // fix(B3): tratar erro/RLS.
      try {
        const { data, error } = await supabase.from("payment_gateways").select("*").eq("id", id).single();
        if (cancelled) return;
        if (error) throw error;
        setG(data);
      } catch (e) {
        if (cancelled) return;
        notifyError(e);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (!g) return <div className="p-8">Carregando...</div>;
  const cfg = g.config ?? {};
  const setCfg = (k: string, v: any) => setG({ ...g, config: { ...cfg, [k]: v } });
  const enabledMethods: string[] = Array.isArray(cfg.enabled_methods) && cfg.enabled_methods.length > 0
    ? cfg.enabled_methods : ["pix", "credit_card"];
  const toggleMethod = (m: string) => {
    const set = new Set(enabledMethods);
    if (set.has(m)) set.delete(m); else set.add(m);
    setCfg("enabled_methods", Array.from(set));
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("payment_gateways").update({
      name: g.name, active: g.active, is_test: g.is_test, priority: g.priority, config: g.config,
    }).eq("id", id);
    setSaving(false);
    if (error) notifyError(error); else notifySuccess("Salvo!");
  };

  return (
    <div className="p-8 max-w-3xl">
      <Link to="/admin/gateways" className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="h-3 w-3" /> Voltar
      </Link>
      <h1 className="text-3xl font-bold mb-2">{g.name}</h1>
      <p className="text-sm text-muted-foreground mb-6">Tipo: <strong>{g.provider_type}</strong></p>

      <div className="space-y-4 bg-card border p-6 rounded-lg">
        <div><Label>Nome</Label><Input value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} /></div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2"><Switch checked={g.active} onCheckedChange={(v) => setG({ ...g, active: v })} /> Ativo</label>
          <label className="flex items-center gap-2"><Switch checked={g.is_test} onCheckedChange={(v) => setG({ ...g, is_test: v })} /> Modo teste/sandbox</label>
          <div><Label>Prioridade</Label><Input type="number" className="w-24" value={g.priority} onChange={(e) => setG({ ...g, priority: Number(e.target.value) })} /></div>
        </div>

        {g.provider_type === "mercadopago" && (
          <MercadoPagoFields cfg={cfg} setCfg={setCfg} isTest={!!g.is_test} gatewayId={id} />
        )}

        {g.provider_type === "generic_rest" && (
          <>
            <div><Label>Endpoint de criação</Label><Input value={cfg.create_endpoint ?? ""} onChange={(e) => setCfg("create_endpoint", e.target.value)} placeholder="https://api.exemplo.com/v1/checkout" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Header de auth</Label><Input value={cfg.auth_header_name ?? "Authorization"} onChange={(e) => setCfg("auth_header_name", e.target.value)} /></div>
              <div><Label>Token de auth</Label><Input type="password" value={cfg.auth_token ?? ""} onChange={(e) => setCfg("auth_token", e.target.value)} placeholder="Bearer xxx" /></div>
            </div>
            <div>
              <Label>Payload template (JSON com {`{{vars}}`})</Label>
              <textarea className="w-full font-mono text-xs border rounded p-2 h-40"
                value={JSON.stringify(cfg.payload_template ?? {}, null, 2)}
                onChange={(e) => { try { setCfg("payload_template", JSON.parse(e.target.value)); } catch {} }} />
              <p className="text-xs text-muted-foreground mt-1">Vars: order_id, amount, amount_cents, currency, description, email, success_url, failure_url, notification_url</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>JSON path do checkout_url</Label><Input value={cfg.checkout_url_path ?? "checkout_url"} onChange={(e) => setCfg("checkout_url_path", e.target.value)} /></div>
              <div><Label>JSON path do external_id</Label><Input value={cfg.external_id_path ?? "id"} onChange={(e) => setCfg("external_id_path", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Header de assinatura webhook</Label><Input value={cfg.webhook_signature_header ?? "x-signature"} onChange={(e) => setCfg("webhook_signature_header", e.target.value)} /></div>
              <div><Label>Webhook secret (HMAC SHA256)</Label><Input type="password" value={cfg.webhook_secret ?? ""} onChange={(e) => setCfg("webhook_secret", e.target.value)} /></div>
            </div>
            <p className="text-xs text-muted-foreground">Webhook URL: <code>{typeof window !== "undefined" ? window.location.origin : ""}/api/public/webhooks/generic_rest?gateway={id}</code></p>
          </>
        )}

        <div className="border-t pt-4 mt-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Taxa PIX e parcelamento
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Estratégia comercial: o preço cadastrado no produto é o <strong>preço oficial</strong> (cartão 1x). A <strong>taxa PIX</strong> é <strong>somada</strong> automaticamente ao valor final quando o cliente escolhe PIX. Descontos são tratados apenas por cupons promocionais.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Taxa PIX (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={cfg.pix_fee_pct ?? cfg.pix_discount_pct ?? 0}
                onChange={(e) => setCfg("pix_fee_pct", Number(e.target.value))}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Ex.: 7% sobre um preço oficial de R$ 2.000 resulta em R$ 2.140 no PIX. Use 0 para não cobrar taxa.
              </p>
            </div>
            <div>
              <Label>Parcelas máximas no cartão</Label>
              <Input type="number" value={cfg.installments_max ?? 10} onChange={(e) => setCfg("installments_max", Number(e.target.value))} />
            </div>
            <div>
              <Label>Sem juros até (parcelas)</Label>
              <Input type="number" value={cfg.installments_free_up_to ?? 1} onChange={(e) => setCfg("installments_free_up_to", Number(e.target.value))} />
            </div>
            <div className="col-span-2">
              <Label>Juros mensal acima do limite (%)</Label>
              <Input type="number" step="0.01" value={cfg.installments_interest_pct ?? 3} onChange={(e) => setCfg("installments_interest_pct", Number(e.target.value))} />
              <p className="text-[11px] text-muted-foreground mt-1">
                Exibido no checkout como “Parcelamento disponível com juros de X% ao mês”.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t pt-4 mt-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Métodos de pagamento habilitados
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Defina o que o cliente pode escolher no checkout. Alterações exigem clicar em Salvar.
          </p>
          <div className="flex flex-wrap gap-4">
            {[
              { id: "pix", label: "PIX" },
              { id: "credit_card", label: "Cartão de crédito" },
              { id: "boleto", label: "Boleto" },
            ].map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm">
                <Switch checked={enabledMethods.includes(m.id)} onCheckedChange={() => toggleMethod(m.id)} />
                {m.label}
              </label>
            ))}
          </div>
          <div className="mt-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={cfg.credit_card_installments_enabled !== false}
                onCheckedChange={(v) => setCfg("credit_card_installments_enabled", v)}
              />
              Permitir parcelamento no cartão
            </label>
          </div>
          <div className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-100">
            <strong className="block mb-1">Cartão de crédito não aparece no Checkout Pro?</strong>
            Em <em>produção</em>, o Mercado Pago só exibe cartão se a sua conta MP já estiver
            habilitada a receber por cartão. Confira em{" "}
            <a
              href="https://www.mercadopago.com.br/settings/account/payment-methods"
              target="_blank"
              rel="noreferrer"
              className="underline font-semibold"
            >
              Mercado Pago → Sua conta → Métodos de pagamento
            </a>{" "}
            se "Cartão de crédito" está ativo. Também verifique se o cliente informa CPF e
            nome completo no checkout — o MP exige esses dados para liberar cartão em BRL.
          </div>
        </div>

        <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? "Salvando..." : "Salvar"}</Button>
      </div>

      {/* Diagnóstico */}
      <div className="mt-6 bg-card border p-6 rounded-lg space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2"><Activity className="h-5 w-5" />Diagnóstico</h2>
        <p className="text-xs text-muted-foreground">
          Testes em tempo real para validar credenciais, webhook e criação de pagamento. Salve antes de testar para usar as configurações atualizadas.
        </p>
        <div className="grid md:grid-cols-3 gap-3">
          <DiagButton
            icon={<Activity className="h-4 w-4" />}
            label="Testar conexão (API)"
            loading={diag?.kind === "conn" && diag.loading}
            onClick={async () => {
              setDiag({ kind: "conn", loading: true });
              try {
                const r = await runConn({ data: { gatewayId: id } as any });
                setDiag({ kind: "conn", result: r });
              } catch (e) { setDiag({ kind: "conn", result: { ok: false, error: getUserMessage(e) } }); }
            }}
          />
          <DiagButton
            icon={<Webhook className="h-4 w-4" />}
            label="Testar webhook"
            loading={diag?.kind === "hook" && diag.loading}
            onClick={async () => {
              setDiag({ kind: "hook", loading: true });
              try {
                const r = await runHook({ data: { gatewayId: id, origin: window.location.origin } as any });
                setDiag({ kind: "hook", result: r });
              } catch (e) { setDiag({ kind: "hook", result: { ok: false, error: getUserMessage(e) } }); }
            }}
          />
          <DiagButton
            icon={<ShoppingCart className="h-4 w-4" />}
            label="Criar preferência teste (R$1)"
            loading={diag?.kind === "pref" && diag.loading}
            onClick={async () => {
              setDiag({ kind: "pref", loading: true });
              try {
                const r = await runPref({ data: { gatewayId: id, amountCents: 100, paymentMethod: "pix" } as any });
                setDiag({ kind: "pref", result: r });
              } catch (e) { setDiag({ kind: "pref", result: { ok: false, error: getUserMessage(e) } }); }
            }}
          />
        </div>

        {diag?.result && <DiagResult kind={diag.kind} result={diag.result} />}
      </div>
    </div>
  );
}

function DiagButton({ icon, label, loading, onClick }: { icon: React.ReactNode; label: string; loading?: boolean; onClick: () => void }) {
  return (
    <Button variant="outline" onClick={onClick} disabled={loading} className="justify-start">
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <span className="mr-2">{icon}</span>}
      {label}
    </Button>
  );
}

function MercadoPagoFields({
  cfg, setCfg, isTest, gatewayId,
}: { cfg: any; setCfg: (k: string, v: any) => void; isTest: boolean; gatewayId: string }) {
  const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const publicSiteUrl = String(cfg.public_site_url ?? "").trim().replace(/\/$/, "");
  const effectiveBase = publicSiteUrl || browserOrigin;
  const webhookUrl = `${effectiveBase}/api/public/webhooks/mercadopago?gateway=${gatewayId}`;
  const isPreviewBase =
    !publicSiteUrl &&
    (/\.lovable\.app$/.test(browserOrigin) ||
      /\.lovableproject\.com$/.test(browserOrigin) ||
      /localhost|127\.0\.0\.1/.test(browserOrigin));

  const accessToken = String(cfg.access_token ?? "");
  const publicKey = String(cfg.public_key ?? "");
  const tokenIsTest = accessToken.startsWith("TEST-");
  const tokenIsLive = accessToken.startsWith("APP_USR-");
  const pkIsTest = publicKey.startsWith("TEST-");
  const pkIsLive = publicKey.startsWith("APP_USR-");
  const tokenMismatch = accessToken && ((isTest && tokenIsLive) || (!isTest && tokenIsTest));
  const pkMismatch = publicKey && ((isTest && pkIsLive) || (!isTest && pkIsTest));

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); notifySuccess("Copiado!"); } catch { /* noop */ }
  };

  return (
    <div className="space-y-5">
      <div className={`rounded-md border p-3 text-xs flex items-start gap-2 ${isTest ? "border-amber-500/40 bg-amber-500/5" : "border-emerald-500/40 bg-emerald-500/5"}`}>
        {isTest ? <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />}
        <div className="space-y-1">
          <div>
            <strong>{isTest ? "Modo TESTE ativo." : "Modo PRODUÇÃO ativo."}</strong>{" "}
            {isTest
              ? "Use credenciais que começam com TEST-. Nenhuma cobrança real será gerada."
              : "Use credenciais APP_USR- já ativadas no painel do MP. Cobranças serão reais."}
          </div>
          <a
            href="https://www.mercadopago.com.br/developers/panel/app"
            target="_blank" rel="noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            Abrir painel Mercado Pago Developers <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <fieldset className="space-y-4 border rounded-md p-4">
        <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Public Key e Access Token {isTest ? "(de TESTE)" : "(de PRODUÇÃO)"}
        </legend>
        <p className="text-xs text-muted-foreground -mt-2">
          Em <strong>Suas integrações → {isTest ? "Testes → Credenciais de teste" : "Produção → Credenciais de produção"}</strong>.
          {!isTest && " Lembre-se de ativar as credenciais de produção informando indústria e website."}
        </p>

        <div>
          <Label>Public Key <span className="text-destructive">*</span></Label>
          <Input
            placeholder={isTest ? "TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" : "APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}
            value={publicKey}
            onChange={(e) => setCfg("public_key", e.target.value.trim())}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Chave pública usada no frontend (SDK MercadoPago.js, Bricks, tokenização de cartão). Não é sigilosa.
          </p>
          {pkMismatch && (
            <p className="text-xs text-amber-500 mt-1 font-semibold">
              ⚠ Esta Public Key não corresponde ao modo {isTest ? "teste" : "produção"} do gateway.
            </p>
          )}
        </div>

        <div>
          <Label>Access Token <span className="text-destructive">*</span></Label>
          <Input
            type="password"
            placeholder={isTest ? "TEST-..." : "APP_USR-..."}
            value={accessToken}
            onChange={(e) => setCfg("access_token", e.target.value.trim())}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Chave privada usada apenas no backend para criar pagamentos. Enviada no header <code>Authorization: Bearer</code>. Nunca exponha no frontend.
          </p>
          {tokenMismatch && (
            <p className="text-xs text-amber-500 mt-1 font-semibold">
              ⚠ Este Access Token não corresponde ao modo {isTest ? "teste" : "produção"} do gateway. Vai falhar no checkout.
            </p>
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-4 border rounded-md p-4">
        <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Client ID e Client Secret (OAuth)
        </legend>
        <p className="text-xs text-muted-foreground -mt-2">
          Opcionais. Necessários apenas para fluxos <strong>OAuth / Client Credentials</strong> (acessar contas de terceiros em seu nome) e algumas integrações antigas de e-commerce. Para pagamentos comuns, Public Key + Access Token bastam.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Client ID</Label>
            <Input
              value={cfg.client_id ?? ""}
              onChange={(e) => setCfg("client_id", e.target.value.trim())}
              placeholder="1234567890123456"
            />
            <p className="text-xs text-muted-foreground mt-1">Identificador público da aplicação.</p>
          </div>
          <div>
            <Label>Client Secret</Label>
            <Input
              type="password"
              value={cfg.client_secret ?? ""}
              onChange={(e) => setCfg("client_secret", e.target.value.trim())}
            />
            <p className="text-xs text-muted-foreground mt-1">Mantenha em segredo. Nunca exponha no frontend.</p>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3 border rounded-md p-4">
        <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Webhook (notificações de pagamento)
        </legend>
        <div>
          <Label>URL pública do site (produção) <span className="text-destructive">*</span></Label>
          <Input
            value={cfg.public_site_url ?? ""}
            onChange={(e) => setCfg("public_site_url", e.target.value.trim())}
            placeholder="https://www.wayhomeoficial.com.br"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Domínio público onde a aplicação está publicada. Usamos esta URL para montar o
            <code> notification_url</code> enviado ao Mercado Pago e a URL do webhook abaixo.
            Sem isso, usamos a URL atual do navegador (que pode ser preview e o Mercado Pago não consegue validar).
          </p>
        </div>
        {isPreviewBase && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
            <div>
              Você está vendo a URL de <strong>preview/local</strong> (<code>{browserOrigin}</code>). O Mercado Pago não vai conseguir validar essa URL. Configure a <strong>URL pública do site</strong> acima com o domínio publicado (ex.: <code>https://www.wayhomeoficial.com.br</code>) antes de colar a URL do webhook no painel.
            </div>
          </div>
        )}
        <div>
          <Label>URL para colar no painel do Mercado Pago</Label>
          <div className="flex gap-2 mt-1">
            <Input readOnly value={webhookUrl} className="font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={() => copy(webhookUrl)} title="Copiar URL">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Painel MP → <strong>Sua aplicação → Webhooks → Configurar notificações</strong>. Selecione os eventos <code>payment</code> e <code>merchant_order</code>.
            <br />
            Não cole nada que comece com <code>/_serverFn/</code>, nem URLs <code>id-preview-</code>: o Mercado Pago precisa do caminho exato <code>/api/public/webhooks/mercadopago</code>.
          </p>
        </div>
        <div>
          <Label>Assinatura Secreta do Webhook <span className="text-destructive">*</span></Label>
          <Input
            type="password"
            value={cfg.webhook_secret ?? ""}
            onChange={(e) => setCfg("webhook_secret", e.target.value.trim())}
            placeholder="Cole a chave secreta gerada pelo MP"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Após salvar a URL no MP, copie a <strong>Chave secreta</strong> exibida e cole aqui. Usamos para validar a assinatura <code>x-signature</code> e garantir que as notificações realmente vêm do Mercado Pago.
          </p>
        </div>
      </fieldset>

      <fieldset className="space-y-4 border rounded-md p-4">
        <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Configuração do Checkout
        </legend>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Modo de Checkout</Label>
            <p className="text-[11px] text-muted-foreground">
              Bricks (Recomendado): pagamento dentro do site. Pro: redireciona para o Mercado Pago.
            </p>
          </div>
          <div className="flex bg-muted p-1 rounded-md">
            <button
              type="button"
              onClick={() => setCfg("checkout_mode", "bricks")}
              className={`px-3 py-1 text-xs rounded-sm transition ${cfg.checkout_mode !== "pro" ? "bg-background shadow-sm font-bold" : "text-muted-foreground"}`}
            >
              Bricks
            </button>
            <button
              type="button"
              onClick={() => setCfg("checkout_mode", "pro")}
              className={`px-3 py-1 text-xs rounded-sm transition ${cfg.checkout_mode === "pro" ? "bg-background shadow-sm font-bold" : "text-muted-foreground"}`}
            >
              Pro
            </button>
          </div>
        </div>
      </fieldset>
    </div>
  );
}




function DiagResult({ kind, result }: { kind: string; result: any }) {
  const ok = !!result.ok;
  return (
    <div className={`mt-3 p-4 rounded-lg border ${ok ? "border-green-500/40 bg-green-500/5" : "border-destructive/40 bg-destructive/5"}`}>
      <div className="flex items-center gap-2 mb-2">
        {ok ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
        <span className="font-semibold text-sm">
          {kind === "conn" && (ok ? "Conexão OK" : "Falha na conexão")}
          {kind === "hook" && (ok ? "Webhook ativo" : "Webhook indisponível")}
          {kind === "pref" && (ok ? "Preferência criada" : "Falha ao criar preferência")}
        </span>
        {typeof result.latencyMs === "number" && (
          <span className="text-xs text-muted-foreground">· {result.latencyMs}ms</span>
        )}
        {typeof result.status === "number" && (
          <span className="text-xs text-muted-foreground">· HTTP {result.status}</span>
        )}
      </div>
      {kind === "conn" && ok && (
        <div className="text-xs space-y-1">
          <div><strong>Conta:</strong> {result.nickname ?? result.email ?? result.accountId}</div>
          <div><strong>Site:</strong> {result.siteId} · <strong>País:</strong> {result.countryId}</div>
          <div><strong>Token:</strong> {result.tokenKind} · <strong>Modo do gateway:</strong> {result.gatewayMode}</div>
          {result.mismatch && (
            <div className="mt-2 text-amber-500 font-semibold">
              ⚠ Atenção: o tipo do token NÃO corresponde ao modo do gateway. Isso vai causar falha no checkout real.
            </div>
          )}
        </div>
      )}
      {kind === "hook" && (
        <div className="text-xs space-y-1">
          <div className="break-all"><strong>URL:</strong> <code>{result.url}</code></div>
          {typeof result.usingPublicUrl === "boolean" && (
            <div className="text-muted-foreground">
              {result.usingPublicUrl
                ? "Testado contra a URL pública configurada no gateway."
                : "Testado contra a origem atual (preview/local). Configure a URL pública para validar produção."}
            </div>
          )}
          {result.hint && <div className="text-muted-foreground">{result.hint}</div>}
        </div>
      )}
      {kind === "pref" && ok && (
        <div className="text-xs space-y-1">
          <div><strong>Preference ID:</strong> <code>{result.preferenceId}</code></div>
          <div>
            <a href={result.checkoutUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              Abrir checkout {result.sandboxUrl === result.checkoutUrl ? "(sandbox)" : "(produção)"} →
            </a>
          </div>
        </div>
      )}
      {result.error && <div className="text-xs text-destructive mt-1">{result.error}</div>}
      {result.details && (
        <details className="mt-2">
          <summary className="text-xs cursor-pointer text-muted-foreground">Resposta crua</summary>
          <pre className="text-[11px] mt-1 overflow-auto max-h-48 bg-muted/30 p-2 rounded">{JSON.stringify(result.details, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}