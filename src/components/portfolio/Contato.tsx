import { ArrowUpRightIcon, MailIcon, MapPinIcon, PhoneIcon } from 'lucide-react'

import { moverLuzCartao } from '@/components/login/FundoTecnologico'
import {
  CabecalhoSecao,
  Destaque,
  IconeGitHub,
  IconeInstagram,
  IconeLinkedIn,
  IconeQuadro,
  IconeWhatsApp,
  Revelar,
  Secao,
} from '@/components/portfolio/Comum'
import { linkTelefone, linkWhatsApp, PERFIL } from '@/lib/portfolio'

const REDES = [
  { id: 'linkedin', rotulo: 'LinkedIn', valor: PERFIL.linkedinRotulo, href: PERFIL.linkedin, icone: IconeLinkedIn },
  { id: 'github', rotulo: 'GitHub', valor: PERFIL.githubRotulo, href: PERFIL.github, icone: IconeGitHub },
  { id: 'instagram', rotulo: 'Instagram', valor: PERFIL.instagramRotulo, href: PERFIL.instagram, icone: IconeInstagram },
  { id: 'whatsapp', rotulo: 'WhatsApp', valor: PERFIL.telefone, href: linkWhatsApp(PERFIL.telefone), icone: IconeWhatsApp },
]

const FOCO = 'focus-visible:ring-2 focus-visible:ring-emerald-400/40 focus-visible:outline-none'

/** Fechamento da página: e-mail em destaque, redes em cartões e telefone/cidade discretos. */
export function Contato() {
  return (
    <Secao id="contato" rotuloId="titulo-contato" className="pb-32 sm:pb-40">
      <div
        aria-hidden
        className="pf-aurora pointer-events-none absolute top-24 left-1/2 h-[420px] w-[min(900px,140vw)] -translate-x-1/2 opacity-80"
      />

      <div className="relative">
        <CabecalhoSecao
          id="titulo-contato"
          numero="05"
          rotulo="contato"
          centralizado
          titulo={
            <>
              Vamos conversar sobre <Destaque>qualidade</Destaque>?
            </>
          }
          descricao="QA, automação de testes, ensino ou pesquisa: escolha o canal que preferir."
        />

        <Revelar atraso={120} className="mt-12 flex flex-col items-center text-center sm:mt-14">
          <p className="pf-mono flex items-center gap-2 text-xs tracking-[0.18em] text-white/50 uppercase">
            <MailIcon className="size-3.5" />
            e-mail
          </p>
          <a
            href={`mailto:${PERFIL.email}`}
            className={`group mt-3 inline-flex max-w-full items-center gap-2 rounded-lg text-[clamp(1.2rem,4.4vw,2.6rem)] font-semibold tracking-[-0.03em] text-white sm:gap-3 ${FOCO}`}
          >
            <span className="relative min-w-0 [overflow-wrap:anywhere]">
              {PERFIL.email}
              <span aria-hidden className="absolute inset-x-0 -bottom-1.5 h-px bg-white/15" />
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-1.5 h-px origin-left scale-x-0 bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-300 transition-transform duration-500 group-hover:scale-x-100 group-focus-visible:scale-x-100"
              />
            </span>
            <ArrowUpRightIcon className="size-[0.85em] shrink-0 text-emerald-300 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
          </a>
        </Revelar>

        <ul className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {REDES.map((rede, i) => (
            <li key={rede.id}>
              <Revelar atraso={200 + i * 80} className="h-full">
                <a
                  href={rede.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onPointerMove={moverLuzCartao}
                  className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0d10]/85 p-4 transition-colors duration-300 hover:border-emerald-400/30 sm:p-5 ${FOCO}`}
                >
                  <span
                    aria-hidden
                    className="login-cartao-luz pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  />
                  <span className="relative flex items-start justify-between">
                    <IconeQuadro icone={rede.icone} />
                    <ArrowUpRightIcon className="size-4 text-white/30 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-emerald-300" />
                  </span>
                  <span className="relative mt-6 font-medium text-white/90">{rede.rotulo}</span>
                  <span className="pf-mono relative mt-1 text-xs [overflow-wrap:anywhere] text-white/55">{rede.valor}</span>
                  <span className="sr-only">(abre em nova aba)</span>
                </a>
              </Revelar>
            </li>
          ))}
        </ul>

        <Revelar atraso={500}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/55">
            <span className="flex items-center gap-2">
              <MapPinIcon className="size-4" />
              {PERFIL.local} · Brasil
            </span>
            <a
              href={linkTelefone(PERFIL.telefone)}
              className={`flex items-center gap-2 rounded-md transition-colors hover:text-white ${FOCO}`}
            >
              <PhoneIcon className="size-4" />
              {PERFIL.telefone}
            </a>
          </div>
        </Revelar>
      </div>
    </Secao>
  )
}
