UPDATE page_sections
SET data = jsonb_set(
  data,
  '{packages}',
  '[
    {
      "name": "Individual",
      "kind": "individual",
      "capacity": "Sua vaga garantida em quarto compartilhado, masculino ou feminino.",
      "price": "R$ 2.000,00",
      "priceLabel": "Valor por pessoa",
      "badge": "Disponível",
      "badgeTone": "available",
      "bathroom": "",
      "includes": [
        "Quarto compartilhado (masculino ou feminino)",
        "Cama individual com roupa de cama",
        "Café da manhã incluso",
        "Acesso a todas as áreas Way Home"
      ],
      "slug": "individual",
      "ctaUrl": "/reservation"
    },
    {
      "name": "Quarto em Galera",
      "kind": "shared",
      "capacity": "Você dividirá o quarto com outras pessoas e economiza no valor por pessoa.",
      "price": "R$ 1.800,00",
      "priceLabel": "Valor por pessoa",
      "badge": "Recomendado",
      "badgeTone": "last",
      "recommended": true,
      "bathroom": "Economize R$ 200 por pessoa",
      "altPrice": "Máximo de 8 pessoas por quarto",
      "includes": [
        "Você dividirá o quarto com outras pessoas",
        "Melhor custo-benefício do Way Home",
        "Café da manhã incluso",
        "Ideal para quem vai com amigos"
      ],
      "slug": "galera",
      "ctaUrl": "/reservation"
    },
    {
      "name": "Casal",
      "kind": "couple",
      "capacity": "Acomodação exclusiva para casal. Atendimento personalizado via WhatsApp.",
      "price": "Sob consulta",
      "priceLabel": "por casal",
      "badge": "Sob consulta",
      "badgeTone": "available",
      "bathroom": "",
      "includes": [
        "Quarto privativo para o casal",
        "Atendimento personalizado",
        "Valor sob consulta",
        "Reserva via WhatsApp"
      ],
      "isWhatsapp": true,
      "ctaLabel": "Falar no WhatsApp",
      "slug": "casal",
      "ctaUrl": "/contato"
    }
  ]'::jsonb
)
WHERE type = 'hospedagem'
  AND page_id = (SELECT id FROM pages WHERE slug = 'home');