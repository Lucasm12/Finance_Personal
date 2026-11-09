import { AwardIcon, BookOpenTextIcon, LanguagesIcon } from 'lucide-react'

import {
  CabecalhoSecao,
  Cartao,
  Chip,
  Destaque,
  FOCO,
  IconeQuadro,
  LINHA_DO_TEMPO,
  Marcador,
  Secao,
} from '@/components/portfolio/Comum'
import { CERTIFICACOES, FORMACAO, IDIOMAS, numeroSecao, PUBLICACOES } from '@/lib/portfolio'
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
        numero={numeroSecao('formacao')}
        rotulo="formação"
        titulo={
          <>
            Do bacharelado ao <Destaque>doutorado</Destaque>
          </>
        }
        descricao="Graduação, especialização, mestrado e doutorado em andamento, com pesquisa em Machine Learning e Visão Computacional."
      />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-8 [&>*]:min-w-0">
        <ol className={cn(LINHA_DO_TEMPO, 'space-y-4')}>
          {FORMACAO.map((f) => (
            <li key={f.nivel + f.curso} className="pf-aparecer relative pl-8 sm:pl-10">
              <Marcador atual={f.emAndamento} className="top-7" />
              <Cartao aparecer={false} className={cn('p-5 sm:p-6', f.emAndamento && 'border-emerald-400/30')}>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <p
                    className={cn(
                      'pf-mono text-xs tracking-[0.16em] uppercase',
                      f.emAndamento ? 'text-emerald-300' : 'text-white/70',
                    )}
                  >
                    {f.nivel}
                  </p>
                  <span className="pf-mono text-xs text-white/70">{f.periodo}</span>
                </div>
                <h3 className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">{f.curso}</h3>
                {f.foco && (
                  <p className="mt-1 text-sm text-white/70">
                    Linha de pesquisa: <span className="text-white/90">{f.foco}</span>
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-emerald-300">{f.instituicao}</p>
                  {f.emAndamento && <Chip atual>em andamento</Chip>}
                </div>
              </Cartao>
            </li>
          ))}
        </ol>

        <div className="space-y-4">
          <Cartao className="p-5 sm:p-6">
            <TituloQuadro icone={BookOpenTextIcon}>Publicações científicas</TituloQuadro>
            <ul className="mt-5 space-y-5">
              {PUBLICACOES.map((p) => (
                <li key={p.id} className="border-l border-emerald-400/35 pl-4">
                  <p className="pf-mono text-xs tracking-[0.12em] text-emerald-300 uppercase">
                    {[p.area, p.ano].filter(Boolean).join(' · ')}
                  </p>
                  <p lang="en" className="mt-1.5 text-sm leading-snug font-medium text-pretty text-white/90">
                    {p.link ? (
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn('rounded-sm underline-offset-4 hover:underline', FOCO)}
                      >
                        {p.titulo}
                        <span className="sr-only"> (abre em nova aba)</span>
                      </a>
                    ) : (
                      p.titulo
                    )}
                  </p>
                  {p.veiculo && <p className="mt-1 text-sm text-white/70 italic">{p.veiculo}</p>}
                  <p className="mt-1 text-sm leading-relaxed text-white/70">{p.descricao}</p>
                </li>
              ))}
            </ul>
          </Cartao>

          <Cartao className="p-5 sm:p-6">
            <TituloQuadro icone={AwardIcon}>Certificações</TituloQuadro>
            <ul className="mt-5 space-y-4">
              {CERTIFICACOES.map((c) => (
                <li key={c.nome} className="border-l border-emerald-400/35 pl-4">
                  <p className="text-sm font-medium text-white/90">{c.nome}</p>
                  {c.detalhe && <p className="mt-0.5 text-sm text-white/70">{c.detalhe}</p>}
                </li>
              ))}
            </ul>
          </Cartao>

          <Cartao className="p-5 sm:p-6">
            <TituloQuadro icone={LanguagesIcon}>Idiomas</TituloQuadro>
            <dl className="mt-5 divide-y divide-white/[0.08]">
              {IDIOMAS.map((idioma) => (
                <div key={idioma.idioma} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                  <dt className="text-sm font-medium text-white/90">{idioma.idioma}</dt>
                  <dd className="text-right text-sm text-white/70">{idioma.nivel}</dd>
                </div>
              ))}
            </dl>
          </Cartao>
        </div>
      </div>
    </Secao>
  )
}
