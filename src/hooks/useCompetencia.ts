import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

import { competenciaAtual, competenciaDaUrl, competenciaParaUrl } from '@/lib/format'
import type { Competencia } from '@/types'

/** Mês selecionado, guardado na URL (?mes=2026-10) para sobreviver a recarregamentos. */
export function useCompetencia(): [Competencia, (c: Competencia) => void] {
  const [params, setParams] = useSearchParams()
  const competencia = competenciaDaUrl(params.get('mes')) ?? competenciaAtual()

  const setCompetencia = useCallback(
    (c: Competencia) => {
      setParams(
        (atual) => {
          const novo = new URLSearchParams(atual)
          if (c === competenciaAtual()) novo.delete('mes')
          else novo.set('mes', competenciaParaUrl(c))
          return novo
        },
        { replace: true },
      )
    },
    [setParams],
  )

  return [competencia, setCompetencia]
}
