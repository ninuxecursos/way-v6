interface Props {
  current: number;
  total: number;
  label?: string;
}

export function QuizProgress({ current, total, label }: Props) {
  const pct = Math.min(100, Math.round((current / total) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>{label ?? "Cadastro"}</span>
        <span>
          {current} de {total}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand to-brand/70 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}