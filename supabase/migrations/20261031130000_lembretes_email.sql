-- =============================================================================
-- Contas do Mês — lembrete por e-mail das contas não pagas
-- Rode DEPOIS dos dois arquivos anteriores.
--
-- Envio: API do Resend (resend.com), chamada pelo próprio banco com pg_net.
-- Agenda: pg_cron, dias 1, 6, 11, 16, 21 e 26 às 8h (horário de Brasília).
-- A chave do Resend fica no Vault do Supabase (nunca no código):
--   select vault.create_secret('re_SUA_CHAVE', 'resend_api_key');
-- =============================================================================

-- (também podem ser ativadas em Database → Extensions)
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;

-- Funções internas ficam num schema que a API não expõe.
create schema if not exists privado;
revoke all on schema privado from public, anon;
grant usage on schema privado to authenticated;

-- -----------------------------------------------------------------------------
-- Configuração do lembrete de cada usuário
-- -----------------------------------------------------------------------------
create table public.lembretes_email (
  user_id            uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  email              text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  ativo              boolean not null default true,
  -- endereço do app para o botão "Abrir o app" do e-mail (salvo pela própria tela)
  link_app           text check (link_app is null or link_app ~* '^https?://'),
  ultimo_envio       timestamptz,
  ultimo_request_id  bigint,
  created_at         timestamptz not null default now()
);

comment on table public.lembretes_email is 'Para quem enviar o lembrete de contas não pagas.';

alter table public.lembretes_email enable row level security;

create policy "lembrete do próprio usuário" on public.lembretes_email
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.lembretes_email from anon, authenticated;
grant select, delete on public.lembretes_email to authenticated;
-- ultimo_envio/ultimo_request_id só o sistema altera
grant insert (email, ativo, link_app), update (email, ativo, link_app) on public.lembretes_email to authenticated;

-- -----------------------------------------------------------------------------
-- Geração do mês reaproveitável pelo lembrete (mesma regra de antes)
-- -----------------------------------------------------------------------------
create or replace function privado.gerar_mes_usuario(p_user uuid, p_competencia date)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_mes      date := public.mes_de(p_competencia);
  v_criados  integer;
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

  get diagnostics v_criados = row_count;
  return v_criados;
end;
$$;

-- gerar_mes (chamada pelo app) passa a usar a função acima.
create or replace function public.gerar_mes(p_competencia date)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado' using errcode = '42501';
  end if;
  return privado.gerar_mes_usuario(auth.uid(), p_competencia);
end;
$$;

-- -----------------------------------------------------------------------------
-- Utilitários do e-mail
-- -----------------------------------------------------------------------------

