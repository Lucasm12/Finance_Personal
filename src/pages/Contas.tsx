import { useMemo, useState } from 'react'
import {
  EllipsisVerticalIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  PowerOffIcon,
  SearchIcon,
  SparklesIcon,
  Trash2Icon,
} from 'lucide-react'
import { toast } from 'sonner'

import { DialogConta } from '@/components/contas/DialogConta'
import { DialogImportarExemplo } from '@/components/DialogImportarExemplo'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useAlternarConta, useCategorias, useContas, useExcluirConta } from '@/hooks/useDados'
import { useTema } from '@/hooks/useTema'
import {
  competenciaAtual,
  competenciaMedia,
  formatarMoeda,
  parcelaNoMes,
  parcelamentoConcluido,
  somar,
  ultimaParcela,
} from '@/lib/format'
import { listarResponsaveis, normalizar } from '@/lib/texto'
import { cn } from '@/lib/utils'
import type { Conta } from '@/types'

interface ContaComStatus extends Conta {
  quitada: boolean
  /** Entra no mês atual (ativa e dentro do parcelamento). */
  prevista: boolean
  parcelaHoje: number | null
}

function DescricaoParcela({ c }: { c: ContaComStatus }) {
  if (c.total_parcelas === null) return null
  const fim = ultimaParcela(c)!
  if (c.quitada) return <span>{c.total_parcelas} parcelas · terminou em {competenciaMedia(fim)}</span>
  if (c.parcelaHoje !== null && c.parcelaHoje < 1) {
    return <span>{c.total_parcelas} parcelas · começa em {competenciaMedia(c.parcela_referencia!)}</span>
  }
  return (
    <span>
      Parcela {c.parcelaHoje}/{c.total_parcelas} · até {competenciaMedia(fim)}
    </span>
  )
}

