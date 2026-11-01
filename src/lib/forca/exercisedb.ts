/**
 * Demonstrações de exercícios da ExerciseDB (versão gratuita, https://oss.exercisedb.dev).
 * Uso pessoal/não comercial, com crédito obrigatório à AscendAPI. A API limita bastante as
 * consultas, então: o GIF sai direto do endereço fixo (sem consulta), os detalhes só são
 * buscados ao abrir a demonstração e ficam guardados no navegador.
 */
import type { ExercicioPrescrito } from '@/types/triathlon'

const API = 'https://oss.exercisedb.dev/api/v1'
export const CREDITO = { texto: 'ExerciseDB, por AscendAPI', url: 'https://ascendapi.com' }

export interface ExercicioEdb {
  exerciseId: string
  name: string
  gifUrl: string
  targetMuscles: string[]
  bodyParts: string[]
  equipments: string[]
  secondaryMuscles: string[]
  instructions: string[]
}

export interface ResultadoBusca {
  exerciseId: string
  name: string
  gifUrl: string
}

/**
 * Formato dos ids da ExerciseDB. Todo id vindo de fora (resposta da API, JSON salvo no banco,
 * armazenamento do navegador) passa por aqui antes de virar endereço ou consulta.
 */
const ID_VALIDO = /^[A-Za-z0-9]{5,12}$/
export const idValido = (id: unknown): id is string => typeof id === 'string' && ID_VALIDO.test(id)

/** O GIF tem endereço fixo pelo id, sempre no domínio oficial: dá para mostrar sem consultar a API. */
export function gifDe(id: string): string {
  if (!idValido(id)) throw new ErroExerciseDb('Id de exercício inválido.')
  return `https://static.exercisedb.dev/media/${id}.gif`
}

/** Catálogo do app → exercício correspondente na ExerciseDB (conferidos um a um). */
export const DEMONSTRACAO: Record<string, string> = {
  agachamento_livre: 'qXTaZnJ', // barbell full squat
  agachamento_goblet: 'yn8yg1r', // dumbbell goblet squat
  leg_press: '10Z2DXU', // sled 45° leg press
  hack: 'Qa55kX1', // sled hack squat
  agachamento_frontal: 'zG0zs85', // barbell front squat
  agachamento_livre_corpo: '6YUfHPL', // quads (bodyweight squat)
  afundo_halteres: 'RRWFUcw', // dumbbell lunge
  bulgaro: 'qx4fgX7', // dumbbell single leg split squat
  passada: 'IZVHb27', // walking lunge
  step_up: 'aXtJhlg', // dumbbell step-up
  terra_romeno: 'wQ2c4XD', // barbell romanian deadlift
  terra_romeno_halteres: 'rR0LJzx', // dumbbell romanian deadlift
  levantamento_terra: 'ila4NZS', // barbell deadlift
  stiff_unilateral: 'gKozT8X', // dumbbell single leg deadlift
  swing_kettlebell: 'UHJlbu3', // kettlebell swing
  swing_condicionamento: 'UHJlbu3', // kettlebell swing
  elevacao_pelvica: 'qKBpF7I', // barbell glute bridge (a base não tem "hip thrust")
  ponte_gluteo: 'u0cNiij', // low glute bridge on floor
  abdutora: 'CHpahtl', // machine seated hip abduction
  cadeira_extensora: 'my33uHU', // machine leg extension
  extensora_elastico: 'Y1MsI1l', // band leg extension
  mesa_flexora: '17lJ1kr', // machine lying leg curl
  flexora_elastico: '17lJ1kr', // mesmo movimento (a base não tem a versão com elástico)
  panturrilha_em_pe: 'bJYHBIN', // bodyweight standing calf raise
  panturrilha_sentado: 'bOOdeyc', // machine seated calf raise
  supino_reto: 'EIeI8Vf', // barbell bench press
  supino_halteres: 'SpYC0Kp', // dumbbell bench press
  supino_inclinado: '3TZduzM', // barbell incline bench press
  supino_inclinado_halteres: 'ns0SIbU', // dumbbell incline bench press
}

/**
 * Termo de busca (em inglês) dos exercícios do catálogo sem id conferido: na primeira vez que a
 * demonstração é aberta, o app busca, usa o primeiro resultado e guarda a escolha no navegador.
 */
