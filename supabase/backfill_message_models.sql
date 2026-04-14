-- One-time backfill for historical assistant model metadata.
-- Safe with mixed content formats:
-- 1) plain text assistant rows
-- 2) JSON assistant rows like {"type":"text","data":"..."} and image payloads

create or replace function public.try_parse_jsonb(value text)
returns jsonb
language plpgsql
immutable
as $$
begin
  return value::jsonb;
exception
  when others then
    return null;
end;
$$;

-- Keep model_used aligned when legacy model already exists.
update public.messages
set model_used = model
where role = 'assistant'
  and model_used is null
  and model is not null;

with assistant_candidates as (
  select
    m.id,
    m.conversation_id,
    m.parent_id,
    m.created_at,
    m.content,
    public.try_parse_jsonb(m.content) as payload
  from public.messages m
  where m.role = 'assistant'
    and m.model_used is null
),
inferred as (
  select
    c.id,
    coalesce(
      -- Assistant image payload rows from image-gen API should be labeled as sd-turbo.
      case
        when c.payload is not null
         and jsonb_typeof(c.payload) = 'object'
         and lower(coalesce(c.payload->>'type', '')) = 'image'
        then 'sd-turbo'
      end,
      -- If payload explicitly contains model, trust it.
      case
        when c.payload is not null
         and jsonb_typeof(c.payload) = 'object'
         and lower(coalesce(c.payload->>'model', '')) in ('llama', 'qwen', 'coder', 'mini', 'smart', 'image', 'blimp', 'sd-turbo')
        then lower(c.payload->>'model')
      end,
      -- In branch flows, inherit from the parent assistant when available.
      case
        when p.id is not null then lower(coalesce(p.model_used, p.model))
      end,
      -- If previous user turn is an uploaded image, this assistant is blip-derived.
      case
        when pu.payload is not null
         and jsonb_typeof(pu.payload) = 'object'
         and lower(coalesce(pu.payload->>'type', '')) = 'image'
        then 'blimp'
      end,
      -- Final fallback for unresolved historical rows.
      'llama'
    ) as inferred_model
  from assistant_candidates c
  left join public.messages p
    on p.id = c.parent_id
   and p.role = 'assistant'
  left join lateral (
    select public.try_parse_jsonb(u.content) as payload
    from public.messages u
    where u.conversation_id = c.conversation_id
      and u.role = 'user'
      and u.created_at <= c.created_at
    order by u.created_at desc
    limit 1
  ) pu on true
)
update public.messages m
set
  model_used = i.inferred_model,
  model = case
    -- model column supports only text-model subset by schema constraint.
    when i.inferred_model in ('llama', 'qwen', 'coder', 'mini', 'smart')
      then coalesce(m.model, i.inferred_model)
    else m.model
  end
from inferred i
where m.id = i.id
  and m.model_used is null;

-- Optional alignment: where model_used is text-model and model is missing, fill model too.
update public.messages
set model = model_used
where role = 'assistant'
  and model is null
  and model_used in ('llama', 'qwen', 'coder', 'mini', 'smart');

select pg_notify('pgrst', 'reload schema');
