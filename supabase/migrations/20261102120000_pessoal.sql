-- =============================================================================
-- Módulo Pessoal — Meu dia, objetivos e metas do ano, leitura da Bíblia,
-- hábitos, tarefas, diário e revisões. Rode DEPOIS dos arquivos anteriores;
-- pode rodar mais de uma vez sem problema.
--
-- O texto da Bíblia (31 mil versículos) entra pelo script de seed:
--   npm run seed:biblia        (passo a passo no README, seção "Bíblia")
--
-- Regras do projeto (SEGURANCA.md): RLS em toda tabela, chaves compostas
-- (id, user_id) para um registro só apontar para outro do mesmo dono, limite
-- de tamanho em texto/JSON, nada para o papel anônimo e EXECUTE explícito em
-- cada função. Streaks e progresso são calculados aqui, no banco.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Datas: o "dia" é sempre o de São Paulo
-- -----------------------------------------------------------------------------
create or replace function public.hoje_sp()
returns date
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

create or replace function public.dia_sp(p_momento timestamptz)
returns date
language sql
stable
set search_path = ''
as $$ select (p_momento at time zone 'America/Sao_Paulo')::date $$;

-- frequência de hábito: {"tipo": "diaria"} ou {"tipo": "dias", "dias": [1, 3, 5]} (1 = segunda … 7 = domingo)
create or replace function public.frequencia_valida(p_frequencia jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_frequencia ->> 'tipo'
    when 'diaria' then true
    when 'dias' then jsonb_typeof(p_frequencia -> 'dias') = 'array'
      and jsonb_array_length(p_frequencia -> 'dias') between 1 and 7
      and not exists (
        select 1 from jsonb_array_elements(p_frequencia -> 'dias') d
         where jsonb_typeof(d) <> 'number' or d::text !~ '^[1-7]$'
      )
    else false
  end
$$;

create or replace function public.habito_previsto(p_frequencia jsonb, p_dia date)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_frequencia ->> 'tipo' = 'diaria'
      or (p_frequencia -> 'dias') @> to_jsonb(extract(isodow from p_dia)::int)
$$;

-- -----------------------------------------------------------------------------
-- 2. Bíblia (pública para quem está logado, somente leitura)
-- -----------------------------------------------------------------------------
create table if not exists public.biblia_livros (
  id               smallint primary key,
  nome             text not null,
  abreviacao       text not null unique,
  testamento       text not null check (testamento in ('AT', 'NT')),
  ordem            smallint not null unique,
  total_capitulos  smallint not null check (total_capitulos between 1 and 150),
  constraint biblia_livros_nome_tamanho check (char_length(nome) <= 60),
  constraint biblia_livros_abreviacao_tamanho check (char_length(abreviacao) <= 10),
  constraint biblia_livros_testamento_tamanho check (char_length(testamento) <= 2)
);

insert into public.biblia_livros (id, nome, abreviacao, testamento, ordem, total_capitulos) values
  (1, 'Gênesis', 'Gn', 'AT', 1, 50), (2, 'Êxodo', 'Êx', 'AT', 2, 40), (3, 'Levítico', 'Lv', 'AT', 3, 27),
  (4, 'Números', 'Nm', 'AT', 4, 36), (5, 'Deuteronômio', 'Dt', 'AT', 5, 34), (6, 'Josué', 'Js', 'AT', 6, 24),
  (7, 'Juízes', 'Jz', 'AT', 7, 21), (8, 'Rute', 'Rt', 'AT', 8, 4), (9, '1 Samuel', '1Sm', 'AT', 9, 31),
  (10, '2 Samuel', '2Sm', 'AT', 10, 24), (11, '1 Reis', '1Rs', 'AT', 11, 22), (12, '2 Reis', '2Rs', 'AT', 12, 25),
  (13, '1 Crônicas', '1Cr', 'AT', 13, 29), (14, '2 Crônicas', '2Cr', 'AT', 14, 36), (15, 'Esdras', 'Ed', 'AT', 15, 10),
  (16, 'Neemias', 'Ne', 'AT', 16, 13), (17, 'Ester', 'Et', 'AT', 17, 10), (18, 'Jó', 'Jó', 'AT', 18, 42),
  (19, 'Salmos', 'Sl', 'AT', 19, 150), (20, 'Provérbios', 'Pv', 'AT', 20, 31), (21, 'Eclesiastes', 'Ec', 'AT', 21, 12),
  (22, 'Cânticos', 'Ct', 'AT', 22, 8), (23, 'Isaías', 'Is', 'AT', 23, 66), (24, 'Jeremias', 'Jr', 'AT', 24, 52),
  (25, 'Lamentações', 'Lm', 'AT', 25, 5), (26, 'Ezequiel', 'Ez', 'AT', 26, 48), (27, 'Daniel', 'Dn', 'AT', 27, 12),
  (28, 'Oseias', 'Os', 'AT', 28, 14), (29, 'Joel', 'Jl', 'AT', 29, 3), (30, 'Amós', 'Am', 'AT', 30, 9),
  (31, 'Obadias', 'Ob', 'AT', 31, 1), (32, 'Jonas', 'Jn', 'AT', 32, 4), (33, 'Miqueias', 'Mq', 'AT', 33, 7),
  (34, 'Naum', 'Na', 'AT', 34, 3), (35, 'Habacuque', 'Hc', 'AT', 35, 3), (36, 'Sofonias', 'Sf', 'AT', 36, 3),
  (37, 'Ageu', 'Ag', 'AT', 37, 2), (38, 'Zacarias', 'Zc', 'AT', 38, 14), (39, 'Malaquias', 'Ml', 'AT', 39, 4),
  (40, 'Mateus', 'Mt', 'NT', 40, 28), (41, 'Marcos', 'Mc', 'NT', 41, 16), (42, 'Lucas', 'Lc', 'NT', 42, 24),
  (43, 'João', 'Jo', 'NT', 43, 21), (44, 'Atos', 'At', 'NT', 44, 28), (45, 'Romanos', 'Rm', 'NT', 45, 16),
  (46, '1 Coríntios', '1Co', 'NT', 46, 16), (47, '2 Coríntios', '2Co', 'NT', 47, 13), (48, 'Gálatas', 'Gl', 'NT', 48, 6),
  (49, 'Efésios', 'Ef', 'NT', 49, 6), (50, 'Filipenses', 'Fp', 'NT', 50, 4), (51, 'Colossenses', 'Cl', 'NT', 51, 4),
  (52, '1 Tessalonicenses', '1Ts', 'NT', 52, 5), (53, '2 Tessalonicenses', '2Ts', 'NT', 53, 3), (54, '1 Timóteo', '1Tm', 'NT', 54, 6),
  (55, '2 Timóteo', '2Tm', 'NT', 55, 4), (56, 'Tito', 'Tt', 'NT', 56, 3), (57, 'Filemom', 'Fm', 'NT', 57, 1),
  (58, 'Hebreus', 'Hb', 'NT', 58, 13), (59, 'Tiago', 'Tg', 'NT', 59, 5), (60, '1 Pedro', '1Pe', 'NT', 60, 5),
  (61, '2 Pedro', '2Pe', 'NT', 61, 3), (62, '1 João', '1Jo', 'NT', 62, 5), (63, '2 João', '2Jo', 'NT', 63, 1),
  (64, '3 João', '3Jo', 'NT', 64, 1), (65, 'Judas', 'Jd', 'NT', 65, 1), (66, 'Apocalipse', 'Ap', 'NT', 66, 22)
on conflict (id) do update
  set nome = excluded.nome, abreviacao = excluded.abreviacao, testamento = excluded.testamento,
      ordem = excluded.ordem, total_capitulos = excluded.total_capitulos;

-- um registro por capítulo (1.189): garante que leitura e anotações apontem para capítulos que existem
create table if not exists public.biblia_capitulos (
  livro_id  smallint not null references public.biblia_livros (id),
  capitulo  smallint not null check (capitulo >= 1),
  primary key (livro_id, capitulo)
);

insert into public.biblia_capitulos (livro_id, capitulo)
select l.id, c
  from public.biblia_livros l, generate_series(1, l.total_capitulos) c
on conflict do nothing;

-- texto: preenchido pelo seed. O id é estável entre importações (livro·1.000.000 + capítulo·1.000 + versículo),
-- então os versículos marcados continuam valendo se o seed rodar de novo.
-- A chave única (livro_id, capitulo, versiculo) também serve de índice para abrir um capítulo.
create table if not exists public.biblia_versiculos (
  id         integer primary key,
  livro_id   smallint not null,
  capitulo   smallint not null,
  versiculo  smallint not null check (versiculo between 1 and 176),
  texto      text not null check (length(trim(texto)) > 0),
  constraint biblia_versiculos_ref_key unique (livro_id, capitulo, versiculo),
  constraint biblia_versiculos_capitulo_fkey foreign key (livro_id, capitulo) references public.biblia_capitulos (livro_id, capitulo),
  constraint biblia_versiculos_id_check check (id = livro_id * 1000000 + capitulo * 1000 + versiculo),
  constraint biblia_versiculos_texto_tamanho check (char_length(texto) <= 2000)
);

-- ordem de leitura de cada plano (1.189 capítulos em cada)
create table if not exists public.biblia_plano_ordem (
  plano     text not null check (plano in ('sequencial', 'cronologico', 'paralelo')),
  posicao   smallint not null check (posicao between 1 and 1189),
  livro_id  smallint not null,
  capitulo  smallint not null,
  primary key (plano, posicao),
  constraint biblia_plano_ordem_capitulo_key unique (plano, livro_id, capitulo),
  constraint biblia_plano_ordem_capitulo_fkey foreign key (livro_id, capitulo) references public.biblia_capitulos (livro_id, capitulo),
  constraint biblia_plano_ordem_plano_tamanho check (char_length(plano) <= 20)
);

delete from public.biblia_plano_ordem;

-- sequencial: Gênesis a Apocalipse
insert into public.biblia_plano_ordem (plano, posicao, livro_id, capitulo)
select 'sequencial', row_number() over (order by l.ordem, c), l.id, c
  from public.biblia_livros l, generate_series(1, l.total_capitulos) c;

-- AT + NT em paralelo: os dois testamentos avançam na mesma proporção (≈ 2,5 do AT para 0,7 do NT por dia)
insert into public.biblia_plano_ordem (plano, posicao, livro_id, capitulo)
select 'paralelo', row_number() over (order by (x.n - 0.5) / x.total, x.testamento), x.id, x.c
  from (
    select l.id, c, l.testamento,
           row_number() over (partition by l.testamento order by l.ordem, c) as n,
           count(*) over (partition by l.testamento) as total
      from public.biblia_livros l, generate_series(1, l.total_capitulos) c
  ) x;

-- cronológico (aproximado): livros na ordem dos acontecimentos; Reis e Crônicas intercalados com os
-- profetas da época; epístolas encaixadas em Atos
insert into public.biblia_plano_ordem (plano, posicao, livro_id, capitulo)
select 'cronologico', row_number() over (order by s.ordem, c), s.livro_id, c
  from (values
    (1, 1, 1, 11), (2, 18, 1, 42), (3, 1, 12, 50), (4, 2, 1, 40), (5, 3, 1, 27), (6, 4, 1, 36), (7, 5, 1, 34),
    (8, 19, 90, 90), (9, 6, 1, 24), (10, 7, 1, 21), (11, 8, 1, 4), (12, 9, 1, 31), (13, 13, 1, 10), (14, 10, 1, 24),
    (15, 13, 11, 29), (16, 19, 1, 89), (17, 19, 91, 150), (18, 11, 1, 11), (19, 14, 1, 9), (20, 20, 1, 31),
    (21, 21, 1, 12), (22, 22, 1, 8), (23, 11, 12, 22), (24, 14, 10, 20), (25, 31, 1, 1), (26, 12, 1, 8),
    (27, 14, 21, 22), (28, 29, 1, 3), (29, 12, 9, 14), (30, 14, 23, 25), (31, 32, 1, 4), (32, 30, 1, 9),
    (33, 12, 15, 16), (34, 14, 26, 28), (35, 28, 1, 14), (36, 23, 1, 39), (37, 33, 1, 7), (38, 12, 17, 20),
    (39, 14, 29, 32), (40, 34, 1, 3), (41, 12, 21, 23), (42, 14, 33, 35), (43, 36, 1, 3), (44, 35, 1, 3),
    (45, 24, 1, 52), (46, 12, 24, 25), (47, 14, 36, 36), (48, 25, 1, 5), (49, 26, 1, 48), (50, 27, 1, 12),
    (51, 23, 40, 66), (52, 15, 1, 6), (53, 37, 1, 2), (54, 38, 1, 14), (55, 17, 1, 10), (56, 15, 7, 10),
    (57, 16, 1, 13), (58, 39, 1, 4),
    (59, 40, 1, 28), (60, 41, 1, 16), (61, 42, 1, 24), (62, 43, 1, 21), (63, 44, 1, 12), (64, 59, 1, 5),
    (65, 44, 13, 14), (66, 48, 1, 6), (67, 44, 15, 17), (68, 52, 1, 5), (69, 53, 1, 3), (70, 44, 18, 19),
    (71, 46, 1, 16), (72, 47, 1, 13), (73, 45, 1, 16), (74, 44, 20, 28), (75, 49, 1, 6), (76, 50, 1, 4),
    (77, 51, 1, 4), (78, 57, 1, 1), (79, 54, 1, 6), (80, 56, 1, 3), (81, 60, 1, 5), (82, 55, 1, 4),
    (83, 61, 1, 3), (84, 58, 1, 13), (85, 65, 1, 1), (86, 62, 1, 5), (87, 63, 1, 1), (88, 64, 1, 1), (89, 66, 1, 22)
  ) as s (ordem, livro_id, de, ate),
  generate_series(s.de, s.ate) c;

do $$
begin
  if (select count(*) from public.biblia_capitulos) <> 1189
     or exists (select 1 from public.biblia_plano_ordem group by plano having count(*) <> 1189)
     or (select count(distinct plano) from public.biblia_plano_ordem) <> 3 then
    raise exception 'Ordem dos planos de leitura incompleta.';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Dados do usuário
-- -----------------------------------------------------------------------------

-- áreas da vida (Espiritual, Saúde, Família... e as que a pessoa criar)
create table if not exists public.areas_vida (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome        text not null check (length(trim(nome)) > 0),
  cor         text not null default '#2a78d6' check (cor ~ '^#[0-9a-fA-F]{6}$'),
  icone       text not null default 'pessoal' check (icone ~ '^[a-z_]{1,20}$'),
  ordem       smallint not null default 0,
  created_at  timestamptz not null default now(),
  constraint areas_vida_id_user_key unique (id, user_id),
  constraint areas_vida_nome_tamanho check (char_length(nome) <= 40),
  constraint areas_vida_cor_tamanho check (char_length(cor) <= 7),
  constraint areas_vida_icone_tamanho check (char_length(icone) <= 20)
);
create unique index if not exists areas_vida_user_nome_key on public.areas_vida (user_id, lower(nome));

create table if not exists public.objetivos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  area_id     uuid not null,
  titulo      text not null check (length(trim(titulo)) > 0),
  descricao   text,
  ano         smallint not null check (ano between 2000 and 2100),
  status      text not null default 'em_andamento' check (status in ('nao_iniciada', 'em_andamento', 'concluida', 'pausada')),
  created_at  timestamptz not null default now(),
  constraint objetivos_id_user_key unique (id, user_id),
  constraint objetivos_area_fkey foreign key (area_id, user_id) references public.areas_vida (id, user_id),
  constraint objetivos_titulo_tamanho check (char_length(titulo) <= 200),
  constraint objetivos_descricao_tamanho check (char_length(descricao) <= 2000),
  constraint objetivos_status_tamanho check (char_length(status) <= 20)
);
create index if not exists objetivos_user_ano_idx on public.objetivos (user_id, ano);

