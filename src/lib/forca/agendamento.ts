/**
 * Distribuição da rotina de musculação na agenda: quais dias recebem qual treino
 * (A, B, C… em sequência) e o que acontece com a academia que já estava agendada.
 */
import { somarDias } from '@/lib/triathlon'
import type { StatusTreino } from '@/types/triathlon'

/** Treino de academia que já está na agenda no período. */
export interface AcademiaAgendada {
  id: string
  data: string
  status: StatusTreino
  /** já tem séries registradas (apagar o treino apagaria as séries) */
  temSeries?: boolean
}

export interface DiaAgenda {
  data: string
  /** 1 = segunda … 7 = domingo */
  dia: number
  /** índice do treino da rotina; null quando o dia já tem academia e fica como está */
  indice: number | null
}

export interface PlanoAgenda {
  dias: DiaAgenda[]
  /** ids dos treinos de academia que saem da agenda para dar lugar à rotina */
  substituidos: string[]
}

/**
 * Só sai da agenda o que ainda não aconteceu: pendente, de hoje em diante e sem séries.
 * Treino concluído, perdido ou com séries registradas fica, e o dia é pulado.
 */
export const substituivel = (t: AcademiaAgendada, hoje: string) => t.status === 'pendente' && t.data >= hoje && !t.temSeries

export function planejarAgenda({
  inicio,
  semanas,
  dias,
  primeiro,
  total,
  existentes,
  substituir,
  hoje,
}: {
  /** segunda-feira da primeira semana */
  inicio: string
  semanas: number
  dias: number[]
  /** índice do treino que abre a sequência */
  primeiro: number
  /** quantidade de treinos da rotina */
  total: number
  /** academia já agendada entre `inicio` e o fim do período */
  existentes: AcademiaAgendada[]
  /** troca a academia ainda não feita do período pela rotina */
  substituir: boolean
  hoje: string
}): PlanoAgenda {
  const saem = substituir ? existentes.filter((t) => substituivel(t, hoje)) : []
  const ids = new Set(saem.map((t) => t.id))
  const ocupados = new Set(existentes.filter((t) => !ids.has(t.id)).map((t) => t.data))
  const ordenados = [...dias].sort((a, b) => a - b)
  const lista: DiaAgenda[] = []
  let k = primeiro
  for (let w = 0; w < semanas; w++) {
    for (const dia of ordenados) {
      const data = somarDias(inicio, 7 * w + dia - 1)
      lista.push({ data, dia, indice: ocupados.has(data) ? null : k++ % total })
    }
  }
  return { dias: lista, substituidos: [...ids] }
}
