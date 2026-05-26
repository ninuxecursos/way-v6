import { useState, useEffect } from "react";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, QrCode, Copy, CheckCircle2, AlertCircle, RefreshCw, FileText } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getActiveGatewayPublicConfig, processOnSitePayment, getPaymentStatus } from "@/lib/payments.functions";
import { formatBRL } from "@/lib/payment-fees";
import { notifySuccess, notifyError } from "@/lib/notify";

interface BricksCheckoutProps {
  orderId: string;
  amountCents: number;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  customerDocument?: string;
  method: "pix" | "credit_card" | "boleto";
}

export function BricksCheckout({
  orderId,
  amountCents,
  customerEmail,
  customerName,
  customerPhone,
  customerDocument,
  method,
}: BricksCheckoutProps) {
  const navigate = useNavigate();
  const processPaymentFn = useServerFn(processOnSitePayment);
  const getStatusFn = useServerFn(getPaymentStatus);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Carregar configuração pública do gateway
  const { data: gw, isLoading: loadingGw } = useQuery({
    queryKey: ["gateway-public-config"],
    queryFn: () => getActiveGatewayPublicConfig(),
  });

  useEffect(() => {
    if (gw?.publicKey) {
      initMercadoPago(gw.publicKey, { locale: "pt-BR" });
    }
  }, [gw?.publicKey]);

  // 2. Handler para pagamento via Cartão (Card Brick)
  const handleCardSubmit = async (formData: any) => {
    setProcessing(true);
    setError(null);
    try {
      const res = await processPaymentFn({
        data: {
          orderId,
          paymentMethod: "credit_card",
          token: formData.token,
          installments: formData.installments,
          paymentMethodId: formData.payment_method_id,
          issuerId: formData.issuer_id,
        },
      });

      if (res.status === "approved") {
        navigate({ to: "/reservation/success", search: { orderId } as any });
      } else {
        setPaymentResult(res);
        if (res.status === "rejected" || res.status === "cancelled") {
          setError(res.statusDetail ? `Pagamento recusado (${res.statusDetail})` : "Pagamento recusado.");
        }
      }
    } catch (e: any) {
      const msg = e?.message || e?.toString?.() || "Erro ao processar pagamento.";
      setError(msg);
      notifyError(e);
    } finally {
      setProcessing(false);
    }
  };

  // 3. Handler para gerar PIX / Boleto
  const generatePayment = async (type: "pix" | "boleto") => {
    setProcessing(true);
    setError(null);
    try {
      const res = await processPaymentFn({
        data: {
          orderId,
          paymentMethod: type,
        },
      });
      setPaymentResult(res);
    } catch (e: any) {
      setError(e.message || "Erro ao gerar pagamento.");
      notifyError(e);
    } finally {
      setProcessing(false);
    }
  };

  // 4. Polling para status do PIX
  useEffect(() => {
    let interval: any;
    if (paymentResult?.status === "pending" && method === "pix") {
      interval = setInterval(async () => {
        try {
          const res = await getStatusFn({ data: { paymentId: String(paymentResult.paymentId) } });
          if (res.status === "approved") {
            clearInterval(interval);
            navigate({ to: "/reservation/success", search: { orderId } as any });
          }
        } catch (e) {
          console.error("Polling error:", e);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [paymentResult?.status, paymentResult?.paymentId, method, orderId, getStatusFn, navigate]);

  if (loadingGw) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
        <p className="text-sm text-muted-foreground italic">Carregando ambiente seguro...</p>
      </div>
    );
  }

  if (!gw?.publicKey) {
    return (
      <div className="p-6 text-center border border-destructive/20 bg-destructive/5 rounded-xl">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p className="text-sm font-medium">Gateway de pagamento não configurado.</p>
        <p className="text-xs text-muted-foreground mt-1">Contate o administrador do sistema.</p>
      </div>
    );
  }

  // Se já temos um resultado pendente (PIX ou Boleto)
  if (paymentResult?.status === "pending") {
    if (method === "pix") {
      return (
        <Card className="p-6 text-center space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
            <QrCode className="h-8 w-8 text-emerald-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold">Pague com Pix</h3>
            <p className="text-xs text-muted-foreground">
              Escaneie o QR Code ou copie a chave abaixo. A confirmação é automática.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl inline-block shadow-sm border mx-auto">
            {paymentResult.qrCodeBase64 ? (
              <img src={`data:image/png;base64,${paymentResult.qrCodeBase64}`} alt="QR Code Pix" className="w-48 h-48" />
            ) : (
              <div className="w-48 h-48 bg-muted animate-pulse flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Input readOnly value={paymentResult.qrCode || ""} className="font-mono text-[10px] h-9" />
              <Button size="icon" variant="outline" onClick={() => {
                navigator.clipboard.writeText(paymentResult.qrCode);
                toast.success("Copiado!");
              }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-emerald-600 animate-pulse">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Aguardando confirmação...
            </div>
          </div>
        </Card>
      );
    }

    if (method === "boleto") {
      return (
        <Card className="p-6 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center">
            <FileText className="h-8 w-8 text-brand" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold">Boleto Gerado</h3>
            <p className="text-xs text-muted-foreground">
              O pagamento por boleto pode levar até 2 dias úteis para compensar.
            </p>
          </div>

          <div className="space-y-4">
            <Button className="w-full h-12 text-base font-bold" onClick={() => window.open(paymentResult.ticketUrl, "_blank")}>
              Imprimir Boleto
            </Button>
            <p className="text-[10px] text-muted-foreground">
              Você também receberá o link por e-mail após a confirmação.
            </p>
          </div>
        </Card>
      );
    }
  }

  // Cartão recusado ou outro erro
  if (paymentResult?.status && paymentResult.status !== "approved" && paymentResult.status !== "pending") {
    return (
      <Card className="p-6 text-center space-y-4 border-destructive/30 bg-destructive/5">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        <div className="space-y-1">
          <h3 className="font-bold text-destructive">Pagamento Recusado</h3>
          <p className="text-sm text-muted-foreground">
            {paymentResult.statusDetail === "cc_rejected_bad_filled_card_number" ? "Número do cartão inválido." : 
             paymentResult.statusDetail === "cc_rejected_insufficient_amount" ? "Saldo insuficiente." :
             paymentResult.statusDetail === "cc_rejected_call_for_authorize" ? "Autorize o pagamento com seu banco." :
             "Tente outro cartão ou método de pagamento."}
          </p>
        </div>
        <Button variant="outline" className="w-full" onClick={() => setPaymentResult(null)}>
          Tentar novamente
        </Button>
      </Card>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      {method === "credit_card" && (
        <div className="min-h-[400px]">
          <CardPayment
            key={`cc-${orderId}-${amountCents}`}
            initialization={{
              amount: amountCents / 100,
              payer: {
                email: customerEmail,
              },
            }}
            customization={{
              visual: {
                style: {
                  theme: "flat", // matches Way Home aesthetic
                },
              },
              paymentMethods: {
                maxInstallments: 12,
              },
            }}
            onSubmit={handleCardSubmit}
          />
          {processing && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-xl">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
            </div>
          )}
        </div>
      )}

      {method === "pix" && (
        <div className="py-8 text-center space-y-6">
          <div className="space-y-2">
            <h3 className="font-bold">Gerar código Pix</h3>
            <p className="text-sm text-muted-foreground">
              O valor de <strong>{formatBRL(amountCents)}</strong> será convertido em um QR Code único para sua reserva.
            </p>
          </div>
          <Button 
            className="w-full h-14 text-lg font-bold shadow-lg shadow-emerald-500/20" 
            size="lg"
            disabled={processing}
            onClick={() => generatePayment("pix")}
          >
            {processing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <QrCode className="h-5 w-5 mr-2" />}
            {processing ? "Gerando..." : "Gerar QR Code Pix"}
          </Button>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            Aprovação em segundos após o pagamento
          </div>
        </div>
      )}

      {method === "boleto" && (
        <div className="py-8 text-center space-y-6">
          <div className="space-y-2">
            <h3 className="font-bold">Pagamento via Boleto</h3>
            <p className="text-sm text-muted-foreground">
              O boleto tem validade de 3 dias. A confirmação da reserva ocorre após a compensação bancária.
            </p>
          </div>
          <Button 
            className="w-full h-14 text-lg font-bold" 
            variant="outline"
            size="lg"
            disabled={processing}
            onClick={() => generatePayment("boleto")}
          >
            {processing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <FileText className="h-5 w-5 mr-2" />}
            {processing ? "Gerando..." : "Gerar Boleto Bancário"}
          </Button>
        </div>
      )}

      {error && (
        <p className="text-xs text-center text-destructive font-medium mt-4 bg-destructive/10 p-2 rounded">
          {error}
        </p>
      )}
    </div>
  );
}