export const BUSCA: Record<string, string> = {
  agachamento_livre: 'barbell full squat',
  agachamento_goblet: 'dumbbell goblet squat',
  leg_press: 'sled 45 leg press',
  hack: 'sled hack squat',
  agachamento_frontal: 'barbell front squat',
  agachamento_livre_corpo: 'quads bodyweight squat',
  afundo_halteres: 'dumbbell lunge',
  bulgaro: 'dumbbell single leg split squat',
  passada: 'walking lunge',
  step_up: 'dumbbell step-up',
  terra_romeno: 'barbell romanian deadlift',
  terra_romeno_halteres: 'dumbbell romanian deadlift',
  levantamento_terra: 'barbell deadlift',
  stiff_unilateral: 'dumbbell single leg deadlift',
  swing_kettlebell: 'kettlebell swing',
  elevacao_pelvica: 'barbell glute bridge',
  ponte_gluteo: 'low glute bridge on floor',
  abdutora: 'machine seated hip abduction',
  cadeira_extensora: 'machine leg extension',
  extensora_elastico: 'band leg extension',
  mesa_flexora: 'machine lying leg curl',
  flexora_elastico: 'band lying leg curl',
  panturrilha_em_pe: 'standing calf raise',
  panturrilha_sentado: 'lever seated calf raise',
  supino_reto: 'barbell bench press',
  supino_halteres: 'dumbbell bench press',
  supino_inclinado: 'barbell incline bench press',
  supino_inclinado_halteres: 'dumbbell incline bench press',
  supino_maquina: 'lever chest press',
  flexao_bracos: 'push-up',
  crucifixo_halteres: 'dumbbell fly',
  crossover: 'cable cross-over',
  peck_deck: 'lever seated fly',
  desenvolvimento_halteres: 'dumbbell seated shoulder press',
  desenvolvimento_barra: 'barbell standing military press',
  desenvolvimento_maquina: 'lever shoulder press',
  desenvolvimento_elastico: 'band shoulder press',
  pike_pushup: 'pike push up',
  elevacao_lateral: 'dumbbell lateral raise',
  elevacao_lateral_polia: 'cable lateral raise',
  elevacao_lateral_elastico: 'band lateral raise',
  face_pull: 'cable face pull',
  crucifixo_inverso: 'dumbbell rear fly',
  rotacao_externa_elastico: 'band external shoulder rotation',
  remada_baixa: 'cable seated row',
  remada_curvada: 'barbell bent over row',
  remada_unilateral: 'dumbbell one arm bent-over row',
  remada_maquina: 'lever seated row',
  remada_elastico: 'band seated row',
  puxada_frontal: 'cable lat pulldown',
  barra_fixa: 'pull-up',
  puxada_elastico: 'band lat pulldown',
  rosca_direta: 'barbell curl',
  rosca_alternada: 'dumbbell alternate biceps curl',
  rosca_martelo: 'dumbbell hammer curl',
  rosca_elastico: 'band curl',
  triceps_pulley: 'cable pushdown',
  triceps_frances: 'dumbbell seated triceps extension',
  mergulho_banco: 'bench dip',
  triceps_elastico: 'band triceps pushdown',
  prancha: 'front plank',
  prancha_lateral: 'side plank',
  abdominal_infra: 'lying leg raise',
  dead_bug: 'dead bug',
  pallof: 'cable pallof press',
  circuito_bike: 'stationary bike',
  remo_ergometro: 'rowing machine',
  burpee: 'burpee',
  mountain_climber: 'mountain climber',
  swing_condicionamento: 'kettlebell swing',
}

const CHAVE_ESCOLHA = (exercicioId: string) => `exercisedb:escolha:${exercicioId}`

/** Demonstração escolhida (ou achada pela busca) neste navegador para um exercício do catálogo. */
export function demonstracaoGuardada(exercicioId: string): string | null {
  try {
    const id = localStorage.getItem(CHAVE_ESCOLHA(exercicioId))
    return idValido(id) ? id : null
  } catch {
    return null
  }
}

export function guardarDemonstracao(exercicioId: string, exercisedbId: string) {
  if (!idValido(exercisedbId)) return
  try {
    localStorage.setItem(CHAVE_ESCOLHA(exercicioId), exercisedbId)
  } catch {
    // sem armazenamento: vale só agora
  }
}

/**
 * Demonstração de um exercício prescrito, em ordem: a salva no exercício da rotina, a escolhida
 * neste navegador, a conferida do catálogo. null = ainda não há (dá para buscar). Id fora do
 * formato é ignorado.
 */
