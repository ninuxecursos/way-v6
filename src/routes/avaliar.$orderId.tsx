/**
 * Página de avaliação autenticada — 1 avaliação por pedido pago.
 * O usuário recebe o link após a experiência. Submete via server function
 * que valida ownership do pedido e status pago (trigger no banco).
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Star,
  ArrowLeft,
  CheckCircle2,
  Image as ImageIcon,
  X,
  Loader2,
  Video as VideoIcon,
  Sparkles,
  Camera,
} from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { PublicErrorBoundary } from "@/components/errors/PublicErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import { getMyReview, submitReview } from "@/lib/reviews.functions";
import { Header } from "@/components/wh/Header";

export const Route = createFileRoute("/avaliar/$orderId")({
  component: ReviewPage,
  errorComponent: ({ error, reset }) => (
    <PublicErrorBoundary
      error={error}
      reset={reset}
      title="Erro ao carregar avaliação"
      homeLabel="Meus pedidos"
      homeTo="/conta/pedidos"
    />
  ),
});

type Existing = {
  rating: number;
  title: string | null;
  comment: string | null;
  display_name: string | null;
  city: string | null;
  avatar_url: string | null;
  photos: string[];
  video_url: string | null;
  status: string;
  experience_date?: string | null;
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_VIDEO_BYTES = 80 * 1024 * 1024; // 80 MB

async function uploadToMedia(file: File, kind: "image" | "video" = "image"): Promise<string> {
  if (kind === "image" && file.size > MAX_IMAGE_BYTES) {
    throw new Error("Cada foto deve ter no máximo 8 MB.");
  }
  if (kind === "video" && file.size > MAX_VIDEO_BYTES) {
    throw new Error("O vídeo deve ter no máximo 80 MB.");
  }
  const ext = file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg");
  const path = `reviews/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("media-public")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
  if (error) throw error;
  const { data } = supabase.storage.from("media-public").getPublicUrl(path);
  return data.publicUrl;
}

function ReviewPage() {
  const { orderId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [experienceDate, setExperienceDate] = useState("");
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null);
  const [productName, setProductName] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<Existing | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    (async () => {
      try {
        const { data: ord } = await supabase
          .from("orders")
          .select("status,paid_at,checked_in_at,bus_checked_in_at,lodging_checked_in_at,metadata")
          .eq("id", orderId)
          .maybeSingle();
        if (ord) {
          setOrderStatus((ord as { status: string }).status);
          const o = ord as {
            paid_at: string | null;
            checked_in_at: string | null;
            bus_checked_in_at: string | null;
            lodging_checked_in_at: string | null;
          };
          const ci = o.checked_in_at ?? o.bus_checked_in_at ?? o.lodging_checked_in_at;
          setCheckedInAt(ci);
          if (ci && !experienceDate) setExperienceDate(ci.slice(0, 10));
          const meta = (ord as { metadata: Record<string, unknown> | null }).metadata ?? {};
          const slug = String((meta as Record<string, unknown>).product_slug ?? "");
          if (slug) {
            const { data: prod } = await supabase
              .from("products")
              .select("name")
              .eq("slug", slug)
              .maybeSingle();
            const nm = (prod as { name?: string | null } | null)?.name;
            if (nm) setProductName(nm);
          }
        }
        const { review } = await getMyReview({ data: { orderId } });
        if (review) {
          const r = review as Existing;
          setExisting(r);
          setRating(r.rating);
          setTitle(r.title ?? "");
          setComment(r.comment ?? "");
          setDisplayName(r.display_name ?? "");
          setCity(r.city ?? "");
          setAvatarUrl(r.avatar_url ?? "");
          setPhotos(r.photos ?? []);
          setVideoUrl(r.video_url ?? "");
          if (r.experience_date) setExperienceDate(r.experience_date);
        } else {
          // Pré-preenche nome a partir do perfil
          const { data: p } = await supabase
            .from("profiles")
            .select("display_name, full_name, avatar_url")
            .eq("id", user.id)
            .maybeSingle();
          if (p) {
            setDisplayName(p.display_name || p.full_name || "");
            setAvatarUrl(p.avatar_url ?? "");
          }
        }
      } catch (e) {
        // segue mesmo se a busca falhar
      }
      setLoaded(true);
    })();
  }, [authLoading, user, orderId, navigate]);

  const handlePhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const remaining = 5 - photos.length;
      const list = Array.from(files).slice(0, remaining);
      const urls = await Promise.all(list.map((f) => uploadToMedia(f, "image")));
      setPhotos((p) => [...p, ...urls]);
    } catch (e) {
      notifyError(e);
    }
    setUploading(false);
  };

  const handleAvatar = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToMedia(file, "image");
      setAvatarUrl(url);
    } catch (e) {
      notifyError(e);
    }
    setUploading(false);
  };

  const handleVideo = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToMedia(file, "video");
      setVideoUrl(url);
    } catch (e) {
      notifyError(e);
    }
    setUploading(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (rating < 1) {
      notifyError("Escolha de 1 a 5 estrelas.");
      return;
    }
    setSubmitting(true);
    try {
      await submitReview({
        data: {
          orderId,
          rating,
          title: title.trim() || null,
          comment: comment.trim() || null,
          displayName: displayName.trim() || null,
          city: city.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
          photos,
          videoUrl: videoUrl.trim() || null,
          experienceDate: experienceDate || null,
        },
      });
      notifySuccess("Obrigado! Sua avaliação está em moderação.");
      navigate({ to: "/conta/pedidos/$id", params: { id: orderId } });
    } catch (err: any) {
      notifyError(err?.message ?? err);
    }
    setSubmitting(false);
  };

  if (!loaded)
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );

  const canReview = orderStatus === "paid" && !!checkedInAt;
  if (!canReview) {
    return (
      <div className="min-h-screen bg-background text-foreground pt-28 md:pt-32 pb-10 px-4">
        <Header />
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
          <Link
            to="/conta/pedidos/$id"
            params={{ id: orderId }}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} /> Voltar ao pedido
          </Link>
          <Card className="p-6 space-y-2">
            <h1 className="font-display text-2xl font-extrabold">Avaliação ainda indisponível</h1>
            <p className="text-sm text-muted-foreground">
              {orderStatus !== "paid"
                ? "A avaliação será liberada assim que o pagamento do seu pedido for confirmado."
                : "Você poderá avaliar este pedido após o check-in no evento. Assim que sua presença for confirmada, liberamos o formulário automaticamente."}
            </p>
          </Card>
        </div>
      </div>
    );
  }

  // Já avaliado → trava: usuário só pode avaliar novamente em uma nova compra.
  if (existing) {
    return (
      <div className="min-h-screen bg-background text-foreground pt-28 md:pt-32 pb-16 px-4">
        <Header />
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
          <Link
            to="/conta/pedidos/$id"
            params={{ id: orderId }}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} /> Voltar ao pedido
          </Link>
          <Card className="p-8 space-y-4 bg-gradient-to-br from-brand/10 via-card to-card border-brand/20">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand">
              <CheckCircle2 size={14} /> Avaliação enviada
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold">
              Obrigado por compartilhar sua experiência!
            </h1>
            <p className="text-sm text-muted-foreground">
              {existing.status === "approved"
                ? "Sua avaliação já foi publicada e está ajudando outros viajantes a confiarem na Way Home."
                : "Sua avaliação foi recebida e está em moderação. Em breve será publicada."}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={22}
                  className={i < existing.rating ? "text-brand fill-brand" : "text-muted-foreground/40"}
                />
              ))}
              <span className="ml-2 text-sm text-muted-foreground">{existing.rating}/5</span>
            </div>
            {existing.comment && (
              <blockquote className="border-l-2 border-brand/40 pl-4 text-sm italic text-foreground/80">
                “{existing.comment}”
              </blockquote>
            )}
            <p className="text-xs text-muted-foreground pt-3 border-t">
              Para enviar uma nova avaliação, basta concluir uma nova compra com a Way Home.
            </p>
            <div className="flex gap-2 pt-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/conta/pedidos">Meus pedidos</Link>
              </Button>
              <Button asChild size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
                <Link to="/">Explorar próxima viagem</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 md:pt-28 pb-24 md:pb-16">
      <Header />
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border/40 bg-gradient-to-br from-brand/15 via-background to-background">
        <div className="absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]">
          <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand/30 blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
          <Link
            to="/conta/pedidos/$id"
            params={{ id: orderId }}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft size={14} /> Voltar ao pedido
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand mb-3">
            <Sparkles size={14} /> Avaliação verificada de cliente
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight">
            Como foi sua experiência?
          </h1>
          <p className="text-muted-foreground mt-3 text-base md:text-lg max-w-xl">
            {productName
              ? `Conte como foi viver ${productName} com a Way Home. `
              : "Conte como foi sua viagem com a Way Home. "}
            Você pode enviar fotos, um vídeo e sua nota. A avaliação passa por moderação antes de ser publicada.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-6 md:-mt-8 space-y-6 animate-fade-in">
        <Card className="p-6 md:p-8 shadow-xl border-border/60">
          <form onSubmit={submit} className="space-y-6">
            {/* Nota */}
            <div className="rounded-xl bg-muted/40 p-4 md:p-5">
              <p className="text-sm font-semibold mb-1">Sua nota geral</p>
              <p className="text-xs text-muted-foreground mb-3">Toque nas estrelas para avaliar</p>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => {
                  const filled = (hover || rating) >= n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onMouseEnter={() => setHover(n)}
                      onMouseLeave={() => setHover(0)}
                      onClick={() => setRating(n)}
                      className="cursor-pointer p-1 transition-transform hover:scale-110 active:scale-95"
                      aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
                    >
                      <Star
                        size={36}
                        className={
                          filled
                            ? "text-brand fill-brand drop-shadow-[0_0_8px_color-mix(in_oklab,var(--brand)_60%,transparent)]"
                            : "text-muted-foreground/40"
                        }
                      />
                    </button>
                  );
                })}
                {rating > 0 && (
                  <span className="ml-3 text-sm font-semibold text-foreground">
                    {rating}/5
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="dn" className="text-xs">Como você quer aparecer</Label>
                <Input id="dn" maxLength={120} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ex: Marina S." />
              </div>
              <div className="space-y-1">
                <Label htmlFor="city" className="text-xs">Cidade (opcional)</Label>
                <Input id="city" maxLength={120} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: São Paulo, SP" />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="title" className="text-xs">Título da avaliação (opcional)</Label>
              <Input id="title" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Uma noite inesquecível" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="exp-date" className="text-xs">Data da experiência</Label>
              <Input
                id="exp-date"
                type="date"
                value={experienceDate}
                onChange={(e) => setExperienceDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment" className="text-xs">Seu comentário</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={6}
                maxLength={2000}
                placeholder="Conte os destaques: estrutura, transfer, atendimento, momentos inesquecíveis…"
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{comment.length}/2000</p>
            </div>

            {/* Avatar */}
            <div className="space-y-2">
              <Label className="text-xs">Sua foto de perfil (opcional)</Label>
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <label className="cursor-pointer inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
                  Escolher imagem
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleAvatar(e.target.files?.[0] ?? null)}
                  />
                </label>
                {avatarUrl && (
                  <button type="button" onClick={() => setAvatarUrl("")} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                    <X size={12} /> remover
                  </button>
                )}
              </div>
            </div>

            {/* Fotos da experiência */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5">
                  <Camera size={12} /> Fotos da experiência (até 5)
                </Label>
                <span className="text-[10px] text-muted-foreground">{photos.length}/5</span>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-md">
                    <img src={p} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((arr) => arr.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 rounded-full bg-black/70 text-white p-1"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <label className="aspect-square cursor-pointer rounded-md border border-dashed border-border/70 flex flex-col items-center justify-center text-xs text-muted-foreground hover:bg-accent transition-colors">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ImageIcon className="h-4 w-4 mb-1" /> Adicionar</>}
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotos(e.target.files)}
                    />
                  </label>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">Máximo 8 MB por imagem.</p>
            </div>

            {/* Vídeo (upload, 1 arquivo) */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <VideoIcon size={12} /> Vídeo da experiência (opcional, 1 arquivo)
              </Label>
              {videoUrl ? (
                <div className="relative overflow-hidden rounded-md border border-border/60 bg-black">
                  <video src={videoUrl} controls className="w-full max-h-72" />
                  <button
                    type="button"
                    onClick={() => setVideoUrl("")}
                    className="absolute top-2 right-2 rounded-full bg-black/70 text-white p-1.5 hover:bg-black"
                    aria-label="Remover vídeo"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="block cursor-pointer rounded-md border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground hover:bg-accent transition-colors">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  ) : (
                    <>
                      <VideoIcon className="h-5 w-5 mx-auto mb-1" />
                      <span>Enviar vídeo (até 80 MB)</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => handleVideo(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
            </div>

            <div className="sticky bottom-4 md:static md:bottom-auto pt-2">
              <Button
                type="submit"
                disabled={submitting || uploading || rating < 1}
                size="lg"
                className="w-full bg-brand text-brand-foreground hover:bg-brand/90 shadow-lg shadow-brand/20"
              >
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando…</>
                ) : (
                  <>Confirmar avaliação</>
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center mt-2">
                Ao confirmar, você concorda em publicar sua avaliação após moderação. Não é possível editar depois de enviada.
              </p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
