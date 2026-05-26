-- Limpa chaves "shadow" em data_i18n['pt-BR'] que duplicam o conteúdo de `data`.
-- Isso resolve o bug em que edições no admin não refletiam no site público:
-- valores antigos de pt-BR continuavam sobrescrevendo o `data` recém-salvo.
update public.page_sections ps
set data_i18n = jsonb_set(
  ps.data_i18n,
  '{pt-BR}',
  coalesce((
    select jsonb_object_agg(t.k, t.v)
    from jsonb_each(ps.data_i18n->'pt-BR') as t(k, v)
    where ps.data ? t.k = false or ps.data->t.k <> t.v
  ), '{}'::jsonb),
  true
)
where ps.data_i18n ? 'pt-BR';