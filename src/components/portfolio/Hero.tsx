import type { CSSProperties } from 'react'
import { ArrowDownIcon, MailIcon } from 'lucide-react'

import { Contador, IconeGitHub, IconeInstagram, IconeLinkedIn, IconeWhatsApp } from '@/components/portfolio/Comum'
import { TerminalTestes } from '@/components/portfolio/TerminalTestes'
import { buttonVariants } from '@/components/ui/button'
import { linkWhatsApp, NUMEROS, PERFIL } from '@/lib/portfolio'
import { cn } from '@/lib/utils'

const atraso = (ms: number) => ({ '--atraso': `${ms}ms` }) as CSSProperties

const REDES = [
  { rotulo: 'LinkedIn', href: PERFIL.linkedin, icone: IconeLinkedIn, externo: true },
  { rotulo: 'GitHub', href: PERFIL.github, icone: IconeGitHub, externo: true },
  { rotulo: 'Instagram', href: PERFIL.instagram, icone: IconeInstagram, externo: true },
  { rotulo: 'E-mail', href: `mailto:${PERFIL.email}`, icone: MailIcon, externo: false },
  { rotulo: 'WhatsApp', href: linkWhatsApp(PERFIL.telefone), icone: IconeWhatsApp, externo: true },
]

export function Hero() {
  return (
    <section id="inicio" aria-labelledby="titulo-inicio" className="relative flex min-h-dvh flex-col justify-center pt-28 pb-16 sm:pt-32">
      <div
        aria-hidden
        className="pf-aurora pointer-events-none absolute top-[6%] left-1/2 h-[520px] w-[min(1000px,140vw)] -translate-x-1/2"
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:px-8">
        <div className="min-w-0">
          <p
            style={atraso(80)}
            className="pf-entrada pf-mono inline-flex items-center gap-2.5 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3.5 py-1.5 text-xs text-emerald-200"
          >
            <span aria-hidden className="relative flex size-2">
              <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            {PERFIL.cargo} · {PERFIL.local}
          </p>

          <h1
            id="titulo-inicio"
            style={atraso(180)}
            className="pf-entrada mt-7 text-[clamp(3.4rem,13vw,7rem)] leading-[0.9] font-semibold tracking-[-0.05em]"
          >
            <span className="pf-texto-gradiente block pb-[0.06em]">Lucas</span>{' '}
            <span className="pf-serif block pr-[0.1em] text-[1.06em] tracking-[-0.02em] text-emerald-300">Marques</span>
          </h1>

          <p style={atraso(300)} className="pf-entrada mt-7 max-w-xl text-lg text-pretty text-white/75 sm:text-xl">
            {PERFIL.chamada} <span className="text-white">{PERFIL.chamadaDestaque}</span>.
          </p>
          <p style={atraso(380)} className="pf-entrada mt-3 max-w-xl text-pretty text-white/55">
            {PERFIL.resumoCurto}
          </p>

          <div style={atraso(460)} className="pf-entrada mt-9 flex flex-wrap items-center gap-3">
            <a
              href="#experiencia"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'group h-12 rounded-full bg-white px-6 text-[15px] text-neutral-950 hover:bg-white/90 has-[>svg]:px-6',
              )}
            >
              Ver trajetória
              <ArrowDownIcon className="transition-transform group-hover:translate-y-0.5" />
            </a>
            <a
              href="#contato"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'h-12 rounded-full border-white/15 bg-white/[0.03] px-6 text-[15px] hover:border-white/30 hover:bg-white/[0.06] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]',
              )}
            >
              Fale comigo
            </a>
          </div>

          <ul style={atraso(540)} className="pf-entrada mt-8 flex items-center gap-2" aria-label="Contatos">
            {REDES.map((rede) => (
              <li key={rede.rotulo}>
                <a
                  href={rede.href}
                  {...(rede.externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  aria-label={rede.rotulo}
                  title={rede.rotulo}
                  className="flex size-10 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:-translate-y-0.5 hover:border-emerald-400/40 hover:text-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-400/40 focus-visible:outline-none"
                >
                  <rede.icone className="size-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div style={atraso(420)} className="pf-entrada min-w-0">
          <TerminalTestes />
        </div>
      </div>

      <div className="relative mx-auto mt-16 w-full max-w-6xl px-4 sm:mt-20 sm:px-6 lg:px-8">
        <dl
          style={atraso(640)}
          className="pf-entrada grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] lg:grid-cols-4"
        >
          {NUMEROS.map((n) => (
            <div key={n.rotulo} className="flex flex-col-reverse justify-end gap-1.5 bg-[#06080a]/95 p-5 sm:p-6">
              <dt className="text-sm leading-snug text-white/55">{n.rotulo}</dt>
              <dd className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {n.prefixo && <span className="mr-1 text-base font-normal text-white/45">{n.prefixo.trim()}</span>}
                <Contador valor={n.valor} sufixo={n.sufixo} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
