import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle, Instagram } from "lucide-react";
import { Footer } from "@/components/wh/Footer";
import { Header } from "@/components/wh/Header";
import { useT } from "@/components/i18n/LocaleProvider";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato — Way Home" },
      { name: "description", content: "Fale com a Way Home: WhatsApp, e-mail, Instagram e formulário direto." },
      { property: "og:title", content: "Contato — Way Home" },
      { property: "og:description", content: "Fale com a Way Home." },
      { property: "og:url", content: "/contato" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/contato" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const t = useT();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="container-wh py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16 items-start">
          <header className="lg:col-span-5 lg:sticky lg:top-28">
            <p className="text-xs font-bold uppercase tracking-widest text-brand">{t("contact.tagline")}</p>
            <h1 className="mt-3 font-display text-5xl md:text-6xl font-black leading-[1.05]">
              {t("contact.title1")}<br /><span className="text-brand">{t("contact.title2")}</span>
            </h1>
            <p className="mt-5 max-w-md text-ink-soft">{t("contact.subtitle")}</p>
          </header>

          <div className="lg:col-span-7 grid gap-4 sm:grid-cols-2">
            <a
              href="https://wa.me/5511992012731?text=Ol%C3%A1%21%20Gostaria%20de%20mais%20informa%C3%A7%C3%B5es%20sobre%20os%20pacotes%20Way%20Home."
              target="_blank"
              rel="noopener noreferrer"
              className="group sm:col-span-2 relative overflow-hidden rounded-2xl border border-line bg-card p-6 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-[0_20px_60px_-30px_oklch(from_var(--brand)_l_c_h/0.6)]"
            >
              <div className="flex items-start gap-5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-brand-foreground">
                  <MessageCircle size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">WhatsApp</p>
                  <p className="mt-1 font-display text-xl font-bold">{t("contact.channels.whatsapp")}</p>
                  <p className="mt-1 text-sm text-ink-soft">{t("contact.channels.whatsappDesc")}</p>
                </div>
              </div>
            </a>

            <a
              href="mailto:wayhomeoficial@gmail.com"
              className="group relative overflow-hidden rounded-2xl border border-line bg-card p-6 transition hover:-translate-y-0.5 hover:border-brand"
            >
              <div className="flex flex-col gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-brand-foreground">
                  <Mail size={22} />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">E-mail</p>
                  <p className="mt-1 break-all font-display text-lg font-bold">wayhomeoficial@gmail.com</p>
                  <p className="mt-1 text-sm text-ink-soft">{t("contact.channels.emailDesc")}</p>
                </div>
              </div>
            </a>

            <a
              href="https://www.instagram.com/wayhomeoficial/"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-2xl border border-line bg-card p-6 transition hover:-translate-y-0.5 hover:border-brand"
            >
              <div className="flex flex-col gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand/10 text-brand transition group-hover:bg-brand group-hover:text-brand-foreground">
                  <Instagram size={22} />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-soft">Instagram</p>
                  <p className="mt-1 font-display text-lg font-bold">@wayhomeoficial</p>
                  <p className="mt-1 text-sm text-ink-soft">{t("contact.channels.instagramDesc")}</p>
                </div>
              </div>
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}