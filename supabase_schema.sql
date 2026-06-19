-- =====================================================================
--  מערכת ניהול רחפנים — סכמת Supabase (טבלאות, הרשאות, יומן, זריעה)
--  להריץ פעם אחת ב: Supabase → SQL Editor → New query → Run
-- =====================================================================

-- ---------- פרופילים (משתמשים + תפקיד) ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  username   text unique,
  full_name  text default '',
  role       text not null default 'viewer' check (role in ('admin','editor','viewer')),
  active      boolean not null default true,
  created_at timestamptz default now()
);

-- ---------- פונקציות עזר (לזיהוי המשתמש הנוכחי בצד השרת) ----------
create or replace function public.my_role() returns text
  language sql security definer stable set search_path=public as
$$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.my_username() returns text
  language sql security definer stable set search_path=public as
$$ select username from public.profiles where id = auth.uid() $$;

create or replace function public.is_active() returns boolean
  language sql security definer stable set search_path=public as
$$ select coalesce((select active from public.profiles where id = auth.uid()), false) $$;

create or replace function public.can_edit() returns boolean
  language sql security definer stable set search_path=public as
$$ select public.is_active() and public.my_role() in ('admin','editor') $$;

-- ---------- יצירת פרופיל אוטומטית בהרשמה ----------
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path=public as
$$
begin
  insert into public.profiles(id, username, full_name, role, active)
  values (new.id,
          split_part(new.email,'@',1),
          coalesce(new.raw_user_meta_data->>'full_name',''),
          'viewer', true);
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- טבלאות נתונים ----------
create table if not exists public.companies (
  name text primary key
);

create table if not exists public.drone_types (
  name text primary key
);

create table if not exists public.catalog_items (
  drone_type text not null references public.drone_types(name) on delete cascade,
  num int not null,
  name text not null,
  is_primary boolean not null default false,
  primary key (drone_type, num)
);

create table if not exists public.kits (
  drone_type text not null references public.drone_types(name) on delete cascade,
  num int not null,
  status text not null default 'זמין' check (status in ('זמין','מושאל','באפסון')),
  notes text default '',
  primary key (drone_type, num)
);

create table if not exists public.soldiers (
  name text primary key,
  mispar text default '',
  rank text default '',
  company text default ''
);

create table if not exists public.signouts (
  id bigserial primary key,
  soldier_name text not null,
  mispar text default '',
  rank text default '',
  company text default '',
  issuer text default '',
  drone_type text not null,
  kit_num int not null,
  items jsonb not null default '[]',
  date_out date,
  date_target date,
  status text not null default 'פעיל' check (status in ('פעיל','הוחזר')),
  date_return date,
  returned_items jsonb default '[]',
  missing jsonb default '[]',
  return_notes text default '',
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);

create table if not exists public.audit_log (
  id bigserial primary key,
  at timestamptz default now(),
  user_id uuid,
  username text,
  role text,
  action text,
  entity text,
  entity_id text,
  details jsonb
);

-- ---------- טריגר יומן כללי (מי עשה מה) ----------
create or replace function public.audit_trigger() returns trigger
  language plpgsql security definer set search_path=public as
$$
declare rec jsonb;
begin
  if (tg_op = 'DELETE') then rec := to_jsonb(old);
  else rec := to_jsonb(new); end if;
  insert into public.audit_log(user_id, username, role, action, entity, entity_id, details)
  values (auth.uid(), public.my_username(), public.my_role(),
          tg_op, tg_table_name,
          coalesce((rec->>'id'), (rec->>'drone_type')||'#'||(rec->>'num')),
          rec);
  return null;
end;
$$;

drop trigger if exists audit_signouts on public.signouts;
create trigger audit_signouts after insert or update or delete on public.signouts
  for each row execute function public.audit_trigger();
drop trigger if exists audit_kits on public.kits;
create trigger audit_kits after update or delete on public.kits
  for each row execute function public.audit_trigger();
drop trigger if exists audit_catalog on public.catalog_items;
create trigger audit_catalog after insert or update or delete on public.catalog_items
  for each row execute function public.audit_trigger();

-- =====================================================================
--  הרשאות (RLS) — נאכפות בצד השרת, לא ניתנות לעקיפה מהדפדפן
-- =====================================================================
alter table public.profiles       enable row level security;
alter table public.companies      enable row level security;
alter table public.drone_types    enable row level security;
alter table public.catalog_items  enable row level security;
alter table public.kits           enable row level security;
alter table public.soldiers       enable row level security;
alter table public.signouts       enable row level security;
alter table public.audit_log      enable row level security;