-- treinos e provas ganham a chave (id, user_id) para as metas de Saúde apontarem só para dados do mesmo usuário
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'provas_id_user_key') then
    alter table public.provas add constraint provas_id_user_key unique (id, user_id);
  end if;
end;
$$;

-- metas: numérica (5/12 livros), sim/não ou por marcos. origem_automatica: o progresso vem da
-- leitura da Bíblia ou dos treinos, calculado na view metas_situacao.
create table if not exists public.metas (
  id                 uuid primary key default gen_random_uuid(),
  objetivo_id        uuid not null,
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  titulo             text not null check (length(trim(titulo)) > 0),
  tipo               text not null default 'numerica' check (tipo in ('numerica', 'sim_nao', 'marcos')),
  valor_atual        numeric(12,2) not null default 0,
  valor_alvo         numeric(12,2) check (valor_alvo > 0),
  unidade            text,
  inicio             date not null default public.hoje_sp(),
  prazo              date,
  status             text not null default 'em_andamento' check (status in ('nao_iniciada', 'em_andamento', 'concluida', 'pausada')),
  origem_automatica  text not null default 'nenhuma' check (origem_automatica in ('biblia', 'treino', 'nenhuma')),
  -- metas ligadas aos treinos (origem_automatica = 'treino')
  treino_criterio    text check (treino_criterio in ('sessoes', 'distancia', 'horas', 'frequencia_semanal', 'prova')),
  treino_modalidade  text check (treino_modalidade in ('natacao', 'ciclismo', 'corrida', 'forca', 'outro')),
  treino_por_semana  smallint check (treino_por_semana between 1 and 14),
  prova_id           uuid,
  created_at         timestamptz not null default now(),
  constraint metas_id_user_key unique (id, user_id),
  constraint metas_objetivo_fkey foreign key (objetivo_id, user_id) references public.objetivos (id, user_id) on delete cascade,
  -- apagar a prova não apaga a meta: ela fica sem prova (progresso 0) até ser editada
  constraint metas_prova_fkey foreign key (prova_id, user_id) references public.provas (id, user_id) on delete set null (prova_id),
  constraint metas_prazo_check check (prazo is null or prazo >= inicio),
  constraint metas_alvo_check check (tipo <> 'numerica' or valor_alvo is not null or treino_criterio in ('frequencia_semanal', 'prova')),
  constraint metas_origem_check check (
    case origem_automatica
      when 'treino' then tipo = 'numerica' and treino_criterio is not null
        and (treino_criterio <> 'frequencia_semanal' or (treino_por_semana is not null and prazo is not null))
      when 'biblia' then tipo = 'numerica' and treino_criterio is null and prova_id is null
      else treino_criterio is null and treino_modalidade is null and treino_por_semana is null and prova_id is null
    end
  ),
  constraint metas_titulo_tamanho check (char_length(titulo) <= 200),
  constraint metas_unidade_tamanho check (char_length(unidade) <= 30),
  constraint metas_tipo_tamanho check (char_length(tipo) <= 20),
  constraint metas_status_tamanho check (char_length(status) <= 20),
  constraint metas_origem_automatica_tamanho check (char_length(origem_automatica) <= 20),
  constraint metas_treino_criterio_tamanho check (char_length(treino_criterio) <= 20),
  constraint metas_treino_modalidade_tamanho check (char_length(treino_modalidade) <= 20)
);
create index if not exists metas_user_idx on public.metas (user_id, objetivo_id);
-- uma única meta automática da Bíblia em aberto por pessoa
create unique index if not exists metas_biblia_aberta_key on public.metas (user_id)
  where origem_automatica = 'biblia' and status <> 'concluida';

