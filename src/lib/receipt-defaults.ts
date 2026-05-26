// Defaults isomórficos (sem import de server-only) usados também no admin.
export const default_html = `<!doctype html><html><head><meta charset="utf-8"><title>Recibo {{receipt.number}}</title>
<style>{{__styles}}</style></head><body>
<header class="r-head">
  <div><h1>Way Home</h1><p>Hospedagem Tomorrowland Brasil</p></div>
  <div class="r-num"><strong>RECIBO Nº {{receipt.number}}</strong><br/>Emitido em {{receipt.issued_at}}</div>
</header>
<section class="r-cust">
  <h2>Cliente</h2>
  <p><strong>{{customer.name}}</strong><br/>{{customer.email}}<br/>{{customer.phone}}</p>
</section>
<table class="r-items">
  <thead><tr><th>Descrição</th><th>Qtd</th><th>Unitário</th><th>Total</th></tr></thead>
  <tbody>
    {{#each items}}
      <tr><td>{{this.description}}</td><td>{{this.quantity}}</td><td>{{this.unit_price}}</td><td>{{this.total}}</td></tr>
    {{/each}}
  </tbody>
</table>
<div class="r-total"><strong>TOTAL {{order.currency}} {{order.total}}</strong></div>
<footer class="r-foot">
  <p>Pagamento confirmado em {{order.paid_at}} · Forma: {{order.payment_provider}}</p>
  <p class="r-hash">Verificação: {{receipt.verification_hash}} · {{receipt.verify_url}}</p>
</footer>
</body></html>`;

export const default_css = `body{font-family:Arial,sans-serif;color:#222;max-width:780px;margin:40px auto;padding:24px}
.r-head{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:20px}
.r-head h1{margin:0;font-size:24px}
.r-num{text-align:right;font-size:13px}
.r-cust h2{font-size:14px;text-transform:uppercase;color:#666;margin:0 0 6px}
.r-items{width:100%;border-collapse:collapse;margin:24px 0}
.r-items th,.r-items td{border-bottom:1px solid #eee;padding:8px;text-align:left;font-size:14px}
.r-items th{background:#f7f7f7;text-transform:uppercase;font-size:11px;color:#666}
.r-total{text-align:right;font-size:18px;margin:16px 0;padding:12px;background:#f7f7f7}
.r-foot{font-size:12px;color:#666;border-top:1px solid #eee;padding-top:12px;margin-top:24px}
.r-hash{font-family:monospace;font-size:10px;color:#999;word-break:break-all}
@media print{body{margin:0;padding:16px}}`;