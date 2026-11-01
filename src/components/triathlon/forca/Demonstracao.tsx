import { useState } from 'react'
import { ImageOffIcon, LoaderCircleIcon, PlayCircleIcon, RefreshCwIcon, SearchIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useDemonstracaoAutomatica, useDetalhesExercicio, usePesquisaExercicios } from '@/hooks/useExerciseDb'
import { CREDITO, demonstracaoDe, equipamentoPt, gifDe, guardarDemonstracao, idValido, limparPasso, musculoPt } from '@/lib/forca/exercisedb'
import { cn } from '@/lib/utils'
import type { ExercicioPrescrito } from '@/types/triathlon'

export type AlvoDemonstracao = Pick<ExercicioPrescrito, 'nome' | 'exercicio_id' | 'exercisedb_id'> & { orientacao?: string }

/** GIF da ExerciseDB com fundo claro (as animações têm fundo branco) e aviso se não carregar. */
export function GifExercicio({ id, nome, className }: { id: string; nome: string; className?: string }) {
  const [erro, setErro] = useState(false)
  if (erro || !idValido(id)) {
    return (
      <div className={cn('text-muted-foreground flex flex-col items-center justify-center gap-1 rounded-lg border bg-white/5 p-4 text-xs', className)}>
        <ImageOffIcon className="size-5" />
        Animação indisponível
      </div>
    )
  }
  return (
    <img
      src={gifDe(id)}
      alt={`Demonstração: ${nome}`}
      loading="lazy"
      onError={() => setErro(true)}
      className={cn('rounded-lg border bg-white object-contain', className)}
    />
  )
}

/** Botão pequeno "Como fazer" que abre a demonstração. */
export function BotaoDemonstracao({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <Button type="button" variant="ghost" size="sm" className={cn('text-primary h-7 px-2', className)} onClick={onClick}>
      <PlayCircleIcon />
      Como fazer
    </Button>
  )
}

