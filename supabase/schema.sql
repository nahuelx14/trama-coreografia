create table if not exists public.choreographies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists choreographies_user_updated_idx
  on public.choreographies (user_id, updated_at desc);

alter table public.choreographies
  add column if not exists share_code text,
  add column if not exists audio_path text,
  add column if not exists audio_name text;

update public.choreographies
set share_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
where share_code is null;

alter table public.choreographies
  alter column share_code set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  alter column share_code set not null;

create unique index if not exists choreographies_share_code_idx
  on public.choreographies (share_code);

alter table public.choreographies enable row level security;

revoke all on table public.choreographies from anon, authenticated;
grant select, insert, update, delete on table public.choreographies to authenticated;

drop policy if exists "Users read their own choreographies" on public.choreographies;
create policy "Users read their own choreographies"
  on public.choreographies for select
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users create their own choreographies" on public.choreographies;
create policy "Users create their own choreographies"
  on public.choreographies for insert
  to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users update their own choreographies" on public.choreographies;
create policy "Users update their own choreographies"
  on public.choreographies for update
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users delete their own choreographies" on public.choreographies;
create policy "Users delete their own choreographies"
  on public.choreographies for delete
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create or replace function public.copy_choreography_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_row public.choreographies%rowtype;
  new_id uuid;
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into source_row
  from public.choreographies
  where share_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));

  if not found then
    raise exception 'Invalid share code';
  end if;

  insert into public.choreographies (user_id, name, data, audio_path, audio_name)
  values (
    current_user_id,
    left(source_row.name || ' copia', 60),
    source_row.data,
    source_row.audio_path,
    source_row.audio_name
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.copy_choreography_by_code(text) from public, anon;
grant execute on function public.copy_choreography_by_code(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'choreography-audio',
  'choreography-audio',
  false,
  52428800,
  array['audio/mpeg', 'audio/mp3', 'audio/x-mpeg-3']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users read audio from their choreographies" on storage.objects;
create policy "Users read audio from their choreographies"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'choreography-audio'
    and exists (
      select 1
      from public.choreographies
      where choreographies.user_id = (select auth.uid())
        and choreographies.audio_path = storage.objects.name
    )
  );

drop policy if exists "Users upload their choreography audio" on storage.objects;
create policy "Users upload their choreography audio"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'choreography-audio'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users remove their uploaded choreography audio" on storage.objects;
create policy "Users remove their uploaded choreography audio"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'choreography-audio'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