-- profiles: כל משתמש מחובר רואה שמות/תפקידים; רק מנהל משנה
drop policy if exists profiles_read  on public.profiles;
drop policy if exists profiles_admin on public.profiles;
create policy profiles_read   on public.profiles for select to authenticated using (true);
create policy profiles_admin  on public.profiles for update to authenticated using (public.my_role()='admin') with check (public.my_role()='admin');

-- טבלאות נתונים: קריאה לכל משתמש פעיל; כתיבה רק למנהל/עורך (אידמפוטנטי)
do $$
declare t text;
begin
  foreach t in array array['companies','drone_types','catalog_items','kits','soldiers','signouts']
  loop
    execute format('drop policy if exists %1$s_read on public.%1$I;', t);
    execute format('drop policy if exists %1$s_write on public.%1$I;', t);
    execute format('create policy %1$s_read on public.%1$I for select to authenticated using (public.is_active());', t);
    execute format('create policy %1$s_write on public.%1$I for all to authenticated using (public.can_edit()) with check (public.can_edit());', t);
  end loop;
end $$;

-- יומן: רק מנהל ועורך רואים; הכתיבה דרך הטריגר בלבד
drop policy if exists audit_read on public.audit_log;
create policy audit_read on public.audit_log for select to authenticated
  using (public.my_role() in ('admin','editor'));

-- =====================================================================
--  זריעת נתונים ראשונית (פלוגות, סוגים, קטלוג, ערכות)
-- =====================================================================
insert into public.companies(name) values ('א'),('ב'),('ג'),('מסייעת') on conflict do nothing;
insert into public.drone_types(name) values ('AVATA'),('EVO') on conflict do nothing;

insert into public.catalog_items(drone_type,num,name,is_primary) values
 ('AVATA',1,'תיק ירך',true),('AVATA',2,'רחפן AVATA',true),('AVATA',3,'מגן גימבל',true),
 ('AVATA',4,'פרופ #1',false),('AVATA',5,'פרופ #2',false),('AVATA',6,'פרופ #3',false),('AVATA',7,'פרופ #4',false),
 ('AVATA',8,'ג''ויסטיק',true),('AVATA',9,'רצועה לג''ויסטיק',false),('AVATA',10,'משקף אינטגרה',true),
 ('AVATA',11,'משקף גוגלס 2',true),('AVATA',12,'כרטיס זיכרון 128GB',false),('AVATA',13,'סוללה לרחפן',false),
 ('AVATA',14,'מטען יחיד לסוללה',false),('AVATA',15,'רכזת טעינה x4',false),('AVATA',16,'ראש מטען קיר',false),
 ('AVATA',17,'כבל USB TYPE-C',false),('AVATA',18,'כבל TYPE-C/C',false),('AVATA',19,'צג מפקד',true),
 ('AVATA',20,'פרופים ספייר',false),('AVATA',21,'ערכת תאורה A',true),('AVATA',22,'ערכת תאורה B',true),
 ('EVO',1,'רחפן EVO',true),('EVO',2,'מגן גימבל',true),('EVO',3,'פרופ #1',false),('EVO',4,'פרופ #2',false),
 ('EVO',5,'פרופ #3',false),('EVO',6,'פרופ #4',false),('EVO',7,'שלט לרחפן',true),('EVO',8,'אנטנה #1',false),
 ('EVO',9,'אנטנה #2',false),('EVO',10,'סטיק #1',false),('EVO',11,'סטיק #2',false),('EVO',12,'סוללה לרחפן',false),
 ('EVO',13,'שנאי + כבל שמינייה',false),('EVO',14,'ראש מטען W65',false),('EVO',15,'כבל USB TYPE-C',false),
 ('EVO',16,'כבל TYPE-C/C',false),('EVO',17,'פרופים ספייר',false),('EVO',18,'תיק פקל EVO',true),
 ('EVO',19,'התקן הטלה ברזל',true),('EVO',20,'התקן הטלה נוצה',true),('EVO',21,'מטען רב ערוצי',false),
 ('EVO',22,'אנטנה מגדיל טווח',true),('EVO',23,'חצובה לאנטנה',false),('EVO',24,'כבל מאריך 20מ',false),
 ('EVO',25,'ערכת טעינה לשטח',true)
on conflict do nothing;

-- ערכות: AVATA 1..23, EVO 1..7
insert into public.kits(drone_type,num)
  select 'AVATA', g from generate_series(1,23) g on conflict do nothing;
insert into public.kits(drone_type,num)
  select 'EVO', g from generate_series(1,7) g on conflict do nothing;

-- =====================================================================
--  סיום. כעת:
--  1) הירשם באפליקציה עם שם המשתמש  admin
--  2) הרץ כאן את השורה הבאה כדי להפוך אותו למנהל:
--       update public.profiles set role='admin' where username='admin';
-- =====================================================================
