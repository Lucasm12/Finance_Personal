import { useMemo, useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTema } from '@/hooks/useTema'
import { competenciaMedia, somarMeses } from '@/lib/format'
import {
  MODALIDADES_AGENDA,
  numeroSemana,
  progressoSemana,
  quantidade,
  resumoMensal,
  semanasAte,
  textoSemana,
  UNIDADE,
} from '@/lib/agenda'
import { MODALIDADES } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { Competencia } from '@/types'
import type { MetaSemanal, ModalidadeAgenda, TreinoPlanejado } from '@/types/triathlon'

const EIXO = { tickLine: false, axisLine: false, tick: { fill: 'var(--chart-axis)', fontSize: 11 } }
const pct = (f: number) => `${Math.round(f * 100)}%`
const arred = (v: number, m: ModalidadeAgenda) => (m === 'natacao' || m === 'forca' ? Math.round(v) : Math.round(v * 10) / 10)

interface Props {
  semana: string
  competencia: Competencia
  treinos: TreinoPlanejado[]
  metas: MetaSemanal[]
}

export function EvolucaoAgenda({ semana, competencia, treinos, metas }: Props) {
  const { cor } = useTema()
  const [modalidade, setModalidade] = useState<ModalidadeAgenda>('corrida')

  const serie = useMemo(
    () =>
      semanasAte(semana, 12).map((s) => {
        const p = progressoSemana(s, treinos, metas).modalidades[modalidade]
        return { semana: s, rotulo: `S${numeroSemana(s)}`, realizado: arred(p.realizado, modalidade), meta: p.meta, fracao: p.fracao }
      }),
    [semana, treinos, metas, modalidade],
  )
  const comMeta = serie.filter((x) => x.meta !== null)
  const batidas = comMeta.filter((x) => (x.fracao ?? 0) >= 1).length
  const media = serie.reduce((s, x) => s + x.realizado, 0) / serie.length

  const meses = useMemo(() => Array.from({ length: 6 }, (_, i) => somarMeses(competencia, -5 + i)).reverse(), [competencia])
  const resumo = useMemo(() => resumoMensal(meses, treinos, metas), [meses, treinos, metas])
  const corModalidade = cor(MODALIDADES[modalidade].cor)

  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Evolução</CardTitle>
          <CardDescription>Últimas 12 semanas até a semana selecionada: o que você fez × a meta de cada semana.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Modalidade do gráfico">
          {MODALIDADES_AGENDA.map((m) => {
            const ativo = m === modalidade
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => setModalidade(m)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  ativo ? 'border-transparent text-white' : 'text-muted-foreground hover:bg-accent',
                )}
                style={ativo ? { backgroundColor: cor(MODALIDADES[m].cor) } : undefined}
              >
                {MODALIDADES[m].nome}
              </button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 px-2 sm:px-6">
        <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 px-2 text-xs sm:px-0">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: corModalidade }} />
            Realizado ({UNIDADE[modalidade].sigla})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 border-t-2 border-dashed" style={{ borderColor: 'var(--foreground)' }} />
            Meta da semana
          </span>
          <span className="text-foreground ml-auto">
            {comMeta.length ? `Metas batidas: ${batidas} de ${comMeta.length} semanas · ` : ''}
            média {quantidade(modalidade, arred(media, modalidade))}/semana
          </span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={serie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="rotulo" {...EIXO} axisLine={{ stroke: 'var(--chart-grid)' }} />
              <YAxis {...EIXO} width={44} allowDecimals={modalidade !== 'forca'} />
              <Tooltip
                cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                content={({ active, payload }) => {
                  const p = payload?.[0]?.payload as (typeof serie)[number] | undefined
                  if (!active || !p) return null
                  return (
                    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
                      <div className="mb-1 font-medium">
                        Semana {numeroSemana(p.semana)} · {textoSemana(p.semana)}
                      </div>
                      <div className="tabular-nums">Realizado: {quantidade(modalidade, p.realizado)}</div>
                      <div className="text-muted-foreground tabular-nums">
                        Meta: {p.meta !== null ? `${quantidade(modalidade, p.meta)} (${pct(p.fracao ?? 0)})` : 'sem meta'}
                      </div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="realizado" fill={corModalidade} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              <Line
                type="stepAfter"
                dataKey="meta"
                stroke="var(--foreground)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto px-2 sm:px-0">
          <table className="w-full text-sm tabular-nums">
            <caption className="text-muted-foreground mb-2 text-left text-xs">
              Resumo por mês (só treinos concluídos contam; metas batidas consideram as semanas já encerradas)
            </caption>
            <thead>
              <tr className="text-muted-foreground border-b text-right text-xs">
                <th className="py-2 pr-2 text-left font-medium">Mês</th>
                {MODALIDADES_AGENDA.map((m) => (
                  <th key={m} className="px-2 py-2 font-medium whitespace-nowrap">
                    {MODALIDADES[m].nome}
                  </th>
                ))}
                <th className="px-2 py-2 font-medium whitespace-nowrap">Metas batidas</th>
                <th className="py-2 pl-2 font-medium">Aderência</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {resumo.map((r) => (
                <tr key={r.mes} className={cn('text-right', r.mes === competencia && 'bg-muted/50 font-medium')}>
                  <td className="py-2 pr-2 text-left whitespace-nowrap">{competenciaMedia(r.mes)}</td>
                  {MODALIDADES_AGENDA.map((m) => (
                    <td key={m} className="px-2 py-2 whitespace-nowrap">
                      {r.realizado[m] ? quantidade(m, arred(r.realizado[m], m)) : <span className="text-muted-foreground">—</span>}
                    </td>
                  ))}
                  <td className="px-2 py-2 whitespace-nowrap">
                    {r.metasDefinidas ? `${r.metasBatidas} de ${r.metasDefinidas}` : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="py-2 pl-2 whitespace-nowrap" title={`${r.concluidos} concluído(s), ${r.perdidos} perdido(s)`}>
                    {r.aderencia !== null ? pct(r.aderencia) : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-muted-foreground mt-2 text-[11px]">Aderência = treinos concluídos ÷ (concluídos + perdidos).</p>
        </div>
      </CardContent>
    </Card>
  )
}
