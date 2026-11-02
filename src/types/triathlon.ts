export type Modalidade = 'natacao' | 'ciclismo' | 'corrida' | 'forca' | 'outro'
export type OrigemTreino = 'manual' | 'arquivo' | 'ai_endurance'

export interface Treino {
  id: string
  user_id: string
  origem: OrigemTreino
  origem_id: string | null
  modalidade: Modalidade
  tipo_original: string | null
  nome: string
  data_hora: string
  duracao_seg: number
  tempo_total_seg: number | null
  distancia_m: number | null
  elevacao_m: number | null
  fc_media: number | null
  fc_max: number | null
  potencia_media: number | null
  potencia_normalizada: number | null
  cadencia_media: number | null
  calorias: number | null
  esforco_percebido: number | null
  observacao: string | null
  dados: Record<string, unknown> | null
  created_at: string
}

export type TreinoInput = Omit<Treino, 'id' | 'user_id' | 'created_at'>

// -----------------------------------------------------------------------------
// Parciais (splits) dos treinos importados
// -----------------------------------------------------------------------------

/** km = a cada 1 km · intervalo = a cada 5 km (pedal) ou 100 m (natação) · volta = do relógio · piscina = cada piscina */
export type TipoParcial = 'km' | 'volta' | 'intervalo' | 'piscina'

export interface Parcial {
  id: string
  treino_id: string
  tipo: TipoParcial
  ordem: number
  duracao_seg: number
  distancia_m: number | null
  fc_media: number | null
  fc_max: number | null
  potencia_media: number | null
  cadencia_media: number | null
  elevacao_ganho_m: number | null
  elevacao_perda_m: number | null
  bracadas: number | null
  /** natação: crawl, costas, peito, borboleta, medley, educativo */
  estilo: string | null
  /** natação: série de descanso */
  descanso: boolean
}

export type ParcialInput = Omit<Parcial, 'id' | 'treino_id'>

export interface PerfilAtleta {
  user_id: string
  data_nascimento: string | null
  sexo: 'M' | 'F' | null
  altura_cm: number | null
  ftp_w: number | null
  fc_max: number | null
  fc_limiar: number | null
  pace_limiar_seg_km: number | null
  css_seg_100m: number | null
  peso_meta_kg: number | null
  /** plano de peso: kg por semana (sempre positivo), a partir de meta_inicio e meta_peso_inicial_kg */
  meta_semanal_kg: number | null
  meta_inicio: string | null
  meta_peso_inicial_kg: number | null
  kcal_meta: number | null
  proteina_meta_g: number | null
  carbo_meta_g: number | null
  gordura_meta_g: number | null
}

export type PerfilAtletaInput = Omit<PerfilAtleta, 'user_id'>

/** Campos do plano de peso, editados na página Corpo. */
export type PlanoPesoInput = Pick<PerfilAtleta, 'peso_meta_kg' | 'meta_semanal_kg' | 'meta_inicio' | 'meta_peso_inicial_kg'>

/** Uma medição do corpo: peso obrigatório; bioimpedância e circunferências opcionais. */
export interface Pesagem {
  id: string
  data: string
  peso_kg: number
  gordura_pct: number | null
  massa_muscular_kg: number | null
  agua_pct: number | null
  /** nível de 1 a 59 (escala das balanças de bioimpedância) */
  gordura_visceral: number | null
  massa_ossea_kg: number | null
  cintura_cm: number | null
  quadril_cm: number | null
  pescoco_cm: number | null
  braco_cm: number | null
  coxa_cm: number | null
  observacao: string | null
}

export type PesagemInput = Omit<Pesagem, 'id'>

export interface Macros {
  kcal: number
  proteina_g: number
  carbo_g: number
  gordura_g: number
}

export interface Alimento extends Macros {
  id: string
  nome: string
  porcao: string
}

export type TipoRefeicao =
  | 'cafe'
  | 'lanche_manha'
  | 'almoco'
  | 'lanche_tarde'
  | 'pre_treino'
  | 'pos_treino'
  | 'jantar'
  | 'ceia'
  | 'suplemento'

