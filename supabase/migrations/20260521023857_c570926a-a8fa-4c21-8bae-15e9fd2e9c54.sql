
UPDATE public.page_sections
SET data = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          data,
          '{benefits}',
          '[
            {"icon":"Music","title":"Festas exclusivas","text":"Temas exclusivos e DJs convidados só para hóspedes Way Home."},
            {"icon":"Gift","title":"Kits Exclusivos Way Home","text":"Kit Way Home, kit redução de danos e kit de higiene — tudo o que você precisa para curtir tranquilo."},
            {"icon":"Users","title":"Comunidade","text":"Conheça gente do mundo todo."},
            {"icon":"Sparkles","title":"Surpresas","text":"Ativações e experiências exclusivas."}
          ]'::jsonb
        ),
        '{info}',
        '[
          {"label":"Festas exclusivas","value":"Pré e pós festival"},
          {"label":"Kits Way Home","value":"Inclusos na hospedagem"},
          {"label":"Áreas de convivência","value":"24h"},
          {"label":"Surpresas","value":"Ativações exclusivas"}
        ]'::jsonb
      ),
      '{institutional,text}',
      '"Temas exclusivos, kits Way Home e uma comunidade global vivendo o Tomorrowland Brasil junto com você — antes, durante e depois."'::jsonb
    ),
    '{subtitle}',
    '"Festas exclusivas, kits Way Home e ambiente de comunidade."'::jsonb
  ),
  '{intro}',
  '"Antes e depois do Tomorrowland Brasil, a Way Home entrega temas exclusivos, kits especiais e espaços de convivência para a sua galera."'::jsonb
)
WHERE id = 'dce630d3-a9e5-4eaf-945d-1c99947b98f2';
