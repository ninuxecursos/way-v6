/**
 * Máscara de telefone/WhatsApp internacional.
 * - Sempre começa com "+" seguido do DDI.
 * - Para BR (+55): formata como "+55 (11) 99999-9999".
 * - Para outros países: agrupa dígitos em blocos legíveis "+DDI XXX XXX XXXX".
 * - Aceita colagem com espaços, parênteses, traços — normaliza para dígitos.
 */

const MAX_DIGITS = 15; // E.164 máximo

function onlyDigits(v: string): string {
  return v.replace(/\D+/g, "");
}

function formatBR(digits: string): string {
  // digits começa com 55
  const rest = digits.slice(2);
  const ddd = rest.slice(0, 2);
  const part1 = rest.slice(2, 7);
  const part2 = rest.slice(7, 11);
  let out = "+55";
  if (ddd) out += ` (${ddd}`;
  if (ddd.length === 2) out += ")";
  if (part1) out += ` ${part1}`;
  if (part2) out += `-${part2}`;
  return out;
}

function formatGeneric(digits: string): string {
  // Heurística: DDI 1-3 dígitos + grupos de 3-4
  if (!digits) return "";
  // Tenta DDIs comuns
  const knownDDI: Record<string, number> = { "1": 1, "7": 1 };
  let ddiLen = 0;
  for (const len of [1, 2, 3]) {
    const candidate = digits.slice(0, len);
    if (knownDDI[candidate] === len || (len <= digits.length && len === 2)) {
      ddiLen = len;
      break;
    }
  }
  if (!ddiLen) ddiLen = Math.min(2, digits.length);
  const ddi = digits.slice(0, ddiLen);
  const rest = digits.slice(ddiLen);
  const groups: string[] = [];
  // Agrupa: 3,3,4 (estilo internacional)
  let i = 0;
  const sizes = [3, 3, 4, 4];
  for (const s of sizes) {
    if (i >= rest.length) break;
    groups.push(rest.slice(i, i + s));
    i += s;
  }
  if (i < rest.length) groups.push(rest.slice(i));
  return `+${ddi}${groups.length ? " " + groups.join(" ") : ""}`;
}

/** Aplica a máscara de WhatsApp ao input (preserva foco/caret de forma simples). */
export function maskWhatsApp(value: string): string {
  let digits = onlyDigits(value);
  if (!digits) return "";
  digits = digits.slice(0, MAX_DIGITS);
  if (digits.startsWith("55")) return formatBR(digits);
  return formatGeneric(digits);
}

/** Retorna apenas os dígitos com prefixo "+", para salvar no banco em E.164. */
export function toE164(value: string): string {
  const d = onlyDigits(value).slice(0, MAX_DIGITS);
  return d ? `+${d}` : "";
}

/**
 * Trata edição em input mascarado de telefone.
 *
 * Quando o usuário pressiona Backspace/Delete sobre um caractere de
 * formatação (`+`, `(`, `)`, espaço, `-`), o `onChange` recebe um valor
 * cuja contagem de dígitos NÃO mudou. Sem tratamento, a máscara é
 * reaplicada e nada parece apagar. Aqui detectamos esse caso e removemos
 * 1 dígito (o último), espelhando o comportamento esperado de um input
 * comum.
 *
 * Retorna o valor E.164 (`+<digits>`) pronto para salvar no estado.
 */
export function handlePhoneInputChange(rawInput: string, prevValue: string): string {
  const newDigits = onlyDigits(rawInput);
  const prevDigits = onlyDigits(prevValue);
  const prevMasked = prevDigits ? maskWhatsApp(prevDigits) : "";
  // Usuário tentou apagar (input ficou mais curto) mas a contagem de
  // dígitos não mudou → apagou um caractere de formatação. Remove 1 dígito.
  if (rawInput.length < prevMasked.length && newDigits.length === prevDigits.length) {
    const trimmed = newDigits.slice(0, -1);
    return trimmed ? `+${trimmed}` : "";
  }
  return newDigits ? `+${newDigits.slice(0, MAX_DIGITS)}` : "";
}