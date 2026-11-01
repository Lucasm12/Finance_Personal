import { useState, type FormEvent } from 'react'
import { ChevronDownIcon, ChevronUpIcon, LoaderCircleIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { SeletorCor } from '@/components/SeletorCor'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCategorias,
  useContas,
  useExcluirCategoria,
  useReordenarCategorias,
  useSalvarCategoria,
} from '@/hooks/useDados'
import { useTema } from '@/hooks/useTema'
import { proximaCor } from '@/lib/cores'
import { formatarMoeda, somar } from '@/lib/format'
import type { Categoria } from '@/types'

function FormCategoria({
  categoria,
  quantidade,
  proximaOrdem,
  onFechar,
}: {
  categoria: Categoria | null
  quantidade: number
  proximaOrdem: number
  onFechar: () => void
}) {
  const salvar = useSalvarCategoria()
  const { cor: corTema } = useTema()
  const [nome, setNome] = useState(categoria?.nome ?? '')
  const [cor, setCor] = useState(categoria?.cor ?? proximaCor(quantidade))
  const [erro, setErro] = useState('')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) {
      setErro('Informe o nome.')
      return
    }
    try {
      await salvar.mutateAsync({
        id: categoria?.id,
        dados: { nome: nome.trim(), cor, ordem: categoria?.ordem ?? proximaOrdem },
      })
      toast.success(categoria ? 'Categoria atualizada.' : 'Categoria criada.')
      onFechar()
    } catch {
      // erro já exibido pelo hook
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>{categoria ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
        <DialogDescription>A cor identifica a categoria no painel e nos gráficos.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor="nome-categoria">Nome</Label>
        <Input
          id="nome-categoria"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value)
            setErro('')
          }}
          placeholder="Ex.: Moradia, Educação"
          aria-invalid={!!erro}
          autoFocus
        />
        {erro && <p className="text-destructive text-xs">{erro}</p>}
      </div>

      <div className="grid gap-2">
        <Label>Cor</Label>
        <SeletorCor value={cor} onChange={setCor} />
      </div>

      <div className="overflow-hidden rounded-lg border" aria-hidden>
        <div className="h-1.5" style={{ backgroundColor: corTema(cor) }} />
        <div className="flex items-center gap-2 px-3 py-2 text-sm font-semibold">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: corTema(cor) }} />
          {nome.trim() || 'Pré-visualização'}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={salvar.isPending}>
          {salvar.isPending && <LoaderCircleIcon className="animate-spin" />}
          Salvar
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function Categorias() {
  const categorias = useCategorias()
  const contas = useContas()
  const reordenar = useReordenarCategorias()
  const excluir = useExcluirCategoria()
  const { cor } = useTema()

  const [editor, setEditor] = useState<{ aberto: boolean; categoria: Categoria | null }>({
    aberto: false,
    categoria: null,
  })
  const [excluindo, setExcluindo] = useState<Categoria | null>(null)

  const lista = categorias.data ?? []
  const contasDe = (id: string) => (contas.data ?? []).filter((c) => c.categoria_id === id)
  const qtdExcluindo = excluindo ? contasDe(excluindo.id).length : 0

  function mover(indice: number, direcao: -1 | 1) {
    const destino = indice + direcao
    if (destino < 0 || destino >= lista.length) return
    const nova = [...lista]
    ;[nova[indice], nova[destino]] = [nova[destino], nova[indice]]
    reordenar.mutate(nova)
  }

  function confirmarExclusao() {
    if (!excluindo) return
    const nome = excluindo.nome
    excluir.mutate(excluindo.id, { onSuccess: () => toast.success(`Categoria ${nome} excluída.`) })
    setExcluindo(null)
  }

  return (
    <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
          <p className="text-muted-foreground text-sm">Use as setas para definir a ordem em que aparecem no painel.</p>
        </div>
        <Button onClick={() => setEditor({ aberto: true, categoria: null })}>
          <PlusIcon />
          Nova categoria
        </Button>
      </div>

      {categorias.isLoading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : lista.length === 0 ? (
        <Card className="items-center px-6 text-center">
          <p className="text-muted-foreground text-sm">Nenhuma categoria cadastrada ainda.</p>
        </Card>
      ) : (
        <Card className="gap-0 py-0">
          <ol className="divide-y">
            {lista.map((c, i) => {
              const daCategoria = contasDe(c.id)
              const ativas = daCategoria.filter((x) => x.ativa)
              return (
                <li key={c.id} className="flex items-center gap-2 py-2 pr-2 pl-2 sm:pl-3">
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-6"
                      aria-label={`Mover ${c.nome} para cima`}
                      disabled={i === 0 || reordenar.isPending}
                      onClick={() => mover(i, -1)}
                    >
                      <ChevronUpIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-6"
                      aria-label={`Mover ${c.nome} para baixo`}
                      disabled={i === lista.length - 1 || reordenar.isPending}
                      onClick={() => mover(i, 1)}
                    >
                      <ChevronDownIcon />
                    </Button>
                  </div>
                  <span className="text-muted-foreground w-5 text-center text-xs tabular-nums">{i + 1}</span>
                  <span className="size-4 shrink-0 rounded-full" style={{ backgroundColor: cor(c.cor) }} aria-hidden />
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setEditor({ aberto: true, categoria: c })}
                  >
                    <div className="truncate font-medium">{c.nome}</div>
                    <div className="text-muted-foreground text-xs">
                      {daCategoria.length === 0
                        ? 'Nenhuma conta'
                        : `${ativas.length} conta${ativas.length === 1 ? '' : 's'} ativa${ativas.length === 1 ? '' : 's'} · ${formatarMoeda(somar(ativas.map((x) => x.valor_padrao)))}/mês`}
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Editar ${c.nome}`}
                    onClick={() => setEditor({ aberto: true, categoria: c })}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Excluir ${c.nome}`}
                    onClick={() => setExcluindo(c)}
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              )
            })}
          </ol>
        </Card>
      )}

      <Dialog open={editor.aberto} onOpenChange={(v) => !v && setEditor({ aberto: false, categoria: null })}>
        <DialogContent>
          {editor.aberto && (
            <FormCategoria
              key={editor.categoria?.id ?? 'nova'}
              categoria={editor.categoria}
              quantidade={lista.length}
              proximaOrdem={Math.max(0, ...lista.map((c) => c.ordem)) + 1}
              onFechar={() => setEditor({ aberto: false, categoria: null })}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluindo} onOpenChange={(v) => !v && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {qtdExcluindo > 0 ? 'Não é possível excluir' : `Excluir “${excluindo?.nome}”?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {qtdExcluindo > 0
                ? `A categoria “${excluindo?.nome}” tem ${qtdExcluindo} conta${qtdExcluindo === 1 ? '' : 's'}. Mova essas contas para outra categoria (editando cada uma) ou exclua-as antes.`
                : 'Esta ação não pode ser desfeita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{qtdExcluindo > 0 ? 'Entendi' : 'Cancelar'}</AlertDialogCancel>
            {qtdExcluindo === 0 && (
              <AlertDialogAction className={buttonVariants({ variant: 'destructive' })} onClick={confirmarExclusao}>
                Excluir
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
