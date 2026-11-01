import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { avisarErro, useInvalidar, verificar } from '@/hooks/useDados'
import { somarMeses } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import type {
  CaixinhaComSaldo,
  CaixinhaInput,
  Caixinha,
  Competencia,
  MovimentoCaixinha,
  Recebimento,
  Renda,
  RendaInput,
} from '@/types'

export const chavesEconomia = {
  rendas: ['rendas'] as const,
  recebimentos: (c: Competencia) => ['recebimentos', c] as const,
  caixinhas: ['caixinhas'] as const,
  movimentos: ['movimentos'] as const,
  movimentosMes: (c: Competencia) => ['movimentos', 'mes', c] as const,
  extrato: (caixinhaId: string) => ['movimentos', 'caixinha', caixinhaId] as const,
}

// -----------------------------------------------------------------------------
// Consultas
// -----------------------------------------------------------------------------

export function useRendas() {
  return useQuery({
    queryKey: chavesEconomia.rendas,
    queryFn: async () => {
      const rendas = verificar(await supabase.from('rendas').select('*').order('nome')) as Renda[]
      return rendas.map((r) => ({ ...r, valor_padrao: Number(r.valor_padrao) }))
    },
  })
}

export function useRecebimentos(competencia: Competencia) {
  return useQuery({
    queryKey: chavesEconomia.recebimentos(competencia),
    queryFn: async () => {
      const dados = verificar(
        await supabase
          .from('recebimentos')
          .select('*, renda:rendas(id, nome, valor_padrao, dia_recebimento, responsavel)')
          .eq('competencia', competencia),
      ) as Recebimento[]
      return dados.map((r) => ({
        ...r,
        valor: Number(r.valor),
        renda: r.renda ? { ...r.renda, valor_padrao: Number(r.renda.valor_padrao) } : null,
      }))
    },
    placeholderData: keepPreviousData,
  })
}

/** Caixinhas já com o saldo (view v_saldo_caixinhas). */
export function useCaixinhas() {
  return useQuery({
    queryKey: chavesEconomia.caixinhas,
    queryFn: async () => {
      const [caixinhas, saldos] = await Promise.all([
        supabase.from('caixinhas').select('*').order('created_at'),
        supabase.from('v_saldo_caixinhas').select('*'),
      ])
      const lista = verificar(caixinhas) as Caixinha[]
      const porId = new Map(
        (verificar(saldos) as { caixinha_id: string }[]).map((s) => [s.caixinha_id, s as Record<string, unknown>]),
      )
      return lista.map<CaixinhaComSaldo>((c) => {
        const s = porId.get(c.id) ?? {}
        return {
          ...c,
          meta: c.meta === null ? null : Number(c.meta),
          aporte_mensal: c.aporte_mensal === null ? null : Number(c.aporte_mensal),
          saldo: Number(s.saldo ?? 0),
          total_guardado: Number(s.total_guardado ?? 0),
          total_retirado: Number(s.total_retirado ?? 0),
          movimentos: Number(s.movimentos ?? 0),
          ultima_data: (s.ultima_data as string | null) ?? null,
        }
      })
    },
  })
}

const numerosMovimento = (m: MovimentoCaixinha) => ({ ...m, valor: Number(m.valor) })

/** Movimentos de todas as caixinhas dentro do mês. */
export function useMovimentosMes(competencia: Competencia) {
  return useQuery({
    queryKey: chavesEconomia.movimentosMes(competencia),
    queryFn: async () => {
      const dados = verificar(
        await supabase
          .from('movimentos_caixinha')
          .select('*')
          .gte('data', competencia)
          .lt('data', somarMeses(competencia, 1)),
      ) as MovimentoCaixinha[]
      return dados.map(numerosMovimento)
    },
    placeholderData: keepPreviousData,
  })
}

export function useExtratoCaixinha(caixinhaId: string | null) {
  return useQuery({
    queryKey: chavesEconomia.extrato(caixinhaId ?? ''),
    enabled: caixinhaId !== null,
    queryFn: async () => {
      const dados = verificar(
        await supabase
          .from('movimentos_caixinha')
          .select('*')
          .eq('caixinha_id', caixinhaId!)
          .order('data', { ascending: false })
          .order('created_at', { ascending: false }),
      ) as MovimentoCaixinha[]
      return dados.map(numerosMovimento)
    },
  })
}

// -----------------------------------------------------------------------------
// Rendas
// -----------------------------------------------------------------------------

