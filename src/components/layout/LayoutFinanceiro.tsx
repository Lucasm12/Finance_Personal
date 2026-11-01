import { useState } from 'react'
import {
  BellIcon,
  CalendarCheckIcon,
  ChartColumnIcon,
  PiggyBankIcon,
  ReceiptTextIcon,
  SparklesIcon,
  TagsIcon,
} from 'lucide-react'

import { DialogImportarExemplo } from '@/components/DialogImportarExemplo'
import { DialogLembretes } from '@/components/DialogLembretes'
import { LayoutModulo, type LinkModulo } from '@/components/layout/LayoutModulo'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { MODULO_FINANCEIRO, ROTAS_FINANCEIRO } from '@/modulos'

const LINKS: LinkModulo[] = [
  { para: ROTAS_FINANCEIRO.mes, rotulo: 'Mês', icone: CalendarCheckIcon, exato: true, mantemMes: true },
  { para: ROTAS_FINANCEIRO.economia, rotulo: 'Economia', icone: PiggyBankIcon, mantemMes: true },
  { para: ROTAS_FINANCEIRO.contas, rotulo: 'Contas', icone: ReceiptTextIcon },
  { para: ROTAS_FINANCEIRO.categorias, rotulo: 'Categorias', icone: TagsIcon },
  { para: ROTAS_FINANCEIRO.historico, rotulo: 'Histórico', icone: ChartColumnIcon, mantemMes: true },
]

export function LayoutFinanceiro() {
  const [importando, setImportando] = useState(false)
  const [lembretes, setLembretes] = useState(false)

  return (
    <LayoutModulo
      modulo={MODULO_FINANCEIRO}
      links={LINKS}
      itensMenu={
        <>
          <DropdownMenuItem onSelect={() => setLembretes(true)}>
            <BellIcon />
            Lembretes por e-mail
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setImportando(true)}>
            <SparklesIcon />
            Importar dados de exemplo
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      }
      extras={
        <>
          <DialogImportarExemplo aberto={importando} onAbertoChange={setImportando} />
          <DialogLembretes aberto={lembretes} onAbertoChange={setLembretes} />
        </>
      }
    />
  )
}
