import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'

import { avisarErro, useInvalidar, verificar } from '@/hooks/useDados'
import { hojeSP } from '@/lib/pessoal'
import { supabase } from '@/lib/supabase'
import { somarDias } from '@/lib/triathlon'
import type {
  AreaVida,
  AreaVidaInput,
  Diario,
  DiarioInput,
  Habito,
  HabitoInput,
  MarcoMeta,
  MetaInput,
  MetaSituacao,
  Objetivo,
  ObjetivoInput,
  ProgressoMeta,
  RegistroHabito,
  ResumoHabito,
  ResumoSemana,
  Revisao,
  Tarefa,
  TarefaInput,
  VisaoArea,
} from '@/types/pessoal'

export const chavesPessoal = {
  tudo: ['pessoal'] as const,
  inicio: ['pessoal', 'inicio'] as const,
  areas: ['pessoal', 'areas'] as const,
  objetivos: ['pessoal', 'objetivos'] as const,
  metas: ['pessoal', 'metas'] as const,
  visao: (ano: number) => ['pessoal', 'metas', 'visao', ano] as const,
  progresso: (meta: string) => ['pessoal', 'metas', 'progresso', meta] as const,
  marcos: ['pessoal', 'metas', 'marcos'] as const,
  habitos: ['pessoal', 'habitos'] as const,
  registros: (inicio: string, fim: string) => ['pessoal', 'habitos', 'registros', inicio, fim] as const,
  tarefas: ['pessoal', 'tarefas'] as const,
  diario: ['pessoal', 'diario'] as const,
  revisoes: ['pessoal', 'revisoes'] as const,
  resumoSemana: (inicio: string) => ['pessoal', 'revisoes', 'resumo', inicio] as const,
}

const num = (v: unknown) => Number(v ?? 0)
const numOuNulo = (v: unknown) => (v === null || v === undefined ? null : Number(v))

// -----------------------------------------------------------------------------
// Inicialização: áreas padrão e meta da Bíblia (o banco só cria o que falta)
// -----------------------------------------------------------------------------

export function useInicializarPessoal() {
  const invalidar = useInvalidar()
  return useQuery({
    queryKey: chavesPessoal.inicio,
    queryFn: async () => {
      verificar(await supabase.rpc('pessoal_inicializar'))
      await invalidar(chavesPessoal.areas, chavesPessoal.objetivos, chavesPessoal.metas)
      return true
    },
    staleTime: Infinity,
    retry: 1,
  })
}

// -----------------------------------------------------------------------------
// Áreas da vida
// -----------------------------------------------------------------------------

export function useAreas() {
  return useQuery({
    queryKey: chavesPessoal.areas,
    queryFn: async () => verificar(await supabase.from('areas_vida').select('*').order('ordem').order('nome')) as AreaVida[],
  })
}

export function useSalvarArea() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: AreaVidaInput }) =>
      id ? verificar(await supabase.from('areas_vida').update(dados).eq('id', id)) : verificar(await supabase.from('areas_vida').insert(dados)),
    onSuccess: () => invalidar(chavesPessoal.areas),
    onError: avisarErro,
  })
}

export function useExcluirArea() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => verificar(await supabase.from('areas_vida').delete().eq('id', id)),
    onSuccess: () => invalidar(chavesPessoal.areas, chavesPessoal.habitos, chavesPessoal.tarefas),
    onError: avisarErro,
  })
}

// -----------------------------------------------------------------------------
// Objetivos e metas
// -----------------------------------------------------------------------------

export function useObjetivos() {
  return useQuery({
    queryKey: chavesPessoal.objetivos,
    queryFn: async () => verificar(await supabase.from('objetivos').select('*').order('ano', { ascending: false }).order('created_at')) as Objetivo[],
  })
}

export function useSalvarObjetivo() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: Partial<ObjetivoInput> }) =>
      id ? verificar(await supabase.from('objetivos').update(dados).eq('id', id)) : verificar(await supabase.from('objetivos').insert(dados)),
    onSuccess: () => invalidar(chavesPessoal.objetivos, chavesPessoal.metas),
    onError: avisarErro,
  })
}

export function useExcluirObjetivo() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => verificar(await supabase.from('objetivos').delete().eq('id', id)),
    onSuccess: () => invalidar(chavesPessoal.objetivos, chavesPessoal.metas, chavesPessoal.tarefas),
    onError: avisarErro,
  })
}

function normalizarMeta(m: MetaSituacao): MetaSituacao {
  return {
    ...m,
    valor_atual: num(m.valor_atual),
    valor_alvo: numOuNulo(m.valor_alvo),
    valor: num(m.valor),
    alvo: num(m.alvo),
    percentual: num(m.percentual),
    esperado: num(m.esperado),
  }
}

