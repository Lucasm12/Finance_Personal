import { useQuery } from '@tanstack/react-query'

import { verificar } from '@/hooks/useDados'
import { chavesTri } from '@/hooks/useTriathlon'
import { supabase } from '@/lib/supabase'
import type { Parcial, Treino, TreinoPlanejado } from '@/types/triathlon'

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v))

/** Um treino (atividade) pelo id. */
export function useTreino(id: string | null | undefined) {
  return useQuery({
    queryKey: ['tri', 'treinos', 'um', id ?? ''],
    enabled: !!id,
    queryFn: async () => {
      const t = verificar(await supabase.from('treinos').select('*').eq('id', id!).maybeSingle()) as Treino | null
      return t ? { ...t, distancia_m: num(t.distancia_m), elevacao_m: num(t.elevacao_m), cadencia_media: num(t.cadencia_media) } : null
    },
  })
}

/** Parciais de um treino (todas as divisões: por km, voltas, piscinas…). */
export function useParciais(treinoId: string | null | undefined) {
  return useQuery({
    queryKey: chavesTri.parciais(treinoId ?? ''),
    enabled: !!treinoId,
    queryFn: async () =>
      (
        verificar(await supabase.from('treino_parciais').select('*').eq('treino_id', treinoId!).order('tipo').order('ordem')) as Parcial[]
      ).map((p) => ({
        ...p,
        duracao_seg: Number(p.duracao_seg),
        distancia_m: num(p.distancia_m),
        cadencia_media: num(p.cadencia_media),
        elevacao_ganho_m: num(p.elevacao_ganho_m),
        elevacao_perda_m: num(p.elevacao_perda_m),
      })),
  })
}

/** O treino planejado (na Agenda) a que esta atividade foi vinculada, se houver. */
export function usePlanejadoDoTreino(treinoId: string | null | undefined) {
  return useQuery({
    queryKey: chavesTri.planoDoTreino(treinoId ?? ''),
    enabled: !!treinoId,
    queryFn: async () => {
      const lista = verificar(
        await supabase.from('treinos_planejados').select('*').eq('treino_id', treinoId!).order('created_at').limit(5),
      ) as TreinoPlanejado[]
      // prefere o que tem estrutura (dá para comparar passo a passo)
      const t = lista.find((x) => x.estrutura) ?? lista[0] ?? null
      return t ? { ...t, distancia_planejada_m: num(t.distancia_planejada_m), distancia_realizada_m: num(t.distancia_realizada_m) } : null
    },
  })
}
