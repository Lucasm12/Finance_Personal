-- =============================================================================
-- Treino feito → treino planejado: quem importa (ou registra à mão) um treino já
-- conclui o planejado correspondente da Agenda. Rode DEPOIS da migração
-- 20261102130000_endurance.sql; pode rodar mais de uma vez sem problema.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- vincular_ao_planejado: liga a atividade a um treino planejado e o marca como
-- concluído, com a distância e a duração feitas.
--  - p_planejado informado (o usuário escolheu): esse planejado, desde que seja da
--    mesma modalidade e ainda não tenha atividade vinculada.
--  - sem p_planejado (automático): o único planejado PENDENTE, sem atividade, da mesma
--    modalidade, no dia do treino (fuso de São Paulo). Com dois ou mais, não escolhe.
-- Devolve {planejado_id, nome, data}, {candidatos: n} quando é ambíguo, ou null.
-- -----------------------------------------------------------------------------
create or replace function public.vincular_ao_planejado(p_treino uuid, p_planejado uuid default null)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user  uuid := auth.uid();
  v_t     public.treinos;
  v_p     public.treinos_planejados;
  v_n     integer;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado' using errcode = '42501';
  end if;
  select * into v_t from public.treinos t where t.id = p_treino and t.user_id = v_user;
  if v_t.id is null or v_t.modalidade not in ('corrida', 'natacao', 'ciclismo', 'forca') then
    return null;
  end if;
  -- a atividade já conta para um planejado: não liga a outro
  if exists (select 1 from public.treinos_planejados p where p.treino_id = v_t.id) then
    return null;
  end if;

  if p_planejado is not null then
    select * into v_p from public.treinos_planejados p
     where p.id = p_planejado and p.user_id = v_user and p.modalidade = v_t.modalidade and p.treino_id is null;
  else
    select count(*) into v_n from public.treinos_planejados p
     where p.user_id = v_user and p.status = 'pendente' and p.treino_id is null and p.modalidade = v_t.modalidade
       and p.data = (v_t.data_hora at time zone 'America/Sao_Paulo')::date;
    if v_n > 1 then
      return jsonb_build_object('candidatos', v_n);
    end if;
    select * into v_p from public.treinos_planejados p
     where p.user_id = v_user and p.status = 'pendente' and p.treino_id is null and p.modalidade = v_t.modalidade
       and p.data = (v_t.data_hora at time zone 'America/Sao_Paulo')::date;
  end if;
  if v_p.id is null then
    return null;
  end if;

  update public.treinos_planejados p set
    status                = 'concluido',
    treino_id             = v_t.id,
    distancia_realizada_m = case when v_t.modalidade = 'forca' then null else v_t.distancia_m end,
    duracao_realizada_seg = v_t.duracao_seg,
    concluido_em          = coalesce(p.concluido_em, now())
   where p.id = v_p.id;
  return jsonb_build_object('planejado_id', v_p.id, 'nome', v_p.nome, 'data', v_p.data);
end;
$$;

revoke execute on function public.vincular_ao_planejado(uuid, uuid) from public, anon;
grant execute on function public.vincular_ao_planejado(uuid, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- importar_treinos: igual à da migração anterior, e agora cada treino gravado já
-- conclui o planejado do dia (automático) ou o planejado escolhido ("planejado": uuid
-- no item — vale até para um treino que já existia e ficou de fora).
-- Devolve também "vinculados" e quantos ficaram sem vínculo por haver mais de um planejado.
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
  v_planejado    uuid;
  v_vinculo      jsonb;
  v_novos        integer := 0;
  v_completados  integer := 0;
  v_parciais     integer := 0;
  v_ignorados    jsonb := '[]'::jsonb;
  v_vinculados   jsonb := '[]'::jsonb;
  v_ambiguos     integer := 0;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado' using errcode = '42501';
  end if;
  if jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) not between 1 and 50 then
    raise exception 'Envie de 1 a 50 treinos por vez.' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_itens) loop
    v_t := jsonb_populate_record(null::public.treinos, v_item -> 'treino');
    v_planejado := nullif(v_item ->> 'planejado', '')::uuid;
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
      -- o usuário disse de qual planejado é: liga o que já existia
      if v_planejado is not null then
        v_vinculo := public.vincular_ao_planejado(v_existente.id, v_planejado);
        if v_vinculo ? 'planejado_id' then
          v_vinculados := v_vinculados || (v_vinculo || jsonb_build_object('treino_id', v_existente.id));
        end if;
      end if;
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

    -- conclui o planejado: o escolhido ou, sem escolha, o único pendente do dia
    v_vinculo := public.vincular_ao_planejado(v_id, v_planejado);
    if v_vinculo ? 'planejado_id' then
      v_vinculados := v_vinculados || (v_vinculo || jsonb_build_object('treino_id', v_id));
    elsif v_vinculo ? 'candidatos' then
      v_ambiguos := v_ambiguos + 1;
    end if;
  end loop;

  return jsonb_build_object('novos', v_novos, 'completados', v_completados, 'parciais', v_parciais,
                            'ignorados', v_ignorados, 'vinculados', v_vinculados, 'ambiguos', v_ambiguos);
end;
$$;

revoke execute on function public.importar_treinos(jsonb) from public, anon;
grant execute on function public.importar_treinos(jsonb) to authenticated;

notify pgrst, 'reload schema';
