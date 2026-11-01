import { useMemo } from 'react'
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { SeletorMes } from '@/components/SeletorMes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCompetencia } from '@/hooks/useCompetencia'
import { useTotaisCategoria, useTotaisMes } from '@/hooks/useDados'
import { useTema } from '@/hooks/useTema'
import {
  competenciaMedia,
  formatarMoeda,
  formatarMoedaCompacta,
  formatarPercentual,
  nomeCompetencia,
  partesCompetencia,
  somar,
  somarMeses,
} from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Competencia } from '@/types'

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/**
 * Variação de gasto: subir é ruim (vermelho), cair é bom (verde). Sempre com ícone + texto.
 * mostrar: 'valor' (R$), 'percentual' (%) ou 'completo' (R$ e %).
 */
function Variacao({
  atual,
  anterior,
  mostrar = 'completo',
  className,
}: {
  atual: number
  anterior: number
  mostrar?: 'valor' | 'percentual' | 'completo'
  className?: string
}) {
  const diferenca = somar([atual, -anterior])
  if (anterior === 0 && atual === 0) return <span className={cn('text-muted-foreground', className)}>—</span>
  if (anterior === 0 && mostrar === 'percentual') {
    return <span className={cn('text-muted-foreground text-xs', className)}>novo</span>
  }

  const Icone = diferenca > 0 ? ArrowUpIcon : diferenca < 0 ? ArrowDownIcon : MinusIcon
  const sinal = diferenca > 0 ? '+' : diferenca < 0 ? '−' : ''
  const valor = `${sinal}${formatarMoeda(Math.abs(diferenca))}`
  const percentual = anterior === 0 ? '' : `${sinal}${formatarPercentual(Math.abs(diferenca / anterior))}`

  const texto =
    mostrar === 'valor' ? valor : mostrar === 'percentual' ? percentual : percentual ? `${valor} (${percentual})` : valor

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 tabular-nums',
        diferenca > 0 && 'text-red-700 dark:text-red-400',
        diferenca < 0 && 'text-emerald-700 dark:text-emerald-400',
        diferenca === 0 && 'text-muted-foreground',
        className,
      )}
    >
      <Icone className="size-[0.9em] shrink-0" aria-hidden />
      {texto}
    </span>
  )
}

function Bloco({ rotulo, children, detalhe }: { rotulo: string; children: React.ReactNode; detalhe?: React.ReactNode }) {
  return (
    <Card className="gap-1 px-4 py-4 sm:px-5">
      <div className="text-muted-foreground text-sm">{rotulo}</div>
      <div className="text-xl font-semibold tracking-tight sm:text-2xl">{children}</div>
      {detalhe && <div className="text-xs">{detalhe}</div>}
    </Card>
  )
}

interface PontoMes {
  competencia: Competencia
  rotulo: string
  total: number
  total_pago: number
  quantidade: number
}

