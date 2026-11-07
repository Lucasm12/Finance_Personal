import { BriefcaseBusinessIcon, MapPinIcon, PresentationIcon, ServerIcon } from 'lucide-react'

import {
  CabecalhoSecao,
  Cartao,
  Chip,
  Destaque,
  LINHA_DO_TEMPO,
  Marcador,
  Revelar,
  Secao,
  Subtitulo,
} from '@/components/portfolio/Comum'
import {
  DOCENCIA,
  EXPERIENCIA_ANTERIOR,
  EXPERIENCIAS_QA,
  type Docencia,
  type Experiencia as TipoExperiencia,
} from '@/lib/portfolio'
import { cn } from '@/lib/utils'

function Periodo({ children }: { children: string }) {
  return <span className="pf-mono text-xs whitespace-nowrap text-white/55">{children}</span>
}

function CartaoExperiencia({ exp }: { exp: TipoExperiencia }) {
  return (
    <Cartao className="p-6 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h4 className="text-lg font-semibold tracking-tight sm:text-xl">{exp.cargo}</h4>
          <p className="mt-1 text-white/70">
            <span className="font-medium text-emerald-300">{exp.empresa}</span>
            {exp.setor && <span className="text-white/55"> · {exp.setor}</span>}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/50">
            <MapPinIcon className="size-3.5 shrink-0" />
            {exp.local}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5 sm:flex-col sm:items-end">
          {exp.atual && <Chip atual>atual</Chip>}
          <Periodo>{exp.periodo}</Periodo>
        </div>
      </div>

      <ul className="mt-6 space-y-2.5 text-[15px] leading-relaxed text-white/70">
        {exp.atividades.map((atividade) => (
          <li key={atividade} className="flex gap-3">
            <span aria-hidden className="mt-[0.65em] size-1 shrink-0 rounded-full bg-emerald-400/80" />
            <span className="text-pretty">{atividade}</span>
          </li>
        ))}
      </ul>

      {exp.resultados && (
        <dl className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {exp.resultados.map((r) => (
            <div
              key={r.rotulo}
              className="flex flex-col-reverse justify-end gap-1 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] px-3.5 py-3"
            >
              <dt className="text-xs leading-snug text-white/55">{r.rotulo}</dt>
              <dd className="pf-mono text-lg font-medium text-emerald-300">{r.valor}</dd>
            </div>
          ))}
        </dl>
      )}

      <ul aria-label="Tecnologias" className="mt-6 flex flex-wrap gap-1.5">
        {exp.tecnologias.map((t) => (
          <li key={t}>
            <Chip>{t}</Chip>
          </li>
        ))}
      </ul>
    </Cartao>
  )
}

function CartaoDocencia({ d }: { d: Docencia }) {
  return (
    <Cartao className="h-full p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h4 className="font-semibold tracking-tight">{d.cargo}</h4>
          <p className="mt-1 text-sm font-medium text-emerald-300">{d.instituicao}</p>
          <p className="mt-1 text-sm text-white/50">{d.contexto}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Periodo>{d.periodo}</Periodo>
          {d.atual && <Chip atual>atual</Chip>}
        </div>
      </div>
      {d.descricao && <p className="mt-4 text-sm leading-relaxed text-white/65">{d.descricao}</p>}
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
        numero="02"
        rotulo="experiência"
        titulo={
          <>
            Trajetória em <Destaque>sistemas críticos</Destaque>
          </>
        }
        descricao="Saúde e meios de pagamento, onde uma falha em produção custa caro. Testes manuais e automatizados de aplicações web, mobile e APIs."
      />

      <Subtitulo icone={BriefcaseBusinessIcon} className="mt-16">
        Qualidade de software
      </Subtitulo>
      <ol className={cn(LINHA_DO_TEMPO, 'mt-6 space-y-5 sm:space-y-6')}>
        {EXPERIENCIAS_QA.map((exp) => (
          <li key={exp.empresa + exp.periodo} className="relative pl-8 sm:pl-12">
            <Marcador atual={exp.atual} />
            <Revelar>
              <CartaoExperiencia exp={exp} />
            </Revelar>
          </li>
        ))}
      </ol>

      <Subtitulo icone={PresentationIcon} className="mt-20">
        Docência
      </Subtitulo>
      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {DOCENCIA.map((d, i) => (
          <li key={d.instituicao + d.periodo}>
            <Revelar atraso={(i % 2) * 100} className="h-full">
              <CartaoDocencia d={d} />
            </Revelar>
          </li>
        ))}
      </ul>

      <Subtitulo icone={ServerIcon} className="mt-20">
        Antes do QA
      </Subtitulo>
      <Revelar className="mt-6">
        <Cartao className="p-6 sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <h4 className="text-lg font-semibold tracking-tight">{EXPERIENCIA_ANTERIOR.titulo}</h4>
            <Periodo>{EXPERIENCIA_ANTERIOR.periodo}</Periodo>
          </div>
          <ul className="mt-4 grid gap-2 text-sm text-white/70 md:grid-cols-3">
            {EXPERIENCIA_ANTERIOR.cargos.map((cargo) => (
              <li key={cargo} className="flex gap-3">
                <span aria-hidden className="mt-[0.6em] size-1 shrink-0 rounded-full bg-emerald-400/80" />
                {cargo}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-white/60">{EXPERIENCIA_ANTERIOR.descricao}</p>
          <ul aria-label="Tecnologias" className="mt-5 flex flex-wrap gap-1.5">
            {EXPERIENCIA_ANTERIOR.tecnologias.map((t) => (
              <li key={t}>
                <Chip>{t}</Chip>
              </li>
            ))}
          </ul>
        </Cartao>
      </Revelar>
    </Secao>
  )
}
