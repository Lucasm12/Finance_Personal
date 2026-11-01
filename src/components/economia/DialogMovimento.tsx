import { useState, type FormEvent } from 'react'
import { LoaderCircleIcon } from 'lucide-react'
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
import { useRegistrarMovimento } from '@/hooks/useEconomia'
import { competenciaAtual, formatarMoeda, hojeISO } from '@/lib/format'
import type { CaixinhaComSaldo, Competencia, MovimentoCaixinha } from '@/types'

export interface MovimentoAberto {
  caixinha: CaixinhaComSaldo
  tipo: MovimentoCaixinha['tipo']
}

interface FormProps extends MovimentoAberto {
  competencia: Competencia
  onFechar: () => void
}

function FormMovimento({ caixinha: c, tipo, competencia, onFechar }: FormProps) {
  const registrar = useRegistrarMovimento()
  const guardar = tipo === 'aporte'
  // No mês atual usa hoje; em outro mês, o dia 1 daquele mês
  const [data, setData] = useState(competencia === competenciaAtual() ? hojeISO() : competencia)
  const [valor, setValor] = useState(0)
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState('')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (valor <= 0) return setErro('Informe o valor.')
    if (!guardar && valor > c.saldo) return setErro(`O saldo da caixinha é ${formatarMoeda(c.saldo)}.`)
    if (!data) return setErro('Informe a data.')
    try {
      await registrar.mutateAsync({
        caixinha_id: c.id,
        tipo,
        valor,
        data,
        observacao: observacao.trim() || null,
      })
      toast.success(
        guardar ? `${formatarMoeda(valor)} guardado em ${c.nome}.` : `${formatarMoeda(valor)} retirado de ${c.nome}.`,
      )
      onFechar()
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{guardar ? `Guardar em ${c.nome}` : `Retirar de ${c.nome}`}</DialogTitle>
        <DialogDescription>Saldo atual: {formatarMoeda(c.saldo)}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor="valor-movimento">Valor</Label>
        <CampoMoeda
          id="valor-movimento"
          value={valor}
          onChange={(v) => {
            setValor(v)
            setErro('')
          }}
          aria-invalid={!!erro}
          autoFocus
        />
        <div className="flex flex-wrap gap-2">
          {guardar && c.aporte_mensal && (
            <Button type="button" size="sm" variant="outline" onClick={() => setValor(c.aporte_mensal!)}>
              Valor do plano ({formatarMoeda(c.aporte_mensal)})
            </Button>
          )}
          {!guardar && c.saldo > 0 && (
            <Button type="button" size="sm" variant="outline" onClick={() => setValor(c.saldo)}>
              Retirar tudo ({formatarMoeda(c.saldo)})
            </Button>
          )}
        </div>
        {erro && <p className="text-destructive text-xs">{erro}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="data-movimento">Data</Label>
        <Input id="data-movimento" type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="obs-movimento">Observação (opcional)</Label>
        <Input
          id="obs-movimento"
          placeholder={guardar ? 'Ex.: sobra do salário' : 'Ex.: conserto do carro'}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" variant={guardar ? 'default' : 'destructive'} disabled={registrar.isPending}>
          {registrar.isPending && <LoaderCircleIcon className="animate-spin" />}
          {guardar ? 'Guardar' : 'Retirar'}
        </Button>
      </DialogFooter>
    </form>
  )
}

interface Props {
  movimento: MovimentoAberto | null
  competencia: Competencia
  onFechar: () => void
}

export function DialogMovimento({ movimento, competencia, onFechar }: Props) {
  const [exibido, setExibido] = useState(movimento)
  if (movimento && movimento !== exibido) setExibido(movimento)

  return (
    <Dialog open={!!movimento} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        {exibido && (
          <FormMovimento
            key={`${exibido.caixinha.id}-${exibido.tipo}`}
            {...exibido}
            competencia={competencia}
            onFechar={onFechar}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
