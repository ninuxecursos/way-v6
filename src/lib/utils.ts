/**
 * Utilitários gerais do projeto.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina classes CSS utilizando clsx e tailwind-merge para evitar conflitos de classes Tailwind.
 * @param inputs - Lista de classes, objetos ou condicionais.
 * @returns Uma string de classes otimizada.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
