import { competenciaAtual, mesesEntre, partesCompetencia, competenciaDe, somar, somarMeses } from '@/lib/format'
import type { CaixinhaComSaldo, Competencia } from '@/types'

export interface PrevisaoCaixinha {
  /** 0 a 1 (null sem meta) */
  fracao: number | null
  /** quanto falta para a meta (null sem meta) */
  falta: number | null
  atingida: boolean
  /** mês em que chega na meta guardando o valor planejado por mês */
  chegaEm: Competencia | null
  /** quanto precisa guardar por mês para chegar na data alvo */
  porMesParaAlvo: number | null
  prazoPassou: boolean
}

export function preverCaixinha(c: CaixinhaComSaldo, hoje: Competencia = competenciaAtual()): PrevisaoCaixinha {
  if (!c.meta) {
    return { fracao: null, falta: null, atingida: false, chegaEm: null, porMesParaAlvo: null, prazoPassou: false }
  }
  const falta = Math.max(0, somar([c.meta, -c.saldo]))
  const atingida = falta === 0
  const fracao = Math.min(1, Math.max(0, c.saldo / c.meta))

  const chegaEm = !atingida && c.aporte_mensal ? somarMeses(hoje, Math.ceil(falta / c.aporte_mensal)) : null

  let porMesParaAlvo: number | null = null
  let prazoPassou = false
  if (!atingida && c.data_alvo) {
    const { ano, mes } = partesCompetencia(c.data_alvo)
    // conta o mês atual e o mês da data alvo
    const meses = mesesEntre(hoje, competenciaDe(ano, mes)) + 1
    if (meses >= 1) porMesParaAlvo = Math.ceil((falta / meses) * 100) / 100
    else prazoPassou = true
  }

  return { fracao, falta, atingida, chegaEm, porMesParaAlvo, prazoPassou }
}

export const SUGESTOES_CAIXINHA = ['Reserva de emergência', 'Viagem', 'Reforma da casa', 'Carro', 'Educação']

/** Reserva de emergência recomendada: 6 meses de despesas fixas. */
export const MESES_RESERVA = 6
