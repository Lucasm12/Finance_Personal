import type { ReactNode } from 'react'
import { ArrowUpRightIcon, CheckIcon, MinusIcon } from 'lucide-react'

import { CabecalhoSecao, Cartao, Chip, Destaque, FOCO, Secao } from '@/components/portfolio/Comum'
import { CASOS_PUBLICADOS, type Caso } from '@/lib/portfolio'
import { cn } from '@/lib/utils'

function Campo({ titulo, children, className }: { titulo: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <h4 className="pf-mono text-xs tracking-[0.16em] text-emerald-300 uppercase">{titulo}</h4>
      <div className="mt-2 text-[15px] leading-relaxed text-white/80">{children}</div>
    </div>
  )
}

function Lista({ itens, icone }: { itens: string[]; icone?: 'check' | 'menos' }) {
  return (
    <ul className="space-y-1.5">
      {itens.map((item) => (
        <li key={item} className="flex gap-2.5">
          {icone === 'check' ? (
            <CheckIcon aria-hidden className="mt-[0.3em] size-3.5 shrink-0 text-emerald-400" strokeWidth={3} />
          ) : icone === 'menos' ? (
            <MinusIcon aria-hidden className="mt-[0.3em] size-3.5 shrink-0 text-white/60" />
          ) : (
            <span aria-hidden className="mt-[0.65em] size-1 shrink-0 rounded-full bg-emerald-400" />
          )}
          <span className="text-pretty">{item}</span>
        </li>
      ))}
    </ul>
  )
}

/** Cartão de um caso de QA: contexto → riscos → abordagem → resultados → evidências. */
export function CartaoCaso({ caso }: { caso: Caso }) {
  return (
    <Cartao destaque className="p-5 sm:p-8">
      <p className="pf-mono text-xs tracking-[0.14em] text-white/70 uppercase">
        {caso.tipo} · {caso.periodo}
      </p>
      <h3 className="mt-2 text-xl leading-snug font-semibold tracking-tight text-balance sm:text-2xl">{caso.titulo}</h3>

      <div className="mt-7 grid gap-7 lg:grid-cols-2 lg:gap-10">
        <div className="space-y-6">
          <Campo titulo="Contexto">
            <p className="text-pretty">{caso.contexto}</p>
          </Campo>
          <Campo titulo="Problema">
            <p className="text-pretty">{caso.problema}</p>
          </Campo>
          <Campo titulo="Riscos">
            <Lista itens={caso.riscos} />
          </Campo>
          <Campo titulo="Minha participação">
            <p>{caso.participacao}</p>
          </Campo>
        </div>
        <div className="space-y-6">
          <Campo titulo="Abordagem de testes">
            <Lista itens={caso.abordagem} />
          </Campo>
          <Campo titulo="Ferramentas">
            <ul aria-label="Ferramentas" className="flex flex-wrap gap-1.5">
              {caso.ferramentas.map((f) => (
                <li key={f}>
                  <Chip>{f}</Chip>
                </li>
              ))}
            </ul>
          </Campo>
        </div>
      </div>

      <div className="mt-8 grid gap-7 border-t border-white/[0.08] pt-7 lg:grid-cols-2 lg:gap-10">
        <Campo titulo="Resultados">
          <Lista itens={caso.resultados} icone="check" />
        </Campo>
        {caso.limites && caso.limites.length > 0 && (
          <Campo titulo="Fora do escopo">
            <Lista itens={caso.limites} icone="menos" />
          </Campo>
        )}
      </div>

      <div className="mt-8">
        <h4 className="pf-mono text-xs tracking-[0.16em] text-emerald-300 uppercase">Evidências</h4>
        <ul className="mt-3 flex flex-wrap gap-2">
          {caso.evidencias.map((e) => (
            <li key={e.href}>
              <a
                href={e.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-white/90 transition-colors hover:border-emerald-400/50 hover:text-white',
                  FOCO,
                )}
              >
                {e.rotulo}
                <ArrowUpRightIcon
                  aria-hidden
                  className="size-3.5 text-emerald-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Cartao>
  )
}

/** Seção de casos práticos. Não aparece enquanto não houver caso completo (sem seção vazia nem cartão fictício). */
export function Casos() {
  if (CASOS_PUBLICADOS.length === 0) return null

  return (
    <Secao id="projetos" rotuloId="titulo-projetos">
      <CabecalhoSecao
        id="titulo-projetos"
        numero="03"
        rotulo="projetos"
        titulo={
          <>
            Casos práticos de <Destaque>QA</Destaque>
          </>
        }
        descricao="Contexto, riscos, abordagem de testes e evidências públicas para conferir."
      />
      <ul className="mt-10 space-y-6">
        {CASOS_PUBLICADOS.map((caso) => (
          <li key={caso.id}>
            <CartaoCaso caso={caso} />
          </li>
        ))}
      </ul>
    </Secao>
  )
}