export function demonstracaoDe(x: Pick<ExercicioPrescrito, 'exercicio_id' | 'exercisedb_id'>): string | null {
  const salvo = idValido(x.exercisedb_id) ? x.exercisedb_id : null
  return salvo ?? demonstracaoGuardada(x.exercicio_id) ?? DEMONSTRACAO[x.exercicio_id] ?? null
}

/** Para exercício do catálogo sem id conferido: busca pelo termo preparado e guarda o primeiro resultado. */
export async function encontrarDemonstracao(exercicioId: string): Promise<string | null> {
  const termo = BUSCA[exercicioId]
  if (!termo) return null
  const id = (await pesquisarExercicios(termo))[0]?.exerciseId ?? null
  if (id) guardarDemonstracao(exercicioId, id)
  return id
}

export class ErroExerciseDb extends Error {}

/** Tempo máximo de espera por resposta da ExerciseDB. */
export const TEMPO_LIMITE_MS = 10_000

async function pedir(caminho: string): Promise<unknown> {
  let r: Response
  try {
    r = await fetch(`${API}${caminho}`, { signal: AbortSignal.timeout(TEMPO_LIMITE_MS), credentials: 'omit', referrerPolicy: 'no-referrer' })
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
      throw new ErroExerciseDb('A ExerciseDB demorou demais para responder. Tente de novo.')
    }
    throw new ErroExerciseDb('Sem conexão com a ExerciseDB.')
  }
  if (r.status === 429 || r.status === 503) throw new ErroExerciseDb('A ExerciseDB está limitando as consultas. Tente de novo em alguns segundos.')
  if (r.status === 404) throw new ErroExerciseDb('Exercício não encontrado na ExerciseDB.')
  if (!r.ok) throw new ErroExerciseDb(`A ExerciseDB respondeu com erro (${r.status}).`)
  try {
    return ((await r.json()) as { data?: unknown }).data
  } catch {
    throw new ErroExerciseDb('Resposta inválida da ExerciseDB.')
  }
}

// --- Validação das respostas: só passa o que tem a forma esperada, com tamanhos limitados ---

const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
const textos = (v: unknown, itens: number, max: number) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, itens).map((x) => x.slice(0, max)) : []

/** Normaliza um exercício recebido (ou guardado). null se não for um exercício válido. */
export function exercicioValido(v: unknown): ExercicioEdb | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (!idValido(o.exerciseId) || typeof o.name !== 'string') return null
  return {
    exerciseId: o.exerciseId,
    name: texto(o.name, 200),
    // o endereço do GIF é sempre montado pelo app (domínio fixo), nunca o que veio de fora
    gifUrl: gifDe(o.exerciseId),
    targetMuscles: textos(o.targetMuscles, 10, 60),
    bodyParts: textos(o.bodyParts, 10, 60),
    equipments: textos(o.equipments, 10, 60),
    secondaryMuscles: textos(o.secondaryMuscles, 15, 60),
    instructions: textos(o.instructions, 30, 600),
  }
}

const CHAVE_CACHE = (id: string) => `exercisedb:${id}`

/** Detalhes guardados no navegador (sobrevivem a recarregar a página). Conteúdo inválido é ignorado. */
export function detalhesGuardados(id: string): ExercicioEdb | undefined {
  if (!idValido(id)) return undefined
  try {
    const t = localStorage.getItem(CHAVE_CACHE(id))
    const dados = t ? exercicioValido(JSON.parse(t)) : null
    return dados && dados.exerciseId === id ? dados : undefined
  } catch {
    return undefined
  }
}

export async function buscarDetalhes(id: string): Promise<ExercicioEdb> {
  if (!idValido(id)) throw new ErroExerciseDb('Id de exercício inválido.')
  const guardado = detalhesGuardados(id)
  if (guardado) return guardado
  const dados = exercicioValido(await pedir(`/exercises/${encodeURIComponent(id)}`))
  if (!dados || dados.exerciseId !== id) throw new ErroExerciseDb('Resposta inválida da ExerciseDB.')
  try {
    localStorage.setItem(CHAVE_CACHE(id), JSON.stringify(dados))
  } catch {
    // sem armazenamento: só não fica guardado
  }
  return dados
}

