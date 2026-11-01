import { useState, type FormEvent } from 'react'
import { LoaderCircleIcon } from 'lucide-react'
import { toast } from 'sonner'

import { CampoMoeda } from '@/components/CampoMoeda'
import { SeletorCor } from '@/components/SeletorCor'
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
import { useSalvarCaixinha } from '@/hooks/useEconomia'
import { proximaCor } from '@/lib/cores'
import { MESES_RESERVA } from '@/lib/economia'
import { formatarMoeda } from '@/lib/format'
import { normalizar } from '@/lib/texto'
import type { Caixinha } from '@/types'

interface FormProps {
  caixinha: Caixinha | null
  nomeSugerido: string
  quantidade: number
  /** total das contas do mês, para sugerir a meta da reserva de emergência */
  contasDoMes: number
  onFechar: () => void
}

function FormCaixinha({ caixinha, nomeSugerido, quantidade, contasDoMes, onFechar }: FormProps) {
  const salvar = useSalvarCaixinha()
  const [nome, setNome] = useState(caixinha?.nome ?? nomeSugerido)
  const [cor, setCor] = useState(caixinha?.cor ?? proximaCor(quantidade))
  const [meta, setMeta] = useState(caixinha?.meta ?? 0)
  const [aporte, setAporte] = useState(caixinha?.aporte_mensal ?? 0)
  const [dataAlvo, setDataAlvo] = useState(caixinha?.data_alvo ?? '')
  const [erro, setErro] = useState('')

  const ehReserva = /reserva|emerg/.test(normalizar(nome))
  const metaSugerida = Math.round(contasDoMes * MESES_RESERVA * 100) / 100

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) {
      setErro('Dê um nome para a caixinha.')
      return
    }
    try {
      await salvar.mutateAsync({
        id: caixinha?.id,
        dados: {
          nome: nome.trim(),
          cor,
          meta: meta > 0 ? meta : null,
          aporte_mensal: aporte > 0 ? aporte : null,
          data_alvo: dataAlvo || null,
          arquivada: caixinha?.arquivada ?? false,
        },
      })
      toast.success(caixinha ? 'Caixinha atualizada.' : `Caixinha “${nome.trim()}” criada.`)
      onFechar()
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{caixinha ? 'Editar caixinha' : 'Nova caixinha'}</DialogTitle>
        <DialogDescription>Separe o dinheiro por objetivo. Meta e plano mensal são opcionais.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor="nome-caixinha">Nome</Label>
        <Input
          id="nome-caixinha"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value)
            setErro('')
          }}
          placeholder="Ex.: Reserva de emergência, Viagem"
          aria-invalid={!!erro}
          autoFocus={!caixinha && !nomeSugerido}
        />
        {erro && <p className="text-destructive text-xs">{erro}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="meta-caixinha">Meta (opcional)</Label>
          <CampoMoeda id="meta-caixinha" value={meta} onChange={setMeta} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="aporte-caixinha">Guardar por mês (opcional)</Label>
          <CampoMoeda id="aporte-caixinha" value={aporte} onChange={setAporte} />
        </div>
      </div>

      {ehReserva && metaSugerida > 0 && Math.abs(meta - metaSugerida) >= 0.005 && (
        <div className="bg-muted/60 flex flex-wrap items-center justify-between gap-2 rounded-md p-3 text-sm">
          <span>
            Sugestão: {MESES_RESERVA} meses das suas contas ={' '}
            <strong className="tabular-nums">{formatarMoeda(metaSugerida)}</strong>
          </span>
          <Button type="button" size="sm" variant="outline" onClick={() => setMeta(metaSugerida)}>
            Usar
          </Button>
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="data-alvo">Quero chegar na meta até (opcional)</Label>
        <Input id="data-alvo" type="date" value={dataAlvo} onChange={(e) => setDataAlvo(e.target.value)} />
      </div>

      <div className="grid gap-2">
        <Label>Cor</Label>
        <SeletorCor value={cor} onChange={setCor} />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvar.isPending}>
          {salvar.isPending && <LoaderCircleIcon className="animate-spin" />}
          Salvar
        </Button>
      </DialogFooter>
    </form>
  )
}

interface Props extends Omit<FormProps, 'onFechar' | 'caixinha' | 'nomeSugerido'> {
  aberto: boolean
  caixinha: Caixinha | null
  nomeSugerido?: string
  onFechar: () => void
}

export function DialogCaixinha({ aberto, caixinha, nomeSugerido = '', onFechar, ...resto }: Props) {
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        {aberto && (
          <FormCaixinha
            key={caixinha?.id ?? `nova-${nomeSugerido}`}
            caixinha={caixinha}
            nomeSugerido={nomeSugerido}
            onFechar={onFechar}
            {...resto}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
