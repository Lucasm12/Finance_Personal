import { useMemo, useState } from 'react'
import { FileUpIcon, PlusIcon } from 'lucide-react'

import { SeletorMes } from '@/components/SeletorMes'
import { DialogImportarArquivos } from '@/components/triathlon/DialogImportarArquivos'
import { DialogTreino } from '@/components/triathlon/DialogTreino'
import { LinhaTreino } from '@/components/triathlon/LinhaTreino'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCompetencia } from '@/hooks/useCompetencia'
import { useTema } from '@/hooks/useTema'
import { usePerfilAtleta, useTreinosPeriodo } from '@/hooks/useTriathlon'
import { somarMeses } from '@/lib/format'
import {
  cargaTreino,
  dataLocal,
  diaMesCurto,
  duracaoCurta,
  formatarDistancia,
  inicioSemana,
  MODALIDADES,
  ORDEM_MODALIDADES,
  somarDias,
  totaisPorModalidade,
} from '@/lib/triathlon'
import { cn } from '@/lib/utils'
import type { Modalidade, Treino } from '@/types/triathlon'

export default function TreinosTriathlon() {
  const [competencia, setCompetencia] = useCompetencia()
  const inicio = competencia
  const fim = somarDias(somarMeses(competencia, 1), -1)
  const treinos = useTreinosPeriodo(inicio, fim)
  const perfil = usePerfilAtleta()
  const { cor } = useTema()
  const [filtro, setFiltro] = useState<Modalidade | 'todas'>('todas')
  const [editor, setEditor] = useState<{ aberto: boolean; treino: Treino | null }>({ aberto: false, treino: null })
  const [importando, setImportando] = useState(false)

  const todos = treinos.data ?? []
  const totais = useMemo(() => totaisPorModalidade(todos, perfil.data), [todos, perfil.data])
  const visiveis = filtro === 'todas' ? todos : todos.filter((t) => t.modalidade === filtro)

  const semanas = useMemo(() => {
    const grupos = new Map<string, Treino[]>()
    for (const t of visiveis) {
      const s = inicioSemana(dataLocal(t.data_hora))
      grupos.set(s, [...(grupos.get(s) ?? []), t])
    }
    return [...grupos.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [visiveis])

  const presentes = ORDEM_MODALIDADES.filter((m) => totais[m].quantidade > 0)

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <SeletorMes competencia={competencia} onChange={setCompetencia} />
        <div className="flex w-full gap-2 sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setImportando(true)}>
            <FileUpIcon />
            Importar
          </Button>
          <Button className="flex-1 sm:flex-none" onClick={() => setEditor({ aberto: true, treino: null })}>
            <PlusIcon />
            Novo treino
          </Button>
        </div>
      </div>

      {/* Totais do mês por modalidade (também servem de filtro) */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por modalidade">
        <button
          type="button"
          onClick={() => setFiltro('todas')}
          className={cn(
            'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
            filtro === 'todas' ? 'bg-foreground text-background border-transparent' : 'hover:bg-accent',
          )}
        >
          Todas · {todos.length}
        </button>
        {presentes.map((m) => {
          const t = totais[m]
          const ativo = filtro === m
          return (
            <button
              key={m}
              type="button"
              onClick={() => setFiltro(ativo ? 'todas' : m)}
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
                ativo ? 'border-transparent text-white' : 'hover:bg-accent',
              )}
              style={ativo ? { backgroundColor: cor(MODALIDADES[m].cor) } : undefined}
            >
              {!ativo && <span className="size-2.5 rounded-full" style={{ backgroundColor: cor(MODALIDADES[m].cor) }} />}
              <span className="font-medium">{MODALIDADES[m].nome}</span>
              <span className={cn('tabular-nums', ativo ? 'text-white/85' : 'text-muted-foreground')}>
                {t.distancia ? formatarDistancia(t.distancia, m) : `${t.quantidade}×`} · {duracaoCurta(t.duracao)}
              </span>
            </button>
          )
        })}
      </div>

      {treinos.isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : semanas.length === 0 ? (
        <Card className="items-center gap-2 px-6 py-12 text-center">
          <p className="font-medium">Nenhum treino neste mês</p>
          <p className="text-muted-foreground text-sm">Registre um treino ou importe arquivos do relógio.</p>
        </Card>
      ) : (
        <div className={cn('grid gap-4 transition-opacity', treinos.isPlaceholderData && 'opacity-60')}>
          {semanas.map(([inicioSem, lista]) => {
            const duracao = lista.reduce((s, t) => s + t.duracao_seg, 0)
            const carga = lista.reduce((s, t) => s + cargaTreino(t, perfil.data).valor, 0)
            return (
              <Card key={inicioSem} className="gap-0 overflow-hidden py-0">
                <div className="bg-muted/40 flex items-center justify-between gap-2 border-b px-4 py-2 text-sm">
                  <span className="font-medium">
                    Semana {diaMesCurto(inicioSem)} – {diaMesCurto(somarDias(inicioSem, 6))}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {lista.length} treino(s) · {duracaoCurta(duracao)} · carga {carga}
                  </span>
                </div>
                <ul className="divide-y">
                  {lista.map((t) => (
                    <LinhaTreino key={t.id} treino={t} perfil={perfil.data} onAbrir={(x) => setEditor({ aberto: true, treino: x })} />
                  ))}
                </ul>
              </Card>
            )
          })}
        </div>
      )}

      <DialogTreino
        aberto={editor.aberto}
        treino={editor.treino}
        perfil={perfil.data}
        onFechar={() => setEditor({ aberto: false, treino: null })}
      />
      <DialogImportarArquivos aberto={importando} onFechar={() => setImportando(false)} />
    </div>
  )
}
