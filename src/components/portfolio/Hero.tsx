import { useEffect, useState, type CSSProperties } from 'react'
import { ArrowDownIcon, CheckIcon, ChevronsDownIcon, GraduationCapIcon, MailIcon, PresentationIcon } from 'lucide-react'

import { FOCO, IconeGitHub, IconeInstagram, IconeLinkedIn, IconeWhatsApp, movimentoReduzido } from '@/components/portfolio/Comum'
import { TerminalTestes } from '@/components/portfolio/TerminalTestes'
import { buttonVariants } from '@/components/ui/button'
import { ACAO_PRINCIPAL, linkWhatsApp, PERFIL } from '@/lib/portfolio'
import { cn } from '@/lib/utils'

const REDES = [
  { rotulo: 'LinkedIn', href: PERFIL.linkedin, icone: IconeLinkedIn, externo: true },
  { rotulo: 'GitHub', href: PERFIL.github, icone: IconeGitHub, externo: true },
  { rotulo: 'Instagram', href: PERFIL.instagram, icone: IconeInstagram, externo: true },
  { rotulo: 'E-mail', href: `mailto:${PERFIL.email}`, icone: MailIcon, externo: false },
  { rotulo: 'WhatsApp', href: linkWhatsApp(PERFIL.telefone), icone: IconeWhatsApp, externo: true },
]

const ICONES_DIFERENCIAIS = [PresentationIcon, GraduationCapIcon]

/**
 * Selos que flutuam em volta do terminal (decorativos; as mesmas competências estão no texto).
 * Só a partir de xl, sobre a borda de cima e a lateral direita (onde o terminal não tem texto) e sem passar da tela.
 */
const SELOS = [
  { texto: 'Cypress', classe: '-top-5 left-12', atraso: 0 },
  { texto: 'BDD · Gherkin', classe: '-top-5 right-20', atraso: 1800 },
  { texto: 'CI/CD', classe: '-right-14 top-28', atraso: 900 },
  { texto: 'APIs REST e SOAP', classe: '-right-16 bottom-20', atraso: 2700 },
]

const atraso = (ms: number) => ({ '--atraso': `${ms}ms` }) as CSSProperties

/** Nome entrando letra por letra (rápido); leitores de tela recebem o nome inteiro. */
function NomeAnimado() {
  let i = 0
  const letras = (texto: string, classe: string) =>
    [...texto].map((letra) => (
      <span key={i} className={cn('pf-letra', classe)} style={{ '--i': i++ } as CSSProperties}>
        {letra}
      </span>
    ))
  return (
    <>
      <span className="sr-only">{PERFIL.nome}</span>
      <span aria-hidden>
        {letras('Lucas', 'pf-texto-gradiente')}{' '}
        <span className="pf-serif pr-[0.08em] text-[1.06em] tracking-[-0.02em] text-emerald-300">{letras('Marques', '')}</span>
      </span>
    </>
  )
}

/**
 * Trecho final da especialidade revezando entre setores (todos do currículo), sem deslocar o texto.
 * O ponto final vai junto de cada frase: fora dela, ficaria longe da palavra (o espaço reservado é o da mais longa).
 */
function Revezamento({ palavras }: { palavras: readonly string[] }) {
  const [reduzido] = useState(movimentoReduzido)
  const [ativa, setAtiva] = useState(0)

  useEffect(() => {
    if (reduzido || palavras.length < 2) return
    const id = setInterval(() => setAtiva((i) => (i + 1) % palavras.length), 2600)
    return () => clearInterval(id)
  }, [reduzido, palavras.length])

  return (
    <>
      <span className="sr-only">{palavras[0]}.</span>
      <span aria-hidden className="pf-revezar text-emerald-300">
        {palavras.map((p, i) => (
          <span key={p} data-ativa={i === ativa}>
            {p}
            <span className="text-white">.</span>
          </span>
        ))}
      </span>
    </>
  )
}

