import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'

import { avisarErro, useInvalidar, verificar } from '@/hooks/useDados'
import { planejarAgenda, substituivel, type AcademiaAgendada } from '@/lib/forca/agendamento'
import type { TreinoLido } from '@/lib/importacao/arquivos'
import { supabase } from '@/lib/supabase'
import { dataLocal, diasEntre, somarDias } from '@/lib/triathlon'
import type {
  Alimento,
  MetaSemanal,
  ModalidadeAgenda,
  PerfilAtleta,
  PerfilAtletaInput,
  Pesagem,
  PesagemInput,
  Prova,
  ProvaInput,
  Refeicao,
  RotinaForca,
  RotinaForcaInput,
  SerieForca,
  SerieForcaInput,
  StatusTreino,
  Treino,
  TreinoInput,
  TreinoPlanejado,
  TreinoPlanejadoInput,
} from '@/types/triathlon'

export const chavesTri = {
  treinos: ['tri', 'treinos'] as const,
  treinosDesde: (desde: string) => ['tri', 'treinos', 'desde', desde] as const,
  treinosPeriodo: (inicio: string, fim: string) => ['tri', 'treinos', 'periodo', inicio, fim] as const,
  perfil: ['tri', 'perfil'] as const,
  pesagens: ['tri', 'pesagens'] as const,
  refeicoes: (data: string) => ['tri', 'refeicoes', data] as const,
  alimentos: ['tri', 'alimentos'] as const,
  provas: ['tri', 'provas'] as const,
  agenda: ['tri', 'agenda'] as const,
  planejados: (inicio: string, fim: string) => ['tri', 'agenda', 'planejados', inicio, fim] as const,
  metas: (inicio: string, fim: string) => ['tri', 'agenda', 'metas', inicio, fim] as const,
  forca: ['tri', 'forca'] as const,
  rotina: ['tri', 'forca', 'rotina'] as const,
  series: (inicio: string, fim: string) => ['tri', 'forca', 'series', inicio, fim] as const,
  // as parciais ficam sob 'treinos' para serem atualizadas junto com eles
  parciais: (treinoId: string) => ['tri', 'treinos', 'parciais', treinoId] as const,
  planoDoTreino: (treinoId: string) => ['tri', 'agenda', 'do-treino', treinoId] as const,
  sugestoes: ['tri', 'sugestoes'] as const,
  aie: ['tri', 'ai-endurance'] as const,
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v))

function normalizarTreino(t: Treino): Treino {
  return {
    ...t,
    distancia_m: num(t.distancia_m),
    elevacao_m: num(t.elevacao_m),
    cadencia_media: num(t.cadencia_media),
  }
}

// -----------------------------------------------------------------------------
// Treinos
// -----------------------------------------------------------------------------

/** Treinos dos últimos `dias` (padrão: 400, o suficiente para 1 ano de gráficos + aquecimento do condicionamento). */
export function useTreinosRecentes(dias = 400) {
  const desde = somarDias(dataLocal(new Date()), -dias)
  return useQuery({
    queryKey: chavesTri.treinosDesde(desde),
    queryFn: async () => {
      // O Supabase devolve no máximo 1.000 linhas por consulta: busca em páginas
      const todos: Treino[] = []
      for (let inicio = 0; ; inicio += 1000) {
        const pagina = verificar(
          await supabase
            .from('treinos')
            .select('*')
            .gte('data_hora', new Date(`${desde}T00:00:00`).toISOString())
            .order('data_hora', { ascending: false })
            .order('id')
            .range(inicio, inicio + 999),
        ) as Treino[]
        todos.push(...pagina)
        if (pagina.length < 1000) break
      }
      return todos.map(normalizarTreino)
    },
  })
}

