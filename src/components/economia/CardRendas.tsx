import {
  CalendarPlusIcon,
  CircleCheckIcon,
  EllipsisVerticalIcon,
  LoaderCircleIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  PowerOffIcon,
  Trash2Icon,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { competenciaMedia, formatarData, formatarMoeda, somar } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Competencia, Recebimento, Renda } from '@/types'

export const nomeRecebimento = (r: Recebimento) => r.renda?.nome ?? r.descricao ?? ''

function ordenar(a: Recebimento, b: Recebimento) {
  // fixas primeiro (por dia), avulsas no fim
  const da = a.renda ? (a.renda.dia_recebimento ?? 40) : 99
  const db = b.renda ? (b.renda.dia_recebimento ?? 40) : 99
  return da - db || nomeRecebimento(a).localeCompare(nomeRecebimento(b), 'pt-BR')
}

interface CardRendasProps {
  competencia: Competencia
  recebimentos: Recebimento[]
  carregando: boolean
  rendasAtivas: number
  gerando: boolean
  onGerar: () => void
  onNova: () => void
  onAlternarRecebido: (r: Recebimento, recebido: boolean) => void
  onEditar: (r: Recebimento) => void
}

export function CardRendas({
  competencia,
  recebimentos,
  carregando,
  rendasAtivas,
  gerando,
  onGerar,
  onNova,
  onAlternarRecebido,
  onEditar,
}: CardRendasProps) {
  const lista = [...recebimentos].sort(ordenar)
  const total = somar(lista.map((r) => r.valor))
  const recebido = somar(lista.filter((r) => r.recebido).map((r) => r.valor))

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <h2 className="font-semibold">Rendas de {competenciaMedia(competencia)}</h2>
        <Button size="sm" onClick={onNova}>
          <PlusIcon />
          Renda
        </Button>
      </div>

      {carregando ? (
        <div className="grid gap-2 px-4 pb-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : lista.length === 0 ? (
        <div className="text-muted-foreground grid justify-items-center gap-3 border-t px-4 py-8 text-center text-sm">
          {rendasAtivas > 0 ? (
            <>
              <p>As rendas fixas ainda não foram lançadas neste mês.</p>
              <Button variant="outline" onClick={onGerar} disabled={gerando}>
                {gerando ? <LoaderCircleIcon className="animate-spin" /> : <CalendarPlusIcon />}
                Gerar mês
              </Button>
            </>
          ) : (
            <>
              <p>Cadastre seu salário e outras rendas para ver quanto sobra no mês.</p>
              <Button variant="outline" onClick={onNova}>
                <PlusIcon />
                Cadastrar renda
              </Button>
            </>
          )}
        </div>
      ) : (
        <>
          <ul className="divide-y border-t">
            {lista.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5 pr-4 pl-4">
                <Checkbox
                  className="size-5"
                  checked={r.recebido}
                  onCheckedChange={(v) => onAlternarRecebido(r, v === true)}
                  aria-label={`${r.recebido ? 'Desmarcar' : 'Marcar'} ${nomeRecebimento(r)} como recebida`}
                />
                <button type="button" onClick={() => onEditar(r)} className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('truncate font-medium', r.recebido && 'text-muted-foreground')}>
                      {nomeRecebimento(r)}
                    </span>
                    {!r.renda && (
                      <Badge variant="outline" className="px-1.5 py-0">
                        avulsa
                      </Badge>
                    )}
                  </div>
                  <div className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-2 text-xs">
                    {r.renda?.responsavel && <span className="text-foreground/70">{r.renda.responsavel}</span>}
                    {r.recebido ? (
                      <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                        <CircleCheckIcon className="size-3.5" />
                        {r.data_recebimento ? `Recebido em ${formatarData(r.data_recebimento).slice(0, 5)}` : 'Recebido'}
                      </span>
                    ) : (
                      r.renda?.dia_recebimento && <span>Cai dia {r.renda.dia_recebimento}</span>
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onEditar(r)}
                  className={cn('shrink-0 font-medium tabular-nums', r.recebido && 'text-muted-foreground')}
                >
                  {formatarMoeda(r.valor)}
                </button>
              </li>
            ))}
          </ul>
          <div className="bg-muted/40 flex items-end justify-between gap-2 border-t px-4 py-3">
            <div className="text-muted-foreground text-xs">
              {recebido >= total ? (
                <span className="font-medium text-emerald-700 dark:text-emerald-400">Tudo recebido</span>
              ) : (
                <>
                  Falta receber{' '}
                  <span className="text-foreground font-medium tabular-nums">{formatarMoeda(somar([total, -recebido]))}</span>
                </>
              )}
            </div>
            <div className="text-right">
              <div className="text-muted-foreground text-xs">Total de rendas</div>
              <div className="text-lg font-bold tabular-nums">{formatarMoeda(total)}</div>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}

interface CardRendasFixasProps {
  rendas: Renda[]
  onEditar: (r: Renda) => void
  onAlternar: (r: Renda) => void
  onExcluir: (r: Renda) => void
}

/** Modelos de renda que entram todo mês pelo "Gerar mês". */
export function CardRendasFixas({ rendas, onEditar, onAlternar, onExcluir }: CardRendasFixasProps) {
  if (rendas.length === 0) return null
  const ativas = rendas.filter((r) => r.ativa)

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <h2 className="font-semibold">Rendas fixas</h2>
        <span className="text-muted-foreground text-sm tabular-nums">
          {formatarMoeda(somar(ativas.map((r) => r.valor_padrao)))}/mês
        </span>
      </div>
      <ul className="divide-y border-t">
        {rendas.map((r) => (
          <li key={r.id} className="flex items-center gap-2 py-2 pr-2 pl-4">
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onEditar(r)}>
              <div className="flex items-center gap-1.5">
                <span className={cn('truncate font-medium', !r.ativa && 'text-muted-foreground')}>{r.nome}</span>
                {!r.ativa && <Badge variant="secondary">Inativa</Badge>}
              </div>
              <div className="text-muted-foreground flex gap-x-2 text-xs">
                {r.responsavel && <span className="text-foreground/70">{r.responsavel}</span>}
                {r.dia_recebimento && <span>Cai dia {r.dia_recebimento}</span>}
              </div>
            </button>
            <span className={cn('text-sm font-medium tabular-nums', !r.ativa && 'text-muted-foreground')}>
              {formatarMoeda(r.valor_padrao)}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${r.nome}`}>
                  <EllipsisVerticalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEditar(r)}>
                  <PencilIcon />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAlternar(r)}>
                  {r.ativa ? <PowerOffIcon /> : <PowerIcon />}
                  {r.ativa ? 'Desativar' : 'Reativar'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => onExcluir(r)}>
                  <Trash2Icon />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>
    </Card>
  )
}
