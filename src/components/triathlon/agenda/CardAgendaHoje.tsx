import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDaysIcon, ChevronRightIcon } from 'lucide-react'

import { DialogPlanejado } from '@/components/triathlon/agenda/DialogPlanejado'
import { ItemPlanejado } from '@/components/triathlon/agenda/ItemPlanejado'
import { BarraMeta } from '@/components/triathlon/agenda/PainelSemana'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useMetasSemanais, useTreinosPlanejados } from '@/hooks/useTriathlon'
import { fimDaSemana, MODALIDADES_AGENDA, progressoSemana } from '@/lib/agenda'
import { dataLocal, inicioSemana } from '@/lib/triathlon'
import { ROTAS_TRIATHLON } from '@/modulos'
import type { TreinoPlanejado } from '@/types/triathlon'

/** Treinos planejados para hoje e as metas da semana, no Painel. */
export function CardAgendaHoje() {
  const hoje = dataLocal(new Date())
  const semana = inicioSemana(hoje)
  const planejados = useTreinosPlanejados(semana, fimDaSemana(semana))
  const metas = useMetasSemanais(semana, semana)
  const [editando, setEditando] = useState<TreinoPlanejado | null>(null)

  // banco sem as tabelas da agenda: o painel segue sem este cartão
  if (planejados.error || metas.error) return null
  if (planejados.isLoading || metas.isLoading) return <Skeleton className="h-32 rounded-xl" />

  const treinos = planejados.data ?? []
  const deHoje = treinos.filter((t) => t.data === hoje)
  const p = progressoSemana(semana, treinos, metas.data ?? [])
  const comMeta = MODALIDADES_AGENDA.filter((m) => p.modalidades[m].meta !== null)

  if (!treinos.length && !comMeta.length) {
    return (
      <Link
        to={ROTAS_TRIATHLON.agenda}
        className="hover:bg-accent/40 flex items-center gap-3 rounded-xl border border-dashed px-5 py-3 text-sm transition-colors"
      >
        <CalendarDaysIcon className="text-primary size-5" />
        <span>
          <strong>Planeje sua semana</strong>{' '}
          <span className="text-muted-foreground">com metas por modalidade e os treinos de cada dia na Agenda.</span>
        </span>
      </Link>
    )
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <CalendarDaysIcon className="text-primary size-4" />
          Agenda de hoje
        </h2>
        <Link to={ROTAS_TRIATHLON.agenda} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          Agenda
          <ChevronRightIcon />
        </Link>
      </div>
      {deHoje.length ? (
        <ul className="divide-y border-t">
          {deHoje.map((t) => (
            <ItemPlanejado key={t.id} treino={t} onEditar={setEditando} />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground border-t px-4 py-3 text-sm">Nada planejado para hoje.</p>
      )}
      {comMeta.length > 0 && (
        <div className="grid gap-3 border-t px-4 py-3 sm:grid-cols-2">
          {comMeta.map((m) => (
            <BarraMeta key={m} p={p.modalidades[m]} />
          ))}
        </div>
      )}
      <DialogPlanejado aberto={editando !== null} treino={editando} onFechar={() => setEditando(null)} />
    </Card>
  )
}
