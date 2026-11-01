-- =============================================================================
-- Segurança — cadastro só para e-mails autorizados, lembrete por e-mail protegido
-- contra abuso, limite de tamanho nos campos, trilha de auditoria e exclusão da
-- própria conta (LGPD). Rode DEPOIS dos arquivos anteriores; pode rodar mais de
-- uma vez sem problema. Detalhes em SEGURANCA.md.
-- =============================================================================

create schema if not exists privado;
revoke all on schema privado from public, anon;

-- -----------------------------------------------------------------------------
-- 1. Acesso anônimo: nada. O app só funciona logado, então o papel "anon" não
--    precisa ler tabelas nem executar funções — inclusive as que vierem depois.
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- no Postgres toda função nasce executável por PUBLIC (todo mundo, inclusive anon):
-- tira de todos e libera só para quem está logado, função por função
revoke execute on all functions in schema public from public, anon;
alter default privileges in schema public revoke execute on functions from public, anon;
grant execute on function public.mes_de(date), public.meses_entre(date, date), public.mes_atual() to authenticated;
grant execute on function public.gerar_mes(date), public.importar_dados_exemplo(boolean) to authenticated;
grant execute on function public.status_ultimo_lembrete() to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Cadastro só para e-mails autorizados. Mesmo com "Allow new users to sign up"
--    ligado no painel, ninguém de fora consegue criar conta pela API.
--    Para liberar alguém:  insert into privado.cadastro_permitido (email) values ('pessoa@exemplo.com');
-- -----------------------------------------------------------------------------
create table if not exists privado.cadastro_permitido (
  email      text primary key check (email = lower(email) and char_length(email) <= 254),
  criado_em  timestamptz not null default now()
);
revoke all on privado.cadastro_permitido from public, anon, authenticated;

-- quem já tem conta continua entrando normalmente
insert into privado.cadastro_permitido (email)
  select lower(email) from auth.users where email is not null
  on conflict do nothing;

create or replace function privado.bloquear_cadastro_nao_autorizado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or not exists (select 1 from privado.cadastro_permitido p where p.email = lower(new.email)) then
    raise exception 'Cadastro não autorizado.' using errcode = '42501';
  end if;
  return new;
end;
$$;

do $$
begin
  drop trigger if exists cadastro_somente_autorizados on auth.users;
  create trigger cadastro_somente_autorizados
    before insert on auth.users
    for each row execute function privado.bloquear_cadastro_nao_autorizado();
exception when insufficient_privilege then
  -- projetos em que o Supabase não deixa criar gatilhos em auth: o cadastro tem de ser fechado pelo painel
  raise warning 'Sem permissão para criar o gatilho em auth.users. Feche o cadastro em Authentication → Sign In / Providers (Allow new users to sign up).';
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Lembrete por e-mail: o botão "Abrir o app" só aponta para o endereço oficial
--    do app, e o envio de teste tem limite (1 por minuto, 5 por dia).
--    Endereço oficial:  insert into privado.configuracao values ('app_url', 'https://seu-app.vercel.app')
--                       on conflict (chave) do update set valor = excluded.valor;
-- -----------------------------------------------------------------------------
create table if not exists privado.configuracao (
  chave  text primary key,
  valor  text not null
);
revoke all on privado.configuracao from public, anon, authenticated;

-- o endereço já salvo pelo primeiro lembrete cadastrado (o do dono) vira o oficial
insert into privado.configuracao (chave, valor)
  select 'app_url', rtrim(lower(link_app), '/')
    from public.lembretes_email
   where link_app ~* '^https://[a-z0-9.-]+(:[0-9]+)?/?$'
   order by created_at
   limit 1
  on conflict (chave) do nothing;

create or replace function privado.validar_lembrete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app text := (select valor from privado.configuracao where chave = 'app_url');
begin
  new.email := lower(trim(new.email));
  if new.link_app is not null and (v_app is null or rtrim(lower(new.link_app), '/') <> v_app) then
    new.link_app := null;
  end if;
  return new;
