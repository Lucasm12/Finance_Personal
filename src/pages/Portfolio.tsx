import { useEffect, useRef, useState } from 'react'

// Fontes empacotadas e servidas pelo próprio site (a CSP só permite font-src 'self').
import '@fontsource-variable/geist/index.css'
import '@fontsource-variable/geist-mono/index.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@/components/portfolio/portfolio.css'

import { FundoAnimado } from '@/components/login/FundoAnimado'
import { Casos } from '@/components/portfolio/Casos'
import { Contato } from '@/components/portfolio/Contato'
import { Experiencia } from '@/components/portfolio/Experiencia'
import { Formacao } from '@/components/portfolio/Formacao'
import { Habilidades } from '@/components/portfolio/Habilidades'
import { Hero } from '@/components/portfolio/Hero'
import { Navegacao } from '@/components/portfolio/Navegacao'
import { Rodape } from '@/components/portfolio/Rodape'
import { Sobre } from '@/components/portfolio/Sobre'
import { dadosEstruturados } from '@/lib/portfolio'

const COR_FUNDO = '#06080a'

/**
 * Ajustes da página enquanto o portfólio está aberto: fundo escuro no <html> (sem faixa clara ao
 * "puxar" a tela no celular), cor da barra do navegador e dados estruturados para buscadores.
 * Tudo é desfeito ao sair, para não interferir no sistema.
 */
function useAjustesDaPagina() {
  useEffect(() => {
    const html = document.documentElement
    html.classList.add('portfolio')

    const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')]
    const coresOriginais = metas.map((m) => m.content)
    metas.forEach((m) => (m.content = COR_FUNDO))

    // JSON-LD não é executado pelo navegador, então a CSP (script-src 'self') não o bloqueia.
    const ld = document.createElement('script')
    ld.type = 'application/ld+json'
    ld.textContent = JSON.stringify(dadosEstruturados())
    document.head.appendChild(ld)

    // Endereço com âncora (ex.: /#contato): rola até a seção depois de montada.
    const ancora = window.location.hash.slice(1)
    const quadro = ancora ? requestAnimationFrame(() => document.getElementById(ancora)?.scrollIntoView()) : 0

    return () => {
      cancelAnimationFrame(quadro)
      html.classList.remove('portfolio')
      metas.forEach((m, i) => (m.content = coresOriginais[i] ?? m.content))
      ld.remove()
    }
  }, [])
}

/**
 * Fundo do topo: a mesma grade e rede de pontos do login, discretas e só enquanto o topo está na tela
 * (somem ao rolar, para não disputar atenção com o conteúdo, e param de ser desenhadas).
 */
function FundoPortfolio() {
  const camadaRef = useRef<HTMLDivElement>(null)
  const [noTopo, setNoTopo] = useState(true)

  useEffect(() => {
    let quadro = 0
    function atualizar() {
      quadro = 0
      const progresso = Math.min(1, window.scrollY / (window.innerHeight * 0.8))
      camadaRef.current?.style.setProperty('opacity', String(0.6 * (1 - progresso)))
    }
    function agendar() {
      if (!quadro) quadro = requestAnimationFrame(atualizar)
    }
    atualizar()
    window.addEventListener('scroll', agendar, { passive: true })

    const topo = document.getElementById('inicio')
    const observador =
      topo && typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(([entrada]) => setNoTopo(Boolean(entrada?.isIntersecting)))
        : null
    if (topo && observador) observador.observe(topo)

    return () => {
      cancelAnimationFrame(quadro)
      window.removeEventListener('scroll', agendar)
      observador?.disconnect()
    }
  }, [])

  return (
    // h-lvh: altura fixa mesmo quando a barra do navegador do celular aparece/some ao rolar
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-lvh">
      <div ref={camadaRef} className="absolute inset-0">
        <div className="login-grade absolute inset-0" />
        {noTopo && <FundoAnimado />}
      </div>
    </div>
  )
}

/** Página inicial pública: portfólio profissional. O acesso ao sistema (login) fica no rodapé. */
export default function Portfolio() {
  useAjustesDaPagina()

  return (
    <div className="pf dark relative isolate min-h-dvh overflow-x-clip bg-[#06080a] text-white antialiased">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-emerald-400 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-emerald-950"
      >
        Pular para o conteúdo
      </a>

      <FundoPortfolio />
      <Navegacao />

      <main id="conteudo" tabIndex={-1} className="relative z-10 outline-none">
        <Hero />
        <Sobre />
        <Experiencia />
        <Casos />
        <Habilidades />
        <Formacao />
        <Contato />
      </main>

      <Rodape />
    </div>
  )
}
