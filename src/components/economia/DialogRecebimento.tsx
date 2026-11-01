import { useState, type FormEvent } from 'react'
import { PencilIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

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
import { useAtualizarRecebimento, useExcluirRecebimento } from '@/hooks/useEconomia'
import { formatarMoeda, hojeISO, nomeCompetencia } from '@/lib/format'
import type { Recebimento } from '@/types'
import { nomeRecebimento } from './CardRendas'

interface FormProps {
  r: Recebimento
  onFechar: () => void
  onEditarRendaFixa: (rendaId: string) => void
}

function FormRecebimento({ r, onFechar, onEditarRendaFixa }: FormProps) {
  const atualizar = useAtualizarRecebimento(r.competencia)
  const excluir = useExcluirRecebimento()
  const [descricao, setDescricao] = useState(r.descricao ?? '')
  const [valor, setValor] = useState(r.valor)
  const [recebido, setRecebido] = useState(r.recebido)
  const [data, setData] = useState(r.data_recebimento ?? hojeISO())
  const [observacao, setObservacao] = useState(r.observacao ?? '')
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const avulsa = r.renda === null
  const diferenteDoPadrao = r.renda !== null && Math.abs(valor - r.renda.valor_padrao) >= 0.005

  function salvar(e: FormEvent) {
    e.preventDefault()
    if (avulsa && !descricao.trim()) {
      toast.error('Informe a descrição.')
      return
    }
    atualizar.mutate({
      id: r.id,
      dados: {
        valor,
        recebido,
        data_recebimento: recebido ? data || hojeISO() : null,
        observacao: observacao.trim() || null,
        ...(avulsa ? { descricao: descricao.trim() } : {}),
      },
    })
    onFechar()
  }

  function remover() {
    const nome = nomeRecebimento(r)
    excluir.mutate(r.id, { onSuccess: () => toast.success(`${nome} removida de ${nomeCompetencia(r.competencia)}.`) })
    onFechar()
  }

  return (
    <form onSubmit={salvar} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{nomeRecebimento(r)}</DialogTitle>
        <DialogDescription>
          {nomeCompetencia(r.competencia)} · {avulsa ? 'renda avulsa' : 'renda fixa'}
          {r.renda?.responsavel ? ` · ${r.renda.responsavel}` : ''}
        </DialogDescription>
      </DialogHeader>

      {avulsa && (
        <div className="grid gap-2">
          <Label htmlFor="descricao-recebimento">Descrição</Label>
          <Input id="descricao-recebimento" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="valor-recebimento">Valor neste mês</Label>
        <CampoMoeda id="valor-recebimento" value={valor} onChange={setValor} autoFocus />
        {r.renda && (
          <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
            <span>
              Valor padrão: <span className="tabular-nums">{formatarMoeda(r.renda.valor_padrao)}</span>
            </span>
            {diferenteDoPadrao && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => setValor(r.renda!.valor_padrao)}
              >
                <RotateCcwIcon className="size-3" />
                Usar valor padrão
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-3 rounded-lg border p-3">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="recebido" className="cursor-pointer">
            Já recebi
          </Label>
          <Switch id="recebido" checked={recebido} onCheckedChange={setRecebido} />
        </div>
        {recebido && (
          <div className="grid gap-2">
            <Label htmlFor="data-recebimento" className="text-muted-foreground text-xs font-normal">
              Data do recebimento
            </Label>
            <Input id="data-recebimento" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="obs-recebimento">Observação deste mês</Label>
        <Textarea
          id="obs-recebimento"
          rows={2}
          placeholder="Ex.: veio com hora extra"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />
      </div>

      {r.renda_id && (
        <Button
          type="button"
          variant="link"
          className="h-auto justify-start p-0"
          onClick={() => {
            onFechar()
            onEditarRendaFixa(r.renda_id!)
          }}
        >
          <PencilIcon />
          Editar a renda fixa (todos os meses)
        </Button>
      )}

      {confirmandoExclusao ? (
        <div className="border-destructive/40 bg-destructive/5 grid gap-3 rounded-lg border p-3 text-sm">
          <p>
            Remover <strong>{nomeRecebimento(r)}</strong> de {nomeCompetencia(r.competencia)}?
            {r.renda_id && ' A renda fixa continua cadastrada e volta a ser lançada se você gerar o mês de novo.'}
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
  recebimento: Recebimento | null
  onFechar: () => void
  onEditarRendaFixa: (rendaId: string) => void
}

export function DialogRecebimento({ recebimento, onFechar, onEditarRendaFixa }: Props) {
  // Mantém o conteúdo durante a animação de fechamento.
  const [exibido, setExibido] = useState(recebimento)
  if (recebimento && recebimento !== exibido) setExibido(recebimento)

  return (
    <Dialog open={!!recebimento} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent>
        {exibido && (
          <FormRecebimento key={exibido.id} r={exibido} onFechar={onFechar} onEditarRendaFixa={onEditarRendaFixa} />
        )}
      </DialogContent>
    </Dialog>
  )
}