end;
$$;

drop trigger if exists lembrete_validar on public.lembretes_email;
create trigger lembrete_validar
  before insert or update of email, link_app on public.lembretes_email
  for each row execute function privado.validar_lembrete();

-- aplica a regra aos lembretes já cadastrados e passa a exigir https
update public.lembretes_email set link_app = link_app where link_app is not null;
alter table public.lembretes_email drop constraint if exists lembretes_email_link_app_check;
alter table public.lembretes_email add constraint lembretes_email_link_app_check
  check (link_app is null or (link_app ~* '^https://' and char_length(link_app) <= 300));

-- registro dos envios de teste (limite por usuário)
create table if not exists privado.envios_lembrete (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  em          timestamptz not null default now(),
  teste       boolean not null default false,
  request_id  bigint
);
create index if not exists envios_lembrete_user_em_idx on privado.envios_lembrete (user_id, em desc);
revoke all on privado.envios_lembrete from public, anon, authenticated;

create or replace function public.enviar_lembrete_teste()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_req  bigint;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado' using errcode = '42501';
  end if;
  if exists (select 1 from privado.envios_lembrete where user_id = v_user and teste and em > now() - interval '1 minute') then
    raise exception 'Aguarde um minuto entre um teste e outro.';
  end if;
  if (select count(*) from privado.envios_lembrete where user_id = v_user and teste and em > now() - interval '24 hours') >= 5 then
    raise exception 'Limite de 5 e-mails de teste por dia atingido. Tente de novo amanhã.';
  end if;
  begin
    v_req := privado.enviar_lembrete(v_user, true);
  exception when others then
    -- só a orientação ao usuário passa; detalhes de infraestrutura ficam no log do banco
    if sqlerrm like 'Cadastre o e-mail%' then
      raise;
    end if;
    raise warning 'Teste de lembrete do usuário % falhou: %', v_user, sqlerrm;
    raise exception 'Não foi possível enviar o e-mail agora. Tente mais tarde.';
  end;
  insert into privado.envios_lembrete (user_id, teste, request_id) values (v_user, true, v_req);
  return v_req;
end;
$$;

revoke execute on function public.enviar_lembrete_teste() from public, anon;
grant execute on function public.enviar_lembrete_teste() to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Limite de tamanho em todo texto, JSON e lista gravados pelo app. Barra
--    payloads gigantes (abuso de armazenamento). NOT VALID: vale para o que for
--    gravado daqui em diante, sem travar a migração por dado antigo.
-- -----------------------------------------------------------------------------
do $$
declare
  r       record;
  v_nome  text;
  v_max   integer;
begin
  for r in
    select c.table_name, c.column_name, c.data_type
      from information_schema.columns c
      join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
     where c.table_schema = 'public'
       and t.table_type = 'BASE TABLE'
       and c.data_type in ('text', 'character varying', 'jsonb', 'ARRAY')
  loop
    v_nome := left(r.table_name || '_' || r.column_name, 55) || '_tamanho';
    continue when exists (select 1 from pg_constraint where conname = v_nome);
    if r.data_type = 'jsonb' then
      -- a rotina inteira cabe em 256 KB; demais JSON em 64 KB
      v_max := case when r.table_name = 'rotinas_forca' then 262144 else 65536 end;
      execute format('alter table public.%I add constraint %I check (pg_column_size(%I) <= %s) not valid', r.table_name, v_nome, r.column_name, v_max);
    elsif r.data_type = 'ARRAY' then
      execute format('alter table public.%I add constraint %I check (cardinality(%I) <= 20) not valid', r.table_name, v_nome, r.column_name);
    else
      v_max := case
        when r.column_name in ('observacao', 'descricao', 'codigo_pagamento') then 2000
        when r.column_name = 'email' then 254
        when r.column_name = 'link_app' then 300
        else 300
      end;
      execute format('alter table public.%I add constraint %I check (char_length(%I) <= %s) not valid', r.table_name, v_nome, r.column_name, v_max);
    end if;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Trilha de auditoria: quem apagou o quê, mudanças no lembrete e no perfil,