/** Treinos entre duas datas locais (inclusive). */
export function useTreinosPeriodo(inicio: string, fim: string) {
  return useQuery({
    queryKey: chavesTri.treinosPeriodo(inicio, fim),
    queryFn: async () => {
      const dados = verificar(
        await supabase
          .from('treinos')
          .select('*')
          .gte('data_hora', new Date(`${inicio}T00:00:00`).toISOString())
          .lt('data_hora', new Date(`${somarDias(fim, 1)}T00:00:00`).toISOString())
          .order('data_hora', { ascending: false }),
      ) as Treino[]
      return dados.map(normalizarTreino)
    },
    placeholderData: keepPreviousData,
  })
}

/** Treino da Agenda que a atividade concluiu (public.vincular_ao_planejado). */
export interface VinculoPlanejado {
  planejado_id: string
  nome: string
  data: string
  treino_id: string
}

/** Salva o treino. Um treino novo já conclui o planejado do dia na Agenda, se houver um só. */
export function useSalvarTreino() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: Partial<TreinoInput> }) => {
      if (id) {
        verificar(await supabase.from('treinos').update(dados).eq('id', id))
        return { vinculo: null }
      }
      const criado = verificar(await supabase.from('treinos').insert(dados).select('id').single()) as { id: string }
      const { data, error } = await supabase.rpc('vincular_ao_planejado', { p_treino: criado.id })
      // sem a migração 12 a função não existe: o treino fica salvo, só não conclui o planejado
      if (error && error.code !== 'PGRST202') throw error
      const r = data as Partial<VinculoPlanejado> | null
      return { vinculo: r?.planejado_id ? ({ ...r, treino_id: criado.id } as VinculoPlanejado) : null }
    },
    onSuccess: () => invalidar(chavesTri.treinos, chavesTri.agenda),
    onError: avisarErro,
  })
}

export function useExcluirTreino() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => verificar(await supabase.from('treinos').delete().eq('id', id)),
    onSuccess: () => invalidar(chavesTri.treinos),
    onError: avisarErro,
  })
}

export interface TreinoParaImportar extends TreinoLido {
  origem: 'arquivo' | 'ai_endurance'
  origem_id: string
  /** já existe no app: completa o existente com as medidas e as parciais em vez de ignorar */
  completar?: boolean
  /** treino planejado que esta atividade conclui (escolhido pelo usuário); sem ele, vale o único pendente do dia */
  planejado?: string | null
}

export interface ResultadoImportacao {
  novos: number
  completados: number
  parciais: number
  /** já existiam e ficaram de fora */
  ignorados: { origem_id: string; treino_id: string; nome: string }[]
  /** treinos da Agenda concluídos pela importação */
  vinculados: VinculoPlanejado[]
  /** treinos sem vínculo porque havia mais de um planejado da modalidade no dia */
  ambiguos: number
}

/**
 * Grava treinos importados (arquivo ou AI Endurance) com as parciais, pela função do banco
 * public.importar_treinos — é ela que garante que o mesmo treino não entra duas vezes.
 * Vai em lotes de até 20 treinos / 3.000 parciais por chamada.
 */
export function useImportarTreinos() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (treinos: TreinoParaImportar[]) => {
      const total: ResultadoImportacao = { novos: 0, completados: 0, parciais: 0, ignorados: [], vinculados: [], ambiguos: 0 }
      const lotes: TreinoParaImportar[][] = [[]]
      let parciaisNoLote = 0
      for (const t of treinos) {
        const atual = lotes.at(-1)!
        if (atual.length && (atual.length >= 20 || parciaisNoLote + t.parciais.length > 3000)) {
          lotes.push([])
          parciaisNoLote = 0
        }
        lotes.at(-1)!.push(t)
        parciaisNoLote += t.parciais.length
      }
      for (const lote of lotes.filter((l) => l.length)) {
        const itens = lote.map(({ arquivo, parciais, completar, planejado, ...t }) => ({
          treino: { ...t, dados: { arquivo } },
          parciais,
          completar: !!completar,
          planejado: planejado ?? null,
        }))
        const r = verificar(await supabase.rpc('importar_treinos', { p_itens: itens })) as ResultadoImportacao
        total.novos += r.novos
        total.completados += r.completados
        total.parciais += r.parciais
        total.ignorados.push(...r.ignorados)
        // o banco da migração 11 ainda não devolve os vínculos (a 12 sim)
        total.vinculados.push(...(r.vinculados ?? []))
        total.ambiguos += r.ambiguos ?? 0
      }
      return total
    },
    onSuccess: () => invalidar(chavesTri.treinos, chavesTri.agenda),
    onError: avisarErro,
  })
}

