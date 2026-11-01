import { useState, type FormEvent } from 'react'
import { EllipsisIcon, LoaderCircleIcon, PlusIcon, StarIcon, TargetIcon } from 'lucide-react'
import { toast } from 'sonner'

import { SeloArea } from '@/components/pessoal/Comum'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { useAreas, useExcluirTarefa, useMetas, useSalvarTarefa } from '@/hooks/usePessoal'
import { dataCurta, hojeSP, PRIORIDADES } from '@/lib/pessoal'
import { somarDias } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { Prioridade, Tarefa } from '@/types/pessoal'

/** Ordem: prioridades do dia, depois alta → baixa, depois criação. */
export const ordenarTarefas = (a: Tarefa, b: Tarefa) =>
  Number(b.foco) - Number(a.foco) || PRIORIDADES[a.prioridade].peso - PRIORIDADES[b.prioridade].peso || a.created_at.localeCompare(b.created_at)

export function ItemTarefa({ tarefa, mostrarData = false, onEditar }: { tarefa: Tarefa; mostrarData?: boolean; onEditar?: (t: Tarefa) => void }) {
  const salvar = useSalvarTarefa()
  const excluir = useExcluirTarefa()
  const areas = useAreas()
  const metas = useMetas()
  const hoje = hojeSP()
  const atrasada = !tarefa.concluida && tarefa.data < hoje
  const meta = tarefa.meta_id ? metas.data?.find((m) => m.id === tarefa.meta_id) : undefined
  const mover = (data: string, aviso: string) => salvar.mutate({ id: tarefa.id, dados: { data } }, { onSuccess: () => toast.success(aviso) })

  return (
    <li className={cn('group flex items-start gap-3 rounded-lg border px-3 py-2', tarefa.foco && !tarefa.concluida && 'border-primary/50 bg-primary/5')}>
      <Checkbox
        id={`tarefa-${tarefa.id}`}
        className="mt-0.5 size-5"
        checked={tarefa.concluida}
        onCheckedChange={(v) => salvar.mutate({ id: tarefa.id, dados: { concluida: v === true } })}
      />
      <label htmlFor={`tarefa-${tarefa.id}`} className="min-w-0 flex-1 cursor-pointer">
        <span className={cn('block text-sm', tarefa.concluida && 'text-muted-foreground line-through')}>{tarefa.titulo}</span>
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs">
          {tarefa.prioridade !== 'media' && <span className={PRIORIDADES[tarefa.prioridade].classe}>{PRIORIDADES[tarefa.prioridade].rotulo}</span>}
          {(mostrarData || atrasada) && (
            <span className={atrasada ? 'font-medium text-red-700 dark:text-red-400' : 'text-muted-foreground'}>
              {tarefa.data === hoje ? 'hoje' : tarefa.data === somarDias(hoje, 1) ? 'amanhã' : dataCurta(tarefa.data)}
            </span>
          )}
          <SeloArea area={areas.data?.find((a) => a.id === tarefa.area_id)} />
          {meta && (
            <span className="text-muted-foreground inline-flex min-w-0 items-center gap-1">
              <TargetIcon className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{meta.titulo}</span>
            </span>
          )}
        </span>
      </label>
      {!tarefa.concluida && (
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={tarefa.foco ? 'Tirar das prioridades do dia' : 'Marcar como prioridade do dia'}
          aria-pressed={tarefa.foco}
          title={tarefa.foco ? 'Prioridade do dia' : 'Marcar como uma das 3 prioridades do dia'}
          onClick={() => salvar.mutate({ id: tarefa.id, dados: { foco: !tarefa.foco } })}
        >
          <StarIcon className={cn(tarefa.foco ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground')} />
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label={`Ações da tarefa ${tarefa.titulo}`}>
            <EllipsisIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onEditar && <DropdownMenuItem onSelect={() => onEditar(tarefa)}>Editar</DropdownMenuItem>}
          {!tarefa.concluida && tarefa.data !== hoje && <DropdownMenuItem onSelect={() => mover(hoje, 'Movida para hoje.')}>Mover para hoje</DropdownMenuItem>}
          {!tarefa.concluida && <DropdownMenuItem onSelect={() => mover(somarDias(hoje, 1), 'Movida para amanhã.')}>Mover para amanhã</DropdownMenuItem>}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => excluir.mutate(tarefa.id, { onSuccess: () => toast.success('Tarefa excluída.') })}
          >
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}

/** Campo para anotar uma tarefa rápido (data de hoje por padrão). */
export function NovaTarefaRapida({ data, foco = false }: { data?: string; foco?: boolean }) {
  const salvar = useSalvarTarefa()
  const [titulo, setTitulo] = useState('')

  function enviar(e: FormEvent) {
    e.preventDefault()
    const t = titulo.trim()
    if (!t) return
    salvar.mutate({ dados: { titulo: t.slice(0, 200), data: data ?? hojeSP(), foco } }, { onSuccess: () => setTitulo('') })
  }

  return (
    <form onSubmit={enviar} className="flex gap-2">
      <Input maxLength={200} placeholder="Nova tarefa para hoje" aria-label="Nova tarefa" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      <Button type="submit" variant="outline" size="icon" aria-label="Adicionar tarefa" disabled={!titulo.trim() || salvar.isPending}>
        {salvar.isPending ? <LoaderCircleIcon className="animate-spin" /> : <PlusIcon />}
      </Button>
    </form>
  )
}

function FormTarefa({ tarefa, onFechar }: { tarefa: Tarefa | null; onFechar: () => void }) {
  const salvar = useSalvarTarefa()
  const areas = useAreas()
  const metas = useMetas()
  const hoje = hojeSP()
  const [titulo, setTitulo] = useState(tarefa?.titulo ?? '')
  const [data, setData] = useState(tarefa?.data ?? hoje)
  const [prioridade, setPrioridade] = useState<Prioridade>(tarefa?.prioridade ?? 'media')
  const [areaId, setAreaId] = useState(tarefa?.area_id ?? '')
  const [metaId, setMetaId] = useState(tarefa?.meta_id ?? '')
  const [foco, setFoco] = useState(tarefa?.foco ?? false)
  const [erro, setErro] = useState('')
  const metasAbertas = (metas.data ?? []).filter((m) => m.id === metaId || (m.situacao !== 'concluida' && m.situacao !== 'pausada'))

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return setErro('Descreva a tarefa.')
    if (!data) return setErro('Informe a data.')
    const meta = metas.data?.find((m) => m.id === metaId)
    try {
      await salvar.mutateAsync({
        id: tarefa?.id,
        // sem área escolhida, herda a área da meta vinculada
        dados: { titulo: titulo.trim(), data, prioridade, foco, meta_id: metaId || null, area_id: areaId || meta?.area_id || null },
      })
      toast.success(tarefa ? 'Tarefa atualizada.' : 'Tarefa criada.')
      onFechar()
    } catch {
      // erro já exibido pelo hook (ex.: já há 3 prioridades no dia)
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{tarefa ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
        <DialogDescription>Vincule a uma meta para ver o que cada tarefa move.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-1.5">
        <Label htmlFor="tarefa-titulo">Tarefa</Label>
        <Input id="tarefa-titulo" maxLength={200} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="tarefa-data">Data</Label>
          <Input id="tarefa-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="tarefa-prioridade">Prioridade</Label>
          <NativeSelect id="tarefa-prioridade" value={prioridade} onChange={(e) => setPrioridade(e.target.value as Prioridade)}>
            {(Object.keys(PRIORIDADES) as Prioridade[]).map((p) => (
              <option key={p} value={p}>
                {PRIORIDADES[p].rotulo}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="tarefa-meta">Meta (opcional)</Label>
        <NativeSelect id="tarefa-meta" value={metaId} onChange={(e) => setMetaId(e.target.value)}>
          <option value="">Nenhuma</option>
          {metasAbertas.map((m) => (
            <option key={m.id} value={m.id}>
              {m.titulo} ({m.ano})
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="tarefa-area">Área da vida (opcional)</Label>
        <NativeSelect id="tarefa-area" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
          <option value="">{metaId ? 'A mesma da meta' : 'Nenhuma'}</option>
          {(areas.data ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </NativeSelect>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={foco} onCheckedChange={(v) => setFoco(v === true)} />
        Uma das 3 prioridades do dia
      </label>
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

export function DialogTarefa({ aberto, tarefa, onFechar }: { aberto: boolean; tarefa: Tarefa | null; onFechar: () => void }) {
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">{aberto && <FormTarefa tarefa={tarefa} onFechar={onFechar} />}</DialogContent>
    </Dialog>
  )
}
