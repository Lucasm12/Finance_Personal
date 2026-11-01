/**
 * Agenda de treinos: semanas (segunda a domingo), situação de cada treino planejado e
 * progresso das metas semanais. Para as metas só conta o que foi realizado em treinos concluídos.
 */
import { CheckIcon, ClockIcon, XIcon, type LucideIcon } from 'lucide-react'

import { somarMeses } from '@/lib/format'
import { dataLocal, inicioSemana, somarDias } from '@/lib/triathlon'
import type { Competencia } from '@/types'
import type { MetaSemanal, ModalidadeAgenda, StatusTreino, TreinoPlanejado } from '@/types/triathlon'

/** Na ordem em que aparecem na tela (academia = 'forca'). */
export const MODALIDADES_AGENDA: ModalidadeAgenda[] = ['corrida', 'natacao', 'ciclismo', 'forca']

export const ehModalidadeAgenda = (m: string): m is ModalidadeAgenda => (MODALIDADES_AGENDA as string[]).includes(m)

// -----------------------------------------------------------------------------
// Unidades: corrida e pedal em km, natação em metros, academia em sessões
// -----------------------------------------------------------------------------

interface Unidade {
  sigla: string
  /** metros em 1 unidade (null = sessões) */
  metros: number | null
  casas: number
  exemplo: string
}

export const UNIDADE: Record<ModalidadeAgenda, Unidade> = {
  corrida: { sigla: 'km', metros: 1000, casas: 1, exemplo: '30' },
  natacao: { sigla: 'm', metros: 1, casas: 0, exemplo: '5000' },
  ciclismo: { sigla: 'km', metros: 1000, casas: 1, exemplo: '100' },
  forca: { sigla: 'sessões', metros: null, casas: 0, exemplo: '3' },
}

/** metros → número na unidade da modalidade (km ou m) */
export const naUnidade = (m: ModalidadeAgenda, metros: number) => metros / (UNIDADE[m].metros ?? 1)
/** número na unidade da modalidade → metros */
export const emMetros = (m: ModalidadeAgenda, valor: number) => valor * (UNIDADE[m].metros ?? 1)