export function Hero() {
  return (
    <section id="inicio" aria-labelledby="titulo-inicio" className="relative pt-28 pb-14 sm:pt-36 sm:pb-20">
      <div
        aria-hidden
        className="pf-aurora pointer-events-none absolute top-0 left-1/2 h-[480px] w-[min(1000px,140vw)] -translate-x-1/2"
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:px-8 [&>*]:min-w-0">
        <div>
          <p className="pf-subir pf-mono inline-flex items-center gap-2.5 rounded-full border border-emerald-400/25 bg-emerald-400/[0.07] px-3.5 py-1.5 text-xs text-emerald-100">
            <span aria-hidden className="relative flex size-2">
              <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            {PERFIL.cargo} · {PERFIL.local}
          </p>

          <h1
            id="titulo-inicio"
            className="mt-6 text-[clamp(2.4rem,6.5vw,4.25rem)] leading-none font-semibold tracking-[-0.045em]"
          >
            <NomeAnimado />
          </h1>

          <p
            style={atraso(250)}
            className="pf-subir mt-5 max-w-xl text-[clamp(1.45rem,3vw,2.1rem)] leading-[1.2] font-semibold tracking-[-0.025em] text-balance text-white"
          >
            {PERFIL.chamada} <Revezamento palavras={PERFIL.chamadaRevezamento} />
          </p>

          <p style={atraso(340)} className="pf-subir mt-5 max-w-xl text-base text-pretty text-white/75 sm:text-lg">
            {PERFIL.resumoCurto}
          </p>

          <ul style={atraso(420)} aria-label="Diferenciais" className="pf-subir mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70">
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

          <div style={atraso(480)} className="pf-subir mt-8 flex flex-wrap items-center gap-3">
            {/* anel de luz girando: fica num invólucro, atrás do botão (o botão é branco) */}
            <span className="pf-anel inline-flex rounded-full">
              <a
                href={ACAO_PRINCIPAL.href}
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'group h-12 rounded-full bg-white px-6 text-[15px] text-neutral-950 hover:bg-white/90 has-[>svg]:px-6',
                  FOCO,
                )}
              >
                {ACAO_PRINCIPAL.rotulo}
                <ArrowDownIcon aria-hidden className="transition-transform motion-safe:group-hover:translate-y-0.5" />
              </a>
            </span>
            <a
              href="#contato"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'h-12 rounded-full border-white/20 bg-white/[0.03] px-6 text-[15px] transition-[background-color,border-color,translate] hover:border-emerald-400/50 hover:bg-white/[0.07] motion-safe:hover:-translate-y-0.5 dark:bg-white/[0.03] dark:hover:bg-white/[0.07]',
                FOCO,
              )}
            >
              Fale comigo
            </a>
          </div>

          <ul style={atraso(540)} className="pf-subir mt-7 flex flex-wrap items-center gap-2" aria-label="Redes e contatos">
            {REDES.map((rede) => (
              <li key={rede.rotulo}>
                <a
                  href={rede.href}
                  {...(rede.externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  aria-label={rede.externo ? `${rede.rotulo} (abre em nova aba)` : rede.rotulo}
                  title={rede.rotulo}
                  className={cn(
                    'flex size-11 items-center justify-center rounded-full border border-white/15 text-white/75 transition-[color,border-color,translate,box-shadow] duration-200 hover:border-emerald-400/50 hover:text-emerald-300 hover:shadow-[0_0_20px_-4px_rgb(52_211_153/0.6)] motion-safe:hover:-translate-y-1',
                    FOCO,
                  )}
                >
                  <rede.icone className="size-[18px]" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div style={atraso(300)} className="pf-surgir relative">
          <TerminalTestes />
          {SELOS.map((selo) => (
            <span
              key={selo.texto}
              aria-hidden
              style={atraso(selo.atraso)}
              className={cn(
                'pf-flutuar pf-mono absolute hidden items-center gap-1.5 rounded-full border border-emerald-400/30 bg-[#0a0d10]/95 px-3 py-1.5 text-xs whitespace-nowrap text-emerald-100 shadow-lg shadow-black/50 xl:inline-flex',
                selo.classe,
              )}
            >
              <CheckIcon className="size-3.5 text-emerald-400" strokeWidth={3} />
              {selo.texto}
            </span>
          ))}
        </div>
      </div>

      <a
        href="#sobre"
        className={cn(
          'pf-subir relative mx-auto mt-14 hidden w-fit flex-col items-center gap-1.5 rounded-md text-xs text-white/60 transition-colors hover:text-white lg:flex',
          FOCO,
        )}
        style={atraso(900)}
      >
        role para ver mais
        <ChevronsDownIcon aria-hidden className="size-5 text-emerald-300 motion-safe:animate-bounce" />
      </a>
    </section>
  )
}