-- 1234.5 → "R$ 1.234,50"
create or replace function privado.brl(p_valor numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'R$ ' || translate(to_char(coalesce(p_valor, 0), 'FM999,999,999,990.00'), ',.', '.,');
$$;

-- Escapa texto para HTML (null continua null)
create or replace function privado.html(p_texto text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(replace(replace(replace(p_texto, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;');
$$;

-- -----------------------------------------------------------------------------
-- Monta e envia o e-mail de um usuário. Retorna o id da requisição (pg_net)
-- ou null quando não há nada a enviar.
-- p_forcar: envia mesmo com tudo pago ou lembrete desativado (botão de teste).
-- -----------------------------------------------------------------------------
create or replace function privado.enviar_lembrete(p_user uuid, p_forcar boolean default false)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cfg         public.lembretes_email;
  v_mes         date := public.mes_atual();
  v_ultimo_dia  date := (public.mes_atual() + interval '1 month - 1 day')::date;
  v_hoje        date := (now() at time zone 'America/Sao_Paulo')::date;
  v_nome_mes    text;
  v_chave       text;
  v_remetente   text;
  v_qtd         integer;
  v_total       numeric;
  v_qtd_venc    integer;
  v_total_venc  numeric;
  v_blocos      text := '';
  v_assunto     text;
  v_html        text;
  v_req         bigint;
  r             record;
begin
  select * into v_cfg from public.lembretes_email where user_id = p_user;
  if not found then
    raise exception 'Cadastre o e-mail do lembrete primeiro.';
  end if;
  if not v_cfg.ativo and not p_forcar then
    return null;
  end if;

  select decrypted_secret into v_chave from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if v_chave is null then
    raise exception 'Chave do Resend não cadastrada. Rode: select vault.create_secret(''re_...'', ''resend_api_key'');';
  end if;
  v_remetente := coalesce(
    (select decrypted_secret from vault.decrypted_secrets where name = 'lembrete_remetente' limit 1),
    'Contas do Mês <onboarding@resend.dev>'
  );

  -- Início do mês: se os lançamentos ainda não foram gerados, gera agora.
  if not exists (select 1 from public.lancamentos where user_id = p_user and competencia = v_mes) then
    perform privado.gerar_mes_usuario(p_user, v_mes);
  end if;

  v_nome_mes := (array['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho',
                       'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'])[extract(month from v_mes)::int]
                || ' de ' || extract(year from v_mes)::int;

  -- Contas não pagas do mês, com vencimento e situação (sem dia = último dia do mês)
  create temporary table if not exists pg_temp.lembrete_itens (
    categoria_id uuid, nome text, dia integer, valor numeric, vencida boolean, linha text
  ) on commit drop;
  truncate pg_temp.lembrete_itens;

  insert into pg_temp.lembrete_itens
  select c.categoria_id, c.nome, c.dia_vencimento, l.valor, s.venc < v_hoje,
         '<tr>'
         || '<td style="padding:8px 0;border-bottom:1px solid #eeeeee;vertical-align:top">'
         ||   '<div style="font-weight:600">' || privado.html(c.nome)
         ||   case when l.numero_parcela is not null
                   then ' <span style="font-weight:400;color:#666666">(' || l.numero_parcela || '/'
                        || coalesce(c.total_parcelas::text, '?') || ')</span>'
                   else '' end
         ||   '</div>'
         ||   coalesce('<div style="font-size:12px;color:' || s.cor || '">'
                       || nullif(concat_ws(' · ', privado.html(c.responsavel), s.texto), '') || '</div>', '')
         ||   coalesce('<div style="font-family:monospace;font-size:11px;color:#444444;word-break:break-all;margin-top:4px">'
                       || privado.html(c.codigo_pagamento) || '</div>', '')
         || '</td>'
         || '<td style="padding:8px 0 8px 12px;border-bottom:1px solid #eeeeee;text-align:right;white-space:nowrap;vertical-align:top;font-weight:600">'
         ||   privado.brl(l.valor)
         || '</td>'
         || '</tr>'
    from public.lancamentos l
    join public.contas c on c.id = l.conta_id
    cross join lateral (
      select d.venc,
             case
               when d.venc < v_hoje then 'Vencida há ' || (v_hoje - d.venc) || case when v_hoje - d.venc = 1 then ' dia' else ' dias' end
               when c.dia_vencimento is null then null
               when d.venc = v_hoje then 'Vence hoje'
               when d.venc - v_hoje <= 3 then 'Vence em ' || (d.venc - v_hoje) || case when d.venc - v_hoje = 1 then ' dia' else ' dias' end
               else 'Vence dia ' || c.dia_vencimento
             end as texto,
             case
               when d.venc < v_hoje then '#b91c1c'
               when c.dia_vencimento is not null and d.venc - v_hoje <= 3 then '#b45309'
               else '#666666'
             end as cor
        from (select least(v_mes + (coalesce(c.dia_vencimento, 31) - 1), v_ultimo_dia) as venc) d
    ) s
   where l.user_id = p_user
     and l.competencia = v_mes
     and not l.pago;

  select count(*), coalesce(sum(valor), 0),
         count(*) filter (where vencida), coalesce(sum(valor) filter (where vencida), 0)
    into v_qtd, v_total, v_qtd_venc, v_total_venc
    from pg_temp.lembrete_itens;

  if v_qtd = 0 and not p_forcar then
    return null; -- tudo pago: não envia nada
  end if;

  for r in
    select cat.nome, cat.cor, sum(i.valor) as total,
           string_agg(i.linha, '' order by coalesce(i.dia, 99), i.nome) as linhas
      from pg_temp.lembrete_itens i
      join public.categorias cat on cat.id = i.categoria_id
     group by cat.id, cat.nome, cat.cor, cat.ordem
     order by cat.ordem, cat.nome
  loop
    v_blocos := v_blocos
      || '<h3 style="margin:24px 0 4px;font-size:16px;border-left:4px solid ' || r.cor || ';padding-left:8px">'
      ||   privado.html(r.nome) || '</h3>'
      || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px">'
      ||   r.linhas
      ||   '<tr><td style="padding:8px 0;color:#666666">Total ' || privado.html(r.nome) || '</td>'
      ||   '<td style="padding:8px 0 8px 12px;text-align:right;white-space:nowrap;font-weight:700">' || privado.brl(r.total) || '</td></tr>'
      || '</table>';
  end loop;

  v_assunto := case
    when v_qtd = 0 then 'Tudo pago em ' || v_nome_mes || ' 🎉'
    else 'Contas a pagar — ' || v_nome_mes || ': ' || v_qtd
         || case when v_qtd = 1 then ' pendente (' else ' pendentes (' end || privado.brl(v_total) || ')'
  end;

  v_html :=
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:16px;color:#111111">'
    || '<h2 style="margin:0;font-size:22px">Contas não pagas</h2>'
    || '<p style="margin:4px 0 16px;color:#666666">' || v_nome_mes || ' · situação em ' || to_char(v_hoje, 'DD/MM/YYYY') || '</p>'
    || case
         when v_qtd = 0 then '<p style="font-size:16px">Todas as contas do mês estão pagas. 🎉</p>'
         else
           '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f6f4;border-radius:8px"><tr>'
           || '<td style="padding:12px 16px;vertical-align:top">'
           ||   '<div style="font-size:12px;color:#666666">Total pendente</div>'
           ||   '<div style="font-size:22px;font-weight:700">' || privado.brl(v_total) || '</div>'
           ||   '<div style="font-size:12px;color:#666666">' || v_qtd || case when v_qtd = 1 then ' conta' else ' contas' end || '</div>'
           || '</td>'
           || case when v_qtd_venc > 0 then
                '<td style="padding:12px 16px;vertical-align:top">'
                || '<div style="font-size:12px;color:#b91c1c">⚠ Vencidas</div>'
                || '<div style="font-size:22px;font-weight:700;color:#b91c1c">' || privado.brl(v_total_venc) || '</div>'
                || '<div style="font-size:12px;color:#b91c1c">' || v_qtd_venc || case when v_qtd_venc = 1 then ' conta' else ' contas' end || '</div>'
                || '</td>'
              else '' end
           || '</tr></table>'
           || v_blocos
       end
    || coalesce('<p style="margin:28px 0 8px"><a href="' || privado.html(v_cfg.link_app) || '" '
                || 'style="background:#047857;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">'
                || 'Abrir o app</a></p>', '')
    || '<p style="margin-top:24px;font-size:12px;color:#888888">Você recebe este lembrete nos dias 1, 6, 11, 16, 21 e 26. '
    || 'Para parar, desative em “Lembretes por e-mail” no app.</p>'
    || '</div>';

  select net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_chave, 'Content-Type', 'application/json'),
    body    := jsonb_build_object(
                 'from', v_remetente,
                 'to', jsonb_build_array(v_cfg.email),
                 'subject', v_assunto,
                 'html', v_html
               )
  ) into v_req;

  update public.lembretes_email
     set ultimo_envio = now(), ultimo_request_id = v_req
   where user_id = p_user;

  return v_req;
end;
$$;

-- Rodada agendada: um e-mail por usuário com lembrete ativo.
create or replace function privado.enviar_lembretes()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r        record;
  v_envios integer := 0;
begin
  for r in select user_id from public.lembretes_email where ativo loop
    begin
      if privado.enviar_lembrete(r.user_id) is not null then
        v_envios := v_envios + 1;
      end if;
    exception when others then
      -- um usuário com problema não impede os outros
      raise warning 'Lembrete do usuário % falhou: %', r.user_id, sqlerrm;
    end;
  end loop;
  return v_envios;
end;
$$;

-- -----------------------------------------------------------------------------
-- Funções chamadas pelo app (botão "Enviar teste")
-- -----------------------------------------------------------------------------
create or replace function public.enviar_lembrete_teste()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user    uuid := auth.uid();
  v_ultimo  timestamptz;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado' using errcode = '42501';
  end if;
  select ultimo_envio into v_ultimo from public.lembretes_email where user_id = v_user;
  if v_ultimo > now() - interval '1 minute' then
    raise exception 'Aguarde um minuto entre um teste e outro.';
  end if;
  return privado.enviar_lembrete(v_user, true);
end;
$$;

-- Resultado do último envio (o Resend responde de forma assíncrona).
create or replace function public.status_ultimo_lembrete()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
           'concluido', r.id is not null,
           'status', r.status_code,
           'resposta', r.content,
           'erro', r.error_msg
         )
    from public.lembretes_email le
    left join net._http_response r on r.id = le.ultimo_request_id
   where le.user_id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- Permissões
-- -----------------------------------------------------------------------------
revoke execute on all functions in schema privado from public, anon, authenticated;
grant execute on function privado.gerar_mes_usuario(uuid, date) to authenticated;

revoke execute on function public.enviar_lembrete_teste() from public, anon;
revoke execute on function public.status_ultimo_lembrete() from public, anon;
grant execute on function public.enviar_lembrete_teste() to authenticated;
grant execute on function public.status_ultimo_lembrete() to authenticated;

-- -----------------------------------------------------------------------------
-- Agendamento: dias 1, 6, 11, 16, 21 e 26 às 11h UTC (8h em Brasília).
-- Rodar de novo apenas atualiza o agendamento existente.
-- -----------------------------------------------------------------------------
select cron.schedule('lembrete-contas-pendentes', '0 11 1,6,11,16,21,26 * *', 'select privado.enviar_lembretes()');
