import type { CSSProperties } from 'react'
import { BookOpenIcon, BrainCircuitIcon, CodeXmlIcon, GraduationCapIcon, type LucideIcon } from 'lucide-react'

import {
  CabecalhoSecao,
  Cartao,
  Chip,
  Destaque,
  IconeQuadro,
  LINHA_DO_TEMPO,
  Marcador,
  Secao,
} from '@/components/portfolio/Comum'
import { FORMACAO, numeroSecao } from '@/lib/portfolio'
import { cn } from '@/lib/utils'

const ICONES: Record<string, LucideIcon> = {
  Bacharelado: BookOpenIcon,
  Especialização: CodeXmlIcon,
  Mestrado: BrainCircuitIcon,
  Doutorado: GraduationCapIcon,
}

/** Do bacharelado ao doutorado, como diz o título (FORMACAO vem do mais recente para o mais antigo). */
const DEGRAUS = [...FORMACAO].reverse()

/** Altura de cada degrau no desktop: o primeiro começa mais baixo, o último (doutorado) no alto. */
const PASSO_REM = 3.5

function EmAndamento({ className }: { className?: string }) {
  return (
    <Chip atual className={className}>
      em andamento
    </Chip>
  )
}

export function Formacao() {
  return (
    <Secao id="formacao" rotuloId="titulo-formacao">
      <CabecalhoSecao
        id="titulo-formacao"
        numero={numeroSecao('formacao')}
        rotulo="formação"
        titulo={
          <>
            Do bacharelado ao <Destaque>doutorado</Destaque>
          </>
        }
        descricao="Graduação, especialização, mestrado e doutorado em andamento, com pesquisa em Machine Learning e Visão Computacional."
      />

      {/*
        Celular e tablet: linha do tempo vertical, com o doutorado em cima (flex-col-reverse).
        Desktop: escada de quatro degraus, ligados por uma linha que sobe e se desenha com a rolagem.
      */}
      <div className="pf-escada relative mt-10 lg:mt-20">
        {/*
          Linha do centro do primeiro marcador ao do último (os do meio ficam sobre ela: os degraus sobem por igual).
          Começa no meio da 1ª coluna, (100% − 3 vãos de 1.25rem) / 4 / 2, e termina no meio da 4ª: largura de
          100% − 2 × isso = 75% + 0.9375rem (o <svg> precisa de largura explícita: com left e right ele não estica).
          <line> em porcentagem (sem viewBox esticado) para o traço ter espessura uniforme e o desenho (pathLength) funcionar.
        */}
        <svg
          aria-hidden
          className="pointer-events-none absolute top-[calc(-3.25rem+7.5px)] left-[calc((100%-3.75rem)/8)] hidden h-[10.5rem] w-[calc(75%+0.9375rem)] overflow-visible lg:block"
        >
          <defs>
            <linearGradient id="pf-trajetoria" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="rgb(52 211 153 / 0.2)" />
              <stop offset="1" stopColor="rgb(110 231 183 / 0.9)" />
            </linearGradient>
          </defs>
          <line
            x1="0"
            y1="100%"
            x2="100%"
            y2="0"
            pathLength={1}
            stroke="url(#pf-trajetoria)"
            strokeWidth={1.5}
            strokeLinecap="round"
            className="pf-trajetoria"
          />
        </svg>

        <ol
          className={cn(
            LINHA_DO_TEMPO,
            'flex flex-col-reverse gap-4 lg:grid lg:grid-cols-4 lg:gap-5 lg:before:hidden',
          )}
        >
          {DEGRAUS.map((f, i) => {
            const Icone = ICONES[f.nivel] ?? GraduationCapIcon
            const estilo = { '--i': i, '--degrau': `${(DEGRAUS.length - 1 - i) * PASSO_REM}rem` } as CSSProperties
            return (
              <li
                key={f.nivel + f.curso}
                style={estilo}
                className="pf-aparecer pf-degrau relative flex flex-col pl-8 sm:pl-10 lg:pt-[var(--degrau)] lg:pl-0"
              >
                <Marcador
                  atual={f.emAndamento}
                  className="top-7 lg:top-[calc(var(--degrau)-3.25rem)] lg:left-1/2 lg:-translate-x-1/2"
                />
                <Cartao
                  aparecer={false}
                  destaque={f.emAndamento}
                  className={cn(
                    'flex-1 p-5 sm:p-6',
                    f.emAndamento && 'bg-gradient-to-b from-emerald-400/[0.09] via-transparent to-transparent',
                  )}
                >
                  {/* ano de início em marca-d'água, no canto de baixo (decorativo: o período está no texto) */}
                  <span
                    aria-hidden
                    className={cn(
                      'pf-mono pointer-events-none absolute -right-3 -bottom-8 text-[5.5rem] leading-none font-bold tracking-tighter select-none',
                      f.emAndamento ? 'text-emerald-300/[0.07]' : 'text-white/[0.035]',
                    )}
                  >
                    {f.periodo.slice(0, 4)}
                  </span>

                  <div className="relative flex h-full gap-4 lg:flex-col lg:gap-0">
                    <div className="flex shrink-0 items-start justify-between gap-3">
                      <IconeQuadro icone={Icone} />
                      {f.emAndamento && <EmAndamento className="hidden lg:inline-flex" />}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col lg:mt-5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <p
                          className={cn(
                            'pf-mono text-xs tracking-[0.16em] uppercase',
                            f.emAndamento ? 'text-emerald-300' : 'text-white/70',
                          )}
                        >
                          {f.nivel}
                        </p>
                        {f.emAndamento && <EmAndamento className="lg:hidden" />}
                      </div>
                      <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-balance sm:text-xl">{f.curso}</h3>
                      {f.foco && (
                        <p className="mt-1.5 text-sm text-white/70">
                          Linha de pesquisa: <span className="text-white/90">{f.foco}</span>
                        </p>
                      )}

                      {/* no desktop, empurra instituição e período para o pé do degrau */}
                      <div aria-hidden className="hidden min-h-5 flex-1 lg:block" />
                      <div className="mt-4 border-t border-white/[0.07] pt-3 sm:flex sm:items-baseline sm:justify-between sm:gap-4 lg:mt-0 lg:block lg:pt-4">
                        <p className="text-sm font-medium text-emerald-300">{f.instituicao}</p>
                        <p className="pf-mono mt-1 text-xs whitespace-nowrap text-white/70 sm:mt-0 lg:mt-1">{f.periodo}</p>
                      </div>
                    </div>
                  </div>
                </Cartao>
              </li>
            )
          })}
        </ol>
      </div>
    </Secao>
  )
}
