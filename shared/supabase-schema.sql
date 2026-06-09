-- ============================================================
--  🐍 Python 3D Adventure — Multiplayer + Avatar Schema (v2)
--  ใช้ profiles table ของเว็บหลัก (ไม่ใช้ Supabase Auth)
--  วางทั้งหมดนี้ใน Supabase SQL editor แล้วกด Run ครั้งเดียว
-- ============================================================

-- ลบของเก่าก่อน (ถ้าเคย run เวอร์ชั่นแรก) — เริ่มต้นใหม่
drop table if exists py3d_room_players cascade;
drop table if exists py3d_rooms        cascade;
drop table if exists py3d_avatars      cascade;
drop table if exists py3d_profiles     cascade;

-- ============ Rooms ============
create table py3d_rooms (
  code         text primary key,
  host_id      text not null,            -- profiles.id (เก็บเป็น text เผื่อรองรับ int/uuid)
  level        int  not null default 1,
  mode         text not null default 'race',  -- 'race' | 'golf'
  status       text not null default 'waiting',  -- 'waiting' | 'playing' | 'finished'
  winner_id    text,
  level_seed   int  not null default 1,
  started_at   timestamptz,
  finished_at  timestamptz,
  created_at   timestamptz default now()
);
create index idx_py3d_rooms_status on py3d_rooms(status);

-- ============ Players in room ============
create table py3d_room_players (
  room_code    text references py3d_rooms(code) on delete cascade,
  user_id      text not null,
  display_name text not null,
  avatar       jsonb not null default '{}'::jsonb,
  is_ready     boolean not null default false,
  coins        int not null default 0,
  code_lines   int,
  finished_at  timestamptz,
  joined_at    timestamptz default now(),
  primary key (room_code, user_id)
);

-- ============ Saved Avatars ============
create table py3d_avatars (
  user_id    text primary key,
  avatar     jsonb not null default '{}'::jsonb,
  unlocked   jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- ============ Player Profile ภายในเกม (XP, wins) ============
create table py3d_profiles (
  user_id      text primary key,
  display_name text,
  xp           int not null default 0,
  wins         int not null default 0,
  losses       int not null default 0,
  levels_done  int not null default 0,
  updated_at   timestamptz default now()
);

-- ============ Realtime publication ============
-- ถ้า publication มีอยู่แล้วและตารางถูกเพิ่มไปแล้ว — บรรทัดนี้จะ error
-- ให้ไป Database → Replication ติ๊กเอาตารางเหล่านี้แทน
do $$ begin
  perform 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='py3d_rooms';
  if not found then
    alter publication supabase_realtime add table py3d_rooms;
  end if;
  perform 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='py3d_room_players';
  if not found then
    alter publication supabase_realtime add table py3d_room_players;
  end if;
end $$;

-- ============================================================
--  🔓 ROW LEVEL SECURITY — ปิด เพราะใช้ anon key + custom auth
-- ============================================================
-- หากต้องการความปลอดภัยมากกว่านี้ในอนาคต ค่อยเปิด RLS แล้วเขียน policy
alter table py3d_rooms        disable row level security;
alter table py3d_room_players disable row level security;
alter table py3d_avatars      disable row level security;
alter table py3d_profiles     disable row level security;

-- ============================================================
--  ✅ ตรวจสอบว่าตาราง profiles มี columns ที่จำเป็น
--  (ถ้ายังไม่มี อาจต้องเพิ่มเอง)
-- ============================================================
-- คาดหวัง profiles มี: id, email, password, name, class, no
-- ถ้าไม่ตรงให้ปรับ supabase-client.js ในส่วน showAuthModal
