alter table public.messages
  add column if not exists model_used text;

-- Keep legacy and new model columns aligned where possible for existing rows.
update public.messages
set model_used = model
where model_used is null and model is not null;

-- Force PostgREST to refresh schema cache so new columns are recognized.
select pg_notify('pgrst', 'reload schema');
