alter table public.messages
  add column if not exists generation_ms integer;

select pg_notify('pgrst', 'reload schema');
