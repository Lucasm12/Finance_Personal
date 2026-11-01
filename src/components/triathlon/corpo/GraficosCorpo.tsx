import { useMemo, useState, type ReactNode } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTema } from '@/hooks/useTema'
import { PALETA } from '@/lib/cores'
import { dataCurta, gorduraDaPesagem, pesoPlanejado, type Plano, type Sexo } from '@/lib/corpo'
import { dataLocal, diaMesCurto, formatarDecimal, mediaMovelPeso, somarDias } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { Pesagem } from '@/types/triathlon'

const EIXO = { tickLine: false, axisLine: false, tick: { fill: 'var(--chart-axis)', fontSize: 11 } }

const PERIODOS = [
  { dias: 90, rotulo: '3 meses' },
  { dias: 180, rotulo: '6 meses' },
  { dias: 365, rotulo: '1 ano' },
  { dias: 0, rotulo: 'Tudo' },
]

function Caixa({ titulo, linhas }: { titulo: string; linhas: [ReactNode, string | null, string?][] }) {
  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium">{titulo}</div>
      {linhas.map(([rotulo, valor, cor], i) => (
        <div key={i} className="flex items-center gap-2 tabular-nums">
          {cor && <span className="size-2 rounded-full" style={{ backgroundColor: cor }} />}
          <span className="text-muted-foreground">{rotulo}</span>
          <span className="ml-auto pl-3 font-medium">{valor ?? '—'}</span>
        </div>
      ))}
    </div>
  )
}

type FormaLegenda = 'area' | 'ponto' | 'linha' | 'tracejado'

const AMOSTRA: Record<FormaLegenda, string> = {
  area: 'size-2.5 rounded-sm',
  ponto: 'size-2 rounded-full opacity-60',
  linha: 'h-0.5 w-3.5 rounded-full',
  tracejado: 'w-3.5 border-t-2 border-dashed',
}

function Legenda({ itens }: { itens: { rotulo: string; cor: string; forma?: FormaLegenda }[] }) {
  return (
    <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {itens.map((i) => (
        <li key={i.rotulo} className="flex items-center gap-1.5">
          <span
            className={AMOSTRA[i.forma ?? 'area']}
            style={i.forma === 'tracejado' ? { borderColor: i.cor } : { backgroundColor: i.cor }}
            aria-hidden
          />
          {i.rotulo}
        </li>
      ))}
    </ul>
  )
}

const Vazio = ({ children }: { children: ReactNode }) => (
  <p className="text-muted-foreground py-12 text-center text-sm">{children}</p>
)

// -----------------------------------------------------------------------------
// Peso
// -----------------------------------------------------------------------------

interface PropsPeso {
  pesagens: Pesagem[]
  meta: number | null
  faixaSaudavel: [number, number] | null
  /** plano de peso: desenha a trajetória semanal até a meta, inclusive no futuro */
  plano?: Plano | null
  /** resumo mostrado abaixo do gráfico */
  rodape?: ReactNode
}

interface PontoPeso {
  data: string
  /** meio-dia local em ms (eixo de tempo) */
  t: number
  peso?: number
  media?: number
  plano?: number
}

const tempo = (data: string) => new Date(`${data}T12:00:00`).getTime()

