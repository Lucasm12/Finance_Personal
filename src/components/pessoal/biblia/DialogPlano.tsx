import { useState, type FormEvent } from 'react'
import { LoaderCircleIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { useAtivarPlano } from '@/hooks/useBiblia'
import { hojeSP, PLANOS, TOTAL_CAPITULOS } from '@/lib/pessoal'
import { cn } from '@/lib/utils'
import type { ResumoLeitura, TipoPlano } from '@/types/pessoal'

const DURACOES = [
  { dias: 365, rotulo: '1 ano' },
  { dias: 180, rotulo: '6 meses' },
  { dias: 90, rotulo: '90 dias' },
  { dias: 730, rotulo: '2 anos' },
]

function FormPlano({ resumo, onFechar }: { resumo: ResumoLeitura | undefined; onFechar: () => void }) {
  const ativar = useAtivarPlano()
  const [tipo, setTipo] = useState<TipoPlano>(resumo?.plano?.tipo ?? 'sequencial')
  const [inicio, setInicio] = useState(hojeSP())
  const [dias, setDias] = useState(365)
  const [zerar, setZerar] = useState(false)
  const lidos = resumo?.total_lidos ?? 0
  const porDia = Math.ceil((zerar ? TOTAL_CAPITULOS : TOTAL_CAPITULOS - lidos) / dias)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!inicio) return
    try {
      await ativar.mutateAsync({ tipo, inicio, dias, zerar })
      toast.success(`Plano ${PLANOS[tipo].rotulo.toLowerCase()} ativado.`)
      onFechar()
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{resumo?.plano ? 'Trocar plano de leitura' : 'Escolher plano de leitura'}</DialogTitle>
        <DialogDescription>A meta de cada dia é recalculada para você terminar no prazo, mesmo se atrasar.</DialogDescription>
      </DialogHeader>

      <fieldset className="grid gap-2">
        <legend className="sr-only">Plano</legend>
        {(Object.keys(PLANOS) as TipoPlano[]).map((t) => (
          <label
            key={t}
            className={cn(
              'hover:bg-accent/50 flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors',
              tipo === t && 'border-primary bg-primary/5 hover:bg-primary/5',
            )}
          >
            <input type="radio" name="plano" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="accent-primary mt-1" />
            <span>
              <span className="block text-sm font-medium">{PLANOS[t].rotulo}</span>
              <span className="text-muted-foreground block text-xs">{PLANOS[t].descricao}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="plano-inicio">Começa em</Label>
          <Input id="plano-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="plano-duracao">Duração</Label>
          <NativeSelect id="plano-duracao" value={dias} onChange={(e) => setDias(Number(e.target.value))}>
            {DURACOES.map((d) => (
              <option key={d.dias} value={d.dias}>
                {d.rotulo}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {lidos > 0 && (
        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={zerar} onCheckedChange={(v) => setZerar(v === true)} className="mt-0.5" />
          <span>
            Começar do zero
            <span className="text-muted-foreground block text-xs">
              Desmarca os {lidos} capítulos já lidos (para reler a Bíblia inteira). Anotações e versículos marcados continuam.
            </span>
          </span>
        </label>
      )}

      <p className="bg-muted/60 rounded-lg px-3 py-2 text-sm">
        Cerca de <strong>{porDia} capítulos por dia</strong> para terminar no prazo.
      </p>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={ativar.isPending}>
          {ativar.isPending && <LoaderCircleIcon className="animate-spin" />}
          Ativar plano
        </Button>
      </DialogFooter>
    </form>
  )
}

export function DialogPlano({ aberto, resumo, onFechar }: { aberto: boolean; resumo: ResumoLeitura | undefined; onFechar: () => void }) {
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">{aberto && <FormPlano resumo={resumo} onFechar={onFechar} />}</DialogContent>
    </Dialog>
  )
}
