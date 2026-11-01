import { useMemo, useState, type ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTema } from '@/hooks/useTema'
import { usePerfilAtleta, usePesagens, useTreinosRecentes } from '@/hooks/useTriathlon'
import { PALETA } from '@/lib/cores'
import {
  correlacao,
  dataLocal,
  diaMesCurto,
  duracaoCurta,
  formatarDecimal,
  formatarPace,
  inicioSemana,
  lerForma,
  MODALIDADES,
  ORDEM_MODALIDADES,
  recordes,
  semanas as calcularSemanas,
  serieForma,
} from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { Modalidade } from '@/types/triathlon'

const PERIODOS = [
  { semanas: 12, rotulo: '12 semanas' },
  { semanas: 26, rotulo: '6 meses' },
  { semanas: 52, rotulo: '1 ano' },
]

const EIXO = { tickLine: false, axisLine: false, tick: { fill: 'var(--chart-axis)', fontSize: 11 } }

function Caixa({ titulo, linhas }: { titulo: string; linhas: [ReactNode, string | null, string?][] }) {
  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium">{titulo}</div>
      {linhas.map(([rotulo, valor, cor], i) => (
        <div key={i} className="flex items-center gap-2 tabular-nums">
          {cor && <span className="size-2 rounded-full" style={{ backgroundColor: cor }} />}
          <span className="text-muted-foreground">{rotulo}</span>
          <span className="ml-auto font-medium">{valor ?? '—'}</span>
        </div>
      ))}
    </div>
  )
}

function Legenda({ itens }: { itens: { rotulo: string; cor: string }[] }) {
  return (
    <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {itens.map((i) => (
        <li key={i.rotulo} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: i.cor }} />
          {i.rotulo}
        </li>
      ))}
    </ul>
  )
}

