import { BanknoteIcon, PiggyBankIcon, ReceiptTextIcon, TriangleAlertIcon, WalletIcon } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { useTema } from '@/hooks/useTema'
import { PALETA } from '@/lib/cores'
import { formatarMoeda, formatarPercentual, somar } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Props {
  renda: number
  rendaRecebida: number
  contas: number
  contasPagas: number
  guardado: number
  totalGuardado: number
}

function Bloco({
  rotulo,
  valor,
  icone: Icone,
  classeIcone,
  classeValor,
  detalhe,
}: {
  rotulo: string
  valor: string
  icone: typeof WalletIcon
  classeIcone: string
  classeValor?: string
  detalhe: string
}) {
  return (
    <Card className="gap-1 px-4 py-4 sm:px-5">
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Icone className={cn('size-4', classeIcone)} />
        {rotulo}
      </div>
      <div className={cn('text-[clamp(1rem,5vw,1.25rem)] font-semibold tracking-tight whitespace-nowrap tabular-nums sm:text-2xl', classeValor)}>{valor}</div>
      <div className="text-muted-foreground text-xs">{detalhe}</div>
    </Card>
  )
}

export function BalancoMes({ renda, rendaRecebida, contas, contasPagas, guardado, totalGuardado }: Props) {
  const { cor } = useTema()
  const sobra = somar([renda, -contas, -guardado])
  const guardadoPositivo = Math.max(0, guardado)

  // Barra: como a renda se divide entre contas, o que foi guardado e a sobra
  const base = Math.max(renda, contas + guardadoPositivo)
  const partes = [
    { rotulo: 'Contas', valor: contas, cor: cor(PALETA[1].claro) },
    { rotulo: 'Guardado', valor: guardadoPositivo, cor: cor(PALETA[0].claro) },
    { rotulo: 'Sobra livre', valor: Math.max(0, sobra), cor: cor(PALETA[2].claro) },
  ]

  return (
    <section aria-label="Balanço do mês" className="grid gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Bloco
          rotulo="Renda do mês"
          valor={formatarMoeda(renda)}
          icone={BanknoteIcon}
          classeIcone="text-emerald-600 dark:text-emerald-400"
          detalhe={`${formatarMoeda(rendaRecebida)} recebido`}
        />
        <Bloco
          rotulo="Contas do mês"
          valor={formatarMoeda(contas)}
          icone={ReceiptTextIcon}
          classeIcone="text-orange-600 dark:text-orange-400"
          detalhe={`${formatarMoeda(contasPagas)} pago`}
        />
        <Bloco
          rotulo="Guardado no mês"
          valor={formatarMoeda(guardado)}
          icone={PiggyBankIcon}
          classeIcone="text-blue-600 dark:text-blue-400"
          detalhe={`Total nas caixinhas: ${formatarMoeda(totalGuardado)}`}
        />
        <Bloco
          rotulo="Sobra livre"
          valor={formatarMoeda(sobra)}
          icone={WalletIcon}
          classeIcone="text-primary"
          classeValor={sobra < 0 ? 'text-red-700 dark:text-red-400' : undefined}
          detalhe={renda > 0 ? `${formatarPercentual(sobra / renda)} da renda` : 'Cadastre suas rendas'}
        />
      </div>

      {base > 0 && (
        <Card className="gap-3 px-4 py-4 sm:px-5">
          <div className="text-sm font-medium">Para onde vai a renda</div>
          <div className="bg-card flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Divisão da renda">
            {partes
              .filter((p) => p.valor > 0)
              .map((p) => (
                <div
                  key={p.rotulo}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{ width: `${(p.valor / base) * 100}%`, backgroundColor: p.cor }}
                />
              ))}
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {partes.map((p) => (
              <li key={p.rotulo} className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: p.cor }} aria-hidden />
                <span className="text-muted-foreground">{p.rotulo}</span>
                <span className="font-medium tabular-nums">{formatarMoeda(p.valor)}</span>
                {renda > 0 && (
                  <span className="text-muted-foreground text-xs tabular-nums">({formatarPercentual(p.valor / renda)})</span>
                )}
              </li>
            ))}
          </ul>
          {sobra < 0 && (
            <p className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
              <TriangleAlertIcon className="size-4 shrink-0" />
              {renda === 0
                ? 'Nenhuma renda lançada neste mês.'
                : `Contas e economia passam a renda em ${formatarMoeda(-sobra)}.`}
            </p>
          )}
        </Card>
      )}
    </section>
  )
}
