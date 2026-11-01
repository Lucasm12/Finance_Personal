import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import { mensagemErro } from '@/lib/erros'
import { competenciaAtual, parcelaNoMes } from '@/lib/format'
import type {
  Categoria,
  Competencia,
  Conta,
  ContaInput,
  Lancamento,
  LancamentoComConta,
  LembreteEmail,
  StatusLembrete,
  TotalCategoriaMes,
  TotalMes,
} from '@/types'

export const chaves = {
  categorias: ['categorias'] as const,
  contas: ['contas'] as const,
  lembrete: ['lembrete'] as const,
  lancamentos: (c: Competencia) => ['lancamentos', c] as const,
  totais: ['totais'] as const,
  totaisMes: (inicio: Competencia, fim: Competencia) => ['totais', 'mes', inicio, fim] as const,
  totaisCategoria: (competencias: Competencia[]) => ['totais', 'categoria', ...competencias] as const,
}

/** Lança o erro do Supabase para o React Query tratar. */
export function verificar<T>({ data, error }: { data: T; error: unknown }): T {
  if (error) throw error
  return data
}

export const avisarErro = (erro: unknown) => toast.error(mensagemErro(erro))

// -----------------------------------------------------------------------------
// Consultas
// -----------------------------------------------------------------------------

export function useCategorias() {
  return useQuery({
    queryKey: chaves.categorias,
    queryFn: async () =>
      verificar(
        await supabase.from('categorias').select('*').order('ordem').order('nome'),
      ) as Categoria[],
  })
}

export function useContas() {
  return useQuery({
    queryKey: chaves.contas,
    queryFn: async () => {
      const contas = verificar(await supabase.from('contas').select('*').order('nome')) as Conta[]
      return contas.map((c) => ({ ...c, valor_padrao: Number(c.valor_padrao) }))
    },
  })
}

const CAMPOS_LANCAMENTO =
  '*, conta:contas(id, nome, categoria_id, valor_padrao, dia_vencimento, codigo_pagamento, responsavel, total_parcelas)'

export function useLancamentos(competencia: Competencia) {
  return useQuery({
    queryKey: chaves.lancamentos(competencia),
    queryFn: async () => {
      const dados = verificar(
        await supabase.from('lancamentos').select(CAMPOS_LANCAMENTO).eq('competencia', competencia),
      ) as LancamentoComConta[]
      return dados.map((l) => ({
        ...l,
        valor: Number(l.valor),
        conta: { ...l.conta, valor_padrao: Number(l.conta.valor_padrao) },
      }))
    },
    placeholderData: keepPreviousData,
  })
}

const numerosTotais = <T extends TotalMes>(t: T): T => ({
  ...t,
  total: Number(t.total),
  total_pago: Number(t.total_pago),
  total_pendente: Number(t.total_pendente),
})

/** Totais gerais por mês (view v_totais_mes), de `inicio` até `fim`. */
export function useTotaisMes(inicio: Competencia, fim: Competencia) {
  return useQuery({
    queryKey: chaves.totaisMes(inicio, fim),
    queryFn: async () => {
      const dados = verificar(
        await supabase
          .from('v_totais_mes')
          .select('competencia, quantidade, quantidade_paga, total, total_pago, total_pendente')
          .gte('competencia', inicio)
          .lte('competencia', fim)
          .order('competencia'),
      ) as TotalMes[]
      return dados.map(numerosTotais)
    },
    placeholderData: keepPreviousData,
  })
}

/** Totais por categoria (view v_totais_categoria_mes) para as competências informadas. */
export function useTotaisCategoria(competencias: Competencia[]) {
  return useQuery({
    queryKey: chaves.totaisCategoria(competencias),
    queryFn: async () => {
      const dados = verificar(
        await supabase
          .from('v_totais_categoria_mes')
          .select('competencia, categoria_id, categoria, cor, ordem, quantidade, quantidade_paga, total, total_pago, total_pendente')
          .in('competencia', competencias)
          .order('ordem'),
      ) as TotalCategoriaMes[]
      return dados.map(numerosTotais)
    },
    placeholderData: keepPreviousData,
  })
}

// -----------------------------------------------------------------------------
// Lançamentos
// -----------------------------------------------------------------------------