/** "30 km", "5.000 m", "3 sessões", "1 sessão" */
export function quantidade(m: ModalidadeAgenda, valor: number): string {
  if (m === 'forca') return `${valor} ${valor === 1 ? 'sessão' : 'sessões'}`
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: UNIDADE[m].casas }).format(valor)} ${UNIDADE[m].sigla}`
}

/** Distância em metros na unidade da modalidade: "10 km", "1.500 m". */
export const distanciaTexto = (m: ModalidadeAgenda, metros: number) => quantidade(m, naUnidade(m, metros))

// -----------------------------------------------------------------------------
// Situação (verde = concluído, vermelho = perdido, amarelo = pendente)
// -----------------------------------------------------------------------------

export interface InfoStatus {
  rotulo: string
  icone: LucideIcon
  /** fundo cheio (botão ativo, bolinha) */
  fundo: string
  /** fundo suave (etiqueta no calendário) */
  suave: string
  /** cor do ícone */
  texto: string
}

export const STATUS: Record<StatusTreino, InfoStatus> = {
  concluido: { rotulo: 'Concluído', icone: CheckIcon, fundo: 'bg-status-bom', suave: 'bg-status-bom/15', texto: 'text-status-bom' },
  perdido: { rotulo: 'Perdido', icone: XIcon, fundo: 'bg-status-perigo', suave: 'bg-status-perigo/15', texto: 'text-status-perigo' },
  pendente: { rotulo: 'Pendente', icone: ClockIcon, fundo: 'bg-status-atencao', suave: 'bg-status-atencao/20', texto: 'text-amber-600 dark:text-status-atencao' },
}

export const ORDEM_STATUS: StatusTreino[] = ['concluido', 'perdido', 'pendente']

export interface StatusEfetivo {
  status: StatusTreino
  /** pendente de um dia que já terminou: conta como perdido sem mudar o registro */
  automatico: boolean
}

/** Pendente só vira perdido depois que o dia termina (e pode ser marcado como concluído depois). */
export function statusEfetivo(t: Pick<TreinoPlanejado, 'status' | 'data'>, hoje = dataLocal(new Date())): StatusEfetivo {
  if (t.status === 'pendente' && t.data < hoje) return { status: 'perdido', automatico: true }
  return { status: t.status, automatico: false }
}

// -----------------------------------------------------------------------------
// Semanas e calendário (as datas são texto "AAAA-MM-DD", sem fuso)
// -----------------------------------------------------------------------------

export const fimDaSemana = (semana: string) => somarDias(semana, 6)

export const diasDaSemana = (semana: string) => Array.from({ length: 7 }, (_, i) => somarDias(semana, i))

/** Número da semana no ano (ISO 8601: a semana 1 tem a primeira quinta-feira do ano). */
export function numeroSemana(data: string): number {
  const [a, m, d] = data.split('-').map(Number)
  const dt = new Date(Date.UTC(a, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7))
  const inicioAno = Date.UTC(dt.getUTCFullYear(), 0, 1)
  return Math.ceil(((dt.getTime() - inicioAno) / 86_400_000 + 1) / 7)
}

/** Segundas-feiras das semanas que aparecem na grade do mês (incluem dias dos meses vizinhos). */
export function semanasDoMes(c: Competencia): string[] {
  const ultimoDia = somarDias(somarMeses(c, 1), -1)
  const lista: string[] = []
  for (let s = inicioSemana(c); s <= ultimoDia; s = somarDias(s, 7)) lista.push(s)
  return lista
}

/** Mês a que a semana pertence: o da quinta-feira (padrão ISO), para semanas que cruzam meses. */
export const mesDaSemana = (semana: string): Competencia => `${somarDias(semana, 3).slice(0, 7)}-01`

const ddmm = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}`

/** "27/10 – 02/11" */
export const textoSemana = (semana: string) => `${ddmm(semana)} – ${ddmm(fimDaSemana(semana))}`

/** "AAAA-MM-DD" válido e segunda-feira? */
export function ehSegunda(data: string | null): data is string {
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return false
  return inicioSemana(data) === data
}

// -----------------------------------------------------------------------------
// Metas e progresso
// -----------------------------------------------------------------------------

/** Valor da meta na unidade da modalidade (km, m ou sessões). */
export const valorMeta = (m: MetaSemanal) => (m.modalidade === 'forca' ? (m.sessoes ?? 0) : naUnidade(m.modalidade, m.distancia_m ?? 0))

export interface ProgressoModalidade {
  modalidade: ModalidadeAgenda
  /** na unidade da modalidade; null = sem meta nesta semana */
  meta: number | null
  /** distância realizada nos concluídos (academia: sessões concluídas) */
  realizado: number
  /** distância planejada (academia: sessões planejadas), sem contar os perdidos */
  planejado: number
  /** realizado ÷ meta (pode passar de 1) */
  fracao: number | null
  treinos: number
}

export interface ProgressoSemana {
  semana: string
  modalidades: Record<ModalidadeAgenda, ProgressoModalidade>
  concluidos: number
  perdidos: number
  /** perdidos que eram pendentes de dias que já terminaram */
  perdidosSemMarcar: number
  pendentes: number
  total: number
}

