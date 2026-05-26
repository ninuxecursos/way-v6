/**
 * CPF utilities — máscara visual e validação dos dígitos verificadores.
 */

export function onlyDigits(v: string): string {
  return (v ?? "").replace(/\D+/g, "");
}

/** Aplica máscara progressiva 000.000.000-00. */
export function maskCPF(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  const p1 = d.slice(0, 3);
  const p2 = d.slice(3, 6);
  const p3 = d.slice(6, 9);
  const p4 = d.slice(9, 11);
  let out = p1;
  if (p2) out += `.${p2}`;
  if (p3) out += `.${p3}`;
  if (p4) out += `-${p4}`;
  return out;
}

/** Valida dígitos verificadores do CPF. */
export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calc = (factor: number, len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += parseInt(cpf.charAt(i), 10) * (factor - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const d1 = calc(10, 9);
  if (d1 !== parseInt(cpf.charAt(9), 10)) return false;
  const d2 = calc(11, 10);
  if (d2 !== parseInt(cpf.charAt(10), 10)) return false;
  return true;
}