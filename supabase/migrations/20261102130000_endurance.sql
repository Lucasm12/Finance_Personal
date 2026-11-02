-- =============================================================================
-- Endurance — parciais (splits) dos treinos importados, sugestões de treino de
-- corrida, ciclismo e natação, a estrutura do treino planejado (para comparar
-- planejado × realizado), importação sem duplicidade e o vínculo com a
-- AI Endurance (Partner API). Rode DEPOIS dos arquivos anteriores; pode rodar
-- mais de uma vez sem problema.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. treinos: nova origem para atividades trazidas da AI Endurance
-- -----------------------------------------------------------------------------
alter table public.treinos drop constraint if exists treinos_origem_check;
alter table public.treinos add constraint treinos_origem_check check (origem in ('manual', 'arquivo', 'ai_endurance'));

-- -----------------------------------------------------------------------------
-- 2. treino_parciais: cada parcial do treino importado.
--    km = a cada 1 km (corrida) · intervalo = a cada 5 km (pedal) ou 100 m (natação)
--    volta = voltas/séries gravadas pelo relógio · piscina = cada piscina nadada
-- -----------------------------------------------------------------------------
create table if not exists public.treino_parciais (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  treino_id         uuid not null,
  tipo              text not null check (tipo in ('km', 'volta', 'intervalo', 'piscina')),
  ordem             integer not null check (ordem between 1 and 5000),
  duracao_seg       numeric(8,1) not null check (duracao_seg between 0 and 864000),
  distancia_m       numeric(9,1) check (distancia_m >= 0),
  fc_media          integer check (fc_media between 30 and 250),
  fc_max            integer check (fc_max between 30 and 250),
  potencia_media    integer check (potencia_media between 0 and 3000),
  cadencia_media    numeric(5,1) check (cadencia_media between 0 and 300),
  elevacao_ganho_m  numeric(7,1) check (elevacao_ganho_m >= 0),
  elevacao_perda_m  numeric(7,1) check (elevacao_perda_m >= 0),
  bracadas          integer check (bracadas between 0 and 10000),
  estilo            text check (char_length(estilo) <= 40),
  descanso          boolean not null default false,       -- natação: série de descanso
  created_at        timestamptz not null default now(),
  -- apagar o treino apaga as parciais; a parcial só aponta para treino do mesmo usuário
  constraint treino_parciais_treino_fkey foreign key (treino_id, user_id)
    references public.treinos (id, user_id) on delete cascade,
  constraint treino_parciais_ordem_key unique (treino_id, tipo, ordem)
);

-- -----------------------------------------------------------------------------
-- 3. sugestoes_salvas: treinos de corrida, ciclismo e natação que o usuário guardou
--    (do catálogo do app ou da AI Endurance), com a estrutura completa
-- -----------------------------------------------------------------------------
create table if not exists public.sugestoes_salvas (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  modalidade   text not null check (modalidade in ('corrida', 'natacao', 'ciclismo')),
  nome         text not null check (length(trim(nome)) > 0 and char_length(nome) <= 120),
  objetivo     text not null check (objetivo in ('resistencia', 'velocidade', 'limiar', 'recuperacao', 'tecnica', 'subidas')),
  nivel        text not null check (nivel in ('iniciante', 'intermediario', 'avancado')),
  descricao    text check (char_length(descricao) <= 2000),
  fonte        text not null default 'catalogo' check (fonte in ('catalogo', 'ai_endurance', 'personalizada')),
  referencia   text check (char_length(referencia) <= 120),   -- id no catálogo ou na AI Endurance
  duracao_seg  integer check (duracao_seg between 1 and 86400),
  distancia_m  numeric(9,1) check (distancia_m > 0),
  estrutura    jsonb not null check (jsonb_typeof(estrutura) = 'object' and pg_column_size(estrutura) <= 65536),
  created_at   timestamptz not null default now(),
  constraint sugestoes_salvas_id_user_key unique (id, user_id),
  -- o mesmo treino no mesmo nível não é salvo duas vezes (personalizadas, sem referência, à vontade)
  constraint sugestoes_salvas_referencia_key unique (user_id, fonte, referencia, nivel)
);

