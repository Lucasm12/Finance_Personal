import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { BookOpenIcon, DumbbellIcon, EllipsisIcon, PlusIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'

import { BarraProgresso, SeloArea, SeloSituacao } from '@/components/pessoal/Comum'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useExcluirMarco, useExcluirMeta, useSalvarMarco, useSalvarMeta } from '@/hooks/usePessoal'
import { formatarData } from '@/lib/format'
import { CRITERIOS_TREINO, porcento, textoProgresso } from '@/lib/pessoal'
import { MODALIDADES } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import { ROTAS_PESSOAL } from '@/modulos'
import type { AreaVida, MarcoMeta, MetaSituacao } from '@/types/pessoal'

function Marcos({ meta, marcos }: { meta: MetaSituacao; marcos: MarcoMeta[] }) {
  const salvar = useSalvarMarco()
  const excluir = useExcluirMarco()
  const [novo, setNovo] = useState('')

  function adicionar(e: FormEvent) {
    e.preventDefault()
    const titulo = novo.trim()
    if (!titulo) return
    salvar.mutate({ dados: { meta_id: meta.id, titulo, ordem: marcos.length + 1 } }, { onSuccess: () => setNovo('') })
  }

  return (
    <div className="grid gap-1">
      <ul className="grid gap-0.5">
        {marcos.map((m) => (
          <li key={m.id} className="group flex items-center gap-2 text-sm">
            <Checkbox
              id={`marco-${m.id}`}
              checked={m.concluido}
              onCheckedChange={(v) => salvar.mutate({ id: m.id, dados: { concluido: v === true } })}
            />
            <label htmlFor={`marco-${m.id}`} className={cn('min-w-0 flex-1 cursor-pointer py-1', m.concluido && 'text-muted-foreground line-through')}>
              {m.titulo}
              {m.concluido_em && <span className="text-muted-foreground ml-1 text-xs no-underline">({formatarData(m.concluido_em).slice(0, 5)})</span>}
            </label>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 opacity-60 group-hover:opacity-100"
              aria-label={`Excluir etapa ${m.titulo}`}
              onClick={() => excluir.mutate(m.id)}
            >
              <XIcon />
            </Button>
          </li>
        ))}
      </ul>
      <form onSubmit={adicionar} className="flex gap-2">
        <Input className="h-8" maxLength={200} placeholder="Nova etapa" aria-label="Nova etapa" value={novo} onChange={(e) => setNovo(e.target.value)} />
        <Button type="submit" size="sm" variant="outline" disabled={!novo.trim() || salvar.isPending}>
          <PlusIcon />
          Etapa
        </Button>
      </form>
    </div>
  )
}

/** Uma meta: progresso (calculado no servidor), comparação com o esperado e as ações do tipo dela. */
export function CardMeta({
  meta,
  area,
  marcos = [],
  mostrarArea = false,
  compacto = false,
  onEditar,
  onProgresso,
}: {
  meta: MetaSituacao
  area?: AreaVida
  marcos?: MarcoMeta[]
  mostrarArea?: boolean
  compacto?: boolean
  onEditar?: () => void
  onProgresso?: () => void
}) {
  const salvar = useSalvarMeta()
  const excluir = useExcluirMeta()
  const [confirmando, setConfirmando] = useState(false)
  const manual = meta.origem_automatica === 'nenhuma'
  const unidade = meta.tipo === 'marcos' ? 'etapas' : meta.unidade

  function mudarStatus(status: MetaSituacao['status'], aviso: string) {
    salvar.mutate({ id: meta.id, dados: { status } }, { onSuccess: () => toast.success(aviso) })
  }

  return (
    <div className={cn('grid gap-2 rounded-xl border p-3', meta.situacao === 'atrasada' && 'border-red-500/40')}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-medium', meta.situacao === 'concluida' && 'text-muted-foreground')}>{meta.titulo}</p>
          {mostrarArea && <SeloArea area={area} />}
        </div>
        <SeloSituacao situacao={meta.situacao} />
        {!compacto && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="-mt-1 -mr-1 size-7" aria-label={`Ações da meta ${meta.titulo}`}>
                <EllipsisIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEditar && <DropdownMenuItem onSelect={onEditar}>Editar</DropdownMenuItem>}
              {meta.status === 'pausada' ? (
                <DropdownMenuItem onSelect={() => mudarStatus('em_andamento', 'Meta retomada.')}>Retomar</DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => mudarStatus('pausada', 'Meta pausada: ela sai da visão anual.')}>Pausar</DropdownMenuItem>
              )}
              {meta.status === 'concluida' ? (
                <DropdownMenuItem onSelect={() => mudarStatus('em_andamento', 'Meta reaberta.')}>Reabrir</DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => mudarStatus('concluida', 'Meta concluída. Parabéns!')}>Marcar como concluída</DropdownMenuItem>
              )}
              {meta.origem_automatica !== 'biblia' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={(e) => {
                      if (!confirmando) {
                        e.preventDefault()
                        return setConfirmando(true)
                      }
                      excluir.mutate(meta.id, { onSuccess: () => toast.success('Meta excluída.') })
                    }}
                  >
                    {confirmando ? 'Toque de novo para excluir' : 'Excluir'}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <BarraProgresso valor={meta.percentual} esperado={meta.situacao === 'concluida' ? null : meta.esperado} cor={area?.cor} rotulo={`Progresso de ${meta.titulo}`} />
      <div className="text-muted-foreground flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-xs">
        <span className="tabular-nums">
          {meta.tipo === 'sim_nao' ? (meta.valor >= 1 ? 'Feito' : 'Ainda não') : textoProgresso(meta.valor, meta.alvo, unidade)} · {porcento(meta.percentual)}
        </span>
        <span>até {formatarData(meta.fim)}</span>
      </div>
      {meta.situacao === 'atrasada' && (
        <p className="text-xs text-red-700 dark:text-red-400">
          Esperado para hoje: {porcento(meta.esperado)} · realizado: {porcento(meta.percentual)}
        </p>
      )}

      {!compacto && (
        <>
          {meta.origem_automatica === 'biblia' && (
            <Button asChild size="sm" variant="outline" className="w-fit">
              <Link to={ROTAS_PESSOAL.biblia}>
                <BookOpenIcon />
                Atualizada pela leitura
              </Link>
            </Button>
          )}
          {meta.origem_automatica === 'treino' && meta.treino_criterio && (
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <DumbbellIcon className="size-3.5" />
              Pelos treinos: {CRITERIOS_TREINO[meta.treino_criterio].rotulo.toLowerCase()}
              {meta.treino_modalidade ? ` · ${MODALIDADES[meta.treino_modalidade].nome}` : ''}
              {meta.treino_por_semana ? ` · ${meta.treino_por_semana}x por semana` : ''}
            </p>
          )}
          {manual && meta.tipo === 'numerica' && onProgresso && (
            <Button size="sm" variant="outline" className="w-fit" onClick={onProgresso}>
              <PlusIcon />
              Registrar progresso
            </Button>
          )}
          {meta.tipo === 'sim_nao' && (
            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={meta.valor >= 1}
                onCheckedChange={(v) =>
                  salvar.mutate({ id: meta.id, dados: { valor_atual: v === true ? 1 : 0, status: v === true ? 'concluida' : 'em_andamento' } })
                }
              />
              Feito
            </label>
          )}
          {meta.tipo === 'marcos' && <Marcos meta={meta} marcos={marcos} />}
        </>
      )}
    </div>
  )
}