export function useInvalidar() {
  const qc = useQueryClient()
  return (...chavesInvalidas: (readonly unknown[])[]) =>
    Promise.all(chavesInvalidas.map((queryKey) => qc.invalidateQueries({ queryKey })))
}

export function useGerarMes() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (competencia: Competencia) =>
      verificar(await supabase.rpc('gerar_mes', { p_competencia: competencia })) as number,
    // gerar_mes também cria os recebimentos das rendas fixas
    onSuccess: () => invalidar(['lancamentos'], chaves.totais, chaves.contas, ['recebimentos']),
    onError: avisarErro,
  })
}

type AlteracaoLancamento = Partial<Pick<Lancamento, 'valor' | 'pago' | 'data_pagamento' | 'observacao'>>

export function useAtualizarLancamento(competencia: Competencia) {
  const qc = useQueryClient()
  const chave = chaves.lancamentos(competencia)

  return useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: AlteracaoLancamento }) =>
      verificar(await supabase.from('lancamentos').update(dados).eq('id', id)),
    // Atualização otimista: a tela responde na hora, e volta atrás se der erro.
    onMutate: async ({ id, dados }) => {
      await qc.cancelQueries({ queryKey: chave })
      const anterior = qc.getQueryData<LancamentoComConta[]>(chave)
      qc.setQueryData<LancamentoComConta[]>(chave, (lista) =>
        lista?.map((l) => (l.id === id ? { ...l, ...dados } : l)),
      )
      return { anterior }
    },
    onError: (erro, _vars, contexto) => {
      if (contexto?.anterior) qc.setQueryData(chave, contexto.anterior)
      avisarErro(erro)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: chave })
      qc.invalidateQueries({ queryKey: chaves.totais })
    },
  })
}

export function useExcluirLancamento() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => verificar(await supabase.from('lancamentos').delete().eq('id', id)),
    onSuccess: () => invalidar(['lancamentos'], chaves.totais),
    onError: avisarErro,
  })
}

// -----------------------------------------------------------------------------
// Contas
// -----------------------------------------------------------------------------

interface SalvarContaParams {
  id?: string
  dados: ContaInput
  /** Atualiza o valor dos lançamentos não pagos a partir do mês atual. */
  aplicarEmAberto?: boolean
  /** Conta nova: já cria o lançamento do mês atual. */
  lancarNoMesAtual?: boolean
}

export function useSalvarConta() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, dados, aplicarEmAberto, lancarNoMesAtual }: SalvarContaParams) => {
      const mes = competenciaAtual()

      if (id) {
        verificar(await supabase.from('contas').update(dados).eq('id', id))
        if (aplicarEmAberto) {
          verificar(
            await supabase
              .from('lancamentos')
              .update({ valor: dados.valor_padrao })
              .eq('conta_id', id)
              .eq('pago', false)
              .gte('competencia', mes),
          )
        }
        return
      }

      const nova = verificar(await supabase.from('contas').insert(dados).select().single()) as Conta
      const parcela = parcelaNoMes(nova, mes)
      const dentroDoParcelamento = parcela === null || (parcela >= 1 && parcela <= nova.total_parcelas!)
      if (lancarNoMesAtual && nova.ativa && dentroDoParcelamento) {
        verificar(
          await supabase
            .from('lancamentos')
            .insert({ conta_id: nova.id, competencia: mes, valor: nova.valor_padrao, numero_parcela: parcela }),
        )
      }
    },
    onSuccess: () => invalidar(chaves.contas, ['lancamentos'], chaves.totais),
    onError: avisarErro,
  })
}

export function useAlternarConta() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, ativa }: { id: string; ativa: boolean }) =>
      verificar(await supabase.from('contas').update({ ativa }).eq('id', id)),
    onSuccess: () => invalidar(chaves.contas),
    onError: avisarErro,
  })
}

export function useExcluirConta() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => verificar(await supabase.from('contas').delete().eq('id', id)),
    onSuccess: () => invalidar(chaves.contas, ['lancamentos'], chaves.totais),
    onError: avisarErro,
  })
}

// -----------------------------------------------------------------------------
// Categorias
// -----------------------------------------------------------------------------

