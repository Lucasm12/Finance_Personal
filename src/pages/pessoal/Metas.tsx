import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon, PlusIcon, ShapesIcon, TargetIcon, TriangleAlertIcon } from 'lucide-react'

import { BarraProgresso, Cabecalho, IconeArea, SeloArea, Vazio } from '@/components/pessoal/Comum'
import { CardMeta } from '@/components/pessoal/metas/CardMeta'
import { DialogAreas, DialogMeta, DialogObjetivo, DialogProgresso } from '@/components/pessoal/metas/DialogsMetas'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAreas, useMarcos, useMetas, useObjetivos, useVisaoAnual } from '@/hooks/usePessoal'
import { mensagemErro } from '@/lib/erros'
import { hojeSP, porcento, STATUS_META } from '@/lib/pessoal'
import type { MetaSituacao, Objetivo } from '@/types/pessoal'

export default function Metas() {
  const [params, setParams] = useSearchParams()
  const anoAtual = Number(hojeSP().slice(0, 4))
  const ano = Number(params.get('ano')) || anoAtual
  const mudarAno = (n: number) => setParams(n === anoAtual ? {} : { ano: String(n) }, { replace: true })

  const areas = useAreas()
  const objetivos = useObjetivos()
  const metas = useMetas()
  const marcos = useMarcos()
  const visao = useVisaoAnual(ano)

  const [objetivoAberto, setObjetivoAberto] = useState<{ objetivo: Objetivo | null; area?: string } | null>(null)
  const [metaAberta, setMetaAberta] = useState<{ meta: MetaSituacao | null; objetivo?: string } | null>(null)
  const [progresso, setProgresso] = useState<MetaSituacao | null>(null)
  const [areasAberto, setAreasAberto] = useState(false)

  const doAno = useMemo(() => (objetivos.data ?? []).filter((o) => o.ano === ano), [objetivos.data, ano])
  const metasDoAno = useMemo(() => (metas.data ?? []).filter((m) => m.ano === ano), [metas.data, ano])
  const atrasadas = metasDoAno.filter((m) => m.situacao === 'atrasada')
  const marcosPorMeta = useMemo(() => {
    const m = new Map<string, typeof marcos.data>()
    for (const x of marcos.data ?? []) m.set(x.meta_id, [...(m.get(x.meta_id) ?? []), x])
    return m
  }, [marcos.data])
  const areaDe = (id: string | null | undefined) => areas.data?.find((a) => a.id === id)

  const carregando = areas.isPending || objetivos.isPending || metas.isPending
  const erro = areas.error ?? objetivos.error ?? metas.error

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5">
      <Cabecalho titulo="Metas do ano" descricao="Objetivos por área da vida, com metas que dizem se você está em dia.">
        <Button variant="outline" onClick={() => setAreasAberto(true)}>
          <ShapesIcon />
          Áreas
        </Button>
        <Button onClick={() => setObjetivoAberto({ objetivo: null })}>
          <PlusIcon />
          Novo objetivo
        </Button>
      </Cabecalho>

      <div className="flex items-center justify-center gap-1">
        <Button variant="outline" size="icon" aria-label="Ano anterior" onClick={() => mudarAno(ano - 1)}>
          <ChevronLeftIcon />
        </Button>
        <span className="min-w-20 text-center text-lg font-semibold tabular-nums" aria-live="polite">
          {ano}
        </span>
        <Button variant="outline" size="icon" aria-label="Próximo ano" onClick={() => mudarAno(ano + 1)}>
          <ChevronRightIcon />
        </Button>
      </div>

      {carregando ? (
        <Skeleton className="h-96" />
      ) : erro ? (
        <p className="text-destructive text-sm">{mensagemErro(erro)}</p>
      ) : (
        <>
          {atrasadas.length > 0 && (
            <Card className="gap-3 border-red-500/40 py-4">
              <CardHeader className="px-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TriangleAlertIcon className="size-5 text-red-600 dark:text-red-400" />
                  {atrasadas.length} {atrasadas.length === 1 ? 'meta atrasada' : 'metas atrasadas'}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <ul className="grid gap-1.5 text-sm">
                  {atrasadas.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center justify-between gap-x-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium">{m.titulo}</span>
                        <SeloArea area={areaDe(m.area_id)} />
                      </span>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        esperado {porcento(m.esperado)} · realizado {porcento(m.percentual)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <section className="grid gap-2" aria-label="Progresso por área">
            <h2 className="text-muted-foreground text-sm font-medium">Progresso por área</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(visao.data ?? [])
                .filter((v) => v.metas > 0)
                .map((v) => {
                  const area = areaDe(v.area_id)
                  return (
                    <div key={v.area_id} className="bg-card grid gap-2 rounded-xl border p-3">
                      <div className="flex items-center gap-2">
                        <IconeArea area={area} className="size-8" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{area?.nome}</span>
                        <span className="text-lg font-semibold tabular-nums">{porcento(v.progresso)}</span>
                      </div>
                      <BarraProgresso valor={v.progresso} esperado={v.esperado} cor={area?.cor} rotulo={`Progresso médio em ${area?.nome}`} />
                      <p className="text-muted-foreground text-xs">
                        {v.metas} {v.metas === 1 ? 'meta' : 'metas'} · {v.concluidas} concluídas
                        {v.atrasadas > 0 && <span className="text-red-700 dark:text-red-400"> · {v.atrasadas} atrasadas</span>}
                      </p>
                    </div>
                  )
                })}
            </div>
            {visao.data && visao.data.some((v) => v.metas === 0) && (
              <p className="text-muted-foreground text-xs">
                Sem metas em {ano}:{' '}
                {visao.data
                  .filter((v) => v.metas === 0)
                  .map((v) => areaDe(v.area_id)?.nome)
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
          </section>

          {doAno.length === 0 ? (
            <Vazio icone={TargetIcon} titulo={`Nenhum objetivo para ${ano}`}>
              Comece por um objetivo em cada área importante e quebre em metas mensuráveis.
              <Button onClick={() => setObjetivoAberto({ objetivo: null })}>
                <PlusIcon />
                Criar objetivo
              </Button>
            </Vazio>
          ) : (
            (areas.data ?? [])
              .filter((a) => doAno.some((o) => o.area_id === a.id))
              .map((a) => (
                <section key={a.id} className="grid gap-3" aria-label={a.nome}>
                  <h2 className="flex items-center gap-2 font-semibold">
                    <IconeArea area={a} className="size-7" />
                    {a.nome}
                  </h2>
                  <div className="grid items-start gap-3 lg:grid-cols-2">
                    {doAno
                      .filter((o) => o.area_id === a.id)
                      .map((o) => {
                        const metasObjetivo = metasDoAno.filter((m) => m.objetivo_id === o.id)
                        return (
                          <Card key={o.id} className="gap-3 py-4">
                            <CardHeader className="flex flex-row items-start justify-between gap-2 px-4">
                              <div className="min-w-0">
                                <CardTitle className="text-base">{o.titulo}</CardTitle>
                                {o.status !== 'em_andamento' && <p className="text-muted-foreground text-xs">{STATUS_META[o.status]}</p>}
                                {o.descricao && <p className="text-muted-foreground mt-0.5 text-xs">{o.descricao}</p>}
                              </div>
                              <Button variant="ghost" size="icon" className="-mt-1 -mr-1 size-8" aria-label={`Editar ${o.titulo}`} onClick={() => setObjetivoAberto({ objetivo: o })}>
                                <PencilIcon />
                              </Button>
                            </CardHeader>
                            <CardContent className="grid gap-2 px-4">
                              {metasObjetivo.map((m) => (
                                <CardMeta
                                  key={m.id}
                                  meta={m}
                                  area={a}
                                  marcos={marcosPorMeta.get(m.id)}
                                  onEditar={() => setMetaAberta({ meta: m })}
                                  onProgresso={() => setProgresso(m)}
                                />
                              ))}
                              <Button variant="ghost" size="sm" className="w-fit" onClick={() => setMetaAberta({ meta: null, objetivo: o.id })}>
                                <PlusIcon />
                                Adicionar meta
                              </Button>
                            </CardContent>
                          </Card>
                        )
                      })}
                  </div>
                </section>
              ))
          )}
        </>
      )}

      <DialogObjetivo
        aberto={objetivoAberto !== null}
        objetivo={objetivoAberto?.objetivo ?? null}
        areaInicial={objetivoAberto?.area}
        ano={ano}
        onFechar={() => setObjetivoAberto(null)}
      />
      <DialogMeta
        aberto={metaAberta !== null}
        meta={metaAberta?.meta ?? null}
        objetivoInicial={metaAberta?.objetivo}
        ano={ano}
        onFechar={() => setMetaAberta(null)}
      />
      <DialogProgresso meta={progresso && (metas.data?.find((m) => m.id === progresso.id) ?? progresso)} onFechar={() => setProgresso(null)} />
      <DialogAreas aberto={areasAberto} onFechar={() => setAreasAberto(false)} />
    </div>
  )
}