export function GraficoPeso({ pesagens, meta, faixaSaudavel, plano, rodape }: PropsPeso) {
  const { cor } = useTema()
  const [periodo, setPeriodo] = useState(180)
  const hoje = dataLocal(new Date())

  const serie = useMemo(() => {
    const desde = periodo ? somarDias(hoje, -periodo) : '0000-00-00'
    const pontos = new Map<string, PontoPeso>()
    const ponto = (data: string) => {
      const p = pontos.get(data) ?? { data, t: tempo(data) }
      pontos.set(data, p)
      return p
    }
    for (const p of mediaMovelPeso(pesagens)) {
      if (p.data < desde) continue
      Object.assign(ponto(p.data), { peso: p.peso, media: p.media })
    }
    if (plano) {
      // um ponto por semana do início até a meta (no máximo 1 ano à frente), mais os dias com pesagem
      const ate = [plano.fim, somarDias(hoje, 365)].sort()[0]
      const datas = [plano.inicio, plano.fim]
      for (let d = plano.inicio; d <= ate; d = somarDias(d, 7)) datas.push(d)
      for (const d of datas) if (d >= desde && d <= ate) ponto(d)
      for (const p of pontos.values()) {
        if (p.data >= plano.inicio && p.data <= ate) p.plano = Number(pesoPlanejado(plano, p.data).toFixed(2))
      }
    }
    return [...pontos.values()].sort((a, b) => a.t - b.t)
  }, [pesagens, periodo, hoje, plano])

  const corPeso = cor(PALETA[6].claro)
  const corPlano = cor(PALETA[1].claro)
  const verde = 'var(--status-bom)'
  const reais = serie.filter((p) => p.peso !== undefined).length
  const futuro = serie.some((p) => p.data > hoje)

  return (
    <Card className="gap-3">
      <CardHeader className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle>Evolução do peso</CardTitle>
          <CardDescription>
            Cada ponto é uma pesagem; a linha é a média de 7 dias, que tira o sobe e desce do dia a dia.
            {plano && ' O tracejado laranja é o seu plano semanal até a meta.'}
          </CardDescription>
        </div>
        <div className="bg-muted flex gap-1 rounded-lg p-1">
          {PERIODOS.map((p) => (
            <button
              key={p.dias}
              type="button"
              onClick={() => setPeriodo(p.dias)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium',
                periodo === p.dias ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 px-2 sm:px-6">
        {reais < 2 && !plano ? (
          <Vazio>Registre pelo menos duas pesagens no período para ver o gráfico.</Vazio>
        ) : (
          <>
            <div className="px-2 sm:px-0">
              <Legenda
                itens={[
                  { rotulo: 'Pesagem', cor: corPeso, forma: 'ponto' },
                  { rotulo: 'Média de 7 dias', cor: corPeso, forma: 'linha' },
                  ...(plano ? [{ rotulo: 'Plano semanal', cor: corPlano, forma: 'tracejado' as const }] : []),
                  ...(faixaSaudavel ? [{ rotulo: 'Faixa de peso normal (IMC 18,5–24,9)', cor: verde }] : []),
                  ...(meta ? [{ rotulo: 'Meta', cor: 'var(--chart-axis)', forma: 'tracejado' as const }] : []),
                ]}
              />
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={serie} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis
                    dataKey="t"
                    type="number"
                    scale="time"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(t: number) => diaMesCurto(dataLocal(new Date(t)))}
                    {...EIXO}
                    axisLine={{ stroke: 'var(--chart-grid)' }}
                    minTickGap={24}
                  />
                  <YAxis
                    {...EIXO}
                    width={40}
                    domain={[
                      (min: number) => Math.floor(Math.min(min, meta ?? min) - 1),
                      (max: number) => Math.ceil(Math.max(max, meta ?? max) + 1),
                    ]}
                  />
                  {faixaSaudavel && (
                    <ReferenceArea y1={faixaSaudavel[0]} y2={faixaSaudavel[1]} fill={verde} fillOpacity={0.08} ifOverflow="hidden" />
                  )}
                  {meta && <ReferenceLine y={meta} stroke="var(--chart-axis)" strokeDasharray="4 4" />}
                  {futuro && (
                    <ReferenceLine
                      x={tempo(hoje)}
                      stroke="var(--chart-axis)"
                      label={{ value: 'hoje', position: 'top', fill: 'var(--chart-axis)', fontSize: 11 }}
                    />
                  )}
                  <Tooltip
                    cursor={{ stroke: 'var(--chart-axis)', strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      const p = payload?.[0]?.payload as PontoPeso | undefined
                      if (!active || !p) return null
                      const linhas: [string, string | null, string?][] = []
                      if (p.peso !== undefined) linhas.push(['Peso', `${formatarDecimal(p.peso)} kg`, corPeso])
                      if (p.media !== undefined) linhas.push(['Média 7 dias', `${formatarDecimal(p.media)} kg`])
                      if (p.plano !== undefined) linhas.push(['Plano', `${formatarDecimal(p.plano)} kg`, corPlano])
                      if (meta && p.media !== undefined) linhas.push(['Até a meta', `${formatarDecimal(Math.abs(p.media - meta))} kg`])
                      return <Caixa titulo={`${dataCurta(p.data)}${p.data > hoje ? ' (previsão)' : ''}`} linhas={linhas} />
                    }}
                  />
                  <Scatter dataKey="peso" fill={corPeso} fillOpacity={0.45} isAnimationActive={false} />
                  <Line type="monotone" dataKey="media" stroke={corPeso} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                  {plano && (
                    <Line
                      type="linear"
                      dataKey="plano"
                      stroke={corPlano}
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
        {rodape}
      </CardContent>
    </Card>
  )
}

// -----------------------------------------------------------------------------
// Composição: massa magra × massa gorda
// -----------------------------------------------------------------------------

export function GraficoComposicao({ pesagens, sexo, alturaCm }: { pesagens: Pesagem[]; sexo: Sexo | null; alturaCm: number | null }) {
  const { cor } = useTema()
  const serie = useMemo(
    () =>
      pesagens.flatMap((p) => {
        const g = gorduraDaPesagem(p, sexo, alturaCm)
        if (!g) return []
        const gorda = (p.peso_kg * g.pct) / 100
        return [
          {
            data: p.data,
            rotulo: diaMesCurto(p.data),
            magra: Number((p.peso_kg - gorda).toFixed(1)),
            gorda: Number(gorda.toFixed(1)),
            pct: g.pct,
            medida: g.medida,
          },
        ]
      }),
    [pesagens, sexo, alturaCm],
  )
  const corMagra = cor(PALETA[0].claro)
  const corGorda = cor(PALETA[1].claro)

  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>Composição corporal</CardTitle>
        <CardDescription>
          O peso dividido em massa magra (músculos, ossos, órgãos, água) e massa gorda. O ideal é a gorda cair sem a magra cair junto.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 px-2 sm:px-6">
        {serie.length < 2 ? (
          <Vazio>
            Precisa de duas medições com % de gordura (da balança) ou com cintura e pescoço{sexo === 'F' ? ' e quadril' : ''}.
          </Vazio>
        ) : (
          <>
            <div className="px-2 sm:px-0">
              <Legenda
                itens={[
                  { rotulo: 'Massa magra', cor: corMagra },
                  { rotulo: 'Massa gorda', cor: corGorda },
                ]}
              />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={serie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="rotulo" {...EIXO} axisLine={{ stroke: 'var(--chart-grid)' }} minTickGap={24} />
                  <YAxis {...EIXO} width={40} domain={[0, 'auto']} />
                  <Tooltip
                    cursor={{ stroke: 'var(--chart-axis)', strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      const p = payload?.[0]?.payload as (typeof serie)[number] | undefined
                      if (!active || !p) return null
                      return (
                        <Caixa
                          titulo={dataCurta(p.data)}
                          linhas={[
                            ['Massa magra', `${formatarDecimal(p.magra)} kg`, corMagra],
                            ['Massa gorda', `${formatarDecimal(p.gorda)} kg`, corGorda],
                            ['Gordura', `${formatarDecimal(p.pct)}% (${p.medida ? 'medida' : 'pelas medidas'})`],
                          ]}
                        />
                      )
                    }}
                  />
                  <Area type="monotone" dataKey="magra" stackId="1" stroke={corMagra} strokeWidth={2} fill={corMagra} fillOpacity={0.2} isAnimationActive={false} />
                  <Area type="monotone" dataKey="gorda" stackId="1" stroke={corGorda} strokeWidth={2} fill={corGorda} fillOpacity={0.25} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// -----------------------------------------------------------------------------
// Circunferências
// -----------------------------------------------------------------------------

const MEDIDAS = [
  { campo: 'cintura_cm', rotulo: 'Cintura' },
  { campo: 'quadril_cm', rotulo: 'Quadril' },
  { campo: 'pescoco_cm', rotulo: 'Pescoço' },
  { campo: 'braco_cm', rotulo: 'Braço' },
  { campo: 'coxa_cm', rotulo: 'Coxa' },
] as const

export function GraficoMedidas({ pesagens }: { pesagens: Pesagem[] }) {
  const { cor } = useTema()
  // cada medida tem sempre a mesma cor, mesmo quando outra não aparece
  const series = MEDIDAS.map((m, i) => ({ ...m, cor: cor(PALETA[i].claro) })).filter((m) =>
    pesagens.some((p) => p[m.campo] !== null),
  )
  const dados = pesagens
    .filter((p) => MEDIDAS.some((m) => p[m.campo] !== null))
    .map((p) => ({ ...p, rotulo: diaMesCurto(p.data) }))

  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>Circunferências</CardTitle>
        <CardDescription>Medidas com fita métrica ao longo do tempo (cm).</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 px-2 sm:px-6">
        {dados.length < 2 ? (
          <Vazio>Registre medidas em pelo menos duas datas para ver a evolução.</Vazio>
        ) : (
          <>
            <div className="px-2 sm:px-0">
              <Legenda itens={series.map((s) => ({ rotulo: s.rotulo, cor: s.cor, forma: 'linha' }))} />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="rotulo" {...EIXO} axisLine={{ stroke: 'var(--chart-grid)' }} minTickGap={24} />
                  <YAxis {...EIXO} width={40} domain={[(min: number) => Math.floor((min - 2) / 10) * 10, (max: number) => Math.ceil((max + 2) / 10) * 10]} />
                  <Tooltip
                    cursor={{ stroke: 'var(--chart-axis)', strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      const p = payload?.[0]?.payload as (typeof dados)[number] | undefined
                      if (!active || !p) return null
                      return (
                        <Caixa
                          titulo={dataCurta(p.data)}
                          linhas={series.map((s) => [s.rotulo, p[s.campo] !== null ? `${formatarDecimal(p[s.campo]!)} cm` : null, s.cor])}
                        />
                      )
                    }}
                  />
                  {series.map((s) => (
                    <Line
                      key={s.campo}
                      type="monotone"
                      dataKey={s.campo}
                      name={s.rotulo}
                      stroke={s.cor}
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)', fill: s.cor }}
                      connectNulls
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
