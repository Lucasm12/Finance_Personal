-- =============================================================================
-- Musculação — rotinas de força sugeridas/editadas, exercícios de cada treino
-- agendado e o registro de cada série (carga, repetições, esforço). Rode DEPOIS
-- dos arquivos anteriores; pode rodar mais de uma vez sem problema.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- rotinas_forca: a rotina (configuração + treinos A, B, C… com os exercícios).
-- Só uma fica ativa por usuário; as antigas ficam guardadas.
-- -----------------------------------------------------------------------------
create table if not exists public.rotinas_forca (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome                 text not null check (length(trim(nome)) > 0),
  objetivo             text not null check (objetivo in ('emagrecimento', 'hipertrofia', 'recomposicao')),
  objetivo_secundario  text check (objetivo_secundario in ('endurance', 'saude')),
  nivel                text not null check (nivel in ('iniciante', 'intermediario', 'avancado')),
  local                text not null check (local in ('academia', 'casa')),
  frequencia           integer not null check (frequencia between 2 and 6),
  foco                 text not null check (foco in ('corpo_inteiro', 'superiores', 'inferiores', 'forca_condicionamento')),
  duracao_min          integer not null check (duracao_min in (30, 45, 60, 90)),
  equipamentos         text[] not null default '{}',
  divisao              text not null,
  dias_semana          integer[] not null default '{}',   -- 1 = segunda … 7 = domingo
  treinos              jsonb not null,                    -- [{ letra, nome, foco, exercicios: [...] }]
  ativa                boolean not null default true,
  created_at           timestamptz not null default now(),
  constraint rotinas_forca_id_user_key unique (id, user_id)
);

create unique index if not exists rotinas_forca_ativa_key on public.rotinas_forca (user_id) where ativa;

-- -----------------------------------------------------------------------------
-- treinos_planejados: treino de academia ligado à rotina, com a cópia dos
-- exercícios do dia (mudar a rotina depois não altera o que já foi agendado)
-- -----------------------------------------------------------------------------
alter table public.treinos_planejados
  add column if not exists rotina_id      uuid,
  add column if not exists rotina_treino  text,
  add column if not exists exercicios     jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'treinos_planejados_id_user_key') then
    alter table public.treinos_planejados add constraint treinos_planejados_id_user_key unique (id, user_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'treinos_planejados_rotina_fkey') then
    alter table public.treinos_planejados add constraint treinos_planejados_rotina_fkey foreign key (rotina_id, user_id)
      references public.rotinas_forca (id, user_id) on delete set null (rotina_id);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- series_forca: cada série feita. É daqui que saem a progressão de carga,
-- o volume e os grupos musculares trabalhados.
-- -----------------------------------------------------------------------------
create table if not exists public.series_forca (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  planejado_id    uuid not null,
  data            date not null,
  exercicio_id    text not null,
  exercicio_nome  text not null,
  grupo           text not null,
  serie           integer not null check (serie between 1 and 20),
  carga_kg        numeric(6,2) check (carga_kg between 0 and 1000),
  repeticoes      integer check (repeticoes between 0 and 600),   -- ou segundos, em exercícios por tempo
  rpe             numeric(3,1) check (rpe between 1 and 10),      -- esforço percebido do exercício
  tecnica_ok      boolean not null default true,
  created_at      timestamptz not null default now(),
  constraint series_forca_planejado_fkey foreign key (planejado_id, user_id)
    references public.treinos_planejados (id, user_id) on delete cascade,
  constraint series_forca_serie_key unique (planejado_id, exercicio_id, serie)
);

create index if not exists series_forca_user_data_idx on public.series_forca (user_id, data);
create index if not exists series_forca_user_exercicio_idx on public.series_forca (user_id, exercicio_id, data);

-- -----------------------------------------------------------------------------
-- Row Level Security e permissões
-- -----------------------------------------------------------------------------
alter table public.rotinas_forca enable row level security;
alter table public.series_forca  enable row level security;

drop policy if exists "rotinas de força do próprio usuário" on public.rotinas_forca;
create policy "rotinas de força do próprio usuário" on public.rotinas_forca
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "séries de força do próprio usuário" on public.series_forca;
create policy "séries de força do próprio usuário" on public.series_forca
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.rotinas_forca, public.series_forca from anon;
grant select, insert, update, delete on public.rotinas_forca, public.series_forca to authenticated;

notify pgrst, 'reload schema';
