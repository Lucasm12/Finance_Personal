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
            title={info.nome}
            className={cn(
              'flex min-w-0 flex-col items-center gap-1 rounded-lg border px-0.5 py-2 text-[10px] font-medium tracking-tight transition-colors sm:px-1 sm:text-[11px] sm:tracking-normal',
              ativo ? 'border-transparent text-white' : 'text-muted-foreground hover:bg-accent',
            )}
            style={ativo ? { backgroundColor: cor(info.cor) } : undefined}
          >
            <Icone className="size-4 shrink-0" />
            {/* em telas de 320 px "Academia" não cabe no botão: corta com "…" em vez de vazar */}
            <span className="max-w-full truncate">{info.nome}</span>
          </button>
        )
      })}
    </div>
  )
}
