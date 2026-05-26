import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";
import { Header } from "@/components/wh/Header";
import { useT } from "@/components/i18n/LocaleProvider";

export const Route = createFileRoute("/checkout/falha")({
  head: () => ({ meta: [{ title: "Pagamento não concluído — Way Home" }, { name: "robots", content: "noindex" }] }),
  component: CheckoutFailedPage,
});

function CheckoutFailedPage() {
  const t = useT();
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center p-6 pt-28 md:pt-32">
        <div className="text-center max-w-md">
        <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
        <h1 className="text-3xl font-bold mb-2">{t("checkoutStatus.failedTitle")}</h1>
        <p className="text-muted-foreground mb-6">{t("checkoutStatus.failedDesc")}</p>
        <Link to="/" className="text-primary hover:underline">{t("common.backToSite")}</Link>
        </div>
      </div>
    </div>
  );
}