import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  EllipsisVerticalIcon,
  HistoryIcon,
  MinusIcon,
  PencilIcon,
  PlusIcon,
  TargetIcon,
  Trash2Icon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTema } from '@/hooks/useTema'
import { preverCaixinha } from '@/lib/economia'
import { competenciaMedia, formatarData, formatarMoeda, formatarPercentual } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CaixinhaComSaldo } from '@/types'

interface Props {
  caixinha: CaixinhaComSaldo
  /** guardado − retirado no mês selecionado */
  noMes: number
  rotuloMes: string
  onGuardar: () => void
  onRetirar: () => void
  onExtrato: () => void
  onEditar: () => void
  onArquivar: () => void
  onExcluir: () => void
}

export function CardCaixinha({
  caixinha: c,
  noMes,
  rotuloMes,
  onGuardar,
  onRetirar,
  onExtrato,
  onEditar,
  onArquivar,
  onExcluir,
}: Props) {
  const { cor } = useTema()
  const corCaixinha = cor(c.cor)
  const p = preverCaixinha(c)

  return (
    <Card className={cn('gap-0 overflow-hidden py-0', c.arquivada && 'opacity-70')}>
      <div className="h-1.5" style={{ backgroundColor: corCaixinha }} />
      <div className="flex items-start justify-between gap-2 pt-3 pr-2 pl-4">
        <h3 className="flex min-w-0 items-center gap-2 font-semibold">
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: corCaixinha }} aria-hidden />
          <span className="truncate">{c.nome}</span>
        </h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${c.nome}`}>
              <EllipsisVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onExtrato}>
              <HistoryIcon />
              Ver extrato
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onEditar}>
              <PencilIcon />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onArquivar}>
              {c.arquivada ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
              {c.arquivada ? 'Desarquivar' : 'Arquivar'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onExcluir}>
              <Trash2Icon />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-2 px-4 pt-1">
        <div>
          <div className="text-muted-foreground text-xs">Saldo guardado</div>
          <div className="text-2xl font-semibold tracking-tight">{formatarMoeda(c.saldo)}</div>
        </div>

        {c.meta !== null && (
          <div className="grid gap-1.5">
            <div
              className="bg-muted h-2 overflow-hidden rounded-full"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round((p.fracao ?? 0) * 100)}
              aria-label={`Progresso de ${c.nome}`}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(p.fracao ?? 0) * 100}%`, backgroundColor: corCaixinha }}
              />
            </div>
            <div className="text-muted-foreground flex flex-wrap justify-between gap-x-2 text-xs">
              <span className="flex items-center gap-1">
                <TargetIcon className="size-3.5" />
                {formatarPercentual(p.fracao ?? 0)} de {formatarMoeda(c.meta)}
              </span>
              {p.atingida ? (
                <span className="font-medium text-emerald-700 dark:text-emerald-400">Meta atingida! 🎉</span>
              ) : (
                <span>
                  faltam <span className="text-foreground font-medium tabular-nums">{formatarMoeda(p.falta ?? 0)}</span>
                </span>
              )}
            </div>
          </div>
        )}

        <ul className="text-muted-foreground grid gap-0.5 text-xs">
          {p.porMesParaAlvo !== null && c.data_alvo && (
            <li>
              Para chegar até {formatarData(c.data_alvo)}: guarde{' '}
              <span className="text-foreground font-medium">{formatarMoeda(p.porMesParaAlvo)}/mês</span>
            </li>
          )}
          {p.prazoPassou && <li className="text-red-700 dark:text-red-400">A data alvo já passou.</li>}
          {p.chegaEm && c.aporte_mensal && (
            <li>
              Guardando {formatarMoeda(c.aporte_mensal)}/mês, chega lá em{' '}
              <span className="text-foreground font-medium">{competenciaMedia(p.chegaEm)}</span>
            </li>
          )}
          {!c.meta && c.aporte_mensal && <li>Plano: guardar {formatarMoeda(c.aporte_mensal)}/mês</li>}
          <li>
            Em {rotuloMes}:{' '}
            <span
              className={cn(
                'font-medium tabular-nums',
                noMes > 0 && 'text-emerald-700 dark:text-emerald-400',
                noMes < 0 && 'text-red-700 dark:text-red-400',
              )}
            >
              {noMes > 0 ? '+' : noMes < 0 ? '−' : ''}
              {formatarMoeda(Math.abs(noMes))}
            </span>
            {c.aporte_mensal && noMes < c.aporte_mensal && noMes >= 0 && (
              <> (faltam {formatarMoeda(c.aporte_mensal - noMes)} do plano)</>
            )}
          </li>
        </ul>
      </div>

      <div className="mt-auto flex gap-2 p-4 pt-3">
        <Button className="flex-1" onClick={onGuardar} disabled={c.arquivada}>
          <PlusIcon />
          Guardar
        </Button>
        <Button variant="outline" className="flex-1" onClick={onRetirar} disabled={c.saldo <= 0}>
          <MinusIcon />
          Retirar
        </Button>
      </div>
    </Card>
  )
}