export default function Contas() {
  const categorias = useCategorias()
  const contas = useContas()
  const alternar = useAlternarConta()
  const excluir = useExcluirConta()
  const { cor } = useTema()

  const [busca, setBusca] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [mostrarInativas, setMostrarInativas] = useState(false)
  const [editor, setEditor] = useState<{ aberto: boolean; conta: Conta | null; categoria?: string }>({
    aberto: false,
    conta: null,
  })
  const [excluindo, setExcluindo] = useState<Conta | null>(null)
  const [importando, setImportando] = useState(false)

  const mes = competenciaAtual()

  const todas = useMemo<ContaComStatus[]>(
    () =>
      (contas.data ?? []).map((c) => {
        const parcelaHoje = parcelaNoMes(c, mes)
        const quitada = parcelamentoConcluido(c, mes)
        const dentro = parcelaHoje === null || (parcelaHoje >= 1 && parcelaHoje <= c.total_parcelas!)
        return { ...c, quitada, parcelaHoje, prevista: c.ativa && dentro }
      }),
    [contas.data, mes],
  )

  const responsaveis = useMemo(() => listarResponsaveis(todas), [todas])
  const termo = normalizar(busca.trim())

  const visiveis = todas.filter((c) => {
    if (!mostrarInativas && (!c.ativa || c.quitada)) return false
    if (responsavel && normalizar(c.responsavel ?? '') !== normalizar(responsavel)) return false
    if (termo && !normalizar([c.nome, c.responsavel, c.codigo_pagamento, c.observacao].join(' ')).includes(termo)) {
      return false
    }
    return true
  })

  const grupos = (categorias.data ?? [])
    .map((categoria) => ({ categoria, contas: visiveis.filter((c) => c.categoria_id === categoria.id) }))
    .filter((g) => g.contas.length > 0)

  const previstas = visiveis.filter((c) => c.prevista)
  const ocultas = todas.filter((c) => !c.ativa || c.quitada).length

  function alternarAtiva(c: Conta) {
    alternar.mutate(
      { id: c.id, ativa: !c.ativa },
      { onSuccess: () => toast.success(c.ativa ? `${c.nome} desativada.` : `${c.nome} reativada.`) },
    )
  }

  function confirmarExclusao() {
    if (!excluindo) return
    const nome = excluindo.nome
    excluir.mutate(excluindo.id, { onSuccess: () => toast.success(`${nome} excluída.`) })
    setExcluindo(null)
  }

  const carregando = categorias.isLoading || contas.isLoading

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contas</h1>
          <p className="text-muted-foreground text-sm">Modelos que se repetem todo mês e geram os lançamentos.</p>
        </div>
        <Button onClick={() => setEditor({ aberto: true, conta: null })}>
          <PlusIcon />
          Nova conta
        </Button>
      </div>

      {!carregando && todas.length > 0 && (
        <Card className="flex-row flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
          <div className="text-sm">
            <span className="text-muted-foreground">Previsão para o mês atual: </span>
            <strong className="text-base tabular-nums">{formatarMoeda(somar(previstas.map((c) => c.valor_padrao)))}</strong>
            <span className="text-muted-foreground">
              {' '}
              em {previstas.length} conta{previstas.length === 1 ? '' : 's'}
              {responsavel || termo ? ' (filtrado)' : ''}
            </span>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="search"
            placeholder="Buscar conta"
            className="pl-9"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar conta"
          />
        </div>
        <NativeSelect
          className="sm:w-48"
          value={responsavel}
          onChange={(e) => setResponsavel(e.target.value)}
          aria-label="Filtrar por responsável"
        >
          <option value="">Todos os responsáveis</option>
          {responsaveis.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </NativeSelect>
        <div className="flex items-center gap-2 px-1">
          <Switch id="inativas" checked={mostrarInativas} onCheckedChange={setMostrarInativas} />
          <Label htmlFor="inativas" className="cursor-pointer font-normal whitespace-nowrap">
            Mostrar inativas/quitadas{ocultas > 0 && ` (${ocultas})`}
          </Label>
        </div>
      </div>

      {carregando ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : todas.length === 0 ? (
        <Card className="mx-auto w-full max-w-xl text-center">
          <CardHeader>
            <CardTitle>Nenhuma conta cadastrada</CardTitle>
            <CardDescription>Cadastre suas contas fixas ou importe as da planilha de exemplo.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col justify-center gap-2 sm:flex-row">
            <Button onClick={() => setEditor({ aberto: true, conta: null })}>
              <PlusIcon />
              Nova conta
            </Button>
            <Button variant="outline" onClick={() => setImportando(true)}>
              <SparklesIcon />
              Importar dados de exemplo
            </Button>
          </CardContent>
        </Card>
      ) : grupos.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center text-sm">Nenhuma conta encontrada.</p>
      ) : (
        <div className="columns-1 gap-4 md:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
          {grupos.map(({ categoria, contas: lista }) => {
            const previstasGrupo = lista.filter((c) => c.prevista)
            return (
              <Card key={categoria.id} className="gap-0 overflow-hidden py-0">
                <div className="h-1.5" style={{ backgroundColor: cor(categoria.cor) }} />
                <div className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <h2 className="flex items-center gap-2 font-semibold">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: cor(categoria.cor) }} aria-hidden />
                    {categoria.nome}
                  </h2>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm tabular-nums">
                      {formatarMoeda(somar(previstasGrupo.map((c) => c.valor_padrao)))}/mês
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Nova conta em ${categoria.nome}`}
                      title={`Nova conta em ${categoria.nome}`}
                      onClick={() => setEditor({ aberto: true, conta: null, categoria: categoria.id })}
                    >
                      <PlusIcon />
                    </Button>
                  </div>
                </div>
                <ul className="divide-y border-t">
                  {lista.map((c) => {
                    const apagada = !c.ativa || c.quitada
                    return (
                      <li key={c.id} className="flex items-center gap-2 py-2.5 pr-2 pl-4">
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => setEditor({ aberto: true, conta: c })}
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={cn('font-medium', apagada && 'text-muted-foreground')}>{c.nome}</span>
                            {c.quitada ? (
                              <Badge variant="sucesso">Quitada</Badge>
                            ) : (
                              !c.ativa && <Badge variant="secondary">Inativa</Badge>
                            )}
                          </div>
                          <div className="text-muted-foreground flex flex-wrap gap-x-2 text-xs">
                            {c.dia_vencimento && <span>Vence dia {c.dia_vencimento}</span>}
                            {c.responsavel && <span className="text-foreground/70">{c.responsavel}</span>}
                            <DescricaoParcela c={c} />
                            {c.codigo_pagamento && <span>Com código</span>}
                          </div>
                        </button>
                        <span className={cn('font-medium tabular-nums', apagada && 'text-muted-foreground')}>
                          {formatarMoeda(c.valor_padrao)}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${c.nome}`}>
                              <EllipsisVerticalIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setEditor({ aberto: true, conta: c })}>
                              <PencilIcon />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => alternarAtiva(c)}>
                              {c.ativa ? <PowerOffIcon /> : <PowerIcon />}
                              {c.ativa ? 'Desativar' : 'Reativar'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => setExcluindo(c)}>
                              <Trash2Icon />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </li>
                    )
                  })}
                </ul>
              </Card>
            )
          })}
        </div>
      )}

      <DialogConta
        aberto={editor.aberto}
        conta={editor.conta}
        categoriaPadrao={editor.categoria}
        categorias={categorias.data ?? []}
        responsaveis={responsaveis}
        onFechar={() => setEditor({ aberto: false, conta: null })}
      />

      <AlertDialog open={!!excluindo} onOpenChange={(v) => !v && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{excluindo?.nome}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os lançamentos desta conta, inclusive de meses anteriores, também serão apagados. Se a conta apenas
              acabou, prefira <strong>desativar</strong>: ela para de ser lançada e o histórico é mantido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {excluindo?.ativa && (
              <Button
                variant="outline"
                onClick={() => {
                  alternarAtiva(excluindo)
                  setExcluindo(null)
                }}
              >
                <PowerOffIcon />
                Só desativar
              </Button>
            )}
            <Button variant="destructive" onClick={confirmarExclusao}>
              <Trash2Icon />
              Excluir tudo
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DialogImportarExemplo aberto={importando} onAbertoChange={setImportando} />
    </div>
  )
}
