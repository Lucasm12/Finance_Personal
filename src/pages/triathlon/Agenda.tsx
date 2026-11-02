import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ActivityIcon, CalendarDaysIcon, CalendarRangeIcon, ChevronLeftIcon, ChevronRightIcon, DumbbellIcon, PlusIcon } from 'lucide-react'

import { SeletorMes } from '@/components/SeletorMes'
import { CalendarioMes, DialogDia, LegendaStatus, SemanaDetalhe } from '@/components/triathlon/agenda/Calendario'
import { DialogMetas } from '@/components/triathlon/agenda/DialogMetas'
import { DialogPlanejado } from '@/components/triathlon/agenda/DialogPlanejado'
import { EvolucaoAgenda } from '@/components/triathlon/agenda/EvolucaoAgenda'
import { PainelSemana } from '@/components/triathlon/agenda/PainelSemana'
import { AbaMusculacao } from '@/components/triathlon/forca/AbaMusculacao'
import { AbaEndurance } from '@/components/triathlon/sugestoes/AbaEndurance'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useMetasSemanais, useProvas, useTreinosPeriodo, useTreinosPlanejados } from '@/hooks/useTriathlon'
import { ehSegunda, fimDaSemana, mesDaSemana, numeroSemana, semanasDoMes, textoSemana } from '@/lib/agenda'
import { mensagemErro } from '@/lib/erros'
import { competenciaAtual, competenciaDaUrl, competenciaParaUrl, somarMeses } from '@/lib/format'
import { dataLocal, inicioSemana, somarDias } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { Competencia } from '@/types'
import type { TreinoPlanejado } from '@/types/triathlon'

type Visao = 'mes' | 'semana'

const menor = (...datas: string[]) => [...datas].sort()[0]
const maior = (...datas: string[]) => [...datas].sort().at(-1)!

