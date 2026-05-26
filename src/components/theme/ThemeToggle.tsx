import * as React from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type ThemeChoice } from "./ThemeProvider";

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Claro", Icon: Sun },
  { value: "dark", label: "Escuro", Icon: Moon },
  { value: "system", label: "Sistema", Icon: Monitor },
];

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, resolved, setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  // Mount gate: avoid SSR/client icon mismatch (Sun vs Moon).
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  // Before mount, render a stable icon that matches SSR output.
  const Active = !mounted ? Moon : resolved === "light" ? Sun : Moon;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-label="Alternar tema"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-accent transition-colors cursor-pointer"
      >
        <Active size={16} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-40 rounded-lg border border-border bg-popover shadow-lg overflow-hidden z-50 animate-fade-in"
        >
          {OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={theme === value}
              onClick={() => {
                setTheme(value);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors cursor-pointer ${
                theme === value ? "font-semibold text-brand" : ""
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}