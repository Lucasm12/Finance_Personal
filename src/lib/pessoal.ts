import {
  AnnoyedIcon,
  BookOpenIcon,
  BriefcaseIcon,
  CircleIcon,
  FrownIcon,
  GraduationCapIcon,
  HeartPulseIcon,
  LaughIcon,
  MehIcon,
  SmileIcon,
  SparklesIcon,
  StarIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react'

import { inicioSemana, somarDias } from '@/lib/triathlon'
import type {
  CorMarcacao,
  CriterioTreino,
  Frequencia,
  LivroBiblia,
  Prioridade,
  ResumoLeitura,
  SituacaoMeta,
  StatusMeta,
  TipoMeta,
  TipoPlano,
} from '@/types/pessoal'

// -----------------------------------------------------------------------------
// Datas: o "dia" do módulo é o de São Paulo (o mesmo que o banco usa)
// -----------------------------------------------------------------------------

export const FUSO = 'America/Sao_Paulo'

const formatoIso = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' })

/** Data de hoje em São Paulo, "AAAA-MM-DD". */
export const hojeSP = (agora: Date = new Date()) => formatoIso.format(agora)

/** Data em São Paulo de um instante (timestamp do banco). */
export const diaSP = (instante: string) => formatoIso.format(new Date(instante))

/** Hora atual em São Paulo (0–23), para a saudação. */
export const horaSP = (agora: Date = new Date()) =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: FUSO, hour: '2-digit', hourCycle: 'h23' }).format(agora))