interface SalvarRendaParams {
  id?: string
  dados: RendaInput
  /** Renda nova: já cria o recebimento deste mês. */
  lancarEm?: Competencia
}

export function useSalvarRenda() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, dados, lancarEm }: SalvarRendaParams) => {
      if (id) {
        verificar(await supabase.from('rendas').update(dados).eq('id', id))
        return
      }
      const nova = verificar(await supabase.from('rendas').insert(dados).select().single()) as Renda
      if (lancarEm && nova.ativa) {
        verificar(
          await supabase
            .from('recebimentos')
            .insert({ renda_id: nova.id, competencia: lancarEm, valor: nova.valor_padrao }),
        )
      }
    },
    onSuccess: () => invalidar(chavesEconomia.rendas, ['recebimentos']),
    onError: avisarErro,
  })
}

export function useAlternarRenda() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, ativa }: { id: string; ativa: boolean }) =>
      verificar(await supabase.from('rendas').update({ ativa }).eq('id', id)),
    onSuccess: () => invalidar(chavesEconomia.rendas),
    onError: avisarErro,
  })
}

export function useExcluirRenda() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => verificar(await supabase.from('rendas').delete().eq('id', id)),
    onSuccess: () => invalidar(chavesEconomia.rendas, ['recebimentos']),
    onError: avisarErro,
  })
}

// -----------------------------------------------------------------------------
// Recebimentos (renda de cada mês)
// -----------------------------------------------------------------------------

type AlteracaoRecebimento = Partial<
  Pick<Recebimento, 'valor' | 'recebido' | 'data_recebimento' | 'observacao' | 'descricao'>
>

export function useAtualizarRecebimento(competencia: Competencia) {
  const qc = useQueryClient()
  const chave = chavesEconomia.recebimentos(competencia)

  return useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: AlteracaoRecebimento }) =>
      verificar(await supabase.from('recebimentos').update(dados).eq('id', id)),
    onMutate: async ({ id, dados }) => {
      await qc.cancelQueries({ queryKey: chave })
      const anterior = qc.getQueryData<Recebimento[]>(chave)
      qc.setQueryData<Recebimento[]>(chave, (lista) => lista?.map((r) => (r.id === id ? { ...r, ...dados } : r)))
      return { anterior }
    },
    onError: (erro, _vars, contexto) => {
      if (contexto?.anterior) qc.setQueryData(chave, contexto.anterior)
      avisarErro(erro)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: chave }),
  })
}

export function useCriarRendaAvulsa() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (dados: {
      descricao: string
      competencia: Competencia
      valor: number
      recebido: boolean
      data_recebimento: string | null
    }) => verificar(await supabase.from('recebimentos').insert(dados)),
    onSuccess: () => invalidar(['recebimentos']),
    onError: avisarErro,
  })
}

export function useExcluirRecebimento() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => verificar(await supabase.from('recebimentos').delete().eq('id', id)),
    onSuccess: () => invalidar(['recebimentos']),
    onError: avisarErro,
  })
}

// -----------------------------------------------------------------------------
// Caixinhas e movimentos
// -----------------------------------------------------------------------------

export function useSalvarCaixinha() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: CaixinhaInput }) =>
      id
        ? verificar(await supabase.from('caixinhas').update(dados).eq('id', id))
        : verificar(await supabase.from('caixinhas').insert(dados)),
    onSuccess: () => invalidar(chavesEconomia.caixinhas),
    onError: avisarErro,
  })
}

export function useExcluirCaixinha() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => verificar(await supabase.from('caixinhas').delete().eq('id', id)),
    onSuccess: () => invalidar(chavesEconomia.caixinhas, chavesEconomia.movimentos),
    onError: avisarErro,
  })
}

export function useRegistrarMovimento() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (dados: Pick<MovimentoCaixinha, 'caixinha_id' | 'tipo' | 'valor' | 'data' | 'observacao'>) =>
      verificar(await supabase.from('movimentos_caixinha').insert(dados)),
    onSuccess: () => invalidar(chavesEconomia.caixinhas, chavesEconomia.movimentos),
    onError: avisarErro,
  })
}

export function useExcluirMovimento() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => verificar(await supabase.from('movimentos_caixinha').delete().eq('id', id)),
    onSuccess: () => invalidar(chavesEconomia.caixinhas, chavesEconomia.movimentos),
    onError: avisarErro,
  })
}
