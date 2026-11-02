/**
 * Treino feito → treino planejado. A regra é a mesma do banco (public.vincular_ao_planejado):
 * o treino importado ou registrado conclui o único planejado PENDENTE, sem atividade, da mesma
 * modalidade, no mesmo dia. Com dois ou mais no dia, ninguém é escolhido (a pessoa conclui na
 * Agenda). Aqui só serve para a prévia avisar antes de gravar; quem liga é o banco.
 */
import { supabase } from '@/lib/supabase'
import { dataLocal, diasEntre } from '@/lib/triathlon'
import type { Modalidade, TreinoPlanejado } from '@/types/triathlon'

export type PlanejadoResumo = Pick<TreinoPlanejado, 'id' | 'data' | 'modalidade' | 'nome' | 'status' | 'treino_id'>

export type Vinculo = { planejado: PlanejadoResumo } | { candidatos: number } | null

type Comparavel = { modalidade: Modalidade; data_hora: string }

/** O planejado que o treino vai concluir (ou quantos disputam, se for ambíguo). */
export function vinculoAutomatico(t: Comparavel, planejados: PlanejadoResumo[]): Vinculo {
  const dia = dataLocal(t.data_hora)
  const candidatos = planejados.filter((p) => p.status === 'pendente' && !p.treino_id && p.modalidade === t.modalidade && p.data === dia)
  if (candidatos.length > 1) return { candidatos: candidatos.length }
  return candidatos[0] ? { planejado: candidatos[0] } : null
}

/** Entre os treinos lidos, o melhor para um planejado escolhido: mesma modalidade, dia mais próximo. */
export function melhorParaPlanejado<T extends Comparavel>(treinos: T[], planejado: Pick<TreinoPlanejado, 'data' | 'modalidade'>): number | null {
  let melhor: number | null = null
  let menor = Infinity
  treinos.forEach((t, i) => {
    if (t.modalidade !== planejado.modalidade) return
    const dias = Math.abs(diasEntre(dataLocal(t.data_hora), planejado.data))
    if (dias < menor) {
      menor = dias
      melhor = i
    }
  })
  return melhor
}

/** Planejados do período dos treinos lidos (uma consulta). */
export async function buscarPlanejados(treinos: Comparavel[]): Promise<PlanejadoResumo[]> {
  if (!treinos.length) return []
  const dias = treinos.map((t) => dataLocal(t.data_hora)).sort()
  const { data, error } = await supabase
    .from('treinos_planejados')
    .select('id, data, modalidade, nome, status, treino_id')
    .gte('data', dias[0])
    .lte('data', dias.at(-1)!)
    .limit(2000)
  if (error) throw error
  return (data ?? []) as PlanejadoResumo[]
}
