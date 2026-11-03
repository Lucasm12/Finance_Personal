import { FlagIcon, PlusIcon } from 'lucide-react'

import { ItemPlanejado } from '@/components/triathlon/agenda/ItemPlanejado'
import { CartaoProva, EtiquetaProva, provasPorDia } from '@/components/triathlon/agenda/ProvaAgenda'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { diasDaSemana, numeroSemana, ORDEM_STATUS, semanasDoMes, STATUS, statusEfetivo } from '@/lib/agenda'
import { dataLocal, MODALIDADES } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { Competencia } from '@/types'
import type { Prova, TreinoPlanejado } from '@/types/triathlon'

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

/** "Terça-feira, 28 de outubro" */
export function diaPorExtenso(data: string) {
  const t = new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** "Ter, 28/10" */
const diaCurto = (data: string, i: number) => `${DIAS[i]}, ${data.slice(8, 10)}/${data.slice(5, 7)}`

function porDia(treinos: TreinoPlanejado[]) {
  const mapa = new Map<string, TreinoPlanejado[]>()
  for (const t of treinos) mapa.set(t.data, [...(mapa.get(t.data) ?? []), t])
  return mapa
}

export function LegendaStatus() {
  return (
    <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {ORDEM_STATUS.map((s) => {
        const info = STATUS[s]
        return (
          <li key={s} className="flex items-center gap-1">
            <info.icone className={cn('size-3.5', info.texto)} aria-hidden />
            {info.rotulo}
          </li>
        )
      })}
      <li className="flex items-center gap-1">
        <FlagIcon className="text-primary size-3.5" aria-hidden />
        Prova
      </li>
    </ul>
  )
}

// -----------------------------------------------------------------------------
// Mês
// -----------------------------------------------------------------------------

interface PropsMes {
  competencia: Competencia
  semana: string
  treinos: TreinoPlanejado[]
  /** provas cadastradas em Provas: aparecem sozinhas no dia */
  provas: Prova[]
  onSemana: (semana: string) => void
  onDia: (data: string) => void
}

export function CalendarioMes({ competencia, semana, treinos, provas, onSemana, onDia }: PropsMes) {
  const hoje = dataLocal(new Date())
  const mes = competencia.slice(0, 7)
  const dias = porDia(treinos)
  const diasProva = provasPorDia(provas)

  return (
    <div className="grid gap-2">
      <div className="bg-border grid grid-cols-[2.25rem_repeat(7,minmax(0,1fr))] gap-px overflow-hidden rounded-lg border">
        <div className="bg-muted" />
        {DIAS.map((d) => (
          <div key={d} className="bg-muted text-muted-foreground py-1.5 text-center text-xs font-medium">
            {d}
          </div>
        ))}
        {semanasDoMes(competencia).map((s) => {
          const selecionada = s === semana
          return (
            <div key={s} className="contents">
              <button
                type="button"
                onClick={() => onSemana(s)}
                aria-pressed={selecionada}
                aria-label={`Selecionar a semana ${numeroSemana(s)}`}
                title="Selecionar esta semana"
                className={cn(
                  'flex items-start justify-center pt-1.5 text-[10px] font-semibold tabular-nums transition-colors',
                  selecionada ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent',
                )}
              >
                S{numeroSemana(s)}
              </button>
              {diasDaSemana(s).map((d) => {
                const lista = dias.get(d) ?? []
                const provasDia = diasProva.get(d) ?? []
                const foraDoMes = d.slice(0, 7) !== mes
                const efetivos = lista.map((t) => statusEfetivo(t, hoje).status)
                const resumo = ORDEM_STATUS.map((st) => [st, efetivos.filter((x) => x === st).length] as const)
                  .filter(([, n]) => n)
                  .map(([st, n]) => `${n} ${STATUS[st].rotulo.toLowerCase()}`)
                  .join(', ')
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onDia(d)}
                    aria-label={`${diaPorExtenso(d)}${provasDia.map((p) => `: prova ${p.nome}`).join('')}${lista.length ? `: ${lista.length} treino(s), ${resumo}` : ': sem treinos'}`}
                    className={cn(
                      // fundos opacos: a grade usa o fundo do contêiner como linha (gap-px)
                      'flex min-h-16 flex-col gap-1 p-1 text-left transition-colors sm:min-h-24 sm:p-1.5',
                      selecionada
                        ? 'bg-[color-mix(in_oklab,var(--primary)_8%,var(--card))] hover:bg-[color-mix(in_oklab,var(--primary)_14%,var(--card))]'
                        : foraDoMes
                          ? 'bg-[color-mix(in_oklab,var(--muted)_60%,var(--card))] hover:bg-accent'
                          : 'bg-card hover:bg-accent',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-6 items-center justify-center rounded-full text-xs tabular-nums',
                        d === hoje ? 'bg-primary text-primary-foreground font-semibold' : foraDoMes ? 'text-muted-foreground/60' : '',
                      )}
                    >
                      {Number(d.slice(8))}
                    </span>
                    {/* celular: bolinhas; telas maiores: etiquetas com o nome */}
                    <span className="flex flex-wrap items-center gap-0.5 sm:hidden">
                      {provasDia.map((p) => (
                        <FlagIcon key={p.id} className="text-primary size-3" aria-hidden />
                      ))}
                      {lista.map((t, i) => (
                        <span key={t.id} className={cn('size-2 rounded-full', STATUS[efetivos[i]].fundo)} />
                      ))}
                    </span>
                    <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                      {provasDia.map((p) => (
                        <EtiquetaProva key={p.id} prova={p} />
                      ))}
                      {lista.slice(0, Math.max(0, 3 - provasDia.length)).map((t, i) => {
                        const info = STATUS[efetivos[i]]
                        const Icone = MODALIDADES[t.modalidade].icone
                        return (
                          <span key={t.id} className={cn('flex min-w-0 items-center gap-1 rounded px-1 py-0.5 text-[11px] leading-tight', info.suave)}>
                            <info.icone className={cn('size-3 shrink-0', info.texto)} aria-hidden />
                            <Icone className="text-muted-foreground size-3 shrink-0" aria-hidden />
                            <span className="truncate">{t.nome}</span>
                          </span>
                        )
                      })}
                      {lista.length > Math.max(0, 3 - provasDia.length) && (
                        <span className="text-muted-foreground px-1 text-[11px]">+{lista.length - Math.max(0, 3 - provasDia.length)} mais</span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <LegendaStatus />
        <span className="text-muted-foreground text-xs">Toque num dia para ver ou planejar; em “S” para escolher a semana.</span>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Semana
// -----------------------------------------------------------------------------

interface PropsSemana {
  semana: string
  treinos: TreinoPlanejado[]
  provas: Prova[]
  onNovo: (data: string) => void
  onEditar: (t: TreinoPlanejado) => void
}

export function SemanaDetalhe({ semana, treinos, provas, onNovo, onEditar }: PropsSemana) {
  const hoje = dataLocal(new Date())
  const dias = porDia(treinos)
  const diasProva = provasPorDia(provas)
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <ul className="divide-y">
        {diasDaSemana(semana).map((d, i) => {
          const lista = dias.get(d) ?? []
          const provasDia = diasProva.get(d) ?? []
          return (
            <li key={d} className={cn(d === hoje && 'bg-primary/5')}>
              <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-1">
                <span className="text-sm font-semibold">
                  {diaCurto(d, i)}
                  {d === hoje && <span className="text-primary ml-2 text-xs font-medium">hoje</span>}
                </span>
                <Button variant="ghost" size="sm" className="text-muted-foreground h-7" onClick={() => onNovo(d)}>
                  <PlusIcon />
                  Treino
                </Button>
              </div>
              {provasDia.length > 0 && (
                <div className="grid gap-2 px-3 pb-2">
                  {provasDia.map((p) => (
                    <CartaoProva key={p.id} prova={p} />
                  ))}
                </div>
              )}
              {lista.length ? (
                <ul className="divide-y">
                  {lista.map((t) => (
                    <ItemPlanejado key={t.id} treino={t} onEditar={onEditar} />
                  ))}
                </ul>
              ) : (
                !provasDia.length && <p className="text-muted-foreground px-3 pb-3 text-xs">Descanso — nada planejado.</p>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

// -----------------------------------------------------------------------------
// Dia
// -----------------------------------------------------------------------------

interface PropsDia {
  data: string | null
  treinos: TreinoPlanejado[]
  provas: Prova[]
  onFechar: () => void
  onNovo: (data: string) => void
  onEditar: (t: TreinoPlanejado) => void
}

export function DialogDia({ data, treinos, provas, onFechar, onNovo, onEditar }: PropsDia) {
  const lista = data ? treinos.filter((t) => t.data === data) : []
  const provasDia = data ? provas.filter((p) => p.data === data) : []
  return (
    <Dialog open={data !== null} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        {data && (
          <>
            <DialogHeader>
              <DialogTitle>{diaPorExtenso(data)}</DialogTitle>
              <DialogDescription>
                {lista.length
                  ? 'Marque a situação de cada treino, leve para o relógio Garmin (botão do relógio), importe o treino feito (botão com a seta) ou toque no nome para editar e reagendar.'
                  : 'Nenhum treino planejado neste dia.'}
              </DialogDescription>
            </DialogHeader>
            {provasDia.map((p) => (
              <CartaoProva key={p.id} prova={p} />
            ))}
            {lista.length > 0 && (
              <ul className="divide-y rounded-lg border">
                {lista.map((t) => (
                  <ItemPlanejado key={t.id} treino={t} onEditar={onEditar} />
                ))}
              </ul>
            )}
            <Button onClick={() => onNovo(data)}>
              <PlusIcon />
              Planejar treino neste dia
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
