export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Erro inesperado — Way Home</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #0b0d12; color: #e5e7eb; padding: 24px; }
  .card { max-width: 480px; text-align: center; }
  .icon { width: 64px; height: 64px; border-radius: 9999px; background: rgba(239,68,68,.15);
    display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; }
  .icon svg { width: 32px; height: 32px; color: #ef4444; }
  h1 { font-size: 24px; margin: 0 0 8px; font-weight: 700; }
  p { font-size: 14px; color: #9ca3af; margin: 0 0 24px; line-height: 1.5; }
  .actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  button, a.btn { font: inherit; cursor: pointer; padding: 10px 18px; border-radius: 8px;
    border: 1px solid transparent; text-decoration: none; font-size: 14px; font-weight: 500; }
  .primary { background: #6366f1; color: #fff; border-color: #6366f1; }
  .primary:hover { background: #4f46e5; }
  .secondary { background: transparent; color: #e5e7eb; border-color: #374151; }
  .secondary:hover { background: #1f2937; }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    </div>
    <h1>Algo deu errado</h1>
    <p>Ocorreu um erro inesperado ao processar sua solicitação. Tente novamente em alguns instantes.</p>
    <div class="actions">
      <button class="primary" onclick="location.reload()">Tentar novamente</button>
      <a class="btn secondary" href="/">Ir para o início</a>
    </div>
  </div>
</body>
</html>`;
}