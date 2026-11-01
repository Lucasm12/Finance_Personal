import type { Modalidade } from '@/types/triathlon'

export type StatusMeta = 'nao_iniciada' | 'em_andamento' | 'concluida' | 'pausada'
export type TipoMeta = 'numerica' | 'sim_nao' | 'marcos'
export type OrigemMeta = 'biblia' | 'treino' | 'nenhuma'
export type CriterioTreino = 'sessoes' | 'distancia' | 'horas' | 'frequencia_semanal' | 'prova'
/** Calculada no banco (view metas_situacao). */
export type SituacaoMeta = 'concluida' | 'pausada' | 'atrasada' | 'nao_iniciada' | 'em_dia'
export type TipoPlano = 'sequencial' | 'cronologico' | 'paralelo'
export type Prioridade = 'alta' | 'media' | 'baixa'
export type CorMarcacao = 'amarelo' | 'verde' | 'azul' | 'rosa' | 'laranja'
export type Testamento = 'AT' | 'NT'

// -----------------------------------------------------------------------------
// Áreas, objetivos e metas
// -----------------------------------------------------------------------------

export interface AreaVida {
  id: string
  nome: string
  cor: string
  /** chave do ícone (ver ICONES_AREA) */
  icone: string
  ordem: number
  created_at: string
}

export type AreaVidaInput = Pick<AreaVida, 'nome' | 'cor' | 'icone'> & { ordem?: number }

export interface Objetivo {
  id: string
  area_id: string
  titulo: string
  descricao: string | null
  ano: number
  status: StatusMeta
  created_at: string
}

export type ObjetivoInput = Pick<Objetivo, 'area_id' | 'titulo' | 'descricao' | 'ano' | 'status'>

export interface Meta {
  id: string
  objetivo_id: string
  titulo: string
  tipo: TipoMeta
  valor_atual: number
  valor_alvo: number | null
  unidade: string | null
  inicio: string
  prazo: string | null
  status: StatusMeta
  origem_automatica: OrigemMeta
  treino_criterio: CriterioTreino | null
  treino_modalidade: Modalidade | null
  treino_por_semana: number | null
  prova_id: string | null
  created_at: string
}

export type MetaInput = Omit<Meta, 'id' | 'created_at' | 'valor_atual'>

/** Meta com o progresso calculado no servidor. */
export interface MetaSituacao extends Meta {
  area_id: string
  ano: number
  /** fim do período (prazo, data da prova ou 31/12 do ano do objetivo) */
  fim: string
  valor: number
  alvo: number
  /** 0 a 1 */
  percentual: number
  /** fração do período já decorrida (0 a 1) */
  esperado: number
  situacao: SituacaoMeta
}

export interface ProgressoMeta {
  id: string
  meta_id: string
  valor: number
  observacao: string | null
  registrado_em: string
  created_at: string
}

export interface MarcoMeta {
  id: string
  meta_id: string
  titulo: string
  ordem: number
  concluido: boolean
  concluido_em: string | null
}

export interface VisaoArea {
  area_id: string
  metas: number
  concluidas: number
  atrasadas: number
  progresso: number
  esperado: number
}

// -----------------------------------------------------------------------------
// Hábitos e tarefas
// -----------------------------------------------------------------------------

export type Frequencia = { tipo: 'diaria' } | { tipo: 'dias'; dias: number[] }

export interface Habito {
  id: string
  area_id: string | null
  titulo: string
  frequencia: Frequencia
  ativo: boolean
  inicio: string
  created_at: string
}

export type HabitoInput = Pick<Habito, 'area_id' | 'titulo' | 'frequencia'>

export interface RegistroHabito {
  id: string
  habito_id: string
  data: string
  feito: boolean
}

/** Calculado no servidor (função habitos_resumo). */
export interface ResumoHabito {
  habito_id: string
  previsto_hoje: boolean
  feito_hoje: boolean
  sequencia: number
  recorde: number
  feitos_semana: number
  previstos_semana: number
  feitos_mes: number
  previstos_mes: number
}

export interface Tarefa {
  id: string
  meta_id: string | null
  area_id: string | null
  titulo: string
  data: string
  prioridade: Prioridade
  foco: boolean
  concluida: boolean
  concluida_em: string | null
  created_at: string
}

export type TarefaInput = Pick<Tarefa, 'titulo' | 'data' | 'prioridade' | 'foco' | 'meta_id' | 'area_id'>

// -----------------------------------------------------------------------------
// Diário e revisões
// -----------------------------------------------------------------------------

export interface Diario {
  id: string
  data: string
  humor: number | null
  gratidao: string[]
  texto: string | null
  atualizado_em: string
}

export type DiarioInput = Pick<Diario, 'data' | 'humor' | 'gratidao' | 'texto'>

export interface Revisao {
  id: string
  tipo: 'semanal' | 'mensal'
  periodo_inicio: string
  respostas: Record<string, string>
  atualizado_em: string
}

export interface ResumoSemana {
  inicio: string
  fim: string
  habitos: { feitos: number; previstos: number }
  leitura: { capitulos: number; dias: number }
  metas: { registros: number; marcos: number; atrasadas: number }
  treinos: { quantidade: number; distancia_km: number; horas: number }
  tarefas: { concluidas: number; pendentes: number }
  diario: { dias: number; humor_medio: number | null }
}

// -----------------------------------------------------------------------------
// Bíblia
// -----------------------------------------------------------------------------

export interface LivroBiblia {
  id: number
  nome: string
  abreviacao: string
  testamento: Testamento
  ordem: number
  total_capitulos: number
}

export interface Versiculo {
  id: number
  versiculo: number
  texto: string
}

export interface CapituloLido {
  livro_id: number
  capitulo: number
  concluido_em: string
}

export interface RefCapitulo {
  livro_id: number
  capitulo: number
}

/** Calculado no servidor (função leitura_resumo). */
export interface ResumoLeitura {
  hoje: string
  plano: {
    id: string
    tipo: TipoPlano
    data_inicio: string
    data_fim: string
    dias_total: number
    dias_passados: number
    dias_restantes: number
  } | null
  total_lidos: number
  lidos_hoje: number
  percentual: number
  esperado: number | null
  /** positivo: adiantado; negativo: atrasado (capítulos) */
  diferenca: number | null
  meta_diaria: number | null
  ritmo_plano: number | null
  capitulos_hoje: (RefCapitulo & { lido: boolean })[]
  proximo: RefCapitulo | null
  sequencia: number
  recorde: number
}

export interface EstatisticasLeitura {
  dias_com_leitura: number
  livros_concluidos: number
  media_30_dias: number
  por_mes: { mes: string; capitulos: number }[]
  calor: { dia: string; capitulos: number }[]
}

export interface Anotacao {
  id: string
  livro_id: number
  capitulo: number
  versiculo_destaque: number | null
  reflexao: string | null
  aplicacao: string | null
  created_at: string
}

export type AnotacaoInput = Pick<Anotacao, 'livro_id' | 'capitulo' | 'versiculo_destaque' | 'reflexao' | 'aplicacao'>

export interface VersiculoMarcado {
  id: string
  versiculo_id: number
  cor: CorMarcacao
  nota: string | null
  created_at: string
  versiculo?: { livro_id: number; capitulo: number; versiculo: number; texto: string } | null
}
