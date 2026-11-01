import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { useTema } from '@/hooks/useTema'
import { corNoTema } from '@/lib/cores'
import { iconeArea, porcento, SITUACAO } from '@/lib/pessoal'
import { cn } from '@/lib/utils'
import type { AreaVida, SituacaoMeta } from '@/types/pessoal'

/** Título da página com descrição e ações à direita. */
export function Cabecalho({ titulo, descricao, children }: { titulo: string; descricao?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descricao && <p className="text-muted-foreground text-sm">{descricao}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}

/** Nome da área com o ícone e a cor dela. */
export function SeloArea({ area, className }: { area: AreaVida | undefined; className?: string }) {
  const { escuro } = useTema()
  if (!area) return null
  const Icone = iconeArea(area.icone)
  return (
    <span className={cn('text-muted-foreground inline-flex min-w-0 items-center gap-1 text-xs', className)}>
      <Icone className="size-3.5 shrink-0" style={{ color: corNoTema(area.cor, escuro) }} aria-hidden />
      <span className="truncate">{area.nome}</span>
    </span>
  )
}

/** Ícone da área num quadrado colorido. */
export function IconeArea({ area, className }: { area: AreaVida | undefined; className?: string }) {
  const { escuro } = useTema()
  const Icone = iconeArea(area?.icone)
  const cor = area ? corNoTema(area.cor, escuro) : undefined
  return (
    <span
      className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', className)}
      style={{ backgroundColor: cor ? `color-mix(in oklab, ${cor} 14%, transparent)` : undefined, color: cor }}
      aria-hidden
    >
      <Icone className="size-[18px]" />
    </span>
  )
}

export function SeloSituacao({ situacao, className }: { situacao: SituacaoMeta; className?: string }) {
  const s = SITUACAO[situacao]
  return <span className={cn('inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium', s.classe, className)}>{s.rotulo}</span>
}

/**
 * Barra de progresso com uma marca no ponto esperado para hoje.
 * A cor é a da área (identidade); o texto ao lado fica com a cor do texto.
 */
export function BarraProgresso({
  valor,
  esperado,
  cor,
  rotulo,
  className,
}: {
  /** 0 a 1 */
  valor: number
  /** 0 a 1 (opcional) */
  esperado?: number | null
  cor?: string
  rotulo: string
  className?: string
}) {
  const { escuro } = useTema()
  const preenchido = Math.max(0, Math.min(1, valor))
  const mostrarEsperado = esperado !== null && esperado !== undefined && esperado > 0 && esperado < 1
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(preenchido * 100)}
      aria-valuetext={`${porcento(preenchido)}${mostrarEsperado ? `, esperado ${porcento(esperado)}` : ''}`}
      className={cn('bg-muted relative h-2 w-full rounded-full', className)}
    >
      <div
        className="bg-primary h-full rounded-full transition-[width] duration-500"
        style={{ width: `${preenchido * 100}%`, backgroundColor: cor ? corNoTema(cor, escuro) : undefined }}
      />
      {mostrarEsperado && (
        <span
          aria-hidden
          title={`Esperado para hoje: ${porcento(esperado)}`}
          className="bg-foreground/70 ring-background absolute -top-1 h-4 w-0.5 rounded-full ring-2"
          style={{ left: `calc(${esperado * 100}% - 1px)` }}
        />
      )}
    </div>
  )
}

/** Estado vazio com ícone, texto e ação. */
export function Vazio({ icone: Icone, titulo, children }: { icone: LucideIcon; titulo: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center">
      <Icone className="text-muted-foreground size-8" aria-hidden />
      <p className="font-medium">{titulo}</p>
      {children && <div className="text-muted-foreground flex max-w-sm flex-col items-center gap-3 text-sm">{children}</div>}
    </div>
  )
}

/** Abas simples (sublinhadas), como na Agenda do Triathlon. */
export function Abas<T extends string>({
  valor,
  opcoes,
  onChange,
  rotulo,
}: {
  valor: T
  opcoes: { valor: T; rotulo: string; icone?: LucideIcon; contador?: number }[]
  onChange: (v: T) => void
  rotulo: string
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max border-b" role="tablist" aria-label={rotulo}>
        {opcoes.map((o) => (
          <button
            key={o.valor}
            type="button"
            role="tab"
            aria-selected={valor === o.valor}
            onClick={() => onChange(o.valor)}
            className={cn(
              '-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors sm:px-4',
              valor === o.valor ? 'border-primary text-foreground' : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {o.icone && <o.icone className="size-4" />}
            {o.rotulo}
            {o.contador !== undefined && o.contador > 0 && (
              <span className="bg-muted text-muted-foreground rounded-full px-1.5 text-[11px] tabular-nums">{o.contador}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