export interface Refeicao extends Macros {
  id: string
  data: string
  tipo: TipoRefeicao
  descricao: string
  created_at: string
}

export type TipoProva =
  | 'sprint'
  | 'olimpico'
  | 'meio_ironman'
  | 'ironman'
  | 'duathlon'
  | 'corrida'
  | 'ciclismo'
  | 'natacao'
  | 'outro'

export interface Prova {
  id: string
  nome: string
  data: string
  local: string | null
  tipo: TipoProva
  prioridade: 'A' | 'B' | 'C'
  natacao_m: number | null
  ciclismo_km: number | null
  corrida_km: number | null
  meta_tempo_seg: number | null
  resultado_tempo_seg: number | null
  observacao: string | null
}

export type ProvaInput = Omit<Prova, 'id'>

// -----------------------------------------------------------------------------
// Agenda: treinos planejados e metas semanais
// -----------------------------------------------------------------------------

/** Modalidades da agenda (academia = 'forca'). */
export type ModalidadeAgenda = Extract<Modalidade, 'corrida' | 'natacao' | 'ciclismo' | 'forca'>

export type StatusTreino = 'pendente' | 'concluido' | 'perdido'

export interface TreinoPlanejado {
  id: string
  data: string
  modalidade: ModalidadeAgenda
  nome: string
  descricao: string | null
  distancia_planejada_m: number | null
  duracao_planejada_seg: number | null
  observacao: string | null
  status: StatusTreino
  distancia_realizada_m: number | null
  duracao_realizada_seg: number | null
  /** atividade registrada em treinos que corresponde a este planejado */
  treino_id: string | null
  concluido_em: string | null
  /** academia: rotina e letra do treino (A, B…) de onde veio */
  rotina_id: string | null
  rotina_treino: string | null
  /** academia: cópia dos exercícios prescritos para este dia */
  exercicios: ExercicioPrescrito[] | null
  /** corrida, natação e pedal: aquecimento, parte principal e desaquecimento, com a intensidade de cada bloco */
  estrutura: EstruturaTreino | null
  /** sugestão salva de onde veio */
  sugestao_id: string | null
  created_at: string
}

export type TreinoPlanejadoInput = Omit<TreinoPlanejado, 'id' | 'created_at'>

/** Meta de uma semana (segunda-feira) para uma modalidade: distância ou, na academia, sessões. */
export interface MetaSemanal {
  id: string
  semana: string
  modalidade: ModalidadeAgenda
  distancia_m: number | null
  sessoes: number | null
}

// -----------------------------------------------------------------------------
// Musculação: rotinas, exercícios prescritos e séries registradas
// -----------------------------------------------------------------------------

export type ObjetivoForca = 'emagrecimento' | 'hipertrofia' | 'recomposicao'
export type ObjetivoSecundario = 'endurance' | 'saude'
export type NivelForca = 'iniciante' | 'intermediario' | 'avancado'
export type LocalForca = 'academia' | 'casa'
export type FocoForca = 'corpo_inteiro' | 'superiores' | 'inferiores' | 'forca_condicionamento'
export type Equipamento = 'halteres' | 'barra' | 'kettlebell' | 'elastico' | 'barra_fixa' | 'banco' | 'maquinas' | 'polia'

export type GrupoMuscular =
  | 'peito'
  | 'costas'
  | 'ombros'
  | 'biceps'
  | 'triceps'
  | 'quadriceps'
  | 'posteriores'
  | 'gluteos'
  | 'panturrilhas'
  | 'core'
  | 'cardio'

