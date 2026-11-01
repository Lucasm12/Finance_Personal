import { useState, type FormEvent } from 'react'
import { FlameIcon, LoaderCircleIcon } from 'lucide-react'
import { toast } from 'sonner'

import { SeloArea } from '@/components/pessoal/Comum'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { useAreas, useMarcarHabito, useSalvarHabito } from '@/hooks/usePessoal'
import { DIAS_SEMANA, hojeSP } from '@/lib/pessoal'
import { cn } from '@/lib/utils'
import type { Frequencia, Habito, ResumoHabito } from '@/types/pessoal'

/** Sequência atual (dias previstos seguidos). */
export function Sequencia({ dias, className }: { dias: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium tabular-nums', dias === 0 && 'text-muted-foreground', className)}>
      <FlameIcon className={cn('size-3.5', dias > 0 ? 'text-orange-500' : 'text-muted-foreground')} aria-hidden />
      {dias}
      <span className="sr-only"> {dias === 1 ? 'dia seguido' : 'dias seguidos'}</span>
    </span>
  )
}

/** Hábitos previstos para hoje, com check (usado no Meu dia). */
export function HabitosHoje({ habitos, resumo }: { habitos: Habito[]; resumo: ResumoHabito[] }) {
  const marcar = useMarcarHabito()
  const areas = useAreas()
  const hoje = hojeSP()
  const porId = new Map(resumo.map((r) => [r.habito_id, r]))
  const doDia = habitos.filter((h) => h.ativo && porId.get(h.id)?.previsto_hoje)

  if (!doDia.length) return <p className="text-muted-foreground text-sm">Nenhum hábito previsto para hoje.</p>
  return (
    <ul className="grid gap-1">
      {doDia.map((h) => {
        const r = porId.get(h.id)!
        return (
          <li key={h.id} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
            <Checkbox
              id={`hab-hoje-${h.id}`}
              className="size-5"
              checked={r.feito_hoje}
              onCheckedChange={(v) => marcar.mutate({ habito_id: h.id, data: hoje, feito: v === true })}
            />
            <label htmlFor={`hab-hoje-${h.id}`} className={cn('min-w-0 flex-1 cursor-pointer', r.feito_hoje && 'text-muted-foreground line-through')}>
              <span className="block truncate text-sm">{h.titulo}</span>
              <SeloArea area={areas.data?.find((a) => a.id === h.area_id)} />
            </label>
            <Sequencia dias={r.sequencia} />
          </li>
        )
      })}
    </ul>
  )
}

// -----------------------------------------------------------------------------
// Cadastro
// -----------------------------------------------------------------------------

function FormHabito({ habito, onFechar }: { habito: Habito | null; onFechar: () => void }) {
  const areas = useAreas()
  const salvar = useSalvarHabito()
  const [titulo, setTitulo] = useState(habito?.titulo ?? '')
  const [areaId, setAreaId] = useState(habito?.area_id ?? '')
  const [tipo, setTipo] = useState<Frequencia['tipo']>(habito?.frequencia.tipo ?? 'diaria')
  const [dias, setDias] = useState<number[]>(habito?.frequencia.tipo === 'dias' ? habito.frequencia.dias : [1, 2, 3, 4, 5])
  const [erro, setErro] = useState('')

  const alternarDia = (d: number) => setDias((atual) => (atual.includes(d) ? atual.filter((x) => x !== d) : [...atual, d].sort()))

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return setErro('Dê um nome ao hábito.')
    if (tipo === 'dias' && !dias.length) return setErro('Escolha pelo menos um dia da semana.')
    const frequencia: Frequencia = tipo === 'diaria' ? { tipo: 'diaria' } : { tipo: 'dias', dias }
    try {
      await salvar.mutateAsync({ id: habito?.id, dados: { titulo: titulo.trim(), area_id: areaId || null, frequencia } })
      toast.success(habito ? 'Hábito atualizado.' : 'Hábito criado. Marque-o todos os dias previstos.')
      onFechar()
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{habito ? 'Editar hábito' : 'Novo hábito'}</DialogTitle>
        <DialogDescription>Só os dias previstos contam para a sequência e o percentual.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-1.5">
        <Label htmlFor="hab-titulo">Hábito</Label>
        <Input id="hab-titulo" maxLength={120} placeholder="Ex.: Orar ao acordar, beber 2 L de água" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="hab-area">Área da vida (opcional)</Label>
        <NativeSelect id="hab-area" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
          <option value="">Nenhuma</option>
          {(areas.data ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </NativeSelect>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Frequência</legend>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="freq" checked={tipo === 'diaria'} onChange={() => setTipo('diaria')} className="accent-primary" />
            Todos os dias
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="freq" checked={tipo === 'dias'} onChange={() => setTipo('dias')} className="accent-primary" />
            Dias específicos
          </label>
        </div>
        {tipo === 'dias' && (
          <div className="grid grid-cols-7 gap-1" role="group" aria-label="Dias da semana">
            {DIAS_SEMANA.map((nome, i) => (
              <button
                key={nome}
                type="button"
                aria-pressed={dias.includes(i + 1)}
                onClick={() => alternarDia(i + 1)}
                className={cn(
                  'h-9 rounded-md border text-xs font-medium transition-colors',
                  dias.includes(i + 1) ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent',
                )}
              >
                {nome}
              </button>
            ))}
          </div>
        )}
      </fieldset>
      {erro && (
        <p className="text-destructive text-sm" role="alert">
          {erro}
        </p>
      )}
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

export function DialogHabito({ aberto, habito, onFechar }: { aberto: boolean; habito: Habito | null; onFechar: () => void }) {
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">{aberto && <FormHabito habito={habito} onFechar={onFechar} />}</DialogContent>
    </Dialog>
  )
}
