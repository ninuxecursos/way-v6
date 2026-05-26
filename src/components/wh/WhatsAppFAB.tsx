/**
 * Botão flutuante (Floating Action Button) para contato via WhatsApp.
 * Fica fixo no canto inferior da tela.
 */
import { MessageCircle } from "lucide-react";

export function WhatsAppFAB() {
  const phone = "5511992012731";
  const message = "Olá! Gostaria de mais informações sobre os pacotes Way Home.";
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fale conosco no WhatsApp"
      className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-brand text-brand-foreground shadow-[0_15px_40px_-10px_color-mix(in_oklab,var(--brand)_70%,transparent)] transition hover:scale-110 md:bottom-8 md:right-8"
    >
      <MessageCircle size={24} />
    </a>
  );
}
