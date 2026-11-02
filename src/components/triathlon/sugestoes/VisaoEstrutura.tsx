import { MinusIcon, PlusIcon, RepeatIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FASES, parado, quantidadePasso } from '@/lib/sugestoes/estrutura'
import { alvoDoPasso, infoZona } from '@/lib/sugestoes/zonas'
import { cn } from '@/lib/utils'
import type { BlocoTreino, EstruturaTreino, PerfilAtleta } from '@/types/triathlon'

const CORES_ZONA: Record<number, string> = {
  1: 'bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-200',
  2: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200',
  3: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-500/15 dark:text-yellow-200',
  4: 'bg-orange-100 text-orange-900 dark:bg-orange-500/15 dark:text-orange-200',
  5: 'bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-200',
  6: 'bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-500/15 dark:text-fuchsia-200',
}

/** Etiqueta da zona (sigla + nome; a cor nunca vai sozinha). */
export function SeloZona({ zona, curto }: { zona: number; curto?: boolean }) {
  const info = infoZona(zona)
  return (
    <span className={cn('inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] font-semibold', CORES_ZONA[Math.round(zona)] ?? CORES_ZONA[1])}>
      {info.sigla}
      {!curto && <span className="ml-1 font-medium">{info.nome}</span>}
    </span>
  )
}

interface Props {
  estrutura: Pick<EstruturaTreino, 'modalidade' | 'blocos'>
  perfil: PerfilAtleta | null | undefined
  /** com onChange, as repetições da parte principal ficam ajustáveis */
  onChange?: (blocos: BlocoTreino[]) => void
  compacta?: boolean
}

/** Aquecimento, parte principal e desaquecimento, com o alvo de cada passo para o atleta. */
export function VisaoEstrutura({ estrutura, perfil, onChange, compacta }: Props) {
  const m = estrutura.modalidade
  const mudarRepeticoes = (i: number, n: number) =>
    onChange?.(estrutura.blocos.map((b, j) => (j === i ? { ...b, repeticoes: Math.min(50, Math.max(1, n)) } : b)))

  return (
    <ol className="grid gap-2">
      {estrutura.blocos.map((b, i) => {
        const novaFase = i === 0 || estrutura.blocos[i - 1].fase !== b.fase
        return (
          <li key={i} className="grid gap-1">
            {novaFase && <div className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">{FASES[b.fase]}</div>}
            <div className={cn('rounded-lg border', b.repeticoes > 1 && 'border-dashed')}>
              {b.repeticoes > 1 && (
                <div className="bg-muted/40 flex items-center justify-between gap-2 border-b px-3 py-1 text-xs">
                  <span className="flex items-center gap-1.5 font-medium">
                    <RepeatIcon className="size-3.5" aria-hidden />
                    {b.repeticoes}× {b.passos.length > 1 ? 'a sequência abaixo' : ''}
                  </span>
                  {onChange && b.fase === 'principal' && (
                    <span className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Menos repetições" onClick={() => mudarRepeticoes(i, b.repeticoes - 1)} disabled={b.repeticoes <= 1}>
                        <MinusIcon />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Mais repetições" onClick={() => mudarRepeticoes(i, b.repeticoes + 1)}>
                        <PlusIcon />
                      </Button>
                    </span>
                  )}
                </div>
              )}
              <ul className="divide-y">
                {b.passos.map((p, k) => {
                  const alvo = parado(m, p) ? null : alvoDoPasso(m, p, perfil)
                  return (
                    <li key={k} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-3 py-1.5 text-sm">
                      <span className="min-w-14 font-semibold tabular-nums">{quantidadePasso(p, m)}</span>
                      {parado(m, p) ? (
                        <span className="text-muted-foreground text-xs">descanso parado</span>
                      ) : (
                        <>
                          <SeloZona zona={p.zona} curto={compacta} />
                          {alvo?.principal && <span className="text-xs font-medium tabular-nums">{alvo.principal}</span>}
                          {!compacta && alvo?.fc && <span className="text-muted-foreground text-xs tabular-nums">{alvo.fc}</span>}
                          {!compacta && alvo && <span className="text-muted-foreground text-xs">{alvo.pse}</span>}
                        </>
                      )}
                      {p.descricao && !compacta && <span className="text-muted-foreground basis-full text-xs">{p.descricao}</span>}
                    </li>
                  )
                })}
              </ul>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
