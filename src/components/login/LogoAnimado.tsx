import { cn } from '@/lib/utils'

const GIRO = { transformBox: 'fill-box', transformOrigin: 'center' } as const

/** Marca neutra (sem nome de módulo): anéis que giram em sentidos opostos. */
export function LogoAnimado({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn('size-12', className)} aria-hidden>
      <circle cx="24" cy="24" r="21" stroke="rgb(255 255 255 / 0.12)" strokeWidth="1.5" />
      <circle
        cx="24"
        cy="24"
        r="21"
        stroke="rgb(52 211 153)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="34 98"
        style={GIRO}
        className="motion-safe:animate-[spin_3.2s_linear_infinite]"
      />
      <circle cx="24" cy="24" r="13" stroke="rgb(255 255 255 / 0.18)" strokeWidth="1.5" />
      <circle
        cx="24"
        cy="24"
        r="13"
        stroke="rgb(110 231 183 / 0.7)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="16 66"
        style={GIRO}
        className="motion-safe:animate-[spin_4.5s_linear_infinite_reverse]"
      />
      <circle cx="24" cy="24" r="3.5" fill="rgb(52 211 153)" className="motion-safe:animate-pulse" />
    </svg>
  )
}
