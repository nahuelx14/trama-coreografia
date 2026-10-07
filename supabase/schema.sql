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