export default function EvolucaoTriathlon() {
  const treinos = useTreinosRecentes()
  const perfil = usePerfilAtleta()
  const pesagens = usePesagens()
  const { cor } = useTema()
  const [periodo, setPeriodo] = useState(12)

  const hoje = dataLocal(new Date())
  const lista = treinos.data ?? []
  const limiares = perfil.data

  const dados = useMemo(() => {
    const semanas = calcularSemanas(lista, limiares, periodo, hoje)
    const inicio = semanas[0].inicio
    const forma = serieForma(lista, limiares, inicio, hoje)
    const pesosPorSemana = new Map<string, number[]>()
    for (const p of pesagens.data ?? []) {
      const s = inicioSemana(p.data)
      pesosPorSemana.set(s, [...(pesosPorSemana.get(s) ?? []), p.peso_kg])
    }
    const linhasSemana = semanas.map((s) => {
      const pesos = pesosPorSemana.get(s.inicio)
      // ritmo médio da semana por modalidade (corrida/natação: seg por unidade; ciclismo: km/h)
      return {
        rotulo: diaMesCurto(s.inicio),
        inicio: s.inicio,
        corrida: s.ritmo.corrida ?? null,
        ciclismo: s.ritmo.ciclismo ?? null,
        natacao: s.ritmo.natacao ?? null,
        peso: pesos ? Number((pesos.reduce((a, b) => a + b, 0) / pesos.length).toFixed(1)) : null,
      }
    })
    const pares = linhasSemana
      .filter((l) => l.peso !== null && l.corrida !== null)
      .map((l) => ({ peso: l.peso as number, pace: l.corrida as number, rotulo: l.rotulo }))
    return {
      volume: semanas.map((s) => ({ rotulo: diaMesCurto(s.inicio), inicio: s.inicio, ...s.horas, total: s.horasTotal })),
      forma: forma.map((d) => ({ ...d, rotulo: diaMesCurto(d.data) })),
      linhasSemana,
      pares,
      r: correlacao(pares.map((p) => [p.peso, p.pace])),
      recordes: recordes(lista),
    }
  }, [lista, limiares, periodo, hoje, pesagens.data])

  if (treinos.isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    )
  }

  // condicionamento/fadiga em violeta/laranja; a forma usa o par divergente azul/vermelho
  const corCtl = cor(PALETA[6].claro)
  const corAtl = cor(PALETA[1].claro)
  const corPositivo = cor(PALETA[0].claro)
  const corNegativo = cor(PALETA[7].claro)
  const hojeForma = dados.forma.at(-1)
  const intervaloX = Math.max(0, Math.floor(dados.volume.length / 8) - 1)

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Evolução</h1>
          <p className="text-muted-foreground text-sm">Volume, carga, ritmos e a relação com o seu peso.</p>
        </div>
        <div className="bg-muted flex gap-1 rounded-lg p-1" role="radiogroup" aria-label="Período">
          {PERIODOS.map((p) => (
            <button
              key={p.semanas}
              type="button"
              role="radio"
              aria-checked={periodo === p.semanas}
              onClick={() => setPeriodo(p.semanas)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                periodo === p.semanas ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
      </div>

      {lista.length === 0 && (
        <Card className="items-center px-6 py-10 text-center">
          <p className="text-muted-foreground text-sm">Ainda não há treinos para mostrar a evolução.</p>
        </Card>
      )}

      {/* Volume semanal */}
      <Card className="gap-3">
        <CardHeader>
          <CardTitle>Volume semanal</CardTitle>
          <CardDescription>Horas de treino por semana, por modalidade.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 px-2 sm:px-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dados.volume} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="18%">
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="rotulo" {...EIXO} axisLine={{ stroke: 'var(--chart-grid)' }} interval={intervaloX} />
                <YAxis {...EIXO} width={40} tickFormatter={(v: number) => `${v}h`} />
                <Tooltip
                  cursor={{ fill: 'var(--accent)', opacity: 0.6 }}
                  content={({ active, payload }) => {
                    const s = payload?.[0]?.payload as (typeof dados.volume)[number] | undefined
                    if (!active || !s) return null
                    return (
                      <Caixa
                        titulo={`Semana de ${s.rotulo} · ${duracaoCurta(s.total * 3600)}`}
                        linhas={ORDEM_MODALIDADES.filter((m) => s[m] > 0).map((m) => [
                          MODALIDADES[m].nome,
                          duracaoCurta(s[m] * 3600),
                          cor(MODALIDADES[m].cor),
                        ])}
                      />
                    )
                  }}
                />
                {ORDEM_MODALIDADES.map((m, i) => (
                  <Bar
                    key={m}
                    dataKey={m}
                    stackId="v"
                    fill={cor(MODALIDADES[m].cor)}
                    stroke="var(--card)"
                    strokeWidth={1}
                    radius={i === ORDEM_MODALIDADES.length - 1 ? [3, 3, 0, 0] : undefined}
                    maxBarSize={36}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Legenda itens={ORDEM_MODALIDADES.map((m) => ({ rotulo: MODALIDADES[m].nome, cor: cor(MODALIDADES[m].cor) }))} />
          <details>
            <summary className="text-muted-foreground cursor-pointer text-sm select-none">Ver como tabela</summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-xs tabular-nums">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-1 text-left font-medium">Semana</th>
                    {ORDEM_MODALIDADES.map((m) => (
                      <th key={m} className="py-1 pl-2 text-right font-medium">
                        {MODALIDADES[m].nome}
                      </th>
                    ))}
                    <th className="py-1 pl-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[...dados.volume].reverse().map((s) => (
                    <tr key={s.inicio}>
                      <td className="py-1">{s.rotulo}</td>
                      {ORDEM_MODALIDADES.map((m) => (
                        <td key={m} className="py-1 pl-2 text-right">
                          {s[m] ? duracaoCurta(s[m] * 3600) : '—'}
                        </td>
                      ))}
                      <td className="py-1 pl-2 text-right font-medium">{duracaoCurta(s.total * 3600)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </CardContent>
      </Card>

      {/* Condicionamento, fadiga e forma */}
      <Card className="gap-3">
        <CardHeader>
          <CardTitle>Condicionamento, fadiga e forma</CardTitle>
          <CardDescription>
            Calculados a partir da carga de cada treino{limiares?.ftp_w || limiares?.fc_limiar ? '' : ' (configure seus limiares no Perfil do atleta para mais precisão)'}.
            {hojeForma && (
              <>
                {' '}Hoje: <strong className="text-foreground">{lerForma(hojeForma.tsb).rotulo}</strong>.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-1 px-2 sm:px-6">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dados.forma} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} syncId="forma">
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="rotulo" {...EIXO} hide />
                <YAxis {...EIXO} width={40} />
                <Tooltip
                  content={({ active, payload }) => {
                    const d = payload?.[0]?.payload as (typeof dados.forma)[number] | undefined
                    if (!active || !d) return null
                    return (
                      <Caixa
                        titulo={d.data.split('-').reverse().join('/')}
                        linhas={[
                          ['Carga do dia', String(d.carga)],
                          ['Condicionamento', String(Math.round(d.ctl)), corCtl],
                          ['Fadiga', String(Math.round(d.atl)), corAtl],
                          ['Forma', String(Math.round(d.tsb))],
                        ]}
                      />
                    )
                  }}
                />
                <Line type="monotone" dataKey="ctl" stroke={corCtl} strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="atl" stroke={corAtl} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dados.forma} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} syncId="forma" barCategoryGap={1}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="rotulo" {...EIXO} axisLine={{ stroke: 'var(--chart-grid)' }} interval={Math.max(0, Math.floor(dados.forma.length / 8) - 1)} />
                <YAxis {...EIXO} width={40} />
                <ReferenceLine y={0} stroke="var(--chart-axis)" />
                <Tooltip cursor={{ fill: 'var(--accent)', opacity: 0.6 }} content={() => null} />
                <Bar dataKey="tsb" isAnimationActive={false}>
                  {dados.forma.map((d) => (
                    <Cell key={d.data} fill={d.tsb >= 0 ? corPositivo : corNegativo} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Legenda
            itens={[
              { rotulo: 'Condicionamento (42 dias)', cor: corCtl },
              { rotulo: 'Fadiga (7 dias)', cor: corAtl },
              { rotulo: 'Forma positiva (descansado)', cor: corPositivo },
              { rotulo: 'Forma negativa (cansado)', cor: corNegativo },
            ]}
          />
        </CardContent>
      </Card>

      {/* Ritmos */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
        {(
          [
            { m: 'corrida', titulo: 'Pace na corrida', unidade: '/km', invertido: true },
            { m: 'ciclismo', titulo: 'Velocidade no ciclismo', unidade: 'km/h', invertido: false },
            { m: 'natacao', titulo: 'Ritmo na natação', unidade: '/100 m', invertido: true },
          ] as { m: Modalidade; titulo: string; unidade: string; invertido: boolean }[]
        ).map(({ m, titulo, unidade, invertido }) => {
          const fmt = (v: number) => (invertido ? formatarPace(v) : formatarDecimal(v))
          const temDados = dados.linhasSemana.some((l) => l[m as 'corrida'] !== null)
          return (
            <Card key={m} className="gap-3">
              <CardHeader>
                <CardTitle className="text-base">{titulo}</CardTitle>
                <CardDescription>Média semanal ({unidade}){invertido ? ' · para cima = mais rápido' : ''}</CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:px-4">
                {temDados ? (
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dados.linhasSemana} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                        <XAxis dataKey="rotulo" {...EIXO} axisLine={{ stroke: 'var(--chart-grid)' }} interval={Math.max(0, Math.floor(dados.linhasSemana.length / 4) - 1)} />
                        <YAxis {...EIXO} width={44} reversed={invertido} domain={['auto', 'auto']} tickFormatter={fmt} />
                        <Tooltip
                          content={({ active, payload }) => {
                            const l = payload?.[0]?.payload as (typeof dados.linhasSemana)[number] | undefined
                            const v = l?.[m as 'corrida']
                            if (!active || !l) return null
                            return <Caixa titulo={`Semana de ${l.rotulo}`} linhas={[[MODALIDADES[m].nome, v ? `${fmt(v)} ${unidade}` : null]]} />
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey={m}
                          stroke={cor(MODALIDADES[m].cor)}
                          strokeWidth={2}
                          dot={{ r: 3, strokeWidth: 0, fill: cor(MODALIDADES[m].cor) }}
                          connectNulls
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-muted-foreground py-14 text-center text-sm">Sem treinos com distância no período.</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Peso × desempenho */}
      <Card className="gap-3">
        <CardHeader>
          <CardTitle>Peso × desempenho</CardTitle>
          <CardDescription>
            Peso médio de cada semana ao lado do pace médio na corrida.
            {dados.r !== null && (
              <>
                {' '}Correlação: <strong className="text-foreground">{formatarDecimal(Number(dados.r.toFixed(2)))}</strong>
                {Math.abs(dados.r) < 0.3
                  ? ' (fraca — o peso pouco explica o pace no período)'
                  : dados.r > 0
                    ? ' (quanto menor o peso, mais rápido você correu)'
                    : ' (o pace melhorou mesmo com o peso maior)'}
                .
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 px-2 sm:px-6 lg:grid-cols-2">
          {dados.linhasSemana.some((l) => l.peso !== null) ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dados.linhasSemana} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="rotulo" {...EIXO} axisLine={{ stroke: 'var(--chart-grid)' }} interval={Math.max(0, Math.floor(dados.linhasSemana.length / 6) - 1)} />
                  <YAxis
                    {...EIXO}
                    width={44}
                    // inclui a meta para a linha tracejada aparecer
                    domain={[
                      (min: number) => Math.floor(Math.min(min, limiares?.peso_meta_kg ?? min) - 1),
                      (max: number) => Math.ceil(Math.max(max, limiares?.peso_meta_kg ?? max) + 1),
                    ]}
                    tickFormatter={(v: number) => `${formatarDecimal(v)}`}
                  />
                  {limiares?.peso_meta_kg && (
                    <ReferenceLine y={limiares.peso_meta_kg} stroke="var(--chart-axis)" strokeDasharray="4 4" label={{ value: 'meta', fill: 'var(--chart-axis)', fontSize: 11, position: 'insideTopRight' }} />
                  )}
                  <Tooltip
                    content={({ active, payload }) => {
                      const l = payload?.[0]?.payload as (typeof dados.linhasSemana)[number] | undefined
                      if (!active || !l) return null
                      return <Caixa titulo={`Semana de ${l.rotulo}`} linhas={[['Peso médio', l.peso ? `${formatarDecimal(l.peso)} kg` : null]]} />
                    }}
                  />
                  <Line type="monotone" dataKey="peso" stroke={cor(PALETA[6].claro)} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: cor(PALETA[6].claro) }} connectNulls isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted-foreground py-10 text-center text-sm">Registre seu peso na página Corpo para ver esta relação.</p>
          )}
          {dados.pares.length >= 3 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 16 }}>
                  <CartesianGrid stroke="var(--chart-grid)" />
                  <XAxis type="number" dataKey="peso" name="Peso" {...EIXO} domain={['dataMin - 0.5', 'dataMax + 0.5']} tickFormatter={(v: number) => `${formatarDecimal(v)} kg`} />
                  <YAxis type="number" dataKey="pace" name="Pace" {...EIXO} width={44} reversed domain={['auto', 'auto']} tickFormatter={formatarPace} />
                  <Tooltip
                    content={({ active, payload }) => {
                      const p = payload?.[0]?.payload as (typeof dados.pares)[number] | undefined
                      if (!active || !p) return null
                      return (
                        <Caixa
                          titulo={`Semana de ${p.rotulo}`}
                          linhas={[
                            ['Peso', `${formatarDecimal(p.peso)} kg`],
                            ['Pace', `${formatarPace(p.pace)} /km`],
                          ]}
                        />
                      )
                    }}
                  />
                  <Scatter data={dados.pares} fill={cor(MODALIDADES.corrida.cor)} stroke="var(--card)" strokeWidth={2} isAnimationActive={false} />
                </ScatterChart>
              </ResponsiveContainer>
              <p className="text-muted-foreground -mt-2 text-center text-xs">Cada ponto é uma semana (peso × pace da corrida)</p>
            </div>
          ) : (
            <p className="text-muted-foreground py-10 text-center text-sm">
              São necessárias pelo menos 3 semanas com peso e corrida registrados.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recordes */}
      {dados.recordes.length > 0 && (
        <section className="grid gap-2" aria-label="Recordes">
          <h2 className="text-muted-foreground text-sm font-medium">Recordes (último ano)</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {dados.recordes.map((r) => (
              <Card key={r.rotulo} className="gap-1 px-4 py-4">
                <div className="text-muted-foreground text-xs">{r.rotulo}</div>
                <div className="text-lg font-semibold tracking-tight">{r.valor}</div>
                <div className="text-muted-foreground truncate text-xs">
                  {r.treino.nome} · {new Date(r.treino.data_hora).toLocaleDateString('pt-BR')}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
