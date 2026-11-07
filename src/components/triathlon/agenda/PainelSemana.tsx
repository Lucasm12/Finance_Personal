import { CheckIcon, CopyIcon, LoaderCircleIcon, PlusIcon, TargetIcon } from 'lucide-react'
import { toast } from 'sonner'

import { IconeModalidade } from '@/components/triathlon/LinhaTreino'
import { CartaoProva } from '@/components/triathlon/agenda/ProvaAgenda'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTema } from '@/hooks/useTema'
import { useCopiarSemanaPlanejada, useIncluirNoPlano } from '@/hooks/useTriathlon'
import {
  distanciaTexto,
  ehModalidadeAgenda,
  MODALIDADES_AGENDA,
  numeroSemana,
  progressoSemana,
  quantidade,
  STATUS,
  textoSemana,
  type ProgressoModalidade,
} from '@/lib/agenda'
import { dataLocal, duracaoCurta, MODALIDADES, somarDias } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { MetaSemanal, ModalidadeAgenda, Prova, Treino, TreinoPlanejado } from '@/types/triathlon'

const pct = (f: number) => `${Math.round(f * 100)}%`

/** Barra de progresso de uma modalidade: preenchimento na cor da modalidade sobre trilho neutro. */
export function BarraMeta({ p }: { p: ProgressoModalidade }) {
  const { cor } = useTema()
  const info = MODALIDADES[p.modalidade]
  const batida = (p.fracao ?? 0) >= 1
  return (
    <div className="grid grid-cols-1 gap-1">
      <div className="flex items-center gap-2">
        <IconeModalidade modalidade={p.modalidade} className="size-6" />
        <span className="min-w-0 truncate text-sm font-medium">{info.nome}</span>
        {/* sem quebra no meio ("0 sessões de 2 / sessões") nas telas estreitas */}
        <span className="ml-auto text-sm whitespace-nowrap tabular-nums">
          {p.meta !== null ? (
            <>
              {/* academia: "0 de 2 sessões" (a unidade uma vez só); distâncias: "12 km de 35 km" */}
              <strong>
                {p.modalidade === 'forca'
                  ? round(p.realizado, p.modalidade)
                  : quantidade(p.modalidade, round(p.realizado, p.modalidade))}
              </strong>
              <span className="text-muted-foreground"> de {quantidade(p.modalidade, p.meta)}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{p.realizado ? `${quantidade(p.modalidade, round(p.realizado, p.modalidade))} · ` : ''}sem meta</span>
          )}
        </span>
        {p.fracao !== null && (
          <span className={cn('w-12 text-right text-sm font-semibold tabular-nums', batida && 'text-status-bom')}>{pct(p.fracao)}</span>
        )}
      </div>
      {p.meta !== null && (
        <div
          className="bg-muted h-2 overflow-hidden rounded-full"
          role="progressbar"
          aria-label={`${info.nome}: ${pct(p.fracao ?? 0)} da meta`}
          aria-valuenow={Math.round((p.fracao ?? 0) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(1, p.fracao ?? 0) * 100}%`, backgroundColor: cor(info.cor) }} />
        </div>
      )}
      <div className="text-muted-foreground flex items-center gap-1 text-[11px]">
        {batida && (
          <span className="text-foreground inline-flex items-center gap-0.5 font-medium">
            <CheckIcon className="text-status-bom size-3" />
            meta batida ·
          </span>
        )}
        {p.treinos ? `${p.treinos} treino(s) · planejado ${quantidade(p.modalidade, round(p.planejado, p.modalidade))}` : 'nenhum treino planejado'}
      </div>
    </div>
  )
}

const round = (v: number, m: ModalidadeAgenda) => (m === 'natacao' || m === 'forca' ? Math.round(v) : Math.round(v * 10) / 10)

interface Props {
  semana: string
  treinos: TreinoPlanejado[]
  metas: MetaSemanal[]
  provas: Prova[]
  /** atividades registradas em Treinos nesta semana */
  atividades: Treino[]
  onMetas: () => void
  onNovo: () => void
}

export function PainelSemana({ semana, treinos, metas, provas, atividades, onMetas, onNovo }: Props) {
  const p = progressoSemana(semana, treinos, metas)
  const provasDaSemana = provas.filter((x) => x.data >= semana && x.data <= somarDias(semana, 6))
  const copiar = useCopiarSemanaPlanejada()
  const incluir = useIncluirNoPlano()
  const temMeta = MODALIDADES_AGENDA.some((m) => p.modalidades[m].meta !== null)
  const vinculadas = new Set(treinos.map((t) => t.treino_id).filter(Boolean))
  const foraDoPlano = atividades.filter(
    (a): a is Treino & { modalidade: ModalidadeAgenda } => ehModalidadeAgenda(a.modalidade) && !vinculadas.has(a.id),
  )

  async function copiarSemanaAnterior() {
    try {
      const n = await copiar.mutateAsync({ de: somarDias(semana, -7), para: semana })
      if (n === 0) toast.info('A semana anterior não tem treinos planejados.')
      else toast.success(`${n} treino(s) copiado(s) da semana anterior, como pendentes.`)
    } catch {
      // erro já exibido pelo hook
    }
  }

  const contagens = [
    { status: 'concluido' as const, n: p.concluidos, extra: null },
    { status: 'perdido' as const, n: p.perdidos, extra: p.perdidosSemMarcar ? `${p.perdidosSemMarcar} sem marcar` : null },
    { status: 'pendente' as const, n: p.pendentes, extra: null },
  ]

  return (
    <Card className="gap-4">
      <CardHeader className="flex items-start justify-between gap-2">
        <div>
          <CardTitle>Semana {numeroSemana(semana)}</CardTitle>
          <CardDescription>{textoSemana(semana)}</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onMetas}>
          <TargetIcon />
          {temMeta ? 'Metas' : 'Definir metas'}
        </Button>
      </CardHeader>
      {/* grid-cols-1 (= minmax(0, 1fr)) nos grids aninhados: sem isso, o nome longo de um treino em
          "Feitos fora do plano" esticava o cartão (584 px num celular de 390; 1256 px no desktop) */}
      <CardContent className="grid grid-cols-1 gap-4">
        {provasDaSemana.map((x) => (
          <div key={x.id} className="grid gap-1">
            <span className="text-xs font-medium">Prova nesta semana — {new Date(`${x.data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
            <CartaoProva prova={x} />
          </div>
        ))}
        {!temMeta && (
          <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
            Esta semana ainda não tem metas. Defina quantos km, metros ou sessões quer fazer em cada modalidade.
          </p>
        )}
        <div className="grid grid-cols-1 gap-3.5">
          {MODALIDADES_AGENDA.map((m) => (
            <BarraMeta key={m} p={p.modalidades[m]} />
          ))}
        </div>

        <dl className="grid grid-cols-3 gap-2">
          {contagens.map(({ status, n, extra }) => {
            const info = STATUS[status]
            return (
              // celular estreito: "Concluídos" desce para baixo do ícone em vez de vazar da coluna
              <div key={status} className="bg-muted/40 min-w-0 rounded-lg px-2 py-2 sm:px-2.5">
                <dt className="flex flex-wrap items-center gap-x-1 text-[11px] sm:text-xs">
                  <info.icone className={cn('size-3.5 shrink-0', info.texto)} aria-hidden />
                  {info.rotulo}s
                </dt>
                <dd className="text-lg font-semibold tabular-nums">{n}</dd>
                {extra && <dd className="text-muted-foreground text-[11px] leading-tight">{extra}</dd>}
              </div>
            )
          })}
        </dl>
        {p.total > 0 && (
          <p className="text-muted-foreground -mt-2 text-xs">
            {p.total} treino(s) na semana. Pendente de um dia que já passou conta como perdido, mas você ainda pode marcá-lo como concluído.
          </p>
        )}

        {p.total === 0 && (
          <div className="grid gap-2 rounded-lg border border-dashed p-3 text-sm">
            <span className="text-muted-foreground">Nenhum treino planejado nesta semana.</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={onNovo}>
                <PlusIcon />
                Planejar treino
              </Button>
              <Button size="sm" variant="outline" onClick={copiarSemanaAnterior} disabled={copiar.isPending}>
                {copiar.isPending ? <LoaderCircleIcon className="animate-spin" /> : <CopyIcon />}
                Copiar da semana anterior
              </Button>
            </div>
          </div>
        )}

        {foraDoPlano.length > 0 && (
          <div className="grid grid-cols-1 gap-1.5">
            <div className="text-sm font-medium">Feitos fora do plano</div>
            <p className="text-muted-foreground -mt-1 text-xs">Atividades registradas em Treinos nesta semana. Inclua para contarem na meta.</p>
            <ul className="divide-y rounded-lg border">
              {foraDoPlano.map((a) => (
                <li key={a.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <IconeModalidade modalidade={a.modalidade} className="size-6" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{a.nome}</span>
                    <span className="text-muted-foreground text-xs">
                      {dataLocal(a.data_hora).split('-').reverse().slice(0, 2).join('/')}
                      {a.distancia_m && a.modalidade !== 'forca' ? ` · ${distanciaTexto(a.modalidade, a.distancia_m)}` : ''} · {duracaoCurta(a.duracao_seg)}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={incluir.isPending}
                    onClick={() =>
                      incluir.mutate(
                        { treino: a, data: dataLocal(a.data_hora) },
                        { onSuccess: () => toast.success('Incluído no plano como concluído.') },
                      )
                    }
                  >
                    Incluir
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
