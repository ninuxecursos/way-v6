import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useForm, Controller, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, User, Users, Heart, Sparkles } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { QuizCard } from "./QuizCard";
import { QuizProgress } from "./QuizProgress";
import { QuizActions } from "./QuizActions";
import { CouponField } from "../CouponField";
import { PasswordInput, passwordStrength } from "@/components/auth/PasswordInput";

import { useReservation } from "@/hooks/use-reservation";
import { participantSchema, type ParticipantInput } from "@/schemas/reservation";
import { maskCPF, onlyDigits } from "@/lib/cpf";
import { maskWhatsApp, toE164, handlePhoneInputChange } from "@/lib/phone-mask";
import { createParticipant } from "@/repositories/participants.repo";
import { useAuth } from "@/hooks/use-auth";
import { setPendingPassword } from "@/lib/pending-password";

type StepId =
  | "holder-name"
  | "holder-contact"
  | "holder-doc"
  | "group-role"
  | "group-coupon"
  | "quantity"
  | "companion"
  | "review";

const GENDERS = [
  { v: "m", label: "Masculino" },
  { v: "f", label: "Feminino" },
  { v: "other", label: "Prefiro não dizer" },
] as const;

export function QuizFlow() {
  const navigate = useNavigate();
  const { state, setParticipant } = useReservation();
  const { user } = useAuth();
  const lockedEmail = user?.email ?? "";
  const needsAccount = !user;
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const pwStrength = useMemo(() => passwordStrength(password), [password]);
  const passwordOk =
    !needsAccount ||
    (password.length >= 8 && password === passwordConfirm && pwStrength.score >= 2);
  const modality = state.modality!;
  const isGroup = modality.kind === "shared";
  const isIndividual = modality.kind === "individual";
  const supportsCompanions = !isGroup && !isIndividual;

  const minQty = supportsCompanions ? (modality.minQuantity ?? 1) : 1;
  const maxQty = supportsCompanions ? (modality.maxPerOrder ?? 20) : 1;

  const form = useForm<ParticipantInput>({
    resolver: zodResolver(participantSchema) as unknown as Resolver<ParticipantInput>,
    mode: "onBlur",
    defaultValues: {
      name: state.participant?.name ?? "",
      email: lockedEmail || (state.participant?.email ?? ""),
      whatsapp: state.participant?.whatsapp ?? "",
      cpf: state.participant?.cpf ?? "",
      city: state.participant?.city ?? "",
      gender: state.participant?.gender,
      reservationType: modality.productSlug,
      quantity: state.participant?.quantity ?? minQty,
      companions: state.participant?.companions ?? [],
      groupCouponCode: state.participant?.groupCouponCode ?? "",
      isGroupHolder: state.participant?.isGroupHolder ?? false,
      groupCapacity: state.participant?.groupCapacity,
    },
  });

  const { control, watch, setValue, trigger, getValues, formState } = form;
  const companionsArr = useFieldArray({ control, name: "companions" });

  // Garante que o email do usuário logado sobrescreva qualquer valor anterior
  // e seja mantido durante todo o fluxo (campo travado).
  useEffect(() => {
    if (lockedEmail && getValues("email") !== lockedEmail) {
      setValue("email", lockedEmail, { shouldValidate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedEmail]);

  // Galera role state ('holder' | 'member')
  const [groupRole, setGroupRole] = useState<"holder" | "member" | null>(() =>
    state.participant?.groupCouponCode ? "member" : state.participant?.isGroupHolder ? "holder" : null,
  );
  const [groupCoupon, setGroupCoupon] = useState<string>(state.participant?.groupCouponCode ?? "");
  const [couponValid, setCouponValid] = useState<boolean | null>(
    state.participant?.groupCouponCode ? true : null,
  );
  // Capacidade fixa do quarto Galera: 1 titular + 7 cupons = 8 pessoas.
  const GROUP_ROOM_CAPACITY = 8;
  const groupCapacity = GROUP_ROOM_CAPACITY;

  // Companion sub-step (within "companion" step)
  const [companionIdx, setCompanionIdx] = useState(0);

  // Build dynamic step list based on modality + role
  const steps = useMemo<StepId[]>(() => {
    const base: StepId[] = ["holder-name", "holder-contact", "holder-doc"];
    if (isGroup) {
      base.push("group-role");
      if (groupRole === "member") base.push("group-coupon");
    } else if (supportsCompanions) {
      base.push("quantity");
    }
    base.push("review");
    return base;
  }, [isGroup, groupRole, supportsCompanions]);

  const [stepIdx, setStepIdx] = useState(0);
  // Reset stepIdx if dynamic list shrinks below current index
  useEffect(() => {
    if (stepIdx >= steps.length) setStepIdx(steps.length - 1);
  }, [steps.length, stepIdx]);

  const currentStep = steps[stepIdx];

  // Track when we're inside the companion loop (only Casal/Outras with quantity > 1)
  const quantity = watch("quantity") ?? minQty;
  const totalCompanions = supportsCompanions ? Math.max(0, quantity - 1) : 0;

  // Sync companions array length with quantity
  useEffect(() => {
    if (!supportsCompanions) {
      if (companionsArr.fields.length > 0) {
        for (let i = companionsArr.fields.length - 1; i >= 0; i -= 1) companionsArr.remove(i);
      }
      return;
    }
    const target = totalCompanions;
    const current = companionsArr.fields.length;
    if (target > current) {
      for (let i = current; i < target; i += 1) {
        companionsArr.append({
          name: "",
          cpf: "",
          whatsapp: "",
          email: "",
          gender: "other",
          birthdate: "",
        });
      }
    } else if (target < current) {
      for (let i = current - 1; i >= target; i -= 1) companionsArr.remove(i);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCompanions, supportsCompanions]);

  // ===================== Navigation helpers =====================

  const goNext = async () => {
    // Use renderStep (handles virtual "companion") for validation routing.
    const active = renderStep;
    let ok = true;
    if (active === "holder-name") ok = await trigger(["name"]);
    else if (active === "holder-contact") {
      ok = await trigger(["whatsapp", "email"]);
      if (ok && needsAccount && !passwordOk) ok = false;
    }
    else if (active === "holder-doc") ok = await trigger(["cpf", "city", "gender"]);
    else if (active === "quantity") ok = await trigger(["quantity"]);
    else if (active === "group-role") ok = groupRole !== null;
    else if (active === "group-coupon") ok = couponValid === true;
    else if (active === "companion") {
      ok = await trigger([
        `companions.${companionIdx}.name`,
        `companions.${companionIdx}.cpf`,
        `companions.${companionIdx}.whatsapp`,
        `companions.${companionIdx}.email`,
        `companions.${companionIdx}.gender`,
      ] as const);
    }
    if (!ok) return;

    // Quantity → if there are companions, jump to review-index but reset companionIdx
    // so renderStep enters virtual "companion" mode.
    if (active === "quantity") {
      setCompanionIdx(0);
      setStepIdx((i) => Math.min(steps.length - 1, i + 1));
      return;
    }
    // Companion loop: stay on virtual step until idx exhausted, then "exit"
    // by moving companionIdx past totalCompanions so renderStep falls to review.
    if (active === "companion") {
      if (companionIdx + 1 < totalCompanions) {
        setCompanionIdx((i) => i + 1);
        return;
      }
      setCompanionIdx(totalCompanions); // exit virtual loop, render = "review"
      return;
    }
    setStepIdx((i) => Math.min(steps.length - 1, i + 1));
  };

  const goBack = () => {
    const active = renderStep;
    if (active === "companion" && companionIdx > 0) {
      setCompanionIdx((i) => i - 1);
      return;
    }
    if (active === "companion") {
      // back to quantity (which is steps[stepIdx-1])
      setStepIdx((i) => Math.max(0, i - 1));
      return;
    }
    // Review with companions: re-enter companion loop on the last one.
    if (active === "review" && totalCompanions > 0 && companionIdx >= totalCompanions) {
      setCompanionIdx(totalCompanions - 1);
      return;
    }
    if (stepIdx === 0) {
      navigate({ to: "/reservation" });
      return;
    }
    setStepIdx((i) => Math.max(0, i - 1));
  };

  const goTo = (target: StepId) => {
    const idx = steps.indexOf(target);
    if (idx >= 0) setStepIdx(idx);
  };

  // We handle the special case where after "quantity" we want to enter the
  // companion loop. We synthesize a virtual "companion" step on top of the
  // current index when totalCompanions > 0 and the next physical step would
  // be "review".
  const renderStep = (() => {
    if (
      supportsCompanions &&
      totalCompanions > 0 &&
      steps[stepIdx] === "review" &&
      companionIdx < totalCompanions
    ) {
      return "companion" as StepId;
    }
    return currentStep;
  })();

  // ===================== Submit =====================

  const submitMutation = useMutation({
    mutationFn: async () => {
      const values = getValues();
      const cleanedQty = isGroup || isIndividual ? 1 : values.quantity;
      const companions = supportsCompanions ? values.companions : [];
      const record = await createParticipant({
        ...values,
        whatsapp: toE164(values.whatsapp) || values.whatsapp,
        cpf: onlyDigits(values.cpf),
        quantity: cleanedQty,
        companions,
        groupCouponCode: isGroup && groupRole === "member" ? groupCoupon : undefined,
        isGroupHolder: isGroup && groupRole === "holder" ? true : undefined,
        groupCapacity: isGroup && groupRole === "holder" ? groupCapacity : undefined,
        productId: modality.productId,
      });
      return { record, values, cleanedQty, companions };
    },
    onSuccess: ({ record, values, cleanedQty, companions }) => {
      setParticipant({
        ...values,
        whatsapp: toE164(values.whatsapp) || values.whatsapp,
        cpf: onlyDigits(values.cpf),
        quantity: cleanedQty,
        companions,
        participantId: record.id,
        groupCouponCode: isGroup && groupRole === "member" ? groupCoupon : undefined,
        isGroupHolder: isGroup && groupRole === "holder" ? true : undefined,
        groupCapacity: isGroup && groupRole === "holder" ? groupCapacity : undefined,
      });
      // Senha do visitante fica guardada em sessionStorage até o aceite dos
      // termos, onde será usada para criar a conta via supabase.auth.signUp.
      if (needsAccount && password) {
        setPendingPassword(values.email.trim().toLowerCase(), password);
      }
      toast.success("Cadastro salvo!", { description: "Vamos para os termos." });
      navigate({ to: "/reservation/terms" });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Não foi possível salvar.";
      toast.error("Erro ao salvar cadastro", { description: msg });
    },
  });

  // ===================== Progress numbers =====================

  const totalSteps = steps.length + (totalCompanions > 0 ? totalCompanions : 0);
  const currentNum = (() => {
    let n = stepIdx + 1;
    if (renderStep === "companion") n += companionIdx;
    return Math.min(n, totalSteps);
  })();

  const ModalityIcon =
    modality.kind === "individual"
      ? User
      : modality.kind === "shared"
        ? Users
        : modality.kind === "couple"
          ? Heart
          : Sparkles;

  // ===================== Renderers =====================

  const watched = watch();

  const renderHolderName = () => (
    <QuizCard
      stepKey="holder-name"
      eyebrow="Sobre você"
      title="Como devemos te chamar?"
      description="Use seu nome completo, como está no documento."
      footer={<QuizActions onBack={goBack} onNext={goNext} disabled={!watched.name?.trim()} />}
    >
      <div className="space-y-1.5">
        <Label htmlFor="q-name">Nome completo</Label>
        <Input
          id="q-name"
          autoFocus
          autoComplete="name"
          placeholder="Ex.: Maria Silva Santos"
          value={watched.name ?? ""}
          onChange={(e) => setValue("name", e.target.value, { shouldValidate: false })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              goNext();
            }
          }}
          aria-invalid={!!formState.errors.name}
          className="h-12 text-base"
        />
        {formState.errors.name && (
          <p className="text-xs text-destructive">{formState.errors.name.message}</p>
        )}
      </div>
    </QuizCard>
  );

  const renderHolderContact = () => (
    <QuizCard
      stepKey="holder-contact"
      eyebrow="Contato"
      title="Onde te encontramos?"
      description="Vamos enviar a confirmação e o cupom (se Galera) por estes canais."
      footer={<QuizActions onBack={goBack} onNext={goNext} />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="q-wa">WhatsApp</Label>
          <Input
            id="q-wa"
            inputMode="tel"
            autoFocus
            placeholder="+55 (11) 99999-9999"
            value={maskWhatsApp(watched.whatsapp ?? "")}
            onChange={(e) =>
              setValue(
                "whatsapp",
                handlePhoneInputChange(e.target.value, watched.whatsapp ?? ""),
                { shouldValidate: false },
              )
            }
            aria-invalid={!!formState.errors.whatsapp}
            className="h-12 text-base"
          />
          {formState.errors.whatsapp && (
            <p className="text-xs text-destructive">{formState.errors.whatsapp.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="q-email">E-mail</Label>
          <Input
            id="q-email"
            type="email"
            inputMode="email"
            placeholder="voce@email.com"
            value={lockedEmail || watched.email || ""}
            readOnly={!!lockedEmail}
            disabled={!!lockedEmail}
            onChange={(e) => {
              if (lockedEmail) return;
              setValue("email", e.target.value, { shouldValidate: false });
            }}
            aria-invalid={!!formState.errors.email}
            className={`h-12 text-base ${lockedEmail ? "cursor-not-allowed opacity-80" : ""}`}
          />
          {lockedEmail && (
            <p className="text-[11px] text-muted-foreground">
              Usaremos o e-mail da sua conta. Para alterar, edite em <strong>Minha conta</strong>.
            </p>
          )}
          {formState.errors.email && (
            <p className="text-xs text-destructive">{formState.errors.email.message}</p>
          )}
        </div>
      </div>
      {needsAccount && (
        <div className="space-y-4 rounded-xl border border-border/60 bg-muted/30 p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand">
              Sua conta Way Home
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Crie uma senha — ao aceitar os termos enviamos um e-mail de
              confirmação para você concluir o pagamento.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="q-pw">Senha</Label>
              <PasswordInput
                id="q-pw"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="h-12"
                autoComplete="new-password"
              />
              {password.length > 0 && (
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full transition-all ${
                      ["bg-destructive", "bg-destructive", "bg-orange-500", "bg-yellow-500", "bg-emerald-500"][pwStrength.score]
                    }`}
                    style={{ width: `${(pwStrength.score / 4) * 100}%` }}
                  />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-pw2">Confirme a senha</Label>
              <PasswordInput
                id="q-pw2"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="h-12"
                autoComplete="new-password"
              />
              {passwordConfirm.length > 0 && passwordConfirm !== password && (
                <p className="text-[11px] text-destructive">As senhas não coincidem</p>
              )}
            </div>
          </div>
        </div>
      )}
    </QuizCard>
  );

  const renderHolderDoc = () => (
    <QuizCard
      stepKey="holder-doc"
      eyebrow="Documento"
      title="Seus documentos e origem"
      description="Precisamos do CPF para emitir a reserva e da cidade para organização."
      footer={<QuizActions onBack={goBack} onNext={goNext} />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="q-cpf">CPF</Label>
          <Input
            id="q-cpf"
            inputMode="numeric"
            autoFocus
            placeholder="000.000.000-00"
            value={maskCPF(watched.cpf ?? "")}
            onChange={(e) => setValue("cpf", onlyDigits(e.target.value), { shouldValidate: false })}
            maxLength={14}
            aria-invalid={!!formState.errors.cpf}
            className="h-12 text-base"
          />
          {formState.errors.cpf && (
            <p className="text-xs text-destructive">{formState.errors.cpf.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="q-city">Cidade de origem</Label>
          <Input
            id="q-city"
            placeholder="Ex.: São Paulo / SP"
            value={watched.city ?? ""}
            onChange={(e) => setValue("city", e.target.value, { shouldValidate: false })}
            aria-invalid={!!formState.errors.city}
            className="h-12 text-base"
          />
          {formState.errors.city && (
            <p className="text-xs text-destructive">{formState.errors.city.message}</p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Sexo</Label>
        <Controller
          control={control}
          name="gender"
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={(v) => field.onChange(v)}
              className="grid grid-cols-3 gap-2"
            >
              {GENDERS.map((opt) => (
                <label
                  key={opt.v}
                  htmlFor={`g-${opt.v}`}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-3 text-sm transition hover:border-brand/60 ${
                    field.value === opt.v ? "border-brand bg-brand/5" : ""
                  }`}
                >
                  <RadioGroupItem id={`g-${opt.v}`} value={opt.v} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </RadioGroup>
          )}
        />
        {formState.errors.gender && (
          <p className="text-xs text-destructive">{formState.errors.gender.message}</p>
        )}
      </div>
    </QuizCard>
  );

  const renderGroupRole = () => (
    <QuizCard
      stepKey="group-role"
      eyebrow="Modo Galera"
      title="Você já tem cupom do grupo?"
      description="Se um amigo comprou primeiro, ele recebeu um cupom único — cole para entrar no mesmo quarto. Se ninguém comprou ainda, você reserva o quarto Galera e geramos cupons para os outros 7."
      footer={<QuizActions onBack={goBack} onNext={goNext} disabled={!groupRole} />}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setGroupRole("member")}
          className={`group rounded-2xl border p-5 text-left transition ${
            groupRole === "member"
              ? "border-brand bg-brand/5 ring-2 ring-brand"
              : "border-border/60 hover:border-brand/60"
          }`}
        >
          <Users className="mb-2 h-6 w-6 text-brand" />
          <p className="font-semibold">Tenho cupom</p>
          <p className="text-xs text-muted-foreground">
            Vou entrar no grupo de quem comprou primeiro.
          </p>
        </button>
        <button
          type="button"
          onClick={() => setGroupRole("holder")}
          className={`group rounded-2xl border p-5 text-left transition ${
            groupRole === "holder"
              ? "border-brand bg-brand/5 ring-2 ring-brand"
              : "border-border/60 hover:border-brand/60"
          }`}
        >
          <Sparkles className="mb-2 h-6 w-6 text-brand" />
          <p className="font-semibold">Quero reservar o quarto</p>
          <p className="text-xs text-muted-foreground">
            Reserva 1 vaga agora. Após o pagamento, geramos 7 cupons para a galera entrar no mesmo quarto.
          </p>
        </button>
      </div>
    </QuizCard>
  );

  const renderGroupCoupon = () => (
    <QuizCard
      stepKey="group-coupon"
      eyebrow="Cupom do grupo"
      title="Cole o cupom que você recebeu"
      description="Validamos automaticamente e mostramos quantas vagas restam no quarto."
      footer={<QuizActions onBack={goBack} onNext={goNext} disabled={couponValid !== true} />}
    >
      <CouponField
        value={groupCoupon}
        onChange={setGroupCoupon}
        onValid={() => setCouponValid(true)}
        onInvalid={() => setCouponValid(groupCoupon ? false : null)}
      />
    </QuizCard>
  );

  const renderQuantity = () => (
    <QuizCard
      stepKey="quantity"
      eyebrow="Pessoas"
      title="Quantas pessoas vão com você?"
      description={`Você é o titular. Vamos pedir os dados de cada acompanhante depois. Mínimo ${minQty}, máximo ${maxQty}.`}
      footer={<QuizActions onBack={goBack} onNext={goNext} />}
    >
      <div className="space-y-1.5 sm:max-w-[220px]">
        <Label htmlFor="q-qty">Quantidade total</Label>
        <Input
          id="q-qty"
          type="number"
          autoFocus
          min={minQty}
          max={maxQty}
          value={watched.quantity ?? minQty}
          onChange={(e) =>
            setValue("quantity", Number(e.target.value || minQty), { shouldValidate: false })
          }
          aria-invalid={!!formState.errors.quantity}
          className="h-12 text-base"
        />
        {formState.errors.quantity && (
          <p className="text-xs text-destructive">{formState.errors.quantity.message}</p>
        )}
      </div>
    </QuizCard>
  );

  const renderCompanion = () => {
    const idx = companionIdx;
    const errs = formState.errors.companions?.[idx];
    const compCpf = watch(`companions.${idx}.cpf`);
    const compWa = watch(`companions.${idx}.whatsapp`);
    return (
      <QuizCard
        stepKey={`companion-${idx}`}
        eyebrow={`Acompanhante ${idx + 1} de ${totalCompanions}`}
        title={`Dados do acompanhante ${idx + 1}`}
        description="Mesmo padrão do titular: precisamos identificar todos os hóspedes."
        footer={
          <QuizActions
            onBack={goBack}
            onNext={goNext}
            nextLabel={
              idx + 1 < totalCompanions ? "Próximo acompanhante" : "Concluir e revisar"
            }
          />
        }
      >
        <div className="space-y-1.5">
          <Label>Nome completo</Label>
          <Input
            placeholder="Como está no documento"
            value={watch(`companions.${idx}.name`) ?? ""}
            onChange={(e) => setValue(`companions.${idx}.name`, e.target.value)}
            className="h-12 text-base"
          />
          {errs?.name && <p className="text-xs text-destructive">{errs.name.message}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>CPF</Label>
            <Input
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={maskCPF(compCpf ?? "")}
              onChange={(e) =>
                setValue(`companions.${idx}.cpf`, onlyDigits(e.target.value))
              }
              maxLength={14}
              className="h-12 text-base"
            />
            {errs?.cpf && <p className="text-xs text-destructive">{errs.cpf.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp</Label>
            <Input
              inputMode="tel"
              placeholder="+55 (11) 99999-9999"
              value={maskWhatsApp(compWa ?? "")}
              onChange={(e) =>
                setValue(`companions.${idx}.whatsapp`, toE164(e.target.value))
              }
              className="h-12 text-base"
            />
            {errs?.whatsapp && (
              <p className="text-xs text-destructive">{errs.whatsapp.message}</p>
            )}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input
              type="email"
              placeholder="acompanhante@email.com"
              value={watch(`companions.${idx}.email`) ?? ""}
              onChange={(e) => setValue(`companions.${idx}.email`, e.target.value)}
              className="h-12 text-base"
            />
            {errs?.email && <p className="text-xs text-destructive">{errs.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Data de nascimento</Label>
            <Input
              type="date"
              value={watch(`companions.${idx}.birthdate`) ?? ""}
              onChange={(e) => setValue(`companions.${idx}.birthdate`, e.target.value)}
              className="h-12 text-base"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Sexo</Label>
          <Controller
            control={control}
            name={`companions.${idx}.gender`}
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={(v) => field.onChange(v)}
                className="grid grid-cols-3 gap-2"
              >
                {GENDERS.map((opt) => (
                  <label
                    key={opt.v}
                    htmlFor={`cg-${idx}-${opt.v}`}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-3 text-sm transition hover:border-brand/60 ${
                      field.value === opt.v ? "border-brand bg-brand/5" : ""
                    }`}
                  >
                    <RadioGroupItem id={`cg-${idx}-${opt.v}`} value={opt.v} />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </RadioGroup>
            )}
          />
          {errs?.gender && <p className="text-xs text-destructive">{errs.gender.message}</p>}
        </div>
      </QuizCard>
    );
  };

  const renderReview = () => {
    const v = watched;
    const editBtn = (label: string, onClick: () => void) => (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClick}
        className="h-7 gap-1 px-2 text-xs"
      >
        <Pencil className="h-3 w-3" />
        {label}
      </Button>
    );
    return (
      <QuizCard
        stepKey="review"
        eyebrow="Revisão"
        title="Tudo certo? Confira antes de continuar"
        description="Você pode editar qualquer informação clicando em ✏️."
        footer={
          <QuizActions
            onBack={goBack}
            onNext={() => submitMutation.mutate()}
            nextLabel="Salvar e ir pros termos"
            nextIcon="check"
            loading={submitMutation.isPending}
          />
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-brand/20 bg-brand/5 p-3">
            <ModalityIcon className="mt-0.5 h-5 w-5 text-brand" />
            <div className="text-sm">
              <p className="font-semibold">{modality.name}</p>
              <p className="text-xs text-muted-foreground">
                {isGroup
                  ? groupRole === "holder"
                    ? `Modo Galera · você cria o grupo (${groupCapacity} pessoas)`
                    : `Modo Galera · entrando no grupo via cupom ${groupCoupon}`
                  : isIndividual
                    ? "Hospedagem individual"
                    : `${v.quantity} ${v.quantity === 1 ? "pessoa" : "pessoas"}`}
              </p>
            </div>
          </div>

          <ReviewBlock
            title="Titular"
            rows={[
              ["Nome", v.name],
              ["E-mail", v.email],
              ["WhatsApp", maskWhatsApp(v.whatsapp ?? "")],
              ["CPF", maskCPF(v.cpf ?? "")],
              ["Cidade", v.city],
              ["Sexo", GENDERS.find((g) => g.v === v.gender)?.label ?? "—"],
            ]}
            action={editBtn("Editar", () => goTo("holder-name"))}
          />

          {isGroup && groupRole === "member" && (
            <ReviewBlock
              title="Grupo"
              rows={[["Cupom", groupCoupon]]}
              action={editBtn("Editar", () => goTo("group-coupon"))}
            />
          )}
          {isGroup && groupRole === "holder" && (
            <ReviewBlock
              title="Grupo"
              rows={[
                ["Tipo", "Você reserva o quarto"],
                ["Capacidade", `Quarto Galera · até ${groupCapacity} pessoas`],
                ["Cupons", `${groupCapacity - 1} cupons gerados após o pagamento`],
              ]}
            />
          )}

          {supportsCompanions &&
            (companionsArr.fields.length === 0 ? null : (
              <ReviewBlock
                title={`Acompanhantes (${companionsArr.fields.length})`}
                rows={companionsArr.fields.map((f, i) => [
                  `${i + 1}. ${watch(`companions.${i}.name`) || "—"}`,
                  maskWhatsApp(watch(`companions.${i}.whatsapp`) ?? ""),
                ])}
                action={editBtn("Editar", () => {
                  setCompanionIdx(0);
                  goTo("quantity");
                })}
              />
            ))}
        </div>
      </QuizCard>
    );
  };

  const renderCurrent = () => {
    switch (renderStep) {
      case "holder-name":
        return renderHolderName();
      case "holder-contact":
        return renderHolderContact();
      case "holder-doc":
        return renderHolderDoc();
      case "group-role":
        return renderGroupRole();
      case "group-coupon":
        return renderGroupCoupon();
      case "quantity":
        return renderQuantity();
      case "companion":
        return renderCompanion();
      case "review":
        return renderReview();
    }
  };

  return (
    <div className="space-y-4">
      <QuizProgress
        current={currentNum}
        total={totalSteps}
        label={isGroup ? "Cadastro Galera" : isIndividual ? "Cadastro Individual" : "Cadastro"}
      />
      {renderCurrent()}
    </div>
  );
}

function ReviewBlock({
  title,
  rows,
  action,
}: {
  title: string;
  rows: [string, string][];
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        {action}
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11px] text-muted-foreground">{k}</dt>
            <dd className="font-medium break-words">{v || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}