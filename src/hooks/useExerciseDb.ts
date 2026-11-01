import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { BUSCA, buscarDetalhes, detalhesGuardados, encontrarDemonstracao, ErroExerciseDb, pesquisarExercicios } from '@/lib/forca/exercisedb'

/** Acha a demonstração de um exercício do catálogo que ainda não tem uma (só quando `ativo`). */
export function useDemonstracaoAutomatica(exercicioId: string, ativo: boolean) {
  return useQuery({
    queryKey: ['exercisedb', 'automatica', exercicioId],
    queryFn: () => encontrarDemonstracao(exercicioId),
    enabled: ativo && !!BUSCA[exercicioId],
    staleTime: Infinity,
    gcTime: Infinity,
    retry: (n, erro) => n < 1 && erro instanceof ErroExerciseDb,
    retryDelay: 4000,
  })
}

/** Detalhes de um exercício da ExerciseDB (músculos, equipamento, passo a passo). Só consulta uma vez por id. */
export function useDetalhesExercicio(id: string | null) {
  return useQuery({
    queryKey: ['exercisedb', 'exercicio', id],
    queryFn: () => buscarDetalhes(id!),
    enabled: !!id,
    initialData: () => (id ? detalhesGuardados(id) : undefined),
    staleTime: Infinity,
    gcTime: Infinity,
    // limite de consultas: tenta só mais uma vez, devagar
    retry: (n, erro) => n < 1 && erro instanceof ErroExerciseDb,
    retryDelay: 4000,
  })
}

/** Busca por nome (em inglês), esperando a pessoa parar de digitar. */
export function usePesquisaExercicios(termo: string) {
  const [atrasado, setAtrasado] = useState(termo)
  useEffect(() => {
    const t = setTimeout(() => setAtrasado(termo), 600)
    return () => clearTimeout(t)
  }, [termo])
  const consulta = atrasado.trim()
  return useQuery({
    queryKey: ['exercisedb', 'busca', consulta.toLowerCase()],
    queryFn: () => pesquisarExercicios(consulta),
    enabled: consulta.length >= 3,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: false,
  })
}