export default function AgendaTriathlon() {
  const [params, setParams] = useSearchParams()
  const hoje = dataLocal(new Date())

  // mês, semana e visão ficam na URL (?mes=2026-10&semana=2026-10-26&visao=semana)
  const competencia = competenciaDaUrl(params.get('mes')) ?? competenciaAtual()
  const visao: Visao = params.get('visao') === 'semana' ? 'semana' : 'mes'
  const aba = params.get('aba') === 'musculacao' ? 'musculacao' : params.get('aba') === 'endurance' ? 'endurance' : 'calendario'
  const grade = semanasDoMes(competencia)
  const semanaUrl = params.get('semana')
  const semana = ehSegunda(semanaUrl)
    ? semanaUrl
    : grade.includes(inicioSemana(hoje))
      ? inicioSemana(hoje)
      : (grade.find((s) => mesDaSemana(s) === competencia) ?? grade[0])

  function atualizar(mudancas: Record<string, string | null>) {
    setParams(
      (atual) => {
        const novo = new URLSearchParams(atual)
        for (const [k, v] of Object.entries(mudancas)) {
          if (v === null) novo.delete(k)
          else novo.set(k, v)
        }
        return novo
      },
      { replace: true },
    )
  }
  const mesNaUrl = (c: Competencia) => (c === competenciaAtual() ? null : competenciaParaUrl(c))
  const mudarMes = (c: Competencia) => atualizar({ mes: mesNaUrl(c), semana: null })
  const escolherSemana = (s: string) => atualizar({ semana: s })
  // na visão semanal, andar de semana também troca o mês quando a semana passa para o outro
  const andarSemana = (passo: number) => {
    const s = somarDias(semana, 7 * passo)
    atualizar({ semana: s, mes: mesNaUrl(mesDaSemana(s)) })
  }
  const irParaHoje = () => atualizar({ semana: null, mes: null })

  // uma consulta cobre a grade do mês, a semana escolhida e o histórico (6 meses / 12 semanas)
  const inicio = menor(inicioSemana(somarMeses(competencia, -5)), somarDias(semana, -7 * 12), grade[0])
  const fim = maior(fimDaSemana(grade.at(-1)!), fimDaSemana(semana))
  const planejados = useTreinosPlanejados(inicio, fim)
  const metas = useMetasSemanais(inicio, fim)
  const atividades = useTreinosPeriodo(semana, fimDaSemana(semana))
  // provas cadastradas em Provas aparecem sozinhas no calendário
  const provas = useProvas()
  const listaProvas = provas.data ?? []

  const [editor, setEditor] = useState<{ aberto: boolean; treino: TreinoPlanejado | null; data?: string }>({ aberto: false, treino: null })
  const [dia, setDia] = useState<string | null>(null)
  const [metasDe, setMetasDe] = useState<string | null>(null)

  const treinos = planejados.data ?? []
  const listaMetas = metas.data ?? []
  const erro = planejados.error ?? metas.error
  const novo = (data?: string) => setEditor({ aberto: true, treino: null, data: data ?? (semana <= hoje && hoje <= fimDaSemana(semana) ? hoje : semana) })
  const editar = (t: TreinoPlanejado) => setEditor({ aberto: true, treino: t })

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-muted-foreground text-sm">Planeje a semana, marque o que fez e acompanhe as metas por modalidade.</p>
        </div>
        <Button onClick={() => novo()}>
          <PlusIcon />
          Planejar treino
        </Button>
      </div>

      <div className="border-b" role="tablist" aria-label="Agenda">
        {(
          [
            ['calendario', 'Calendário', CalendarDaysIcon],
            ['musculacao', 'Musculação', DumbbellIcon],
            ['endurance', 'Endurance', ActivityIcon],
          ] as const
        ).map(([v, rotulo, Icone]) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={aba === v}
            onClick={() => atualizar({ aba: v === 'calendario' ? null : v })}
            className={cn(
              '-mb-px inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              aba === v ? 'border-primary text-foreground' : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            <Icone className="size-4" />
            {rotulo}
          </button>
        ))}
      </div>

      {aba === 'musculacao' ? (
        <AbaMusculacao />
      ) : aba === 'endurance' ? (
        <AbaEndurance />
      ) : (
        <>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        {visao === 'mes' ? (
          <SeletorMes competencia={competencia} onChange={mudarMes} />
        ) : (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" aria-label="Semana anterior" onClick={() => andarSemana(-1)}>
              <ChevronLeftIcon />
            </Button>
            <div className="flex min-w-48 flex-col items-center px-1 text-center leading-tight">
              <span className="text-base font-semibold sm:text-lg" aria-live="polite">
                Semana {numeroSemana(semana)} · {textoSemana(semana)}
              </span>
              {semana === inicioSemana(hoje) ? (
                <span className="text-muted-foreground text-xs">semana atual</span>
              ) : (
                <button type="button" className="text-primary text-xs font-medium hover:underline" onClick={irParaHoje}>
                  voltar para a semana atual
                </button>
              )}
            </div>
            <Button variant="outline" size="icon" aria-label="Próxima semana" onClick={() => andarSemana(1)}>
              <ChevronRightIcon />
            </Button>
          </div>
        )}
        <div className="bg-muted flex gap-1 rounded-lg p-1" role="radiogroup" aria-label="Visualização">
          {(
            [
              ['mes', 'Mês', CalendarDaysIcon],
              ['semana', 'Semana', CalendarRangeIcon],
            ] as const
          ).map(([v, rotulo, Icone]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={visao === v}
              onClick={() => atualizar({ visao: v === 'mes' ? null : v, semana })}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium',
                visao === v ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icone className="size-4" />
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      {erro ? (
        <Card className="items-center gap-2 px-6 py-10 text-center">
          <p className="font-medium">Não foi possível carregar a agenda</p>
          <p className="text-muted-foreground max-w-lg text-sm">{mensagemErro(erro)}</p>
        </Card>
      ) : planejados.isLoading || metas.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 rounded-xl lg:col-span-2" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 items-start gap-4 sm:gap-5 lg:grid-cols-3">
            <div className={cn('grid gap-2 lg:col-span-2', (planejados.isPlaceholderData || metas.isPlaceholderData) && 'opacity-60')}>
              {visao === 'mes' ? (
                <CalendarioMes
                  competencia={competencia}
                  semana={semana}
                  treinos={treinos}
                  provas={listaProvas}
                  onSemana={escolherSemana}
                  onDia={(d) => {
                    escolherSemana(inicioSemana(d))
                    setDia(d)
                  }}
                />
              ) : (
                <>
                  <SemanaDetalhe semana={semana} treinos={treinos} provas={listaProvas} onNovo={novo} onEditar={editar} />
                  <LegendaStatus />
                </>
              )}
            </div>
            <PainelSemana
              semana={semana}
              treinos={treinos}
              metas={listaMetas}
              provas={listaProvas}
              atividades={atividades.data ?? []}
              onMetas={() => setMetasDe(semana)}
              onNovo={() => novo()}
            />
          </div>

          <EvolucaoAgenda semana={semana} competencia={competencia} treinos={treinos} metas={listaMetas} />
        </>
      )}
        </>
      )}

      <DialogDia
        data={dia}
        treinos={treinos}
        provas={listaProvas}
        onFechar={() => setDia(null)}
        onNovo={(d) => setEditor({ aberto: true, treino: null, data: d })}
        onEditar={editar}
      />
      <DialogPlanejado aberto={editor.aberto} treino={editor.treino} data={editor.data} onFechar={() => setEditor({ aberto: false, treino: null })} />
      <DialogMetas semana={metasDe} metas={listaMetas} onFechar={() => setMetasDe(null)} />
    </div>
  )
}
