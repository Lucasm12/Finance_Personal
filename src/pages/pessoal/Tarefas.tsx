import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarClockIcon, CalendarDaysIcon, CheckCheckIcon, ListTodoIcon, PlusIcon, StarIcon, SunIcon, TriangleAlertIcon } from 'lucide-react'

import { Abas, Cabecalho, Vazio } from '@/components/pessoal/Comum'
import { DialogTarefa, ItemTarefa, NovaTarefaRapida, ordenarTarefas } from '@/components/pessoal/tarefas/Tarefas'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTarefas } from '@/hooks/usePessoal'
import { mensagemErro } from '@/lib/erros'
import { dataPorExtenso, hojeSP } from '@/lib/pessoal'
import { somarDias } from '@/lib/triathlon'
import type { Tarefa } from '@/types/pessoal'

type Visao = 'hoje' | 'semana' | 'atrasadas' | 'concluidas'

function Lista({ tarefas, mostrarData, onEditar }: { tarefas: Tarefa[]; mostrarData?: boolean; onEditar: (t: Tarefa) => void }) {
  return (
    <ul className="grid gap-2">
      {tarefas.map((t) => (
        <ItemTarefa key={t.id} tarefa={t} mostrarData={mostrarData} onEditar={onEditar} />
      ))}
    </ul>
  )
}

export default function Tarefas() {
  const [params, setParams] = useSearchParams()
  const visao = (['semana', 'atrasadas', 'concluidas'].includes(params.get('ver') ?? '') ? params.get('ver') : 'hoje') as Visao
  const tarefas = useTarefas()
  const [editor, setEditor] = useState<{ tarefa: Tarefa | null } | null>(null)
  const hoje = hojeSP()
  const fimSemana = somarDias(hoje, 7)

  const todas = tarefas.data ?? []
  const pendentes = todas.filter((t) => !t.concluida)
  const deHoje = todas.filter((t) => t.data === hoje).sort(ordenarTarefas)
  const proximas = pendentes.filter((t) => t.data > hoje && t.data <= fimSemana).sort((a, b) => a.data.localeCompare(b.data) || ordenarTarefas(a, b))
  const atrasadas = pendentes.filter((t) => t.data < hoje).sort((a, b) => a.data.localeCompare(b.data))
  const concluidas = todas.filter((t) => t.concluida).sort((a, b) => (b.concluida_em ?? '').localeCompare(a.concluida_em ?? ''))
  const editar = (t: Tarefa) => setEditor({ tarefa: t })

  const foco = deHoje.filter((t) => t.foco)
  const outras = deHoje.filter((t) => !t.foco)
  const diasProximos = [...new Set(proximas.map((t) => t.data))]

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5">
      <Cabecalho titulo="Tarefas" descricao="O que precisa ser feito, com as 3 prioridades de cada dia em destaque.">
        <Button onClick={() => setEditor({ tarefa: null })}>
          <PlusIcon />
          Nova tarefa
        </Button>
      </Cabecalho>

      <Abas
        rotulo="Tarefas"
        valor={visao}
        onChange={(v) => setParams(v === 'hoje' ? {} : { ver: v }, { replace: true })}
        opcoes={[
          { valor: 'hoje', rotulo: 'Hoje', icone: SunIcon, contador: deHoje.filter((t) => !t.concluida).length },
          { valor: 'semana', rotulo: 'Próximos 7 dias', icone: CalendarDaysIcon, contador: proximas.length },
          { valor: 'atrasadas', rotulo: 'Atrasadas', icone: TriangleAlertIcon, contador: atrasadas.length },
          { valor: 'concluidas', rotulo: 'Concluídas', icone: CheckCheckIcon },
        ]}
      />

      {tarefas.isPending ? (
        <Skeleton className="h-64" />
      ) : tarefas.error ? (
        <p className="text-destructive text-sm">{mensagemErro(tarefas.error)}</p>
      ) : visao === 'hoje' ? (
        <div className="grid gap-4">
          <NovaTarefaRapida />
          <section className="grid gap-2" aria-label="Prioridades do dia">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <StarIcon className="size-4 fill-amber-400 text-amber-500" aria-hidden />
              Prioridades do dia <span className="text-muted-foreground font-normal">({foco.length}/3)</span>
            </h2>
            {foco.length ? (
              <Lista tarefas={foco} onEditar={editar} />
            ) : (
              <p className="text-muted-foreground text-sm">Toque na estrela de até 3 tarefas para elas virarem as prioridades de hoje.</p>
            )}
          </section>
          <section className="grid gap-2" aria-label="Outras tarefas de hoje">
            <h2 className="text-sm font-semibold">Outras de hoje</h2>
            {outras.length ? <Lista tarefas={outras} onEditar={editar} /> : <p className="text-muted-foreground text-sm">Nada mais para hoje.</p>}
          </section>
          {atrasadas.length > 0 && (
            <Button variant="outline" className="w-fit" onClick={() => setParams({ ver: 'atrasadas' }, { replace: true })}>
              <TriangleAlertIcon />
              {atrasadas.length} {atrasadas.length === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}
            </Button>
          )}
        </div>
      ) : visao === 'semana' ? (
        diasProximos.length ? (
          <div className="grid gap-4">
            {diasProximos.map((d) => (
              <section key={d} className="grid gap-2" aria-label={dataPorExtenso(d)}>
                <h2 className="text-sm font-semibold first-letter:uppercase">{d === somarDias(hoje, 1) ? `Amanhã · ${dataPorExtenso(d)}` : dataPorExtenso(d)}</h2>
                <Lista tarefas={proximas.filter((t) => t.data === d)} onEditar={editar} />
              </section>
            ))}
          </div>
        ) : (
          <Vazio icone={CalendarClockIcon} titulo="Nada agendado para os próximos 7 dias" />
        )
      ) : visao === 'atrasadas' ? (
        atrasadas.length ? (
          <div className="grid gap-2">
            <p className="text-muted-foreground text-sm">No menu de cada tarefa, use “Mover para hoje” para replanejar.</p>
            <Lista tarefas={atrasadas} mostrarData onEditar={editar} />
          </div>
        ) : (
          <Vazio icone={ListTodoIcon} titulo="Nenhuma tarefa atrasada" />
        )
      ) : concluidas.length ? (
        <Lista tarefas={concluidas} mostrarData onEditar={editar} />
      ) : (
        <Vazio icone={CheckCheckIcon} titulo="Nenhuma tarefa concluída nos últimos 30 dias" />
      )}

      <DialogTarefa aberto={editor !== null} tarefa={editor?.tarefa ?? null} onFechar={() => setEditor(null)} />
    </div>
  )
}
