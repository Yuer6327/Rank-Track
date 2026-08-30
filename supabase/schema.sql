-- Rank Track schema for Shanghai 3+3 gaokao ranking tracker
create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  enabled_minor_subjects text[] not null default array['物理','化学','生物'],
  subject_order text[] not null default array['语文','数学','英语','物理','化学','生物'],
  long_term_goals jsonb not null default '{}'::jsonb,
  total_students jsonb not null default '{}'::jsonb,
  trend_chart_default_dimension text not null default 'grade_rank',
  trend_chart_show_goal_line boolean not null default true,
  trend_chart_show_data_labels boolean not null default true,
  trend_chart_show_count integer not null default 10,
  trend_chart_x_axis text not null default 'date',
  trend_chart_dual_axis boolean not null default false,
  home_density text not null default 'compact',
  theme_mode text not null default 'system',
  accent_colors boolean not null default true,
  anomaly_multiplier numeric not null default 1.5,
  anomaly_abs_threshold integer,
  suggestion_gap_weight numeric not null default 0.6,
  suggestion_corr_weight numeric not null default 0.4,
  ai_auto_summary boolean not null default true,
  ai_temperature numeric not null default 0.7,
  user_ai jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  exam_name text not null,
  exam_date date not null,
  total_class_rank integer,
  total_grade_rank integer,
  total_city_rank integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, exam_name, exam_date)
);

create table if not exists public.subject_scores (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  subject text not null,
  score numeric,
  class_avg numeric,
  level text,
  class_rank integer,
  grade_rank integer,
  city_rank integer,
  unique (exam_id, subject)
);

-- 既有库迁移：补齐 class_avg（班级均分）列
alter table public.subject_scores add column if not exists class_avg numeric;

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  exam_id uuid references public.exams(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_content_len check (char_length(content) <= 500)
);

create table if not exists public.exam_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  image_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exams_user_date_idx on public.exams (user_id, exam_date);
create index if not exists scores_user_exam_idx on public.subject_scores (user_id, exam_id);
create index if not exists notes_user_idx on public.notes (user_id, updated_at desc);

alter table public.users enable row level security;
alter table public.settings enable row level security;
alter table public.exams enable row level security;
alter table public.subject_scores enable row level security;
alter table public.notes enable row level security;
alter table public.exam_images enable row level security;
alter table public.ai_conversations enable row level security;

-- App uses the service role key on the server, which bypasses RLS.
-- Policies below still protect the anon key if it is ever used from the browser.

drop policy if exists "users self" on public.users;
drop policy if exists "settings self" on public.settings;
drop policy if exists "exams self" on public.exams;
drop policy if exists "scores self" on public.subject_scores;
drop policy if exists "notes self" on public.notes;
drop policy if exists "images self" on public.exam_images;
drop policy if exists "ai self" on public.ai_conversations;

create policy "users self" on public.users
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "settings self" on public.settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "exams self" on public.exams
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "scores self" on public.subject_scores
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "notes self" on public.notes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "images self" on public.exam_images
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "ai self" on public.ai_conversations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('exam-images', 'exam-images', true)
on conflict (id) do nothing;
