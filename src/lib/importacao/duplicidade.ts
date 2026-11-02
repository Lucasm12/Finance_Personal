/**
 * Duplicidade na importação. A regra é a mesma do banco (public.importar_treinos):
 * é o mesmo treino quando a modalidade é igual e o início difere em até 3 minutos —
 * venha ele de arquivo, da AI Endurance ou de registro à mão. A prévia avisa; o banco garante.
 */
import { supabase } from '@/lib/supabase'
import type { Modalidade, OrigemTreino } from '@/types/triathlon'

export const TOLERANCIA_MS = 3 * 60_000

export interface Existente {
  id: string
  nome: string
  origem: OrigemTreino
  data_hora: string
  modalidade: Modalidade
}

type Comparavel = { modalidade: Modalidade; data_hora: string }

/** O treino já registrado mais próximo do horário (ou null). */
export function acharExistente(t: Comparavel, existentes: Existente[]): Existente | null {
  const inicio = Date.parse(t.data_hora)
  let melhor: Existente | null = null
  for (const e of existentes) {
    const diferenca = Math.abs(Date.parse(e.data_hora) - inicio)
    if (e.modalidade !== t.modalidade || diferenca > TOLERANCIA_MS) continue
    if (!melhor || diferenca < Math.abs(Date.parse(melhor.data_hora) - inicio)) melhor = e
  }
  return melhor
}

/** Para cada treino lido, o que já existe no app (uma consulta só, cobrindo o período todo). */
export async function buscarExistentes(treinos: Comparavel[]): Promise<(Existente | null)[]> {
  if (!treinos.length) return []
  const tempos = treinos.map((t) => Date.parse(t.data_hora))
  const existentes: Existente[] = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase
      .from('treinos')
      .select('id, nome, origem, data_hora, modalidade')
      .gte('data_hora', new Date(Math.min(...tempos) - TOLERANCIA_MS).toISOString())
      .lte('data_hora', new Date(Math.max(...tempos) + TOLERANCIA_MS).toISOString())
      .order('data_hora')
      .range(de, de + 999)
    if (error) throw error
    const pagina = (data ?? []) as Existente[]
    existentes.push(...pagina)
    if (pagina.length < 1000) break
  }
  return treinos.map((t) => acharExistente(t, existentes))
}