/** Busca aproximada pelo nome (em inglês). Só volta resultado com id válido. */
export async function pesquisarExercicios(termo: string): Promise<ResultadoBusca[]> {
  const consulta = termo.trim().slice(0, 100)
  const dados = await pedir(`/exercises/search?search=${encodeURIComponent(consulta)}&threshold=0.4`)
  if (!Array.isArray(dados)) throw new ErroExerciseDb('Resposta inválida da ExerciseDB.')
  return dados
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && idValido((x as Record<string, unknown>).exerciseId))
    .slice(0, 25)
    .map((x) => ({ exerciseId: x.exerciseId as string, name: texto(x.name, 200), gifUrl: gifDe(x.exerciseId as string) }))
}

/** "Step:1 Hold the bar…" → "Hold the bar…" */
export const limparPasso = (passo: string) => passo.replace(/^\s*step\s*:?\s*\d+\s*[.:)-]?\s*/i, '')

// -----------------------------------------------------------------------------
// Traduções (a ExerciseDB só tem dados em inglês)
// -----------------------------------------------------------------------------

const MUSCULOS: Record<string, string> = {
  abductors: 'abdutores',
  abs: 'abdômen',
  adductors: 'adutores',
  'ankle stabilizers': 'estabilizadores do tornozelo',
  ankles: 'tornozelos',
  back: 'costas',
  biceps: 'bíceps',
  brachialis: 'braquial',
  calves: 'panturrilhas',
  'cardiovascular system': 'sistema cardiovascular',
  chest: 'peito',
  core: 'core',
  delts: 'deltoides',
  deltoids: 'deltoides',
  'erector spinae': 'eretores da espinha',
  feet: 'pés',
  forearms: 'antebraços',
  glutes: 'glúteos',
  'grip muscles': 'músculos da pegada',
  groin: 'virilha',
  hamstrings: 'posteriores da coxa',
  hands: 'mãos',
  'hip flexors': 'flexores do quadril',
  'inner thighs': 'parte interna da coxa',
  'latissimus dorsi': 'latíssimo do dorso',
  lats: 'latíssimo do dorso',
  'levator scapulae': 'elevador da escápula',
  'lower abs': 'abdômen inferior',
  'lower back': 'lombar',
  obliques: 'oblíquos',
  pectorals: 'peitorais',
  quadriceps: 'quadríceps',
  quads: 'quadríceps',
  'rear deltoids': 'deltoide posterior',
  rhomboids: 'romboides',
  'rotator cuff': 'manguito rotador',
  'serratus anterior': 'serrátil anterior',
  shins: 'canelas',
  shoulders: 'ombros',
  soleus: 'sóleo',
  spine: 'coluna',
  sternocleidomastoid: 'esternocleidomastoideo',
  trapezius: 'trapézio',
  traps: 'trapézio',
  triceps: 'tríceps',
  'upper back': 'parte alta das costas',
  'upper chest': 'parte alta do peito',
  'wrist extensors': 'extensores do punho',
  'wrist flexors': 'flexores do punho',
  wrists: 'punhos',
}

const EQUIPAMENTOS: Record<string, string> = {
  assisted: 'assistido',
  band: 'elástico',
  barbell: 'barra',
  'body weight': 'peso do corpo',
  bodyweight: 'peso do corpo',
  'bosu ball': 'bosu',
  cable: 'polia',
  dumbbell: 'halteres',
  'elliptical machine': 'elíptico',
  'ez barbell': 'barra W',
  hammer: 'marreta',
  kettlebell: 'kettlebell',
  'leverage machine': 'máquina',
  'medicine ball': 'medicine ball',
  'olympic barbell': 'barra olímpica',
  'resistance band': 'elástico',
  roller: 'rolo',
  rope: 'corda',
  'skierg machine': 'SkiErg',
  'sled machine': 'máquina (trenó)',
  'smith machine': 'Smith',
  'stability ball': 'bola suíça',
  'stationary bike': 'bicicleta ergométrica',
  'stepmill machine': 'simulador de escada',
  tire: 'pneu',
  'trap bar': 'trap bar',
  'upper body ergometer': 'ergômetro de braço',
  weighted: 'com peso',
  'wheel roller': 'roda abdominal',
}

const traduzir = (mapa: Record<string, string>) => (termo: string) => mapa[termo.toLowerCase()] ?? termo
export const musculoPt = traduzir(MUSCULOS)
export const equipamentoPt = traduzir(EQUIPAMENTOS)
