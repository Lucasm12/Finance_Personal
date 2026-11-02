import { useState, type FormEvent } from 'react'
import { LoaderCircleIcon, TriangleAlertIcon } from 'lucide-react'
import { toast } from 'sonner'

import { VisaoEstrutura } from '@/components/triathlon/sugestoes/VisaoEstrutura'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAgendarSugestao, type Agendamento } from '@/hooks/useSugestoes'
import { useTreinosPlanejados } from '@/hooks/useTriathlon'
import { dataLocal, duracaoCurta, MODALIDADES } from '@/lib/triathlon'
import type { PerfilAtleta } from '@/types/triathlon'

export type PedidoAgendamento = Omit<Agendamento, 'data'> & { data?: string | null }

function FormAgendar({ pedido, perfil, onFechar }: { pedido: PedidoAgendamento; perfil: PerfilAtleta | null | undefined; onFechar: () => void }) {
  const agendar = useAgendarSugestao()
  const hoje = dataLocal(new Date())
  const [data, setData] = useState(pedido.data && pedido.data >= hoje ? pedido.data : hoje)
  const [nome, setNome] = useState(pedido.nome)
  const [observacao, setObservacao] = useState('')
  const doDia = useTreinosPlanejados(data || hoje, data || hoje)
  const mesmaModalidade = (doDia.data ?? []).filter((t) => t.modalidade === pedido.estrutura.modalidade)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!data) return toast.error('Escolha a data.')
    if (!nome.trim()) return toast.error('Dê um nome ao treino.')
    try {
      await agendar.mutateAsync({ ...pedido, data, nome, observacao })
      toast.success(`Treino colocado na agenda em ${data.split('-').reverse().join('/')}.`)
      onFechar()
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>Colocar na agenda</DialogTitle>
        <DialogDescription>
          O treino entra como pendente, com a estrutura completa. Quando você importar o treino feito, vincule-o ao concluir para ver o planejado ×
          realizado.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="ag-sug-data" className="text-xs">
            Data
          </Label>
          <Input id="ag-sug-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ag-sug-nome" className="text-xs">
            Nome
          </Label>
          <Input id="ag-sug-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
      </div>

      {mesmaModalidade.length > 0 && (
        <p className="flex gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
          <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Já há {mesmaModalidade.length} treino(s) de {MODALIDADES[pedido.estrutura.modalidade].nome.toLowerCase()} nesse dia: {mesmaModalidade.map((t) => t.nome).join(', ')}.
        </p>
      )}

      <div className="grid gap-1.5">
        <span className="text-xs font-medium">
          Treino{pedido.duracao_seg ? ` · ${duracaoCurta(pedido.duracao_seg)}` : ''}
        </span>
        <div className="max-h-64 overflow-y-auto">
          <VisaoEstrutura estrutura={pedido.estrutura} perfil={perfil} compacta />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="ag-sug-obs" className="text-xs">
          Observações (opcional)
        </Label>
        <Textarea id="ag-sug-obs" rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={agendar.isPending}>
          {agendar.isPending && <LoaderCircleIcon className="animate-spin" />}
          Agendar
        </Button>
      </DialogFooter>
    </form>
  )
}

export function DialogAgendarSugestao({ pedido, perfil, onFechar }: { pedido: PedidoAgendamento | null; perfil: PerfilAtleta | null | undefined; onFechar: () => void }) {
  return (
    <Dialog open={pedido !== null} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">{pedido && <FormAgendar pedido={pedido} perfil={perfil} onFechar={onFechar} />}</DialogContent>
    </Dialog>
  )
}
