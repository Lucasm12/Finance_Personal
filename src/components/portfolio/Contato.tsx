import { ArrowUpRightIcon, DownloadIcon, MailIcon, MapPinIcon, PhoneIcon } from 'lucide-react'

import { moverLuzCartao } from '@/components/login/FundoTecnologico'
import {
  CabecalhoSecao,
  Destaque,
  FOCO,
  IconeGitHub,
  IconeInstagram,
  IconeLinkedIn,
  IconeQuadro,
  IconeWhatsApp,
  Secao,
} from '@/components/portfolio/Comum'
import { linkTelefone, linkWhatsApp, PERFIL } from '@/lib/portfolio'
import { cn } from '@/lib/utils'

const REDES = [
  { id: 'linkedin', rotulo: 'LinkedIn', valor: PERFIL.linkedinRotulo, href: PERFIL.linkedin, icone: IconeLinkedIn },
  { id: 'github', rotulo: 'GitHub', valor: PERFIL.githubRotulo, href: PERFIL.github, icone: IconeGitHub },
  { id: 'instagram', rotulo: 'Instagram', valor: PERFIL.instagramRotulo, href: PERFIL.instagram, icone: IconeInstagram },
  { id: 'whatsapp', rotulo: 'WhatsApp', valor: PERFIL.telefone, href: linkWhatsApp(PERFIL.telefone), icone: IconeWhatsApp },
]

/** Fechamento da página: e-mail em destaque, redes em cartões e telefone/cidade discretos. */
export function Contato() {
  return (
    <Secao id="contato" rotuloId="titulo-contato" className="pb-28 sm:pb-36">
      <div
        aria-hidden
        className="pf-aurora pointer-events-none absolute top-20 left-1/2 h-[380px] w-[min(900px,140vw)] -translate-x-1/2"
      />

      <div className="relative">
        <CabecalhoSecao
          id="titulo-contato"
          numero="06"
          rotulo="contato"
          centralizado
          titulo={
            <>
              Vamos conversar sobre <Destaque>qualidade</Destaque>?
            </>
          }
          descricao="QA, automação de testes, ensino ou pesquisa: escolha o canal que preferir."
        />

        <div className="mt-10 flex flex-col items-center text-center sm:mt-12">
          <p className="pf-mono flex items-center gap-2 text-xs tracking-[0.18em] text-white/70 uppercase">
            <MailIcon aria-hidden className="size-3.5" />
            e-mail
          </p>
          <a
            href={`mailto:${PERFIL.email}`}
            className={cn(
              'group mt-3 inline-flex max-w-full items-center gap-2 rounded-lg text-[clamp(1.15rem,4.4vw,2.5rem)] font-semibold tracking-[-0.03em] text-white sm:gap-3',
              FOCO,
            )}
          >
            <span className="relative min-w-0 [overflow-wrap:anywhere]">
              {PERFIL.email}
              <span aria-hidden className="absolute inset-x-0 -bottom-1.5 h-px bg-white/25" />
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-1.5 h-px origin-left scale-x-0 bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-300 transition-transform duration-300 group-hover:scale-x-100 group-focus-visible:scale-x-100"
              />
            </span>
            <ArrowUpRightIcon
              aria-hidden
              className="size-[0.85em] shrink-0 text-emerald-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </a>
          {PERFIL.curriculo && (
            <a
              href={PERFIL.curriculo}
              download
              className={cn(
                'mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-white/90 transition-colors hover:border-emerald-400/50 hover:text-white',
                FOCO,
              )}
            >
              <DownloadIcon aria-hidden className="size-4 text-emerald-300" />
              Baixar currículo (PDF)
            </a>
          )}
        </div>

        <ul className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {REDES.map((rede) => (
            <li key={rede.id}>
              <a
                href={rede.href}
                target="_blank"
                rel="noopener noreferrer"
                onPointerMove={moverLuzCartao}
                className={cn(
                  'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0a0d10] p-4 transition-colors duration-200 hover:border-emerald-400/40 sm:p-5',
                  FOCO,
                )}
              >
                <span
                  aria-hidden
                  className="login-cartao-luz pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                />
                <span className="relative flex items-start justify-between">
                  <IconeQuadro icone={rede.icone} />
                  <ArrowUpRightIcon
                    aria-hidden
                    className="size-4 text-white/50 transition duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-emerald-300"
                  />
                </span>
                <span className="relative mt-5 font-medium text-white">{rede.rotulo}</span>
                <span className="pf-mono relative mt-1 text-xs [overflow-wrap:anywhere] text-white/70">{rede.valor}</span>
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/70">
          <span className="flex items-center gap-2">
            <MapPinIcon aria-hidden className="size-4" />
            {PERFIL.local} · Brasil
          </span>
          <a
            href={linkTelefone(PERFIL.telefone)}
            className={cn('flex items-center gap-2 rounded-md transition-colors hover:text-white', FOCO)}
          >
            <PhoneIcon aria-hidden className="size-4" />
            <span className="sr-only">Telefone: </span>
            {PERFIL.telefone}
          </a>
        </div>
      </div>
    </Secao>
  )
}
