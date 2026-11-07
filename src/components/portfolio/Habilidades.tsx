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

import { CabecalhoSecao, Cartao, Chip, Destaque, IconeQuadro, Secao } from '@/components/portfolio/Comum'
import { HABILIDADES, type GrupoHabilidade } from '@/lib/portfolio'

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

export function Habilidades() {
  return (
    <Secao id="habilidades" rotuloId="titulo-habilidades">
      <CabecalhoSecao
        id="titulo-habilidades"
        numero="04"
        rotulo="habilidades"
        titulo={
          <>
            Ferramentas para testar <Destaque>de ponta a ponta</Destaque>
          </>
        }
        descricao="Da interface às APIs e do banco de dados ao pipeline de entrega."
      />

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {HABILIDADES.map((grupo) => {
          const { icone, classe } = VISUAL[grupo.id]
          return (
            <li key={grupo.id} className={classe}>
              <Cartao className="h-full p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <IconeQuadro icone={icone} />
                  <h3 className="font-semibold tracking-tight">{grupo.titulo}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-white/70">{grupo.descricao}</p>
                <ul aria-label={grupo.titulo} className="mt-4 flex flex-wrap gap-1.5">
                  {grupo.itens.map((item) => (
                    <li key={item}>
                      <Chip>{item}</Chip>
                    </li>
                  ))}
                </ul>
              </Cartao>
            </li>
          )
        })}
      </ul>
    </Secao>
  )
}
