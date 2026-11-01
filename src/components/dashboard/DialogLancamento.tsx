import { useState, type FormEvent } from 'react'
import { RotateCcwIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { BotaoCopiar } from '@/components/BotaoCopiar'
import { CampoMoeda } from '@/components/CampoMoeda'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAtualizarLancamento, useExcluirLancamento } from '@/hooks/useDados'
import { formatarData, formatarMoeda, hojeISO, nomeCompetencia } from '@/lib/format'
import type { LancamentoVisivel } from './tipos'

interface FormProps {
  l: LancamentoVisivel
  categoria: string
  onFechar: () => void
}

function FormLancamento({ l, categoria, onFechar }: FormProps) {
  const atualizar = useAtualizarLancamento(l.competencia)
  const excluir = useExcluirLancamento()
  const [valor, setValor] = useState(l.valor)
  const [pago, setPago] = useState(l.pago)
  const [dataPagamento, setDataPagamento] = useState(l.data_pagamento ?? hojeISO())
  const [observacao, setObservacao] = useState(l.observacao ?? '')
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

  const diferenteDoPadrao = Math.abs(valor - l.conta.valor_padrao) >= 0.005

  function salvar(e: FormEvent) {
    e.preventDefault()
    atualizar.mutate({
      id: l.id,
      dados: {
        valor,
        pago,
        data_pagamento: pago ? dataPagamento || hojeISO() : null,
        observacao: observacao.trim() || null,
      },
    })
    onFechar()
  }

  function remover() {
    excluir.mutate(l.id, {
      onSuccess: () => toast.success(`${l.conta.nome} removida de ${nomeCompetencia(l.competencia)}.`),
    })
    onFechar()
  }

  const detalhes = [
    categoria,
    nomeCompetencia(l.competencia),
    l.numero_parcela ? `parcela ${l.numero_parcela} de ${l.conta.total_parcelas}` : null,
    l.conta.responsavel,
  ].filter(Boolean)

  return (
    <form onSubmit={salvar} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{l.conta.nome}</DialogTitle>
        <DialogDescription>{detalhes.join(' · ')}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor="valor">Valor neste mês</Label>
        <CampoMoeda id="valor" value={valor} onChange={setValor} autoFocus />
        <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
          <span>
            Valor padrão da conta: <span className="tabular-nums">{formatarMoeda(l.conta.valor_padrao)}</span>
          </span>
          {diferenteDoPadrao && (
            <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setValor(l.conta.valor_padrao)}>
              <RotateCcwIcon className="size-3" />
              Usar valor padrão
            </Button>
          )}
        </div>
        <p className="text-muted-foreground text-xs">Alterar aqui não muda o valor dos outros meses.</p>
      </div>

      <div className="grid gap-3 rounded-lg border p-3">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="pago" className="cursor-pointer">
            Conta paga
          </Label>
          <Switch id="pago" checked={pago} onCheckedChange={setPago} />
        </div>
        {pago && (
          <div className="grid gap-2">
            <Label htmlFor="data-pagamento" className="text-muted-foreground text-xs font-normal">
              Data do pagamento
            </Label>
            <Input
              id="data-pagamento"
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
            />
          </div>
        )}
        {!pago && (
          <p className="text-muted-foreground text-xs">
            Vencimento: {formatarData(l.situacao.vencimento)}
            {!l.conta.dia_vencimento && ' (sem dia definido — considerado o fim do mês)'}
          </p>
        )}
      </div>

      {l.conta.codigo_pagamento && (
        <div className="grid gap-2">
          <Label>Código de pagamento</Label>
          <div className="bg-muted/50 flex items-start gap-2 rounded-md border p-2">
            <code className="min-w-0 flex-1 text-xs break-all select-all">{l.conta.codigo_pagamento}</code>
            <BotaoCopiar texto={l.conta.codigo_pagamento} />
          </div>
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="obs">Observação deste mês</Label>
        <Textarea
          id="obs"
          rows={2}
          placeholder="Ex.: pago com cartão, valor com juros…"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />
      </div>

      {confirmandoExclusao ? (
        <div className="border-destructive/40 bg-destructive/5 grid gap-3 rounded-lg border p-3 text-sm">
          <p>
            Remover <strong>{l.conta.nome}</strong> de {nomeCompetencia(l.competencia)}? O modelo da conta continua
            cadastrado. Se você clicar em “Gerar mês” de novo, ela volta a ser lançada.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setConfirmandoExclusao(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={remover}>
              Remover deste mês
            </Button>
          </div>
        </div>
      ) : (
        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmandoExclusao(true)}
          >
            <Trash2Icon />
            Remover deste mês
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </DialogFooter>
      )}
    </form>
  )
}

interface Props {
  lancamento: LancamentoVisivel | null
  /** id da categoria → nome */
  nomesCategorias: Record<string, string>
  onFechar: () => void
}

export function DialogLancamento({ lancamento, nomesCategorias, onFechar }: Props) {
  // Mantém o conteúdo durante a animação de fechamento.
  const [exibido, setExibido] = useState(lancamento)
  if (lancamento && lancamento !== exibido) setExibido(lancamento)

  return (
    <Dialog open={!!lancamento} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent>
        {exibido && (
          <FormLancamento
            key={exibido.id}
            l={exibido}
            categoria={nomesCategorias[exibido.conta.categoria_id] ?? ''}
            onFechar={onFechar}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
