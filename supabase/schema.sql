-- Run in Supabase SQL editor.

create table if not exists rooms (
  id text primary key,
  state text not null default 'lobby',        -- lobby | photo | caption | vote | reveal | done
  round int not null default 0,
  total_rounds int not null default 4,
  photographer_id uuid,
  photo_url text,
  round_ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references rooms(id) on delete cascade,
  name text not null,
  score int not null default 0,
  seat int not null,
  joined_at timestamptz not null default now()
);
create index if not exists players_room_idx on players(room_id);

create table if not exists captions (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references rooms(id) on delete cascade,
  round int not null,
  player_id uuid not null references players(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now(),
  unique (room_id, round, player_id)
);
create index if not exists captions_room_round_idx on captions(room_id, round);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references rooms(id) on delete cascade,
  round int not null,
  voter_id uuid not null references players(id) on delete cascade,
  caption_id uuid not null references captions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (room_id, round, voter_id)
);
create index if not exists votes_room_round_idx on votes(room_id, round);

-- Enable realtime (Supabase: add these tables to the supabase_realtime publication)
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table captions;
alter publication supabase_realtime add table votes;

-- Permissive RLS for prototype. Tighten before shipping publicly.
alter table rooms    enable row level security;
alter table players  enable row level security;
alter table captions enable row level security;
alter table votes    enable row level security;

create policy "public read rooms"    on rooms    for select using (true);
create policy "public write rooms"   on rooms    for all    using (true) with check (true);
create policy "public read players"  on players  for select using (true);
create policy "public write players" on players  for all    using (true) with check (true);
create policy "public read captions" on captions for select using (true);
create policy "public write captions"on captions for all    using (true) with check (true);
create policy "public read votes"    on votes    for select using (true);
create policy "public write votes"   on votes    for all    using (true) with check (true);

-- Storage bucket for photos.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

create policy "public photo read"   on storage.objects for select using (bucket_id = 'photos');
create policy "public photo write"  on storage.objects for insert with check (bucket_id = 'photos');
