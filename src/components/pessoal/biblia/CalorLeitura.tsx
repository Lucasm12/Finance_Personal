import { useEffect, useMemo, useRef } from 'react'

import { dataCurta, DIAS_SEMANA, diaDaSemana } from '@/lib/pessoal'
import { somarDias } from '@/lib/triathlon'
import { cn } from '@/lib/utils'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// uma cor (a primária), do claro ao escuro: mais capítulos, mais forte
const NIVEIS = ['bg-muted', 'bg-primary/25', 'bg-primary/45', 'bg-primary/70', 'bg-primary']
const nivel = (n: number) => (n <= 0 ? 0 : n <= 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4)

/** Calendário de calor: dias com leitura nas últimas 53 semanas (colunas = semanas, de segunda a domingo). */
export function CalorLeitura({ dias, hoje }: { dias: { dia: string; capitulos: number }[]; hoje: string }) {
  const porDia = useMemo(() => new Map(dias.map((d) => [d.dia, d.capitulos])), [dias])
  const rolagem = useRef<HTMLDivElement>(null)

  const semanas = useMemo(() => {
    const ultimaSegunda = somarDias(hoje, -(diaDaSemana(hoje) - 1))
    return Array.from({ length: 53 }, (_, i) => {
      const segunda = somarDias(ultimaSegunda, -7 * (52 - i))
      return Array.from({ length: 7 }, (_, d) => somarDias(segunda, d))
    })
  }, [hoje])

  // no celular, começa mostrando as semanas mais recentes
  useEffect(() => {
    const el = rolagem.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [semanas])

  const totalDias = dias.length
  return (
    <figure className="grid gap-2">
      <div ref={rolagem} className="overflow-x-auto pb-1">
        <div className="inline-grid gap-1" style={{ gridTemplateColumns: `auto repeat(${semanas.length}, 0.75rem)` }}>
          {/* nomes dos meses */}
          <span />
          {semanas.map((s, i) => {
            const mes = Number(s[0].slice(5, 7)) - 1
            const mudou = i === 0 || Number(semanas[i - 1][0].slice(5, 7)) - 1 !== mes
            return (
              <span key={s[0]} className="text-muted-foreground h-4 text-[10px] leading-4 whitespace-nowrap">
                {mudou ? MESES[mes] : ''}
              </span>
            )
          })}
          {Array.from({ length: 7 }, (_, d) => (
            <div key={d} className="contents">
              <span className="text-muted-foreground pr-1 text-[10px] leading-3">{d % 2 === 0 ? DIAS_SEMANA[d] : ''}</span>
              {semanas.map((s) => {
                const dia = s[d]
                if (dia > hoje) return <span key={dia} className="size-3" />
                const n = porDia.get(dia) ?? 0
                const texto = `${dataCurta(dia)}: ${n === 0 ? 'sem leitura' : `${n} ${n === 1 ? 'capítulo' : 'capítulos'}`}`
                return <span key={dia} title={texto} aria-label={texto} className={cn('size-3 rounded-[3px]', NIVEIS[nivel(n)])} />
              })}
            </div>
          ))}
        </div>
      </div>
      <figcaption className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
        <span>
          {totalDias} {totalDias === 1 ? 'dia' : 'dias'} com leitura no último ano
        </span>
        <span className="flex items-center gap-1" aria-hidden>
          menos
          {NIVEIS.map((c) => (
            <span key={c} className={cn('size-3 rounded-[3px]', c)} />
          ))}
          mais
        </span>
      </figcaption>
    </figure>
  )
}
