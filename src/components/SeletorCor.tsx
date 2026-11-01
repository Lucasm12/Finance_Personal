import { CheckIcon } from 'lucide-react'

import { PALETA } from '@/lib/cores'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onChange: (cor: string) => void
}

export function SeletorCor({ value, onChange }: Props) {
  const personalizada = !PALETA.some((c) => c.claro.toLowerCase() === value.toLowerCase())

  return (
    <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Cor da categoria">
      {PALETA.map((c) => {
        const selecionada = c.claro.toLowerCase() === value.toLowerCase()
        return (
          <button
            key={c.claro}
            type="button"
            role="radio"
            aria-checked={selecionada}
            aria-label={c.nome}
            title={c.nome}
            onClick={() => onChange(c.claro)}
            className={cn(
              'ring-offset-background flex size-8 items-center justify-center rounded-full transition-shadow',
              selecionada ? 'ring-foreground ring-2 ring-offset-2' : 'hover:ring-muted-foreground/40 hover:ring-2 hover:ring-offset-1',
            )}
            style={{ backgroundColor: c.claro }}
          >
            {selecionada && (
              <CheckIcon className={cn('size-4', c.nome === 'Amarelo' ? 'text-black' : 'text-white')} strokeWidth={3} />
            )}
          </button>
        )
      })}
      <label
        title="Outra cor"
        className={cn(
          'ring-offset-background relative flex size-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed',
          personalizada && 'ring-foreground border-solid ring-2 ring-offset-2',
        )}
        style={personalizada ? { backgroundColor: value } : undefined}
      >
        {!personalizada && <span className="text-muted-foreground text-lg leading-none">+</span>}
        <input
          type="color"
          aria-label="Escolher outra cor"
          className="absolute inset-0 cursor-pointer opacity-0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  )
}
