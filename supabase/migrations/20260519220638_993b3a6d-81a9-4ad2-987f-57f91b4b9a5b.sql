-- 1. Update the check constraint on products.type
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_type_check;
ALTER TABLE public.products ADD CONSTRAINT products_type_check 
  CHECK (type = ANY (ARRAY['suite'::text, 'camping'::text, 'addon'::text, 'transfer'::text, 'reservation_modality'::text, 'other'::text]));

-- 2. Insert the 3 products into public.products
INSERT INTO public.products (
  slug,
  type,
  active,
  position,
  price_cents,
  currency,
  translations,
  metadata
) VALUES 
(
  'individual',
  'reservation_modality',
  true,
  1,
  200000,
  'BRL',
  '{
    "pt-BR": {
      "name": "Individual",
      "description": "Sua vaga garantida em quarto compartilhado, masculino ou feminino."
    }
  }',
  '{
    "modality_kind": "individual",
    "highlights": [
      "Quarto compartilhado (masculino ou feminino)",
      "Cama individual com roupa de cama",
      "Café da manhã incluso",
      "Acesso a todas as áreas Way Home"
    ]
  }'
),
(
  'galera',
  'reservation_modality',
  true,
  2,
  180000,
  'BRL',
  '{
    "pt-BR": {
      "name": "Quarto em Galera",
      "description": "Você dividirá o quarto com outras pessoas e economiza no valor por pessoa."
    }
  }',
  '{
    "modality_kind": "shared",
    "recommended": true,
    "economy_label": "Economize R$ 200 por pessoa",
    "highlights": [
      "Você dividirá o quarto com outras pessoas",
      "Melhor custo-benefício do Way Home",
      "Café da manhã incluso",
      "Ideal para quem vai com amigos"
    ]
  }'
),
(
  'casal',
  'reservation_modality',
  true,
  3,
  0,
  'BRL',
  '{
    "pt-BR": {
      "name": "Casal",
      "description": "Acomodação exclusiva para casal. Atendimento personalizado via WhatsApp."
    }
  }',
  '{
    "modality_kind": "couple",
    "checkout_mode": "whatsapp",
    "highlights": [
      "Quarto privativo para o casal",
      "Atendimento personalizado",
      "Valor sob consulta",
      "Reserva via WhatsApp"
    ]
  }'
);

-- 3. Update page_sections to remove hardcoded packages from the 'hospedagem' section
UPDATE public.page_sections
SET data = data - 'packages'
WHERE type = 'hospedagem' OR data->>'titleA' LIKE '%Encontre o pacote perfeito%';
