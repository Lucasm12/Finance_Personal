-- =============================================================================
-- Corpo — composição corporal e medidas em cada pesagem, e o plano de peso
-- (meta semanal até o peso objetivo).
-- Também remove a antiga integração com o Strava (os treinos agora entram
-- só manualmente ou por arquivo). Rode DEPOIS dos arquivos anteriores;
-- pode rodar mais de uma vez sem problema.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- pesagens: dados de balança de bioimpedância e circunferências (todos opcionais)
-- -----------------------------------------------------------------------------
alter table public.pesagens
  add column if not exists massa_muscular_kg  numeric(5,2) check (massa_muscular_kg between 10 and 150),
  add column if not exists agua_pct           numeric(4,1) check (agua_pct between 30 and 80),
  add column if not exists gordura_visceral   numeric(3,1) check (gordura_visceral between 1 and 59),
  add column if not exists massa_ossea_kg     numeric(4,2) check (massa_ossea_kg between 0.5 and 8),
  add column if not exists cintura_cm         numeric(5,1) check (cintura_cm between 40 and 200),
  add column if not exists quadril_cm         numeric(5,1) check (quadril_cm between 50 and 200),
  add column if not exists pescoco_cm         numeric(4,1) check (pescoco_cm between 20 and 70),
  add column if not exists braco_cm           numeric(4,1) check (braco_cm between 15 and 70),
  add column if not exists coxa_cm            numeric(4,1) check (coxa_cm between 30 and 100);

-- -----------------------------------------------------------------------------
-- perfil_atleta: plano de peso — quantos kg por semana até o peso meta,
-- contando a partir de uma data e de um peso inicial
-- -----------------------------------------------------------------------------
alter table public.perfil_atleta
  add column if not exists meta_semanal_kg       numeric(3,2) check (meta_semanal_kg between 0.05 and 2),
  add column if not exists meta_inicio           date,
  add column if not exists meta_peso_inicial_kg  numeric(5,2) check (meta_peso_inicial_kg between 30 and 250);

-- -----------------------------------------------------------------------------
-- Sem Strava: apaga tokens e estados de login; treinos que vieram de lá
-- continuam, marcados como importados.
-- -----------------------------------------------------------------------------
drop table if exists public.strava_oauth_estados;
drop table if exists public.integracoes_strava;

update public.treinos set origem = 'arquivo' where origem = 'strava';
alter table public.treinos drop constraint if exists treinos_origem_check;
alter table public.treinos add constraint treinos_origem_check check (origem in ('manual', 'arquivo'));

-- a API do Supabase passa a enxergar as colunas novas na hora
notify pgrst, 'reload schema';
