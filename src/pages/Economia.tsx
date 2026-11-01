import { useMemo, useState } from 'react'
import { PiggyBankIcon, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'

import { SeletorMes } from '@/components/SeletorMes'
import { BalancoMes } from '@/components/economia/BalancoMes'
import { CardCaixinha } from '@/components/economia/CardCaixinha'
import { CardRendas, CardRendasFixas } from '@/components/economia/CardRendas'
import { DialogCaixinha } from '@/components/economia/DialogCaixinha'
import { DialogExtrato } from '@/components/economia/DialogExtrato'
import { DialogMovimento, type MovimentoAberto } from '@/components/economia/DialogMovimento'
import { DialogRecebimento } from '@/components/economia/DialogRecebimento'
import { DialogRenda } from '@/components/economia/DialogRenda'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useCompetencia } from '@/hooks/useCompetencia'
import { useContas, useGerarMes, useLancamentos } from '@/hooks/useDados'
import {
  useAlternarRenda,
  useAtualizarRecebimento,
  useCaixinhas,
  useExcluirCaixinha,
  useExcluirRenda,
  useMovimentosMes,
  useRecebimentos,
  useRendas,
  useSalvarCaixinha,
} from '@/hooks/useEconomia'
import { SUGESTOES_CAIXINHA } from '@/lib/economia'
import { competenciaMedia, formatarMoeda, hojeISO, nomeCompetencia, somar } from '@/lib/format'
import { listarResponsaveis } from '@/lib/texto'
import { cn } from '@/lib/utils'
import type { Caixinha, CaixinhaComSaldo, Recebimento, Renda } from '@/types'

