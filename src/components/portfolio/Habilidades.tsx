import {
  BrainCircuitIcon,
  BugPlayIcon,
  CodeXmlIcon,
  DatabaseIcon,
  GaugeIcon,
  GitBranchIcon,
  KanbanIcon,
  ListChecksIcon,
  type LucideIcon,
} from 'lucide-react'

import { CabecalhoSecao, Cartao, Chip, Destaque, IconeQuadro, Revelar } from '@/components/portfolio/Comum'
import { HABILIDADES, todasAsFerramentas, type GrupoHabilidade } from '@/lib/portfolio'
import { cn } from '@/lib/utils'

const VISUAL: Record<GrupoHabilidade['id'], { icone: LucideIcon; classe: string }> = {
  automacao: { icone: BugPlayIcon, classe: 'lg:col-span-2' },
  apis: { icone: GaugeIcon, classe: 'lg:col-span-2' },
  cicd: { icone: GitBranchIcon, classe: 'lg:col-span-2' },
  dados: { icone: DatabaseIcon, classe: '' },
  linguagens: { icone: CodeXmlIcon, classe: '' },
  metodologias: { icone: ListChecksIcon, classe: 'lg:col-span-2' },
  gestao: { icone: KanbanIcon, classe: '' },
  ia: { icone: BrainCircuitIcon, classe: '' },
}

const FERRAMENTAS = todasAsFerramentas()

/** Faixa com todas as ferramentas passando devagar (pausa ao passar o mouse). */
function Letreiro() {
  return (
    <div aria-hidden className="pf-letreiro-mascara mt-14 overflow-hidden py-2 select-none">
      <div className="pf-letreiro flex w-max">
        {[0, 1].map((copia) => (
          <ul key={copia} className="flex shrink-0 items-center">
            {FERRAMENTAS.map((ferramenta, i) => (
              <li
                key={ferramenta}
                className={cn(
                  'flex items-center gap-8 pr-8 text-3xl font-semibold tracking-[-0.03em] whitespace-nowrap sm:gap-10 sm:pr-10 sm:text-5xl',
                  i % 2 ? 'pf-vazado' : 'text-white/80',
                )}
              >
                {ferramenta}
                <span className="size-2 rotate-45 bg-emerald-400/60" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  )
}

export function Habilidades() {
  return (
    <section id="habilidades" aria-labelledby="titulo-habilidades" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <CabecalhoSecao
          id="titulo-habilidades"
          numero="03"
          rotulo="habilidades"
          titulo={
            <>
              Ferramentas para testar <Destaque>de ponta a ponta</Destaque>
            </>
          }
          descricao="Da interface às APIs e do banco de dados ao pipeline de entrega, complementado pela pesquisa em Machine Learning."
        />
      </div>

      <Letreiro />

      <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 lg:px-8">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HABILIDADES.map((grupo, i) => {
            const { icone, classe } = VISUAL[grupo.id]
            return (
              <li key={grupo.id} className={classe}>
                <Revelar atraso={(i % 4) * 80} className="h-full">
                  <Cartao className="h-full p-6">
                    <div className="flex items-start justify-between gap-3">
                      <IconeQuadro icone={icone} />
                      <span className="pf-mono text-xs text-white/40">
                        {String(grupo.itens.length).padStart(2, '0')}
                      </span>
                    </div>
                    <h3 className="mt-5 font-semibold tracking-tight">{grupo.titulo}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-white/55">{grupo.descricao}</p>
                    <ul aria-label={grupo.titulo} className="mt-4 flex flex-wrap gap-1.5">
                      {grupo.itens.map((item) => (
                        <li key={item}>
                          <Chip className="text-xs text-white/80">{item}</Chip>
                        </li>
                      ))}
                    </ul>
                  </Cartao>
                </Revelar>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
