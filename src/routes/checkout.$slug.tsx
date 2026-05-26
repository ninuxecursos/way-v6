import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createCheckout } from "@/lib/checkout.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicErrorBoundary } from "@/components/errors/PublicErrorBoundary";
import { notifyError } from "@/lib/notify";
import { Header } from "@/components/wh/Header";

export const Route = createFileRoute("/checkout/$slug")({
  head: () => ({ meta: [{ title: "Finalizar compra — Way Home" }, { name: "robots", content: "noindex" }] }),
  component: CheckoutPage,
  errorComponent: ({ error, reset }) => (
    <PublicErrorBoundary error={error} reset={reset} title="Erro no checkout" />
  ),
});

function CheckoutPage() {
  const { slug } = Route.useParams();
  const checkoutFn = useServerFn(createCheckout);
  const [product, setProduct] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [productMissing, setProductMissing] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // fix(B3): tratar erro de carga do produto.
      try {
        const { data, error } = await supabase
          .from("products").select("*").eq("slug", slug).eq("active", true).maybeSingle();
        if (cancelled) return;
        if (error) throw error;
        if (!data) setProductMissing(true);
        else setProduct(data);
      } catch (e) {
        if (cancelled) return;
        console.error("[checkout/load]", e);
        setProductMissing(true);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (productMissing) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <p className="text-muted-foreground">Produto indisponível.</p>
    </div>
  );
  if (!product) return <div className="min-h-screen flex items-center justify-center">Carregando produto...</div>;

  const tr = (product.translations as any)?.pt ?? {};
  const total = (product.price_cents * qty) / 100;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await checkoutFn({
        data: {
          productSlug: slug, quantity: qty,
          customerEmail: email, customerName: name, customerPhone: phone || undefined,
          
        } as any,
      });
      // fix(B8): validar URL — antes uma URL vazia navegava para "" e travava o botão.
      if (!res?.checkoutUrl || typeof res.checkoutUrl !== "string") {
        throw new Error("URL de checkout não retornada pelo gateway.");
      }
      window.location.assign(res.checkoutUrl);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao iniciar checkout.");
      notifyError(err, "Erro ao iniciar checkout.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-28 md:pt-32 pb-12 px-4">
      <Header />
      <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-8">
        <div>
          {product.cover_image_url && <img src={product.cover_image_url} alt={tr.name} className="rounded-lg w-full mb-4" />}
          <h1 className="text-2xl font-bold mb-2">{tr.name}</h1>
          <p className="text-muted-foreground mb-4">{tr.description}</p>
          <div className="text-3xl font-bold">{product.currency} {(product.price_cents / 100).toFixed(2)}</div>
        </div>
        <form onSubmit={submit} className="bg-card border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold">Seus dados</h2>
          <div><Label>Nome completo</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>E-mail</Label><Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Telefone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><Label>Quantidade</Label><Input type="number" min={1} max={product.max_per_order ?? 10} value={qty} onChange={(e) => setQty(Number(e.target.value))} /></div>
          <div className="border-t pt-4 flex justify-between font-bold text-lg">
            <span>Total</span><span>{product.currency} {total.toFixed(2)}</span>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">{loading ? "Processando..." : "Pagar agora"}</Button>
          <p className="text-xs text-muted-foreground text-center">Você será redirecionado ao gateway de pagamento.</p>
        </form>
      </div>
    </div>
  );
}