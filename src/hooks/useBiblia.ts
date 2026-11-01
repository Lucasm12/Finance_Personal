import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'

import { avisarErro, useInvalidar, verificar } from '@/hooks/useDados'
import { chavesPessoal } from '@/hooks/usePessoal'
import { idVersiculo } from '@/lib/pessoal'
import { supabase } from '@/lib/supabase'
import type {
  Anotacao,
  AnotacaoInput,
  CapituloLido,
  CorMarcacao,
  EstatisticasLeitura,
  LivroBiblia,
  RefCapitulo,
  ResumoLeitura,
  TipoPlano,
  Versiculo,
  VersiculoMarcado,
} from '@/types/pessoal'

export const chavesBiblia = {
  tudo: ['biblia'] as const,
  livros: ['biblia', 'livros'] as const,
  capitulo: (livro: number, capitulo: number) => ['biblia', 'texto', livro, capitulo] as const,
  leitura: ['biblia', 'leitura'] as const,
  lidos: ['biblia', 'leitura', 'lidos'] as const,
  resumo: ['biblia', 'leitura', 'resumo'] as const,
  estatisticas: ['biblia', 'leitura', 'estatisticas'] as const,
  anotacoes: ['biblia', 'anotacoes'] as const,
  marcacoes: ['biblia', 'marcacoes'] as const,
}

// o texto e os livros não mudam: ficam em cache durante toda a sessão
const PARA_SEMPRE = { staleTime: Infinity, gcTime: Infinity }

export function useLivros() {
  return useQuery({
    queryKey: chavesBiblia.livros,
    queryFn: async () => verificar(await supabase.from('biblia_livros').select('*').order('ordem')) as LivroBiblia[],
    ...PARA_SEMPRE,
  })
}

/** Texto de um capítulo (vem do banco: nenhuma API externa na hora de ler). */
export function useCapitulo(livro: number, capitulo: number) {
  return useQuery({
    queryKey: chavesBiblia.capitulo(livro, capitulo),
    queryFn: async () =>
      verificar(
        await supabase.from('biblia_versiculos').select('id, versiculo, texto').eq('livro_id', livro).eq('capitulo', capitulo).order('versiculo'),
      ) as Versiculo[],
    enabled: livro > 0 && capitulo > 0,
    ...PARA_SEMPRE,
  })
}

/** Todos os capítulos já lidos (até 1.189; o Supabase devolve 1.000 por vez). */
export function useCapitulosLidos() {
  return useQuery({
    queryKey: chavesBiblia.lidos,
    queryFn: async () => {
      const todos: CapituloLido[] = []
      for (let de = 0; ; de += 1000) {
        const pagina = verificar(
          await supabase.from('leitura_progresso').select('livro_id, capitulo, concluido_em').order('concluido_em').order('id').range(de, de + 999),
        ) as CapituloLido[]
        todos.push(...pagina)
        if (pagina.length < 1000) break
      }
      return todos
    },
  })
}

/** Plano, meta do dia, adiantado/atrasado e sequência — calculados no servidor. */
export function useResumoLeitura() {
  return useQuery({
    queryKey: chavesBiblia.resumo,
    queryFn: async () => verificar(await supabase.rpc('leitura_resumo')) as ResumoLeitura,
  })
}

export function useEstatisticasLeitura() {
  return useQuery({
    queryKey: chavesBiblia.estatisticas,
    queryFn: async () => verificar(await supabase.rpc('leitura_estatisticas')) as EstatisticasLeitura,
  })
}

/** Saber se a Bíblia já foi importada (seed). */
export function useBibliaImportada() {
  return useQuery({
    queryKey: ['biblia', 'importada'],
    queryFn: async () => {
      const r = await supabase.from('biblia_versiculos').select('id', { count: 'exact', head: true })
      if (r.error) throw r.error
      return (r.count ?? 0) > 30000
    },
    ...PARA_SEMPRE,
  })
}

/** Conclui o capítulo (data do servidor) e devolve o próximo da sequência do plano. */
export function useConcluirCapitulo() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ livro_id, capitulo }: RefCapitulo) =>
      (verificar(await supabase.rpc('concluir_capitulo', { p_livro: livro_id, p_capitulo: capitulo })) as { proximo: RefCapitulo | null }).proximo,
    onSuccess: () => invalidar(chavesBiblia.leitura, chavesPessoal.metas),
    onError: avisarErro,
  })
}

export function useDesmarcarCapitulo() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ livro_id, capitulo }: RefCapitulo) =>
      verificar(await supabase.from('leitura_progresso').delete().eq('livro_id', livro_id).eq('capitulo', capitulo)),
    onSuccess: () => invalidar(chavesBiblia.leitura, chavesPessoal.metas),
    onError: avisarErro,
  })
}

export function useAtivarPlano() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ tipo, inicio, dias, zerar }: { tipo: TipoPlano; inicio: string; dias: number; zerar: boolean }) =>
      verificar(await supabase.rpc('ativar_plano_leitura', { p_tipo: tipo, p_inicio: inicio, p_dias: dias, p_zerar: zerar })),
    onSuccess: () => invalidar(chavesBiblia.leitura, chavesPessoal.metas),
    onError: avisarErro,
  })
}

// -----------------------------------------------------------------------------
// Anotações e versículos marcados
// -----------------------------------------------------------------------------

export function useAnotacoes() {
  return useQuery({
    queryKey: chavesBiblia.anotacoes,
    queryFn: async () => verificar(await supabase.from('leitura_anotacoes').select('*').order('created_at', { ascending: false }).limit(500)) as Anotacao[],
  })
}

export function useSalvarAnotacao() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (dados: AnotacaoInput) => verificar(await supabase.from('leitura_anotacoes').insert(dados)),
    onSuccess: () => invalidar(chavesBiblia.anotacoes),
    onError: avisarErro,
  })
}

export function useExcluirAnotacao() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => verificar(await supabase.from('leitura_anotacoes').delete().eq('id', id)),
    onSuccess: () => invalidar(chavesBiblia.anotacoes),
    onError: avisarErro,
  })
}

/** Versículos marcados, com o texto. Com livro e capítulo, só os daquele capítulo. */
export function useMarcacoes(livro?: number, capitulo?: number) {
  return useQuery({
    queryKey: [...chavesBiblia.marcacoes, livro ?? 'todas', capitulo ?? 'todas'],
    queryFn: async () => {
      let consulta = supabase
        .from('versiculos_marcados')
        .select('id, versiculo_id, cor, nota, created_at, versiculo:biblia_versiculos(livro_id, capitulo, versiculo, texto)')
      if (livro && capitulo) {
        // ids dos versículos de um capítulo ficam numa faixa contínua
        const base = idVersiculo(livro, capitulo, 0)
        consulta = consulta.gte('versiculo_id', base).lte('versiculo_id', base + 999)
      }
      return verificar(await consulta.order('versiculo_id')) as unknown as VersiculoMarcado[]
    },
    placeholderData: keepPreviousData,
  })
}

export function useMarcarVersiculo() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ versiculo_id, cor, nota }: { versiculo_id: number; cor: CorMarcacao; nota: string | null }) =>
      verificar(await supabase.from('versiculos_marcados').upsert({ versiculo_id, cor, nota }, { onConflict: 'user_id,versiculo_id' })),
    onSuccess: () => invalidar(chavesBiblia.marcacoes),
    onError: avisarErro,
  })
}

export function useDesmarcarVersiculo() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => verificar(await supabase.from('versiculos_marcados').delete().eq('id', id)),
    onSuccess: () => invalidar(chavesBiblia.marcacoes),
    onError: avisarErro,
  })
}
