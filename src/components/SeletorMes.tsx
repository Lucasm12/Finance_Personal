import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { competenciaAtual, nomeCompetencia, somarMeses } from '@/lib/format'
import type { Competencia } from '@/types'

interface Props {
  competencia: Competencia
  onChange: (c: Competencia) => void
}

export function SeletorMes({ competencia, onChange }: Props) {
  const atual = competenciaAtual()
  const ehAtual = competencia === atual

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" aria-label="Mês anterior" onClick={() => onChange(somarMeses(competencia, -1))}>
        <ChevronLeftIcon />
      </Button>
      <div className="flex min-w-40 flex-col items-center px-1 text-center leading-tight sm:min-w-48">
        <span className="text-base font-semibold sm:text-lg" aria-live="polite">
          {nomeCompetencia(competencia)}
        </span>
        {ehAtual ? (
          <span className="text-muted-foreground text-xs">mês atual</span>
        ) : (
          <button
            type="button"
            className="text-primary text-xs font-medium hover:underline"
            onClick={() => onChange(atual)}
          >
            voltar para o mês atual
          </button>
        )}
      </div>
      <Button variant="outline" size="icon" aria-label="Próximo mês" onClick={() => onChange(somarMeses(competencia, 1))}>
        <ChevronRightIcon />
      </Button>
    </div>
  )
}
