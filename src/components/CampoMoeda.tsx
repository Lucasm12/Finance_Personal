import * as React from 'react'

import { cn } from '@/lib/utils'
import { formatarNumero } from '@/lib/format'

type Props = Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & {
  value: number
  onChange: (valor: number) => void
}

const MAX_DIGITOS = 12 // até 9.999.999.999,99 — cabe em numeric(12,2)

/**
 * Campo de valor em reais com máscara: os dígitos entram pelos centavos,
 * como em app de banco (digitar 12345 → 123,45).
 */
export function CampoMoeda({ value, onChange, className, ...props }: Props) {
  function aoDigitar(e: React.ChangeEvent<HTMLInputElement>) {
    const digitos = e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITOS)
    onChange(digitos ? Number(digitos) / 100 : 0)
  }

  return (
    <div
      className={cn(
        'border-input dark:bg-input/30 focus-within:border-ring focus-within:ring-ring/50 has-aria-invalid:border-destructive flex h-9 w-full items-center rounded-md border bg-transparent shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]',
        className,
      )}
    >
      <span className="text-muted-foreground pl-3 text-sm select-none">R$</span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className="h-full w-full min-w-0 bg-transparent px-2 text-right text-base tabular-nums outline-none md:text-sm"
        value={formatarNumero(value)}
        onChange={aoDigitar}
        onFocus={(e) => {
          const alvo = e.currentTarget
          requestAnimationFrame(() => alvo.setSelectionRange(alvo.value.length, alvo.value.length))
        }}
        {...props}
      />
    </div>
  )
}
