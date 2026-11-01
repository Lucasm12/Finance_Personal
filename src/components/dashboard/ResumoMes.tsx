import { CircleCheckIcon, ClockIcon, WalletIcon } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatarMoeda, formatarPercentual } from '@/lib/format'

interface Props {
  total: number
  pago: number
  pendente: number
  quantidade: number
  quantidadePaga: number
  filtrado: boolean
}

function Bloco({
  rotulo,
  valor,
  icone: Icone,
  classeIcone,
  detalhe,
}: {
  rotulo: string
  valor: string
  icone: typeof WalletIcon
  classeIcone: string
  detalhe?: string
}) {
  return (
    <Card className="gap-1 px-4 py-4 sm:px-5">
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Icone className={`size-4 ${classeIcone}`} />
        {rotulo}
      </div>
      <div className="text-xl font-semibold tracking-tight sm:text-2xl">{valor}</div>
      {detalhe && <div className="text-muted-foreground text-xs">{detalhe}</div>}
    </Card>
  )
}

export function ResumoMes({ total, pago, pendente, quantidade, quantidadePaga, filtrado }: Props) {
  const fracao = total > 0 ? pago / total : 0

  return (
    <section aria-label="Resumo do mês" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Bloco
        rotulo={filtrado ? 'Total (filtrado)' : 'Total do mês'}
        valor={formatarMoeda(total)}
        icone={WalletIcon}
        classeIcone="text-primary"
        detalhe={`${quantidade} conta${quantidade === 1 ? '' : 's'}`}
      />
      <Bloco
        rotulo="Total pago"
        valor={formatarMoeda(pago)}
        icone={CircleCheckIcon}
        classeIcone="text-emerald-600 dark:text-emerald-400"
        detalhe={`${quantidadePaga} paga${quantidadePaga === 1 ? '' : 's'}`}
      />
      <Bloco
        rotulo="Total pendente"
        valor={formatarMoeda(pendente)}
        icone={ClockIcon}
        classeIcone="text-amber-600 dark:text-amber-400"
        detalhe={`${quantidade - quantidadePaga} em aberto`}
      />
      <Card className="gap-2 px-4 py-4 sm:px-5">
        <div className="text-muted-foreground text-sm">Pago do mês</div>
        <div className="text-xl font-semibold tracking-tight sm:text-2xl">{formatarPercentual(fracao)}</div>
        <Progress value={fracao * 100} aria-label="Percentual pago" />
      </Card>
    </section>
  )
}
