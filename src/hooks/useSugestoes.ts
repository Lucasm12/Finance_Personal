import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { avisarErro, useInvalidar, verificar } from '@/hooks/useDados'
import { chavesTri } from '@/hooks/useTriathlon'
import { resumoEstrutura } from '@/lib/sugestoes/estrutura'
import { supabase } from '@/lib/supabase'
import type { EstruturaTreino, SugestaoSalva, SugestaoSalvaInput } from '@/types/triathlon'

/** Treinos de corrida, ciclismo e natação que o usuário salvou. */
export function useSugestoesSalvas() {
  return useQuery({
    queryKey: chavesTri.sugestoes,
    queryFn: async () =>
      (verificar(await supabase.from('sugestoes_salvas').select('*').order('created_at', { ascending: false })) as SugestaoSalva[]).map((s) => ({
        ...s,
        distancia_m: s.distancia_m === null ? null : Number(s.distancia_m),
      })),
  })
}

export function useSalvarSugestao() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (dados: SugestaoSalvaInput) =>
      verificar(await supabase.from('sugestoes_salvas').insert(dados).select('id').single()) as { id: string },
    onSuccess: () => invalidar(chavesTri.sugestoes),
    onError: (erro) =>
      (erro as { code?: string }).code === '23505' ? toast.error('Você já salvou esse treino neste nível.') : avisarErro(erro),
  })
}

export function useExcluirSugestao() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => verificar(await supabase.from('sugestoes_salvas').delete().eq('id', id)),
    onSuccess: () => invalidar(chavesTri.sugestoes),
    onError: avisarErro,
  })
}

export interface Agendamento {
  data: string
  nome: string
  estrutura: EstruturaTreino
  duracao_seg: number | null
  distancia_m: number | null
  sugestao_id?: string | null
  observacao?: string | null
}

/** Coloca o treino na Agenda com a estrutura (para comparar com o que for importado depois). */
export function useAgendarSugestao() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (a: Agendamento) =>
      verificar(
        await supabase.from('treinos_planejados').insert({
          data: a.data,
          modalidade: a.estrutura.modalidade,
          nome: a.nome.trim().slice(0, 120),
          descricao: resumoEstrutura(a.estrutura),
          distancia_planejada_m: a.distancia_m,
          duracao_planejada_seg: a.duracao_seg,
          observacao: a.observacao?.trim() || null,
          estrutura: a.estrutura,
          sugestao_id: a.sugestao_id ?? null,
        }),
      ),
    onSuccess: () => invalidar(chavesTri.agenda),
    onError: avisarErro,
  })
}
