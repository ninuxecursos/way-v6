import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { Header } from "@/components/wh/Header";
import { useT } from "@/components/i18n/LocaleProvider";

export const Route = createFileRoute("/checkout/pendente")({
  head: () => ({ meta: [{ title: "Pagamento pendente — Way Home" }, { name: "robots", content: "noindex" }] }),
  component: CheckoutPendingPage,
});

function CheckoutPendingPage() {
  const t = useT();
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center p-6 pt-28 md:pt-32">
        <div className="text-center max-w-md">
        <Clock className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
        <h1 className="text-3xl font-bold mb-2">{t("checkoutStatus.pendingTitle")}</h1>
        <p className="text-muted-foreground mb-6">{t("checkoutStatus.pendingDesc")}</p>
        <Link to="/" className="text-primary hover:underline">{t("common.backToSite")}</Link>
        </div>
      </div>
    </div>
  );
}