// -----------------------------------------------------------------------------
// Perfil do atleta
// -----------------------------------------------------------------------------

export function usePerfilAtleta() {
  return useQuery({
    queryKey: chavesTri.perfil,
    queryFn: async () => {
      const p = verificar(await supabase.from('perfil_atleta').select('*').maybeSingle()) as PerfilAtleta | null
      return p
        ? {
            ...p,
            altura_cm: num(p.altura_cm),
            peso_meta_kg: num(p.peso_meta_kg),
            meta_semanal_kg: num(p.meta_semanal_kg),
            meta_peso_inicial_kg: num(p.meta_peso_inicial_kg),
          }
        : null
    },
  })
}

export function useSalvarPerfil() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (dados: Partial<PerfilAtletaInput>) =>
      verificar(
        await supabase
          .from('perfil_atleta')
          .upsert({ ...dados, atualizado_em: new Date().toISOString() }, { onConflict: 'user_id' }),
      ),
    onSuccess: () => invalidar(chavesTri.perfil),
    onError: avisarErro,
  })
}

// -----------------------------------------------------------------------------
// Peso
// -----------------------------------------------------------------------------

export function usePesagens() {
  return useQuery({
    queryKey: chavesTri.pesagens,
    queryFn: async () => {
      const dados = verificar(await supabase.from('pesagens').select('*').order('data')) as Pesagem[]
      // numeric do Postgres chega como texto
      return dados.map((p) => ({
        ...p,
        peso_kg: Number(p.peso_kg),
        gordura_pct: num(p.gordura_pct),
        massa_muscular_kg: num(p.massa_muscular_kg),
        agua_pct: num(p.agua_pct),
        gordura_visceral: num(p.gordura_visceral),
        massa_ossea_kg: num(p.massa_ossea_kg),
        cintura_cm: num(p.cintura_cm),
        quadril_cm: num(p.quadril_cm),
        pescoco_cm: num(p.pescoco_cm),
        braco_cm: num(p.braco_cm),
        coxa_cm: num(p.coxa_cm),
      }))
    },
  })
}

export function useSalvarPesagem() {
  const invalidar = useInvalidar()
  return useMutation({
    /** Sem id: grava na data (substitui a medição do mesmo dia). Com id: edita, inclusive a data. */
    mutationFn: async ({ id, dados }: { id?: string; dados: Pick<PesagemInput, 'data' | 'peso_kg'> & Partial<PesagemInput> }) =>
      id
        ? verificar(await supabase.from('pesagens').update(dados).eq('id', id))
        : verificar(await supabase.from('pesagens').upsert(dados, { onConflict: 'user_id,data' })),
    onSuccess: () => invalidar(chavesTri.pesagens),
    onError: avisarErro,
  })
}

export function useExcluirPesagem() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => verificar(await supabase.from('pesagens').delete().eq('id', id)),
    onSuccess: () => invalidar(chavesTri.pesagens),
    onError: avisarErro,
  })
}

// -----------------------------------------------------------------------------
// Alimentação
// -----------------------------------------------------------------------------

const numerosMacros = <T extends { kcal: number; proteina_g: number; carbo_g: number; gordura_g: number }>(x: T): T => ({
  ...x,
  kcal: Number(x.kcal),
  proteina_g: Number(x.proteina_g),
  carbo_g: Number(x.carbo_g),
  gordura_g: Number(x.gordura_g),
})

export function useRefeicoes(data: string) {
  return useQuery({
    queryKey: chavesTri.refeicoes(data),
    queryFn: async () =>
      (verificar(await supabase.from('refeicoes').select('*').eq('data', data).order('created_at')) as Refeicao[]).map(
        numerosMacros,
      ),
    placeholderData: keepPreviousData,
  })
}