-- -----------------------------------------------------------------------------
-- 4. treinos_planejados: estrutura do treino (aquecimento, principal, desaquecimento,
--    com a intensidade de cada bloco) e a sugestão salva de onde veio
-- -----------------------------------------------------------------------------
alter table public.treinos_planejados
  add column if not exists estrutura    jsonb,
  add column if not exists sugestao_id  uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'treinos_planejados_sugestao_fkey') then
    alter table public.treinos_planejados add constraint treinos_planejados_sugestao_fkey foreign key (sugestao_id, user_id)
      references public.sugestoes_salvas (id, user_id) on delete set null (sugestao_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'treinos_planejados_estrutura_tamanho') then
    alter table public.treinos_planejados add constraint treinos_planejados_estrutura_tamanho
      check (estrutura is null or (jsonb_typeof(estrutura) = 'object' and pg_column_size(estrutura) <= 65536));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'treinos_planejados_estrutura_modalidade') then
    alter table public.treinos_planejados add constraint treinos_planejados_estrutura_modalidade
      check (estrutura is null or modalidade <> 'forca');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Row Level Security, permissões e auditoria das tabelas novas
-- (a migração 9 só cobriu as tabelas que existiam até ela)
-- -----------------------------------------------------------------------------
alter table public.treino_parciais  enable row level security;
alter table public.sugestoes_salvas enable row level security;

drop policy if exists "parciais do próprio usuário" on public.treino_parciais;
create policy "parciais do próprio usuário" on public.treino_parciais
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "sugestões salvas do próprio usuário" on public.sugestoes_salvas;
create policy "sugestões salvas do próprio usuário" on public.sugestoes_salvas
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.treino_parciais, public.sugestoes_salvas from anon;
grant select, insert, update, delete on public.treino_parciais, public.sugestoes_salvas to authenticated;

-- exclusões entram na trilha de auditoria. As parciais ficam de fora de propósito: são
-- recriadas a cada reimportação e já são apagadas junto com o treino (que é auditado).
drop trigger if exists auditoria_exclusao on public.sugestoes_salvas;
create trigger auditoria_exclusao after delete on public.sugestoes_salvas
  for each row execute function privado.auditar();

