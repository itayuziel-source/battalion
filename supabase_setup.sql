-- ============================================================
-- Battalion ammunition management - one-time setup.
-- Access code is defined in has_code() below ('gdud2026').
-- To change it later: edit the value and re-run that block only.
-- ============================================================

create extension if not exists pgcrypto;

-- -------- tables --------
create table if not exists public.items (
  name text primary key,
  cat  text not null default 'אחר',
  ord  integer not null default 999
);

create table if not exists public.companies (
  name text primary key,
  locs jsonb not null default '[]'
);

create table if not exists public.tx (
  id       uuid primary key default gen_random_uuid(),
  type     text not null check (type in ('חתימת מלאי','ניפוק ללבנון','דיווח ירי','החזרה למכולה')),
  item     text not null,
  qty      integer not null check (qty > 0),
  date     date,
  company  text not null default '',
  location text not null default '',
  source   text not null default '',
  person   text not null default '',
  notes    text not null default '',
  ts       timestamptz not null default now()
);

-- -------- access code (checked on every request via x-code header) --------
create or replace function public.has_code() returns boolean
language sql stable as
$$ select coalesce(current_setting('request.headers', true)::json->>'x-code','') = 'gdud2026' $$;

alter table public.items     enable row level security;
alter table public.companies enable row level security;
alter table public.tx        enable row level security;

drop policy if exists items_code     on public.items;
drop policy if exists companies_code on public.companies;
drop policy if exists tx_code        on public.tx;

create policy items_code on public.items
  for all to anon, authenticated
  using (public.has_code()) with check (public.has_code());

create policy companies_code on public.companies
  for all to anon, authenticated
  using (public.has_code()) with check (public.has_code());

create policy tx_code on public.tx
  for all to anon, authenticated
  using (public.has_code()) with check (public.has_code());

-- -------- item list --------
insert into public.items (name, cat, ord) values
  ('פצמ"ר 120 נפיץ',   'פצצות מרגמה 120', 1),
  ('פצמ"ר 120 עשן',    'פצצות מרגמה 120', 2),
  ('פצמ"ר 120 תאורה',  'פצצות מרגמה 120', 3),
  ('מטאדור',           'נ"ט',             4),
  ('לאו',              'נ"ט',             5),
  ('גיל יום',          'נ"ט',             6),
  ('גיל סימן 2',       'נ"ט',             7),
  ('מטול נפיץ',        'מטולים',          8),
  ('מטול תאורה',       'מטולים',          9),
  ('מטול עשן',         'מטולים',          10),
  ('מקל"ר',            'מטולים',          11),
  ('רימון רסס 26ב''',  'רימונים',         12),
  ('רימון עשן אפור',   'רימונים',         13),
  ('רימון עשן כחול',   'רימונים',         14),
  ('רימון עשן צהוב',   'רימונים',         15),
  ('רימון עשן אדום',   'רימונים',         16),
  ('רימון עשן ירוק',   'רימונים',         17),
  ('7.62 משורשר',      'תחמושת קלה',      18),
  ('5.56 משורשר',      'תחמושת קלה',      19),
  ('5.56 דור ב''',     'תחמושת קלה',      20),
  ('ליאה',             'תחמושת קלה',      21)
on conflict (name) do nothing;

-- -------- companies and locations --------
insert into public.companies (name, locs) values
  ('א',          '["חניתה"]'),
  ('ב',          '["מגדל זון","טיר חרפא"]'),
  ('ג',          '["מגדל זון"]'),
  ('מסייעת',     '["מרגמות","אוהד"]'),
  ('חפ"ק מג"ד',  '["מגדל זון"]'),
  ('פתן',        '["מגדל זון"]'),
  ('שריון',      '["טיר חרפא","מגדל זון"]')
on conflict (name) do nothing;

