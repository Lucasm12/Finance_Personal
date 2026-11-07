import { useEffect, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LockKeyholeIcon, type LucideIcon } from 'lucide-react'

import { moverLuzCartao } from '@/components/login/FundoTecnologico'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ROTA_LOGIN } from '@/modulos'

/** true quando o sistema pede "reduzir movimento". */
export function movimentoReduzido() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Fica true (uma única vez) quando o elemento entra na tela. */
export function useVisivel<T extends Element>() {
  const ref = useRef<T>(null)
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisivel(true)
      return
    }
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada?.isIntersecting) {
          setVisivel(true)
          observador.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    observador.observe(el)
    return () => observador.disconnect()
  }, [])

  return [ref, visivel] as const
}

/** Id da seção que está no meio da tela (para destacar o link no menu). */
export function useSecaoAtiva(ids: string[]) {
  const [ativa, setAtiva] = useState<string | null>(null)
  const chave = ids.join(',')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const elementos = chave
      .split(',')
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) if (entrada.isIntersecting) setAtiva(entrada.target.id)
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    elementos.forEach((el) => observador.observe(el))
    return () => observador.disconnect()
  }, [chave])

  return ativa
}

/** Surge suavemente (subindo) quando entra na tela. */
export function Revelar({ children, atraso = 0, className }: { children: ReactNode; atraso?: number; className?: string }) {
  const [ref, visivel] = useVisivel<HTMLDivElement>()
  return (
    <div
      ref={ref}
      data-visivel={visivel}
      style={{ '--atraso': `${atraso}ms` } as CSSProperties}
      className={cn('pf-revelar', className)}
    >
      {children}
    </div>
  )
}

/** Seção da página com largura e espaçamento padronizados. */
export function Secao({
  id,
  rotuloId,
  children,
  className,
}: {
  id: string
  rotuloId: string
  children: ReactNode
  className?: string
}) {
  return (
    <section id={id} aria-labelledby={rotuloId} className={cn('relative py-24 sm:py-32', className)}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  )
}

/** Palavra em destaque nos títulos (serifada, itálica, verde). */
export function Destaque({ children }: { children: ReactNode }) {
  return <span className="pf-serif text-[1.08em] tracking-normal text-emerald-300">{children}</span>
}

/** Rótulo numerado + título + descrição, no topo de cada seção. */
export function CabecalhoSecao({
  id,
  numero,
  rotulo,
  titulo,
  descricao,
  centralizado,
  className,
}: {
  id: string
  numero: string
  rotulo: string
  titulo: ReactNode
  descricao?: ReactNode
  centralizado?: boolean
  className?: string
}) {
  return (
    <Revelar className={cn('max-w-3xl', centralizado && 'mx-auto text-center', className)}>
      <p
        className={cn(
          'pf-mono flex items-center gap-3 text-xs tracking-[0.18em] text-emerald-300 uppercase',
          centralizado && 'justify-center',
        )}
      >
        <span>{numero}</span>
        <span aria-hidden className="h-px w-10 bg-gradient-to-r from-emerald-400/70 to-transparent" />
        <span className="text-white/60">{rotulo}</span>
      </p>
      <h2
        id={id}
        className="mt-5 text-[clamp(2rem,5.5vw,3.5rem)] leading-[1.06] font-semibold tracking-[-0.035em] text-balance"
      >
        {titulo}
      </h2>
      {descricao && (
        <p className={cn('mt-5 max-w-2xl text-base text-pretty text-white/60 sm:text-lg', centralizado && 'mx-auto')}>
          {descricao}
        </p>
      )}
    </Revelar>
  )
}

/** Subtítulo dentro de uma seção (ex.: "Docência"). */
export function Subtitulo({ icone: Icone, children, className }: { icone: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <Revelar className={className}>
      <h3 className="flex items-center gap-3 text-sm font-medium text-white/80">
        <span className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-emerald-300">
          <Icone className="size-4" />
        </span>
        {children}
        <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
      </h3>
    </Revelar>
  )
}

/** Cartão escuro com luz que acompanha o cursor (a mesma da tela de login). */
export function Cartao({
  children,
  className,
  destaque,
  ...props
}: ComponentProps<'div'> & { destaque?: boolean }) {
  return (
    <div
      onPointerMove={moverLuzCartao}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0d10]/85 transition-colors duration-300 hover:border-emerald-400/25',
        destaque && 'pf-borda border-transparent hover:border-transparent',
        className,
      )}
      {...props}
    >
      <div
        aria-hidden
        className="login-cartao-luz pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="relative h-full">{children}</div>
    </div>
  )
}