-- registros de progresso das metas numéricas (incrementos: +1 livro, +3 km...)
create table if not exists public.metas_progresso (
  id             uuid primary key default gen_random_uuid(),
  meta_id        uuid not null,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  valor          numeric(12,2) not null check (valor <> 0),
  observacao     text,
  registrado_em  date not null default public.hoje_sp(),
  created_at     timestamptz not null default now(),
  constraint metas_progresso_meta_fkey foreign key (meta_id, user_id) references public.metas (id, user_id) on delete cascade,
  constraint metas_progresso_observacao_tamanho check (char_length(observacao) <= 2000)
);
create index if not exists metas_progresso_meta_idx on public.metas_progresso (meta_id, registrado_em);

create table if not exists public.metas_marcos (
  id            uuid primary key default gen_random_uuid(),
  meta_id       uuid not null,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  titulo        text not null check (length(trim(titulo)) > 0),
  ordem         smallint not null default 0,
  concluido     boolean not null default false,
  concluido_em  date,
  created_at    timestamptz not null default now(),
  constraint metas_marcos_meta_fkey foreign key (meta_id, user_id) references public.metas (id, user_id) on delete cascade,
  constraint metas_marcos_titulo_tamanho check (char_length(titulo) <= 200)
);
create index if not exists metas_marcos_meta_idx on public.metas_marcos (meta_id, ordem);

