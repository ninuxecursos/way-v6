/**
 * Menu fullscreen mobile estilo native app.
 * Animado com framer-motion, navegação grande + bloco de preferências.
 */
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowUpRight, MessageCircle, User } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/components/i18n/LocaleProvider";
import { LocaleSelector } from "@/components/i18n/LocaleSelector";
import { Logo } from "@/components/branding/Logo";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  items: { label: string; href: string }[];
}

export function MobileMenu({ open, onClose, items }: MobileMenuProps) {
  const { user } = useAuth();
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="mobile-menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] bg-[#0b0b0b] text-white md:hidden flex flex-col"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 h-16 shrink-0">
            <Link to="/" onClick={onClose} aria-label="Way Home">
              <Logo slot="headerDark" height={28} />
            </Link>
            <button
              onClick={onClose}
              aria-label={t("common.close")}
              className="grid h-11 w-11 place-items-center rounded-full bg-white/10 active:bg-white/20 transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="px-5 pt-4 pb-6"
          >
            <Link
              to={user ? "/conta" : "/login"}
              onClick={onClose}
              className="flex items-center gap-3 rounded-2xl bg-white/5 hover:bg-white/10 transition px-4 py-3.5"
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-brand text-brand-foreground">
                <User size={18} />
              </div>
              <div className="flex-1">
                <div className="text-[11px] uppercase tracking-wider text-white/50">
                  {user ? t("account.dashboard.hello") : t("auth.signupTitle")}
                </div>
                <div className="font-display text-base font-semibold">
                  {user ? t("header.myAccount") : t("header.signIn")}
                </div>
              </div>
              <ArrowUpRight size={18} className="text-white/60" />
            </Link>
          </motion.div>

          {/* Nav list */}
          <nav className="px-5 mt-2">
            {items.map((item, idx) => (
              <motion.a
                key={item.href}
                href={item.href}
                onClick={onClose}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + idx * 0.05 }}
                className="group flex items-baseline gap-4 border-b border-white/10 py-4 last:border-b-0 active:bg-white/5"
              >
                <span className="font-mono text-xs text-brand tabular-nums">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="font-display flex-1 text-2xl font-bold tracking-tight">
                  {item.label}
                </span>
                <ArrowUpRight size={18} className="text-white/40 transition group-hover:text-white" />
              </motion.a>
            ))}
          </nav>

          {/* Preferences */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="px-5 mt-8"
          >
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-3">
              {t("common.language")}
            </div>
            <LocaleSelector />
          </motion.div>
          {/* Spacer so sticky CTA doesn't cover content */}
          <div aria-hidden style={{ height: "calc(env(safe-area-inset-bottom) + 7rem)" }} />
          </div>

          {/* Sticky CTA */}
          <div
            className="shrink-0 px-5 pt-4 pb-6 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b] to-transparent"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
          >
            <Link
              to="/reservation"
              onClick={onClose}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-brand text-brand-foreground font-display font-bold uppercase tracking-wider text-sm shadow-[0_15px_40px_-10px_color-mix(in_oklab,var(--brand)_70%,transparent)]"
            >
              <MessageCircle size={18} />
              {t("header.ctaPackage")}
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