-- -------- opening balances (inserted only if the log is empty) --------
insert into public.tx (type, item, qty, date, source, person, notes)
select * from (values
  ('חתימת מלאי', 'פצמ"ר 120 נפיץ',  192,    null::date,          'בילו',       '',            'יתרת פתיחה מקובץ המקור'),
  ('חתימת מלאי', 'פצמ"ר 120 עשן',   37,     null,                'בילו',       '',            'יתרת פתיחה מקובץ המקור'),
  ('חתימת מלאי', 'פצמ"ר 120 תאורה', 36,     null,                'בילו',       '',            'יתרת פתיחה מקובץ המקור'),
  ('חתימת מלאי', 'מטאדור',          4,      null,                'בילו',       '',            'יתרת פתיחה מקובץ המקור'),
  ('חתימת מלאי', 'לאו',             18,     null,                'בילו',       '',            'יתרת פתיחה מקובץ המקור'),
  ('חתימת מלאי', 'גיל יום',         5,      null,                'בילו',       '',            'יתרת פתיחה מקובץ המקור'),
  ('חתימת מלאי', 'גיל סימן 2',      2,      null,                'בילו',       '',            'יתרת פתיחה מקובץ המקור'),
  ('חתימת מלאי', 'מטול נפיץ',       481,    null,                'בילו',       '',            'יתרת פתיחה מקובץ המקור'),
  ('חתימת מלאי', 'מטול תאורה',      575,    null,                'בילו',       '',            'יתרת פתיחה מקובץ המקור'),
  ('חתימת מלאי', 'מטול עשן',        357,    null,                'בילו',       '',            'יתרת פתיחה מקובץ המקור'),
  ('חתימת מלאי', 'רימון רסס 26ב''', 624,    null,                'בילו',       '',            'יתרת פתיחה מקובץ המקור'),
  ('חתימת מלאי', '7.62 משורשר',     70100,  null,                'בילו',       '',            'יתרת פתיחה מקובץ המקור'),
  ('חתימת מלאי', '5.56 משורשר',     72200,  null,                'בילו',       '',            'יתרת פתיחה מקובץ המקור'),
  ('חתימת מלאי', '5.56 דור ב''',    299200, null,                'בילו',       '',            'יתרת פתיחה מקובץ המקור'),
  ('חתימת מלאי', 'רימון עשן אפור',  88,     null,                'בילו',       '',            'יתרת פתיחה מקובץ המקור'),
  ('חתימת מלאי', 'רימון עשן כחול',  80,     null,                'בילו',       '',            'יתרת פתיחה מקובץ המקור'),
  ('חתימת מלאי', 'רימון עשן צהוב',  75,     null,                'בילו',       '',            'יתרת פתיחה מקובץ המקור'),
  ('חתימת מלאי', 'רימון עשן אדום',  80,     null,                'בילו',       '',            'יתרת פתיחה מקובץ המקור'),
  ('חתימת מלאי', 'רימון עשן ירוק',  80,     null,                'בילו',       '',            'יתרת פתיחה מקובץ המקור'),
  ('חתימת מלאי', 'ליאה',            12000,  null,                'חצרות יסף',  '',            'יתרת פתיחה מקובץ המקור'),
  ('חתימת מלאי', 'מקל"ר',           192,    date '2026-07-19',   'חצרות יסף',  'אדם ממן',     'יתרת פתיחה מקובץ המקור'),
  ('חתימת מלאי', '7.62 משורשר',     22160,  date '2026-07-19',   'חצרות יסף',  'אורי עוזיאל', 'יתרת פתיחה מקובץ המקור')
) as seed(type, item, qty, date, source, person, notes)
where not exists (select 1 from public.tx);

-- -------- public storage bucket for hosting the app file --------
insert into storage.buckets (id, name, public)
values ('app', 'app', true)
on conflict (id) do nothing;

-- -------- self check: expect items=21, companies=7, tx=22, total_signed=478586 --------
select
  (select count(*) from public.items)     as items,
  (select count(*) from public.companies) as companies,
  (select count(*) from public.tx)        as tx,
  (select sum(qty) from public.tx where type = 'חתימת מלאי') as total_signed;