function Detalhes({ id }: { id: string }) {
  const detalhes = useDetalhesExercicio(id)
  if (detalhes.isLoading) {
    return (
      <div className="grid gap-2">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-16" />
      </div>
    )
  }
  if (detalhes.error || !detalhes.data) {
    return (
      <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
        {detalhes.error instanceof Error ? detalhes.error.message : 'Não foi possível carregar os detalhes.'}
        <Button type="button" variant="outline" size="sm" className="h-7" onClick={() => detalhes.refetch()} disabled={detalhes.isFetching}>
          {detalhes.isFetching ? <LoaderCircleIcon className="animate-spin" /> : <RefreshCwIcon />}
          Tentar de novo
        </Button>
      </div>
    )
  }
  const d = detalhes.data
  return (
    <div className="grid gap-3 text-sm">
      <dl className="grid gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <dt className="text-muted-foreground text-xs">Músculo principal:</dt>
          {d.targetMuscles.map((m) => (
            <dd key={m}>
              <Badge>{musculoPt(m)}</Badge>
            </dd>
          ))}
        </div>
        {d.secondaryMuscles.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <dt className="text-muted-foreground text-xs">Também trabalha:</dt>
            {d.secondaryMuscles.map((m) => (
              <dd key={m}>
                <Badge variant="outline">{musculoPt(m)}</Badge>
              </dd>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <dt className="text-muted-foreground text-xs">Equipamento:</dt>
          <dd className="text-xs">{d.equipments.map(equipamentoPt).join(', ')}</dd>
        </div>
      </dl>
      <details className="rounded-lg border p-3" open>
        <summary className="cursor-pointer text-xs font-medium select-none">
          Passo a passo da ExerciseDB <span className="text-muted-foreground font-normal">(em inglês · “{d.name}”)</span>
        </summary>
        <ol className="mt-2 grid list-decimal gap-1 pl-5 text-xs leading-relaxed" lang="en">
          {d.instructions.map((p, i) => (
            <li key={i}>{limparPasso(p)}</li>
          ))}
        </ol>
      </details>
    </div>
  )
}

function Busca({ inicial, onEscolher }: { inicial: string; onEscolher: (id: string) => void }) {
  const [termo, setTermo] = useState(inicial)
  const busca = usePesquisaExercicios(termo)
  return (
    <div className="grid gap-2">
      <div className="relative">
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" aria-hidden />
        <Input
          autoFocus
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Ex.: bench press, squat, lat pulldown"
          className="pl-8"
          aria-label="Buscar na ExerciseDB (em inglês)"
        />
      </div>
      <p className="text-muted-foreground text-[11px]">A busca da ExerciseDB é em inglês. Digite pelo menos 3 letras.</p>
      {busca.isFetching && <Skeleton className="h-24" />}
      {busca.error instanceof Error && <p className="text-destructive text-xs">{busca.error.message}</p>}
      {busca.data && !busca.isFetching && (
        busca.data.length ? (
          <ul className="grid max-h-80 gap-1 overflow-y-auto">
            {busca.data.slice(0, 12).map((r) => (
              <li key={r.exerciseId}>
                <button
                  type="button"
                  onClick={() => onEscolher(r.exerciseId)}
                  className="hover:bg-accent flex w-full items-center gap-3 rounded-lg border p-1.5 text-left text-sm"
                >
                  <GifExercicio id={r.exerciseId} nome={r.name} className="size-14 shrink-0" />
                  <span className="first-letter:uppercase">{r.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-xs">Nada encontrado. Tente outro termo em inglês.</p>
        )
      )}
    </div>
  )
}

interface Props {
  exercicio: AlvoDemonstracao | null
  onFechar: () => void
  /** quando informado, a demonstração escolhida na busca fica salva no exercício */
  onVincular?: (exercisedbId: string) => void
}

function Conteudo({ exercicio, onVincular }: { exercicio: AlvoDemonstracao; onVincular?: (id: string) => void }) {
  const fixa = demonstracaoDe(exercicio)
  // exercício do catálogo ainda sem demonstração: procura pelo termo preparado
  const automatica = useDemonstracaoAutomatica(exercicio.exercicio_id, !fixa)
  const [escolhida, setEscolhida] = useState<string | null>(null)
  const [buscando, setBuscando] = useState(false)
  const id = escolhida ?? fixa ?? automatica.data ?? null
  const achadaAgora = !escolhida && !fixa && !!automatica.data
  const mostrarBusca = buscando || (!id && !automatica.isFetching)

  function escolher(novo: string) {
    setEscolhida(novo)
    setBuscando(false)
    // no editor fica salva no exercício da rotina; nas outras telas, neste navegador
    if (onVincular) onVincular(novo)
    else guardarDemonstracao(exercicio.exercicio_id, novo)
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{exercicio.nome}</DialogTitle>
        <DialogDescription>Como fazer o exercício.</DialogDescription>
      </DialogHeader>

      {!id && automatica.isFetching && (
        <div className="grid gap-2">
          <Skeleton className="mx-auto aspect-square w-full max-w-72" />
          <p className="text-muted-foreground text-center text-xs">Procurando a demonstração na ExerciseDB…</p>
        </div>
      )}
      {!id && automatica.error instanceof Error && <p className="text-muted-foreground text-xs">{automatica.error.message}</p>}

      {id && !buscando && (
        <div className="grid gap-4">
          <GifExercicio id={id} nome={exercicio.nome} className="mx-auto aspect-square w-full max-w-72" />
          {achadaAgora && (
            <p className="text-muted-foreground -mt-2 text-center text-[11px]">Encontrada automaticamente — confira se é o mesmo exercício; se não for, escolha outra abaixo.</p>
          )}
          {exercicio.orientacao && (
            <p className="bg-primary/5 border-primary/20 rounded-lg border px-3 py-2 text-sm">
              <strong>Dica:</strong> {exercicio.orientacao}
            </p>
          )}
          <Detalhes id={id} />
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground w-fit" onClick={() => setBuscando(true)}>
            <SearchIcon />
            Escolher outra demonstração
          </Button>
        </div>
      )}

      {mostrarBusca && (
        <div className="grid gap-3">
          {!id && <p className="text-sm">Este exercício ainda não tem demonstração. Busque um parecido na ExerciseDB e ele fica salvo.</p>}
          <Busca inicial="" onEscolher={escolher} />
          {id && (
            <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setBuscando(false)}>
              Voltar para a demonstração
            </Button>
          )}
        </div>
      )}

      <p className="text-muted-foreground border-t pt-3 text-[11px]">
        Demonstrações:{' '}
        <a href={CREDITO.url} target="_blank" rel="noreferrer" className="underline">
          {CREDITO.texto}
        </a>{' '}
        (uso pessoal, não comercial).
      </p>
    </>
  )
}

/** Mostra como fazer um exercício: animação, dica, músculos e passo a passo. */
export function DialogDemonstracao({ exercicio, onFechar, onVincular }: Props) {
  return (
    <Dialog open={exercicio !== null} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        {exercicio && <Conteudo key={`${exercicio.exercicio_id}-${exercicio.exercisedb_id ?? ''}`} exercicio={exercicio} onVincular={onVincular} />}
      </DialogContent>
    </Dialog>
  )
}