/** Metas com o progresso calculado no servidor (view metas_situacao). */
export function useMetas() {
  return useQuery({
    queryKey: chavesPessoal.metas,
    queryFn: async () => {
      const dados = verificar(await supabase.from('metas_situacao').select('*').order('created_at')) as MetaSituacao[]
      return dados.map(normalizarMeta)
    },
  })
}

export function useVisaoAnual(ano: number) {
  return useQuery({
    queryKey: chavesPessoal.visao(ano),
    queryFn: async () => {
      const dados = verificar(await supabase.rpc('visao_anual', { p_ano: ano })) as VisaoArea[]
      return dados.map((v) => ({ ...v, metas: num(v.metas), concluidas: num(v.concluidas), atrasadas: num(v.atrasadas), progresso: num(v.progresso), esperado: num(v.esperado) }))
    },
    placeholderData: keepPreviousData,
  })
}

export function useSalvarMeta() {
  const invalidar = useInvalidar()
  return useMutation({
    /** Devolve o id da meta (nova ou editada). */
    mutationFn: async ({ id, dados }: { id?: string; dados: Partial<MetaInput> & { valor_atual?: number } }) => {
      if (id) {
        verificar(await supabase.from('metas').update(dados).eq('id', id))
        return id
      }
      return (verificar(await supabase.from('metas').insert(dados).select('id').single()) as { id: string }).id
    },
    onSuccess: () => invalidar(chavesPessoal.metas),
    onError: avisarErro,
  })
}

export function useCriarMarcos() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ meta_id, titulos }: { meta_id: string; titulos: string[] }) =>
      verificar(await supabase.from('metas_marcos').insert(titulos.map((titulo, i) => ({ meta_id, titulo, ordem: i + 1 })))),
    onSuccess: () => invalidar(chavesPessoal.marcos, chavesPessoal.metas),
    onError: avisarErro,
  })
}

export function useExcluirMeta() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => verificar(await supabase.from('metas').delete().eq('id', id)),
    onSuccess: () => invalidar(chavesPessoal.metas, chavesPessoal.tarefas),
    onError: avisarErro,
  })
}

export function useProgressoMeta(metaId: string | null) {
  return useQuery({
    queryKey: chavesPessoal.progresso(metaId ?? ''),
    enabled: Boolean(metaId),
    queryFn: async () => {
      const dados = verificar(
        await supabase.from('metas_progresso').select('*').eq('meta_id', metaId!).order('registrado_em', { ascending: false }).order('created_at', { ascending: false }),
      ) as ProgressoMeta[]
      return dados.map((p) => ({ ...p, valor: num(p.valor) }))
    },
  })
}

export function useRegistrarProgresso() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (dados: Pick<ProgressoMeta, 'meta_id' | 'valor' | 'observacao' | 'registrado_em'>) =>
      verificar(await supabase.from('metas_progresso').insert(dados)),
    // o banco recalcula o valor atual da meta
    onSuccess: () => invalidar(chavesPessoal.metas),
    onError: avisarErro,
  })
}

export function useExcluirProgresso() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => verificar(await supabase.from('metas_progresso').delete().eq('id', id)),
    onSuccess: () => invalidar(chavesPessoal.metas),
    onError: avisarErro,
  })
}

export function useMarcos() {
  return useQuery({
    queryKey: chavesPessoal.marcos,
    queryFn: async () => verificar(await supabase.from('metas_marcos').select('*').order('ordem').order('created_at')) as MarcoMeta[],
  })
}

export function useSalvarMarco() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: Partial<Pick<MarcoMeta, 'meta_id' | 'titulo' | 'ordem' | 'concluido'>> }) =>
      id ? verificar(await supabase.from('metas_marcos').update(dados).eq('id', id)) : verificar(await supabase.from('metas_marcos').insert(dados)),
    onSuccess: () => invalidar(chavesPessoal.marcos, chavesPessoal.metas),
    onError: avisarErro,
  })
}

export function useExcluirMarco() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => verificar(await supabase.from('metas_marcos').delete().eq('id', id)),
    onSuccess: () => invalidar(chavesPessoal.marcos, chavesPessoal.metas),
    onError: avisarErro,
  })
}

// -----------------------------------------------------------------------------
// Hábitos
// -----------------------------------------------------------------------------

export function useHabitos() {
  return useQuery({
    queryKey: chavesPessoal.habitos,
    queryFn: async () => verificar(await supabase.from('habitos').select('*').order('created_at')) as Habito[],
  })
}

/** Sequência e percentuais calculados no servidor. */
export function useResumoHabitos() {
  return useQuery({
    queryKey: [...chavesPessoal.habitos, 'resumo'],
    queryFn: async () => verificar(await supabase.rpc('habitos_resumo')) as ResumoHabito[],
  })
}

