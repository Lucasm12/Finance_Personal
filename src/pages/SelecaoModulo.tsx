import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRightIcon, LogOutIcon } from 'lucide-react'

import { FundoTecnologico, moverLuzCartao } from '@/components/login/FundoTecnologico'
import { LogoAnimado } from '@/components/login/LogoAnimado'
import { useAuth } from '@/hooks/useAuth'
import { saudacao } from '@/lib/texto'
import { cn } from '@/lib/utils'
import { MODULOS, ultimoModulo, type Modulo } from '@/modulos'

function Etiqueta({ children, destaque }: { children: string; destaque?: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase',
        destaque ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-white/10 text-white/45',
      )}
    >
      {children}
    </span>
  )
}

function CartaoModulo({
  modulo,
  atalho,
  ultimo,
  atraso,
  onEntrar,
}: {
  modulo: Modulo
  atalho: number
  ultimo: boolean
  atraso: number
  onEntrar: () => void
}) {
  const Icone = modulo.icone
  return (
    <button
      type="button"
      onClick={onEntrar}
      onPointerMove={moverLuzCartao}
      style={{ animationDelay: `${atraso}ms`, animationDuration: '700ms', animationFillMode: 'both' }}
      className={cn(
        'group animate-in fade-in slide-in-from-bottom-4 relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/70 p-6 text-left shadow-2xl shadow-black/50 backdrop-blur-xl',
        'transition-[translate,border-color] duration-300 hover:border-emerald-400/40 motion-safe:hover:-translate-y-1',
        'outline-none focus-visible:border-emerald-400/60 focus-visible:ring-4 focus-visible:ring-emerald-400/20',
      )}
    >
      <div
        aria-hidden
        className="login-cartao-luz pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div
        aria-hidden
        className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
      />

      <div className="relative flex items-start justify-between gap-3">
        <span className="flex size-12 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300 transition-transform duration-300 group-hover:scale-110">
          <Icone className="size-6" />
        </span>
        <div className="flex flex-wrap justify-end gap-1.5">
          {ultimo && <Etiqueta destaque>último acesso</Etiqueta>}
          {modulo.emConstrucao && <Etiqueta>em construção</Etiqueta>}
        </div>
      </div>

      <h2 className="relative mt-5 text-xl font-semibold tracking-tight">{modulo.nome}</h2>
      <p className="relative mt-1 text-sm text-white/50">{modulo.descricao}</p>

      <div className="relative mt-6 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-emerald-300">
          Entrar
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
        </span>
        <kbd className="hidden rounded border border-white/10 px-1.5 font-mono text-[11px] text-white/35 sm:inline">
          {atalho}
        </kbd>
      </div>
    </button>
  )
}

/** Primeira tela depois do login: em qual módulo entrar. */
export default function SelecaoModulo() {
  const { usuario, sair } = useAuth()
  const navigate = useNavigate()
  const [ultimo] = useState(ultimoModulo)

  // Atalhos: 1, 2... abrem o módulo correspondente
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const modulo = MODULOS[Number(e.key) - 1]
      if (modulo) navigate(modulo.rota)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [navigate])

  return (
    <FundoTecnologico>
      <main className="relative z-10 w-full max-w-3xl">
        <div className="animate-in fade-in slide-in-from-bottom-4 mb-8 flex flex-col items-center text-center duration-700">
          <LogoAnimado />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">{saudacao(new Date().getHours())}</h1>
          <p className="mt-2 text-white/50">Em qual módulo você quer entrar?</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {MODULOS.map((m, i) => (
            <CartaoModulo
              key={m.id}
              modulo={m}
              atalho={i + 1}
              ultimo={m.id === ultimo}
              atraso={150 + i * 120}
              onEntrar={() => navigate(m.rota)}
            />
          ))}
        </div>

        <div className="mt-8 flex items-center justify-center gap-3 font-mono text-xs text-white/40">
          <span className="truncate">{usuario?.email}</span>
          <span aria-hidden>·</span>
          <button
            type="button"
            onClick={() => sair()}
            className="flex items-center gap-1 transition-colors hover:text-white"
          >
            <LogOutIcon className="size-3.5" />
            sair
          </button>
        </div>
      </main>
    </FundoTecnologico>
  )
}
