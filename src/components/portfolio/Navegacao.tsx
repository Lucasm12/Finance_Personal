import { useEffect, useRef, useState } from 'react'
import { ArrowRightIcon, MenuIcon, XIcon } from 'lucide-react'

import { LogoAnimado } from '@/components/login/LogoAnimado'
import { FOCO, useSecaoAtiva } from '@/components/portfolio/Comum'
import { SECOES } from '@/lib/portfolio'
import { cn } from '@/lib/utils'

/**
 * Links das seções, na ordem da página (lista única em lib/portfolio: SECOES).
 * O acesso ao sistema (login) não fica aqui: é de uso pessoal e está no rodapé.
 */
export const LINKS_SECOES = SECOES

const IDS_OBSERVADOS = ['inicio', ...LINKS_SECOES.map((l) => l.id)]

/** Barra fixa: marca, links das seções e progresso da leitura. */
export function Navegacao() {
  const [rolou, setRolou] = useState(false)
  const [aberto, setAberto] = useState(false)
  const progressoRef = useRef<HTMLDivElement>(null)
  const ativa = useSecaoAtiva(IDS_OBSERVADOS)

  useEffect(() => {
    let quadro = 0
    function atualizar() {
      quadro = 0
      const y = window.scrollY
      const total = document.documentElement.scrollHeight - window.innerHeight
      setRolou(y > 16)
      progressoRef.current?.style.setProperty('--progresso', String(total > 0 ? Math.min(1, y / total) : 0))
    }
    function agendar() {
      if (!quadro) quadro = requestAnimationFrame(atualizar)
    }
    atualizar()
    window.addEventListener('scroll', agendar, { passive: true })
    window.addEventListener('resize', agendar)
    return () => {
      cancelAnimationFrame(quadro)
      window.removeEventListener('scroll', agendar)
      window.removeEventListener('resize', agendar)
    }
  }, [])

  // Menu do celular: Esc fecha; ao alargar a tela também.
  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    const largo = window.matchMedia('(min-width: 1024px)')
    const aoMudar = () => largo.matches && setAberto(false)
    window.addEventListener('keydown', aoTeclar)
    largo.addEventListener('change', aoMudar)
    return () => {
      window.removeEventListener('keydown', aoTeclar)
      largo.removeEventListener('change', aoMudar)
    }
  }, [aberto])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b transition-colors duration-200',
        rolou || aberto ? 'border-white/[0.08] bg-[#06080a]/90 backdrop-blur-md' : 'border-transparent bg-transparent',
      )}
    >
      <div
        ref={progressoRef}
        aria-hidden
        className="pf-progresso absolute inset-x-0 top-0 h-px bg-gradient-to-r from-emerald-500 via-emerald-300 to-teal-200"
      />

      <nav aria-label="Principal" className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <a
          href="#inicio"
          onClick={() => setAberto(false)}
          className={cn('-ml-1 flex items-center gap-2.5 rounded-lg p-1', FOCO)}
          aria-label="Lucas Marques, voltar ao início"
        >
          <LogoAnimado className="size-8" />
          <span className="pf-mono text-sm text-white/90">
            lucas<span className="text-emerald-400">.</span>marques
          </span>
        </a>

        <ul className="ml-auto hidden items-center gap-0.5 lg:flex">
          {LINKS_SECOES.map((link) => {
            const atual = ativa === link.id
            return (
              <li key={link.id}>
                <a
                  href={`#${link.id}`}
                  aria-current={atual ? 'location' : undefined}
                  className={cn(
                    'relative isolate rounded-full px-3 py-1.5 text-sm transition-colors',
                    atual ? 'text-white' : 'text-white/70 hover:text-white',
                    FOCO,
                  )}
                >
                  {atual && <span aria-hidden className="absolute inset-0 -z-10 rounded-full bg-white/[0.09]" />}
                  {link.rotulo}
                </a>
              </li>
            )
          })}
        </ul>

        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          aria-controls="menu-portfolio"
          aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
          className={cn(
            'ml-auto flex size-11 items-center justify-center rounded-full border border-white/15 text-white/85 transition-colors hover:bg-white/5 lg:hidden',
            FOCO,
          )}
        >
          {aberto ? <XIcon aria-hidden className="size-4" /> : <MenuIcon aria-hidden className="size-4" />}
        </button>
      </nav>

      <div id="menu-portfolio" hidden={!aberto} className="border-t border-white/[0.08] lg:hidden">
        <ul className="mx-auto grid max-w-6xl gap-1 px-4 py-3 sm:px-6">
          {LINKS_SECOES.map((link, i) => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                onClick={() => setAberto(false)}
                aria-current={ativa === link.id ? 'location' : undefined}
                className={cn(
                  'flex items-center justify-between rounded-xl px-3 py-3 text-base transition-colors hover:bg-white/5',
                  ativa === link.id ? 'text-white' : 'text-white/80',
                  FOCO,
                )}
              >
                <span className="flex items-center gap-4">
                  <span aria-hidden className="pf-mono text-xs text-emerald-300">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {link.rotulo}
                </span>
                <ArrowRightIcon aria-hidden className="size-4 text-white/40" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  )
}