create table if not exists public.habitos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  area_id     uuid,
  titulo      text not null check (length(trim(titulo)) > 0),
  frequencia  jsonb not null default '{"tipo": "diaria"}' check (public.frequencia_valida(frequencia)),
  ativo       boolean not null default true,
  -- dias antes do início não contam no percentual nem quebram a sequência
  inicio      date not null default public.hoje_sp(),
  created_at  timestamptz not null default now(),
  constraint habitos_id_user_key unique (id, user_id),
  constraint habitos_area_fkey foreign key (area_id, user_id) references public.areas_vida (id, user_id) on delete set null (area_id),
  constraint habitos_titulo_tamanho check (char_length(titulo) <= 120),
  constraint habitos_frequencia_tamanho check (pg_column_size(frequencia) <= 512)
);

create table if not exists public.habitos_registros (
  id         uuid primary key default gen_random_uuid(),
  habito_id  uuid not null,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data       date not null,
  feito      boolean not null default true,
  constraint habitos_registros_key unique (habito_id, data),
  constraint habitos_registros_habito_fkey foreign key (habito_id, user_id) references public.habitos (id, user_id) on delete cascade
);
create index if not exists habitos_registros_user_data_idx on public.habitos_registros (user_id, data);

create table if not exists public.tarefas (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  meta_id       uuid,
  area_id       uuid,
  titulo        text not null check (length(trim(titulo)) > 0),
  data          date not null default public.hoje_sp(),
  prioridade    text not null default 'media' check (prioridade in ('alta', 'media', 'baixa')),
  -- uma das 3 prioridades do dia (no máximo 3 por dia)
  foco          boolean not null default false,
  concluida     boolean not null default false,
  concluida_em  timestamptz,
  created_at    timestamptz not null default now(),
  constraint tarefas_meta_fkey foreign key (meta_id, user_id) references public.metas (id, user_id) on delete set null (meta_id),
  constraint tarefas_area_fkey foreign key (area_id, user_id) references public.areas_vida (id, user_id) on delete set null (area_id),
  constraint tarefas_titulo_tamanho check (char_length(titulo) <= 200),
  constraint tarefas_prioridade_tamanho check (char_length(prioridade) <= 10)
);
create index if not exists tarefas_user_data_idx on public.tarefas (user_id, data);

create table if not exists public.diario (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data           date not null default public.hoje_sp(),
  humor          smallint check (humor between 1 and 5),
  gratidao       jsonb not null default '[]' check (jsonb_typeof(gratidao) = 'array' and jsonb_array_length(gratidao) <= 3),
  texto          text,
  created_at     timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  constraint diario_user_data_key unique (user_id, data),
  constraint diario_texto_tamanho check (char_length(texto) <= 10000),
  constraint diario_gratidao_tamanho check (pg_column_size(gratidao) <= 4096)
);

create table if not exists public.revisoes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo            text not null check (tipo in ('semanal', 'mensal')),
  -- semanal: segunda-feira da semana revisada; mensal: dia 1 do mês
  periodo_inicio  date not null,
  respostas       jsonb not null default '{}' check (jsonb_typeof(respostas) = 'object'),
  created_at      timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  constraint revisoes_key unique (user_id, tipo, periodo_inicio),
  constraint revisoes_periodo_check check (
    case tipo when 'semanal' then extract(isodow from periodo_inicio) = 1 else extract(day from periodo_inicio) = 1 end
  ),
  constraint revisoes_tipo_tamanho check (char_length(tipo) <= 10),
  constraint revisoes_respostas_tamanho check (pg_column_size(respostas) <= 32768)
);

create table if not exists public.planos_leitura (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo         text not null check (tipo in ('sequencial', 'cronologico', 'paralelo')),
  data_inicio  date not null default public.hoje_sp(),
  data_fim     date not null,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now(),
  constraint planos_leitura_datas_check check (data_fim between data_inicio + 29 and data_inicio + 1100),
  constraint planos_leitura_tipo_tamanho check (char_length(tipo) <= 20)
);
create unique index if not exists planos_leitura_ativo_key on public.planos_leitura (user_id) where ativo;

create table if not exists public.leitura_progresso (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  livro_id      smallint not null,
  capitulo      smallint not null,
  concluido_em  timestamptz not null default now(),
  constraint leitura_progresso_key unique (user_id, livro_id, capitulo),
  constraint leitura_progresso_capitulo_fkey foreign key (livro_id, capitulo) references public.biblia_capitulos (livro_id, capitulo)
);
create index if not exists leitura_progresso_user_em_idx on public.leitura_progresso (user_id, concluido_em);

create table if not exists public.leitura_anotacoes (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  livro_id            smallint not null,
  capitulo            smallint not null,
  versiculo_destaque  smallint check (versiculo_destaque between 1 and 176),
  reflexao            text,
  aplicacao           text,
  created_at          timestamptz not null default now(),
  constraint leitura_anotacoes_capitulo_fkey foreign key (livro_id, capitulo) references public.biblia_capitulos (livro_id, capitulo),
  constraint leitura_anotacoes_conteudo_check check (
    versiculo_destaque is not null or length(trim(coalesce(reflexao, ''))) > 0 or length(trim(coalesce(aplicacao, ''))) > 0
  ),
  constraint leitura_anotacoes_reflexao_tamanho check (char_length(reflexao) <= 4000),
  constraint leitura_anotacoes_aplicacao_tamanho check (char_length(aplicacao) <= 4000)
);
create index if not exists leitura_anotacoes_user_idx on public.leitura_anotacoes (user_id, livro_id, capitulo);

create table if not exists public.versiculos_marcados (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versiculo_id  integer not null references public.biblia_versiculos (id) on delete cascade,
  cor           text not null default 'amarelo' check (cor in ('amarelo', 'verde', 'azul', 'rosa', 'laranja')),
  nota          text,
  created_at    timestamptz not null default now(),
  constraint versiculos_marcados_key unique (user_id, versiculo_id),
  constraint versiculos_marcados_nota_tamanho check (char_length(nota) <= 1000),
  constraint versiculos_marcados_cor_tamanho check (char_length(cor) <= 10)
);

-- -----------------------------------------------------------------------------
-- 4. Gatilhos (rodam com as permissões de quem grava: só enxergam os dados dele)
-- -----------------------------------------------------------------------------

-- valor atual das metas numéricas = soma dos registros de progresso
create or replace function public.recalcular_valor_meta()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_meta uuid := case when tg_op = 'DELETE' then old.meta_id else new.meta_id end;
begin
  update public.metas
     set valor_atual = (select coalesce(sum(p.valor), 0) from public.metas_progresso p where p.meta_id = v_meta),
         status = case when status = 'nao_iniciada' then 'em_andamento' else status end
   where id = v_meta;
  if tg_op = 'UPDATE' and old.meta_id <> new.meta_id then
    update public.metas
       set valor_atual = (select coalesce(sum(p.valor), 0) from public.metas_progresso p where p.meta_id = old.meta_id)
     where id = old.meta_id;
  end if;
  return null;
