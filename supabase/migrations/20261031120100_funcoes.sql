-- =============================================================================
-- Contas do Mês — funções e views
-- Rode este arquivo DEPOIS de 20261031120000_estrutura.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Utilitários de data
-- -----------------------------------------------------------------------------

-- Primeiro dia do mês de uma data.
create or replace function public.mes_de(p_data date)
returns date
language sql
immutable
set search_path = ''
as $$
  select make_date(extract(year from p_data)::int, extract(month from p_data)::int, 1);
$$;

-- Quantidade de meses entre duas datas (considera só ano/mês).
create or replace function public.meses_entre(p_de date, p_ate date)
returns integer
language sql
immutable
set search_path = ''
as $$
  select (extract(year from p_ate)::int - extract(year from p_de)::int) * 12
       + (extract(month from p_ate)::int - extract(month from p_de)::int);
$$;

-- Mês corrente no fuso do Brasil (o banco do Supabase roda em UTC).
create or replace function public.mes_atual()
returns date
language sql
stable
set search_path = ''
as $$
  select public.mes_de((now() at time zone 'America/Sao_Paulo')::date);
$$;

-- -----------------------------------------------------------------------------
-- gerar_mes: cria os lançamentos de um mês a partir das contas ativas.
-- Não duplica (unique conta_id + competencia). Contas parceladas só geram
-- lançamento enquanto a parcela do mês estiver entre 1 e o total.
-- Retorna quantos lançamentos novos foram criados.
-- -----------------------------------------------------------------------------
create or replace function public.gerar_mes(p_competencia date)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user      uuid := auth.uid();
  v_mes       date := public.mes_de(p_competencia);
  v_criados   integer;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado' using errcode = '42501';
  end if;

  -- Encerra sozinhas as contas parceladas cuja última parcela já passou.
  update public.contas c
     set ativa = false
   where c.user_id = v_user
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
   where c.user_id = v_user
     and c.ativa
     and (
       c.total_parcelas is null
       or c.parcela_atual + public.meses_entre(c.parcela_referencia, v_mes) between 1 and c.total_parcelas
     )
  on conflict (conta_id, competencia) do nothing;

  get diagnostics v_criados = row_count;
  return v_criados;
end;
$$;

