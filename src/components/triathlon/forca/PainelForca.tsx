import { useMemo, useState } from 'react'
import { ArrowDownIcon, ArrowUpIcon, EqualIcon, SparklesIcon } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { Bloco } from '@/components/triathlon/corpo/Blocos'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
import { useTema } from '@/hooks/useTema'
import { semanasAte, statusEfetivo } from '@/lib/agenda'
import { PALETA } from '@/lib/cores'
import { NOMES_GRUPO } from '@/lib/forca/exercicios'
import { sessoesDoExercicio, seriesPorGrupo, sugerirCarga, volumePorSemana, type SugestaoCarga } from '@/lib/forca/progressao'
import { dataLocal, inicioSemana, somarDias } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { ExercicioPrescrito, GrupoMuscular, RotinaForca, SerieForca, TreinoPlanejado } from '@/types/triathlon'

const EIXO = { tickLine: false, axisLine: false, tick: { fill: 'var(--chart-axis)', fontSize: 11 } }
const inteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const um = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`
const toneladas = (kg: number) => (kg >= 1000 ? `${um.format(kg / 1000)} t` : `${inteiro.format(kg)} kg`)

const ICONE: Record<SugestaoCarga['tipo'], typeof ArrowUpIcon> = { subir: ArrowUpIcon, manter: EqualIcon, reduzir: ArrowDownIcon, primeira: SparklesIcon }

interface Props {
  series: SerieForca[]
  /** treinos de academia planejados (para conclusão semanal) */
  planejados: TreinoPlanejado[]
  rotina: RotinaForca | null
}

export function PainelForca({ series, planejados, rotina }: Props) {
  const { cor } = useTema()
  const hoje = dataLocal(new Date())
  const semana = inicioSemana(hoje)
  const anterior = somarDias(semana, -7)
  const forca = planejados.filter((t) => t.modalidade === 'forca')

  const daSemana = forca.filter((t) => t.data >= semana && t.data <= somarDias(semana, 6))
  const concluidos = daSemana.filter((t) => t.status === 'concluido').length
  const encerrados = daSemana.filter((t) => statusEfetivo(t, hoje).status !== 'pendente').length
  const volumes = volumePorSemana(series, semanasAte(semana, 8))
  const volAtual = volumes.at(-1)!.volume
  const volAnterior = volumes.at(-2)!.volume
  const delta = volAnterior ? (volAtual - volAnterior) / volAnterior : null

  const grupos = useMemo(() => {
    const esta = seriesPorGrupo(series, semana, somarDias(semana, 6))
    const passada = seriesPorGrupo(series, anterior, somarDias(anterior, 6))
    return (Object.keys(NOMES_GRUPO) as GrupoMuscular[])
      .map((g) => ({ g, esta: esta[g] ?? 0, passada: passada[g] ?? 0 }))
      .filter((x) => x.esta || x.passada)
      .sort((a, b) => b.esta - a.esta || b.passada - a.passada)
  }, [series, semana, anterior])
  const maxGrupo = Math.max(1, ...grupos.flatMap((x) => [x.esta, x.passada]))

  // exercícios com carga registrada, para o gráfico de evolução
  const comCarga = useMemo(() => {
    const nomes = new Map<string, string>()
    const sessoes = new Map<string, Set<string>>()
    for (const x of series) {
      if (!x.carga_kg) continue
      nomes.set(x.exercicio_id, x.exercicio_nome)
      sessoes.set(x.exercicio_id, (sessoes.get(x.exercicio_id) ?? new Set()).add(x.planejado_id))
    }
    return [...nomes.entries()]
      .map(([id, nome]) => ({ id, nome, sessoes: sessoes.get(id)!.size }))
      .sort((a, b) => a.nome.localeCompare(b.nome))
  }, [series])
  const [exercicio, setExercicio] = useState('')
  // começa no exercício com mais sessões registradas
  const maisFeito = [...comCarga].sort((a, b) => b.sessoes - a.sessoes)[0]?.id ?? ''
  const escolhido = comCarga.some((x) => x.id === exercicio) ? exercicio : maisFeito
  const [todaProgressao, setTodaProgressao] = useState(false)
  const evolucao = useMemo(
    () =>
      sessoesDoExercicio(series, escolhido)
        .reverse()
        .map((s) => ({ rotulo: ddmm(s.data), data: s.data, carga: s.carga, e1rm: s.e1rm ? Math.round(s.e1rm * 10) / 10 : null })),
    [series, escolhido],
  )

  // progressão: um item por exercício da rotina ativa
  const progressao = useMemo(() => {
    if (!rotina) return []
    const vistos = new Map<string, ExercicioPrescrito>()
    for (const t of rotina.treinos) for (const x of t.exercicios) if (!vistos.has(x.exercicio_id)) vistos.set(x.exercicio_id, x)
    const ordem: Record<SugestaoCarga['tipo'], number> = { subir: 0, reduzir: 1, manter: 2, primeira: 3 }
    return [...vistos.values()]
      .map((x) => ({ x, sug: sugerirCarga(x, sessoesDoExercicio(series, x.exercicio_id)) }))
      .sort((a, b) => ordem[a.sug.tipo] - ordem[b.sug.tipo])
  }, [rotina, series])

  const historico = useMemo(() => {
    const porSessao = new Map<string, SerieForca[]>()
    for (const x of series) porSessao.set(x.planejado_id, [...(porSessao.get(x.planejado_id) ?? []), x])
    return [...porSessao.entries()]
      .map(([id, lista]) => ({
        id,
        data: lista[0].data,
        nome: forca.find((t) => t.id === id)?.nome ?? 'Treino de academia',
        series: lista.length,
        exercicios: new Set(lista.map((x) => x.exercicio_id)).size,
        volume: lista.reduce((s, x) => s + (x.carga_kg ?? 0) * (x.repeticoes ?? 0), 0),
      }))
      .sort((a, b) => b.data.localeCompare(a.data))
      .slice(0, 10)
  }, [series, forca])

  const corVolume = cor(PALETA[3].claro)
  const corCarga = cor(PALETA[0].claro)

  return (
    <div className="grid gap-4 sm:gap-5">
      <section aria-label="Esta semana" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Bloco rotulo="Treinos planejados" valor={String(daSemana.length)} detalhe="academia nesta semana" />
        <Bloco rotulo="Concluídos" valor={String(concluidos)} detalhe={encerrados > concluidos ? `${encerrados - concluidos} perdido(s)` : 'nenhum perdido'} />
        <Bloco rotulo="Conclusão" valor={daSemana.length ? `${Math.round((concluidos / daSemana.length) * 100)}%` : '—'} detalhe="concluídos ÷ planejados" />
        <Bloco
          rotulo="Volume da semana"
          valor={toneladas(volAtual)}
          detalhe={delta === null ? 'carga × repetições' : `${delta >= 0 ? '+' : '−'}${inteiro.format(Math.abs(delta * 100))}% vs. semana passada`}
        />
      </section>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <Card className="gap-3">
          <CardHeader>
            <CardTitle>Volume por semana</CardTitle>
            <CardDescription>Soma de carga × repetições das últimas 8 semanas.</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            {volumes.every((v) => !v.volume) ? (
              <p className="text-muted-foreground py-10 text-center text-sm">Registre a execução dos treinos para ver o volume.</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumes.map((v) => ({ ...v, rotulo: ddmm(v.semana) }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                    <XAxis dataKey="rotulo" {...EIXO} axisLine={{ stroke: 'var(--chart-grid)' }} />
                    <YAxis {...EIXO} width={48} tickFormatter={(v: number) => (v >= 1000 ? `${um.format(v / 1000)} t` : String(v))} />
                    <Tooltip
                      cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                      content={({ active, payload }) => {
                        const p = payload?.[0]?.payload as (typeof volumes)[number] | undefined
                        if (!active || !p) return null
                        return (
                          <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
                            <div className="font-medium">Semana de {ddmm(p.semana)}</div>
                            <div className="tabular-nums">Volume: {toneladas(p.volume)}</div>
                            <div className="text-muted-foreground tabular-nums">
                              {p.sessoes} treino(s) · {p.series} séries
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="volume" fill={corVolume} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="gap-3">
          <CardHeader>
            <CardTitle>Grupos musculares</CardTitle>
            <CardDescription>Séries por grupo nesta semana e na passada. Para hipertrofia, 10 a 20 séries por grupo na semana é uma boa faixa.</CardDescription>
          </CardHeader>
          <CardContent>
            {grupos.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center text-sm">Nenhuma série registrada nas últimas duas semanas.</p>
            ) : (
              <>
                <div className="text-muted-foreground mb-2 flex gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm" style={{ backgroundColor: corVolume }} />
                    Esta semana
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="bg-muted-foreground/30 size-2.5 rounded-sm" />
                    Semana passada
                  </span>
                </div>
                <ul className="grid gap-2">
                  {grupos.map(({ g, esta, passada }) => (
                    <li key={g} className="grid grid-cols-[8rem_1fr_3.5rem] items-center gap-2 text-sm">
                      <span className="truncate">{NOMES_GRUPO[g]}</span>
                      <span className="grid gap-0.5" aria-hidden>
                        <span className="h-2 rounded-sm" style={{ width: `${(esta / maxGrupo) * 100}%`, backgroundColor: corVolume, minWidth: esta ? 2 : 0 }} />
                        <span className="bg-muted-foreground/30 h-1.5 rounded-sm" style={{ width: `${(passada / maxGrupo) * 100}%`, minWidth: passada ? 2 : 0 }} />
                      </span>
                      <span className="text-right text-xs tabular-nums">
                        <strong>{esta}</strong> <span className="text-muted-foreground">/ {passada}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <Card className="gap-3">
          <CardHeader className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>Evolução de carga</CardTitle>
              <CardDescription>Maior carga de cada sessão e a 1RM estimada (Epley).</CardDescription>
            </div>
            {comCarga.length > 0 && (
              <NativeSelect value={escolhido} onChange={(e) => setExercicio(e.target.value)} aria-label="Exercício" className="w-52">
                {comCarga.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nome}
                  </option>
                ))}
              </NativeSelect>
            )}
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            {evolucao.length < 2 ? (
              <p className="text-muted-foreground py-10 text-center text-sm">
                {comCarga.length ? 'Precisa de duas sessões com carga neste exercício.' : 'Registre cargas na execução dos treinos para ver a evolução.'}
              </p>
            ) : (
              <>
                <div className="text-muted-foreground mb-1 flex gap-4 px-2 text-xs sm:px-0">
                  <span className="flex items-center gap-1.5">
                    <span className="h-0.5 w-3.5 rounded-full" style={{ backgroundColor: corCarga }} />
                    Carga (kg)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 border-t-2 border-dashed" style={{ borderColor: 'var(--chart-axis)' }} />
                    1RM estimada
                  </span>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evolucao} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                      <XAxis dataKey="rotulo" {...EIXO} axisLine={{ stroke: 'var(--chart-grid)' }} minTickGap={16} />
                      <YAxis {...EIXO} width={40} domain={[(min: number) => Math.floor(min * 0.9), (max: number) => Math.ceil(max * 1.05)]} />
                      <Tooltip
                        cursor={{ stroke: 'var(--chart-axis)', strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                          const p = payload?.[0]?.payload as (typeof evolucao)[number] | undefined
                          if (!active || !p) return null
                          return (
                            <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
                              <div className="font-medium">{p.data.split('-').reverse().join('/')}</div>
                              <div className="tabular-nums">Carga: {p.carga !== null ? `${um.format(p.carga)} kg` : '—'}</div>
                              <div className="text-muted-foreground tabular-nums">1RM estimada: {p.e1rm !== null ? `${um.format(p.e1rm)} kg` : '—'}</div>
                            </div>
                          )
                        }}
                      />
                      <Line type="monotone" dataKey="carga" stroke={corCarga} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)', fill: corCarga }} isAnimationActive={false} />
                      <Line type="monotone" dataKey="e1rm" stroke="var(--chart-axis)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="gap-3">
          <CardHeader>
            <CardTitle>Progressão de carga</CardTitle>
            <CardDescription>
              Sobe quando todas as séries chegam ao topo da faixa com boa técnica e esforço até RPE 8. Sem esforço registrado, o app não sugere subir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {progressao.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">Monte uma rotina para acompanhar a progressão de cada exercício.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {(todaProgressao ? progressao : progressao.slice(0, Math.max(6, progressao.filter((p) => p.sug.tipo === 'subir' || p.sug.tipo === 'reduzir').length))).map(({ x, sug }) => {
                  const Icone = ICONE[sug.tipo]
                  return (
                    <li key={x.exercicio_id} className="flex gap-2.5 px-3 py-2">
                      <Icone
                        className={cn(
                          'mt-0.5 size-4 shrink-0',
                          sug.tipo === 'subir' ? 'text-status-bom' : sug.tipo === 'reduzir' ? 'text-status-alerta' : 'text-muted-foreground',
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{x.nome}</span>
                        <span className="text-muted-foreground block text-xs">{sug.texto}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
            {progressao.length > 6 && (
              <button type="button" className="text-primary mt-2 text-xs font-medium hover:underline" onClick={() => setTodaProgressao(!todaProgressao)}>
                {todaProgressao ? 'Mostrar menos' : `Ver todos os ${progressao.length} exercícios`}
              </button>
            )}
          </CardContent>
        </Card>
      </div>

      {historico.length > 0 && (
        <Card className="gap-0 py-0">
          <div className="px-4 py-3 font-semibold">Histórico de treinos de academia</div>
          <div className="overflow-x-auto border-t">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-muted-foreground bg-muted/40 text-right text-xs">
                  <th className="px-4 py-2 text-left font-medium">Data</th>
                  <th className="px-2 py-2 text-left font-medium">Treino</th>
                  <th className="px-2 py-2 font-medium">Exercícios</th>
                  <th className="px-2 py-2 font-medium">Séries</th>
                  <th className="px-4 py-2 font-medium">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {historico.map((h) => (
                  <tr key={h.id} className="text-right">
                    <td className="px-4 py-2 text-left whitespace-nowrap">{h.data.split('-').reverse().join('/')}</td>
                    <td className="max-w-56 truncate px-2 py-2 text-left">{h.nome}</td>
                    <td className="px-2 py-2">{h.exercicios}</td>
                    <td className="px-2 py-2">{h.series}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{toneladas(h.volume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
