import { useState } from 'react'
import { ArrowDownToLineIcon, ArrowUpFromLineIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useExcluirMovimento, useExtratoCaixinha } from '@/hooks/useEconomia'
import { formatarData, formatarMoeda } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CaixinhaComSaldo } from '@/types'

interface Props {
  caixinha: CaixinhaComSaldo | null
  onFechar: () => void
}

export function DialogExtrato({ caixinha, onFechar }: Props) {
  const [exibida, setExibida] = useState(caixinha)
  if (caixinha && caixinha !== exibida) setExibida(caixinha)

  const extrato = useExtratoCaixinha(caixinha?.id ?? null)
  const excluir = useExcluirMovimento()
  const [confirmando, setConfirmando] = useState<string | null>(null)

  function remover(id: string) {
    excluir.mutate(id, { onSuccess: () => toast.success('Movimentação excluída.') })
    setConfirmando(null)
  }

  return (
    <Dialog open={!!caixinha} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        {exibida && (
          <>
            <DialogHeader>
              <DialogTitle>Extrato — {exibida.nome}</DialogTitle>
              <DialogDescription>
                Guardado {formatarMoeda(exibida.total_guardado)} · Retirado {formatarMoeda(exibida.total_retirado)} ·{' '}
                <strong className="text-foreground">Saldo {formatarMoeda(exibida.saldo)}</strong>
              </DialogDescription>
            </DialogHeader>

            {extrato.isLoading ? (
              <div className="grid gap-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : (extrato.data ?? []).length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">Nenhuma movimentação ainda.</p>
            ) : (
              <ul className="-mx-2 divide-y">
                {extrato.data!.map((m) => {
                  const aporte = m.tipo === 'aporte'
                  const Icone = aporte ? ArrowDownToLineIcon : ArrowUpFromLineIcon
                  return (
                    <li key={m.id} className="flex items-center gap-3 px-2 py-2.5">
                      <Icone
                        className={cn(
                          'size-4 shrink-0',
                          aporte ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{aporte ? 'Guardado' : 'Retirado'}</div>
                        <div className="text-muted-foreground truncate text-xs">
                          {formatarData(m.data)}
                          {m.observacao && ` · ${m.observacao}`}
                        </div>
                      </div>
                      {confirmando === m.id ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => setConfirmando(null)}>
                            Não
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => remover(m.id)}>
                            Excluir
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span
                            className={cn(
                              'font-medium tabular-nums',
                              aporte ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400',
                            )}
                          >
                            {aporte ? '+' : '−'}
                            {formatarMoeda(m.valor)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Excluir movimentação"
                            onClick={() => setConfirmando(m.id)}
                          >
                            <Trash2Icon />
                          </Button>
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
