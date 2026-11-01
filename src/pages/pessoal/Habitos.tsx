import { useMemo, useState } from 'react'
import { ArchiveIcon, ArchiveRestoreIcon, EllipsisIcon, PlusIcon, RepeatIcon, TrophyIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Cabecalho, SeloArea, Vazio } from '@/components/pessoal/Comum'
import { DialogHabito, Sequencia } from '@/components/pessoal/habitos/Habitos'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useAreas, useExcluirHabito, useHabitos, useMarcarHabito, useRegistrosHabitos, useResumoHabitos, useSalvarHabito } from '@/hooks/usePessoal'
import { mensagemErro } from '@/lib/erros'
import { dataCurta, DIAS_SEMANA, diaDaSemana, hojeSP, porcento, previstoNoDia, textoFrequencia } from '@/lib/pessoal'
import { somarDias } from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { Habito, ResumoHabito } from '@/types/pessoal'

const DIAS = 14

const fracao = (feitos: number, previstos: number) => (previstos > 0 ? porcento(feitos / previstos) : '—')

function CardHabito({ habito, resumo, feitos, dias }: { habito: Habito; resumo: ResumoHabito | undefined; feitos: Set<string>; dias: string[] }) {
  const marcar = useMarcarHabito()
  const salvar = useSalvarHabito()
  const excluir = useExcluirHabito()
  const areas = useAreas()
  const [confirmando, setConfirmando] = useState(false)
  const [editando, setEditando] = useState(false)
  const hoje = dias.at(-1)!

  return (
    <Card className="gap-3 px-4 py-3">
      <div className="flex items-start gap-3">
        {resumo?.previsto_hoje ? (
          <Checkbox
            className="mt-0.5 size-6"
            aria-label={`${habito.titulo}: feito hoje`}
            checked={resumo.feito_hoje}
            onCheckedChange={(v) => marcar.mutate({ habito_id: habito.id, data: hoje, feito: v === true })}
          />
        ) : (
          <span className="text-muted-foreground mt-0.5 w-6 text-center text-[10px] leading-tight">folga hoje</span>
        )}
        <div className="min-w-0 flex-1">
          <p className={cn('font-medium', resumo?.feito_hoje && 'text-muted-foreground')}>{habito.titulo}</p>
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
            {textoFrequencia(habito.frequencia)}
            <SeloArea area={areas.data?.find((a) => a.id === habito.area_id)} />
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-mt-1 -mr-2 size-8" aria-label={`Ações de ${habito.titulo}`}>
              <EllipsisIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditando(true)}>Editar</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => salvar.mutate({ id: habito.id, dados: { ativo: false } }, { onSuccess: () => toast.success('Hábito arquivado.') })}>
              <ArchiveIcon />
              Arquivar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={(e) => {
                if (!confirmando) {
                  e.preventDefault()
                  return setConfirmando(true)
                }
                excluir.mutate(habito.id, { onSuccess: () => toast.success('Hábito e histórico excluídos.') })
              }}
            >
              {confirmando ? 'Toque de novo: apaga o histórico' : 'Excluir'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {resumo && (
        <dl className="grid grid-cols-4 gap-2 text-center">
          <div>
            <dt className="text-muted-foreground text-[11px]">Sequência</dt>
            <dd>
              <Sequencia dias={resumo.sequencia} className="text-sm" />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[11px]">Recorde</dt>
            <dd className="inline-flex items-center gap-0.5 text-sm font-medium tabular-nums">
              <TrophyIcon className="text-muted-foreground size-3.5" aria-hidden />
              {resumo.recorde}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[11px]">Semana</dt>
            <dd className="text-sm font-medium tabular-nums">{fracao(resumo.feitos_semana, resumo.previstos_semana)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[11px]">Mês</dt>
            <dd className="text-sm font-medium tabular-nums">{fracao(resumo.feitos_mes, resumo.previstos_mes)}</dd>
          </div>
        </dl>
      )}

      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${dias.length}, minmax(0, 1fr))` }} role="group" aria-label="Últimos 14 dias">
        {dias.map((d) => {
          const previsto = previstoNoDia(habito.frequencia, d) && d >= habito.inicio
          const feito = feitos.has(d)
          const texto = `${dataCurta(d)}: ${!previsto ? 'não previsto' : feito ? 'feito' : d === hoje ? 'ainda não' : 'não feito'}`
          return (
            <button
              key={d}
              type="button"
              disabled={!previsto}
              title={texto}
              aria-label={texto}
              aria-pressed={previsto ? feito : undefined}
              onClick={() => marcar.mutate({ habito_id: habito.id, data: d, feito: !feito })}
              className="group flex flex-col items-center gap-0.5 disabled:cursor-default"
            >
              <span className="text-muted-foreground text-[9px] leading-none">{DIAS_SEMANA[diaDaSemana(d) - 1][0].toUpperCase()}</span>
              <span
                className={cn(
                  'aspect-square w-full max-w-6 rounded-[4px]',
                  !previsto && 'bg-muted/50 scale-50',
                  previsto && feito && 'bg-primary',
                  previsto && !feito && d < hoje && 'border border-red-500/40 bg-red-500/15',
                  previsto && !feito && d === hoje && 'border-primary border-2 border-dashed',
                )}
              />
            </button>
          )
        })}
      </div>
      <DialogHabito aberto={editando} habito={habito} onFechar={() => setEditando(false)} />
    </Card>
  )
}

export default function Habitos() {
  const hoje = hojeSP()
  const inicio = somarDias(hoje, -(DIAS - 1))
  const habitos = useHabitos()
  const resumo = useResumoHabitos()
  const registros = useRegistrosHabitos(inicio, hoje)
  const salvar = useSalvarHabito()
  const [novo, setNovo] = useState(false)

  const dias = useMemo(() => Array.from({ length: DIAS }, (_, i) => somarDias(inicio, i)), [inicio])
  const feitosPorHabito = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const r of registros.data ?? []) {
      if (!r.feito) continue
      if (!m.has(r.habito_id)) m.set(r.habito_id, new Set())
      m.get(r.habito_id)!.add(r.data)
    }
    return m
  }, [registros.data])
  const ativos = (habitos.data ?? []).filter((h) => h.ativo)
  const arquivados = (habitos.data ?? []).filter((h) => !h.ativo)
  const resumoDe = (id: string) => resumo.data?.find((r) => r.habito_id === id)
  const previstosHoje = (resumo.data ?? []).filter((r) => r.previsto_hoje)
  const feitosHoje = previstosHoje.filter((r) => r.feito_hoje).length

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5">
      <Cabecalho
        titulo="Hábitos"
        descricao={previstosHoje.length ? `Hoje: ${feitosHoje} de ${previstosHoje.length} feitos.` : 'Marque o que fez a cada dia previsto.'}
      >
        <Button onClick={() => setNovo(true)}>
          <PlusIcon />
          Novo hábito
        </Button>
      </Cabecalho>

      {habitos.isPending ? (
        <Skeleton className="h-64" />
      ) : habitos.error ? (
        <p className="text-destructive text-sm">{mensagemErro(habitos.error)}</p>
      ) : ativos.length === 0 ? (
        <Vazio icone={RepeatIcon} titulo="Nenhum hábito ainda">
          Comece com um ou dois hábitos pequenos, como orar ao acordar ou ler 10 minutos.
          <Button onClick={() => setNovo(true)}>
            <PlusIcon />
            Criar hábito
          </Button>
        </Vazio>
      ) : (
        <div className="grid items-start gap-3 md:grid-cols-2">
          {ativos.map((h) => (
            <CardHabito key={h.id} habito={h} resumo={resumoDe(h.id)} feitos={feitosPorHabito.get(h.id) ?? new Set()} dias={dias} />
          ))}
        </div>
      )}
      <p className="text-muted-foreground text-xs">
        Sequência e percentuais são calculados no servidor e só contam os dias previstos. Hoje sem marcar não quebra a sequência: o dia ainda não
        acabou.
      </p>

      {arquivados.length > 0 && (
        <details className="rounded-xl border px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium">Arquivados ({arquivados.length})</summary>
          <ul className="mt-2 divide-y">
            {arquivados.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="text-muted-foreground truncate">{h.titulo}</span>
                <Button size="sm" variant="ghost" onClick={() => salvar.mutate({ id: h.id, dados: { ativo: true } }, { onSuccess: () => toast.success('Hábito reativado.') })}>
                  <ArchiveRestoreIcon />
                  Reativar
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <DialogHabito aberto={novo} habito={null} onFechar={() => setNovo(false)} />
    </div>
  )
}
