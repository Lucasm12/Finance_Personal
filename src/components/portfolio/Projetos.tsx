import { CheckIcon, HeartPulseIcon, LandmarkIcon, MicroscopeIcon, UsersRoundIcon, type LucideIcon } from 'lucide-react'

import { BotaoSistema, CabecalhoSecao, Cartao, Chip, Destaque, IconeQuadro, Revelar, Secao } from '@/components/portfolio/Comum'
import { PROJETOS, type Projeto } from '@/lib/portfolio'
import { MODULOS } from '@/modulos'

const ICONES: Record<string, LucideIcon> = {
  saude: HeartPulseIcon,
  pagamentos: LandmarkIcon,
  aedes: MicroscopeIcon,
  inclusao: UsersRoundIcon,
}

function Tags({ tags }: { tags: string[] }) {
  return (
    <ul aria-label="Tecnologias e temas" className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <li key={tag}>
          <Chip>{tag}</Chip>
        </li>
      ))}
    </ul>
  )
}

/** O próprio sistema, apresentado como projeto, com os módulos reais e o acesso ao login. */
function ProjetoPlataforma({ projeto }: { projeto: Projeto }) {
  return (
    <Cartao destaque className="p-6 sm:p-10">
      <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center [&>*]:min-w-0">
        <div>
          <p className="pf-mono text-xs tracking-[0.18em] text-emerald-300 uppercase">{projeto.tipo}</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{projeto.titulo}</h3>
          <p className="mt-4 leading-relaxed text-pretty text-white/65">{projeto.descricao}</p>
          <div className="mt-6">
            <Tags tags={projeto.tags} />
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
            <BotaoSistema className="h-11 has-[>svg]:px-5" />
            <span className="pf-mono text-xs text-white/50">acesso restrito, com login</span>
          </div>
        </div>

        <ul aria-label="Módulos do sistema" className="grid gap-3">
          {MODULOS.map((modulo, i) => (
            <li
              key={modulo.id}
              className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-black/30 p-4 transition-colors hover:border-emerald-400/25"
            >
              <IconeQuadro icone={modulo.icone} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{modulo.nome}</p>
                <p className="mt-0.5 text-sm text-white/55">{modulo.descricao}</p>
              </div>
              <span className="pf-mono hidden text-xs text-white/35 sm:inline">{String(i + 1).padStart(2, '0')}</span>
            </li>
          ))}
        </ul>
      </div>
    </Cartao>
  )
}

function CartaoProjeto({ projeto }: { projeto: Projeto }) {
  const icone = ICONES[projeto.id] ?? MicroscopeIcon
  return (
    <Cartao className="flex h-full flex-col p-6 sm:p-7">
      <div className="flex items-center gap-3">
        <IconeQuadro icone={icone} />
        <p className="pf-mono text-xs tracking-[0.14em] text-emerald-300 uppercase">{projeto.tipo}</p>
      </div>
      <h3 lang={projeto.idiomaOriginal} className="mt-5 text-lg leading-snug font-semibold tracking-tight text-balance">
        {projeto.titulo}
      </h3>
      {projeto.origem && <p className="mt-1 text-sm text-white/50">{projeto.origem}</p>}
      <p className="mt-3 text-sm leading-relaxed text-pretty text-white/65">{projeto.descricao}</p>
      {projeto.resultados && (
        <ul aria-label="Resultados" className="mt-4 space-y-1.5">
          {projeto.resultados.map((r) => (
            <li key={r} className="flex items-center gap-2 text-sm text-white/80">
              <CheckIcon className="size-3.5 shrink-0 text-emerald-400" strokeWidth={3} />
              {r}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto pt-6">
        <Tags tags={projeto.tags} />
      </div>
    </Cartao>
  )
}

export function Projetos() {
  const destaque = PROJETOS.find((p) => p.id === 'plataforma')
  const demais = PROJETOS.filter((p) => p !== destaque)

  return (
    <Secao id="projetos" rotuloId="titulo-projetos">
      <CabecalhoSecao
        id="titulo-projetos"
        numero="04"
        rotulo="projetos"
        titulo={
          <>
            Projetos, cases e <Destaque>publicações</Destaque>
          </>
        }
        descricao="Uma seleção do que construí, testei e pesquisei: do sistema que roda neste mesmo endereço aos artigos científicos."
      />

      <div className="mt-14 space-y-4">
        {destaque && (
          <Revelar>
            <ProjetoPlataforma projeto={destaque} />
          </Revelar>
        )}
        <ul className="grid gap-4 md:grid-cols-2">
          {demais.map((projeto, i) => (
            <li key={projeto.id}>
              <Revelar atraso={(i % 2) * 100} className="h-full">
                <CartaoProjeto projeto={projeto} />
              </Revelar>
            </li>
          ))}
        </ul>
      </div>
    </Secao>
  )
}
