import { useState, type FormEvent } from 'react'
import { ArrowDownIcon, ArrowUpIcon, EqualIcon, LoaderCircleIcon, MinusIcon, PlusIcon, SparklesIcon } from 'lucide-react'
import { toast } from 'sonner'

import { BotaoDemonstracao, DialogDemonstracao } from '@/components/triathlon/forca/Demonstracao'
import { descansoTexto, prescricao } from '@/components/triathlon/forca/Exercicios'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { useRegistrarExecucao, useSeriesForca } from '@/hooks/useTriathlon'
import { NOMES_GRUPO } from '@/lib/forca/exercicios'
import { sessoesDoExercicio, sugerirCarga, type SugestaoCarga } from '@/lib/forca/progressao'
import { dataLocal, duracaoRelogio, lerDuracao, somarDias } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { ExercicioPrescrito, SerieForca, SerieForcaInput, TreinoPlanejado } from '@/types/triathlon'

interface Linha {
  series: { carga: string; reps: string }[]
  rpe: string
  tecnica: boolean
}

const texto = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n).replace('.', ','))
const lerNumero = (t: string) => {
  const v = t.trim().replace(',', '.')
  return v ? Number(v) : null
}
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`

const ICONE_SUGESTAO: Record<SugestaoCarga['tipo'], typeof ArrowUpIcon> = {
  subir: ArrowUpIcon,
  manter: EqualIcon,
  reduzir: ArrowDownIcon,
  primeira: SparklesIcon,
}

function linhasIniciais(exercicios: ExercicioPrescrito[], existentes: SerieForca[], sugestoes: SugestaoCarga[]): Linha[] {
  return exercicios.map((x, i) => {
    const feitas = existentes.filter((s) => s.exercicio_id === x.exercicio_id).sort((a, b) => a.serie - b.serie)
    if (feitas.length) {
      return {
        series: feitas.map((s) => ({ carga: texto(s.carga_kg), reps: texto(s.repeticoes) })),
        rpe: texto(feitas[0].rpe),
        tecnica: feitas.every((s) => s.tecnica_ok),
      }
    }
    const carga = sugestoes[i].carga ?? x.carga_kg ?? null
    return { series: Array.from({ length: x.series }, () => ({ carga: texto(carga), reps: '' })), rpe: '', tecnica: true }
  })
}

function FormExecucao({ treino, historico, onFechar }: { treino: TreinoPlanejado; historico: SerieForca[]; onFechar: () => void }) {
  const registrar = useRegistrarExecucao()
  const exercicios = treino.exercicios ?? []
  const anteriores = historico.filter((s) => s.planejado_id !== treino.id && s.data <= treino.data)
  const sessoes = exercicios.map((x) => sessoesDoExercicio(anteriores, x.exercicio_id))
  const sugestoes = exercicios.map((x, i) => sugerirCarga(x, sessoes[i]))
  const [linhas, setLinhas] = useState(() =>
    linhasIniciais(
      exercicios,
      historico.filter((s) => s.planejado_id === treino.id),
      sugestoes,
    ),
  )
  const [duracao, setDuracao] = useState(() => {
    const s = treino.duracao_realizada_seg ?? treino.duracao_planejada_seg
    return s ? duracaoRelogio(s) : ''
  })
  const [registrarTreino, setRegistrarTreino] = useState(!treino.treino_id)
  const [horario, setHorario] = useState(() => (treino.data === dataLocal(new Date()) ? new Date().toTimeString().slice(0, 5) : '07:00'))
  const [erro, setErro] = useState('')
  const [demo, setDemo] = useState<ExercicioPrescrito | null>(null)

  const mudar = (i: number, m: Partial<Linha>) => setLinhas((l) => l.map((x, j) => (j === i ? { ...x, ...m } : x)))
  const mudarSerie = (i: number, k: number, m: Partial<Linha['series'][number]>) =>
    setLinhas((l) => l.map((x, j) => (j === i ? { ...x, series: x.series.map((s, n) => (n === k ? { ...s, ...m } : s)) } : x)))

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const series: SerieForcaInput[] = []
    for (const [i, x] of exercicios.entries()) {
      const l = linhas[i]
      const rpe = lerNumero(l.rpe)
      let n = 0
      for (const s of l.series) {
        const carga = lerNumero(s.carga)
        const reps = lerNumero(s.reps)
        if (reps === null && carga === null) continue
        if ((carga !== null && (!Number.isFinite(carga) || carga < 0 || carga > 1000)) || (reps !== null && (!Number.isInteger(reps) || reps < 0 || reps > 600))) {
          return setErro(`${x.nome}: confira carga e repetições.`)
        }
        series.push({
          planejado_id: treino.id,
          data: treino.data,
          exercicio_id: x.exercicio_id,
          exercicio_nome: x.nome,
          grupo: x.grupo,
          serie: ++n,
          carga_kg: carga,
          repeticoes: reps,
          rpe,
          tecnica_ok: l.tecnica,
        })
      }
    }
    if (!series.length) return setErro('Registre pelo menos uma série (repetições ou carga).')
    const seg = duracao.trim() ? lerDuracao(duracao) : null
    if (duracao.trim() && !seg) return setErro('Duração no formato 45, 45:00 ou 1:20:00.')
    if (registrarTreino && !treino.treino_id && !seg) return setErro('Para registrar em Treinos, informe a duração.')
    try {
      await registrar.mutateAsync({
        planejado: treino,
        series,
        duracao_seg: seg,
        registrar:
          registrarTreino && !treino.treino_id && seg
            ? {
                origem: 'manual',
                modalidade: 'forca',
                nome: treino.nome,
                data_hora: new Date(`${treino.data}T${horario}:00`).toISOString(),
                duracao_seg: seg,
                esforco_percebido: Math.round(Math.max(0, ...linhas.map((l) => lerNumero(l.rpe) ?? 0))) || null,
              }
            : undefined,
      })
      toast.success(`Treino concluído: ${series.length} séries registradas.`)
      onFechar()
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{treino.nome}</DialogTitle>
        <DialogDescription>Registre carga e repetições de cada série. O esforço (RPE) e a técnica dizem se dá para subir a carga com segurança.</DialogDescription>
      </DialogHeader>

      <ol className="grid gap-3">
        {exercicios.map((x, i) => {
          const ultima = sessoes[i][0]
          const sug = sugestoes[i]
          const Icone = ICONE_SUGESTAO[sug.tipo]
          const l = linhas[i]
          const segundos = x.unidade === 'segundos'
          return (
            <li key={`${x.exercicio_id}-${i}`} className="grid gap-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-x-3">
                <span className="flex items-center gap-1 font-medium">
                  {i + 1}. {x.nome}
                  <BotaoDemonstracao onClick={() => setDemo(x)} />
                </span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {NOMES_GRUPO[x.grupo]} · {prescricao(x)} · descanso {descansoTexto(x.descanso_seg)}
                </span>
              </div>
              {ultima && (
                <p className="text-muted-foreground text-xs tabular-nums">
                  Última vez ({ddmm(ultima.data)}):{' '}
                  {ultima.series.map((s) => (s.carga_kg ? `${texto(s.carga_kg)} kg × ${s.repeticoes ?? '—'}` : `${s.repeticoes ?? '—'}${segundos ? ' s' : ''}`)).join(', ')}
                  {ultima.rpe !== null && ` · RPE ${texto(ultima.rpe)}`}
                </p>
              )}
              <p
                className={cn(
                  'flex items-start gap-1.5 rounded-md px-2.5 py-1.5 text-xs',
                  sug.tipo === 'subir' ? 'bg-status-bom/10' : sug.tipo === 'reduzir' ? 'bg-status-alerta/10' : 'bg-muted/60',
                )}
              >
                <Icone className={cn('mt-0.5 size-3.5 shrink-0', sug.tipo === 'subir' ? 'text-status-bom' : sug.tipo === 'reduzir' ? 'text-status-alerta' : 'text-muted-foreground')} aria-hidden />
                {sug.texto}
              </p>
              <div className="grid gap-1.5">
                <div className="text-muted-foreground grid grid-cols-[2.5rem_1fr_1fr] gap-2 text-[11px]">
                  <span>Série</span>
                  <span>Carga (kg)</span>
                  <span>{segundos ? 'Segundos' : 'Repetições'}</span>
                </div>
                {l.series.map((s, k) => (
                  <div key={k} className="grid grid-cols-[2.5rem_1fr_1fr] items-center gap-2">
                    <span className="text-sm tabular-nums">{k + 1}</span>
                    <Input inputMode="decimal" value={s.carga} placeholder={segundos ? '—' : '0'} onChange={(e) => mudarSerie(i, k, { carga: e.target.value })} aria-label={`${x.nome}, série ${k + 1}, carga`} className="h-8 tabular-nums" />
                    <Input
                      inputMode="numeric"
                      value={s.reps}
                      placeholder={x.reps_min === x.reps_max ? String(x.reps_max) : `${x.reps_min}–${x.reps_max}`}
                      onChange={(e) => mudarSerie(i, k, { reps: e.target.value })}
                      aria-label={`${x.nome}, série ${k + 1}, ${segundos ? 'segundos' : 'repetições'}`}
                      className="h-8 tabular-nums"
                    />
                  </div>
                ))}
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => mudar(i, { series: [...l.series, { carga: l.series.at(-1)?.carga ?? '', reps: '' }] })}>
                    <PlusIcon />
                    Série
                  </Button>
                  {l.series.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" className="text-muted-foreground h-7" onClick={() => mudar(i, { series: l.series.slice(0, -1) })}>
                      <MinusIcon />
                      Série
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label className="flex items-center gap-2 text-xs">
                  Esforço
                  <NativeSelect value={l.rpe} onChange={(e) => mudar(i, { rpe: e.target.value })} className="w-44" aria-label={`Esforço em ${x.nome}`}>
                    <option value="">—</option>
                    <option value="6">RPE 6 — leve, sobraram 4+</option>
                    <option value="7">RPE 7 — sobraram 3</option>
                    <option value="8">RPE 8 — sobraram 2</option>
                    <option value="9">RPE 9 — sobrou 1</option>
                    <option value="10">RPE 10 — no limite</option>
                  </NativeSelect>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox checked={l.tecnica} onCheckedChange={(v) => mudar(i, { tecnica: v === true })} />
                  Técnica boa em todas as séries
                </label>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="grid gap-3 rounded-lg border p-3">
        <div className="grid w-40 gap-1.5">
          <Label htmlFor="exec-dur" className="text-xs">
            Duração do treino
          </Label>
          <Input id="exec-dur" inputMode="numeric" placeholder="1:00:00" value={duracao} onChange={(e) => setDuracao(e.target.value)} />
        </div>
        {!treino.treino_id && (
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={registrarTreino} onCheckedChange={(v) => setRegistrarTreino(v === true)} className="mt-0.5" />
            <span>
              Registrar também em Treinos
              <span className="text-muted-foreground block text-xs">Entra na carga e na forma. O esforço vai como o maior RPE do treino.</span>
            </span>
          </label>
        )}
        {registrarTreino && !treino.treino_id && (
          <div className="grid w-32 gap-1.5 pl-6">
            <Label htmlFor="exec-hora" className="text-xs">
              Horário
            </Label>
            <Input id="exec-hora" type="time" value={horario} onChange={(e) => setHorario(e.target.value)} />
          </div>
        )}
      </div>

      {erro && <p className="text-destructive text-sm">{erro}</p>}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={registrar.isPending}>
          {registrar.isPending && <LoaderCircleIcon className="animate-spin" />}
          Concluir treino
        </Button>
      </DialogFooter>
      <DialogDemonstracao exercicio={demo} onFechar={() => setDemo(null)} />
    </form>
  )
}

function Carregar({ treino, onFechar }: { treino: TreinoPlanejado; onFechar: () => void }) {
  // 6 meses de histórico bastam para a progressão de cada exercício
  const historico = useSeriesForca(somarDias(treino.data, -180), treino.data)
  if (historico.isLoading) return <Skeleton className="h-72" />
  if (historico.error) return <p className="text-destructive text-sm">Não foi possível carregar o histórico de cargas. Rode a migration de musculação no Supabase.</p>
  return <FormExecucao treino={treino} historico={historico.data ?? []} onFechar={onFechar} />
}

/** Registra a execução de um treino de academia, série por série. */
export function DialogExecucao({ treino, onFechar }: { treino: TreinoPlanejado | null; onFechar: () => void }) {
  return (
    <Dialog open={treino !== null} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">{treino && <Carregar key={treino.id} treino={treino} onFechar={onFechar} />}</DialogContent>
    </Dialog>
  )
}
