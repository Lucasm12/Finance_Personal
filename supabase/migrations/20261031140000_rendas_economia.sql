-- =============================================================================
-- Contas do Mês — rendas e economia (caixinhas)
-- Rode DEPOIS dos arquivos anteriores.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- rendas: modelos de renda que se repetem todo mês (salário, aluguel recebido...)
-- -----------------------------------------------------------------------------
create table public.rendas (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome             text not null check (length(trim(nome)) > 0),
  valor_padrao     numeric(12,2) not null default 0 check (valor_padrao >= 0),
  dia_recebimento  integer check (dia_recebimento between 1 and 31),
  responsavel      text,
  ativa            boolean not null default true,
  observacao       text,
  created_at       timestamptz not null default now(),
  constraint rendas_id_user_key unique (id, user_id)
);

create index rendas_user_idx on public.rendas (user_id);

comment on table public.rendas is 'Rendas fixas: geram um recebimento por mês.';

-- -----------------------------------------------------------------------------
-- recebimentos: renda de cada mês. Sem renda_id = renda avulsa (13º, freela...).
-- -----------------------------------------------------------------------------
create table public.recebimentos (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  renda_id          uuid,
  descricao         text,
  competencia       date not null check (extract(day from competencia) = 1),
  valor             numeric(12,2) not null check (valor >= 0),
  recebido          boolean not null default false,
  data_recebimento  date,
  observacao        text,
  created_at        timestamptz not null default now(),
  constraint recebimentos_renda_competencia_key unique (renda_id, competencia),
  constraint recebimentos_renda_fkey foreign key (renda_id, user_id)
    references public.rendas (id, user_id) on delete cascade,
  -- coalesce: com descricao nula a expressão daria NULL, e CHECK aceita NULL
  constraint recebimentos_descricao_ck check (renda_id is not null or coalesce(length(trim(descricao)), 0) > 0)
);

create index recebimentos_user_competencia_idx on public.recebimentos (user_id, competencia);

comment on table public.recebimentos is 'Renda de cada mês. Editar aqui não altera a renda fixa.';

-- -----------------------------------------------------------------------------
-- caixinhas: objetivos de economia (reserva de emergência, viagem...)
-- -----------------------------------------------------------------------------
create table public.caixinhas (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome           text not null check (length(trim(nome)) > 0),
  cor            text not null default '#2a78d6' check (cor ~ '^#[0-9a-fA-F]{6}$'),
  meta           numeric(12,2) check (meta > 0),
  aporte_mensal  numeric(12,2) check (aporte_mensal > 0),
  data_alvo      date,
  arquivada      boolean not null default false,
  created_at     timestamptz not null default now(),
  constraint caixinhas_id_user_key unique (id, user_id)
);

create unique index caixinhas_user_nome_key on public.caixinhas (user_id, lower(nome));

comment on table public.caixinhas is 'Objetivos de economia. O saldo vem dos movimentos.';
comment on column public.caixinhas.aporte_mensal is 'Quanto pretende guardar por mês (planejamento).';

-- -----------------------------------------------------------------------------
-- movimentos_caixinha: cada valor guardado (aporte) ou retirado
-- -----------------------------------------------------------------------------
create table public.movimentos_caixinha (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  caixinha_id  uuid not null,
  tipo         text not null check (tipo in ('aporte', 'retirada')),
  valor        numeric(12,2) not null check (valor > 0),
  data         date not null default current_date,
  observacao   text,
  created_at   timestamptz not null default now(),
  constraint movimentos_caixinha_fkey foreign key (caixinha_id, user_id)
    references public.caixinhas (id, user_id) on delete cascade
);

create index movimentos_caixinha_user_data_idx on public.movimentos_caixinha (user_id, data);
create index movimentos_caixinha_caixinha_idx on public.movimentos_caixinha (caixinha_id);

-- -----------------------------------------------------------------------------
-- Saldo de cada caixinha (security_invoker: respeita o RLS de quem consulta)
-- -----------------------------------------------------------------------------
create or replace view public.v_saldo_caixinhas
with (security_invoker = true) as
select c.id                                                                   as caixinha_id,
       c.user_id,
       coalesce(sum(case when m.tipo = 'aporte' then m.valor else -m.valor end), 0) as saldo,
       coalesce(sum(m.valor) filter (where m.tipo = 'aporte'), 0)               as total_guardado,
       coalesce(sum(m.valor) filter (where m.tipo = 'retirada'), 0)             as total_retirado,
       count(m.id)::int                                                       as movimentos,
       max(m.data)                                                            as ultima_data
  from public.caixinhas c
  left join public.movimentos_caixinha m on m.caixinha_id = c.id
 group by c.id, c.user_id;

-- -----------------------------------------------------------------------------
-- "Gerar mês" passa a criar também os recebimentos das rendas fixas ativas.
-- -----------------------------------------------------------------------------
create or replace function privado.gerar_mes_usuario(p_user uuid, p_competencia date)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_mes      date := public.mes_de(p_competencia);
  v_contas   integer;
  v_rendas   integer;
begin
  -- Encerra sozinhas as contas parceladas cuja última parcela já passou.
  update public.contas c
     set ativa = false
   where c.user_id = p_user
     and c.ativa
     and c.total_parcelas is not null
     and c.parcela_atual + public.meses_entre(c.parcela_referencia, public.mes_atual()) > c.total_parcelas;

  insert into public.lancamentos (user_id, conta_id, competencia, valor, numero_parcela)
  select c.user_id,
         c.id,
         v_mes,
         c.valor_padrao,
         case when c.total_parcelas is not null
              then c.parcela_atual + public.meses_entre(c.parcela_referencia, v_mes)
         end
    from public.contas c
   where c.user_id = p_user
     and c.ativa
     and (
       c.total_parcelas is null
       or c.parcela_atual + public.meses_entre(c.parcela_referencia, v_mes) between 1 and c.total_parcelas
     )
  on conflict (conta_id, competencia) do nothing;
  get diagnostics v_contas = row_count;

  insert into public.recebimentos (user_id, renda_id, competencia, valor)
  select r.user_id, r.id, v_mes, r.valor_padrao
    from public.rendas r
   where r.user_id = p_user
     and r.ativa
  on conflict (renda_id, competencia) do nothing;
  get diagnostics v_rendas = row_count;

  return v_contas + v_rendas;
end;
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security e permissões
-- -----------------------------------------------------------------------------
alter table public.rendas              enable row level security;
alter table public.recebimentos        enable row level security;
alter table public.caixinhas           enable row level security;
alter table public.movimentos_caixinha enable row level security;

create policy "rendas do próprio usuário" on public.rendas
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "recebimentos do próprio usuário" on public.recebimentos
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "caixinhas do próprio usuário" on public.caixinhas
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "movimentos do próprio usuário" on public.movimentos_caixinha
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.rendas, public.recebimentos, public.caixinhas, public.movimentos_caixinha,
              public.v_saldo_caixinhas from anon;
grant select, insert, update, delete
   on public.rendas, public.recebimentos, public.caixinhas, public.movimentos_caixinha to authenticated;
grant select on public.v_saldo_caixinhas to authenticated;
