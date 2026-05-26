import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHash, randomUUID } from "crypto";
import QRCode from "qrcode";
import { resolveLogoUrl } from "@/lib/logo-catalog";

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function get(obj: any, path: string): any {
  return path.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

// Substitui {{ var.path }} (escapado), {{{ var.path }}} (raw) e blocos {{#each items}}...{{/each}}
export function renderTemplate(html: string, ctx: Record<string, any>): string {
  // each blocks
  html = html.replace(/\{\{\s*#each\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\s*\/each\s*\}\}/g, (_, path: string, body: string) => {
    const arr = get(ctx, path);
    if (!Array.isArray(arr)) return "";
    return arr.map((item) => {
      let out = body.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_m, k: string) => {
        if (k.startsWith("this.")) return String(get(item, k.slice(5)) ?? "");
        if (k === "this") return String(item ?? "");
        return String(get({ ...ctx, this: item }, k) ?? "");
      });
      out = out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, k: string) => {
        if (k.startsWith("this.")) return escapeHtml(get(item, k.slice(5)) ?? "");
        if (k === "this") return escapeHtml(item ?? "");
        return escapeHtml(get({ ...ctx, this: item }, k) ?? "");
      });
      return out;
    }).join("");
  });
  // raw vars (no escape) — usar SOMENTE para conteúdo confiável (logo URL, QR SVG)
  html = html.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_m, k: string) => String(get(ctx, k) ?? ""));
  // escaped vars
  html = html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, k: string) => escapeHtml(get(ctx, k) ?? ""));
  return html;
}

