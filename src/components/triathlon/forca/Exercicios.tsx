import { useState } from 'react'
import { ArrowDownIcon, ArrowUpIcon, PlayCircleIcon, PlusIcon, TimerIcon, Trash2Icon } from 'lucide-react'

import { BotaoDemonstracao, DialogDemonstracao, GifExercicio } from '@/components/triathlon/forca/Demonstracao'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { demonstracaoDe } from '@/lib/forca/exercisedb'
import { alternativas, disponivel, EXERCICIO_POR_ID, EXERCICIOS, NOMES_GRUPO, NOMES_NIVEL, nivelPermitido } from '@/lib/forca/exercicios'
import { cn } from '@/lib/utils'
import type { Equipamento, ExercicioPrescrito, GrupoMuscular, LocalForca, NivelForca } from '@/types/triathlon'

/** "3 × 8–12", "3 × 30–45 s" */
export function prescricao(x: Pick<ExercicioPrescrito, 'series' | 'reps_min' | 'reps_max' | 'unidade'>) {
  const faixa = x.reps_min === x.reps_max ? `${x.reps_min}` : `${x.reps_min}–${x.reps_max}`
  return `${x.series} × ${faixa}${x.unidade === 'segundos' ? ' s' : ''}`
}

export const descansoTexto = (seg: number) => (seg >= 60 ? `${Math.floor(seg / 60)}min${seg % 60 ? `${seg % 60}s` : ''}` : `${seg}s`)

const kg = (n: number) => `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(n)} kg`

/** Lista dos exercícios de um treino, com a orientação de execução ao tocar. */
export function ListaExercicios({ exercicios, compacta }: { exercicios: ExercicioPrescrito[]; compacta?: boolean }) {
  const [demo, setDemo] = useState<ExercicioPrescrito | null>(null)
  if (!exercicios.length) return <p className="text-muted-foreground text-sm">Nenhum exercício.</p>
  return (
    <>
      <ol className="divide-y rounded-lg border">
        {exercicios.map((x, i) => (
          <li key={`${x.exercicio_id}-${i}`}>
            <details className="group">
              <summary className="hover:bg-accent/40 flex cursor-pointer list-none items-start gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
                <span className="text-muted-foreground w-4 pt-0.5 text-xs tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{x.nome}</span>
                  <span className="text-muted-foreground text-xs">
                    {NOMES_GRUPO[x.grupo]}
                    {!compacta && ` · ${NOMES_NIVEL[x.nivel]}`}
                    {x.carga_kg ? ` · referência ${kg(x.carga_kg)}` : ''}
                  </span>
                </span>
                <span className="shrink-0 text-right text-sm tabular-nums">
                  <span className="font-medium">{prescricao(x)}</span>
                  <span className="text-muted-foreground flex items-center justify-end gap-0.5 text-xs">
                    <TimerIcon className="size-3" aria-hidden />
                    {descansoTexto(x.descanso_seg)}
                  </span>
                </span>
              </summary>
              <div className="flex items-start gap-3 px-3 pb-2.5 pl-10">
                {demonstracaoDe(x) && (
                  <button type="button" onClick={() => setDemo(x)} aria-label={`Ver demonstração de ${x.nome}`} className="shrink-0">
                    <GifExercicio id={demonstracaoDe(x)!} nome={x.nome} className="size-20" />
                  </button>
                )}
                <div className="grid gap-1">
                  <p className="text-muted-foreground text-xs leading-relaxed">{x.orientacao || 'Sem orientação cadastrada.'}</p>
                  <BotaoDemonstracao onClick={() => setDemo(x)} className="-ml-2 w-fit" />
                </div>
              </div>
            </details>
          </li>
        ))}
      </ol>
      <DialogDemonstracao exercicio={demo} onFechar={() => setDemo(null)} />
    </>
  )
}

interface PropsEditor {
  exercicios: ExercicioPrescrito[]
  onChange: (lista: ExercicioPrescrito[]) => void
  local: LocalForca
  equipamentos: Equipamento[]
  nivel: NivelForca
}

const GRUPOS = Object.keys(NOMES_GRUPO) as GrupoMuscular[]

