/**
 * Rotina de musculação na agenda: sequência A, B, C… nos dias escolhidos e a troca da
 * academia que já estava agendada (só sai o que ainda não foi feito).
 */
import { describe, expect, it } from 'vitest'

import { planejarAgenda, type AcademiaAgendada } from '@/lib/forca/agendamento'

// 09/11/2026 é segunda-feira
const base = { inicio: '2026-11-09', semanas: 2, dias: [5, 1, 3], primeiro: 0, total: 3, existentes: [] as AcademiaAgendada[], substituir: true, hoje: '2026-11-02' }
const pendente = (id: string, data: string, extra: Partial<AcademiaAgendada> = {}): AcademiaAgendada => ({ id, data, status: 'pendente', ...extra })

describe('planejarAgenda', () => {
  it('segue a sequência nos dias escolhidos, em ordem, semana a semana', () => {
    const r = planejarAgenda({ ...base, primeiro: 1 })
    expect(r.dias.map((d) => [d.data, d.indice])).toEqual([
      ['2026-11-09', 1],
      ['2026-11-11', 2],
      ['2026-11-13', 0],
      ['2026-11-16', 1],
      ['2026-11-18', 2],
      ['2026-11-20', 0],
    ])
    expect(r.substituidos).toEqual([])
  })

  it('substitui a academia ainda não feita do período, inclusive em dias que não foram escolhidos', () => {
    const r = planejarAgenda({ ...base, existentes: [pendente('seg', '2026-11-09'), pendente('ter', '2026-11-10')] })
    expect(r.substituidos.sort()).toEqual(['seg', 'ter'])
    expect(r.dias.every((d) => d.indice !== null)).toBe(true)
  })

  it('treino concluído, perdido ou com séries fica, e a sequência continua no dia seguinte', () => {
    const existentes = [
      pendente('feito', '2026-11-11', { status: 'concluido' }),
      pendente('perdido', '2026-11-13', { status: 'perdido' }),
      pendente('series', '2026-11-16', { temSeries: true }),
    ]
    const r = planejarAgenda({ ...base, existentes })
    expect(r.substituidos).toEqual([])
    expect(r.dias.map((d) => d.indice)).toEqual([0, null, null, null, 1, 2])
  })

  it('pendente de dia que já passou não sai; o de hoje sai', () => {
    const r = planejarAgenda({ ...base, hoje: '2026-11-11', existentes: [pendente('ontem', '2026-11-10'), pendente('hoje', '2026-11-11')] })
    expect(r.substituidos).toEqual(['hoje'])
  })

  it('sem substituir, qualquer academia já agendada ocupa o dia', () => {
    const r = planejarAgenda({ ...base, substituir: false, existentes: [pendente('seg', '2026-11-09')] })
    expect(r.substituidos).toEqual([])
    expect(r.dias.map((d) => d.indice)).toEqual([null, 0, 1, 2, 0, 1])
  })
})