type CategoriaInput = Pick<Categoria, 'nome' | 'cor' | 'ordem'>

export function useSalvarCategoria() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: CategoriaInput }) =>
      id
        ? verificar(await supabase.from('categorias').update(dados).eq('id', id))
        : verificar(await supabase.from('categorias').insert(dados)),
    onSuccess: () => invalidar(chaves.categorias, ['lancamentos'], chaves.totais),
    onError: avisarErro,
  })
}

export function useExcluirCategoria() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => verificar(await supabase.from('categorias').delete().eq('id', id)),
    onSuccess: () => invalidar(chaves.categorias),
    onError: avisarErro,
  })
}

/** Grava a ordem de exibição conforme a posição na lista (1, 2, 3...). */
export function useReordenarCategorias() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (lista: Categoria[]) => {
      const mudancas = lista
        .map((c, i) => ({ id: c.id, ordem: i + 1, atual: c.ordem }))
        .filter((c) => c.ordem !== c.atual)
      const resultados = await Promise.all(
        mudancas.map((c) => supabase.from('categorias').update({ ordem: c.ordem }).eq('id', c.id)),
      )
      const falha = resultados.find((r) => r.error)
      if (falha) throw falha.error
    },
    onMutate: async (lista) => {
      await qc.cancelQueries({ queryKey: chaves.categorias })
      const anterior = qc.getQueryData<Categoria[]>(chaves.categorias)
      qc.setQueryData<Categoria[]>(chaves.categorias, lista.map((c, i) => ({ ...c, ordem: i + 1 })))
      return { anterior }
    },
    onError: (erro, _lista, contexto) => {
      if (contexto?.anterior) qc.setQueryData(chaves.categorias, contexto.anterior)
      avisarErro(erro)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: chaves.categorias })
      qc.invalidateQueries({ queryKey: chaves.totais })
    },
  })
}

// -----------------------------------------------------------------------------
// Lembrete por e-mail
// -----------------------------------------------------------------------------

export function useLembrete(habilitado = true) {
  return useQuery({
    queryKey: chaves.lembrete,
    enabled: habilitado,
    queryFn: async () =>
      verificar(await supabase.from('lembretes_email').select('*').maybeSingle()) as LembreteEmail | null,
  })
}

export function useSalvarLembrete() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (dados: Pick<LembreteEmail, 'email' | 'ativo'>) =>
      verificar(
        await supabase
          .from('lembretes_email')
          // link_app: endereço usado no botão "Abrir o app" do e-mail
          .upsert({ ...dados, link_app: window.location.origin }, { onConflict: 'user_id' }),
      ),
    onSuccess: () => invalidar(chaves.lembrete),
    onError: avisarErro,
  })
}

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Dispara um e-mail de teste e aguarda a resposta do Resend
 * (o banco envia de forma assíncrona). Retorna null se ainda não respondeu.
 */
export function useEnviarLembreteTeste() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async () => {
      verificar(await supabase.rpc('enviar_lembrete_teste'))
      for (let tentativa = 0; tentativa < 6; tentativa++) {
        await esperar(tentativa === 0 ? 2500 : 2000)
        const status = verificar(await supabase.rpc('status_ultimo_lembrete')) as StatusLembrete | null
        if (status?.concluido) return status
      }
      return null
    },
    onSettled: () => invalidar(chaves.lembrete),
    onError: avisarErro,
  })
}

// -----------------------------------------------------------------------------
// Dados de exemplo
// -----------------------------------------------------------------------------

interface ImportarParams {
  incluirContas: boolean
  /** Se informado, já gera os lançamentos desse mês. */
  gerarMes?: Competencia
}

export function useImportarExemplo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ incluirContas, gerarMes }: ImportarParams) => {
      const criados = verificar(
        await supabase.rpc('importar_dados_exemplo', { p_incluir_contas: incluirContas }),
      ) as { categorias: number; contas: number }
      const lancamentos = gerarMes
        ? (verificar(await supabase.rpc('gerar_mes', { p_competencia: gerarMes })) as number)
        : 0
      return { ...criados, lancamentos }
    },
    onSuccess: () => qc.invalidateQueries(),
    onError: avisarErro,
  })
}