end;
$$;

drop trigger if exists metas_progresso_valor on public.metas_progresso;
create trigger metas_progresso_valor after insert or update or delete on public.metas_progresso
  for each row execute function public.recalcular_valor_meta();

-- data de conclusão de marcos e tarefas
create or replace function public.marcar_conclusao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'metas_marcos' then
    new.concluido_em := case when not new.concluido then null else coalesce(new.concluido_em, public.hoje_sp()) end;
  else
    new.concluida_em := case when not new.concluida then null else coalesce(new.concluida_em, now()) end;
  end if;
  return new;
end;
$$;

drop trigger if exists metas_marcos_conclusao on public.metas_marcos;
create trigger metas_marcos_conclusao before insert or update on public.metas_marcos
  for each row execute function public.marcar_conclusao();
drop trigger if exists tarefas_conclusao on public.tarefas;
create trigger tarefas_conclusao before insert or update on public.tarefas
  for each row execute function public.marcar_conclusao();

-- no máximo 3 prioridades (foco) por dia
create or replace function public.limitar_foco()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.foco and (
    select count(*) from public.tarefas t
     where t.user_id = new.user_id and t.data = new.data and t.foco and t.id <> new.id
  ) >= 3 then
    raise exception 'Já existem 3 prioridades para este dia. Tire uma antes de marcar outra.';
  end if;
  return new;
end;
$$;

drop trigger if exists tarefas_foco on public.tarefas;
create trigger tarefas_foco before insert or update of foco, data on public.tarefas
  for each row execute function public.limitar_foco();

-- capítulo concluído "no futuro" vira agora (a data é a do servidor)
create or replace function public.leitura_sem_futuro()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.concluido_em > now() then
    new.concluido_em := now();
  end if;
  return new;
end;
$$;

drop trigger if exists leitura_progresso_data on public.leitura_progresso;
create trigger leitura_progresso_data before insert or update of concluido_em on public.leitura_progresso
  for each row execute function public.leitura_sem_futuro();

-- -----------------------------------------------------------------------------
-- 5. Cálculos no servidor (views e funções com as permissões de quem consulta)
-- -----------------------------------------------------------------------------

-- progresso de cada meta comparado com o esperado para a data
create or replace view public.metas_situacao
with (security_invoker = true)
as
with base as (
  select m.*,
         o.area_id,
         o.ano,
         public.hoje_sp() as hoje,
         case
           when m.treino_criterio = 'prova' then coalesce((select pr.data from public.provas pr where pr.id = m.prova_id), coalesce(m.prazo, make_date(o.ano, 12, 31)))
           else coalesce(m.prazo, make_date(o.ano, 12, 31))
         end as fim
    from public.metas m
    join public.objetivos o on o.id = m.objetivo_id
),
calculo as (
  select b.*,
    case
      when b.origem_automatica = 'biblia' then
        (select count(*) from public.leitura_progresso p where p.user_id = b.user_id)::numeric
      when b.treino_criterio = 'sessoes' then
        (select count(*) from public.treinos t
          where t.user_id = b.user_id and public.dia_sp(t.data_hora) between b.inicio and b.fim
            and (b.treino_modalidade is null or t.modalidade = b.treino_modalidade))::numeric
      when b.treino_criterio = 'distancia' then
        (select round(coalesce(sum(t.distancia_m), 0) / 1000, 2) from public.treinos t
          where t.user_id = b.user_id and public.dia_sp(t.data_hora) between b.inicio and b.fim
            and (b.treino_modalidade is null or t.modalidade = b.treino_modalidade))
      when b.treino_criterio = 'horas' then
        (select round(coalesce(sum(t.duracao_seg), 0) / 3600.0, 2) from public.treinos t
          where t.user_id = b.user_id and public.dia_sp(t.data_hora) between b.inicio and b.fim
            and (b.treino_modalidade is null or t.modalidade = b.treino_modalidade))
      when b.treino_criterio = 'frequencia_semanal' then
        (select count(*) from (
           select date_trunc('week', public.dia_sp(t.data_hora))
             from public.treinos t
            where t.user_id = b.user_id and public.dia_sp(t.data_hora) between b.inicio and b.fim
              and (b.treino_modalidade is null or t.modalidade = b.treino_modalidade)
            group by 1
           having count(*) >= b.treino_por_semana
        ) semanas)::numeric
      when b.treino_criterio = 'prova' then
        coalesce((select case when pr.resultado_tempo_seg is not null then 1 else 0 end from public.provas pr where pr.id = b.prova_id), 0)::numeric
      when b.tipo = 'marcos' then
        (select count(*) filter (where mm.concluido) from public.metas_marcos mm where mm.meta_id = b.id)::numeric
      else b.valor_atual
    end as valor,
    case
      when b.origem_automatica = 'biblia' then 1189
      when b.treino_criterio = 'frequencia_semanal' then ceil((b.fim - b.inicio + 1) / 7.0)
      when b.treino_criterio = 'prova' or b.tipo = 'sim_nao' then 1
      when b.tipo = 'marcos' then (select count(*) from public.metas_marcos mm where mm.meta_id = b.id)
      else b.valor_alvo
    end as alvo,
    -- fração do período já decorrida (sim/não e prova: só é "esperada" no fim)
    case
      when b.tipo = 'sim_nao' or b.treino_criterio = 'prova' then case when b.hoje > b.fim then 1 else 0 end
      when b.hoje < b.inicio then 0
      when b.hoje >= b.fim then 1
      else round((b.hoje - b.inicio + 1)::numeric / (b.fim - b.inicio + 1), 4)
    end as esperado
  from base b
),
percentual as (
  select c.*, case when c.alvo > 0 then round(least(c.valor / c.alvo, 1), 4) else 0 end as percentual
    from calculo c
)
select p.*,
  case
    when p.status = 'concluida' or (p.alvo > 0 and p.valor >= p.alvo) then 'concluida'
    when p.status = 'pausada' then 'pausada'
    -- atrasada: abaixo de 90% do esperado para hoje (ou o prazo passou sem concluir)
    when p.esperado > 0 and p.percentual < p.esperado * 0.9 then 'atrasada'
    when p.valor = 0 and p.status = 'nao_iniciada' then 'nao_iniciada'
    else 'em_dia'
  end as situacao
from percentual p;

-- visão anual: progresso médio por área (metas pausadas ficam de fora)
create or replace function public.visao_anual(p_ano integer)
returns table (area_id uuid, metas bigint, concluidas bigint, atrasadas bigint, progresso numeric, esperado numeric)
language sql
stable
set search_path = ''
as $$
  select a.id,
         count(s.id),
         count(s.id) filter (where s.situacao = 'concluida'),
         count(s.id) filter (where s.situacao = 'atrasada'),
         coalesce(round(avg(s.percentual), 4), 0),
         coalesce(round(avg(s.esperado), 4), 0)
    from public.areas_vida a
    left join public.metas_situacao s on s.area_id = a.id and s.ano = p_ano and s.situacao <> 'pausada'
   group by a.id
