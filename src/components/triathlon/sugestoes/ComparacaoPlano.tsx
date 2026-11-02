import { useMemo, useState } from 'react'
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, InfoIcon, MinusIcon } from 'lucide-react'

import { SeloZona, VisaoEstrutura } from '@/components/triathlon/sugestoes/VisaoEstrutura'
import { Skeleton } from '@/components/ui/skeleton'
import { useParciais, useTreino } from '@/hooks/useParciais'
import { usePerfilAtleta } from '@/hooks/useTriathlon'
import { compararPlano, type Situacao } from '@/lib/sugestoes/comparacao'
import { FASES } from '@/lib/sugestoes/estrutura'
import { duracaoCurta } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { Parcial, PerfilAtleta, Treino, TreinoPlanejado } from '@/types/triathlon'

const SITUACAO: Record<Situacao, { rotulo: string; icone: typeof CheckIcon; classe: string }> = {
  no_alvo: { rotulo: 'no alvo', icone: CheckIcon, classe: 'text-status-bom' },
  acima: { rotulo: 'acima', icone: ArrowUpIcon, classe: 'text-status-alerta' },
  abaixo: { rotulo: 'abaixo', icone: ArrowDownIcon, classe: 'text-status-alerta' },
  sem_dado: { rotulo: 'sem dado', icone: MinusIcon, classe: 'text-muted-foreground' },
}

interface Props {
  planejado: TreinoPlanejado
  treino: Treino
  parciais: Parcial[]
  perfil: PerfilAtleta | null | undefined
}