export function useRegistrosHabitos(inicio: string, fim: string) {
  return useQuery({
    queryKey: chavesPessoal.registros(inicio, fim),
    queryFn: async () =>
      verificar(await supabase.from('habitos_registros').select('id, habito_id, data, feito').gte('data', inicio).lte('data', fim)) as RegistroHabito[],
  })
}

export function useSalvarHabito() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: Partial<HabitoInput> & { ativo?: boolean } }) =>
      id ? verificar(await supabase.from('habitos').update(dados).eq('id', id)) : verificar(await supabase.from('habitos').insert(dados)),
    onSuccess: () => invalidar(chavesPessoal.habitos),
    onError: avisarErro,
  })
}

export function useExcluirHabito() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => verificar(await supabase.from('habitos').delete().eq('id', id)),
    onSuccess: () => invalidar(chavesPessoal.habitos),
    onError: avisarErro,
  })
}

/** Marca/desmarca o hábito num dia (upsert: um registro por hábito e dia). */
export function useMarcarHabito() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ habito_id, data, feito }: { habito_id: string; data: string; feito: boolean }) =>
      verificar(await supabase.from('habitos_registros').upsert({ habito_id, data, feito }, { onConflict: 'habito_id,data' })),
    onSuccess: () => invalidar(chavesPessoal.habitos),
    onError: avisarErro,
  })
}

// -----------------------------------------------------------------------------
// Tarefas
// -----------------------------------------------------------------------------

/** Pendentes (qualquer data) e concluídas dos últimos 30 dias. */
export function useTarefas() {
  return useQuery({
    queryKey: chavesPessoal.tarefas,
    queryFn: async () =>
      verificar(
        await supabase
          .from('tarefas')
          .select('*')
          .or(`concluida.eq.false,data.gte.${somarDias(hojeSP(), -30)}`)
          .order('data')
          .order('created_at'),
      ) as Tarefa[],
  })
}

export function useSalvarTarefa() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: Partial<TarefaInput> & { concluida?: boolean } }) =>
      id ? verificar(await supabase.from('tarefas').update(dados).eq('id', id)) : verificar(await supabase.from('tarefas').insert(dados)),
    onSuccess: () => invalidar(chavesPessoal.tarefas),
    onError: avisarErro,
  })
}

export function useExcluirTarefa() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => verificar(await supabase.from('tarefas').delete().eq('id', id)),
    onSuccess: () => invalidar(chavesPessoal.tarefas),
    onError: avisarErro,
  })
}

// -----------------------------------------------------------------------------
// Diário e revisões
// -----------------------------------------------------------------------------

/** Últimos 90 dias de diário. */
export function useDiario() {
  return useQuery({
    queryKey: chavesPessoal.diario,
    queryFn: async () =>
      verificar(await supabase.from('diario').select('*').gte('data', somarDias(hojeSP(), -90)).order('data', { ascending: false })) as Diario[],
  })
}

export function useSalvarDiario() {
  const invalidar = useInvalidar()
  return useMutation({
    /** Só os campos enviados mudam (ex.: registrar só o humor pelo Meu dia). */
    mutationFn: async (dados: Pick<DiarioInput, 'data'> & Partial<DiarioInput>) =>
      verificar(await supabase.from('diario').upsert({ ...dados, atualizado_em: new Date().toISOString() }, { onConflict: 'user_id,data' })),
    onSuccess: () => invalidar(chavesPessoal.diario),
    onError: avisarErro,
  })
}

export function useRevisoes() {
  return useQuery({
    queryKey: chavesPessoal.revisoes,
    queryFn: async () => verificar(await supabase.from('revisoes').select('*').order('periodo_inicio', { ascending: false }).limit(60)) as Revisao[],
  })
}

export function useSalvarRevisao() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (dados: Pick<Revisao, 'tipo' | 'periodo_inicio' | 'respostas'>) =>
      verificar(await supabase.from('revisoes').upsert({ ...dados, atualizado_em: new Date().toISOString() }, { onConflict: 'user_id,tipo,periodo_inicio' })),
    onSuccess: () => invalidar(chavesPessoal.revisoes),
    onError: avisarErro,
  })
}

/** Resumo automático da semana (hábitos, leitura, metas, treinos), calculado no servidor. */
export function useResumoSemana(inicio: string) {
  return useQuery({
    queryKey: chavesPessoal.resumoSemana(inicio),
    queryFn: async () => verificar(await supabase.rpc('resumo_semana', { p_inicio: inicio })) as ResumoSemana,
    placeholderData: keepPreviousData,
  })
}