export default function Economia() {
  const [competencia, setCompetencia] = useCompetencia()
  const lancamentos = useLancamentos(competencia)
  const contas = useContas()
  const rendas = useRendas()
  const recebimentos = useRecebimentos(competencia)
  const caixinhas = useCaixinhas()
  const movimentosMes = useMovimentosMes(competencia)

  const gerar = useGerarMes()
  const atualizarRecebimento = useAtualizarRecebimento(competencia)
  const alternarRenda = useAlternarRenda()
  const excluirRenda = useExcluirRenda()
  const salvarCaixinha = useSalvarCaixinha()
  const excluirCaixinha = useExcluirCaixinha()

  const [editorRenda, setEditorRenda] = useState<{ aberto: boolean; renda: Renda | null }>({ aberto: false, renda: null })
  const [recebimentoEditando, setRecebimentoEditando] = useState<Recebimento | null>(null)
  const [rendaExcluindo, setRendaExcluindo] = useState<Renda | null>(null)
  const [editorCaixinha, setEditorCaixinha] = useState<{ aberto: boolean; caixinha: Caixinha | null; nome?: string }>({
    aberto: false,
    caixinha: null,
  })
  const [movimento, setMovimento] = useState<MovimentoAberto | null>(null)
  const [extratoId, setExtratoId] = useState<string | null>(null)
  const [caixinhaExcluindo, setCaixinhaExcluindo] = useState<CaixinhaComSaldo | null>(null)
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false)

  // --- Totais do mês ---
  const listaRecebimentos = recebimentos.data ?? []
  const renda = somar(listaRecebimentos.map((r) => r.valor))
  const rendaRecebida = somar(listaRecebimentos.filter((r) => r.recebido).map((r) => r.valor))
  const listaLancamentos = lancamentos.data ?? []
  const totalContas = somar(listaLancamentos.map((l) => l.valor))
  const contasPagas = somar(listaLancamentos.filter((l) => l.pago).map((l) => l.valor))

  const porCaixinhaNoMes = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const m of movimentosMes.data ?? []) {
      mapa.set(m.caixinha_id, somar([mapa.get(m.caixinha_id) ?? 0, m.tipo === 'aporte' ? m.valor : -m.valor]))
    }
    return mapa
  }, [movimentosMes.data])
  const guardadoNoMes = somar([...porCaixinhaNoMes.values()])

  const todasCaixinhas = caixinhas.data ?? []
  const totalGuardado = somar(todasCaixinhas.map((c) => c.saldo))
  const arquivadas = todasCaixinhas.filter((c) => c.arquivada).length
  const visiveis = todasCaixinhas.filter((c) => mostrarArquivadas || !c.arquivada)
  const extratoCaixinha = todasCaixinhas.find((c) => c.id === extratoId) ?? null

  const responsaveis = useMemo(
    () => listarResponsaveis([...(contas.data ?? []), ...(rendas.data ?? [])]),
    [contas.data, rendas.data],
  )

  // --- Ações ---
  async function gerarMes() {
    try {
      const criados = await gerar.mutateAsync(competencia)
      if (criados === 0) toast.info('Nada novo para lançar neste mês.')
      else toast.success(`${criados} lançamento(s) criado(s) para ${nomeCompetencia(competencia)}.`)
    } catch {
      // erro já exibido pelo hook
    }
  }

  function alternarRecebido(r: Recebimento, recebido: boolean) {
    atualizarRecebimento.mutate({ id: r.id, dados: { recebido, data_recebimento: recebido ? hojeISO() : null } })
  }

  function alternarAtivaRenda(r: Renda) {
    alternarRenda.mutate(
      { id: r.id, ativa: !r.ativa },
      { onSuccess: () => toast.success(r.ativa ? `${r.nome} desativada.` : `${r.nome} reativada.`) },
    )
  }

  function arquivar(c: CaixinhaComSaldo) {
    salvarCaixinha.mutate(
      {
        id: c.id,
        dados: {
          nome: c.nome,
          cor: c.cor,
          meta: c.meta,
          aporte_mensal: c.aporte_mensal,
          data_alvo: c.data_alvo,
          arquivada: !c.arquivada,
        },
      },
      { onSuccess: () => toast.success(c.arquivada ? `${c.nome} voltou para a lista.` : `${c.nome} arquivada.`) },
    )
  }

  const carregandoRendas = recebimentos.isLoading || rendas.isLoading
  const atualizando = recebimentos.isPlaceholderData || movimentosMes.isPlaceholderData || lancamentos.isPlaceholderData

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <div className="self-start">
          <h1 className="text-2xl font-semibold tracking-tight">Economia</h1>
          <p className="text-muted-foreground text-sm">Quanto entra, quanto sai e quanto você está guardando.</p>
        </div>
        <SeletorMes competencia={competencia} onChange={setCompetencia} />
      </div>

      <div className={cn('grid grid-cols-1 gap-4 transition-opacity sm:gap-5', atualizando && 'opacity-60')}>
        {lancamentos.isLoading || recebimentos.isLoading || caixinhas.isLoading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <BalancoMes
            renda={renda}
            rendaRecebida={rendaRecebida}
            contas={totalContas}
            contasPagas={contasPagas}
            guardado={guardadoNoMes}
            totalGuardado={totalGuardado}
          />
        )}

        <div className="grid grid-cols-1 items-start gap-4 sm:gap-5 lg:grid-cols-5">
          {/* Rendas */}
          <div className="grid grid-cols-1 gap-4 lg:col-span-2">
            <CardRendas
              competencia={competencia}
              recebimentos={listaRecebimentos}
              carregando={carregandoRendas}
              rendasAtivas={(rendas.data ?? []).filter((r) => r.ativa).length}
              gerando={gerar.isPending}
              onGerar={gerarMes}
              onNova={() => setEditorRenda({ aberto: true, renda: null })}
              onAlternarRecebido={alternarRecebido}
              onEditar={setRecebimentoEditando}
            />
            <CardRendasFixas
              rendas={rendas.data ?? []}
              onEditar={(r) => setEditorRenda({ aberto: true, renda: r })}
              onAlternar={alternarAtivaRenda}
              onExcluir={setRendaExcluindo}
            />
          </div>

          {/* Caixinhas */}
          <section className="grid grid-cols-1 gap-3 lg:col-span-3" aria-label="Caixinhas">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <PiggyBankIcon className="text-primary size-5" />
                  Caixinhas
                </h2>
                <p className="text-muted-foreground text-sm">
                  Total guardado: <strong className="text-foreground tabular-nums">{formatarMoeda(totalGuardado)}</strong>
                </p>
              </div>
              <Button onClick={() => setEditorCaixinha({ aberto: true, caixinha: null })}>
                <PlusIcon />
                Nova caixinha
              </Button>
            </div>

            {caixinhas.isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-56 rounded-xl" />
                <Skeleton className="h-56 rounded-xl" />
              </div>
            ) : todasCaixinhas.length === 0 ? (
              <Card className="items-center gap-3 px-6 text-center">
                <PiggyBankIcon className="text-primary size-10" />
                <div>
                  <p className="font-medium">Comece a guardar dinheiro</p>
                  <p className="text-muted-foreground text-sm">
                    Crie uma caixinha para cada objetivo e registre o que for guardando.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGESTOES_CAIXINHA.map((nome) => (
                    <Button
                      key={nome}
                      size="sm"
                      variant="outline"
                      onClick={() => setEditorCaixinha({ aberto: true, caixinha: null, nome })}
                    >
                      <PlusIcon />
                      {nome}
                    </Button>
                  ))}
                </div>
              </Card>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {visiveis.map((c) => (
                    <CardCaixinha
                      key={c.id}
                      caixinha={c}
                      noMes={porCaixinhaNoMes.get(c.id) ?? 0}
                      rotuloMes={competenciaMedia(competencia)}
                      onGuardar={() => setMovimento({ caixinha: c, tipo: 'aporte' })}
                      onRetirar={() => setMovimento({ caixinha: c, tipo: 'retirada' })}
                      onExtrato={() => setExtratoId(c.id)}
                      onEditar={() => setEditorCaixinha({ aberto: true, caixinha: c })}
                      onArquivar={() => arquivar(c)}
                      onExcluir={() => setCaixinhaExcluindo(c)}
                    />
                  ))}
                </div>
                {arquivadas > 0 && (
                  <div className="flex items-center gap-2">
                    <Switch id="arquivadas" checked={mostrarArquivadas} onCheckedChange={setMostrarArquivadas} />
                    <Label htmlFor="arquivadas" className="cursor-pointer font-normal">
                      Mostrar arquivadas ({arquivadas})
                    </Label>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {/* Diálogos */}
      <DialogRenda
        aberto={editorRenda.aberto}
        renda={editorRenda.renda}
        competencia={competencia}
        responsaveis={responsaveis}
        onFechar={() => setEditorRenda({ aberto: false, renda: null })}
      />
      <DialogRecebimento
        recebimento={recebimentoEditando}
        onFechar={() => setRecebimentoEditando(null)}
        onEditarRendaFixa={(id) => {
          const renda = rendas.data?.find((r) => r.id === id)
          if (renda) setEditorRenda({ aberto: true, renda })
        }}
      />
      <DialogCaixinha
        aberto={editorCaixinha.aberto}
        caixinha={editorCaixinha.caixinha}
        nomeSugerido={editorCaixinha.nome}
        quantidade={todasCaixinhas.length}
        contasDoMes={totalContas}
        onFechar={() => setEditorCaixinha({ aberto: false, caixinha: null })}
      />
      <DialogMovimento movimento={movimento} competencia={competencia} onFechar={() => setMovimento(null)} />
      <DialogExtrato caixinha={extratoCaixinha} onFechar={() => setExtratoId(null)} />

      <AlertDialog open={!!rendaExcluindo} onOpenChange={(v) => !v && setRendaExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{rendaExcluindo?.nome}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Os recebimentos desta renda em todos os meses também serão apagados. Se ela só parou de entrar, prefira{' '}
              <strong>desativar</strong>: o histórico fica guardado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {rendaExcluindo?.ativa && (
              <Button
                variant="outline"
                onClick={() => {
                  alternarAtivaRenda(rendaExcluindo)
                  setRendaExcluindo(null)
                }}
              >
                Só desativar
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => {
                if (!rendaExcluindo) return
                const nome = rendaExcluindo.nome
                excluirRenda.mutate(rendaExcluindo.id, { onSuccess: () => toast.success(`${nome} excluída.`) })
                setRendaExcluindo(null)
              }}
            >
              Excluir tudo
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!caixinhaExcluindo} onOpenChange={(v) => !v && setCaixinhaExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir a caixinha “{caixinhaExcluindo?.nome}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {caixinhaExcluindo && caixinhaExcluindo.movimentos > 0
                ? `As ${caixinhaExcluindo.movimentos} movimentações e o saldo de ${formatarMoeda(caixinhaExcluindo.saldo)} serão apagados. Se você só não vai mais usar, arquive.`
                : 'Esta ação não pode ser desfeita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {caixinhaExcluindo && !caixinhaExcluindo.arquivada && caixinhaExcluindo.movimentos > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  arquivar(caixinhaExcluindo)
                  setCaixinhaExcluindo(null)
                }}
              >
                Arquivar
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => {
                if (!caixinhaExcluindo) return
                const nome = caixinhaExcluindo.nome
                excluirCaixinha.mutate(caixinhaExcluindo.id, { onSuccess: () => toast.success(`${nome} excluída.`) })
                setCaixinhaExcluindo(null)
              }}
            >
              Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