type RefeicaoInput = Omit<Refeicao, 'id' | 'created_at'>

export function useSalvarRefeicao() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: RefeicaoInput | RefeicaoInput[] }) =>
      id
        ? verificar(await supabase.from('refeicoes').update(dados).eq('id', id))
        : verificar(await supabase.from('refeicoes').insert(dados)),
    onSuccess: () => invalidar(['tri', 'refeicoes']),
    onError: avisarErro,
  })
}

export function useExcluirRefeicao() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => verificar(await supabase.from('refeicoes').delete().eq('id', id)),
    onSuccess: () => invalidar(['tri', 'refeicoes']),
    onError: avisarErro,
  })
}

/** Copia as refeições de um dia para outro. */
export function useCopiarRefeicoes() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ de, para }: { de: string; para: string }) => {
      const origem = verificar(await supabase.from('refeicoes').select('*').eq('data', de)) as Refeicao[]
      if (!origem.length) return 0
      verificar(
        await supabase.from('refeicoes').insert(
          origem.map(({ tipo, descricao, kcal, proteina_g, carbo_g, gordura_g }) => ({
            data: para,
            tipo,
            descricao,
            kcal,
            proteina_g,
            carbo_g,
            gordura_g,
          })),
        ),
      )
      return origem.length
    },
    onSuccess: () => invalidar(['tri', 'refeicoes']),
    onError: avisarErro,
  })
}

export function useAlimentos() {
  return useQuery({
    queryKey: chavesTri.alimentos,
    queryFn: async () =>
      (verificar(await supabase.from('alimentos').select('*').order('nome')) as Alimento[]).map(numerosMacros),
  })
}

export function useSalvarAlimento() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: Omit<Alimento, 'id'> }) =>
      id
        ? verificar(await supabase.from('alimentos').update(dados).eq('id', id))
        : verificar(await supabase.from('alimentos').insert(dados)),
    onSuccess: () => invalidar(chavesTri.alimentos),
    onError: avisarErro,
  })
}

export function useExcluirAlimento() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => verificar(await supabase.from('alimentos').delete().eq('id', id)),
    onSuccess: () => invalidar(chavesTri.alimentos),
    onError: avisarErro,
  })
}

// -----------------------------------------------------------------------------
// Provas
// -----------------------------------------------------------------------------

export function useProvas() {
  return useQuery({
    queryKey: chavesTri.provas,
    queryFn: async () => {
      const dados = verificar(await supabase.from('provas').select('*').order('data')) as Prova[]
      return dados.map((p) => ({ ...p, ciclismo_km: num(p.ciclismo_km), corrida_km: num(p.corrida_km) }))
    },
  })
}

export function useSalvarProva() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: ProvaInput }) =>
      id
        ? verificar(await supabase.from('provas').update(dados).eq('id', id))
        : verificar(await supabase.from('provas').insert(dados)),
    onSuccess: () => invalidar(chavesTri.provas),
    onError: avisarErro,
  })
}

export function useExcluirProva() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => verificar(await supabase.from('provas').delete().eq('id', id)),
    onSuccess: () => invalidar(chavesTri.provas),
    onError: avisarErro,
  })
}

// -----------------------------------------------------------------------------
// Agenda: treinos planejados e metas semanais
// -----------------------------------------------------------------------------

const normalizarPlanejado = (t: TreinoPlanejado): TreinoPlanejado => ({
  ...t,
  distancia_planejada_m: num(t.distancia_planejada_m),
  distancia_realizada_m: num(t.distancia_realizada_m),
})

/** Treinos planejados entre duas datas (inclusive). */
export function useTreinosPlanejados(inicio: string, fim: string) {
  return useQuery({
    queryKey: chavesTri.planejados(inicio, fim),
    queryFn: async () =>
      (
        verificar(
          await supabase
            .from('treinos_planejados')
            .select('*')
            .gte('data', inicio)
            .lte('data', fim)
            .order('data')
            .order('created_at'),
        ) as TreinoPlanejado[]
      ).map(normalizarPlanejado),
    placeholderData: keepPreviousData,
  })
}

