import { HUMORES } from '@/lib/pessoal'
import { cn } from '@/lib/utils'

/** Escolha do humor (1 a 5). */
export function SeletorHumor({ valor, onChange }: { valor: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex justify-between gap-1 sm:justify-start sm:gap-2" role="radiogroup" aria-label="Humor">
      {HUMORES.map((h) => (
        <button
          key={h.valor}
          type="button"
          role="radio"
          aria-checked={valor === h.valor}
          aria-label={h.rotulo}
          title={h.rotulo}
          onClick={() => onChange(valor === h.valor ? null : h.valor)}
          className={cn(
            'flex flex-col items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] transition-colors sm:px-3',
            valor === h.valor ? 'border-foreground bg-accent' : 'hover:bg-accent/60 border-transparent',
          )}
        >
          <h.icone className={cn('size-7', valor === h.valor ? h.classe : 'text-muted-foreground')} />
          <span className={valor === h.valor ? 'font-medium' : 'text-muted-foreground'}>{h.rotulo}</span>
        </button>
      ))}
    </div>
  )
}