$$;

-- capítulos lidos por livro
create or replace view public.leitura_por_livro
with (security_invoker = true)
as
select l.id as livro_id, l.total_capitulos, count(p.id) as lidos
  from public.biblia_livros l
  left join public.leitura_progresso p on p.livro_id = l.id and p.user_id = (select auth.uid())
 group by l.id;

-- sequência de dias com leitura: atual (termina hoje ou ontem) e recorde
create or replace function public.sequencia_leitura(p_hoje date default null)
returns table (atual integer, recorde integer)
language sql
stable
set search_path = ''
as $$
  with dias as (
    select distinct public.dia_sp(p.concluido_em) as dia
      from public.leitura_progresso p
     where p.user_id = (select auth.uid())
  ),
  ilhas as (
    select min(dia) as inicio, max(dia) as fim, count(*)::integer as n
      from (select dia, dia - (row_number() over (order by dia))::integer as grupo from dias) g
     group by grupo
  )
  select coalesce((select n from ilhas where fim >= coalesce(p_hoje, public.hoje_sp()) - 1 order by fim desc limit 1), 0),
         coalesce((select max(n) from ilhas), 0)
$$;

-- próximo capítulo não lido na ordem do plano (depois de uma posição, ou o primeiro)
create or replace function public.proximo_capitulo(p_plano text, p_depois integer default 0)
returns table (livro_id smallint, capitulo smallint, posicao smallint)
language sql
stable
set search_path = ''
as $$
  select o.livro_id, o.capitulo, o.posicao
    from public.biblia_plano_ordem o
   where o.plano = p_plano
     and not exists (
       select 1 from public.leitura_progresso p
        where p.user_id = (select auth.uid()) and p.livro_id = o.livro_id and p.capitulo = o.capitulo
     )
   order by (o.posicao <= p_depois), o.posicao
   limit 1
$$;

-- resumo da leitura para o "Meu dia" e a página da Bíblia
create or replace function public.leitura_resumo(p_hoje date default null)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_user       uuid := auth.uid();
  v_hoje       date := coalesce(p_hoje, public.hoje_sp());
  v_plano      public.planos_leitura;
  v_tipo       text;
  v_total      integer;
  v_antes      integer;
  v_lidos_hoje integer;
  v_dias_total integer;
  v_passados   integer;
  v_restantes  integer;
  v_esperado   integer;
  v_meta_dia   integer;
  v_seq        record;
  v_proximo    record;
  v_hoje_lista jsonb;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado' using errcode = '42501';
  end if;

  select * into v_plano from public.planos_leitura where user_id = v_user and ativo;
  v_tipo := coalesce(v_plano.tipo, 'sequencial');

  select count(*),
         count(*) filter (where public.dia_sp(concluido_em) < v_hoje),
         count(*) filter (where public.dia_sp(concluido_em) = v_hoje)
    into v_total, v_antes, v_lidos_hoje
    from public.leitura_progresso where user_id = v_user;

  select * into v_seq from public.sequencia_leitura(v_hoje);
  select * into v_proximo from public.proximo_capitulo(v_tipo);

  if v_plano.id is not null then
    v_dias_total := v_plano.data_fim - v_plano.data_inicio + 1;
    v_passados   := least(greatest(v_hoje - v_plano.data_inicio + 1, 0), v_dias_total);
    v_restantes  := greatest(v_plano.data_fim - v_hoje + 1, 1);
    -- esperado até o fim de hoje (proporcional aos dias do plano)
    v_esperado   := ceil(1189.0 * v_passados / v_dias_total);
    -- meta de hoje: o que falta (no começo do dia) dividido pelos dias que restam
    v_meta_dia   := case when v_hoje < v_plano.data_inicio then ceil(1189.0 / v_dias_total)
                         else greatest(ceil((1189.0 - v_antes) / v_restantes), 0) end;

    -- capítulos de hoje: os próximos do plano que ainda não estavam lidos no começo do dia
    select coalesce(jsonb_agg(jsonb_build_object(
             'livro_id', x.livro_id, 'capitulo', x.capitulo, 'lido', x.lido) order by x.posicao), '[]')
      into v_hoje_lista
      from (
        select o.livro_id, o.capitulo, o.posicao, p.id is not null as lido
          from public.biblia_plano_ordem o
          left join public.leitura_progresso p
            on p.user_id = v_user and p.livro_id = o.livro_id and p.capitulo = o.capitulo
         where o.plano = v_tipo and (p.id is null or public.dia_sp(p.concluido_em) >= v_hoje)
         order by o.posicao
         limit v_meta_dia
      ) x;
  end if;

  return jsonb_build_object(
    'hoje', v_hoje,
    'plano', case when v_plano.id is null then null else jsonb_build_object(
      'id', v_plano.id, 'tipo', v_plano.tipo, 'data_inicio', v_plano.data_inicio, 'data_fim', v_plano.data_fim,
      'dias_total', v_dias_total, 'dias_passados', v_passados, 'dias_restantes', v_restantes) end,
    'total_lidos', v_total,
    'lidos_hoje', v_lidos_hoje,
    'percentual', round(v_total / 1189.0, 4),
    'esperado', v_esperado,
    -- positivo: adiantado; negativo: atrasado (em capítulos)
    'diferenca', case when v_esperado is null then null else v_total - v_esperado end,
    'meta_diaria', v_meta_dia,
    'ritmo_plano', case when v_dias_total is null then null else round(1189.0 / v_dias_total, 2) end,
    'capitulos_hoje', coalesce(v_hoje_lista, '[]'),
    'proximo', case when v_proximo.livro_id is null then null
                    else jsonb_build_object('livro_id', v_proximo.livro_id, 'capitulo', v_proximo.capitulo) end,
    'sequencia', v_seq.atual,
    'recorde', v_seq.recorde
  );
end;
$$;

-- estatísticas: capítulos por mês (12 meses) e calendário de calor (53 semanas)
create or replace function public.leitura_estatisticas(p_hoje date default null)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with dias as (
    select public.dia_sp(p.concluido_em) as dia, count(*) as capitulos
      from public.leitura_progresso p
     where p.user_id = (select auth.uid())
     group by 1
  ),
  ref as (select coalesce(p_hoje, public.hoje_sp()) as hoje)
  select jsonb_build_object(
    'dias_com_leitura', (select count(*) from dias),
    'livros_concluidos', (select count(*) from public.leitura_por_livro where lidos = total_capitulos),
    'media_30_dias', (select round(coalesce(sum(capitulos), 0) / 30.0, 2) from dias, ref where dia > ref.hoje - 30),
    'por_mes', (
      select jsonb_agg(jsonb_build_object('mes', m.mes, 'capitulos', coalesce(
               (select sum(d.capitulos) from dias d where date_trunc('month', d.dia) = m.mes), 0)) order by m.mes)
        from ref, generate_series(date_trunc('month', ref.hoje) - interval '11 months', date_trunc('month', ref.hoje), interval '1 month') as m (mes)
    ),
    'calor', (
      select coalesce(jsonb_agg(jsonb_build_object('dia', d.dia, 'capitulos', d.capitulos) order by d.dia), '[]')
        from dias d, ref where d.dia > ref.hoje - 371
    )
  )
