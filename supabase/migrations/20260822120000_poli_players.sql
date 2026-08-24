-- PoliRadar · players (1:1 with auth.users)
create table if not exists public.poli_players (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale text not null default 'es',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.poli_players enable row level security;

create policy "players_select_own"
  on public.poli_players for select
  to authenticated
  using (auth.uid() = id);

create policy "players_insert_own"
  on public.poli_players for insert
  to authenticated
  with check (auth.uid() = id);

create policy "players_update_own"
  on public.poli_players for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_poli_player()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.poli_players (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_poli on auth.users;
create trigger on_auth_user_created_poli
  after insert on auth.users
  for each row execute function public.handle_new_poli_player();
