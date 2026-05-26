/**
 * Painel admin de moderação de avaliações (event_reviews).
 * Permite aprovar, rejeitar, destacar e remover avaliações.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Award, Check, X, Trash2, Pencil, Save } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MediaPicker } from "@/components/admin/MediaPicker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/reviews")({
  component: ReviewsModeration,
});

type Row = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  display_name: string | null;
  city: string | null;
  avatar_url: string | null;
  photos: string[] | null;
  video_url: string | null;
  status: string;
  featured: boolean;
  created_at: string;
  order_id: string | null;
  user_id: string | null;
  legacy?: boolean | null;
};

function ReviewsModeration() {
  const [rows, setRows] = useState<Row[]>([]);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("event_reviews")
      .select(
        "id,rating,title,comment,photos,video_url,status,featured,created_at,order_id,user_id,display_name,city,avatar_url,legacy",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (tab !== "all") q = q.eq("status", tab);
    const { data, error } = await q;
    if (error) notifyError(error);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  const update = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from("event_reviews").update(patch as never).eq("id", id);
    if (error) { notifyError(error); return; }
    notifySuccess("Atualizado");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover esta avaliação?")) return;
    const { error } = await supabase.from("event_reviews").delete().eq("id", id);
    if (error) { notifyError(error); return; }
    notifySuccess("Removida");
    load();
  };

  const [editing, setEditing] = useState<Row | null>(null);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Avaliações</h1>
        <p className="text-muted-foreground mt-1">Modere, edite e destaque as avaliações dos hóspedes.</p>
      </div>

      <div className="flex gap-2">
        {[
          { id: "pending", label: "Pendentes" },
          { id: "approved", label: "Aprovadas" },
          { id: "rejected", label: "Rejeitadas" },
          { id: "all", label: "Todas" },
        ].map((t) => (
          <Button key={t.id} size="sm" variant={tab === t.id ? "default" : "outline"} onClick={() => setTab(t.id as typeof tab)}>
            {t.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Lista</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Carregando…</div>
          ) : rows.length === 0 ? (
            <div className="text-muted-foreground text-sm">Nenhuma avaliação.</div>
          ) : (
            <div className="space-y-4">
              {rows.map((r) => (
                <div key={r.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={14} className={i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"} />
                          ))}
                        </div>
                        <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                          {r.status}
                        </Badge>
                        {r.featured && <Badge className="bg-brand text-brand-foreground"><Award size={12} className="mr-1" />Destaque</Badge>}
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("pt-BR")} — {r.display_name ?? "—"} {r.city ? `(${r.city})` : ""}
                        </span>
                      </div>
                      {r.title && <div className="font-semibold">{r.title}</div>}
                      {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                      {r.photos && r.photos.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {r.photos.map((p, i) => (
                            <img key={i} src={p} alt="" className="h-16 w-16 rounded object-cover" />
                          ))}
                        </div>
                      )}
                      {r.video_url && (
                        <a href={r.video_url} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline">Ver vídeo →</a>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {r.status !== "approved" && (
                        <Button size="sm" onClick={() => update(r.id, { status: "approved" })}><Check size={14} className="mr-1" />Aprovar</Button>
                      )}
                      {r.status !== "rejected" && (
                        <Button size="sm" variant="outline" onClick={() => update(r.id, { status: "rejected" })}><X size={14} className="mr-1" />Rejeitar</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => update(r.id, { featured: !r.featured })}>
                        <Award size={14} className="mr-1" />{r.featured ? "Tirar destaque" : "Destacar"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                        <Pencil size={14} className="mr-1" />Editar
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(r.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditReviewDialog
        row={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load(); }}
      />
    </div>
  );
}

function EditReviewDialog({
  row,
  onClose,
  onSaved,
}: {
  row: Row | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Row | null>(row);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(row); }, [row]);

  if (!form) return null;

  const set = <K extends keyof Row>(k: K, v: Row[K]) => setForm({ ...form, [k]: v });

  const save = async () => {
    setSaving(true);
    const patch = {
      rating: Math.max(1, Math.min(5, Number(form.rating) || 5)),
      title: form.title?.trim() || null,
      comment: form.comment?.trim() || null,
      display_name: form.display_name?.trim() || null,
      city: form.city?.trim() || null,
      avatar_url: form.avatar_url?.trim() || null,
      video_url: form.video_url?.trim() || null,
      photos: form.photos ?? [],
    };
    const { error } = await supabase.from("event_reviews").update(patch as never).eq("id", form.id);
    setSaving(false);
    if (error) { notifyError(error); return; }
    notifySuccess("Avaliação atualizada");
    onSaved();
  };

  return (
    <Dialog open={!!row} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar avaliação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={form.display_name ?? ""} onChange={(e) => set("display_name", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Cidade</Label>
              <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nota (1–5)</Label>
              <Input type="number" min={1} max={5} value={form.rating}
                onChange={(e) => set("rating", Number(e.target.value))} />
            </div>
            <div>
              <MediaPicker
                label="Avatar (foto do hóspede)"
                value={form.avatar_url ?? ""}
                onChange={(url) => set("avatar_url", url || null)}
                hint="A foto do perfil do usuário (em Conta → Perfil) tem prioridade no site público. Este avatar é o fallback quando o usuário não tem foto de perfil."
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Título</Label>
            <Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Depoimento</Label>
            <Textarea rows={6} value={form.comment ?? ""} onChange={(e) => set("comment", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Vídeo (URL)</Label>
            <Input value={form.video_url ?? ""} onChange={(e) => set("video_url", e.target.value)} />
          </div>
          <PhotosEditor
            value={form.photos ?? []}
            onChange={(v: string[]) => set("photos", v)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            <Save size={14} className="mr-1" />{saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PhotosEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const update = (idx: number, url: string) => {
    const next = [...value];
    next[idx] = url;
    onChange(next.filter(Boolean));
  };
  const remove = (idx: number) => {
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
  };
  const add = (url: string) => {
    if (!url) return;
    onChange([...value, url]);
    setDraft("");
  };
  return (
    <div className="space-y-3">
      <Label className="text-xs">Fotos da avaliação</Label>
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((url, i) => (
            <div key={i} className="flex items-start gap-2 rounded-md border p-2">
              <div className="flex-1">
                <MediaPicker value={url} onChange={(u) => update(i, u)} />
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => remove(i)}
                aria-label="Remover foto"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="rounded-md border border-dashed p-2">
        <MediaPicker
          value={draft}
          onChange={(u) => add(u)}
          hint="Selecione na biblioteca ou envie uma nova imagem para adicionar à galeria."
        />
      </div>
    </div>
  );
}