export default function Historico() {
  const [competencia, setCompetencia] = useCompetencia()
  const { cor } = useTema()
  const inicio = somarMeses(competencia, -11)
  const anterior = somarMeses(competencia, -1)

  const totaisMes = useTotaisMes(inicio, competencia)
  const competencias = useMemo(() => [anterior, competencia], [anterior, competencia])
  const totaisCategoria = useTotaisCategoria(competencias)

  // 12 meses, preenchendo com zero os meses sem lançamentos
  const serie = useMemo<PontoMes[]>(() => {
    const porMes = new Map((totaisMes.data ?? []).map((t) => [t.competencia, t]))
    return Array.from({ length: 12 }, (_, i) => {
      const c = somarMeses(inicio, i)
      const { ano, mes } = partesCompetencia(c)
      const t = porMes.get(c)
      return {
        competencia: c,
        rotulo: i === 0 || mes === 1 ? `${MESES_CURTOS[mes - 1]}/${String(ano).slice(2)}` : MESES_CURTOS[mes - 1],
        total: t?.total ?? 0,
        total_pago: t?.total_pago ?? 0,
        quantidade: t?.quantidade ?? 0,
      }
    })
  }, [totaisMes.data, inicio])

  const totalAtual = serie[11].total
  const totalAnterior = serie[10].total
  const mesesComDados = serie.filter((p) => p.quantidade > 0)
  const media = mesesComDados.length ? somar(mesesComDados.map((p) => p.total)) / mesesComDados.length : 0

  const categoriasAtual = (totaisCategoria.data ?? []).filter((t) => t.competencia === competencia)

  // Comparação: todas as categorias presentes em qualquer um dos dois meses
  const comparacao = useMemo(() => {
    const linhas = new Map<string, { nome: string; cor: string; ordem: number; atual: number; anterior: number }>()
    for (const t of totaisCategoria.data ?? []) {
      const linha = linhas.get(t.categoria_id) ?? { nome: t.categoria, cor: t.cor, ordem: t.ordem, atual: 0, anterior: 0 }
      if (t.competencia === competencia) linha.atual = t.total
      else linha.anterior = t.total
      linhas.set(t.categoria_id, linha)
    }
    return [...linhas.values()].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
  }, [totaisCategoria.data, competencia])

  const carregando = totaisMes.isLoading || totaisCategoria.isLoading
  const atualizando = totaisMes.isPlaceholderData || totaisCategoria.isPlaceholderData

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <div className="self-start">
          <h1 className="text-2xl font-semibold tracking-tight">Histórico</h1>
          <p className="text-muted-foreground text-sm">Evolução dos gastos e comparação entre meses.</p>
        </div>
        <SeletorMes competencia={competencia} onChange={setCompetencia} />
      </div>

      {carregando ? (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : (
        <div className={cn('grid grid-cols-1 gap-4 transition-opacity sm:gap-5', atualizando && 'opacity-60')}>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumo">
            <Bloco rotulo={`Total de ${competenciaMedia(competencia)}`}>{formatarMoeda(totalAtual)}</Bloco>
            <Bloco rotulo={`Total de ${competenciaMedia(anterior)}`}>{formatarMoeda(totalAnterior)}</Bloco>
            <Bloco
              rotulo="Variação"
              detalhe={
                <span className="text-muted-foreground">
                  {totalAnterior > 0 && (
                    <Variacao atual={totalAtual} anterior={totalAnterior} mostrar="percentual" className="font-medium" />
                  )}{' '}
                  vs. {competenciaMedia(anterior)}
                </span>
              }
            >
              <Variacao atual={totalAtual} anterior={totalAnterior} mostrar="valor" />
            </Bloco>
            <Bloco
              rotulo="Média mensal"
              detalhe={
                <span className="text-muted-foreground">
                  {mesesComDados.length} {mesesComDados.length === 1 ? 'mês' : 'meses'} com lançamentos
                </span>
              }
            >
              {formatarMoeda(media)}
            </Bloco>
          </section>

          {/* Barras: total mensal dos últimos 12 meses */}
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Total mensal — últimos 12 meses</CardTitle>
              <CardDescription>
                {competenciaMedia(inicio)} a {competenciaMedia(competencia)}. Toque em uma barra para ver o mês.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%">
                    <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                    <XAxis
                      dataKey="rotulo"
                      tickLine={false}
                      axisLine={{ stroke: 'var(--chart-grid)' }}
                      tick={{ fill: 'var(--chart-axis)', fontSize: 12 }}
                    />
                    <YAxis
                      width={84}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'var(--chart-axis)', fontSize: 12 }}
                      tickFormatter={(v: number) => formatarMoedaCompacta(v)}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--accent)', opacity: 0.6 }}
                      content={({ active, payload }) => {
                        const p = payload?.[0]?.payload as PontoMes | undefined
                        if (!active || !p) return null
                        return (
                          <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-sm shadow-md">
                            <div className="font-medium">{nomeCompetencia(p.competencia)}</div>
                            <div className="tabular-nums">Total: {formatarMoeda(p.total)}</div>
                            <div className="text-muted-foreground text-xs tabular-nums">
                              Pago: {formatarMoeda(p.total_pago)} · {p.quantidade} conta{p.quantidade === 1 ? '' : 's'}
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {serie.map((p) => (
                        <Cell
                          key={p.competencia}
                          cursor="pointer"
                          fill={p.competencia === competencia ? 'var(--chart-bar)' : 'var(--chart-bar-muted)'}
                          onClick={() => setCompetencia(p.competencia)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <details className="mt-3 px-2 sm:px-0">
                <summary className="text-muted-foreground cursor-pointer text-sm select-none">Ver como tabela</summary>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-muted-foreground text-left text-xs">
                      <tr>
                        <th className="py-1 font-medium">Mês</th>
                        <th className="py-1 text-right font-medium">Total</th>
                        <th className="py-1 text-right font-medium">Pago</th>
                        <th className="py-1 text-right font-medium">Contas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y tabular-nums">
                      {[...serie].reverse().map((p) => (
                        <tr key={p.competencia} className={cn(p.competencia === competencia && 'font-semibold')}>
                          <td className="py-1">{competenciaMedia(p.competencia)}</td>
                          <td className="py-1 text-right">{formatarMoeda(p.total)}</td>
                          <td className="py-1 text-right">{formatarMoeda(p.total_pago)}</td>
                          <td className="py-1 text-right">{p.quantidade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
            {/* Pizza: distribuição por categoria */}
            <Card className="gap-4">
              <CardHeader>
                <CardTitle>Distribuição por categoria</CardTitle>
                <CardDescription>{nomeCompetencia(competencia)}</CardDescription>
              </CardHeader>
              <CardContent>
                {categoriasAtual.length === 0 ? (
                  <p className="text-muted-foreground py-12 text-center text-sm">Sem lançamentos neste mês.</p>
                ) : (
                  <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,13rem)_1fr]">
                    <div className="relative mx-auto aspect-square w-full max-w-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoriasAtual}
                            dataKey="total"
                            nameKey="categoria"
                            innerRadius="62%"
                            outerRadius="100%"
                            stroke="var(--card)"
                            strokeWidth={2}
                          >
                            {categoriasAtual.map((t) => (
                              <Cell key={t.categoria_id} fill={cor(t.cor)} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              const t = payload?.[0]?.payload as (typeof categoriasAtual)[number] | undefined
                              if (!active || !t) return null
                              return (
                                <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-sm shadow-md">
                                  <div className="font-medium">{t.categoria}</div>
                                  <div className="tabular-nums">
                                    {formatarMoeda(t.total)} ({formatarPercentual(totalAtual ? t.total / totalAtual : 0)})
                                  </div>
                                </div>
                              )
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-muted-foreground text-xs">Total</span>
                        <span className="text-sm font-semibold">{formatarMoeda(totalAtual)}</span>
                      </div>
                    </div>

                    <ul className="grid gap-1.5 text-sm">
                      {categoriasAtual.map((t) => (
                        <li key={t.categoria_id} className="flex items-center gap-2">
                          <span className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: cor(t.cor) }} aria-hidden />
                          <span className="min-w-0 flex-1 truncate">{t.categoria}</span>
                          <span className="tabular-nums">{formatarMoeda(t.total)}</span>
                          <span className="text-muted-foreground w-14 text-right text-xs tabular-nums">
                            {formatarPercentual(totalAtual ? t.total / totalAtual : 0)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comparação com o mês anterior */}
            <Card className="gap-4">
              <CardHeader>
                <CardTitle>Comparação com o mês anterior</CardTitle>
                <CardDescription>
                  {competenciaMedia(anterior)} × {competenciaMedia(competencia)}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {comparacao.length === 0 ? (
                  <p className="text-muted-foreground py-12 text-center text-sm">Sem lançamentos nesses meses.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead className="text-muted-foreground text-xs">
                        <tr className="border-b">
                          <th className="py-2 text-left font-medium">Categoria</th>
                          <th className="py-2 pl-3 text-right font-medium whitespace-nowrap">{competenciaMedia(anterior)}</th>
                          <th className="py-2 pl-3 text-right font-medium whitespace-nowrap">{competenciaMedia(competencia)}</th>
                          <th className="py-2 pl-2 text-right font-medium">Variação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y tabular-nums">
                        {comparacao.map((linha) => (
                          <tr key={linha.nome}>
                            <td className="py-2 pr-2">
                              <span className="flex items-center gap-2">
                                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: cor(linha.cor) }} aria-hidden />
                                <span>{linha.nome}</span>
                              </span>
                            </td>
                            <td className="text-muted-foreground py-2 pl-3 text-right whitespace-nowrap">{formatarMoeda(linha.anterior)}</td>
                            <td className="py-2 pl-3 text-right whitespace-nowrap">{formatarMoeda(linha.atual)}</td>
                            <td className="py-2 pl-2 text-right text-xs">
                              <Variacao atual={linha.atual} anterior={linha.anterior} mostrar="percentual" className="sm:hidden" />
                              <Variacao atual={linha.atual} anterior={linha.anterior} className="hidden sm:inline-flex" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 font-semibold">
                          <td className="py-2">Total</td>
                          <td className="py-2 pl-3 text-right whitespace-nowrap">{formatarMoeda(totalAnterior)}</td>
                          <td className="py-2 pl-3 text-right whitespace-nowrap">{formatarMoeda(totalAtual)}</td>
                          <td className="py-2 pl-2 text-right text-xs">
                            <Variacao atual={totalAtual} anterior={totalAnterior} mostrar="percentual" className="sm:hidden" />
                            <Variacao atual={totalAtual} anterior={totalAnterior} className="hidden sm:inline-flex" />
                          </td>
                        </tr>
                        <tr className="sm:hidden">
                          <td colSpan={4} className="text-muted-foreground pt-1 text-right text-xs">
                            Diferença: <Variacao atual={totalAtual} anterior={totalAnterior} />
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