export function defaultReceiptTemplate(): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Recibo {{receipt.number}} — Way Home</title>
<style>{{__styles}}</style></head><body>
<div class="r-page">
  <header class="r-head">
    <div class="r-brand">
      <img src="{{{brand.logoUrl}}}" alt="Way Home" class="r-logo"/>
      <p class="r-tagline">Hospedagem oficial · Tomorrowland Brasil</p>
    </div>
    <div class="r-num">
      <span class="r-num-label">Recibo</span>
      <strong class="r-num-value">Nº {{receipt.number}}</strong>
      <span class="r-num-meta">Emitido em {{receipt.issued_at}}</span>
      <span class="r-num-paid">Pagamento confirmado</span>
    </div>
  </header>

  <section class="r-grid">
    <div class="r-card r-cust">
      <h2 class="r-section-title">Cliente</h2>
      <p class="r-cust-name">{{customer.name}}</p>
      <p class="r-cust-line">{{customer.email}}</p>
      <p class="r-cust-line">{{customer.phone}}</p>
    </div>
    <div class="r-card r-payinfo">
      <h2 class="r-section-title">Pagamento</h2>
      <p class="r-cust-line"><span>Confirmado em</span> <strong>{{order.paid_at}}</strong></p>
      <p class="r-cust-line"><span>Forma</span> <strong>{{order.payment_provider}}</strong></p>
      <p class="r-cust-line"><span>Moeda</span> <strong>{{order.currency}}</strong></p>
    </div>
  </section>

  <section class="r-card r-items-wrap">
    <h2 class="r-section-title">Itens da reserva</h2>
    <table class="r-items">
      <thead><tr><th>Descrição</th><th class="r-num-cell">Qtd</th><th class="r-num-cell">Unitário</th><th class="r-num-cell">Total</th></tr></thead>
      <tbody>
        {{#each items}}
          <tr><td>{{this.description}}</td><td class="r-num-cell">{{this.quantity}}</td><td class="r-num-cell">{{this.unit_price}}</td><td class="r-num-cell">{{this.total}}</td></tr>
        {{/each}}
      </tbody>
    </table>
    <div class="r-total">
      <span class="r-total-label">Total pago</span>
      <span class="r-total-value">{{order.currency}} {{order.total}}</span>
    </div>
  </section>

  <section class="r-verify">
    <div class="r-verify-qr">
      {{{receipt.qr_svg}}}
    </div>
    <div class="r-verify-body">
      <h2 class="r-section-title">Autenticidade</h2>
      <p class="r-verify-text">Escaneie o QR Code para verificar este recibo no site oficial da Way Home. Toda alteração invalida o hash de verificação abaixo.</p>
      <p class="r-verify-url">{{receipt.verify_url}}</p>
      <p class="r-hash"><span>Hash de verificação</span> <code>{{receipt.verification_hash}}</code></p>
    </div>
  </section>

  <section class="r-checkin">
    <h2 class="r-section-title">Validações no evento</h2>
    <p class="r-checkin-intro">
      Apresente cada QR Code abaixo à equipe Way Home. <strong>Cada código é válido para 1 única validação</strong> — após o uso, é desativado automaticamente.
    </p>
    <div class="r-checkin-grid">
      <div class="r-checkin-card">
        <div class="r-checkin-qr">{{{checkin.qr_bus_svg}}}</div>
        <div class="r-checkin-meta">
          <span class="r-checkin-badge r-checkin-badge-bus">1 · Embarque</span>
          <strong class="r-checkin-title">Ônibus</strong>
          <p class="r-checkin-text">Apresente este QR Code ao embarcar no ônibus de ida. Uso único.</p>
        </div>
      </div>
      <div class="r-checkin-card">
        <div class="r-checkin-qr">{{{checkin.qr_lodging_svg}}}</div>
        <div class="r-checkin-meta">
          <span class="r-checkin-badge r-checkin-badge-lodging">2 · Hospedagem</span>
          <strong class="r-checkin-title">Check-in do quarto</strong>
          <p class="r-checkin-text">Apresente este QR Code ao chegar na hospedagem para liberar seu quarto. Uso único.</p>
        </div>
      </div>
    </div>
  </section>

  <footer class="r-foot">
    <p>Way Home · Hospedagem oficial Tomorrowland Brasil. Este recibo é gerado eletronicamente e dispensa assinatura. Em caso de dúvidas, fale com a equipe pelo site oficial.</p>
  </footer>
</div>
</body></html>`;
}

export function defaultReceiptStyles(): string {
  return `:root{--wh-brand:#FF195E;--wh-brand-2:#7A0030;--wh-ink:#0B0B12;--wh-ink-2:#3A3A45;--wh-muted:#6B6B78;--wh-line:#E8E8EE;--wh-bg:#F4F5F9;--wh-card:#FFFFFF}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:'Barlow','Helvetica Neue',Arial,sans-serif;color:var(--wh-ink);background:var(--wh-bg);-webkit-font-smoothing:antialiased;line-height:1.5}
.r-page{max-width:820px;margin:32px auto;background:var(--wh-card);border-radius:18px;overflow:hidden;box-shadow:0 24px 60px -28px rgba(11,11,18,.25),0 2px 0 rgba(11,11,18,.04)}
.r-head{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding:32px 40px 24px;background:linear-gradient(180deg,#fff 0%,#fff 60%,#fafafd 100%);border-bottom:1px solid var(--wh-line);position:relative}
.r-head::after{content:"";position:absolute;left:40px;right:40px;bottom:-1px;height:3px;background:linear-gradient(90deg,var(--wh-brand) 0%,var(--wh-brand-2) 100%);border-radius:3px}
.r-brand{display:flex;flex-direction:column;gap:8px;max-width:60%}
.r-logo{height:54px;width:auto;display:block}
.r-tagline{margin:0;color:var(--wh-muted);font-size:12px;letter-spacing:.04em;text-transform:uppercase;font-weight:600}
.r-num{display:flex;flex-direction:column;align-items:flex-end;text-align:right;gap:4px}
.r-num-label{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--wh-muted);font-weight:700}
.r-num-value{font-size:18px;color:var(--wh-ink);font-weight:800;letter-spacing:.01em}
.r-num-meta{font-size:12px;color:var(--wh-muted)}
.r-num-paid{margin-top:6px;display:inline-block;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#0E7C3A;background:#E6F6EC;border:1px solid #BFE9CD;border-radius:999px;padding:4px 10px}
.r-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:24px 40px 0}
.r-card{background:var(--wh-card);border:1px solid var(--wh-line);border-radius:12px;padding:18px 20px}
.r-section-title{margin:0 0 10px;font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:var(--wh-muted);font-weight:800}
.r-cust-name{margin:0 0 4px;font-size:16px;font-weight:700;color:var(--wh-ink)}
.r-cust-line{margin:2px 0;font-size:13px;color:var(--wh-ink-2);display:flex;justify-content:space-between;gap:12px}
.r-cust-line span{color:var(--wh-muted)}
.r-items-wrap{margin:24px 40px 0}
.r-items{width:100%;border-collapse:collapse;margin-top:8px}
.r-items th,.r-items td{padding:12px 10px;font-size:13px;border-bottom:1px solid var(--wh-line);text-align:left;vertical-align:top}
.r-items th{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--wh-muted);background:transparent;border-bottom:2px solid var(--wh-ink);font-weight:800}
.r-num-cell{text-align:right;font-variant-numeric:tabular-nums}
.r-total{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding:16px 18px;background:var(--wh-ink);color:#fff;border-radius:12px}
.r-total-label{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#C9C9D6;font-weight:700}
.r-total-value{font-size:22px;font-weight:800;letter-spacing:.01em;color:#fff}
.r-verify{display:grid;grid-template-columns:140px 1fr;gap:20px;margin:24px 40px 0;padding:18px 20px;border:1px dashed var(--wh-line);border-radius:12px;background:#FAFAFD;align-items:center}
.r-verify-qr{background:#fff;border:1px solid var(--wh-line);border-radius:10px;padding:8px;width:140px;height:140px;display:flex;align-items:center;justify-content:center}
.r-verify-qr svg{width:100%;height:100%;display:block}
.r-verify-body .r-section-title{margin-bottom:6px}
.r-verify-text{margin:0 0 8px;font-size:13px;color:var(--wh-ink-2)}
.r-verify-url{margin:0 0 8px;font-size:12px;color:var(--wh-brand);font-weight:700;word-break:break-all}
.r-hash{margin:0;font-size:11px;color:var(--wh-muted);display:flex;flex-direction:column;gap:2px}
.r-hash code{font-family:'JetBrains Mono','Menlo',monospace;font-size:11px;color:var(--wh-ink-2);word-break:break-all}
.r-foot{margin:24px 40px 32px 40px;padding-top:16px;border-top:1px solid var(--wh-line);font-size:11px;color:var(--wh-muted);text-align:center}
.r-checkin{margin:24px 40px 0;padding:18px 20px;border:1px solid var(--wh-line);border-radius:12px;background:#fff}
.r-checkin-intro{margin:6px 0 14px;font-size:13px;color:var(--wh-ink-2)}
.r-checkin-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.r-checkin-card{display:grid;grid-template-columns:140px 1fr;gap:14px;align-items:center;padding:14px;border:1px dashed var(--wh-line);border-radius:10px;background:#FAFAFD}
.r-checkin-qr{background:#fff;border:1px solid var(--wh-line);border-radius:10px;padding:6px;width:140px;height:140px;display:flex;align-items:center;justify-content:center}
.r-checkin-qr svg{width:100%;height:100%;display:block}
.r-checkin-meta{display:flex;flex-direction:column;gap:4px}
.r-checkin-badge{align-self:flex-start;display:inline-block;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-radius:999px}
.r-checkin-badge-bus{background:#FFF4E6;color:#B05A00;border:1px solid #FCD9A8}
.r-checkin-badge-lodging{background:#E8F1FF;color:#0A4DA8;border:1px solid #BFD8FB}
.r-checkin-title{font-size:16px;color:var(--wh-ink);font-weight:800}
.r-checkin-text{margin:2px 0 0;font-size:12px;color:var(--wh-ink-2);line-height:1.45}
@media (max-width:640px){.r-head{flex-direction:column;padding:24px}.r-num{align-items:flex-start;text-align:left}.r-grid,.r-items-wrap,.r-verify,.r-checkin,.r-foot{margin-left:24px;margin-right:24px}.r-grid{grid-template-columns:1fr;padding:16px 0 0}.r-verify{grid-template-columns:1fr;text-align:center}.r-verify-qr{margin:0 auto}.r-checkin-grid{grid-template-columns:1fr}.r-checkin-card{grid-template-columns:1fr;text-align:center}.r-checkin-qr{margin:0 auto}.r-checkin-badge{align-self:center}}
@media print{body{background:#fff}.r-page{margin:0;box-shadow:none;border-radius:0}}`;
}

function fmtMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format((cents ?? 0) / 100);
}
function fmtDate(d?: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR");
}

function nextReceiptNumber(): string {
  const y = new Date().getFullYear();
  const seq = randomUUID().split("-")[0].toUpperCase();
  return `WH-${y}-${seq}`;
}

async function buildReceiptCtx(opts: {
  order: any;
  items: any[];
  receipt: { number: string; verification_hash: string; issued_at?: string };
  origin: string;
  css: string;
}) {
  const { order, items, receipt, origin, css } = opts;
  // Logo escuro do branding (slot "receipt", default = slogan-black).
  let logoVariants: any = undefined;
  let logoCustomUrls: any = undefined;
  try {
    const { data } = await supabaseAdmin
      .from("site_settings").select("value").eq("key", "branding").maybeSingle();
    const v = (data?.value as any) ?? {};
    logoVariants = v.logos;
    logoCustomUrls = v.logosCustomUrl;
  } catch {/* usa default */}
  const logoPath = resolveLogoUrl("receipt", logoVariants, logoCustomUrls);
  const logoUrl = logoPath.startsWith("http") ? logoPath : `${origin}${logoPath}`;

  const verify_url = `${origin}/recibo/${receipt.number}`;
  let qr_svg = "";
  try {
    qr_svg = await QRCode.toString(verify_url, {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "M",
      color: { dark: "#0B0B12", light: "#FFFFFF" },
    });
    // Remove eventual declaração XML para inserir limpo dentro do HTML.
    qr_svg = qr_svg.replace(/<\?xml[^>]*\?>\s*/i, "");
  } catch {/* sem QR se falhar */}

  // 2 QR codes estáticos para validações no evento: ônibus e check-in do quarto.
  // Cada um é válido para 1 única validação (server enforce em validateCheckin).
  const checkinToken = (order as any).checkin_token as string | null;
  const buildStageQr = async (stage: "bus" | "lodging") => {
    if (!checkinToken) return "";
    try {
      const url = `${origin}/admin/checkin?ci=${encodeURIComponent(checkinToken)}&stage=${stage}`;
      const svg = await QRCode.toString(url, {
        type: "svg",
        margin: 0,
        errorCorrectionLevel: "M",
        color: { dark: "#0B0B12", light: "#FFFFFF" },
      });
      return svg.replace(/<\?xml[^>]*\?>\s*/i, "");
    } catch {
      return "";
    }
  };
  const [qr_bus_svg, qr_lodging_svg] = await Promise.all([
    buildStageQr("bus"),
    buildStageQr("lodging"),
  ]);

  return {
    __styles: css,
    brand: { logoUrl, name: "Way Home", tagline: "Hospedagem Tomorrowland Brasil" },
    receipt: {
      number: receipt.number,
      issued_at: receipt.issued_at ?? fmtDate(new Date().toISOString()),
      verification_hash: receipt.verification_hash,
      verify_url,
      qr_svg,
    },
    checkin: {
      qr_bus_svg,
      qr_lodging_svg,
    },
    customer: {
      name: (order.metadata as any)?.customer_name ?? "—",
      email: order.customer_email,
      phone: (order.metadata as any)?.customer_phone ?? "",
    },
    order: {
      total: fmtMoney(order.total_cents, order.currency),
      currency: order.currency,
      paid_at: fmtDate(order.paid_at),
      payment_provider: order.payment_provider ?? "—",
    },
    items: (items ?? []).map((it: any) => ({
      description: it.description,
      quantity: it.quantity,
      unit_price: fmtMoney(it.unit_price_cents, order.currency),
      total: fmtMoney(it.total_cents, order.currency),
    })),
  };
}

export async function generateReceiptForOrder(orderId: string, origin: string) {
  const { data: existing } = await supabaseAdmin.from("receipts").select("*").eq("order_id", orderId).maybeSingle();
  if (existing) return existing;

  const { data: order, error: oErr } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).single();
  if (oErr || !order) throw new Error(`Pedido não encontrado: ${oErr?.message}`);
  const { data: items } = await supabaseAdmin.from("order_items").select("*").eq("order_id", orderId);

  const { data: tpl } = await supabaseAdmin.from("receipt_templates").select("*").eq("is_default", true).maybeSingle();
  const html = tpl?.html_template ?? defaultReceiptTemplate();
  const css = tpl?.css_styles ?? defaultReceiptStyles();

  const number = nextReceiptNumber();
  const verification_hash = createHash("sha256")
    .update(`${order.id}|${number}|${order.total_cents}|${order.paid_at ?? ""}`).digest("hex").slice(0, 32);

  const ctx = await buildReceiptCtx({
    order, items: items ?? [], receipt: { number, verification_hash }, origin, css,
  });

  const html_snapshot = renderTemplate(html, ctx);

  const { data: receipt, error: rErr } = await supabaseAdmin.from("receipts").insert({
    order_id: orderId,
    template_id: tpl?.id ?? null,
    number,
    html_snapshot,
    verification_hash,
  } as any).select().single();
  if (rErr) throw new Error(`Falha ao salvar recibo: ${rErr.message}`);
  return receipt;
}

/**
 * Re-renderiza um recibo existente usando o template/CSS ATUAIS do projeto.
 * Usado pelo viewer público para que recibos antigos exibam o visual mais novo
 * sem precisar mexer no html_snapshot arquivado.
 */
export async function renderReceiptByNumber(number: string, origin: string): Promise<string | null> {
  // Visualização pública: lê o snapshot via cliente admin (RLS não tem
  // policy pública por número — acesso é controlado pela URL não-enumerável).
  const { data: receipt } = await supabaseAdmin
    .from("receipts").select("html_snapshot").eq("number", number).maybeSingle();
  if (!receipt) return null;
  return receipt.html_snapshot ?? null;
}