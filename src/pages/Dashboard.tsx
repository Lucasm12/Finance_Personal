import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarPlusIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FilterXIcon,
  LoaderCircleIcon,
  SearchIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { BoasVindas } from '@/components/BoasVindas'
import { SeletorMes } from '@/components/SeletorMes'
import { CardCategoria } from '@/components/dashboard/CardCategoria'
import { DialogLancamento } from '@/components/dashboard/DialogLancamento'
import { ResumoMes } from '@/components/dashboard/ResumoMes'
import type { LancamentoVisivel } from '@/components/dashboard/tipos'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { useCompetencia } from '@/hooks/useCompetencia'
import {
  useAtualizarLancamento,
  useCategorias,
  useContas,
  useGerarMes,
  useLancamentos,
} from '@/hooks/useDados'
import { exportarCsv, exportarExcel, montarLinhas } from '@/lib/exportar'
import { formatarMoeda, hojeISO, nomeCompetencia, situacaoLancamento, somar } from '@/lib/format'
import { normalizar, listarResponsaveis } from '@/lib/texto'
import { cn } from '@/lib/utils'
import { ROTAS_FINANCEIRO } from '@/modulos'

type FiltroSituacao = 'todas' | 'pendentes' | 'pagas' | 'vencidas'

function Esqueleto() {
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

/** Ordena por dia de vencimento (sem dia vai para o fim) e depois por nome. */
function compararLancamentos(a: LancamentoVisivel, b: LancamentoVisivel) {
  const da = a.conta.dia_vencimento ?? 99
  const db = b.conta.dia_vencimento ?? 99
  return da - db || a.conta.nome.localeCompare(b.conta.nome, 'pt-BR')
}

export default function Dashboard() {
  const [competencia, setCompetencia] = useCompetencia()
  const categorias = useCategorias()
  const contas = useContas()
  const lancamentos = useLancamentos(competencia)
  const atualizar = useAtualizarLancamento(competencia)
  const gerar = useGerarMes()

  const [busca, setBusca] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState<FiltroSituacao>('todas')
  const [editando, setEditando] = useState<LancamentoVisivel | null>(null)

  const hoje = hojeISO()
  const carregandoMes = lancamentos.isPlaceholderData

  const nomesCategorias = useMemo(
    () => Object.fromEntries((categorias.data ?? []).map((c) => [c.id, c.nome])),
    [categorias.data],
  )

  const itens = useMemo<LancamentoVisivel[]>(
    () =>
      (lancamentos.data ?? []).map((l) => ({
        ...l,
        situacao: situacaoLancamento(l, l.conta.dia_vencimento, hoje),
      })),
    [lancamentos.data, hoje],
  )

  const responsaveis = useMemo(
    () => listarResponsaveis([...(contas.data ?? []), ...itens.map((l) => l.conta)]),
    [contas.data, itens],
  )

  const termo = normalizar(busca.trim())
  const filtrosAtivos = Boolean(termo || responsavel || filtroSituacao !== 'todas')

  // Responsável e busca valem para tudo (inclusive o alerta de vencidas); a situação só para a lista.
  const doRecorte = itens.filter((l) => {
    if (responsavel && normalizar(l.conta.responsavel ?? '') !== normalizar(responsavel)) return false
    if (termo) {
      const texto = [
        l.conta.nome,
        l.conta.responsavel,
        l.conta.codigo_pagamento,
        l.observacao,
        nomesCategorias[l.conta.categoria_id],
      ].join(' ')
      if (!normalizar(texto).includes(termo)) return false
    }
    return true
  })

  const filtrados = doRecorte.filter((l) => {
    if (filtroSituacao === 'pendentes') return !l.pago
    if (filtroSituacao === 'pagas') return l.pago
    if (filtroSituacao === 'vencidas') return l.situacao.tipo === 'vencida'
    return true
  })

  const grupos = (categorias.data ?? [])
    .map((categoria) => ({
      categoria,
      itens: filtrados.filter((l) => l.conta.categoria_id === categoria.id).sort(compararLancamentos),
    }))
    .filter((g) => g.itens.length > 0)

  const pagos = filtrados.filter((l) => l.pago)
  const total = somar(filtrados.map((l) => l.valor))
  const totalPago = somar(pagos.map((l) => l.valor))
  const vencidas = doRecorte.filter((l) => l.situacao.tipo === 'vencida')
  const contasAtivas = (contas.data ?? []).filter((c) => c.ativa).length

  function limparFiltros() {
    setBusca('')
    setResponsavel('')
    setFiltroSituacao('todas')
  }

  function alternarPago(l: LancamentoVisivel, pago: boolean) {
    atualizar.mutate({ id: l.id, dados: { pago, data_pagamento: pago ? hoje : null } })
  }

  async function gerarMes() {
    try {
      const criados = await gerar.mutateAsync(competencia)
      if (criados === 0) toast.info('Nenhum lançamento novo: o mês já está completo.')
      else toast.success(`${criados} lançamento(s) criado(s) para ${nomeCompetencia(competencia)}.`)
    } catch {
      // erro já exibido pelo hook
    }
  }

  async function exportar(formato: 'xlsx' | 'csv') {
    const linhas = montarLinhas(
      categorias.data ?? [],
      itens.map((l) => ({ ...l, vencida: l.situacao.tipo === 'vencida' })),
    )
    try {
      if (formato === 'csv') exportarCsv(competencia, linhas)
      else await exportarExcel(competencia, linhas, categorias.data ?? [])
    } catch {
      toast.error('Não foi possível gerar o arquivo.')
    }
  }

  if (categorias.isLoading) return <Esqueleto />
  if (categorias.isError) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>Não foi possível carregar seus dados</CardTitle>
          <CardDescription>Verifique sua conexão e tente novamente.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => categorias.refetch()}>Tentar de novo</Button>
        </CardContent>
      </Card>
    )
  }
  if (categorias.data?.length === 0) return <BoasVindas />

  const mesVazio = !lancamentos.isLoading && !carregandoMes && itens.length === 0

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5">
      {/* Cabeçalho: mês + ações */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <SeletorMes competencia={competencia} onChange={setCompetencia} />
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            onClick={gerarMes}
            disabled={gerar.isPending || contasAtivas === 0}
            className="flex-1 sm:flex-none"
            title="Cria os lançamentos que faltam a partir das contas ativas"
          >
            {gerar.isPending ? <LoaderCircleIcon className="animate-spin" /> : <CalendarPlusIcon />}
            Gerar mês
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none" disabled={itens.length === 0}>
                <DownloadIcon />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => exportar('xlsx')}>
                <FileSpreadsheetIcon />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => exportar('csv')}>
                <FileTextIcon />
                CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {lancamentos.isLoading ? (
        <Esqueleto />
      ) : mesVazio ? (
        <Card className="mx-auto w-full max-w-xl text-center">
          <CardHeader>
            <CardTitle>Nenhum lançamento em {nomeCompetencia(competencia)}</CardTitle>
            <CardDescription>
              {contasAtivas > 0
                ? `Gere o mês para criar os lançamentos a partir das suas ${contasAtivas} contas ativas.`
                : 'Cadastre suas contas fixas para poder gerar os meses.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {contasAtivas > 0 ? (
              <Button size="lg" onClick={gerarMes} disabled={gerar.isPending}>
                {gerar.isPending ? <LoaderCircleIcon className="animate-spin" /> : <CalendarPlusIcon />}
                Gerar lançamentos de {nomeCompetencia(competencia)}
              </Button>
            ) : (
              <Link to={ROTAS_FINANCEIRO.contas} className={buttonVariants({ size: 'lg' })}>
                Cadastrar contas
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div
          className={cn(
            'grid grid-cols-1 gap-4 transition-opacity sm:gap-5',
            carregandoMes && 'pointer-events-none opacity-50',
          )}
        >
          <ResumoMes
            total={total}
            pago={totalPago}
            pendente={somar([total, -totalPago])}
            quantidade={filtrados.length}
            quantidadePaga={pagos.length}
            filtrado={filtrosAtivos}
          />

          {vencidas.length > 0 && filtroSituacao !== 'vencidas' && (
            <div
              role="alert"
              className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 sm:flex-row sm:items-center dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
            >
              <div className="flex flex-1 items-center gap-2">
                <TriangleAlertIcon className="size-4 shrink-0" />
                <span>
                  <strong>
                    {vencidas.length} conta{vencidas.length > 1 ? 's' : ''} vencida{vencidas.length > 1 ? 's' : ''}
                  </strong>{' '}
                  somando <strong>{formatarMoeda(somar(vencidas.map((l) => l.valor)))}</strong>.
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 bg-transparent dark:border-red-500/40"
                onClick={() => setFiltroSituacao('vencidas')}
              >
                Ver vencidas
              </Button>
            </div>
          )}

          {/* Filtros */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                type="search"
                placeholder="Buscar conta, código ou observação"
                className="pl-9"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                aria-label="Buscar"
              />
            </div>
            <div className="flex gap-2">
              <NativeSelect
                className="min-w-0 flex-1 sm:w-44 sm:flex-none"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                aria-label="Filtrar por responsável"
              >
                <option value="">Responsável</option>
                {responsaveis.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect
                className="w-36 shrink-0"
                value={filtroSituacao}
                onChange={(e) => setFiltroSituacao(e.target.value as FiltroSituacao)}
                aria-label="Filtrar por situação"
              >
                <option value="todas">Situação</option>
                <option value="pendentes">Pendentes</option>
                <option value="pagas">Pagas</option>
                <option value="vencidas">Vencidas</option>
              </NativeSelect>
            </div>
            {filtrosAtivos && (
              <Button variant="ghost" onClick={limparFiltros}>
                <FilterXIcon />
                Limpar
              </Button>
            )}
          </div>

          {grupos.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">Nenhuma conta encontrada com esses filtros.</p>
          ) : (
            <div className="columns-1 gap-4 md:columns-2 xl:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid">
              {grupos.map((g) => (
                <CardCategoria
                  key={g.categoria.id}
                  categoria={g.categoria}
                  itens={g.itens}
                  onAlternarPago={alternarPago}
                  onEditar={setEditando}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <DialogLancamento lancamento={editando} nomesCategorias={nomesCategorias} onFechar={() => setEditando(null)} />
    </div>
  )
}
