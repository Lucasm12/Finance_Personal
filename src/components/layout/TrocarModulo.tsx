import { useNavigate } from 'react-router-dom'
import { CheckIcon, ChevronsUpDownIcon, LayoutGridIcon } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MODULOS, ROTA_MODULOS, type Modulo } from '@/modulos'

/** Nome do módulo no cabeçalho; ao tocar, permite ir para outro módulo. */
export function TrocarModulo({ atual }: { atual: Modulo }) {
  const navigate = useNavigate()
  const Icone = atual.icone

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hover:bg-accent focus-visible:ring-ring/50 -ml-2 flex items-center gap-2 rounded-lg px-2 py-1.5 font-semibold outline-none focus-visible:ring-[3px]"
          aria-label={`Módulo ${atual.nome}. Trocar de módulo`}
        >
          <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
            <Icone className="size-4" />
          </span>
          {atual.nome}
          <ChevronsUpDownIcon className="text-muted-foreground size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">Trocar de módulo</DropdownMenuLabel>
        {MODULOS.map((m) => {
          const IconeModulo = m.icone
          return (
            <DropdownMenuItem key={m.id} onSelect={() => navigate(m.rota)} className="gap-3">
              <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
                <IconeModulo className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{m.nome}</span>
                <span className="text-muted-foreground block truncate text-xs">
                  {m.emConstrucao ? 'Em construção' : m.descricao}
                </span>
              </span>
              {m.id === atual.id && <CheckIcon className="text-primary size-4" />}
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate(ROTA_MODULOS)}>
          <LayoutGridIcon />
          Tela de módulos
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