-- -----------------------------------------------------------------------------
-- importar_dados_exemplo: cadastra as categorias e contas da planilha.
-- Pode ser chamada mais de uma vez: só cria o que ainda não existe (pelo nome).
-- -----------------------------------------------------------------------------
create or replace function public.importar_dados_exemplo(p_incluir_contas boolean default true)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user        uuid := auth.uid();
  v_categorias  integer := 0;
  v_contas      integer := 0;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado' using errcode = '42501';
  end if;

  insert into public.categorias (user_id, nome, cor, ordem)
  select v_user, x.nome, x.cor, x.ordem
    from (values
      ('Moradia',            '#2a78d6', 1),
      ('Transporte',         '#eb6834', 2),
      ('Cartões/Empréstimo', '#1baf7a', 3),
      ('Saúde',              '#eda100', 4),
      ('Contabilidade',      '#e87ba4', 5),
      ('Outro',              '#008300', 6)
    ) as x (nome, cor, ordem)
   where not exists (
     select 1 from public.categorias c
      where c.user_id = v_user and lower(c.nome) = lower(x.nome)
   );
  get diagnostics v_categorias = row_count;

  if p_incluir_contas then
    insert into public.contas
      (user_id, categoria_id, nome, valor_padrao, responsavel, parcela_atual, total_parcelas, parcela_referencia)
    select v_user, cat.id, x.nome, x.valor, x.responsavel, x.parcela_atual, x.total_parcelas,
           case when x.total_parcelas is not null then public.mes_atual() end
      from (values
        ('Moradia',            'Energia',              216.58::numeric, null::text, null::int, null::int),
        ('Moradia',            'Internet',              60.00,          null,       null,      null),
        ('Moradia',            'Água',                 328.34,          null,       null,      null),
        ('Moradia',            'Parcela da Casa',      535.00,          null,       null,      null),
        ('Moradia',            'Terreno Luís Correia', 298.62,          null,       null,      null),
        ('Moradia',            'Terreno Parnaíba',     411.00,          null,       null,      null),
        ('Moradia',            'Pós Débora',            69.90,          'Débora',   null,      null),
        ('Moradia',            'Plano Claro Débora',    47.91,          'Débora',   null,      null),
        ('Moradia',            'Plano Tim Lucas',       45.00,          'Lucas',    null,      null),
        ('Moradia',            'Tratamento Sil',       192.28,          'Sil',      5,         33),
        ('Transporte',         'Seguro Carro',         188.46,          null,       null,      null),
        ('Cartões/Empréstimo', 'Empréstimo Nubank',   4251.87,          null,       null,      null),
        ('Cartões/Empréstimo', 'Bradesco',            5213.47,          null,       null,      null),
        ('Cartões/Empréstimo', 'Nubank',              6940.31,          null,       null,      null),
        ('Saúde',              'Medplan Lucas',        209.03,          'Lucas',    null,      null),
        ('Saúde',              'Medplan Débora',       288.93,          'Débora',   null,      null),
        ('Saúde',              'Medplan Sil',          504.40,          'Sil',      null,      null),
        ('Saúde',              'Medplan Kalebe',       169.54,          'Kalebe',   null,      null),
        ('Contabilidade',      'Erik Contador',        120.00,          null,       null,      null),
        ('Contabilidade',      'DAS do ME',            594.84,          null,       null,      null),
        ('Outro',              'Terreno Igreja',        88.00,          null,       null,      null),
        ('Outro',              'Zélia INSS',           180.00,          null,       null,      null)
      ) as x (categoria, nome, valor, responsavel, parcela_atual, total_parcelas)
      join public.categorias cat
        on cat.user_id = v_user and lower(cat.nome) = lower(x.categoria)
     where not exists (
       select 1 from public.contas c
        where c.user_id = v_user and lower(c.nome) = lower(x.nome)
     );
    get diagnostics v_contas = row_count;
  end if;

  return jsonb_build_object('categorias', v_categorias, 'contas', v_contas);
end;
$$;

-- -----------------------------------------------------------------------------
-- Views de totais (security_invoker: respeitam o RLS de quem consulta)
-- -----------------------------------------------------------------------------

-- Total por categoria em cada mês
create or replace view public.v_totais_categoria_mes
with (security_invoker = true) as
select l.user_id,
       l.competencia,
       cat.id                                                   as categoria_id,
       cat.nome                                                 as categoria,
       cat.cor,
       cat.ordem,
       count(*)::int                                            as quantidade,
       count(*) filter (where l.pago)::int                      as quantidade_paga,
       sum(l.valor)                                             as total,
       coalesce(sum(l.valor) filter (where l.pago), 0)          as total_pago,
       coalesce(sum(l.valor) filter (where not l.pago), 0)      as total_pendente
  from public.lancamentos l
  join public.contas c       on c.id = l.conta_id
  join public.categorias cat on cat.id = c.categoria_id
 group by l.user_id, l.competencia, cat.id, cat.nome, cat.cor, cat.ordem;

-- Total geral de cada mês
create or replace view public.v_totais_mes
with (security_invoker = true) as
select l.user_id,
       l.competencia,
       count(*)::int                                            as quantidade,
       count(*) filter (where l.pago)::int                      as quantidade_paga,
       sum(l.valor)                                             as total,
       coalesce(sum(l.valor) filter (where l.pago), 0)          as total_pago,
       coalesce(sum(l.valor) filter (where not l.pago), 0)      as total_pendente
  from public.lancamentos l
 group by l.user_id, l.competencia;

-- -----------------------------------------------------------------------------
-- Permissões
-- -----------------------------------------------------------------------------
revoke all on public.v_totais_categoria_mes, public.v_totais_mes from anon;
grant select on public.v_totais_categoria_mes, public.v_totais_mes to authenticated;

revoke execute on function public.gerar_mes(date) from public, anon;
revoke execute on function public.importar_dados_exemplo(boolean) from public, anon;
grant execute on function public.gerar_mes(date) to authenticated;
grant execute on function public.importar_dados_exemplo(boolean) to authenticated;
