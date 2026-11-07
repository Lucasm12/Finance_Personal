import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { CircleUserIcon, LayoutGridIcon, LogOutIcon, MonitorIcon, MoonIcon, ShieldCheckIcon, SunIcon, type LucideIcon } from 'lucide-react'

import { Carregando } from '@/components/Carregando'
import { DialogPrivacidade } from '@/components/DialogPrivacidade'
import { TrocarModulo } from '@/components/layout/TrocarModulo'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'
import { useTema, type Tema } from '@/hooks/useTema'
import { cn } from '@/lib/utils'
import { lembrarModulo, ROTA_MODULOS, type Modulo } from '@/modulos'

export interface LinkModulo {
  para: string
  rotulo: string
  icone: LucideIcon
  /** só fica ativo na rota exata (página inicial do módulo) */
  exato?: boolean
  /** mantém o ?mes= ao navegar */
  mantemMes?: boolean
}

const TEMAS: { valor: Tema; rotulo: string; icone: LucideIcon }[] = [
  { valor: 'claro', rotulo: 'Claro', icone: SunIcon },
  { valor: 'escuro', rotulo: 'Escuro', icone: MoonIcon },
  { valor: 'sistema', rotulo: 'Automático', icone: MonitorIcon },
]

interface Props {
  modulo: Modulo
  links?: LinkModulo[]
  /** itens extras no menu do usuário */
  itensMenu?: ReactNode
  /** diálogos do módulo */
  extras?: ReactNode
}

/** Estrutura comum dos módulos: cabeçalho (troca de módulo, navegação, tema, usuário) e navegação inferior no celular. */
export function LayoutModulo({ modulo, links = [], itensMenu, extras }: Props) {
  const { usuario, sair } = useAuth()
  const { tema, escuro, setTema } = useTema()
  const { search } = useLocation()
  const navigate = useNavigate()
  const navInferior = links.length > 1
  const [privacidade, setPrivacidade] = useState(false)

  useEffect(() => lembrarModulo(modulo.id), [modulo.id])

  const mes = new URLSearchParams(search).get('mes')
  const destino = (link: LinkModulo) => ({
    pathname: link.para,
    search: link.mantemMes && mes ? `?mes=${mes}` : '',
  })

  return (
    <div className="min-h-dvh">
      <header className="bg-background/85 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <TrocarModulo atual={modulo} />

          {/* Links no topo só a partir de lg: com 6-7 links (Pessoal, Triathlon) eles não cabiam entre 768 e ~960 px
              (tablet em pé, celular deitado) e a página inteira rolava para o lado. Abaixo disso fica a barra inferior.
              min-w-0 + overflow-x-auto: se um dia não couberem, rolam dentro do cabeçalho, sem empurrar a página. */}
          {links.length > 0 && (
            <nav className="ml-2 hidden min-w-0 items-center gap-1 overflow-x-auto lg:flex" aria-label={modulo.nome}>
              {links.map((link) => (
                <NavLink
                  key={link.para}
                  to={destino(link)}
                  end={link.exato}
                  className={({ isActive }) =>
                    cn(
                      'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
                    )
                  }
                >
                  <link.icone className="size-4" />
                  {link.rotulo}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Alterar tema">
                  {escuro ? <MoonIcon /> : <SunIcon />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {TEMAS.map((t) => (
                  <DropdownMenuItem key={t.valor} onSelect={() => setTema(t.valor)}>
                    <t.icone />
                    {t.rotulo}
                    {tema === t.valor && <span className="text-primary ml-auto text-xs">●</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu do usuário">
                  <CircleUserIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-muted-foreground truncate font-normal">
                  {usuario?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {itensMenu}
                <DropdownMenuItem onSelect={() => navigate(ROTA_MODULOS)}>
                  <LayoutGridIcon />
                  Trocar de módulo
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setPrivacidade(true)}>
                  <ShieldCheckIcon />
                  Meus dados e privacidade
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => sair()}>
                  <LogOutIcon />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <DialogPrivacidade aberto={privacidade} onFechar={() => setPrivacidade(false)} />

      <main
        className={cn(
          'mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6',
          navInferior ? 'pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-10' : 'pb-10',
        )}
      >
        <Suspense fallback={<Carregando />}>
          <Outlet />
        </Suspense>
      </main>

      {navInferior && (
        <nav
          aria-label={modulo.nome}
          className="bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        >
          <div className="grid" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
            {links.map((link) => (
              <NavLink
                key={link.para}
                to={destino(link)}
                end={link.exato}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )
                }
              >
                <link.icone className="size-5" />
                {link.rotulo}
              </NavLink>
            ))}
          </div>
        </nav>
      )}

      {extras}
    </div>
  )
}