/** Metas das semanas que começam entre duas datas (inclusive). */
export function useMetasSemanais(inicio: string, fim: string) {
  return useQuery({
    queryKey: chavesTri.metas(inicio, fim),
    queryFn: async () =>
      (verificar(await supabase.from('metas_semanais').select('*').gte('semana', inicio).lte('semana', fim)) as MetaSemanal[]).map(
        (m) => ({ ...m, distancia_m: num(m.distancia_m) }),
      ),
    placeholderData: keepPreviousData,
  })
}

export function useSalvarTreinoPlanejado() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: Partial<TreinoPlanejadoInput> }) =>
      id
        ? verificar(await supabase.from('treinos_planejados').update(dados).eq('id', id))
        : verificar(await supabase.from('treinos_planejados').insert(dados)),
    onSuccess: () => invalidar(chavesTri.agenda),
    onError: avisarErro,
  })
}

export function useExcluirTreinoPlanejado() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => verificar(await supabase.from('treinos_planejados').delete().eq('id', id)),
    onSuccess: () => invalidar(chavesTri.agenda),
    onError: avisarErro,
  })
}

export interface Conclusao {
  distancia_m: number | null
  duracao_seg: number | null
  /** atividade já registrada em treinos que corresponde a este treino */
  treino_id: string | null
  /** cria a atividade em treinos (quando não há uma para vincular) */
  registrar?: Partial<TreinoInput>
}

/** Muda a situação. Só concluído guarda os dados realizados; voltar para pendente/perdido apaga-os. */
export function useMudarStatusTreino() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, status, conclusao }: { id: string; status: StatusTreino; conclusao?: Conclusao }) => {
      if (status !== 'concluido') {
        return verificar(
          await supabase
            .from('treinos_planejados')
            .update({ status, distancia_realizada_m: null, duracao_realizada_seg: null, treino_id: null, concluido_em: null })
            .eq('id', id),
        )
      }
      let treinoId = conclusao?.treino_id ?? null
      if (!treinoId && conclusao?.registrar) {
        const criado = verificar(await supabase.from('treinos').insert(conclusao.registrar).select('id').single()) as { id: string }
        treinoId = criado.id
      }
      return verificar(
        await supabase
          .from('treinos_planejados')
          .update({
            status,
            distancia_realizada_m: conclusao?.distancia_m ?? null,
            duracao_realizada_seg: conclusao?.duracao_seg ?? null,
            treino_id: treinoId,
            concluido_em: new Date().toISOString(),
          })
          .eq('id', id),
      )
    },
    onSuccess: (_, v) => invalidar(chavesTri.agenda, ...(v.conclusao?.registrar ? [chavesTri.treinos] : [])),
    onError: avisarErro,
  })
}

/** Inclui no plano, já concluída, uma atividade registrada fora dele. */
export function useIncluirNoPlano() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ treino, data }: { treino: Treino & { modalidade: ModalidadeAgenda }; data: string }) =>
      verificar(
        await supabase.from('treinos_planejados').insert({
          data,
          modalidade: treino.modalidade,
          nome: treino.nome,
          status: 'concluido',
          distancia_realizada_m: treino.modalidade === 'forca' ? null : treino.distancia_m,
          duracao_realizada_seg: treino.duracao_seg,
          treino_id: treino.id,
          concluido_em: new Date().toISOString(),
        }),
      ),
    onSuccess: () => invalidar(chavesTri.agenda),
    onError: avisarErro,
  })
}

type ValorMeta = Pick<MetaSemanal, 'distancia_m' | 'sessoes'>

/**
 * Grava as metas nas semanas indicadas: modalidade com valor é criada/substituída,
 * modalidade sem valor (null) fica sem meta nessas semanas. Outras semanas não mudam.
 */
