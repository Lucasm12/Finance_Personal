import { Link } from 'react-router-dom'
import { ChevronRightIcon, FlagIcon, MapPinIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { dataLocal, duracaoRelogio, formatarDecimal, TIPOS_PROVA } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import { ROTAS_TRIATHLON } from '@/modulos'
import type { Prova } from '@/types/triathlon'

/** "1.500 m · 40 km · 10 km" */
export function distanciasProva(p: Prova) {
  return [
    p.natacao_m ? `${p.natacao_m.toLocaleString('pt-BR')} m` : null,
    p.ciclismo_km ? `${formatarDecimal(p.ciclismo_km)} km` : null,
    p.corrida_km ? `${formatarDecimal(p.corrida_km)} km` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

export function provasPorDia(provas: Prova[]) {
  const mapa = new Map<string, Prova[]>()
  for (const p of provas) mapa.set(p.data, [...(mapa.get(p.data) ?? []), p])
  return mapa
}

/** Etiqueta curta da prova no quadrado do dia (calendário do mês). */
export function EtiquetaProva({ prova }: { prova: Prova }) {
  return (
    <span className="bg-primary text-primary-foreground flex min-w-0 items-center gap-1 rounded px-1 py-0.5 text-[11px] leading-tight font-medium">
      <FlagIcon className="size-3 shrink-0" aria-hidden />
      <span className="truncate">{prova.nome}</span>
    </span>
  )
}

/** A prova no detalhe do dia: tipo, distâncias, local, meta ou resultado e o atalho para Provas. */
export function CartaoProva({ prova: p, className }: { prova: Prova; className?: string }) {
  const passou = p.data < dataLocal(new Date())
  const distancias = distanciasProva(p)
  return (
    <div className={cn('border-primary/30 bg-primary/5 flex items-start gap-3 rounded-lg border px-3 py-2.5', className)}>
      <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full" aria-hidden>
        <FlagIcon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-semibold">{p.nome}</span>
          <Badge variant={p.prioridade === 'A' ? 'default' : 'outline'}>Prova {p.prioridade}</Badge>
        </div>
        <div className="text-muted-foreground text-xs">
          {TIPOS_PROVA[p.tipo].nome}
          {distancias && ` · ${distancias}`}
        </div>
        {p.local && (
          <div className="text-muted-foreground flex items-center gap-1 text-xs">
            <MapPinIcon className="size-3" aria-hidden />
            {p.local}
          </div>
        )}
        <div className="mt-0.5 text-xs">
          {p.resultado_tempo_seg ? (
            <>
              Resultado: <strong className="tabular-nums">{duracaoRelogio(p.resultado_tempo_seg)}</strong>
              {p.meta_tempo_seg && <span className="text-muted-foreground tabular-nums"> (meta {duracaoRelogio(p.meta_tempo_seg)})</span>}
            </>
          ) : p.meta_tempo_seg ? (
            <>
              Meta: <strong className="tabular-nums">{duracaoRelogio(p.meta_tempo_seg)}</strong>
              {passou && <span className="text-muted-foreground"> · registre o resultado em Provas</span>}
            </>
          ) : (
            passou && <span className="text-muted-foreground">Registre o resultado em Provas.</span>
          )}
        </div>
      </div>
      <Link to={ROTAS_TRIATHLON.provas} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-7 shrink-0 px-2')}>
        Provas
        <ChevronRightIcon />
      </Link>
    </div>
  )
}
