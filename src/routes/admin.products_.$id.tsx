import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { ImageUploader } from "@/components/admin/ImageUploader";

export const Route = createFileRoute("/admin/products_/$id")({ component: ProductEditor });

const LOCALES = ["pt", "en", "es"] as const;

/** Converte centavos para string editável "1234,56". */
function centsToInput(cents: number | null | undefined): string {
  if (cents == null || Number.isNaN(cents)) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Aceita "1234,56", "1234.56", "R$ 1.234,56" e retorna inteiro de centavos. */
function inputToCents(input: string): number {
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function ProductEditor() {
  const { id } = Route.useParams();
  const [p, setP] = useState<any>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // fix(B3): tratar erro/RLS — antes UI travava em "Carregando...".
      try {
        const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
        if (cancelled) return;
        if (error) throw error;
        setP(data);
      } catch (e) {
        if (cancelled) return;
        notifyError(e);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (!p) return <div className="p-8">Carregando...</div>;
  const tr = p.translations ?? {};
  const setTr = (loc: string, k: string, v: string) =>
    setP({ ...p, translations: { ...tr, [loc]: { ...(tr[loc] ?? {}), [k]: v } } });
  const setTrArr = (loc: string, k: string, v: string[]) =>
    setP({ ...p, translations: { ...tr, [loc]: { ...(tr[loc] ?? {}), [k]: v } } });
  const getTrArr = (loc: string, k: string): string[] => {
    const v = (tr[loc] ?? {})[k];
    return Array.isArray(v) ? v.map(String) : [];
  };

  const save = async () => {
    const { error } = await supabase.from("products").update({
      slug: p.slug, type: p.type, active: p.active, price_cents: p.price_cents,
      compare_at_cents: p.compare_at_cents, currency: p.currency, stock: p.stock,
      max_per_order: p.max_per_order, cover_image_url: p.cover_image_url,
      gallery: p.gallery, translations: p.translations, position: p.position,
      event_date: p.event_date || null,
      event_starts_at: p.event_starts_at || null,
      event_ends_at: p.event_ends_at || null,
      metadata: p.metadata ?? {},
    } as never).eq("id", id);
    if (error) {
      notifyError(error);
    } else {
      // Invalida caches que dependem dos produtos (home, reserva, etc.)
      await queryClient.invalidateQueries({ queryKey: ["home", "modalities"] });
      await queryClient.invalidateQueries({ queryKey: ["reservation", "modalities"] });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      notifySuccess("Salvo!");
    }
  };

  const meta = (p.metadata ?? {}) as Record<string, unknown>;
  const setMeta = (k: string, v: unknown) => {
    const next = { ...meta };
    if (v === "" || v === null || v === undefined) delete next[k];
    else next[k] = v;
    setP({ ...p, metadata: next });
  };
  const genderOptions: string[] = Array.isArray(meta.gender_options) ? (meta.gender_options as string[]) : [];
  const toggleGender = (g: "m" | "f") => {
    const set = new Set(genderOptions);
    if (set.has(g)) set.delete(g); else set.add(g);
    setMeta("gender_options", Array.from(set));
  };
  const isModality = p.type === "reservation_modality";

  return (
    <div className="p-8 max-w-4xl">
      <Link to="/admin/products" className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="h-3 w-3" /> Voltar
      </Link>
      <h1 className="text-3xl font-bold mb-6">Editar produto</h1>

      <div className="space-y-4 bg-card border p-6 rounded-lg">
        <div className="grid grid-cols-3 gap-4">
          <div><Label>Slug</Label><Input value={p.slug} onChange={(e) => setP({ ...p, slug: e.target.value })} /></div>
          <div><Label>Tipo</Label>
            <select className="border rounded h-10 w-full px-3" value={p.type} onChange={(e) => setP({ ...p, type: e.target.value })}>
              <option value="reservation_modality">Modalidade de hospedagem</option>
              <option value="suite">Suíte</option><option value="camping">Camping</option>
              <option value="addon">Add-on</option><option value="transfer">Transfer</option><option value="other">Outro</option>
            </select>
          </div>
          <div><Label>Posição</Label><Input type="number" value={p.position ?? 0} onChange={(e) => setP({ ...p, position: Number(e.target.value) })} /></div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <Label>Preço (R$)</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={centsToInput(p.price_cents)}
              onChange={(e) => setP({ ...p, price_cents: inputToCents(e.target.value) })}
            />
          </div>
          <div>
            <Label>De (R$)</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={p.compare_at_cents != null ? centsToInput(p.compare_at_cents) : ""}
              onChange={(e) => {
                const v = e.target.value.trim();
                setP({ ...p, compare_at_cents: v ? inputToCents(v) : null });
              }}
            />
          </div>
          <div><Label>Moeda</Label><Input value={p.currency} onChange={(e) => setP({ ...p, currency: e.target.value })} /></div>
          <div><Label>Estoque</Label><Input type="number" value={p.stock ?? ""} onChange={(e) => setP({ ...p, stock: e.target.value ? Number(e.target.value) : null })} /></div>
        </div>
        <div><Label>Imagem de capa (URL)</Label><Input value={p.cover_image_url ?? ""} onChange={(e) => setP({ ...p, cover_image_url: e.target.value })} /></div>
        {isModality && (
          <div>
            <Label>Logotipo do hero (página individual da modalidade)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Exibido no topo da página da modalidade (ex.: /hospedagem/way-connect). Recomendado: PNG/SVG transparente.
            </p>
            <ImageUploader
              label="Logo hero"
              folder={`modality/${p.slug || "logo"}`}
              value={typeof meta.hero_logo_url === "string" ? (meta.hero_logo_url as string) : ""}
              onChange={(v) => setMeta("hero_logo_url", v)}
            />
            <div className="mt-3 max-w-xs">
              <Label>Tamanho do logo no hero (px)</Label>
              <Input
                type="number"
                min={16}
                max={400}
                placeholder="40"
                value={
                  typeof meta.hero_logo_size === "number"
                    ? String(meta.hero_logo_size)
                    : typeof meta.hero_logo_size === "string"
                      ? (meta.hero_logo_size as string)
                      : ""
                }
                onChange={(e) => {
                  const v = e.target.value.trim();
                  setMeta("hero_logo_size", v ? Number(v) : null);
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Define largura e altura do logo no topo da página. Padrão: 40px.
              </p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Data do evento (compat)</Label>
            <Input type="date" value={p.event_date ?? ""} onChange={(e) => setP({ ...p, event_date: e.target.value })} />
            <p className="text-xs text-muted-foreground mt-1">Lembretes D-30, D-7 e D-1.</p>
          </div>
          <div>
            <Label>Início do evento</Label>
            <Input
              type="datetime-local"
              value={p.event_starts_at ? String(p.event_starts_at).slice(0, 16) : ""}
              onChange={(e) => setP({ ...p, event_starts_at: e.target.value || null })}
            />
            <p className="text-xs text-muted-foreground mt-1">Data e hora de início.</p>
          </div>
          <div>
            <Label>Término do evento</Label>
            <Input
              type="datetime-local"
              value={p.event_ends_at ? String(p.event_ends_at).slice(0, 16) : ""}
              onChange={(e) => setP({ ...p, event_ends_at: e.target.value || null })}
            />
            <p className="text-xs text-muted-foreground mt-1">Libera as avaliações após este momento.</p>
          </div>
        </div>
        <label className="flex items-center gap-2"><Switch checked={p.active} onCheckedChange={(v) => setP({ ...p, active: v })} /> Ativo (visível e à venda)</label>

        {isModality && (
          <div className="border-t pt-4 space-y-4">
            <div>
              <h3 className="font-semibold">Modalidade (cartão da seção Hospedagem)</h3>
              <p className="text-xs text-muted-foreground">
                Estes campos controlam exatamente o que aparece no cartão da home (Individual / Galera / Casal etc.).
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Tipo de quarto</Label>
                <select
                  className="border rounded h-10 w-full px-3"
                  value={String(meta.modality_kind ?? "other")}
                  onChange={(e) => setMeta("modality_kind", e.target.value)}
                >
                  <option value="individual">Individual</option>
                  <option value="shared">Compartilhado (Galera)</option>
                  <option value="couple">Casal</option>
                  <option value="other">Outro</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">Define o ícone do cartão.</p>
              </div>
              <div>
                <Label>Modo de checkout</Label>
                <select
                  className="border rounded h-10 w-full px-3"
                  value={String(meta.checkout_mode ?? "auto")}
                  onChange={(e) => setMeta("checkout_mode", e.target.value)}
                >
                  <option value="auto">Reserva online (Mercado Pago)</option>
                  <option value="whatsapp">Sob consulta (WhatsApp)</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">"WhatsApp" exibe "Sob consulta" no lugar do preço.</p>
              </div>
              <div>
                <Label>Quantidade mínima</Label>
                <Input
                  type="number"
                  min={1}
                  value={typeof meta.min_quantity === "number" ? meta.min_quantity : 1}
                  onChange={(e) => setMeta("min_quantity", Number(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 mt-2">
                <Switch
                  checked={Boolean(meta.recommended)}
                  onCheckedChange={(v) => setMeta("recommended", v)}
                />
                Recomendado (destaque com borda rosa + selo "Recomendado")
              </label>
              <div>
                <Label>Selo de economia (ex: "Economize R$ 200 por pessoa")</Label>
                <Input
                  value={typeof meta.economy_label === "string" ? meta.economy_label : ""}
                  onChange={(e) => setMeta("economy_label", e.target.value)}
                  placeholder="Economize R$ 200 por pessoa"
                />
              </div>
            </div>

            <div>
              <Label>Opções de gênero do quarto compartilhado</Label>
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={genderOptions.includes("m")} onChange={() => toggleGender("m")} />
                  Masculino
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={genderOptions.includes("f")} onChange={() => toggleGender("f")} />
                  Feminino
                </label>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Os destaques, selo de economia e legenda alternativa de preço agora são editados por idioma logo abaixo, para refletirem em PT/EN/ES na home.
            </p>

            <div>
              <Label>Mensagem inicial do WhatsApp (apenas para modo "WhatsApp")</Label>
              <textarea
                className="w-full border rounded p-2 text-sm"
                rows={3}
                value={typeof meta.whatsapp_message === "string" ? meta.whatsapp_message : ""}
                onChange={(e) => setMeta("whatsapp_message", e.target.value)}
                placeholder="Olá! Tenho interesse na modalidade Casal da Way Home..."
              />
            </div>
          </div>
        )}

        <div className="border-t pt-4 space-y-4">
          <h3 className="font-semibold">Conteúdo (PT / EN / ES)</h3>
          {LOCALES.map((loc) => {
            const locKey = loc === "pt" ? "pt-BR" : loc;
            const hl = getTrArr(locKey, "highlights");
            return (
              <div key={loc} className="border rounded p-4 space-y-3">
                <div className="text-xs uppercase font-semibold text-muted-foreground">{loc}</div>
                <Input placeholder="Nome" value={tr[locKey]?.name ?? ""} onChange={(e) => setTr(locKey, "name", e.target.value)} />
                <textarea className="w-full border rounded p-2 text-sm" rows={3} placeholder="Descrição"
                  value={tr[locKey]?.description ?? ""} onChange={(e) => setTr(locKey, "description", e.target.value)} />
                {isModality && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs">Inclusões / destaques (linhas do cartão)</Label>
                        <Button type="button" size="sm" variant="outline" onClick={() => setTrArr(locKey, "highlights", [...hl, ""]) }>
                          <Plus className="h-3 w-3 mr-1" /> Adicionar
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {hl.length === 0 && (
                          <p className="text-xs text-muted-foreground">Sem destaques. Adicione linhas (ex: "Café da manhã incluso").</p>
                        )}
                        {hl.map((h, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Input value={h} onChange={(e) => {
                              const next = [...hl]; next[i] = e.target.value; setTrArr(locKey, "highlights", next);
                            }} placeholder={`Item ${i + 1}`} />
                            <Button type="button" size="icon" variant="ghost" onClick={() => setTrArr(locKey, "highlights", hl.filter((_, j) => j !== i))} aria-label="Remover">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Selo de economia</Label>
                        <Input value={tr[locKey]?.economyLabel ?? ""} onChange={(e) => setTr(locKey, "economyLabel", e.target.value)} placeholder="Economize R$ 200 por pessoa" />
                      </div>
                      <div>
                        <Label className="text-xs">Legenda alternativa de preço</Label>
                        <Input value={tr[locKey]?.altPrice ?? ""} onChange={(e) => setTr(locKey, "altPrice", e.target.value)} placeholder="ou 12x de R$ 99" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <Button onClick={save}><Save className="h-4 w-4 mr-2" />Salvar</Button>
      </div>
    </div>
  );
}