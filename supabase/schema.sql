-- Grind Buddy · Supabase schema
-- Run this once in Supabase → SQL Editor → New query → Run.
-- Everything is scoped to a "team" (you + your prep buddy). Members read the
-- whole team's data; each person writes only their own progress.

create extension if not exists pgcrypto;

-- ── tables ────────────────────────────────────────────────────────────────
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 60),
  invite_code text not null unique,
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id   uuid not null references public.teams(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  nick      text not null default '' check (char_length(nick) <= 30),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists public.plans (
  team_id    uuid not null references public.teams(id) on delete cascade,
  week_start date not null,
  lc_target  int  not null default 15 check (lc_target between 0 and 150),
  sd_target  int  not null default 2  check (sd_target between 0 and 50),
  mode       text not null default 'focus' check (mode in ('focus','random')),
  focus      text[] not null default '{}',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (team_id, week_start)
);

create table if not exists public.progress (
  team_id    uuid not null references public.teams(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('lc','sd')),
  problem_id text not null,
  level      int  not null check (level between 0 and 4),
  updated_at timestamptz not null default now(),
  primary key (team_id, user_id, kind, problem_id)
);

create table if not exists public.passes (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('lc','sd')),
  problem_id text not null,
  from_level int  not null check (from_level between 0 and 4),
  created_at timestamptz not null default now()
);
create index if not exists passes_team_idx on public.passes (team_id, created_at);

create table if not exists public.queues (
  team_id    uuid not null references public.teams(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  kind       text not null check (kind in ('lc','sd')),
  items      text[] not null default '{}',
  primary key (team_id, user_id, week_start, kind)
);

-- ── helpers ───────────────────────────────────────────────────────────────
create or replace function public.is_member(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from team_members where team_id = t and user_id = auth.uid());
$$;

create or replace function public.create_team(team_name text, my_nick text)
returns public.teams language plpgsql security definer set search_path = public as $$
declare t teams;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into teams (name, invite_code, created_by)
  values (team_name, upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)), auth.uid())
  returning * into t;
  insert into team_members (team_id, user_id, nick) values (t.id, auth.uid(), coalesce(my_nick, ''));
  return t;
end $$;

create or replace function public.join_team(code text, my_nick text)
returns public.teams language plpgsql security definer set search_path = public as $$
declare t teams;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into t from teams where invite_code = upper(trim(code));
  if t.id is null then raise exception 'invite code not found'; end if;
  insert into team_members (team_id, user_id, nick) values (t.id, auth.uid(), coalesce(my_nick, ''))
  on conflict (team_id, user_id) do update set nick = excluded.nick;
  return t;
end $$;

-- ── row level security ───────────────────────────────────────────────────
alter table public.teams        enable row level security;
alter table public.team_members enable row level security;
alter table public.plans        enable row level security;
alter table public.progress     enable row level security;
alter table public.passes       enable row level security;
alter table public.queues       enable row level security;

drop policy if exists "members read team" on public.teams;
create policy "members read team" on public.teams for select using (public.is_member(id));

drop policy if exists "members read members" on public.team_members;
create policy "members read members" on public.team_members for select using (public.is_member(team_id));
drop policy if exists "edit own membership" on public.team_members;
create policy "edit own membership" on public.team_members for update using (user_id = auth.uid());
drop policy if exists "leave team" on public.team_members;
create policy "leave team" on public.team_members for delete using (user_id = auth.uid());

-- plans: shared, any member can set the weekly plan
drop policy if exists "members read plans" on public.plans;
create policy "members read plans" on public.plans for select using (public.is_member(team_id));
drop policy if exists "members write plans" on public.plans;
create policy "members write plans" on public.plans for all
  using (public.is_member(team_id)) with check (public.is_member(team_id));

-- progress / passes / queues: everyone in the team reads, each writes their own
do $$
declare tbl text;
begin
  foreach tbl in array array['progress','passes','queues'] loop
    execute format('drop policy if exists "members read" on public.%I', tbl);
    execute format('create policy "members read" on public.%I for select using (public.is_member(team_id))', tbl);
    execute format('drop policy if exists "own rows" on public.%I', tbl);
    execute format('create policy "own rows" on public.%I for all using (user_id = auth.uid() and public.is_member(team_id)) with check (user_id = auth.uid() and public.is_member(team_id))', tbl);
  end loop;
end $$;

-- ── grants (works even if "automatically expose new tables" is off) ─────
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.teams, public.team_members, public.plans, public.progress, public.passes, public.queues
  to authenticated;
grant execute on function public.is_member(uuid), public.create_team(text, text), public.join_team(text, text)
  to authenticated;

-- ── realtime: live updates when your buddy checks something off ─────────
do $$
declare tbl text;
begin
  foreach tbl in array array['team_members','plans','progress','passes','queues'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
