import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Logo } from "@/components/branding/Logo";

type Props = {
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

const TAGS = ["Hospedagem", "Conforto", "Festival", "Tomorrowland", "2025"];

export function AuthShell({ title, subtitle, footer, children }: Props) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col md:flex-row">
      <aside className="relative md:w-2/5 lg:w-[42%] overflow-hidden bg-gradient-to-br from-[#0a0a0a] via-[#15030c] to-[#0a0a0a] text-white flex md:flex-col md:items-center md:justify-center px-6 py-8 md:p-12">
        <div className="absolute inset-0 pointer-events-none opacity-60"
          style={{ background: "radial-gradient(70% 50% at 80% 20%, rgba(255,25,94,0.18), transparent 60%), radial-gradient(60% 40% at 10% 90%, rgba(255,25,94,0.12), transparent 60%)" }} />
        {/* Mobile: logo at top */}
        <div className="relative z-10 w-full md:hidden">
          <Link to="/" className="inline-flex items-center" aria-label="Way Home">
            <Logo slot="auth" height={44} />
          </Link>
        </div>
        {/* Desktop: centered block */}
        <div className="relative z-10 hidden md:flex flex-col items-center text-center w-full max-w-md mx-auto animate-fade-in">
          <Link to="/" className="inline-flex items-center" aria-label="Way Home">
            <Logo slot="auth" height={88} />
          </Link>
          <h2 className="mt-10 font-display text-4xl lg:text-5xl font-black leading-[1.05] text-white">
            Sua casa<br/>
            <span className="text-brand">no Tomorrowland</span><br/>
            Brasil 2025.
          </h2>
          <p className="mt-6 text-base text-white/70 leading-relaxed">
            &nbsp;
          </p>
          <div className="mt-8 flex flex-wrap gap-2 justify-center">
            {TAGS.map((t) => (
              <span key={t} className="text-xs uppercase tracking-widest text-white/50 border border-white/10 rounded-full px-3 py-1">{t}</span>
            ))}
          </div>
        </div>
      </aside>
      <main className="relative flex-1 flex items-center justify-center px-5 py-10 md:py-16 bg-background">
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
          >
            <ArrowLeft size={14} /> Voltar ao site
          </Link>
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {children}
          {footer && <div className="mt-6 text-sm text-muted-foreground text-center">{footer}</div>}
        </div>
      </main>
    </div>
  );
}