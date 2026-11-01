-- =============================================================================
-- Módulo Triathlon — treinos, nutrição e provas-alvo
-- Rode DEPOIS dos arquivos anteriores.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- perfil_atleta: limiares e metas usados nos cálculos de carga e nutrição
-- -----------------------------------------------------------------------------
create table public.perfil_atleta (
  user_id            uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data_nascimento    date,
  sexo               text check (sexo in ('M', 'F')),
  altura_cm          numeric(5,1) check (altura_cm between 100 and 250),
  ftp_w              integer check (ftp_w between 50 and 600),
  fc_max             integer check (fc_max between 100 and 230),
  fc_limiar          integer check (fc_limiar between 80 and 220),
  pace_limiar_seg_km integer check (pace_limiar_seg_km between 120 and 900),   -- corrida, segundos por km
  css_seg_100m       integer check (css_seg_100m between 50 and 300),          -- natação, segundos por 100 m
  peso_meta_kg       numeric(5,2) check (peso_meta_kg between 30 and 250),
  kcal_meta          integer check (kcal_meta between 800 and 8000),
  proteina_meta_g    integer check (proteina_meta_g between 0 and 600),
  carbo_meta_g       integer check (carbo_meta_g between 0 and 1500),
  gordura_meta_g     integer check (gordura_meta_g between 0 and 500),
  atualizado_em      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- treinos: atividades (manuais ou importadas de arquivo)
-- -----------------------------------------------------------------------------
create table public.treinos (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid() references auth.users (id) on delete cascade,
  origem                text not null default 'manual' check (origem in ('manual', 'arquivo')),
  origem_id             text,             -- chave do arquivo importado
  modalidade            text not null check (modalidade in ('natacao', 'ciclismo', 'corrida', 'forca', 'outro')),
  tipo_original         text,             -- ex.: VirtualRide, TrailRun
  nome                  text not null check (length(trim(nome)) > 0),
  data_hora             timestamptz not null,
  duracao_seg           integer not null check (duracao_seg > 0),         -- tempo em movimento
  tempo_total_seg       integer check (tempo_total_seg > 0),
  distancia_m           numeric(10,1) check (distancia_m >= 0),
  elevacao_m            numeric(7,1) check (elevacao_m >= 0),
  fc_media              integer check (fc_media between 30 and 250),
  fc_max                integer check (fc_max between 30 and 250),
  potencia_media        integer check (potencia_media >= 0),
  potencia_normalizada  integer check (potencia_normalizada >= 0),
  cadencia_media        numeric(5,1) check (cadencia_media >= 0),
  calorias              integer check (calorias >= 0),
  esforco_percebido     integer check (esforco_percebido between 1 and 10),
  observacao            text,
  dados                 jsonb,
  created_at            timestamptz not null default now(),
  -- evita importar a mesma atividade duas vezes (NULLs não conflitam: treinos manuais)
  constraint treinos_origem_key unique (user_id, origem, origem_id)
);

create index treinos_user_data_idx on public.treinos (user_id, data_hora desc);

-- -----------------------------------------------------------------------------
-- pesagens: evolução do peso (uma por dia)
-- -----------------------------------------------------------------------------
create table public.pesagens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data         date not null,
  peso_kg      numeric(5,2) not null check (peso_kg between 30 and 250),
  gordura_pct  numeric(4,1) check (gordura_pct between 3 and 60),
  observacao   text,
  created_at   timestamptz not null default now(),
  constraint pesagens_user_data_key unique (user_id, data)
);

-- -----------------------------------------------------------------------------
-- alimentos: itens salvos para lançar rápido (valores por porção)
-- -----------------------------------------------------------------------------
create table public.alimentos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome        text not null check (length(trim(nome)) > 0),
  porcao      text not null default '1 porção',
  kcal        integer not null check (kcal >= 0),
  proteina_g  numeric(6,1) not null default 0 check (proteina_g >= 0),
  carbo_g     numeric(6,1) not null default 0 check (carbo_g >= 0),
  gordura_g   numeric(6,1) not null default 0 check (gordura_g >= 0),
  created_at  timestamptz not null default now()
);

create unique index alimentos_user_nome_key on public.alimentos (user_id, lower(nome));

-- -----------------------------------------------------------------------------
-- refeicoes: o que foi consumido em cada dia
-- -----------------------------------------------------------------------------
create table public.refeicoes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data        date not null,
  tipo        text not null check (tipo in ('cafe', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar', 'ceia', 'pre_treino', 'pos_treino', 'suplemento')),
  descricao   text not null check (length(trim(descricao)) > 0),
  kcal        integer not null check (kcal >= 0),
  proteina_g  numeric(6,1) not null default 0 check (proteina_g >= 0),
  carbo_g     numeric(6,1) not null default 0 check (carbo_g >= 0),
  gordura_g   numeric(6,1) not null default 0 check (gordura_g >= 0),
  created_at  timestamptz not null default now()
);

create index refeicoes_user_data_idx on public.refeicoes (user_id, data);

-- -----------------------------------------------------------------------------
-- provas: provas-alvo e resultados
-- -----------------------------------------------------------------------------
create table public.provas (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome                 text not null check (length(trim(nome)) > 0),
  data                 date not null,
  local                text,
  tipo                 text not null check (tipo in ('sprint', 'olimpico', 'meio_ironman', 'ironman', 'duathlon', 'corrida', 'ciclismo', 'natacao', 'outro')),
  prioridade           text not null default 'B' check (prioridade in ('A', 'B', 'C')),
  natacao_m            integer check (natacao_m >= 0),
  ciclismo_km          numeric(6,1) check (ciclismo_km >= 0),
  corrida_km           numeric(6,2) check (corrida_km >= 0),
  meta_tempo_seg       integer check (meta_tempo_seg > 0),
  resultado_tempo_seg  integer check (resultado_tempo_seg > 0),
  observacao           text,
  created_at           timestamptz not null default now()
);

create index provas_user_data_idx on public.provas (user_id, data);

-- -----------------------------------------------------------------------------
-- Row Level Security e permissões
-- -----------------------------------------------------------------------------
alter table public.perfil_atleta        enable row level security;
alter table public.treinos              enable row level security;
alter table public.pesagens             enable row level security;
alter table public.alimentos            enable row level security;
alter table public.refeicoes            enable row level security;
alter table public.provas               enable row level security;

create policy "perfil do próprio usuário" on public.perfil_atleta
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "treinos do próprio usuário" on public.treinos
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "pesagens do próprio usuário" on public.pesagens
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "alimentos do próprio usuário" on public.alimentos
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "refeições do próprio usuário" on public.refeicoes
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "provas do próprio usuário" on public.provas
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.perfil_atleta, public.treinos, public.pesagens, public.alimentos, public.refeicoes,
              public.provas from anon;

grant select, insert, update, delete
   on public.perfil_atleta, public.treinos, public.pesagens, public.alimentos, public.refeicoes, public.provas
   to authenticated;
