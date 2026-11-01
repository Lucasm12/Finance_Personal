import { useTema } from '@/hooks/useTema'
import { MODALIDADES, ORDEM_MODALIDADES } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { Modalidade } from '@/types/triathlon'

interface Props<M extends Modalidade> {
  value: M
  onChange: (m: M) => void
  /** modalidades oferecidas (padrão: todas) */
  opcoes?: M[]
}

/** Botões com ícone para escolher a modalidade. */
export function SeletorModalidade<M extends Modalidade = Modalidade>({ value, onChange, opcoes }: Props<M>) {
  const lista = opcoes ?? (ORDEM_MODALIDADES as M[])
  const { cor } = useTema()
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${lista.length}, minmax(0, 1fr))` }}
      role="radiogroup"
      aria-label="Modalidade"
    >
      {lista.map((m) => {
        const info = MODALIDADES[m]
        const Icone = info.icone
        const ativo = m === value
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => onChange(m)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[11px] font-medium transition-colors',
              ativo ? 'border-transparent text-white' : 'text-muted-foreground hover:bg-accent',
            )}
            style={ativo ? { backgroundColor: cor(info.cor) } : undefined}
          >
            <Icone className="size-4" />
            {info.nome}
          </button>
        )
      })}
    </div>
  )
}