$$;

-- conclui um capítulo e devolve o próximo da sequência do plano
create or replace function public.concluir_capitulo(p_livro integer, p_capitulo integer)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_user    uuid := auth.uid();
  v_tipo    text;
  v_posicao integer;
  v_prox    record;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado' using errcode = '42501';
  end if;
  insert into public.leitura_progresso (user_id, livro_id, capitulo)
  values (v_user, p_livro, p_capitulo)
  on conflict (user_id, livro_id, capitulo) do nothing;

  select coalesce((select tipo from public.planos_leitura where user_id = v_user and ativo), 'sequencial') into v_tipo;
  select posicao into v_posicao from public.biblia_plano_ordem
   where plano = v_tipo and livro_id = p_livro and capitulo = p_capitulo;
  select * into v_prox from public.proximo_capitulo(v_tipo, coalesce(v_posicao, 0));

  return jsonb_build_object('proximo', case when v_prox.livro_id is null then null
    else jsonb_build_object('livro_id', v_prox.livro_id, 'capitulo', v_prox.capitulo) end);
end;
$$;

-- cria áreas padrão e a meta "Ler a Bíblia inteira no ano" (idempotente; o app chama ao abrir o módulo)
create or replace function public.pessoal_inicializar()
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_hoje     date := public.hoje_sp();
  v_plano    public.planos_leitura;
  v_area     uuid;
  v_objetivo uuid;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado' using errcode = '42501';
  end if;
  -- evita duplicar se o app chamar duas vezes ao mesmo tempo
  perform pg_advisory_xact_lock(hashtextextended('pessoal:' || v_user::text, 0));

  if not exists (select 1 from public.areas_vida where user_id = v_user) then
    insert into public.areas_vida (user_id, nome, cor, icone, ordem) values
      (v_user, 'Espiritual', '#6250d6', 'espiritual', 1),
      (v_user, 'Saúde', '#1baf7a', 'saude', 2),
      (v_user, 'Família', '#e87ba4', 'familia', 3),
      (v_user, 'Finanças', '#008300', 'financas', 4),
      (v_user, 'Carreira', '#2a78d6', 'carreira', 5),
      (v_user, 'Estudos', '#eb6834', 'estudos', 6),
      (v_user, 'Pessoal', '#eda100', 'pessoal', 7)
    on conflict do nothing;
  end if;

  if not exists (select 1 from public.metas where user_id = v_user and origem_automatica = 'biblia' and status <> 'concluida') then
    select id into v_area from public.areas_vida where user_id = v_user and lower(nome) = 'espiritual';
    if v_area is null then
      insert into public.areas_vida (user_id, nome, cor, icone, ordem)
      values (v_user, 'Espiritual', '#6250d6', 'espiritual', 0)
      returning id into v_area;
    end if;
    select * into v_plano from public.planos_leitura where user_id = v_user and ativo;
    insert into public.objetivos (user_id, area_id, titulo, descricao, ano)
    values (v_user, v_area, 'Ler a Bíblia inteira', 'Criado automaticamente; o progresso vem da leitura.',
            extract(year from coalesce(v_plano.data_inicio, v_hoje)))
    returning id into v_objetivo;
    insert into public.metas (objetivo_id, user_id, titulo, tipo, valor_alvo, unidade, inicio, prazo, origem_automatica)
    values (v_objetivo, v_user, 'Ler a Bíblia inteira no ano', 'numerica', 1189, 'capítulos',
            coalesce(v_plano.data_inicio, v_hoje), coalesce(v_plano.data_fim, v_hoje + 364), 'biblia');
  end if;
end;
$$;

