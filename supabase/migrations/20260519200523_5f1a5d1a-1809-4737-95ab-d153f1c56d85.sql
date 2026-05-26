
-- HERO
UPDATE public.page_sections
SET data = jsonb_set(
  COALESCE(data, '{}'::jsonb),
  '{images}',
  '{
    "background": "/wh-restore/h-spede-way-home-a-caminho-do-tomorrowla-0f90b8bb11.webp",
    "avatar1": "/wh-restore/img-76197281a9.webp",
    "avatar2": "/wh-restore/img-99d6b27758.webp",
    "avatar3": "/wh-restore/img-151804e7c6.webp",
    "avatar4": "/wh-restore/img-4f86aec5bf.webp"
  }'::jsonb,
  true
)
WHERE id = 'b9d60f1e-2dad-4ff0-9628-65b8fc3aede1';

-- EXPERIENCE
UPDATE public.page_sections
SET data = jsonb_set(
  COALESCE(data, '{}'::jsonb),
  '{images}',
  '{
    "big1": "/wh-restore/hospedagem-confort-vel-dcc4ed15c9.webp",
    "big2": "/wh-restore/transfer-incluso-4c37e6feb3.webp",
    "small1": "/wh-restore/experi-ncia-cont-nua-e039c7458e.webp",
    "small2": "/wh-restore/caf-da-manh-f5aabc251e.webp",
    "small3": "/wh-restore/kits-especiais-be8900782b.webp"
  }'::jsonb,
  true
)
WHERE id = 'b39cae28-056e-46eb-9d36-513a69da8aeb';

-- HOSPEDAGEM (packages com preços do site oficial)
UPDATE public.page_sections
SET data = data
  || jsonb_build_object(
    'packages', '[
      {
        "name": "Individual",
        "capacity": "1 pessoa",
        "priceLabel": "Valor por pessoa",
        "price": "R$ 2.000",
        "badge": "Disponível",
        "badgeTone": "available",
        "includes": [
          "Hospedagem confortável",
          "Transfer ida e volta ao Tomorrowland",
          "Café da manhã e lanches",
          "Kit Way Home",
          "Kit de redução de danos e higiene",
          "Área de piscina e descanso",
          "Interações e momentos especiais"
        ],
        "bathroom": "Banheiro compartilhado",
        "altPrice": "",
        "ctaUrl": "/reservation"
      },
      {
        "name": "Galera",
        "capacity": "Grupos a partir de 4 pessoas",
        "priceLabel": "Valor por pessoa",
        "price": "R$ 1.800",
        "badge": "Últimas vagas",
        "badgeTone": "last",
        "includes": [
          "Hospedagem em grupo",
          "Transfer ida e volta ao Tomorrowland",
          "Café da manhã e lanches",
          "Kit Way Home",
          "Kit de redução de danos e higiene",
          "Área de piscina e descanso",
          "Interações e momentos especiais"
        ],
        "bathroom": "Banheiro compartilhado",
        "altPrice": "",
        "ctaUrl": "/reservation"
      },
      {
        "name": "Casal",
        "capacity": "2 pessoas",
        "priceLabel": "Valor sob consulta",
        "price": "Sob consulta",
        "badge": "Sob consulta",
        "badgeTone": "available",
        "includes": [
          "Suíte privativa para casal",
          "Transfer ida e volta ao Tomorrowland",
          "Café da manhã e lanches",
          "Kit Way Home",
          "Kit de redução de danos e higiene",
          "Área de piscina e descanso",
          "Interações e momentos especiais"
        ],
        "bathroom": "Banheiro privativo",
        "altPrice": "",
        "ctaUrl": "/contato"
      }
    ]'::jsonb
  )
WHERE id = '28a63ecd-214e-488b-8e97-25af8f2f9451';

-- LOCATION
UPDATE public.page_sections
SET data = jsonb_set(
  COALESCE(data, '{}'::jsonb),
  '{images}',
  '{
    "map": "/wh-restore/mapa-da-regi-o-do-tomorrowland-brasil-e1681b2e2d.jpg"
  }'::jsonb,
  true
)
WHERE id = 'fd687c67-a2c9-41a7-a868-f540f5c6794c';

-- FEEDBACK (avatares)
UPDATE public.page_sections
SET data = jsonb_set(
  COALESCE(data, '{}'::jsonb),
  '{images}',
  '{
    "avatar1": "/wh-restore/img-76197281a9.webp",
    "avatar2": "/wh-restore/img-99d6b27758.webp",
    "avatar3": "/wh-restore/img-151804e7c6.webp",
    "avatar4": "/wh-restore/img-4f86aec5bf.webp",
    "avatar5": "/wh-restore/img-76197281a9.webp",
    "avatar6": "/wh-restore/img-99d6b27758.webp"
  }'::jsonb,
  true
)
WHERE id = '94c32744-4c52-44b4-951a-ee461e0c3898';