/** Planejado × realizado: totais, passo a passo (pelas voltas) e tempo em cada zona (pelas parciais). */
export function ComparacaoPlano({ planejado, treino, parciais, perfil }: Props) {
  const c = useMemo(() => compararPlano(planejado, treino, parciais, perfil), [planejado, treino, parciais, perfil])
  const [verPlano, setVerPlano] = useState(false)
  if (!c || !planejado.estrutura) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        O treino planejado “{planejado.nome}” não tem estrutura (aquecimento, séries, desaquecimento) para comparar. Planeje a partir de uma sugestão para
        ter a comparação completa.
      </p>
    )
  }
  const maxZona = Math.max(1, ...(c.zonas ?? []).flatMap((z) => [z.planejado, z.realizado]))

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
        <div className="text-3xl font-semibold tabular-nums">{c.aderencia === null ? '—' : `${c.aderencia}%`}</div>
        <div className="min-w-0 flex-1 text-sm">
          <div className="font-medium">
            {c.aderencia === null ? 'Sem dados para medir a aderência' : c.aderencia >= 80 ? 'Saiu como planejado' : c.aderencia >= 50 ? 'Parcialmente como planejado' : 'Bem diferente do planejado'}
          </div>
          <div className="text-muted-foreground text-xs">
            Planejado: {planejado.nome} ({planejado.data.split('-').reverse().join('/')}).{' '}
            {c.base === 'passos' ? 'Parte dos passos feita no alvo, pesada pelo tempo.' : c.base === 'zonas' ? 'Semelhança entre o tempo planejado e o feito em cada zona.' : ''}
          </div>
        </div>
      </div>

      {c.totais.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-muted-foreground bg-muted/40 text-right text-xs">
                <th className="px-3 py-2 text-left font-medium" />
                <th className="px-3 py-2 font-medium">Planejado</th>
                <th className="px-3 py-2 font-medium">Realizado</th>
                <th className="px-3 py-2 font-medium">Diferença</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {c.totais.map((l) => (
                <tr key={l.rotulo} className="text-right">
                  <td className="px-3 py-2 text-left font-medium">{l.rotulo}</td>
                  <td className="px-3 py-2">{l.planejado ?? '—'}</td>
                  <td className="px-3 py-2">{l.realizado ?? '—'}</td>
                  <td className={cn('px-3 py-2 font-medium', l.tom === 'bom' ? 'text-status-bom' : l.tom === 'alerta' ? 'text-status-alerta' : 'text-muted-foreground')}>
                    {l.diferenca ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {c.passos ? (
        <div className="grid gap-1.5">
          <div className="text-sm font-medium">Passo a passo (pelas voltas do relógio)</div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground bg-muted/40 text-left text-xs">
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Planejado</th>
                  <th className="px-3 py-2 font-medium">Realizado</th>
                  <th className="px-3 py-2 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {c.passos.map((p, i) => {
                  const s = SITUACAO[p.situacao]
                  return (
                    <tr key={i}>
                      <td className="text-muted-foreground px-3 py-2 align-top text-xs tabular-nums">{i + 1}</td>
                      <td className="px-3 py-2 align-top">
                        <div className="font-medium">{p.plano}</div>
                        <div className="text-muted-foreground text-xs">
                          {FASES[p.fase]}
                          {p.alvo ? ` · ${p.alvo}` : ''}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top text-xs tabular-nums">{p.realizado}</td>
                      <td className="px-3 py-2 align-top">
                        <span className={cn('inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap', s.classe)}>
                          <s.icone className="size-3.5" aria-hidden />
                          {s.rotulo}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        c.semPassos && (
          <p className="text-muted-foreground flex gap-2 text-xs leading-relaxed">
            <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {c.semPassos}
          </p>
        )
      )}

      {c.zonas && c.zonas.length > 0 && (
        <div className="grid gap-2">
          <div className="text-sm font-medium">Tempo em cada zona</div>
          <div className="text-muted-foreground flex gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="bg-muted-foreground/30 size-2.5 rounded-sm" />
              Planejado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="bg-primary size-2.5 rounded-sm" />
              Realizado
            </span>
          </div>
          <ul className="grid gap-2">
            {c.zonas.map((z) => (
              <li key={z.zona} className="grid grid-cols-[6.5rem_1fr_5.5rem] items-center gap-2 text-sm">
                <SeloZona zona={z.zona} />
                <span className="grid gap-0.5" aria-hidden>
                  <span className="bg-muted-foreground/30 h-1.5 rounded-sm" style={{ width: `${(z.planejado / maxZona) * 100}%`, minWidth: z.planejado ? 2 : 0 }} />
                  <span className="bg-primary h-2 rounded-sm" style={{ width: `${(z.realizado / maxZona) * 100}%`, minWidth: z.realizado ? 2 : 0 }} />
                </span>
                <span className="text-right text-xs tabular-nums">
                  <span className="text-muted-foreground">{duracaoCurta(z.planejado)}</span> / <strong>{duracaoCurta(z.realizado)}</strong>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {c.observacoes.length > 0 && (
        <ul className="grid gap-1">
          {c.observacoes.map((o) => (
            <li key={o} className="text-muted-foreground flex gap-2 text-xs">
              <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {o}
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="text-primary w-fit text-xs font-medium hover:underline" onClick={() => setVerPlano(!verPlano)}>
        {verPlano ? 'Esconder o treino planejado' : 'Ver o treino planejado'}
      </button>
      {verPlano && <VisaoEstrutura estrutura={planejado.estrutura} perfil={perfil} />}
    </div>
  )
}

/** A comparação a partir do treino planejado (busca a atividade vinculada e as parciais). */
export function ComparacaoDoPlanejado({ planejado }: { planejado: TreinoPlanejado }) {
  const treino = useTreino(planejado.treino_id)
  const parciais = useParciais(planejado.treino_id)
  const perfil = usePerfilAtleta()
  if (treino.isLoading || parciais.isLoading) return <Skeleton className="h-32 rounded-lg" />
  if (!treino.data) return <p className="text-muted-foreground text-sm">A atividade vinculada não foi encontrada (pode ter sido excluída).</p>
  return <ComparacaoPlano planejado={planejado} treino={treino.data} parciais={parciais.data ?? []} perfil={perfil.data} />
}
