import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  getCustomerDetail,
  updateCustomerProfile,
  resetCustomerPassword,
  deleteCustomer,
  setUserRole,
} from "@/lib/customers.functions";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ExternalLink, Mail, Phone, Globe, MapPin, Monitor, Tag as TagIcon, IdCard, Calendar,
  Save, KeyRound, Trash2, Lock,
} from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";

function fmtDate(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString("pt-BR"); } catch { return v; }
}

function Field({ icon: Icon, label, value, mono }: { icon: any; label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`truncate ${mono ? "font-mono text-xs" : ""}`}>{value ?? "—"}</div>
      </div>
    </div>
  );
}

export function CustomerDetailModal({
  userId,
  open,
  onOpenChange,
}: {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const get = useServerFn(getCustomerDetail);
  const upProfile = useServerFn(updateCustomerProfile);
  const resetPw = useServerFn(resetCustomerPassword);
  const delCustomer = useServerFn(deleteCustomer);
  const changeRole = useServerFn(setUserRole);
  const { user: currentUser, hasRole } = useAuth();
  const isSuperAdmin = hasRole("super_admin");
  const [roles, setRoles] = useState<string[]>([]);
  const [rolesBusy, setRolesBusy] = useState(false);
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: "", display_name: "", phone: "", phone_secondary: "", cpf: "",
    locale: "pt", marketing_opt_in: false, tags: "",
  });
  const [newPw, setNewPw] = useState("");
  const [showPwField, setShowPwField] = useState(false);

  useEffect(() => {
    if (!open || !userId) { setD(null); return; }
    setLoading(true);
    setEditing(false);
    setShowPwField(false);
    setNewPw("");
    get({ data: { userId } as any })
      .then((r: any) => {
        setD(r);
        setRoles(Array.isArray(r?.roles) ? r.roles : []);
        const p = r?.profile ?? {};
        setForm({
          full_name: p.full_name ?? "",
          display_name: p.display_name ?? "",
          phone: p.phone ?? "",
          phone_secondary: p.phone_secondary ?? "",
          cpf: p.cpf ?? "",
          locale: p.locale ?? "pt",
          marketing_opt_in: !!p.marketing_opt_in,
          tags: Array.isArray(p.tags) ? p.tags.join(", ") : "",
        });
      })
      .catch((e) => notifyError(e))
      .finally(() => setLoading(false));
  }, [open, userId]);

  const p = d?.profile ?? {};
  const a = d?.auth ?? {};
  const s = d?.stats ?? {};
  const segments = d?.segments ?? [];
  const orders = d?.orders ?? [];
  const wa = (p.phone || "").replace(/\D/g, "");

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    try {
      await upProfile({ data: {
        userId,
        full_name: form.full_name || undefined,
        display_name: form.display_name || undefined,
        phone: form.phone || undefined,
        phone_secondary: form.phone_secondary || undefined,
        cpf: form.cpf || undefined,
        locale: form.locale || undefined,
        marketing_opt_in: form.marketing_opt_in,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      } as any });
      notifySuccess("Cliente atualizado");
      const r: any = await get({ data: { userId } as any });
      setD(r);
      setEditing(false);
    } catch (e) { notifyError(e); }
    finally { setSaving(false); }
  }

  async function handleResetEmail() {
    if (!userId) return;
    try {
      const r: any = await resetPw({ data: { userId } as any });
      notifySuccess(`Link de redefinição enviado para ${r.email}`);
    } catch (e) { notifyError(e); }
  }

  async function toggleRole(role: "admin" | "editor" | "financeiro", add: boolean) {
    if (!userId) return;
    setRolesBusy(true);
    try {
      await changeRole({ data: { userId, role, add } as any });
      const next = add
        ? Array.from(new Set([...roles, role]))
        : roles.filter((r) => r !== role);
      setRoles(next);
      notifySuccess(add ? `Papel "${role}" atribuído` : `Papel "${role}" removido`);
    } catch (e) { notifyError(e); }
    finally { setRolesBusy(false); }
  }

  async function handleSetPassword() {
    if (!userId || newPw.length < 8) {
      notifyError(new Error("A senha precisa ter ao menos 8 caracteres."));
      return;
    }
    try {
      await resetPw({ data: { userId, newPassword: newPw } as any });
      notifySuccess("Nova senha definida com sucesso");
      setNewPw("");
      setShowPwField(false);
    } catch (e) { notifyError(e); }
  }

  async function handleDelete() {
    if (!userId) return;
    if (roles.includes("super_admin")) {
      notifyError(new Error("Super administradores não podem ser excluídos."));
      return;
    }
    if (currentUser?.id === userId) {
      notifyError(new Error("Você não pode excluir a si mesmo."));
      return;
    }
    const name = p.display_name || p.full_name || a.email || userId.slice(0, 8);
    if (!confirm(`Excluir definitivamente o cliente "${name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await delCustomer({ data: { userId } as any });
      notifySuccess("Cliente excluído");
      onOpenChange(false);
    } catch (e) { notifyError(e); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{p.display_name || p.full_name || (userId ? userId.slice(0, 8) : "Cliente")}</span>
            {userId && (
              <Link
                to="/admin/customers/$id"
                params={{ id: userId }}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                onClick={() => onOpenChange(false)}
              >
                <ExternalLink className="h-3 w-3" />Abrir página completa
              </Link>
            )}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">{userId}</DialogDescription>
        </DialogHeader>

        {loading && <div className="py-12 text-center text-muted-foreground">Carregando…</div>}

        {!loading && d && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { l: "Pedidos", v: s.orders_count ?? 0 },
                { l: "Pagos", v: s.paid_orders_count ?? 0 },
                { l: "Total gasto", v: `R$ ${((s.total_spent_cents ?? 0) / 100).toFixed(2)}` },
                { l: "Último pedido", v: s.last_order_at ? new Date(s.last_order_at).toLocaleDateString("pt-BR") : "—" },
              ].map((c) => (
                <div key={c.l} className="bg-muted/40 border rounded-lg p-3">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{c.l}</div>
                  <div className="text-lg font-bold mt-1">{c.v}</div>
                </div>
              ))}
            </div>

            {/* Identity */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Identidade & contato</h3>
                {!editing ? (
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Editar</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      <Save className="h-4 w-4 mr-1.5" />{saving ? "Salvando…" : "Salvar"}
                    </Button>
                  </div>
                )}
              </div>
              {!editing ? (
              <div className="grid md:grid-cols-2 gap-3">
                <Field icon={IdCard} label="Nome completo" value={p.full_name} />
                <Field icon={IdCard} label="Nome de exibição" value={p.display_name} />
                <Field icon={Mail} label="E-mail" value={a.email ? (
                  <a href={`mailto:${a.email}`} className="text-primary hover:underline">{a.email}</a>
                ) : "—"} />
                <Field icon={Phone} label="Telefone" value={p.phone ? (
                  <a href={`tel:${p.phone}`} className="text-primary hover:underline">{p.phone}</a>
                ) : "—"} />
                <Field icon={Phone} label="Telefone secundário" value={p.phone_secondary} />
                <Field icon={Phone} label="WhatsApp" value={wa ? (
                  <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">{p.phone}</a>
                ) : "—"} />
                <Field icon={IdCard} label="CPF" value={p.cpf} />
                <Field icon={Globe} label="Idioma" value={(p.locale ?? "pt").toUpperCase()} mono />
                <Field icon={Calendar} label="Cadastrado em" value={fmtDate(p.created_at)} />
                <Field icon={Calendar} label="Atualizado em" value={fmtDate(p.updated_at)} />
                <Field icon={Calendar} label="Último acesso" value={fmtDate(p.last_seen_at ?? d.lastSeenAt)} />
                <Field icon={TagIcon} label="Marketing opt-in" value={p.marketing_opt_in ? "Sim" : "Não"} />
              </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nome completo</Label>
                    <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nome de exibição</Label>
                    <Input value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs flex items-center gap-1"><Lock className="h-3 w-3" />E-mail (não editável)</Label>
                    <Input value={a.email ?? ""} readOnly disabled className="bg-muted/40 cursor-not-allowed" />
                    <p className="text-[11px] text-muted-foreground">O e-mail permanece o que foi usado no cadastro.</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Telefone</Label>
                    <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Telefone secundário</Label>
                    <Input value={form.phone_secondary} onChange={(e) => setForm((f) => ({ ...f, phone_secondary: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">CPF</Label>
                    <Input value={form.cpf} onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Idioma</Label>
                    <Input value={form.locale} onChange={(e) => setForm((f) => ({ ...f, locale: e.target.value }))} />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs">Tags (separadas por vírgula)</Label>
                    <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
                  </div>
                  <div className="flex items-center gap-2 md:col-span-2">
                    <Switch checked={form.marketing_opt_in} onCheckedChange={(v) => setForm((f) => ({ ...f, marketing_opt_in: v }))} />
                    <Label className="text-xs">Aceita comunicações de marketing</Label>
                  </div>
                </div>
              )}
            </section>

            {/* Auth */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Autenticação</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <Field icon={Calendar} label="Conta criada (auth)" value={fmtDate(a.created_at)} />
                <Field icon={Calendar} label="Último login" value={fmtDate(a.last_sign_in_at)} />
                <Field icon={Mail} label="E-mail confirmado" value={fmtDate(a.email_confirmed_at)} />
                <Field icon={Globe} label="Provedor" value={a.provider} mono />
              </div>
            </section>

            {/* Localização técnica */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Localização & dispositivo (último evento)</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <Field icon={MapPin} label="IP" value={d.lastIp} mono />
                <Field icon={Monitor} label="User-Agent" value={d.lastUserAgent} mono />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Derivado do log de auditoria do próprio cliente. A geolocalização por IP pode ser
                consultada em serviços externos a partir do IP acima.
              </p>
            </section>

            {/* Segments & tags */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Segmentos & tags</h3>
              <div className="flex flex-wrap gap-2">
                {(p.tags ?? []).map((t: string) => (
                  <span key={t} className="text-xs px-2 py-1 rounded-full bg-muted">{t}</span>
                ))}
                {segments.map((m: any) => (
                  <span
                    key={m.segment_id}
                    className="text-xs px-2 py-1 rounded-full border"
                    style={{ borderColor: m.customer_segments?.color ?? undefined }}
                  >
                    {m.customer_segments?.name}
                  </span>
                ))}
                {(p.tags ?? []).length === 0 && segments.length === 0 && (
                  <span className="text-xs text-muted-foreground">Sem tags ou segmentos.</span>
                )}
              </div>
            </section>

            {/* Orders */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Pedidos ({orders.length})</h3>
              <div className="border rounded-lg divide-y max-h-64 overflow-auto">
                {orders.map((o: any) => (
                  <Link
                    key={o.id}
                    to="/admin/orders/$id"
                    params={{ id: o.id }}
                    className="flex items-center justify-between p-3 text-sm hover:bg-muted/30"
                    onClick={() => onOpenChange(false)}
                  >
                    <div>
                      <div className="font-mono text-xs">{o.id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${o.status === "paid" ? "bg-green-500/20" : "bg-muted"}`}>{o.status}</span>
                      <span className="text-sm">R$ {(o.total_cents / 100).toFixed(2)}</span>
                    </div>
                  </Link>
                ))}
                {orders.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">Nenhum pedido.</div>
                )}
              </div>
            </section>

            {/* Ações administrativas */}
            <section className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold">Ações administrativas</h3>
              {/* Papéis */}
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Papéis atuais:{" "}
                  {roles.length === 0 ? (
                    <span className="italic">customer</span>
                  ) : roles.map((r) => (
                    <span key={r} className={`mr-1 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide ${r === "super_admin" ? "bg-amber-500/20 text-amber-600" : r === "admin" ? "bg-primary/15 text-primary" : "bg-muted"}`}>{r}</span>
                  ))}
                </div>
                {isSuperAdmin && !roles.includes("super_admin") && (
                  <div className="flex flex-wrap gap-2">
                    {(["admin", "editor", "financeiro"] as const).map((role) => {
                      const has = roles.includes(role);
                      return (
                        <Button
                          key={role}
                          size="sm"
                          variant={has ? "default" : "outline"}
                          disabled={rolesBusy}
                          onClick={() => toggleRole(role, !has)}
                        >
                          {has ? `Remover ${role}` : `Atribuir ${role}`}
                        </Button>
                      );
                    })}
                  </div>
                )}
                {roles.includes("super_admin") && (
                  <p className="text-[11px] text-amber-600">
                    <Lock className="inline h-3 w-3 mr-1" />Super administrador — papel imutável e conta protegida contra exclusão.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={handleResetEmail}>
                  <Mail className="h-4 w-4 mr-1.5" />Enviar link de redefinição
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowPwField((v) => !v)}>
                  <KeyRound className="h-4 w-4 mr-1.5" />Definir nova senha
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                  className="ml-auto"
                  disabled={roles.includes("super_admin") || currentUser?.id === userId}
                  title={roles.includes("super_admin") ? "Super admin não pode ser excluído" : currentUser?.id === userId ? "Você não pode excluir a si mesmo" : undefined}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />Excluir cliente
                </Button>
              </div>
              {showPwField && (
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Nova senha (mín. 8 caracteres)</Label>
                    <Input type="text" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="********" />
                  </div>
                  <Button size="sm" onClick={handleSetPassword} disabled={newPw.length < 8}>Aplicar</Button>
                </div>
              )}
            </section>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}