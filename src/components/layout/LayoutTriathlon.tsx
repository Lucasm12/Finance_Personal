import { useNavigate } from 'react-router-dom'
import { CalendarDaysIcon, ChartLineIcon, FlagIcon, LayoutDashboardIcon, ListIcon, ScaleIcon, UserCogIcon, UtensilsIcon } from 'lucide-react'

import { LayoutModulo, type LinkModulo } from '@/components/layout/LayoutModulo'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { MODULO_TRIATHLON, ROTAS_TRIATHLON } from '@/modulos'

const LINKS: LinkModulo[] = [
  { para: ROTAS_TRIATHLON.painel, rotulo: 'Painel', icone: LayoutDashboardIcon, exato: true },
  { para: ROTAS_TRIATHLON.treinos, rotulo: 'Treinos', icone: ListIcon, mantemMes: true },
  { para: ROTAS_TRIATHLON.agenda, rotulo: 'Agenda', icone: CalendarDaysIcon },
  { para: ROTAS_TRIATHLON.evolucao, rotulo: 'Evolução', icone: ChartLineIcon },
  { para: ROTAS_TRIATHLON.corpo, rotulo: 'Corpo', icone: ScaleIcon },
  { para: ROTAS_TRIATHLON.nutricao, rotulo: 'Nutrição', icone: UtensilsIcon },
  { para: ROTAS_TRIATHLON.provas, rotulo: 'Provas', icone: FlagIcon },
]

export function LayoutTriathlon() {
  const navigate = useNavigate()
  return (
    <LayoutModulo
      modulo={MODULO_TRIATHLON}
      links={LINKS}
      itensMenu={
        <>
          <DropdownMenuItem onSelect={() => navigate(ROTAS_TRIATHLON.perfil)}>
            <UserCogIcon />
            Perfil do atleta
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      }
    />
  )
}