/** Edita os exercícios de um treino: trocar por alternativa, séries, repetições, descanso, ordem. */
export function EditorExercicios({ exercicios, onChange, local, equipamentos, nivel }: PropsEditor) {
  const [novo, setNovo] = useState('')
  const [demo, setDemo] = useState<number | null>(null)
  const mudar = (i: number, m: Partial<ExercicioPrescrito>) => onChange(exercicios.map((x, j) => (j === i ? { ...x, ...m } : x)))
  const mover = (i: number, passo: number) => {
    const lista = [...exercicios]
    const [x] = lista.splice(i, 1)
    lista.splice(i + passo, 0, x)
    onChange(lista)
  }
  const numero = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(v) || min)))

  function trocar(i: number, id: string) {
    const x = EXERCICIO_POR_ID.get(id)
    if (!x) return
    mudar(i, { exercicio_id: x.id, nome: x.nome, grupo: x.grupo, orientacao: x.orientacao, nivel: x.nivel, unidade: x.unidade ?? 'reps', carga_kg: null, exercisedb_id: null })
  }

  function adicionar() {
    if (!novo) return
    if (novo === 'livre') {
      onChange([
        ...exercicios,
        { exercicio_id: `livre-${Date.now()}`, nome: 'Novo exercício', grupo: 'core', series: 3, reps_min: 10, reps_max: 12, unidade: 'reps', descanso_seg: 60, orientacao: '', nivel },
      ])
    } else {
      const x = EXERCICIO_POR_ID.get(novo)!
      onChange([
        ...exercicios,
        {
          exercicio_id: x.id,
          nome: x.nome,
          grupo: x.grupo,
          series: 3,
          reps_min: x.unidade === 'segundos' ? 30 : 10,
          reps_max: x.unidade === 'segundos' ? 45 : 12,
          unidade: x.unidade ?? 'reps',
          descanso_seg: x.tipo === 'composto' ? 90 : 60,
          orientacao: x.orientacao,
          nivel: x.nivel,
        },
      ])
    }
    setNovo('')
  }

  const catalogo = EXERCICIOS.filter((x) => disponivel(x, local, equipamentos) && nivelPermitido(x.nivel, nivel))

  return (
    <div className="grid gap-2">
      <ol className="grid gap-2">
        {exercicios.map((x, i) => {
          const livre = x.exercicio_id.startsWith('livre-')
          const opcoes = livre ? [] : alternativas(x.exercicio_id, local, equipamentos, nivel)
          return (
            <li key={`${x.exercicio_id}-${i}`} className="grid gap-2 rounded-lg border p-2.5">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-4 text-xs tabular-nums">{i + 1}</span>
                {livre ? (
                  <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto] gap-2">
                    <Input value={x.nome} onChange={(e) => mudar(i, { nome: e.target.value })} aria-label="Nome do exercício" className="h-8" />
                    <NativeSelect value={x.grupo} onChange={(e) => mudar(i, { grupo: e.target.value as GrupoMuscular })} aria-label="Grupo muscular" className="w-36">
                      {GRUPOS.map((g) => (
                        <option key={g} value={g}>
                          {NOMES_GRUPO[g]}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                ) : (
                  <NativeSelect value={x.exercicio_id} onChange={(e) => trocar(i, e.target.value)} aria-label={`Trocar ${x.nome}`} className="min-w-0 flex-1">
                    <option value={x.exercicio_id}>{x.nome}</option>
                    {opcoes.length > 0 && (
                      <optgroup label="Alternativas equivalentes">
                        {opcoes.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.nome}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </NativeSelect>
                )}
                <div className="flex shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className={cn(demonstracaoDe(x) ? 'text-primary' : 'text-muted-foreground')}
                    aria-label={demonstracaoDe(x) ? `Ver demonstração de ${x.nome}` : `Escolher demonstração para ${x.nome}`}
                    title={demonstracaoDe(x) ? 'Como fazer' : 'Escolher demonstração'}
                    onClick={() => setDemo(i)}
                  >
                    <PlayCircleIcon />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Subir" disabled={i === 0} onClick={() => mover(i, -1)}>
                    <ArrowUpIcon />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Descer" disabled={i === exercicios.length - 1} onClick={() => mover(i, 1)}>
                    <ArrowDownIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Remover ${x.nome}`}
                    onClick={() => onChange(exercicios.filter((_, j) => j !== i))}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 pl-6">
                {(
                  [
                    ['Séries', 'series', 1, 10],
                    [x.unidade === 'segundos' ? 'Seg. mín.' : 'Reps mín.', 'reps_min', 1, 300],
                    [x.unidade === 'segundos' ? 'Seg. máx.' : 'Reps máx.', 'reps_max', 1, 300],
                    ['Descanso (s)', 'descanso_seg', 0, 600],
                  ] as const
                ).map(([rotulo, campo, min, max]) => (
                  <label key={campo} className="grid gap-0.5">
                    <span className="text-muted-foreground text-[11px]">{rotulo}</span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={min}
                      max={max}
                      value={x[campo]}
                      onChange={(e) => {
                        const v = numero(e.target.value, min, max)
                        if (campo === 'reps_min') mudar(i, { reps_min: v, reps_max: Math.max(v, x.reps_max) })
                        else if (campo === 'reps_max') mudar(i, { reps_max: v, reps_min: Math.min(v, x.reps_min) })
                        else mudar(i, { [campo]: v })
                      }}
                      className={cn('h-8 tabular-nums')}
                    />
                  </label>
                ))}
              </div>
            </li>
          )
        })}
      </ol>
      <div className="flex gap-2">
        <NativeSelect value={novo} onChange={(e) => setNovo(e.target.value)} aria-label="Exercício para adicionar" className="min-w-0 flex-1">
          <option value="">Adicionar exercício…</option>
          {GRUPOS.map((g) => {
            const lista = catalogo.filter((x) => x.grupo === g)
            return lista.length ? (
              <optgroup key={g} label={NOMES_GRUPO[g]}>
                {lista.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nome}
                  </option>
                ))}
              </optgroup>
            ) : null
          })}
          <option value="livre">Outro (digitar o nome)</option>
        </NativeSelect>
        <Button type="button" variant="outline" onClick={adicionar} disabled={!novo}>
          <PlusIcon />
          Adicionar
        </Button>
      </div>
      <DialogDemonstracao
        exercicio={demo === null ? null : (exercicios[demo] ?? null)}
        onFechar={() => setDemo(null)}
        onVincular={(id) => demo !== null && mudar(demo, { exercisedb_id: id })}
      />
    </div>
  )
}
