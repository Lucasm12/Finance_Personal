import type { ReactNode } from 'react'

import { formatarValor, textoFaixa, type Faixa, type Leitura, type Tom } from '@/lib/corpo'
import { cn } from '@/lib/utils'

export const FUNDO_TOM: Record<Tom, string> = {
  bom: 'bg-status-bom',
  neutro: 'bg-status-neutro',
  atencao: 'bg-status-atencao',
  alerta: 'bg-status-alerta',
  perigo: 'bg-status-perigo',
}

/** Bolinha da cor da faixa + nome (o texto fica na cor normal; a cor nunca vai sozinha). */
export function SeloFaixa({ faixa, className }: { faixa: Pick<Faixa, 'rotulo' | 'tom'>; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', className)}>
      <span className={cn('size-2.5 shrink-0 rounded-full', FUNDO_TOM[faixa.tom])} aria-hidden />
      {faixa.rotulo}
    </span>
  )
}

const posicao = (v: number, min: number, max: number) => Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100))

/** Régua com as faixas da escala: a faixa atual em cor cheia e um marcador no valor. */
export function ReguaFaixas({ leitura, className }: { leitura: Leitura; className?: string }) {
  const { escala, valor, faixa } = leitura
  const { min, max } = escala
  const visiveis = escala.faixas.filter((x) => x.ate > min && x.de < max)
  // marcas nos limites entre faixas; os da faixa saudável e da atual têm prioridade quando não cabem todos
  const limites = visiveis.slice(1).map((x, i) => {
    const vizinhas = [visiveis[i], x]
    return { valor: x.de, pos: posicao(x.de, min, max), importante: vizinhas.some((v) => v.tom === 'bom' || v === faixa) }
  })
  const marcas: typeof limites = []
  for (const m of [...limites.filter((l) => l.importante), ...limites.filter((l) => !l.importante)]) {
    if (m.pos > 3 && m.pos < 97 && marcas.every((o) => Math.abs(o.pos - m.pos) >= 9)) marcas.push(m)
  }

  return (
    <div
      className={cn('grid gap-1', className)}
      role="img"
      aria-label={`${escala.nome}: ${formatarValor(valor, escala)} ${escala.unidade} — ${faixa.rotulo} (${textoFaixa(faixa, escala)})`}
    >
      <div className="relative h-4">
        <div className="absolute inset-x-0 top-1/2 flex h-2 -translate-y-1/2 gap-0.5">
          {visiveis.map((x) => (
            <div
              key={x.rotulo}
              className={cn(
                'h-full first:rounded-l-full last:rounded-r-full',
                FUNDO_TOM[x.tom],
                x !== faixa && 'opacity-30',
              )}
              style={{ width: `${posicao(Math.min(x.ate, max), min, max) - posicao(Math.max(x.de, min), min, max)}%` }}
            />
          ))}
        </div>
        <div
          className="bg-foreground border-card absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] shadow-sm"
          style={{ left: `${posicao(valor, min, max)}%` }}
        />
      </div>
      <div className="text-muted-foreground relative h-3.5 text-[10px] tabular-nums">
        {marcas.map((m) => (
          <span key={m.valor} className="absolute -translate-x-1/2" style={{ left: `${m.pos}%` }}>
            {formatarValor(m.valor, escala)}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Tabela com todas as faixas da escala; a do valor atual fica destacada. */
export function TabelaFaixas({ leitura, extra }: { leitura: Leitura; extra?: (faixa: Faixa) => ReactNode }) {
  const { escala, faixa: atual } = leitura
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Faixas de referência — {escala.nome}</caption>
      <thead>
        <tr className="text-muted-foreground text-left text-xs">
          <th className="pb-1 font-normal">Classificação</th>
          <th className="pb-1 text-right font-normal">
            {escala.nome} {escala.unidade && `(${escala.unidade})`}
          </th>
          {extra && <th className="pb-1 text-right font-normal">Peso</th>}
        </tr>
      </thead>
      <tbody>
        {escala.faixas.map((x) => {
          const ativa = x === atual
          return (
            <tr key={x.rotulo} className={cn(ativa && 'bg-muted font-medium')} aria-current={ativa || undefined}>
              <td className="rounded-l-md py-1 pl-1.5">
                <SeloFaixa faixa={x} />
                {ativa && <span className="text-muted-foreground ml-1.5 text-xs font-normal">← você</span>}
              </td>
              <td className={cn('py-1 text-right tabular-nums', !extra && 'rounded-r-md pr-1.5')}>{textoFaixa(x, escala)}</td>
              {extra && <td className="rounded-r-md py-1 pr-1.5 text-right tabular-nums">{extra(x)}</td>}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/** Linha compacta: nome, valor, classificação e régua (para os índices de risco). */
export function Indicador({ titulo, leitura, detalhe }: { titulo: string; leitura: Leitura; detalhe?: string }) {
  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-sm font-medium">{titulo}</span>
        <span className="flex items-baseline gap-2">
          <span className="text-lg font-semibold tabular-nums">
            {formatarValor(leitura.valor, leitura.escala)}
            {leitura.escala.unidade && leitura.escala.unidade !== 'nível' && (
              <span className="text-muted-foreground ml-0.5 text-xs font-normal">{leitura.escala.unidade}</span>
            )}
          </span>
          <SeloFaixa faixa={leitura.faixa} />
        </span>
      </div>
      <ReguaFaixas leitura={leitura} />
      <p className="text-muted-foreground -mt-1 text-[11px] leading-snug">
        {detalhe ? `${detalhe} · ` : ''}
        {leitura.escala.faixas
          .filter((x) => x.tom === 'bom')
          .map((x) => `${x.rotulo.toLowerCase()}: ${textoFaixa(x, leitura.escala)}`)
          .join(' · ')}
        {' · '}
        {leitura.escala.fonte}
      </p>
    </div>
  )
}
