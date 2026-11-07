import { DatabaseIcon, ListChecksIcon, ShieldCheckIcon, WorkflowIcon, type LucideIcon } from 'lucide-react'

import { CabecalhoSecao, Cartao, Destaque, IconeQuadro, Secao } from '@/components/portfolio/Comum'
import { SOBRE } from '@/lib/portfolio'

const ICONES: Record<(typeof SOBRE.pilares)[number]['id'], LucideIcon> = {
  requisito: ListChecksIcon,
  risco: ShieldCheckIcon,
  pipeline: WorkflowIcon,
  dados: DatabaseIcon,
}

/** "Sobre": como trabalho (a abertura traz o posicionamento; as experiências, as contribuições). */
export function Sobre() {
  return (
    <Secao id="sobre" rotuloId="titulo-sobre">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-14 [&>*]:min-w-0">
        <div>
          <CabecalhoSecao
            id="titulo-sobre"
            numero="01"
            rotulo="sobre · abordagem"
            titulo={
              <>
                Do requisito à produção, <Destaque>qualidade</Destaque> em cada etapa.
              </>
            }
          />
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-white/80">{SOBRE.introducao}</p>
        </div>

        <ul className="grid gap-4 self-center sm:grid-cols-2">
          {SOBRE.pilares.map((pilar) => (
            <li key={pilar.id}>
              <Cartao className="h-full p-5 sm:p-6">
                <IconeQuadro icone={ICONES[pilar.id]} />
                <h3 className="mt-4 font-semibold tracking-tight">{pilar.titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/70">{pilar.texto}</p>
              </Cartao>
            </li>
          ))}
        </ul>
      </div>
    </Secao>
  )
}