/** Etiqueta pequena (tecnologias, tags). */
export function Chip({ children, atual, className }: { children: ReactNode; atual?: boolean; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'pf-mono rounded-full px-2.5 py-1 text-[11px] font-normal',
        atual
          ? 'gap-1.5 border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
          : 'border-white/10 bg-white/[0.03] text-white/70',
        className,
      )}
    >
      {atual && (
        <span aria-hidden className="relative flex size-1.5">
          <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-70 motion-safe:animate-ping" />
          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
        </span>
      )}
      {children}
    </Badge>
  )
}

/** Ícone quadrado com fundo verde suave. */
export function IconeQuadro({ icone: Icone, className }: { icone: LucideIcon | typeof IconeLinkedIn; className?: string }) {
  return (
    <span
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300 transition-transform duration-300 group-hover:scale-105',
        className,
      )}
    >
      <Icone className="size-[18px]" />
    </span>
  )
}

/** Número que conta de 0 até o valor quando aparece na tela. */
export function Contador({ valor, sufixo = '' }: { valor: number; sufixo?: string }) {
  const [ref, visivel] = useVisivel<HTMLSpanElement>()
  const [atual, setAtual] = useState(() => (movimentoReduzido() ? valor : 0))

  useEffect(() => {
    if (!visivel || movimentoReduzido()) return
    let quadro = 0
    const inicio = performance.now()
    const duracao = 1400
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao)
      setAtual(Math.round(valor * (1 - (1 - t) ** 3)))
      if (t < 1) quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [visivel, valor])

  return (
    <span ref={ref}>
      <span aria-hidden className="tabular-nums">
        {atual}
        {sufixo}
      </span>
      <span className="sr-only">
        {valor}
        {sufixo}
      </span>
    </span>
  )
}

/** Botão destacado que leva à tela de login já existente do sistema. */
export function BotaoSistema({ className, compacto }: { className?: string; compacto?: boolean }) {
  return (
    <Link
      to={ROTA_LOGIN}
      className={cn(
        buttonVariants({ size: 'lg' }),
        'login-botao relative h-10 overflow-hidden rounded-full bg-emerald-400 font-medium text-emerald-950 shadow-[0_0_0_1px_rgb(52_211_153/0.5),0_10px_30px_-10px_rgb(16_185_129/0.8)] hover:bg-emerald-300 hover:shadow-[0_0_0_1px_rgb(110_231_183/0.7),0_10px_36px_-8px_rgb(16_185_129/0.9)] focus-visible:ring-4 focus-visible:ring-emerald-400/30',
        className,
      )}
    >
      <span
        aria-hidden
        className="login-reflexo absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
      />
      <LockKeyholeIcon className="relative" />
      <span className="relative">{compacto ? 'Login' : 'Acessar sistema'}</span>
    </Link>
  )
}

/** Ponto da linha do tempo (Experiência e Formação); pulsa quando é o atual. */
export function Marcador({ atual, className }: { atual?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'absolute top-8 left-0 flex size-[15px] items-center justify-center rounded-full border border-emerald-400/60 bg-[#06080a]',
        className,
      )}
    >
      {atual && <span className="absolute inline-flex size-full rounded-full bg-emerald-400/40 motion-safe:animate-ping" />}
      <span className="relative size-[5px] rounded-full bg-emerald-400" />
    </span>
  )
}

/** Linha vertical da linha do tempo (aplicar no <ol>). */
export const LINHA_DO_TEMPO =
  "relative before:absolute before:top-3 before:bottom-3 before:left-[7px] before:w-px before:bg-gradient-to-b before:from-emerald-400/70 before:via-white/10 before:to-white/[0.03] before:content-['']"

/** Logotipo do GitHub (o lucide não tem mais ícones de marcas). */
export function IconeGitHub({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

/** Glifo do Instagram (contorno, no traço dos ícones do lucide). */
export function IconeInstagram({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.25" />
      <circle cx="17.4" cy="6.6" r="0.4" fill="currentColor" />
    </svg>
  )
}

/** Ícone do WhatsApp (contorno; desenho do "brand-whatsapp" do Tabler Icons, licença MIT). */
export function IconeWhatsApp({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9l-5.05.9" />
      <path d="M9 10a.5.5 0 0 0 1 0v-1a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
    </svg>
  )
}

/** Logotipo do LinkedIn (o lucide não tem mais ícones de marcas). */
export function IconeLinkedIn({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}
