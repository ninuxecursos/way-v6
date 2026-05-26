
# Página individual "Way Connect" (/hospedagem/way-connect)

A modalidade `way-connect` já existe em `products` com nome, preço (R$ 2.040), descrição, capacidade, alt-price e highlights nos três idiomas (PT/EN/ES). A página vai consumir esses dados — qualquer edição feita no admin (`admin.products_.$id`) reflete automaticamente.

O botão **Reservar** dos cards de hospedagem na home vai abrir esta página apenas para a modalidade Way Connect; as demais (Way Squad etc.) continuam indo direto para `/reservation`.

## Arquivos

- **`src/routes/hospedagem.way-connect.tsx`** (novo) — rota estática dedicada. SSR-friendly: usa `loader` com `ensureQueryData` em cima de `getModalityBySlug("way-connect", locale)` (já existe em `src/repositories/products.repo.ts`). Inclui `head()` completo (title, description, og:title, og:description, og:type=product, og:image, canonical).
- **`src/components/wh/Hospedagem.tsx`** (edição cirúrgica em `src/components/wh/sections/Hospedagem.tsx`) — quando `p.slug === "way-connect"`, o CTA "Reservar" passa a apontar para `to="/hospedagem/way-connect"` (sem `search`); todos os outros mantêm `to="/reservation"` com `search={{ modality }}`. Cards "esgotado" e WhatsApp continuam intactos.

Sem migrations, sem mudanças no admin, sem libs novas, sem alterar Footer/Header globais.

## Estrutura visual da página (fiel ao mood da arte enviada)

Usa exclusivamente tokens do design system (`--background`, `--brand`, `--ink`, `--ink-soft`, `--line`, `--card`) — mesma paleta escura + magenta da home.

1. **Hero "Sua casa no Tomorrowland Brasil 2025"**
   - Fundo escuro com símbolo bússola Way Home (`wayhome-symbol-white.svg`) no topo centralizado.
   - Eyebrow magenta uppercase `WAY CONNECT · HOSPEDAGEM INDIVIDUAL`.
   - H1 display: "SUA CASA NO **TOMORROWLAND** BRASIL 2025" (parte do meio em magenta itálico).
   - Subtítulo: descrição PT/EN/ES vinda de `modality.description`.
   - CTA primário magenta "Reservar agora" → `/reservation?modality=way-connect`.
   - Imagem do ônibus / ambiente recortada com máscara suave (placeholder a partir de uma das imagens já em `public/wh/`; usuário substitui depois pela foto oficial do quarto Way Connect).

2. **Faixa de features (grid de 7 ícones)**
   - Card escuro arredondado, divisores verticais magenta sutis.
   - Pulled direto de `metadata.highlights` (PT/EN/ES) + ícones mapeados por palavra-chave (8 Pessoas → `Users`, Ar-condicionado → `Snowflake`, TV → `Tv`, Frigobar → `Refrigerator`, Banheiro → `Bath`, Experiência social → `Sparkles`, Conexões → `HeartHandshake`). Fallback para `CheckCircle2` se não houver match.
   - Mobile: grid 2 colunas com scroll-snap suave.

3. **Bloco "O que está incluso"**
   - Duas colunas no desktop / stack no mobile.
   - Esquerda: card escuro com ícone `BedDouble` magenta, título "Quarto compartilhado masculino ou feminino" e subtítulo de `capacity`.
   - Direita: checklist (`CheckCircle2` magenta) com `highlights` + `Café da manhã incluso · Acesso a todas as áreas Way Home · Cama individual com roupa de cama`.

4. **Card de preço sticky (desktop) / fixo no fim (mobile)**
   - Replica o card de modalidade da home mas em destaque maior: preço grande magenta `formatCurrency(price_cents)`, label `por pessoa`, `altPrice` ("Conforto e privacidade") em chip verde.
   - CTA principal "Garantir minha vaga" → `/reservation?modality=way-connect`.
   - CTA secundário "Tenho dúvidas no WhatsApp" → link configurado (mesmo do FAB).
   - Selo magenta translúcido: "Últimas vagas disponíveis" (mostra só quando `recommended` no metadata).

5. **Seção "Por que escolher o Way Connect?"**
   - 3 cards: "Para quem vai sozinho", "Comunidade Way Home", "Conforto garantido". Texto curto, ícone magenta no topo.

6. **CTA final** — "Garanta sua hospedagem hoje mesmo!" display gigante + botão magenta. Mesma linguagem do bloco final da home.

7. **Logo + footer interno** — `wayhome-slogan-white.svg` + linha discreta "Way Connect é parte da experiência oficial Way Home no Tomorrowland Brasil 2025".

## Detalhes técnicos

- Rota TanStack: `createFileRoute("/hospedagem/way-connect")` — gera `/hospedagem/way-connect`. Não preciso de rota pai layout.
- Loader: `context.queryClient.ensureQueryData({ queryKey: ["modality","way-connect",locale], queryFn: () => getModalityBySlug("way-connect", locale) })`. Component usa `useSuspenseQuery`. Se retornar `null` → `throw notFound()`.
- i18n: usa `useLocale()` para passar o locale correto ao repo. Strings fixas da página (eyebrow, títulos das seções, CTA) lidas de `useT()` com fallback em PT (consistente com o padrão do `Hospedagem.tsx`).
- SEO: `head()` recebe `loaderData` e popula title/description com `name`/`description` do produto. `og:image` aponta para `cover_image_url` se existir, senão omitido. Canonical relativo (`/hospedagem/way-connect`).
- Performance: imagens `.webp` com `loading="lazy"` exceto hero (`fetchpriority="high"` + `preload` em `links`). Sem framer-motion.
- Responsive: layout mobile-first; sticky de preço só em `lg:`. Mobile mostra CTA fixo no rodapé via `fixed bottom-0` com `pb-safe`.
- `errorComponent` e `notFoundComponent` definidos na rota.

## Mudança no Hospedagem.tsx

Trecho atual do CTA já passa `search={p.slug ? { modality: p.slug } : undefined}`. Adicionar antes do `<Link>`:

```tsx
const detailHref = p.slug === "way-connect" ? "/hospedagem/way-connect" : "/reservation";
const detailSearch = p.slug === "way-connect" ? undefined : (p.slug ? { modality: p.slug } : undefined);
```

E usar `to={detailHref} search={detailSearch}`. Resto do botão (label, ícones, estilos) permanece igual. Soldout/WhatsApp não mudam comportamento.

## Fora de escopo

- Não criar /hospedagem/way-squad nem rotas para outras modalidades.
- Não mexer no checkout, RLS, ou no produto no banco.
- Não trocar a imagem oficial — usar um placeholder de `public/wh/` até receber a foto do quarto Way Connect.
