alter table public.messages
  add column if not exists feedback text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_feedback_valid'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
      add constraint messages_feedback_valid
      check (feedback is null or feedback in ('like', 'dislike'));
  end if;
end $$;

-- Force PostgREST to refresh schema cache so new columns are recognized.
select pg_notify('pgrst', 'reload schema');
