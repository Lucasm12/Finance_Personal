import { useQuery } from '@tanstack/react-query'

import { chavesTri } from '@/hooks/useTriathlon'
import { lerAtividades, type AtividadeLida } from '@/lib/integracao-ai-endurance/atividades'
import { atividadesAiEndurance, statusAiEndurance, treinosAiEndurance } from '@/lib/integracao-ai-endurance/cliente'
import { lerTreinosDoPlano } from '@/lib/integracao-ai-endurance/treinos'
import type { ModalidadeEndurance } from '@/types/triathlon'

/** A integração está configurada no servidor e o usuário tem atleta vinculado? */
export function useStatusAiEndurance(ativo = true) {
  return useQuery({
    queryKey: [...chavesTri.aie, 'status'],
    queryFn: statusAiEndurance,
    enabled: ativo,
    retry: false,
    staleTime: 5 * 60_000,
  })
}

/** Treinos futuros do plano do atleta na AI Endurance, já na estrutura do app. */
export function useTreinosAiEndurance(ativo: boolean) {
  return useQuery({
    queryKey: [...chavesTri.aie, 'treinos'],
    queryFn: async () => lerTreinosDoPlano(await treinosAiEndurance()),
    enabled: ativo,
    retry: false,
    staleTime: 10 * 60_000,
  })
}

const PAGINAS = 5

/** Atividades realizadas das modalidades escolhidas (até 5 páginas de cada). */
export async function buscarAtividadesAiEndurance(modalidades: ModalidadeEndurance[]): Promise<{ treinos: AtividadeLida[]; avisos: string[] }> {
  const treinos: AtividadeLida[] = []
  const avisos: string[] = []
  for (const modalidade of modalidades) {
    for (let pagina = 1; pagina <= PAGINAS; pagina++) {
      const r = await atividadesAiEndurance(modalidade, pagina)
      const lidas = lerAtividades(r.resultados, modalidade)
      treinos.push(...lidas.treinos)
      avisos.push(...lidas.avisos)
      if (!r.proxima) break
      if (pagina === PAGINAS) avisos.push(`Há mais atividades antigas de ${modalidade === 'natacao' ? 'natação' : modalidade} na AI Endurance; trouxemos as ${PAGINAS} primeiras páginas.`)
    }
  }
  treinos.sort((a, b) => b.data_hora.localeCompare(a.data_hora))
  return { treinos, avisos }
}