export function useSalvarMetasSemanais() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ semanas, metas }: { semanas: string[]; metas: Record<ModalidadeAgenda, ValorMeta | null> }) => {
      const entradas = Object.entries(metas) as [ModalidadeAgenda, ValorMeta | null][]
      const linhas = semanas.flatMap((semana) =>
        entradas.flatMap(([modalidade, v]) => (v ? [{ semana, modalidade, ...v }] : [])),
      )
      const semMeta = entradas.filter(([, v]) => !v).map(([m]) => m)
      if (linhas.length) {
        verificar(await supabase.from('metas_semanais').upsert(linhas, { onConflict: 'user_id,semana,modalidade' }))
      }
      if (semMeta.length) {
        verificar(await supabase.from('metas_semanais').delete().in('semana', semanas).in('modalidade', semMeta))
      }
    },
    onSuccess: () => invalidar(chavesTri.agenda),
    onError: avisarErro,
  })
}

/** Copia os treinos de uma semana para outra (mesmo dia da semana), como pendentes. */
export function useCopiarSemanaPlanejada() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ de, para }: { de: string; para: string }) => {
      const origem = verificar(
        await supabase.from('treinos_planejados').select('*').gte('data', de).lte('data', somarDias(de, 6)).order('data'),
      ) as TreinoPlanejado[]
      if (!origem.length) return 0
      const deslocamento = diasEntre(de, para)
      verificar(
        await supabase.from('treinos_planejados').insert(
          origem.map((t) => ({
            data: somarDias(t.data, deslocamento),
            modalidade: t.modalidade,
            nome: t.nome,
            descricao: t.descricao,
            distancia_planejada_m: t.distancia_planejada_m,
            duracao_planejada_seg: t.duracao_planejada_seg,
            observacao: t.observacao,
            estrutura: t.estrutura,
            sugestao_id: t.sugestao_id,
          })),
        ),
      )
      return origem.length
    },
    onSuccess: () => invalidar(chavesTri.agenda),
    onError: avisarErro,
  })
}

// -----------------------------------------------------------------------------
// Musculação: rotina, séries registradas e agendamento
// -----------------------------------------------------------------------------

/** A rotina de força ativa (só há uma por usuário). */
export function useRotinaAtiva() {
  return useQuery({
    queryKey: chavesTri.rotina,
    queryFn: async () =>
      verificar(await supabase.from('rotinas_forca').select('*').eq('ativa', true).maybeSingle()) as RotinaForca | null,
  })
}

/** Salva a rotina. Uma rotina nova vira a ativa; a anterior fica guardada no histórico. */
export function useSalvarRotina() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: RotinaForcaInput }) => {
      if (id) return verificar(await supabase.from('rotinas_forca').update(dados).eq('id', id).select('id').single()) as { id: string }
      verificar(await supabase.from('rotinas_forca').update({ ativa: false }).eq('ativa', true))
      return verificar(await supabase.from('rotinas_forca').insert({ ...dados, ativa: true }).select('id').single()) as { id: string }
    },
    onSuccess: () => invalidar(chavesTri.forca),
    onError: avisarErro,
  })
}

/** Séries registradas entre duas datas (inclusive). */
export function useSeriesForca(inicio: string, fim: string) {
  return useQuery({
    queryKey: chavesTri.series(inicio, fim),
    queryFn: async () => {
      const todas: SerieForca[] = []
      for (let de = 0; ; de += 1000) {
        const pagina = verificar(
          await supabase
            .from('series_forca')
            .select('*')
            .gte('data', inicio)
            .lte('data', fim)
            .order('data')
            .order('serie')
            .range(de, de + 999),
        ) as SerieForca[]
        todas.push(...pagina)
        if (pagina.length < 1000) break
      }
      return todas.map((x) => ({ ...x, carga_kg: num(x.carga_kg), rpe: num(x.rpe) }))
    },
    placeholderData: keepPreviousData,
  })
}

/**
 * Registra a execução de um treino de academia: grava as séries (substituindo as
 * anteriores desse treino) e marca o treino planejado como concluído.
 */
