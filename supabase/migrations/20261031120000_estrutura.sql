-- =============================================================================
-- Contas do Mês — estrutura do banco (tabelas, índices e Row Level Security)
-- Rode este arquivo PRIMEIRO no SQL Editor do Supabase (ou via `supabase db push`).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- categorias
-- -----------------------------------------------------------------------------
create table public.categorias (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome        text not null check (length(trim(nome)) > 0),
  cor         text not null default '#2a78d6' check (cor ~ '^#[0-9a-fA-F]{6}$'),
  ordem       integer not null default 0,
  created_at  timestamptz not null default now(),
  -- permite que as outras tabelas garantam que a categoria é do mesmo usuário
  constraint categorias_id_user_key unique (id, user_id)
);

-- nome único por usuário (sem diferenciar maiúsculas/minúsculas)
create unique index categorias_user_nome_key on public.categorias (user_id, lower(nome));

comment on table public.categorias is 'Agrupamentos das contas (Moradia, Transporte...).';

-- -----------------------------------------------------------------------------
-- contas (modelos recorrentes)
-- -----------------------------------------------------------------------------
create table public.contas (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  categoria_id        uuid not null,
  nome                text not null check (length(trim(nome)) > 0),
  valor_padrao        numeric(12,2) not null default 0 check (valor_padrao >= 0),
  dia_vencimento      integer check (dia_vencimento between 1 and 31),
  codigo_pagamento    text,
  responsavel         text,
  parcela_atual       integer,
  total_parcelas      integer,
  -- competência (dia 1 do mês) em que vale a "parcela_atual".
  -- Com ela o número da parcela de qualquer mês é calculado sem depender de estado.
  parcela_referencia  date,
  ativa               boolean not null default true,
  observacao          text,
  created_at          timestamptz not null default now(),
  constraint contas_id_user_key unique (id, user_id),
  constraint contas_categoria_fkey foreign key (categoria_id, user_id)
    references public.categorias (id, user_id),
  constraint contas_parcelamento_ck check (
    (parcela_atual is null and total_parcelas is null and parcela_referencia is null)
    or (
      parcela_atual is not null and total_parcelas is not null and parcela_referencia is not null
      and parcela_atual between 1 and total_parcelas
      and extract(day from parcela_referencia) = 1
    )
  )
);

create index contas_user_idx on public.contas (user_id);
create index contas_categoria_idx on public.contas (categoria_id, user_id);

comment on table public.contas is 'Contas modelo: se repetem todo mês e geram os lançamentos.';
comment on column public.contas.parcela_referencia is 'Mês (dia 1) em que parcela_atual se aplica.';

-- -----------------------------------------------------------------------------
-- lancamentos (instância mensal de cada conta)
-- -----------------------------------------------------------------------------
create table public.lancamentos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  conta_id        uuid not null,
  competencia     date not null check (extract(day from competencia) = 1),
  valor           numeric(12,2) not null check (valor >= 0),
  pago            boolean not null default false,
  data_pagamento  date,
  numero_parcela  integer check (numero_parcela >= 1),
  observacao      text,
  created_at      timestamptz not null default now(),
  constraint lancamentos_conta_competencia_key unique (conta_id, competencia),
  constraint lancamentos_conta_fkey foreign key (conta_id, user_id)
    references public.contas (id, user_id) on delete cascade
);

create index lancamentos_user_competencia_idx on public.lancamentos (user_id, competencia);

comment on table public.lancamentos is 'Valor de cada conta em cada mês. Editar aqui não altera o modelo.';

-- -----------------------------------------------------------------------------
-- Row Level Security: cada usuário só enxerga e altera os próprios registros
-- -----------------------------------------------------------------------------
alter table public.categorias  enable row level security;
alter table public.contas      enable row level security;
alter table public.lancamentos enable row level security;

create policy "categorias do próprio usuário" on public.categorias
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "contas do próprio usuário" on public.contas
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "lançamentos do próprio usuário" on public.lancamentos
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Acesso pela API apenas para usuários logados (RLS filtra as linhas).
revoke all on public.categorias, public.contas, public.lancamentos from anon;
grant select, insert, update, delete on public.categorias, public.contas, public.lancamentos to authenticated;
