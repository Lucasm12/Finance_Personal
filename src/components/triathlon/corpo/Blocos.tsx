import type { ReactNode } from 'react'
import { InfoIcon } from 'lucide-react'

import { Card } from '@/components/ui/card'

/** Número de destaque (fileira de resumo no topo). */
export function Bloco({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: ReactNode }) {
  return (
    <Card className="gap-1 px-4 py-4">
      <div className="text-muted-foreground text-xs">{rotulo}</div>
      <div className="text-xl font-semibold tracking-tight tabular-nums">{valor}</div>
      {detalhe && <div className="text-muted-foreground text-xs">{detalhe}</div>}
    </Card>
  )
}

/** Par rótulo/valor dentro de um cartão (use dentro de um <dl>). */
export function Dado({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: ReactNode }) {
  return (
    <div className="bg-muted/40 rounded-lg px-3 py-2">
      <dt className="text-muted-foreground text-xs">{rotulo}</dt>
      <dd className="font-semibold tabular-nums">{valor}</dd>
      {detalhe && <dd className="text-muted-foreground text-[11px] leading-snug">{detalhe}</dd>}
    </div>
  )
}

export function Nota({ children }: { children: ReactNode }) {
  return (
    <p className="text-muted-foreground flex gap-2 text-xs leading-relaxed">
      <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

/** "75,4 kg" — sempre com uma casa decimal. */
export const kg = (n: number) => `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n)} kg`

export const sinal = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '')

/** Diferença com sinal: "+2,3 kg", "−1,0 kg" */
export const diferencaKg = (n: number) => `${Math.abs(n) < 0.05 ? '' : sinal(n)}${kg(Math.abs(n))}`