export function useRegistrarExecucao() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({
      planejado,
      series,
      duracao_seg,
      registrar,
    }: {
      planejado: TreinoPlanejado
      series: SerieForcaInput[]
      duracao_seg: number | null
      registrar?: Partial<TreinoInput>
    }) => {
      verificar(await supabase.from('series_forca').delete().eq('planejado_id', planejado.id))
      if (series.length) verificar(await supabase.from('series_forca').insert(series))
      let treinoId = planejado.treino_id
      if (!treinoId && registrar) {
        const criado = verificar(await supabase.from('treinos').insert(registrar).select('id').single()) as { id: string }
        treinoId = criado.id
      }
      verificar(
        await supabase
          .from('treinos_planejados')
          .update({
            status: 'concluido',
            distancia_realizada_m: null,
            duracao_realizada_seg: duracao_seg,
            treino_id: treinoId,
            concluido_em: planejado.concluido_em ?? new Date().toISOString(),
          })
          .eq('id', planejado.id),
      )
    },
    onSuccess: (_, v) => invalidar(chavesTri.agenda, chavesTri.forca, ...(v.registrar ? [chavesTri.treinos] : [])),
    onError: avisarErro,
  })
}

/**
 * Coloca os treinos da rotina na agenda: a partir da semana `inicio`, por `semanas` semanas,
 * nos dias da semana indicados (1 = segunda), seguindo a sequência A, B, C… a partir de `primeiro`.
 * Com `substituir`, a academia ainda não feita do período sai da agenda e dá lugar à rotina;
 * o que já foi feito (ou tem séries registradas) fica, e o dia é pulado.
 */
export function useAgendarRotina() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({
      rotina,
      inicio,
      semanas,
      dias,
      primeiro,
      duracoes,
      substituir,
    }: {
      rotina: RotinaForca
      inicio: string
      semanas: number
      dias: number[]
      primeiro: number
      /** minutos estimados de cada treino da rotina */
      duracoes: number[]
      substituir: boolean
    }) => {
      const hoje = dataLocal(new Date())
      const fim = somarDias(inicio, 7 * semanas - 1)
      const existentes = verificar(
        await supabase.from('treinos_planejados').select('id, data, status').eq('modalidade', 'forca').gte('data', inicio).lte('data', fim),
      ) as AcademiaAgendada[]
      // apagar o planejado apaga as séries junto: quem tem séries nunca é substituído
      const candidatos = existentes.filter((t) => substituivel(t, hoje)).map((t) => t.id)
      if (substituir && candidatos.length) {
        const comSeries = verificar(await supabase.from('series_forca').select('planejado_id').in('planejado_id', candidatos)) as {
          planejado_id: string
        }[]
        const marcados = new Set(comSeries.map((s) => s.planejado_id))
        for (const t of existentes) t.temSeries = marcados.has(t.id)
      }
      const plano = planejarAgenda({ inicio, semanas, dias, primeiro, total: rotina.treinos.length, existentes, substituir, hoje })
      const linhas = plano.dias.flatMap(({ data, indice }) => {
        if (indice === null) return []
        const t = rotina.treinos[indice]
        return [
          {
            data,
            modalidade: 'forca' as const,
            nome: `Treino ${t.letra} — ${t.nome}`,
            descricao: t.foco,
            duracao_planejada_seg: duracoes[indice] * 60,
            rotina_id: rotina.id,
            rotina_treino: t.letra,
            exercicios: t.exercicios,
          },
        ]
      })
      // insere antes de apagar: se algo falhar no meio, nenhum treino some da agenda
      if (linhas.length) verificar(await supabase.from('treinos_planejados').insert(linhas))
      if (plano.substituidos.length) verificar(await supabase.from('treinos_planejados').delete().in('id', plano.substituidos))
      return { agendados: linhas.length, pulados: plano.dias.length - linhas.length, substituidos: plano.substituidos.length }
    },
    onSuccess: () => invalidar(chavesTri.agenda),
    onError: avisarErro,
  })
}
