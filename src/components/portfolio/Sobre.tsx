import {
  BriefcaseBusinessIcon,
  GraduationCapIcon,
  ListChecksIcon,
  MapPinIcon,
  PresentationIcon,
  ShieldCheckIcon,
  WorkflowIcon,
  type LucideIcon,
} from 'lucide-react'

import { CabecalhoSecao, Cartao, Destaque, IconeQuadro, Revelar, Secao } from '@/components/portfolio/Comum'
import { DOCENCIA, EXPERIENCIAS_QA, FORMACAO, PERFIL, SOBRE } from '@/lib/portfolio'

const ICONES_CARACTERISTICAS: Record<(typeof SOBRE.caracteristicas)[number]['id'], LucideIcon> = {
  requisito: ListChecksIcon,
  pipeline: WorkflowIcon,
  criticos: ShieldCheckIcon,
  academia: GraduationCapIcon,
}

/** O que está em andamento hoje, montado a partir dos dados do currículo. */
const AGORA = [
  ...EXPERIENCIAS_QA.filter((e) => e.atual).map((e) => ({
    icone: BriefcaseBusinessIcon,
    titulo: e.cargo,
    detalhe: [e.empresa, e.setor].filter(Boolean).join(' · '),
  })),
  ...DOCENCIA.filter((d) => d.atual).map((d) => ({ icone: PresentationIcon, titulo: d.cargo, detalhe: d.instituicao })),
  ...FORMACAO.filter((f) => f.emAndamento).map((f) => ({
    icone: GraduationCapIcon,
    titulo: `${f.nivel} em ${f.curso}`,
    detalhe: [f.instituicao, f.foco].filter(Boolean).join(' · '),
  })),
]

export function Sobre() {
  const [primeiro, ...demais] = SOBRE.paragrafos

  return (
    <Secao id="sobre" rotuloId="titulo-sobre">
      <div className="grid gap-12 lg:grid-cols-[1.25fr_1fr] lg:gap-16 [&>*]:min-w-0">
        <div>
          <CabecalhoSecao
            id="titulo-sobre"
            numero="01"
            rotulo="sobre mim"
            titulo={
              <>
                Do requisito à produção, <Destaque>qualidade</Destaque> em cada etapa.
              </>
            }
          />
          <Revelar atraso={100} className="mt-8 space-y-5">
            <p className="text-lg leading-relaxed text-pretty text-white/85 sm:text-xl">{primeiro}</p>
            {demais.map((p) => (
              <p key={p} className="leading-relaxed text-pretty text-white/60">
                {p}
              </p>
            ))}
          </Revelar>
        </div>

        <Revelar atraso={200} className="lg:pt-28">
          <Cartao destaque className="p-6 sm:p-7">
            <p className="pf-mono flex items-center gap-2.5 text-xs tracking-[0.18em] text-emerald-300 uppercase">
              <span aria-hidden className="relative flex size-2">
                <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-60 motion-safe:animate-ping" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              hoje
            </p>
            <ul className="mt-5 space-y-4">
              {AGORA.map((item) => (
                <li key={item.titulo + item.detalhe} className="flex items-start gap-3.5">
                  <IconeQuadro icone={item.icone} className="size-9" />
                  <div className="min-w-0">
                    <p className="leading-snug font-medium text-white/90">{item.titulo}</p>
                    <p className="mt-0.5 text-sm text-white/55">{item.detalhe}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="pf-mono mt-6 flex items-center gap-2 border-t border-white/[0.06] pt-4 text-xs text-white/55">
              <MapPinIcon className="size-3.5" />
              {PERFIL.local} · Brasil
            </p>
          </Cartao>
        </Revelar>
      </div>

      <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SOBRE.caracteristicas.map((c, i) => (
          <li key={c.id}>
            <Revelar atraso={i * 90} className="h-full">
              <Cartao className="h-full p-6">
                <IconeQuadro icone={ICONES_CARACTERISTICAS[c.id]} />
                <h3 className="mt-5 font-semibold tracking-tight">{c.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{c.texto}</p>
              </Cartao>
            </Revelar>
          </li>
        ))}
      </ul>
    </Secao>
  )
}
