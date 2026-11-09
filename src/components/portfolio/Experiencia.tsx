import { BriefcaseBusinessIcon, MapPinIcon, PresentationIcon, ServerIcon } from 'lucide-react'

import {
  CabecalhoSecao,
  Cartao,
  Chip,
  Destaque,
  LINHA_DO_TEMPO,
  Marcador,
  Secao,
  Subtitulo,
} from '@/components/portfolio/Comum'
import {
  DOCENCIA,
  EXPERIENCIA_ANTERIOR,
  EXPERIENCIAS_QA,
  numeroSecao,
  type Docencia,
  type Experiencia as TipoExperiencia,
} from '@/lib/portfolio'
import { cn } from '@/lib/utils'

function Periodo({ children }: { children: string }) {
  return <span className="pf-mono text-xs whitespace-nowrap text-white/70">{children}</span>
}

function Tecnologias({ itens }: { itens: string[] }) {
  return (
    <ul aria-label="Tecnologias" className="flex flex-wrap gap-1.5">
      {itens.map((t) => (
        <li key={t}>
          <Chip>{t}</Chip>
        </li>
      ))}
    </ul>
  )
}

function CartaoExperiencia({ exp }: { exp: TipoExperiencia }) {
  return (
    <Cartao aparecer={false} className="p-5 sm:p-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h4 className="text-lg font-semibold tracking-tight sm:text-xl">{exp.cargo}</h4>
          <p className="mt-1 text-white/80">
            <span className="font-medium text-emerald-300">{exp.empresa}</span>
            {exp.setor && <span className="text-white/70"> · {exp.setor}</span>}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/65">
            <MapPinIcon aria-hidden className="size-3.5 shrink-0" />
            {exp.local}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5 sm:flex-col sm:items-end">
          <Periodo>{exp.periodo}</Periodo>
          {exp.atual && <Chip atual>atual</Chip>}
        </div>
      </div>

      <ul className="mt-5 space-y-2 text-[15px] leading-relaxed text-white/80">
        {exp.atividades.map((atividade) => (
          <li key={atividade} className="flex gap-3">
            <span aria-hidden className="mt-[0.65em] size-1 shrink-0 rounded-full bg-emerald-400" />
            <span className="text-pretty">{atividade}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5">
        <Tecnologias itens={exp.tecnologias} />
      </div>
    </Cartao>
  )
}

function CartaoDocencia({ d }: { d: Docencia }) {
  return (
    <Cartao className="h-full p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h4 className="font-semibold tracking-tight">{d.cargo}</h4>
          <p className="mt-1 text-sm font-medium text-emerald-300">{d.instituicao}</p>
          <p className="mt-1 text-sm text-white/65">{d.contexto}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Periodo>{d.periodo}</Periodo>
          {d.atual && <Chip atual>atual</Chip>}
        </div>
      </div>
      {d.descricao && <p className="mt-4 text-sm leading-relaxed text-white/75">{d.descricao}</p>}
      {d.disciplinas && (
        <ul aria-label="Disciplinas" className="mt-4 flex flex-wrap gap-1.5">
          {d.disciplinas.map((disciplina) => (
            <li key={disciplina}>
              <Chip>{disciplina}</Chip>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  )
}

export function Experiencia() {
  return (
    <Secao id="experiencia" rotuloId="titulo-experiencia">
      <CabecalhoSecao
        id="titulo-experiencia"
        numero={numeroSecao('experiencia')}
        rotulo="experiência"
        titulo={
          <>
            Trajetória em <Destaque>sistemas críticos</Destaque>
          </>
        }
        descricao="O que fiz em cada empresa, as tecnologias usadas e os resultados para os quais contribuí."
      />

      <Subtitulo icone={BriefcaseBusinessIcon} className="mt-12">
        Qualidade de software
      </Subtitulo>
      <ol className={cn(LINHA_DO_TEMPO, 'mt-6 space-y-4 sm:space-y-5')}>
        {EXPERIENCIAS_QA.map((exp) => (
          <li key={exp.empresa + exp.periodo} className="pf-aparecer relative pl-8 sm:pl-11">
            <Marcador atual={exp.atual} />
            <CartaoExperiencia exp={exp} />
          </li>
        ))}
      </ol>

      <Subtitulo icone={PresentationIcon} className="mt-16">
        Docência
      </Subtitulo>
      <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {DOCENCIA.map((d) => (
          <li key={d.instituicao + d.periodo}>
            <CartaoDocencia d={d} />
          </li>
        ))}
      </ul>

      <Subtitulo icone={ServerIcon} className="mt-16">
        Antes do QA
      </Subtitulo>
      <Cartao className="mt-6 p-5 sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h4 className="text-lg font-semibold tracking-tight">{EXPERIENCIA_ANTERIOR.titulo}</h4>
          <Periodo>{EXPERIENCIA_ANTERIOR.periodo}</Periodo>
        </div>
        <ul className="mt-4 grid gap-2 text-sm text-white/80 md:grid-cols-3">
          {EXPERIENCIA_ANTERIOR.cargos.map((cargo) => (
            <li key={cargo} className="flex gap-3">
              <span aria-hidden className="mt-[0.6em] size-1 shrink-0 rounded-full bg-emerald-400" />
              {cargo}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-white/70">{EXPERIENCIA_ANTERIOR.descricao}</p>
        <div className="mt-5">
          <Tecnologias itens={EXPERIENCIA_ANTERIOR.tecnologias} />
        </div>
      </Cartao>
    </Secao>
  )
}
