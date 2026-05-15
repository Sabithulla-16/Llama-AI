do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'messages_model_check'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
      drop constraint messages_model_check;
  end if;
end $$;

alter table public.messages
  add constraint messages_model_check
  check (model in ('llama', 'qwen', 'coder', 'mini', 'smart', 'fast'));

select pg_notify('pgrst', 'reload schema');
