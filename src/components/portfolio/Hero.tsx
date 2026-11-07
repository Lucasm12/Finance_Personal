import { ArrowDownIcon, GraduationCapIcon, MailIcon, PresentationIcon } from 'lucide-react'

import { FOCO, IconeGitHub, IconeInstagram, IconeLinkedIn, IconeWhatsApp } from '@/components/portfolio/Comum'
import { TerminalTestes } from '@/components/portfolio/TerminalTestes'
import { buttonVariants } from '@/components/ui/button'
import { CASOS_PUBLICADOS, linkWhatsApp, PERFIL } from '@/lib/portfolio'
import { cn } from '@/lib/utils'

const REDES = [
  { rotulo: 'LinkedIn', href: PERFIL.linkedin, icone: IconeLinkedIn, externo: true },
  { rotulo: 'GitHub', href: PERFIL.github, icone: IconeGitHub, externo: true },
  { rotulo: 'Instagram', href: PERFIL.instagram, icone: IconeInstagram, externo: true },
  { rotulo: 'E-mail', href: `mailto:${PERFIL.email}`, icone: MailIcon, externo: false },
  { rotulo: 'WhatsApp', href: linkWhatsApp(PERFIL.telefone), icone: IconeWhatsApp, externo: true },
]

const ICONES_DIFERENCIAIS = [PresentationIcon, GraduationCapIcon]

/** Ação principal: os casos, quando houver algum publicado; senão, a trajetória. */
const ACAO_PRINCIPAL =
  CASOS_PUBLICADOS.length > 0
    ? { rotulo: 'Ver projetos', href: '#projetos' }
    : { rotulo: 'Ver trajetória', href: '#experiencia' }

export function Hero() {
  return (
    <section id="inicio" aria-labelledby="titulo-inicio" className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 lg:pb-28">
      <div
        aria-hidden
        className="pf-aurora pointer-events-none absolute top-0 left-1/2 h-[480px] w-[min(1000px,140vw)] -translate-x-1/2"
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:px-8 [&>*]:min-w-0">
        <div>
          <p className="pf-mono inline-flex items-center gap-2.5 rounded-full border border-emerald-400/25 bg-emerald-400/[0.07] px-3.5 py-1.5 text-xs text-emerald-100">
            <span aria-hidden className="size-2 rounded-full bg-emerald-400" />
            {PERFIL.cargo} · {PERFIL.local}
          </p>

          <h1
            id="titulo-inicio"
            className="mt-6 text-[clamp(2.4rem,6.5vw,4.25rem)] leading-none font-semibold tracking-[-0.045em]"
          >
            <span className="pf-texto-gradiente">Lucas</span>{' '}
            <span className="pf-serif pr-[0.08em] text-[1.06em] tracking-[-0.02em] text-emerald-300">Marques</span>
          </h1>

          <p className="mt-5 max-w-xl text-[clamp(1.45rem,3vw,2.1rem)] leading-[1.2] font-semibold tracking-[-0.025em] text-balance text-white">
            {PERFIL.chamada} <span className="text-emerald-300">{PERFIL.chamadaDestaque}</span>.
          </p>

          <p className="mt-5 max-w-xl text-base text-pretty text-white/75 sm:text-lg">{PERFIL.resumoCurto}</p>

          <ul aria-label="Diferenciais" className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70">
            {PERFIL.diferenciais.map((diferencial, i) => {
              const Icone = ICONES_DIFERENCIAIS[i] ?? GraduationCapIcon
              return (
                <li key={diferencial} className="flex items-center gap-2">
                  <Icone aria-hidden className="size-4 shrink-0 text-emerald-300" />
                  {diferencial}
                </li>
              )
            })}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={ACAO_PRINCIPAL.href}
              className={cn(
                buttonVariants({ size: 'lg' }),
                'group h-12 rounded-full bg-white px-6 text-[15px] text-neutral-950 hover:bg-white/90 has-[>svg]:px-6',
                FOCO,
              )}
            >
              {ACAO_PRINCIPAL.rotulo}
              <ArrowDownIcon aria-hidden className="transition-transform group-hover:translate-y-0.5" />
            </a>
            <a
              href="#contato"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'h-12 rounded-full border-white/20 bg-white/[0.03] px-6 text-[15px] hover:border-white/35 hover:bg-white/[0.07] dark:bg-white/[0.03] dark:hover:bg-white/[0.07]',
                FOCO,
              )}
            >
              Fale comigo
            </a>
          </div>

          <ul className="mt-7 flex flex-wrap items-center gap-2" aria-label="Redes e contatos">
            {REDES.map((rede) => (
              <li key={rede.rotulo}>
                <a
                  href={rede.href}
                  {...(rede.externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  aria-label={rede.externo ? `${rede.rotulo} (abre em nova aba)` : rede.rotulo}
                  title={rede.rotulo}
                  className={cn(
                    'flex size-11 items-center justify-center rounded-full border border-white/15 text-white/75 transition-colors hover:border-emerald-400/50 hover:text-emerald-300',
                    FOCO,
                  )}
                >
                  <rede.icone className="size-[18px]" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <TerminalTestes className="pf-surgir" />
      </div>
    </section>
  )
}
