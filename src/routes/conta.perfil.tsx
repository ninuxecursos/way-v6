import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notifyError, notifySuccess } from "@/lib/notify";
import { Camera, X } from "lucide-react";
import { useT } from "@/components/i18n/LocaleProvider";
import { maskWhatsApp, toE164 } from "@/lib/phone-mask";

export const Route = createFileRoute("/conta/perfil")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const t = useT();
  const [displayName, setDisplayName] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [showPhone2, setShowPhone2] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      // fix(B3): tratar erro/RLS — antes uma falha deixava os campos vazios sem feedback.
    try {
        const { data, error } = await supabase
          .from("profiles").select("display_name,full_name,phone,phone_secondary,avatar_url")
          .eq("id", user.id).maybeSingle();
        if (cancelled) return;
        if (error) throw error;
        if (data) {
          setDisplayName(data.display_name ?? "");
          setFullName(data.full_name ?? "");
          setPhone(data.phone ? maskWhatsApp(data.phone) : "");
          const p2 = (data as { phone_secondary?: string | null }).phone_secondary ?? "";
          setPhone2(p2 ? maskWhatsApp(p2) : "");
          setShowPhone2(Boolean(p2));
          setAvatarUrl(data.avatar_url ?? null);
        }
      } catch (e) {
        if (cancelled) return;
        notifyError(e);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName || null,
      full_name: fullName || null,
      phone: phone ? toE164(phone) : null,
      phone_secondary: showPhone2 && phone2 ? toE164(phone2) : null,
    }).eq("id", user.id);
    setLoading(false);
    if (error) notifyError(error);
    else notifySuccess(t("account.profile.updated"));
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `avatars/${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("media-public").upload(path, file, { upsert: true });
    if (upErr) { setUploading(false); notifyError(upErr); return; }
    const { data } = supabase.storage.from("media-public").getPublicUrl(path);
    const url = data.publicUrl;
    const { error: updErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setUploading(false);
    if (updErr) notifyError(updErr);
    else { setAvatarUrl(url); notifySuccess(t("account.profile.photoUpdated")); }
  };

  const initials = (displayName || user?.email || "?").split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{t("account.profile.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("account.profile.subtitle")}</p>
      </header>

      <Card className="p-5 flex items-center gap-4">
        <div className="relative">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="h-20 w-20 rounded-full object-cover ring-2 ring-brand/40" />
          ) : (
            <div className="h-20 w-20 rounded-full grid place-items-center bg-brand text-brand-foreground font-bold text-2xl">{initials}</div>
          )}
          <label className="absolute -bottom-1 -right-1 cursor-pointer grid place-items-center h-8 w-8 rounded-full bg-foreground text-background hover:opacity-90">
            <Camera size={14} />
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} disabled={uploading} />
          </label>
        </div>
        <div className="min-w-0">
          <p className="font-display font-bold">{displayName || user?.email}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          {uploading && <p className="text-xs text-muted-foreground mt-1">{t("account.profile.uploading")}</p>}
        </div>
      </Card>

      <Card className="p-5">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">{t("account.profile.displayName")}</Label>
            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">{t("account.profile.fullName")}</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("account.profile.phone")}</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(maskWhatsApp(e.target.value))}
              placeholder={t("account.profile.phonePlaceholder")}
            />
          </div>
          {showPhone2 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="phone2">{t("account.profile.phoneSecondary")}</Label>
                <button
                  type="button"
                  onClick={() => { setShowPhone2(false); setPhone2(""); }}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={12} /> {t("account.profile.removePhone")}
                </button>
              </div>
              <Input
                id="phone2"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone2}
                onChange={(e) => setPhone2(maskWhatsApp(e.target.value))}
                placeholder={t("account.profile.phonePlaceholder")}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowPhone2(true)}
              className="text-sm text-brand hover:underline"
            >
              {t("account.profile.addPhone")}
            </button>
          )}
          <Button type="submit" disabled={loading} className="bg-brand text-brand-foreground hover:bg-brand/90">
            {loading ? t("account.profile.saving") : t("account.profile.save")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