-- -----------------------------------------------------------------------------
-- 5. importar_treinos: grava treinos importados (arquivo ou AI Endurance) com as
--    parciais, sem duplicar. Um treino que já existe — mesmo arquivo/atividade, ou
--    mesma modalidade começando a até 3 minutos (inclusive um registrado à mão) —
--    fica de fora e volta em "ignorados". Com "completar": true, o existente recebe
--    as medidas e as parciais do arquivo (nome, esforço e observação continuam os seus).
--
--    p_itens: [{ "treino": {origem, origem_id, modalidade, nome, data_hora, ...},
--                "parciais": [{tipo, ordem, duracao_seg, ...}], "completar": false }]
-- -----------------------------------------------------------------------------
create or replace function public.importar_treinos(p_itens jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user         uuid := auth.uid();
  v_item         jsonb;
  v_t            public.treinos;
  v_existente    public.treinos;
  v_id           uuid;
  v_n            integer;
  v_novos        integer := 0;
  v_completados  integer := 0;
  v_parciais     integer := 0;
  v_ignorados    jsonb := '[]'::jsonb;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado' using errcode = '42501';
  end if;
  if jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) not between 1 and 50 then
    raise exception 'Envie de 1 a 50 treinos por vez.' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_itens) loop
    v_t := jsonb_populate_record(null::public.treinos, v_item -> 'treino');
    if v_t.origem is null or v_t.origem not in ('arquivo', 'ai_endurance') or v_t.origem_id is null then
      raise exception 'Treino importado sem origem.' using errcode = '22023';
    end if;
    if jsonb_typeof(coalesce(v_item -> 'parciais', '[]'::jsonb)) <> 'array'
       or jsonb_array_length(coalesce(v_item -> 'parciais', '[]'::jsonb)) > 2000 then
      raise exception 'Treino com parciais demais (máximo 2.000).' using errcode = '22023';
    end if;

    -- já importado (mesma chave) ou a mesma atividade vinda de outro lugar
    v_existente := null;
    select * into v_existente from public.treinos t
     where t.user_id = v_user and t.origem = v_t.origem and t.origem_id = v_t.origem_id;
    if v_existente.id is null then
      select * into v_existente from public.treinos t
       where t.user_id = v_user
         and t.modalidade = v_t.modalidade
         and t.data_hora between v_t.data_hora - interval '3 minutes' and v_t.data_hora + interval '3 minutes'
       order by abs(extract(epoch from t.data_hora - v_t.data_hora))
       limit 1;
    end if;

    if v_existente.id is not null and not coalesce((v_item ->> 'completar')::boolean, false) then
      v_ignorados := v_ignorados || jsonb_build_object('origem_id', v_t.origem_id, 'treino_id', v_existente.id, 'nome', v_existente.nome);
      continue;
    end if;

    if v_existente.id is null then
      insert into public.treinos (origem, origem_id, modalidade, tipo_original, nome, data_hora, duracao_seg, tempo_total_seg,
                                  distancia_m, elevacao_m, fc_media, fc_max, potencia_media, potencia_normalizada,
                                  cadencia_media, calorias, dados)
      values (v_t.origem, v_t.origem_id, v_t.modalidade, v_t.tipo_original, v_t.nome, v_t.data_hora, v_t.duracao_seg, v_t.tempo_total_seg,
              v_t.distancia_m, v_t.elevacao_m, v_t.fc_media, v_t.fc_max, v_t.potencia_media, v_t.potencia_normalizada,
              v_t.cadencia_media, v_t.calorias, v_t.dados)
      returning id into v_id;
      v_novos := v_novos + 1;
    else
      update public.treinos t set
        origem               = v_t.origem,
        origem_id            = v_t.origem_id,
        tipo_original        = coalesce(v_t.tipo_original, t.tipo_original),
        data_hora            = v_t.data_hora,
        duracao_seg          = v_t.duracao_seg,
        tempo_total_seg      = coalesce(v_t.tempo_total_seg, t.tempo_total_seg),
        distancia_m          = coalesce(v_t.distancia_m, t.distancia_m),
        elevacao_m           = coalesce(v_t.elevacao_m, t.elevacao_m),
        fc_media             = coalesce(v_t.fc_media, t.fc_media),
        fc_max               = coalesce(v_t.fc_max, t.fc_max),
        potencia_media       = coalesce(v_t.potencia_media, t.potencia_media),
        potencia_normalizada = coalesce(v_t.potencia_normalizada, t.potencia_normalizada),
        cadencia_media       = coalesce(v_t.cadencia_media, t.cadencia_media),
        calorias             = coalesce(v_t.calorias, t.calorias),
        dados                = coalesce(t.dados, '{}'::jsonb) || coalesce(v_t.dados, '{}'::jsonb)
       where t.id = v_existente.id;
      v_id := v_existente.id;
      v_completados := v_completados + 1;
    end if;

    delete from public.treino_parciais p where p.treino_id = v_id;
    insert into public.treino_parciais (treino_id, tipo, ordem, duracao_seg, distancia_m, fc_media, fc_max, potencia_media,
                                        cadencia_media, elevacao_ganho_m, elevacao_perda_m, bracadas, estilo, descanso)
    select v_id, p.tipo, p.ordem, p.duracao_seg, p.distancia_m, p.fc_media, p.fc_max, p.potencia_media,
           p.cadencia_media, p.elevacao_ganho_m, p.elevacao_perda_m, p.bracadas, p.estilo, coalesce(p.descanso, false)
      from jsonb_populate_recordset(null::public.treino_parciais, coalesce(v_item -> 'parciais', '[]'::jsonb)) p;
    get diagnostics v_n = row_count;
    v_parciais := v_parciais + v_n;
  end loop;

  return jsonb_build_object('novos', v_novos, 'completados', v_completados, 'parciais', v_parciais, 'ignorados', v_ignorados);
end;
$$;

revoke execute on function public.importar_treinos(jsonb) from public, anon;
grant execute on function public.importar_treinos(jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. AI Endurance: qual atleta (user id na AI Endurance) é de qual usuário do app.
--    Quem define é o dono do projeto, pelo SQL Editor — nunca o próprio usuário,
--    para ninguém apontar para o atleta de outra pessoa:
--      insert into privado.ai_endurance_atletas (user_id, aie_user_id)
--        select id, '12345' from auth.users where email = 'voce@exemplo.com'
--      on conflict (user_id) do update set aie_user_id = excluded.aie_user_id;
-- -----------------------------------------------------------------------------
create table if not exists privado.ai_endurance_atletas (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  aie_user_id  text not null check (aie_user_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  criado_em    timestamptz not null default now()
);
revoke all on privado.ai_endurance_atletas from public, anon, authenticated;

-- a função da Vercel (api/ai-endurance.ts) chama esta, com o token do usuário,
-- para saber o atleta dele — e só o dele
create or replace function public.ai_endurance_atleta()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select a.aie_user_id from privado.ai_endurance_atletas a where a.user_id = auth.uid()
$$;

revoke execute on function public.ai_endurance_atleta() from public, anon;
grant execute on function public.ai_endurance_atleta() to authenticated;

-- a API do Supabase passa a enxergar as tabelas e colunas novas na hora
notify pgrst, 'reload schema';
