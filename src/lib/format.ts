/**
 * Formata centavos como BRL (sem casas decimais por padrão).
 * Compartilhado entre admin, dashboard e área pública.
 */
export const fmtBRL = (cents: number, opts?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
    ...opts,
  }).format((cents || 0) / 100);