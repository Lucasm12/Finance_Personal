-- =============================================================================
-- Agenda de treinos — metas semanais por modalidade e treinos planejados
-- (pendente, concluído ou perdido). Rode DEPOIS dos arquivos anteriores;
-- pode rodar mais de uma vez sem problema.
-- =============================================================================

-- treinos ganha uma chave (id, user_id) para os planejados apontarem só para atividades do mesmo usuário
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'treinos_id_user_key') then
    alter table public.treinos add constraint treinos_id_user_key unique (id, user_id);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- metas_semanais: uma linha por semana (segunda-feira) e modalidade. Cada semana
-- guarda a própria meta: mudar a de agora não altera as semanas anteriores.
-- Corrida, natação e pedal em distância; academia em sessões.
-- -----------------------------------------------------------------------------
create table if not exists public.metas_semanais (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  semana       date not null check (extract(isodow from semana) = 1),
  modalidade   text not null check (modalidade in ('corrida', 'natacao', 'ciclismo', 'forca')),
  distancia_m  numeric(9,1) check (distancia_m > 0),
  sessoes      integer check (sessoes between 1 and 21),
  created_at   timestamptz not null default now(),
  constraint metas_semanais_key unique (user_id, semana, modalidade),
  constraint metas_semanais_unidade_check check (
    case when modalidade = 'forca' then sessoes is not null and distancia_m is null
         else distancia_m is not null and sessoes is null end
  )
);

-- -----------------------------------------------------------------------------
-- treinos_planejados: o que você planejou para cada dia e o que aconteceu.
-- Só treino concluído tem dados realizados; eles é que contam para as metas.
-- -----------------------------------------------------------------------------
create table if not exists public.treinos_planejados (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data                   date not null,
  modalidade             text not null check (modalidade in ('corrida', 'natacao', 'ciclismo', 'forca')),
  nome                   text not null check (length(trim(nome)) > 0),
  descricao              text,
  distancia_planejada_m  numeric(9,1) check (distancia_planejada_m > 0),
  duracao_planejada_seg  integer check (duracao_planejada_seg > 0),
  observacao             text,
  status                 text not null default 'pendente' check (status in ('pendente', 'concluido', 'perdido')),
  distancia_realizada_m  numeric(9,1) check (distancia_realizada_m >= 0),
  duracao_realizada_seg  integer check (duracao_realizada_seg > 0),
  -- atividade registrada (em treinos) que corresponde a este treino; apagar a atividade só desfaz o vínculo
  treino_id              uuid,
  concluido_em           timestamptz,
  created_at             timestamptz not null default now(),
  constraint treinos_planejados_treino_fkey foreign key (treino_id, user_id)
    references public.treinos (id, user_id) on delete set null (treino_id),
  constraint treinos_planejados_realizado_check check (
    status = 'concluido' or (distancia_realizada_m is null and duracao_realizada_seg is null and treino_id is null)
  )
);

create index if not exists treinos_planejados_user_data_idx on public.treinos_planejados (user_id, data);

-- -----------------------------------------------------------------------------
-- Row Level Security e permissões
-- -----------------------------------------------------------------------------
alter table public.metas_semanais     enable row level security;
alter table public.treinos_planejados enable row level security;

drop policy if exists "metas semanais do próprio usuário" on public.metas_semanais;
create policy "metas semanais do próprio usuário" on public.metas_semanais
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "treinos planejados do próprio usuário" on public.treinos_planejados;
create policy "treinos planejados do próprio usuário" on public.treinos_planejados
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.metas_semanais, public.treinos_planejados from anon;
grant select, insert, update, delete on public.metas_semanais, public.treinos_planejados to authenticated;

-- a API do Supabase passa a enxergar as tabelas novas na hora
notify pgrst, 'reload schema';