export function progressoSemana(
  semana: string,
  treinos: TreinoPlanejado[],
  metas: MetaSemanal[],
  hoje = dataLocal(new Date()),
): ProgressoSemana {
  const fim = fimDaSemana(semana)
  const daSemana = treinos.filter((t) => t.data >= semana && t.data <= fim)
  const modalidades = {} as Record<ModalidadeAgenda, ProgressoModalidade>
  for (const m of MODALIDADES_AGENDA) {
    const lista = daSemana.filter((t) => t.modalidade === m)
    const concluidos = lista.filter((t) => t.status === 'concluido')
    const naoPerdidos = lista.filter((t) => statusEfetivo(t, hoje).status !== 'perdido')
    const meta = metas.find((x) => x.semana === semana && x.modalidade === m)
    const valor = meta ? valorMeta(meta) : null
    const realizado =
      m === 'forca' ? concluidos.length : naUnidade(m, concluidos.reduce((s, t) => s + (t.distancia_realizada_m ?? 0), 0))
    const planejado =
      m === 'forca' ? naoPerdidos.length : naUnidade(m, naoPerdidos.reduce((s, t) => s + (t.distancia_planejada_m ?? 0), 0))
    modalidades[m] = { modalidade: m, meta: valor, realizado, planejado, fracao: valor ? realizado / valor : null, treinos: lista.length }
  }
  let concluidos = 0
  let perdidos = 0
  let perdidosSemMarcar = 0
  let pendentes = 0
  for (const t of daSemana) {
    const e = statusEfetivo(t, hoje)
    if (e.status === 'concluido') concluidos++
    else if (e.status === 'pendente') pendentes++
    else {
      perdidos++
      if (e.automatico) perdidosSemMarcar++
    }
  }
  return { semana, modalidades, concluidos, perdidos, perdidosSemMarcar, pendentes, total: daSemana.length }
}

// -----------------------------------------------------------------------------
// Histórico
// -----------------------------------------------------------------------------

/** As `quantidade` semanas que terminam na semana `ate` (inclusive), da mais antiga para a mais nova. */
export const semanasAte = (ate: string, quantidade: number) =>
  Array.from({ length: quantidade }, (_, i) => somarDias(ate, -7 * (quantidade - 1 - i)))

export interface ResumoMes {
  mes: Competencia
  realizado: Record<ModalidadeAgenda, number>
  concluidos: number
  perdidos: number
  /** concluídos ÷ (concluídos + perdidos); null sem treinos encerrados */
  aderencia: number | null
  /** semanas do mês (pela quinta-feira) com meta batida / com meta, somando as modalidades */
  metasBatidas: number
  metasDefinidas: number
}

export function resumoMensal(
  meses: Competencia[],
  treinos: TreinoPlanejado[],
  metas: MetaSemanal[],
  hoje = dataLocal(new Date()),
): ResumoMes[] {
  return meses.map((mes) => {
    const fimMes = somarDias(somarMeses(mes, 1), -1)
    const doMes = treinos.filter((t) => t.data >= mes && t.data <= fimMes)
    const realizado = {} as Record<ModalidadeAgenda, number>
    for (const m of MODALIDADES_AGENDA) {
      const concl = doMes.filter((t) => t.modalidade === m && t.status === 'concluido')
      realizado[m] = m === 'forca' ? concl.length : naUnidade(m, concl.reduce((s, t) => s + (t.distancia_realizada_m ?? 0), 0))
    }
    const concluidos = doMes.filter((t) => t.status === 'concluido').length
    const perdidos = doMes.filter((t) => statusEfetivo(t, hoje).status === 'perdido').length

    let metasBatidas = 0
    let metasDefinidas = 0
    // só semanas que já terminaram entram na conta de metas batidas
    for (const semana of semanasDoMes(mes).filter((s) => mesDaSemana(s) === mes && fimDaSemana(s) < hoje)) {
      const p = progressoSemana(semana, treinos, metas, hoje)
      for (const m of MODALIDADES_AGENDA) {
        if (p.modalidades[m].meta === null) continue
        metasDefinidas++
        if ((p.modalidades[m].fracao ?? 0) >= 1) metasBatidas++
      }
    }
    return {
      mes,
      realizado,
      concluidos,
      perdidos,
      aderencia: concluidos + perdidos ? concluidos / (concluidos + perdidos) : null,
      metasBatidas,
      metasDefinidas,
    }
  })
}
