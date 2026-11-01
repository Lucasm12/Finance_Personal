/**
 * Postgres de verdade (PGlite) com o mínimo do Supabase simulado — papéis anon/authenticated,
 * auth.users, auth.uid(), Vault, pg_net e pg_cron — para aplicar TODAS as migrações do projeto
 * e testar RLS, permissões e funções sem tocar no banco de produção.
 */
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { PGlite, type Transaction } from '@electric-sql/pglite'

const MIGRACOES = path.resolve(import.meta.dirname, '../../supabase/migrations')

const SUPABASE = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  created_at timestamptz not null default now()
);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

create schema extensions;

create schema vault;
create table vault.segredos (name text primary key, decrypted_secret text);
create view vault.decrypted_secrets as select name, decrypted_secret from vault.segredos;
create function vault.create_secret(p_valor text, p_nome text) returns uuid language sql as
  $$ insert into vault.segredos values (p_nome, p_valor) on conflict (name) do update set decrypted_secret = excluded.decrypted_secret returning gen_random_uuid() $$;

create schema net;
create sequence net.seq;
create table net._http_response (id bigint primary key, status_code int, content text, error_msg text);
create table net.pedidos (id bigint primary key, url text, headers jsonb, body jsonb);
create function net.http_post(url text, headers jsonb default '{}', body jsonb default '{}') returns bigint language plpgsql as $$
declare v bigint := nextval('net.seq');
begin
  insert into net.pedidos values (v, url, headers, body);
  return v;
end $$;

create schema cron;
create table cron.job (jobname text primary key, schedule text, command text);
create function cron.schedule(p_nome text, p_agenda text, p_comando text) returns bigint language plpgsql as $$
begin
  insert into cron.job values (p_nome, p_agenda, p_comando)
    on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command;
  return 1;
end $$;
`

/** Arquivos de migração, em ordem, sem as extensões que o PGlite não tem (simuladas acima). */
export function migracoes(): { nome: string; sql: string }[] {
  return readdirSync(MIGRACOES)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((nome) => ({ nome, sql: readFileSync(path.join(MIGRACOES, nome), 'utf8').replace(/create extension[^;]*;/gi, '') }))
}

export async function criarBanco() {
  const db = new PGlite()
  await db.exec(SUPABASE)
  for (const m of migracoes()) {
    try {
      await db.exec(m.sql)
    } catch (e) {
      throw new Error(`Migração ${m.nome} falhou: ${(e as Error).message}`)
    }
  }
  return db
}

/** Cria um usuário (liberando o e-mail na lista de cadastro, como o dono faria). */
export async function criarUsuario(db: PGlite, email: string): Promise<string> {
  await db.query('insert into privado.cadastro_permitido (email) values ($1) on conflict do nothing', [email.toLowerCase()])
  const r = await db.query<{ id: string }>('insert into auth.users (email) values ($1) returning id', [email])
  return r.rows[0].id
}

/** Executa como o app executaria: papel authenticated com o JWT do usuário (ou anon, sem usuário). */
export function como<T>(db: PGlite, usuario: string | null, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${usuario ? 'authenticated' : 'anon'}`)
    if (usuario) await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [usuario])
    return fn(tx)
  })
}

/** Erro do Postgres (ou null se deu certo). */
export async function erroDe(p: Promise<unknown>): Promise<string | null> {
  try {
    await p
    return null
  } catch (e) {
    return (e as Error).message
  }
}