--    exclusões de conta. Guarda só identificadores (nada do conteúdo) e fica
--    fora da API. Logins e falhas de login ficam no log do Supabase Auth.
-- -----------------------------------------------------------------------------
create table if not exists privado.auditoria (
  id         bigint generated always as identity primary key,
  em         timestamptz not null default now(),
  usuario    uuid,            -- quem fez (null = sistema ou painel)
  dono       uuid,            -- de quem é o registro
  tabela     text not null,
  operacao   text not null,
  registro   text
);
create index if not exists auditoria_em_idx on privado.auditoria (em);
create index if not exists auditoria_dono_idx on privado.auditoria (dono, em);
revoke all on privado.auditoria from public, anon, authenticated;

create or replace function privado.auditar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into privado.auditoria (usuario, dono, tabela, operacao, registro)
  values (auth.uid(), (v ->> 'user_id')::uuid, tg_table_name, tg_op, coalesce(v ->> 'id', v ->> 'user_id'));
  return null;
end;
$$;

do $$
declare
  r record;
begin
  -- exclusões em toda tabela de dados do usuário
  for r in
    select c.table_name
      from information_schema.columns c
      join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
     where c.table_schema = 'public' and t.table_type = 'BASE TABLE' and c.column_name = 'user_id'
  loop
    execute format('drop trigger if exists auditoria_exclusao on public.%I', r.table_name);
    execute format('create trigger auditoria_exclusao after delete on public.%I for each row execute function privado.auditar()', r.table_name);
  end loop;
end;
$$;

-- alterações em informações importantes
drop trigger if exists auditoria_alteracao on public.lembretes_email;
create trigger auditoria_alteracao after update of email, link_app, ativo on public.lembretes_email
  for each row execute function privado.auditar();
drop trigger if exists auditoria_alteracao on public.perfil_atleta;
create trigger auditoria_alteracao after insert or update on public.perfil_atleta
  for each row execute function privado.auditar();
drop trigger if exists auditoria_alteracao on public.rotinas_forca;
create trigger auditoria_alteracao after insert or update of ativa on public.rotinas_forca
  for each row execute function privado.auditar();

-- retenção: auditoria por 1 ano, envios de teste por 90 dias
select cron.schedule(
  'limpeza-auditoria',
  '30 3 * * *',
  $$delete from privado.auditoria where em < now() - interval '365 days';
    delete from privado.envios_lembrete where em < now() - interval '90 days'$$
);

-- -----------------------------------------------------------------------------
-- 6. LGPD: o próprio usuário apaga a conta e tudo o que é dele (em cascata).
--    O app pede a senha de novo antes de chamar esta função.
-- -----------------------------------------------------------------------------
create or replace function public.excluir_minha_conta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Usuário não autenticado' using errcode = '42501';
  end if;
  insert into privado.auditoria (usuario, dono, tabela, operacao, registro)
  values (v_user, v_user, 'auth.users', 'CONTA_EXCLUIDA', v_user::text);
  delete from privado.cadastro_permitido where email = (select lower(email) from auth.users where id = v_user);
  -- as tabelas do app referenciam auth.users com "on delete cascade"
  delete from auth.users where id = v_user;
end;
$$;

revoke execute on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;

-- funções internas: ninguém de fora executa
revoke execute on function privado.bloquear_cadastro_nao_autorizado() from public, anon, authenticated;
revoke execute on function privado.validar_lembrete() from public, anon, authenticated;
revoke execute on function privado.auditar() from public, anon, authenticated;

notify pgrst, 'reload schema';
