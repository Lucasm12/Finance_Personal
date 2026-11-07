import { Link } from 'react-router-dom'
import { CalendarCheckIcon, ListTodoIcon, RepeatIcon, StarIcon, TargetIcon, TriangleAlertIcon } from 'lucide-react'
import { toast } from 'sonner'

import { CardLeituraHoje } from '@/components/pessoal/biblia/CardLeituraHoje'
import { HabitosHoje } from '@/components/pessoal/habitos/Habitos'
import { CardMeta } from '@/components/pessoal/metas/CardMeta'
import { SeletorHumor } from '@/components/pessoal/SeletorHumor'
import { ItemTarefa, NovaTarefaRapida, ordenarTarefas } from '@/components/pessoal/tarefas/Tarefas'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAreas, useDiario, useHabitos, useMetas, useResumoHabitos, useSalvarDiario, useTarefas } from '@/hooks/usePessoal'
import { mensagemErro } from '@/lib/erros'
import { dataPorExtenso, diaDaSemana, hojeSP, horaSP } from '@/lib/pessoal'
import { saudacao } from '@/lib/texto'
import { ROTAS_PESSOAL } from '@/modulos'
import type { SituacaoMeta } from '@/types/pessoal'

const ORDEM_SITUACAO: Record<SituacaoMeta, number> = { atrasada: 0, em_dia: 1, nao_iniciada: 2, concluida: 3, pausada: 4 }

function VerTodos({ para, children }: { para: string; children: string }) {
  return (
    <CardAction>
      <Button asChild variant="ghost" size="sm" className="-my-1">
        <Link to={para}>{children}</Link>
      </Button>
    </CardAction>
  )
}

