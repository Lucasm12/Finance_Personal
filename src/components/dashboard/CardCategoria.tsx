import { CircleCheckIcon, ClockIcon, TriangleAlertIcon } from 'lucide-react'

import { BotaoCopiar } from '@/components/BotaoCopiar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useTema } from '@/hooks/useTema'
import { formatarData, formatarMoeda, somar } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Categoria } from '@/types'
import type { LancamentoVisivel } from './tipos'

const plural = (n: number, palavra: string) => `${n} ${palavra}${n === 1 ? '' : 's'}`

function TextoSituacao({ l }: { l: LancamentoVisivel }) {
  const { tipo, dias } = l.situacao
  const dia = l.conta.dia_vencimento

  switch (tipo) {
    case 'pago':
      return (
        <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
          <CircleCheckIcon className="size-3.5" />
          {l.data_pagamento ? `Pago em ${formatarData(l.data_pagamento).slice(0, 5)}` : 'Pago'}
        </span>
      )
    case 'vencida':
      return (
        <span className="flex items-center gap-1 font-medium text-red-700 dark:text-red-400">
          <TriangleAlertIcon className="size-3.5" />
          {dia ? `Vencida há ${plural(dias, 'dia')}` : 'Vencida'}
        </span>
      )
    case 'hoje':
      return (
        <span className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
          <ClockIcon className="size-3.5" />
          Vence hoje
        </span>
      )
    case 'proxima':
      return (
        <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
          <ClockIcon className="size-3.5" />
          Vence em {plural(dias, 'dia')} (dia {dia})
        </span>
      )
    default:
      return dia ? <span>Vence dia {dia}</span> : null
  }
}

interface LinhaProps {
  l: LancamentoVisivel
  onAlternarPago: (l: LancamentoVisivel, pago: boolean) => void
  onEditar: (l: LancamentoVisivel) => void
}

function LinhaLancamento({ l, onAlternarPago, onEditar }: LinhaProps) {
  const vencida = l.situacao.tipo === 'vencida'
  const alerta = l.situacao.tipo === 'hoje'
  const valorAlterado = Math.abs(l.valor - l.conta.valor_padrao) >= 0.005

  return (
    <li
      className={cn(
        'flex items-center gap-3 border-l-[3px] border-transparent py-2.5 pr-2 pl-3.5 sm:pl-4',
        vencida && 'border-l-red-500 bg-red-50 dark:bg-red-500/10',
        alerta && 'border-l-amber-500 bg-amber-50 dark:bg-amber-500/10',
      )}
    >
      <Checkbox
        className="size-5"
        checked={l.pago}
        onCheckedChange={(v) => onAlternarPago(l, v === true)}
        aria-label={`${l.pago ? 'Desmarcar' : 'Marcar'} ${l.conta.nome} como paga`}
      />

      <button type="button" onClick={() => onEditar(l)} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-1.5">
          <span className={cn('truncate font-medium', l.pago && 'text-muted-foreground')}>{l.conta.nome}</span>
          {l.numero_parcela && (
            <Badge variant="outline" className="px-1.5 py-0 tabular-nums" title="Parcela atual / total">
              {l.numero_parcela}/{l.conta.total_parcelas ?? '?'}
            </Badge>
          )}
        </div>
        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          {l.conta.responsavel && <span className="text-foreground/70">{l.conta.responsavel}</span>}
          <TextoSituacao l={l} />
          {l.observacao && <span className="max-w-full truncate italic">“{l.observacao}”</span>}
        </div>
      </button>

      <button type="button" onClick={() => onEditar(l)} className="shrink-0 text-right" title="Editar valor deste mês">
        <div className={cn('font-medium tabular-nums', l.pago && 'text-muted-foreground')}>{formatarMoeda(l.valor)}</div>
        {valorAlterado && (
          <div className="text-muted-foreground text-[11px] tabular-nums">padrão {formatarMoeda(l.conta.valor_padrao)}</div>
        )}
      </button>

      <div className="flex w-8 shrink-0 justify-center">
        {l.conta.codigo_pagamento && <BotaoCopiar texto={l.conta.codigo_pagamento} />}
      </div>
    </li>
  )
}

interface Props {
  categoria: Categoria
  itens: LancamentoVisivel[]
  onAlternarPago: (l: LancamentoVisivel, pago: boolean) => void
  onEditar: (l: LancamentoVisivel) => void
}

export function CardCategoria({ categoria, itens, onAlternarPago, onEditar }: Props) {
  const { cor } = useTema()
  const total = somar(itens.map((l) => l.valor))
  const pagos = itens.filter((l) => l.pago)
  const pago = somar(pagos.map((l) => l.valor))
  const tudoPago = pagos.length === itens.length

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="h-1.5" style={{ backgroundColor: cor(categoria.cor) }} />
      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: cor(categoria.cor) }} aria-hidden />
          {categoria.nome}
        </h2>
        <span className="text-muted-foreground text-xs tabular-nums">
          {pagos.length}/{itens.length} pagas
        </span>
      </div>

      <ul className="divide-y border-y">
        {itens.map((l) => (
          <LinhaLancamento key={l.id} l={l} onAlternarPago={onAlternarPago} onEditar={onEditar} />
        ))}
      </ul>

      <div className="bg-muted/40 mt-auto flex items-end justify-between gap-2 px-4 py-3">
        <div className="text-muted-foreground text-xs">
          {tudoPago ? (
            <span className="font-medium text-emerald-700 dark:text-emerald-400">Tudo pago</span>
          ) : (
            <>
              Falta <span className="text-foreground font-medium tabular-nums">{formatarMoeda(somar([total, -pago]))}</span>
            </>
          )}
        </div>
        <div className="text-right">
          <div className="text-muted-foreground text-xs">Total {categoria.nome}</div>
          <div className="text-lg font-bold tabular-nums">{formatarMoeda(total)}</div>
        </div>
      </div>
    </Card>
  )
}
