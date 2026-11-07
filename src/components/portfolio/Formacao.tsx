import { AwardIcon, BookOpenTextIcon, LanguagesIcon } from 'lucide-react'

import {
  CabecalhoSecao,
  Cartao,
  Chip,
  Destaque,
  IconeQuadro,
  LINHA_DO_TEMPO,
  Marcador,
  Revelar,
  Secao,
} from '@/components/portfolio/Comum'
import { CERTIFICACOES, FORMACAO, IDIOMAS, PUBLICACOES } from '@/lib/portfolio'
import { cn } from '@/lib/utils'

function TituloQuadro({ icone, children }: { icone: typeof AwardIcon; children: string }) {
  return (
    <h3 className="flex items-center gap-3 font-semibold tracking-tight">
      <IconeQuadro icone={icone} className="size-9" />
      {children}
    </h3>
  )
}

export function Formacao() {
  return (
    <Secao id="formacao" rotuloId="titulo-formacao">
      <CabecalhoSecao
        id="titulo-formacao"
        numero="04"
        rotulo="formação"
        titulo={
          <>
            Do bacharelado ao <Destaque>doutorado</Destaque>
          </>
        }
        descricao="Da engenharia de software à inteligência artificial: graduação, especialização, mestrado e doutorado em andamento, com pesquisa em Machine Learning e Visão Computacional."
      />

      <div className="mt-14 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-8 [&>*]:min-w-0">
        <ol className={cn(LINHA_DO_TEMPO, 'space-y-4')}>
          {FORMACAO.map((f, i) => (
            <li key={f.nivel + f.curso} className="relative pl-8 sm:pl-10">
              <Marcador atual={f.emAndamento} className="top-7" />
              <Revelar atraso={i * 80}>
                <Cartao className={cn('p-5 sm:p-6', f.emAndamento && 'border-emerald-400/25')}>
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <p
                      className={cn(
                        'pf-mono text-xs tracking-[0.16em] uppercase',
                        f.emAndamento ? 'text-emerald-300' : 'text-white/55',
                      )}
                    >
                      {f.nivel}
                    </p>
                    <span className="pf-mono text-xs text-white/55">{f.periodo}</span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">{f.curso}</h3>
                  {f.foco && (
                    <p className="mt-1 text-sm text-white/60">
                      Linha de pesquisa: <span className="text-white/85">{f.foco}</span>
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-emerald-300">{f.instituicao}</p>
                    {f.emAndamento && <Chip atual>em andamento</Chip>}
                  </div>
                </Cartao>
              </Revelar>
            </li>
          ))}
        </ol>

        <div className="space-y-4">
          <Revelar atraso={120}>
            <Cartao className="p-6">
              <TituloQuadro icone={BookOpenTextIcon}>Publicações científicas</TituloQuadro>
              <ul className="mt-5 space-y-5">
                {PUBLICACOES.map((p) => (
                  <li key={p.id} className="border-l border-emerald-400/30 pl-4">
                    <p className="pf-mono text-[11px] tracking-[0.14em] text-emerald-300 uppercase">{p.area}</p>
                    <p lang="en" className="mt-1.5 text-sm leading-snug font-medium text-pretty text-white/90">
                      {p.titulo}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-white/55">{p.descricao}</p>
                  </li>
                ))}
              </ul>
            </Cartao>
          </Revelar>

          <Revelar atraso={180}>
            <Cartao className="p-6">
              <TituloQuadro icone={AwardIcon}>Certificações</TituloQuadro>
              <ul className="mt-5 space-y-4">
                {CERTIFICACOES.map((c) => (
                  <li key={c.nome} className="border-l border-emerald-400/30 pl-4">
                    <p className="text-sm font-medium text-white/90">{c.nome}</p>
                    <p className="mt-0.5 text-sm text-white/55">{c.detalhe}</p>
                  </li>
                ))}
              </ul>
            </Cartao>
          </Revelar>

          <Revelar atraso={240}>
            <Cartao className="p-6">
              <TituloQuadro icone={LanguagesIcon}>Idiomas</TituloQuadro>
              <dl className="mt-5 divide-y divide-white/[0.06]">
                {IDIOMAS.map((idioma) => (
                  <div key={idioma.idioma} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                    <dt className="text-sm font-medium text-white/90">{idioma.idioma}</dt>
                    <dd className="text-right text-sm text-white/55">{idioma.nivel}</dd>
                  </div>
                ))}
              </dl>
            </Cartao>
          </Revelar>
        </div>
      </div>
    </Secao>
  )
}