function CardTarefas({ hoje }: { hoje: string }) {
  const tarefas = useTarefas()
  const todas = tarefas.data ?? []
  const deHoje = todas.filter((t) => t.data === hoje).sort(ordenarTarefas)
  const foco = deHoje.filter((t) => t.foco)
  const outras = deHoje.filter((t) => !t.foco)
  const atrasadas = todas.filter((t) => !t.concluida && t.data < hoje).length

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTodoIcon className="text-primary size-5" />
          Tarefas de hoje
        </CardTitle>
        <VerTodos para={ROTAS_PESSOAL.tarefas}>Ver todas</VerTodos>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3">
        {tarefas.isPending ? (
          <Skeleton className="h-24" />
        ) : tarefas.error ? (
          <p className="text-destructive text-sm">{mensagemErro(tarefas.error)}</p>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-2" aria-label="Prioridades do dia">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                <StarIcon className="size-3.5 fill-amber-400 text-amber-500" aria-hidden />
                3 prioridades do dia
              </h3>
              {foco.length ? (
                <ul className="grid grid-cols-1 gap-2">
                  {foco.map((t) => (
                    <ItemTarefa key={t.id} tarefa={t} />
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">Toque na estrela de até 3 tarefas para destacá-las aqui.</p>
              )}
            </section>
            {outras.length > 0 && (
              <ul className="grid grid-cols-1 gap-2">
                {outras.map((t) => (
                  <ItemTarefa key={t.id} tarefa={t} />
                ))}
              </ul>
            )}
            <NovaTarefaRapida />
            {atrasadas > 0 && (
              <Link to={`${ROTAS_PESSOAL.tarefas}?ver=atrasadas`} className="flex items-center gap-1.5 text-sm text-red-700 hover:underline dark:text-red-400">
                <TriangleAlertIcon className="size-4" />
                {atrasadas} {atrasadas === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}
              </Link>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function CardHabitos() {
  const habitos = useHabitos()
  const resumo = useResumoHabitos()
  const previstos = (resumo.data ?? []).filter((r) => r.previsto_hoje)
  const feitos = previstos.filter((r) => r.feito_hoje).length
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RepeatIcon className="text-primary size-5" />
          Hábitos de hoje
          {previstos.length > 0 && (
            <span className="text-muted-foreground text-sm font-normal tabular-nums">
              {feitos}/{previstos.length}
            </span>
          )}
        </CardTitle>
        <VerTodos para={ROTAS_PESSOAL.habitos}>Ver todos</VerTodos>
      </CardHeader>
      <CardContent>
        {habitos.isPending || resumo.isPending ? (
          <Skeleton className="h-24" />
        ) : habitos.error || resumo.error ? (
          <p className="text-destructive text-sm">{mensagemErro(habitos.error ?? resumo.error)}</p>
        ) : habitos.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum hábito cadastrado.{' '}
            <Link to={ROTAS_PESSOAL.habitos} className="text-primary hover:underline">
              Criar o primeiro
            </Link>
          </p>
        ) : (
          <HabitosHoje habitos={habitos.data} resumo={resumo.data} />
        )}
      </CardContent>
    </Card>
  )
}

function CardMetas({ ano }: { ano: number }) {
  const metas = useMetas()
  const areas = useAreas()
  const emAndamento = (metas.data ?? [])
    .filter((m) => m.ano === ano && m.situacao !== 'concluida' && m.situacao !== 'pausada')
    .sort((a, b) => ORDEM_SITUACAO[a.situacao] - ORDEM_SITUACAO[b.situacao] || b.percentual - a.percentual)
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TargetIcon className="text-primary size-5" />
          Metas em andamento
        </CardTitle>
        <VerTodos para={ROTAS_PESSOAL.metas}>Ver metas</VerTodos>
      </CardHeader>
      <CardContent className="grid gap-2">
        {metas.isPending ? (
          <Skeleton className="h-24" />
        ) : metas.error ? (
          <p className="text-destructive text-sm">{mensagemErro(metas.error)}</p>
        ) : emAndamento.length ? (
          <>
            {emAndamento.slice(0, 5).map((m) => (
              <CardMeta key={m.id} meta={m} area={areas.data?.find((a) => a.id === m.area_id)} mostrarArea compacto />
            ))}
            {emAndamento.length > 5 && <p className="text-muted-foreground text-xs">e mais {emAndamento.length - 5}.</p>}
          </>
        ) : (
          <p className="text-muted-foreground text-sm">Nenhuma meta em andamento em {ano}.</p>
        )}
      </CardContent>
    </Card>
  )
}

function CardHumor({ hoje }: { hoje: string }) {
  const diario = useDiario()
  const salvar = useSalvarDiario()
  const entrada = diario.data?.find((d) => d.data === hoje)
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>Como você está hoje?</CardTitle>
        <VerTodos para={ROTAS_PESSOAL.diario}>Escrever no diário</VerTodos>
      </CardHeader>
      <CardContent>
        <SeletorHumor
          valor={entrada?.humor ?? null}
          onChange={(humor) => salvar.mutate({ data: hoje, humor }, { onSuccess: () => toast.success('Humor registrado no diário.') })}
        />
      </CardContent>
    </Card>
  )
}

export default function MeuDia() {
  const hoje = hojeSP()
  const ano = Number(hoje.slice(0, 4))
  const domingo = diaDaSemana(hoje) === 7

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{saudacao(horaSP())}!</h1>
        <p className="text-muted-foreground text-sm first-letter:uppercase">{dataPorExtenso(hoje)}</p>
      </div>

      {domingo && (
        <Link
          to={`${ROTAS_PESSOAL.diario}?aba=semanal`}
          className="bg-primary/10 hover:bg-primary/15 flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors"
        >
          <CalendarCheckIcon className="text-primary size-5 shrink-0" />
          <span>
            <strong>Hoje é domingo:</strong> faça a revisão da semana e escolha as 3 prioridades da próxima.
          </span>
        </Link>
      )}

      {/* grid-cols-1 (= minmax(0, 1fr)): os cartões acompanham a largura da tela em vez de crescer até o texto mais longo */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <div className="grid grid-cols-1 gap-4">
          <CardLeituraHoje />
          <CardHabitos />
        </div>
        <div className="grid grid-cols-1 gap-4">
          <CardTarefas hoje={hoje} />
          <CardMetas ano={ano} />
          <CardHumor hoje={hoje} />
        </div>
      </div>
    </div>
  )
}
