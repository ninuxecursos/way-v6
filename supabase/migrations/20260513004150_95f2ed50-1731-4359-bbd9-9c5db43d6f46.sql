update public.page_sections ps
set data_i18n = jsonb_set(
  ps.data_i18n,
  '{pt-BR}',
  coalesce((
    select jsonb_object_agg(t.k, t.v)
    from jsonb_each(ps.data_i18n->'pt-BR') as t(k, v)
    where (not (ps.data ? t.k)) or (ps.data->t.k) is distinct from t.v
  ), '{}'::jsonb),
  true
)
where ps.data_i18n ? 'pt-BR';