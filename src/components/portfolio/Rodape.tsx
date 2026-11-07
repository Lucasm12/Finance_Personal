import { Link } from 'react-router-dom'
import { ArrowUpIcon, LockKeyholeIcon } from 'lucide-react'

import { LogoAnimado } from '@/components/login/LogoAnimado'
import { FOCO } from '@/components/portfolio/Comum'
import { PERFIL } from '@/lib/portfolio'
import { cn } from '@/lib/utils'
import { ROTA_LOGIN } from '@/modulos'

const LINK = cn('flex items-center gap-1.5 rounded-md px-2 py-1.5 text-white/70 transition-colors hover:text-white', FOCO)

export function Rodape() {
  return (
    <footer className="relative z-10 border-t border-white/[0.08]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <LogoAnimado className="size-8" />
          <div>
            <p className="text-sm font-medium">{PERFIL.nome}</p>
            <p className="pf-mono text-xs text-white/70">
              {PERFIL.cargo} · {PERFIL.local}
            </p>
          </div>
        </div>

        <p className="pf-mono text-xs text-white/65">
          © {new Date().getFullYear()} {PERFIL.nome}
        </p>

        <nav aria-label="Rodapé" className="pf-mono -ml-2 flex items-center gap-1 text-xs md:ml-0">
          <a href="#inicio" className={LINK}>
            <ArrowUpIcon aria-hidden className="size-3.5" />
            topo
          </a>
          {/* Acesso ao sistema pessoal (uso administrativo): discreto, só no rodapé. */}
          <Link to={ROTA_LOGIN} className={LINK} title="Login do sistema pessoal">
            <LockKeyholeIcon aria-hidden className="size-3.5" />
            área restrita
          </Link>
        </nav>
      </div>
    </footer>
  )
}