export interface ExercicioPrescrito {
  /** id do catálogo (ou "livre-…" para exercício digitado) */
  exercicio_id: string
  nome: string
  grupo: GrupoMuscular
  series: number
  reps_min: number
  reps_max: number
  /** repetições ou segundos (prancha, condicionamento) */
  unidade: 'reps' | 'segundos'
  descanso_seg: number
  orientacao: string
  nivel: NivelForca
  /** carga de referência (kg) para começar */
  carga_kg?: number | null
  /** demonstração na ExerciseDB escolhida para este exercício (senão, a do catálogo) */
  exercisedb_id?: string | null
}

export interface TreinoForca {
  letra: string
  nome: string
  foco: string
  exercicios: ExercicioPrescrito[]
}

export interface ConfigForca {
  objetivo: ObjetivoForca
  objetivo_secundario: ObjetivoSecundario | null
  nivel: NivelForca
  local: LocalForca
  frequencia: number
  foco: FocoForca
  duracao_min: 30 | 45 | 60 | 90
  equipamentos: Equipamento[]
}

export interface RotinaForca extends ConfigForca {
  id: string
  nome: string
  divisao: string
  /** 1 = segunda … 7 = domingo */
  dias_semana: number[]
  treinos: TreinoForca[]
  ativa: boolean
  created_at: string
}

export type RotinaForcaInput = Omit<RotinaForca, 'id' | 'created_at'>

export interface SerieForca {
  id: string
  planejado_id: string
  data: string
  exercicio_id: string
  exercicio_nome: string
  grupo: GrupoMuscular
  serie: number
  carga_kg: number | null
  repeticoes: number | null
  rpe: number | null
  tecnica_ok: boolean
}

export type SerieForcaInput = Omit<SerieForca, 'id'>

// -----------------------------------------------------------------------------
// Sugestões de endurance: corrida, ciclismo e natação
// -----------------------------------------------------------------------------

export type ModalidadeEndurance = Extract<Modalidade, 'corrida' | 'ciclismo' | 'natacao'>
export type ObjetivoEndurance = 'resistencia' | 'velocidade' | 'limiar' | 'recuperacao' | 'tecnica' | 'subidas'
export type FaseBloco = 'aquecimento' | 'principal' | 'desaquecimento'
/** de onde veio a sugestão */
export type FonteSugestao = 'catalogo' | 'ai_endurance' | 'personalizada'

/** Faixa de um alvo absoluto; null = sem limite daquele lado. */
export type Faixa = [number | null, number | null]

export interface PassoTreino {
  /** esforço (tiro, contínuo) ou recuperação entre tiros */
  tipo: 'esforco' | 'recuperacao'
  duracao_seg: number | null
  distancia_m: number | null
  /** 1 recuperação · 2 resistência · 3 moderado · 4 limiar · 5 VO₂máx · 6 anaeróbio */
  zona: number
  /** alvo em fração do limiar (velocidade de limiar, FTP ou CSS); sem ele, vale a faixa da zona */
  pct?: Faixa | null
  /** alvo absoluto (AI Endurance): watts no pedal, m/s na corrida e na natação */
  alvo?: { potencia?: Faixa; velocidade?: Faixa } | null
  descricao?: string | null
}

export interface BlocoTreino {
  fase: FaseBloco
  /** 1 = contínuo; mais de 1 = repete os passos (ex.: 6× tiro + recuperação) */
  repeticoes: number
  passos: PassoTreino[]
  descricao?: string | null
}

export interface EstruturaTreino {
  modalidade: ModalidadeEndurance
  objetivo: ObjetivoEndurance
  nivel: NivelForca
  blocos: BlocoTreino[]
  fonte: FonteSugestao
  /** id no catálogo do app ou na AI Endurance */
  referencia?: string | null
}

export interface SugestaoSalva {
  id: string
  modalidade: ModalidadeEndurance
  nome: string
  objetivo: ObjetivoEndurance
  nivel: NivelForca
  descricao: string | null
  fonte: FonteSugestao
  referencia: string | null
  duracao_seg: number | null
  distancia_m: number | null
  estrutura: EstruturaTreino
  created_at: string
}

export type SugestaoSalvaInput = Omit<SugestaoSalva, 'id' | 'created_at'>