const extenso = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
const curto = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })
const semDia = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`)

/** "domingo, 1 de novembro" */
export const dataPorExtenso = (iso: string) => extenso.format(semDia(iso))

/** "01 de nov." */
export const dataCurta = (iso: string) => curto.format(semDia(iso))

/** 1 = segunda … 7 = domingo */
export const diaDaSemana = (iso: string) => ((semDia(iso).getUTCDay() + 6) % 7) + 1

export const DIAS_SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

/** Semana a revisar: no domingo, a que está terminando; nos outros dias, a anterior. */
export function semanaParaRevisao(hoje: string): string {
  const segunda = inicioSemana(hoje)
  return diaDaSemana(hoje) === 7 ? segunda : somarDias(segunda, -7)
}

// -----------------------------------------------------------------------------
// Áreas da vida
// -----------------------------------------------------------------------------

export const ICONES_AREA: Record<string, { icone: LucideIcon; rotulo: string }> = {
  espiritual: { icone: BookOpenIcon, rotulo: 'Bíblia' },
  saude: { icone: HeartPulseIcon, rotulo: 'Coração' },
  familia: { icone: UsersIcon, rotulo: 'Pessoas' },
  financas: { icone: WalletIcon, rotulo: 'Carteira' },
  carreira: { icone: BriefcaseIcon, rotulo: 'Maleta' },
  estudos: { icone: GraduationCapIcon, rotulo: 'Estudos' },
  pessoal: { icone: UserIcon, rotulo: 'Pessoa' },
  estrela: { icone: StarIcon, rotulo: 'Estrela' },
  brilho: { icone: SparklesIcon, rotulo: 'Brilho' },
}

export const iconeArea = (chave: string | undefined): LucideIcon => (chave && ICONES_AREA[chave]?.icone) || CircleIcon

// -----------------------------------------------------------------------------
// Metas
// -----------------------------------------------------------------------------

export const STATUS_META: Record<StatusMeta, string> = {
  nao_iniciada: 'Não iniciada',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  pausada: 'Pausada',
}

export const TIPO_META: Record<TipoMeta, { rotulo: string; descricao: string }> = {
  numerica: { rotulo: 'Numérica', descricao: 'Ex.: ler 12 livros, correr 500 km' },
  sim_nao: { rotulo: 'Sim ou não', descricao: 'Ex.: tirar o passaporte' },
  marcos: { rotulo: 'Por marcos', descricao: 'Etapas com checkbox; o progresso é calculado' },
}

export interface InfoSituacao {
  rotulo: string
  /** classes do selo */
  classe: string
}

export const SITUACAO: Record<SituacaoMeta, InfoSituacao> = {
  concluida: { rotulo: 'Concluída', classe: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  em_dia: { rotulo: 'Em dia', classe: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300' },
  atrasada: { rotulo: 'Atrasada', classe: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300' },
  nao_iniciada: { rotulo: 'Não iniciada', classe: 'border-border bg-muted text-muted-foreground' },
  pausada: { rotulo: 'Pausada', classe: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300' },
}

export const CRITERIOS_TREINO: Record<CriterioTreino, { rotulo: string; unidade: string; exemplo: string }> = {
  sessoes: { rotulo: 'Quantidade de treinos', unidade: 'treinos', exemplo: 'Ex.: 150 treinos no ano' },
  distancia: { rotulo: 'Distância total', unidade: 'km', exemplo: 'Ex.: correr 1.000 km' },
  horas: { rotulo: 'Horas de treino', unidade: 'h', exemplo: 'Ex.: 300 horas no ano' },
  frequencia_semanal: { rotulo: 'Treinar X vezes por semana', unidade: 'semanas', exemplo: 'Conta as semanas em que você bateu a frequência' },
  prova: { rotulo: 'Completar uma prova-alvo', unidade: 'prova', exemplo: 'Conclui quando o resultado da prova for registrado' },
}

const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
export const formatarQuantidade = (n: number) => numero.format(n)

/** "5 de 12 livros" */
export function textoProgresso(valor: number, alvo: number, unidade: string | null): string {
  return `${formatarQuantidade(valor)} de ${formatarQuantidade(alvo)}${unidade ? ` ${unidade}` : ''}`
}

export const porcento = (fracao: number) => `${Math.round(fracao * 100)}%`

// -----------------------------------------------------------------------------
// Hábitos e tarefas
// -----------------------------------------------------------------------------

export function textoFrequencia(f: Frequencia): string {
  if (f.tipo === 'diaria') return 'Todos os dias'
  const dias = [...f.dias].sort()
  if (dias.join() === '1,2,3,4,5') return 'Dias úteis'
  if (dias.join() === '6,7') return 'Fins de semana'
  return dias.map((d) => DIAS_SEMANA[d - 1]).join(', ')
}

export const previstoNoDia = (f: Frequencia, data: string) => f.tipo === 'diaria' || f.dias.includes(diaDaSemana(data))

export const PRIORIDADES: Record<Prioridade, { rotulo: string; classe: string; peso: number }> = {
  alta: { rotulo: 'Alta', classe: 'text-red-600 dark:text-red-400', peso: 0 },
  media: { rotulo: 'Média', classe: 'text-amber-600 dark:text-amber-400', peso: 1 },
  baixa: { rotulo: 'Baixa', classe: 'text-muted-foreground', peso: 2 },
}

// -----------------------------------------------------------------------------
// Diário
// -----------------------------------------------------------------------------

export const HUMORES: { valor: number; rotulo: string; icone: LucideIcon; classe: string }[] = [
  { valor: 1, rotulo: 'Muito mal', icone: FrownIcon, classe: 'text-red-600 dark:text-red-400' },
  { valor: 2, rotulo: 'Mal', icone: AnnoyedIcon, classe: 'text-orange-600 dark:text-orange-400' },
  { valor: 3, rotulo: 'Normal', icone: MehIcon, classe: 'text-amber-600 dark:text-amber-400' },
  { valor: 4, rotulo: 'Bem', icone: SmileIcon, classe: 'text-sky-600 dark:text-sky-400' },
  { valor: 5, rotulo: 'Muito bem', icone: LaughIcon, classe: 'text-emerald-600 dark:text-emerald-400' },
]

// -----------------------------------------------------------------------------
// Bíblia
// -----------------------------------------------------------------------------

export const TOTAL_CAPITULOS = 1189

export const PLANOS: Record<TipoPlano, { rotulo: string; descricao: string }> = {
  sequencial: { rotulo: 'Sequencial', descricao: 'De Gênesis a Apocalipse, na ordem dos livros.' },
  cronologico: {
    rotulo: 'Cronológico',
    descricao: 'Na ordem aproximada dos acontecimentos: Jó junto de Gênesis, profetas junto de Reis e Crônicas, cartas junto de Atos.',
  },
  paralelo: { rotulo: 'AT + NT em paralelo', descricao: 'Antigo e Novo Testamento ao mesmo tempo, avançando na mesma proporção.' },
}

export const CORES_MARCACAO: Record<CorMarcacao, { rotulo: string; fundo: string; amostra: string }> = {
  amarelo: { rotulo: 'Amarelo', fundo: 'bg-yellow-200/70 dark:bg-yellow-400/25', amostra: 'bg-yellow-300' },
  verde: { rotulo: 'Verde', fundo: 'bg-emerald-200/70 dark:bg-emerald-400/25', amostra: 'bg-emerald-400' },
  azul: { rotulo: 'Azul', fundo: 'bg-sky-200/70 dark:bg-sky-400/25', amostra: 'bg-sky-400' },
  rosa: { rotulo: 'Rosa', fundo: 'bg-pink-200/70 dark:bg-pink-400/25', amostra: 'bg-pink-400' },
  laranja: { rotulo: 'Laranja', fundo: 'bg-orange-200/70 dark:bg-orange-400/25', amostra: 'bg-orange-400' },
}

/** id estável do versículo (o mesmo do banco): livro·1.000.000 + capítulo·1.000 + versículo */
export const idVersiculo = (livro: number, capitulo: number, versiculo: number) => livro * 1_000_000 + capitulo * 1_000 + versiculo

/** "Gênesis 1" / "Gn 1:3" */
export function referencia(livros: LivroBiblia[] | undefined, livro: number, capitulo: number, versiculo?: number | null, curta = false): string {
  const l = livros?.find((x) => x.id === livro)
  const nome = l ? (curta ? l.abreviacao : l.nome) : `Livro ${livro}`
  return `${nome} ${capitulo}${versiculo ? `:${versiculo}` : ''}`
}

/** Capítulo anterior/seguinte na ordem da Bíblia (atravessa livros). */
export function vizinho(livros: LivroBiblia[], livro: number, capitulo: number, passo: 1 | -1): { livro_id: number; capitulo: number } | null {
  const ordenados = [...livros].sort((a, b) => a.ordem - b.ordem)
  const i = ordenados.findIndex((l) => l.id === livro)
  if (i < 0) return null
  const atual = ordenados[i]
  if (passo === 1) {
    if (capitulo < atual.total_capitulos) return { livro_id: livro, capitulo: capitulo + 1 }
    const prox = ordenados[i + 1]
    return prox ? { livro_id: prox.id, capitulo: 1 } : null
  }
  if (capitulo > 1) return { livro_id: livro, capitulo: capitulo - 1 }
  const ant = ordenados[i - 1]
  return ant ? { livro_id: ant.id, capitulo: ant.total_capitulos } : null
}

export interface SituacaoLeitura {
  tipo: 'adiantado' | 'atrasado' | 'em_dia'
  titulo: string
  sugestao: string | null
}

/** Texto de adiantado/atrasado a partir do resumo calculado no servidor. */
export function situacaoLeitura(r: Pick<ResumoLeitura, 'diferenca' | 'ritmo_plano' | 'meta_diaria' | 'plano'>): SituacaoLeitura | null {
  if (!r.plano || r.diferenca === null || !r.ritmo_plano) return null
  const capitulos = (n: number) => `${n} ${n === 1 ? 'capítulo' : 'capítulos'}`
  const dias = Math.floor(Math.abs(r.diferenca) / r.ritmo_plano)
  if (r.diferenca >= 0) {
    if (r.diferenca < 1 || dias < 1) return { tipo: 'em_dia', titulo: 'Em dia com o plano', sugestao: null }
    return { tipo: 'adiantado', titulo: `Adiantado ${capitulos(r.diferenca)} (≈ ${dias} ${dias === 1 ? 'dia' : 'dias'})`, sugestao: null }
  }
  const atraso = -r.diferenca
  const extra = Math.ceil(atraso / 7)
  return {
    tipo: 'atrasado',
    titulo: `Atrasado ${capitulos(atraso)}`,
    sugestao:
      atraso <= 2
        ? 'Leia um capítulo a mais hoje e você volta para o dia.'
        : `Para recuperar em uma semana, leia ${capitulos((r.meta_diaria ?? 0) + extra)} por dia nos próximos 7 dias (+${extra} por dia). Ou siga a meta de hoje: ela já foi recalculada para terminar no prazo.`,
  }
}
