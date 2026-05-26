import { Button } from "@/components/ui/button";
import { Download, ExternalLink, MessageCircle } from "lucide-react";

type Props = {
  number: string;
  customerPhone?: string | null;
  customerName?: string | null;
  size?: "sm" | "default";
  variant?: "inline" | "stacked";
};

/** Sanitiza telefone para WhatsApp (apenas dígitos). Garante DDI BR se faltar. */
function normalizePhone(p?: string | null): string | null {
  if (!p) return null;
  const digits = p.replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.length <= 11) return `55${digits}`;
  return digits;
}

export function ReceiptActions({ number, customerPhone, customerName, size = "sm", variant = "inline" }: Props) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const viewUrl = `/recibo/${number}`;
  const pdfUrl = `/recibo/${number}?autoprint=1`;

  const shareWhatsApp = () => {
    const fullUrl = `${origin}${viewUrl}`;
    const greet = customerName ? `Olá, ${customerName}! ` : "Olá! ";
    const msg = `${greet}Segue o seu recibo Way Home Nº ${number}:\n${fullUrl}\n\nPara baixar em PDF, abra o link e clique em "Baixar PDF".`;
    const phone = normalizePhone(customerPhone);
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const cls = variant === "stacked" ? "flex flex-col gap-2" : "flex flex-wrap gap-2 items-center";
  return (
    <div className={cls}>
      <Button asChild size={size} variant="outline">
        <a href={viewUrl} target="_blank" rel="noreferrer">
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Visualizar
        </a>
      </Button>
      <Button asChild size={size} variant="outline">
        <a href={pdfUrl} target="_blank" rel="noreferrer">
          <Download className="h-3.5 w-3.5 mr-1.5" /> Baixar PDF
        </a>
      </Button>
      <Button size={size} onClick={shareWhatsApp} className="bg-[#25D366] text-white hover:bg-[#1faa53]">
        <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> WhatsApp
      </Button>
    </div>
  );
}