-- escolhe (ou troca) o plano de leitura; a meta da Bíblia passa a seguir as datas do plano
create or replace function public.ativar_plano_leitura(
  p_tipo   text,
  p_inicio date default null,
  p_dias   integer default 365,
  p_zerar  boolean default false
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_inicio date := coalesce(p_inicio, public.hoje_sp());
  v_id     uuid;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado' using errcode = '42501';
  end if;
  if p_dias is null or p_dias not between 30 and 1100 then
    raise exception 'O plano precisa ter entre 30 dias e 3 anos.' using errcode = '23514';
  end if;

  update public.planos_leitura set ativo = false where user_id = v_user and ativo;
  insert into public.planos_leitura (user_id, tipo, data_inicio, data_fim)
  values (v_user, p_tipo, v_inicio, v_inicio + p_dias - 1)
  returning id into v_id;

  -- recomeçar do zero: apaga só as marcações de capítulos lidos (anotações e versículos ficam)
  if p_zerar then
    delete from public.leitura_progresso where user_id = v_user;
  end if;

  perform public.pessoal_inicializar();
  update public.metas
     set inicio = v_inicio, prazo = v_inicio + p_dias - 1
   where user_id = v_user and origem_automatica = 'biblia' and status <> 'concluida';
  return v_id;
end;
$$;

-- hábitos: previsto e feito hoje, sequência, recorde e % da semana e do mês
create or replace function public.habitos_resumo(p_hoje date default null)
returns table (
  habito_id uuid, previsto_hoje boolean, feito_hoje boolean, sequencia integer, recorde integer,
  feitos_semana integer, previstos_semana integer, feitos_mes integer, previstos_mes integer
)
language sql
stable
set search_path = ''
as $$
  with ref as (select coalesce(p_hoje, public.hoje_sp()) as hoje),
  dias as (
    select h.id as habito_id, d::date as dia, coalesce(r.feito, false) as feito, ref.hoje
      from public.habitos h
     cross join ref
     cross join lateral generate_series(greatest(h.inicio, ref.hoje - 400), ref.hoje, interval '1 day') d
      left join public.habitos_registros r on r.habito_id = h.id and r.data = d::date
     where h.user_id = (select auth.uid()) and h.ativo and public.habito_previsto(h.frequencia, d::date)
  ),
  -- hoje ainda não feito não conta como falha (o dia não acabou)
  contaveis as (select * from dias where feito or dia < hoje),
  grupos as (
    select habito_id, dia, feito,
           count(*) filter (where not feito) over (partition by habito_id order by dia) as grupo
      from contaveis
  )
  select h.id,
         coalesce(bool_or(d.dia = d.hoje), false),
         coalesce(bool_or(d.dia = d.hoje and d.feito), false),
         (select count(*)::integer from contaveis c
           where c.habito_id = h.id and c.feito
             and c.dia > coalesce((select max(f.dia) from contaveis f where f.habito_id = h.id and not f.feito), '-infinity'::date)),
         coalesce((select max(n)::integer from (select count(*) filter (where feito) as n from grupos g where g.habito_id = h.id group by grupo) x), 0),
         count(*) filter (where c2.feito and c2.dia >= date_trunc('week', c2.hoje)::date)::integer,
         count(*) filter (where c2.dia >= date_trunc('week', c2.hoje)::date)::integer,
         count(*) filter (where c2.feito and c2.dia >= date_trunc('month', c2.hoje)::date)::integer,
         count(*) filter (where c2.dia >= date_trunc('month', c2.hoje)::date)::integer
    from public.habitos h
    left join dias d on d.habito_id = h.id
    left join contaveis c2 on c2.habito_id = h.id and c2.dia = d.dia
   where h.user_id = (select auth.uid()) and h.ativo
   group by h.id
$$;

-- resumo automático da semana (segunda a domingo) para a revisão semanal
create or replace function public.resumo_semana(p_inicio date)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with periodo as (
    select p_inicio as inicio, p_inicio + 6 as fim, least(p_inicio + 6, public.hoje_sp()) as ate, (select auth.uid()) as usuario
  ),
  dias_habito as (
    select h.id, d::date as dia, coalesce(r.feito, false) as feito
      from public.habitos h
     cross join periodo
     cross join lateral generate_series(greatest(h.inicio, periodo.inicio), periodo.ate, interval '1 day') d
      left join public.habitos_registros r on r.habito_id = h.id and r.data = d::date
     where h.user_id = periodo.usuario and h.ativo and public.habito_previsto(h.frequencia, d::date)
  )
  select jsonb_build_object(
    'inicio', periodo.inicio,
    'fim', periodo.fim,
    'habitos', jsonb_build_object(
      'feitos', (select count(*) filter (where feito) from dias_habito),
      'previstos', (select count(*) from dias_habito)),
    'leitura', (select jsonb_build_object('capitulos', count(*), 'dias', count(distinct public.dia_sp(p.concluido_em)))
                  from public.leitura_progresso p
                 where p.user_id = periodo.usuario and public.dia_sp(p.concluido_em) between periodo.inicio and periodo.fim),
    'metas', jsonb_build_object(
      'registros', (select count(*) from public.metas_progresso mp
                     where mp.user_id = periodo.usuario and mp.registrado_em between periodo.inicio and periodo.fim),
      'marcos', (select count(*) from public.metas_marcos mm
                  where mm.user_id = periodo.usuario and mm.concluido_em between periodo.inicio and periodo.fim),
      'atrasadas', (select count(*) from public.metas_situacao s where s.user_id = periodo.usuario and s.situacao = 'atrasada')),
    'treinos', (select jsonb_build_object(
                   'quantidade', count(*),
                   'distancia_km', round(coalesce(sum(t.distancia_m), 0) / 1000, 1),
                   'horas', round(coalesce(sum(t.duracao_seg), 0) / 3600.0, 1))
                  from public.treinos t
                 where t.user_id = periodo.usuario and public.dia_sp(t.data_hora) between periodo.inicio and periodo.fim),
    'tarefas', (select jsonb_build_object(
                   'concluidas', count(*) filter (where t.concluida),
                   'pendentes', count(*) filter (where not t.concluida))
                  from public.tarefas t
                 where t.user_id = periodo.usuario and t.data between periodo.inicio and periodo.fim),
    'diario', (select jsonb_build_object('dias', count(*), 'humor_medio', round(avg(d.humor), 1))
                 from public.diario d
                where d.user_id = periodo.usuario and d.data between periodo.inicio and periodo.fim)
  )
  from periodo
$$;

-- -----------------------------------------------------------------------------
-- 6. Row Level Security e permissões
-- -----------------------------------------------------------------------------
alter table public.biblia_livros       enable row level security;
alter table public.biblia_capitulos    enable row level security;
alter table public.biblia_versiculos   enable row level security;
alter table public.biblia_plano_ordem  enable row level security;

drop policy if exists "bíblia: leitura para quem está logado" on public.biblia_livros;
create policy "bíblia: leitura para quem está logado" on public.biblia_livros for select to authenticated using (true);
drop policy if exists "bíblia: leitura para quem está logado" on public.biblia_capitulos;
create policy "bíblia: leitura para quem está logado" on public.biblia_capitulos for select to authenticated using (true);
drop policy if exists "bíblia: leitura para quem está logado" on public.biblia_versiculos;
create policy "bíblia: leitura para quem está logado" on public.biblia_versiculos for select to authenticated using (true);
drop policy if exists "bíblia: leitura para quem está logado" on public.biblia_plano_ordem;
create policy "bíblia: leitura para quem está logado" on public.biblia_plano_ordem for select to authenticated using (true);

revoke all on public.biblia_livros, public.biblia_capitulos, public.biblia_versiculos, public.biblia_plano_ordem from anon, authenticated;
grant select on public.biblia_livros, public.biblia_capitulos, public.biblia_versiculos, public.biblia_plano_ordem to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'areas_vida', 'objetivos', 'metas', 'metas_progresso', 'metas_marcos', 'habitos', 'habitos_registros',
    'tarefas', 'diario', 'revisoes', 'planos_leitura', 'leitura_progresso', 'leitura_anotacoes', 'versiculos_marcados'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "dados do próprio usuário" on public.%I', t);
    execute format(
      'create policy "dados do próprio usuário" on public.%I for all to authenticated
         using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    -- trilha de auditoria de exclusões (mesma regra da migração de segurança)
    execute format('drop trigger if exists auditoria_exclusao on public.%I', t);
    execute format('create trigger auditoria_exclusao after delete on public.%I for each row execute function privado.auditar()', t);
  end loop;
end;
$$;

revoke all on public.metas_situacao, public.leitura_por_livro from anon;
grant select on public.metas_situacao, public.leitura_por_livro to authenticated;

-- funções: nada para anônimos; quem está logado executa (e só enxerga os próprios dados)
revoke execute on function
  public.hoje_sp(), public.dia_sp(timestamptz), public.frequencia_valida(jsonb), public.habito_previsto(jsonb, date),
  public.recalcular_valor_meta(), public.marcar_conclusao(), public.limitar_foco(), public.leitura_sem_futuro(),
  public.visao_anual(integer), public.sequencia_leitura(date), public.proximo_capitulo(text, integer),
  public.leitura_resumo(date), public.leitura_estatisticas(date), public.concluir_capitulo(integer, integer),
  public.pessoal_inicializar(), public.ativar_plano_leitura(text, date, integer, boolean),
  public.habitos_resumo(date), public.resumo_semana(date)
from public, anon;

grant execute on function
  public.hoje_sp(), public.dia_sp(timestamptz), public.frequencia_valida(jsonb), public.habito_previsto(jsonb, date),
  public.visao_anual(integer), public.sequencia_leitura(date), public.proximo_capitulo(text, integer),
  public.leitura_resumo(date), public.leitura_estatisticas(date), public.concluir_capitulo(integer, integer),
  public.pessoal_inicializar(), public.ativar_plano_leitura(text, date, integer, boolean),
  public.habitos_resumo(date), public.resumo_semana(date)
to authenticated;

-- a API do Supabase passa a enxergar as tabelas novas na hora
notify pgrst, 'reload schema';
