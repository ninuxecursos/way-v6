// Configuração global do TanStack Start.
// - functionMiddleware: `attachSupabaseAuth` injeta `Authorization: Bearer`
//   em toda chamada de createServerFn no browser.
// - requestMiddleware: `securityHeaders` adiciona headers de segurança
//   (HSTS, CSP, X-Frame-Options, etc.) em TODA resposta HTTP do servidor.
import { createStart, createMiddleware } from '@tanstack/react-start';
import { setResponseHeaders } from '@tanstack/react-start/server';
import { attachSupabaseAuth } from '@/integrations/supabase/auth-attacher';

// CSP em modo Report-Only para o primeiro deploy. Promover para
// `Content-Security-Policy` (sem `-Report-Only`) depois de validar
// que nenhum recurso legítimo está sendo bloqueado.
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self' https://*.mercadopago.com https://*.mercadopago.com.br",
  // 'unsafe-inline' em script-src é exigido pelo SSR hydration do TanStack
  // (scripts inline com state). Mitigamos com strict-dynamic + nonce no futuro.
  "script-src 'self' 'unsafe-inline' https://sdk.mercadopago.com https://*.mercadopago.com https://www.googletagmanager.com https://www.google-analytics.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https: ",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mercadopago.com https://*.mercadopago.com https://www.google-analytics.com",
  "frame-src 'self' https://*.mercadopago.com https://sdk.mercadopago.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = createMiddleware().server(async ({ next }) => {
  const result = await next();
  setResponseHeaders(new Headers({
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self "https://*.mercadopago.com"), interest-cohort=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-site',
    'X-DNS-Prefetch-Control': 'off',
    'Content-Security-Policy-Report-Only': CSP,
  }));
  return result;
});

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeaders],
  functionMiddleware: [attachSupabaseAuth],
}));