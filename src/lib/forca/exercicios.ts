/**
 * Catálogo de exercícios de força. Cada exercício tem um padrão de movimento,
 * usado para montar os treinos e oferecer alternativas equivalentes.
 */
import type { Equipamento, GrupoMuscular, LocalForca, NivelForca } from '@/types/triathlon'

export type Padrao =
  | 'agachar'
  | 'unilateral'
  | 'quadril'
  | 'gluteo'
  | 'extensora'
  | 'flexora'
  | 'panturrilha'
  | 'empurrar_h'
  | 'peito_iso'
  | 'empurrar_v'
  | 'ombro_lateral'
  | 'ombro_posterior'
  | 'puxar_h'
  | 'puxar_v'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'condicionamento'

export interface Exercicio {
  id: string
  nome: string
  grupo: GrupoMuscular
  padrao: Padrao
  /** equipamentos necessários (vazio = só o peso do corpo) */
  equipamentos: Equipamento[]
  nivel: NivelForca
  tipo: 'composto' | 'isolado'
  unidade?: 'reps' | 'segundos'
  /** saltos e impacto: evitar quando a carga de corrida já é alta */
  impacto?: boolean
  orientacao: string
}

const e = (
  id: string,
  nome: string,
  grupo: GrupoMuscular,
  padrao: Padrao,
  equipamentos: Equipamento[],
  nivel: NivelForca,
  tipo: Exercicio['tipo'],
  orientacao: string,
  extra: Partial<Exercicio> = {},
): Exercicio => ({ id, nome, grupo, padrao, equipamentos, nivel, tipo, orientacao, ...extra })

export const EXERCICIOS: Exercicio[] = [
  // Pernas: dominantes de joelho
  e('agachamento_livre', 'Agachamento livre', 'quadriceps', 'agachar', ['barra'], 'intermediario', 'composto', 'Pés na largura dos ombros, coluna neutra; desça até a coxa paralela e suba empurrando o chão.'),
  e('agachamento_goblet', 'Agachamento goblet', 'quadriceps', 'agachar', ['halteres'], 'iniciante', 'composto', 'Halter junto ao peito, cotovelos para baixo; desça entre os joelhos mantendo o tronco alto.'),
  e('leg_press', 'Leg press', 'quadriceps', 'agachar', ['maquinas'], 'iniciante', 'composto', 'Lombar apoiada no encosto; desça até ~90° no joelho sem tirar o quadril do banco.'),
  e('hack', 'Agachamento hack', 'quadriceps', 'agachar', ['maquinas'], 'intermediario', 'composto', 'Costas apoiadas, desça controlando e suba sem travar os joelhos.'),
  e('agachamento_frontal', 'Agachamento frontal', 'quadriceps', 'agachar', ['barra'], 'avancado', 'composto', 'Barra apoiada à frente dos ombros, cotovelos altos e tronco ereto.'),
  e('agachamento_livre_corpo', 'Agachamento com o peso do corpo', 'quadriceps', 'agachar', [], 'iniciante', 'composto', 'Braços à frente para equilibrar; desça devagar e suba sem tirar os calcanhares do chão.'),
  // Pernas: unilaterais
  e('afundo_halteres', 'Afundo com halteres', 'quadriceps', 'unilateral', ['halteres'], 'intermediario', 'composto', 'Passo à frente, desça o joelho de trás perto do chão; joelho da frente alinhado ao pé.'),
  e('bulgaro', 'Agachamento búlgaro', 'quadriceps', 'unilateral', ['halteres', 'banco'], 'intermediario', 'composto', 'Pé de trás apoiado no banco; desça na vertical controlando o joelho da frente.'),
  e('passada', 'Passada alternada', 'quadriceps', 'unilateral', [], 'iniciante', 'composto', 'Passos longos e controlados, tronco ereto, sem bater o joelho no chão.'),
  e('step_up', 'Subida no banco (step-up)', 'gluteos', 'unilateral', ['banco'], 'iniciante', 'composto', 'Suba empurrando com a perna de cima, sem impulsionar com a de baixo.'),
  // Pernas: dominantes de quadril
  e('terra_romeno', 'Levantamento terra romeno', 'posteriores', 'quadril', ['barra'], 'intermediario', 'composto', 'Joelhos levemente flexionados; leve o quadril para trás com a barra rente às pernas e coluna neutra.'),
  e('terra_romeno_halteres', 'Terra romeno com halteres', 'posteriores', 'quadril', ['halteres'], 'iniciante', 'composto', 'Quadril para trás, halteres perto das coxas; sinta o alongamento atrás da coxa e volte contraindo o glúteo.'),
  e('levantamento_terra', 'Levantamento terra', 'posteriores', 'quadril', ['barra'], 'avancado', 'composto', 'Barra sobre o meio do pé, coluna neutra; empurre o chão e estenda quadril e joelhos juntos.'),
  e('stiff_unilateral', 'Stiff unilateral', 'posteriores', 'quadril', ['halteres'], 'intermediario', 'composto', 'Apoio numa perna, incline o tronco com o quadril nivelado; ótimo para estabilidade de corredor.'),
  e('swing_kettlebell', 'Swing com kettlebell', 'gluteos', 'quadril', ['kettlebell'], 'intermediario', 'composto', 'Movimento de quadril, não de agachamento: projete o quadril à frente e deixe os braços só guiarem.'),
  // Glúteo, extensora, flexora, panturrilha
  e('elevacao_pelvica', 'Elevação pélvica', 'gluteos', 'gluteo', ['barra', 'banco'], 'iniciante', 'composto', 'Escápulas no banco, queixo para dentro; suba até alinhar tronco e coxas e segure 1 s.'),
  e('ponte_gluteo', 'Ponte de glúteo', 'gluteos', 'gluteo', [], 'iniciante', 'isolado', 'Deitado, pés próximos ao quadril; suba contraindo o glúteo sem arquear a lombar.'),
  e('abdutora', 'Cadeira abdutora', 'gluteos', 'gluteo', ['maquinas'], 'iniciante', 'isolado', 'Abra as pernas de forma controlada e volte devagar, sem deixar o peso bater.'),
  e('cadeira_extensora', 'Cadeira extensora', 'quadriceps', 'extensora', ['maquinas'], 'iniciante', 'isolado', 'Estenda o joelho por completo, segure 1 s em cima e desça em 2–3 s.'),
  e('extensora_elastico', 'Extensão de joelho com elástico', 'quadriceps', 'extensora', ['elastico'], 'iniciante', 'isolado', 'Sentado, elástico preso atrás; estenda o joelho por completo e volte devagar.'),
  e('mesa_flexora', 'Mesa flexora', 'posteriores', 'flexora', ['maquinas'], 'iniciante', 'isolado', 'Quadril colado no banco; flexione até o fim e volte controlando.'),
  e('flexora_elastico', 'Flexão de joelho com elástico', 'posteriores', 'flexora', ['elastico'], 'iniciante', 'isolado', 'Deitado de bruços, puxe o calcanhar em direção ao glúteo sem tirar o quadril do chão.'),
  e('panturrilha_em_pe', 'Panturrilha em pé', 'panturrilhas', 'panturrilha', [], 'iniciante', 'isolado', 'Suba na ponta dos pés o máximo possível, pausa de 1 s e desça alongando bem.'),
  e('panturrilha_sentado', 'Panturrilha sentado', 'panturrilhas', 'panturrilha', ['maquinas'], 'iniciante', 'isolado', 'Amplitude total, com pausa embaixo; trabalha o sóleo, importante para corredores.'),
  // Peito
  e('supino_reto', 'Supino reto', 'peito', 'empurrar_h', ['barra', 'banco'], 'intermediario', 'composto', 'Escápulas juntas e pés firmes; desça a barra até o meio do peito e empurre sem tirar o glúteo do banco.'),
  e('supino_halteres', 'Supino reto com halteres', 'peito', 'empurrar_h', ['halteres', 'banco'], 'iniciante', 'composto', 'Cotovelos a ~45° do tronco; desça até alongar o peito e suba aproximando os halteres.'),
  e('supino_inclinado', 'Supino inclinado', 'peito', 'empurrar_h', ['barra', 'banco'], 'intermediario', 'composto', 'Banco a 30–45°; desça a barra na parte alta do peito.'),
  e('supino_inclinado_halteres', 'Supino inclinado com halteres', 'peito', 'empurrar_h', ['halteres', 'banco'], 'iniciante', 'composto', 'Banco a 30°; controle a descida e mantenha os punhos sobre os cotovelos.'),
  e('supino_maquina', 'Supino máquina', 'peito', 'empurrar_h', ['maquinas'], 'iniciante', 'composto', 'Pegada na altura do peito; empurre sem travar os cotovelos e volte devagar.'),
  e('flexao_bracos', 'Flexão de braços', 'peito', 'empurrar_h', [], 'iniciante', 'composto', 'Corpo em linha reta do calcanhar à cabeça; apoie os joelhos se precisar.'),
  e('crucifixo_halteres', 'Crucifixo com halteres', 'peito', 'peito_iso', ['halteres', 'banco'], 'iniciante', 'isolado', 'Cotovelos levemente flexionados; abra até alongar o peito, sem descer demais.'),
  e('crossover', 'Crossover na polia', 'peito', 'peito_iso', ['polia'], 'intermediario', 'isolado', 'Tronco levemente inclinado; feche os braços em arco e segure 1 s no meio.'),
  e('peck_deck', 'Voador (peck deck)', 'peito', 'peito_iso', ['maquinas'], 'iniciante', 'isolado', 'Ombros para trás; feche os braços sem encostar as alças com força.'),
  // Ombros
  e('desenvolvimento_halteres', 'Desenvolvimento com halteres', 'ombros', 'empurrar_v', ['halteres'], 'iniciante', 'composto', 'Abdômen firme; empurre acima da cabeça sem arquear a lombar.'),
  e('desenvolvimento_barra', 'Desenvolvimento militar', 'ombros', 'empurrar_v', ['barra'], 'intermediario', 'composto', 'Em pé, glúteos contraídos; passe a barra perto do rosto e trave em cima.'),
  e('desenvolvimento_maquina', 'Desenvolvimento máquina', 'ombros', 'empurrar_v', ['maquinas'], 'iniciante', 'composto', 'Costas apoiadas; empurre até quase estender os braços.'),
  e('desenvolvimento_elastico', 'Desenvolvimento com elástico', 'ombros', 'empurrar_v', ['elastico'], 'iniciante', 'composto', 'Pise no elástico e empurre acima da cabeça com o abdômen firme.'),
  e('pike_pushup', 'Flexão pike', 'ombros', 'empurrar_v', [], 'intermediario', 'composto', 'Quadril alto em V invertido; desça a cabeça entre as mãos.'),
  e('elevacao_lateral', 'Elevação lateral', 'ombros', 'ombro_lateral', ['halteres'], 'iniciante', 'isolado', 'Leve inclinação à frente; suba até a altura dos ombros, cotovelos levemente flexionados.'),
  e('elevacao_lateral_polia', 'Elevação lateral na polia', 'ombros', 'ombro_lateral', ['polia'], 'intermediario', 'isolado', 'Tensão contínua; suba até a linha do ombro e desça devagar.'),
  e('elevacao_lateral_elastico', 'Elevação lateral com elástico', 'ombros', 'ombro_lateral', ['elastico'], 'iniciante', 'isolado', 'Pise no elástico; suba os braços até a linha dos ombros.'),
  e('face_pull', 'Face pull', 'ombros', 'ombro_posterior', ['polia'], 'iniciante', 'isolado', 'Puxe a corda em direção ao rosto abrindo os cotovelos; protege os ombros de quem nada.'),
  e('crucifixo_inverso', 'Crucifixo inverso', 'ombros', 'ombro_posterior', ['halteres'], 'iniciante', 'isolado', 'Tronco inclinado; abra os braços aproximando as escápulas.'),
  e('rotacao_externa_elastico', 'Rotação externa com elástico', 'ombros', 'ombro_posterior', ['elastico'], 'iniciante', 'isolado', 'Cotovelo colado ao corpo a 90°; gire o antebraço para fora devagar.'),
  // Costas
  e('remada_baixa', 'Remada baixa', 'costas', 'puxar_h', ['polia'], 'iniciante', 'composto', 'Peito aberto; puxe o cabo até o abdômen aproximando as escápulas.'),
  e('remada_curvada', 'Remada curvada', 'costas', 'puxar_h', ['barra'], 'intermediario', 'composto', 'Tronco a ~45°, coluna neutra; puxe a barra até o umbigo.'),
  e('remada_unilateral', 'Remada unilateral', 'costas', 'puxar_h', ['halteres', 'banco'], 'iniciante', 'composto', 'Mão e joelho no banco; puxe o halter em direção ao quadril.'),
  e('remada_maquina', 'Remada máquina', 'costas', 'puxar_h', ['maquinas'], 'iniciante', 'composto', 'Peito no apoio; puxe com os cotovelos e segure 1 s.'),
  e('remada_elastico', 'Remada com elástico', 'costas', 'puxar_h', ['elastico'], 'iniciante', 'composto', 'Elástico preso à frente; puxe até o tronco aproximando as escápulas.'),
  e('puxada_frontal', 'Puxada frontal', 'costas', 'puxar_v', ['polia'], 'iniciante', 'composto', 'Peito para cima; puxe a barra até a parte alta do peito com os cotovelos para baixo.'),
  e('barra_fixa', 'Barra fixa', 'costas', 'puxar_v', ['barra_fixa'], 'intermediario', 'composto', 'Comece com braços estendidos e suba até o queixo passar a barra; use elástico de apoio se precisar.'),
  e('puxada_elastico', 'Puxada com elástico', 'costas', 'puxar_v', ['elastico'], 'iniciante', 'composto', 'Elástico preso no alto; puxe até o peito com os cotovelos para baixo.'),
  // Braços
  e('rosca_direta', 'Rosca direta', 'biceps', 'biceps', ['barra'], 'iniciante', 'isolado', 'Cotovelos fixos ao lado do corpo; suba sem balançar o tronco.'),
  e('rosca_alternada', 'Rosca alternada', 'biceps', 'biceps', ['halteres'], 'iniciante', 'isolado', 'Gire o punho para cima na subida; desça devagar.'),
  e('rosca_martelo', 'Rosca martelo', 'biceps', 'biceps', ['halteres'], 'iniciante', 'isolado', 'Pegada neutra (polegar para cima); cotovelos parados.'),
  e('rosca_elastico', 'Rosca com elástico', 'biceps', 'biceps', ['elastico'], 'iniciante', 'isolado', 'Pise no elástico e flexione os cotovelos sem mexer os ombros.'),
  e('triceps_pulley', 'Tríceps pulley', 'triceps', 'triceps', ['polia'], 'iniciante', 'isolado', 'Cotovelos colados ao corpo; estenda por completo e volte até 90°.'),
  e('triceps_frances', 'Tríceps francês', 'triceps', 'triceps', ['halteres'], 'iniciante', 'isolado', 'Halter atrás da cabeça, cotovelos apontando para cima; estenda sem abrir os cotovelos.'),
  e('mergulho_banco', 'Mergulho no banco', 'triceps', 'triceps', ['banco'], 'iniciante', 'composto', 'Mãos no banco, quadril perto dele; desça até ~90° no cotovelo.'),
  e('triceps_elastico', 'Tríceps com elástico', 'triceps', 'triceps', ['elastico'], 'iniciante', 'isolado', 'Elástico preso no alto; estenda os cotovelos mantendo-os junto ao corpo.'),
  // Core
  e('prancha', 'Prancha abdominal', 'core', 'core', [], 'iniciante', 'isolado', 'Cotovelos sob os ombros, corpo em linha reta; contraia abdômen e glúteos.', { unidade: 'segundos' }),
  e('prancha_lateral', 'Prancha lateral', 'core', 'core', [], 'iniciante', 'isolado', 'Cotovelo sob o ombro, quadril alto; faça os dois lados.', { unidade: 'segundos' }),
  e('abdominal_infra', 'Abdominal infra', 'core', 'core', [], 'iniciante', 'isolado', 'Deitado, eleve o quadril trazendo os joelhos ao peito sem dar impulso.'),
  e('dead_bug', 'Dead bug', 'core', 'core', [], 'iniciante', 'isolado', 'Lombar colada no chão; estenda braço e perna opostos devagar.'),
  e('pallof', 'Pallof press', 'core', 'core', ['polia'], 'intermediario', 'isolado', 'De lado para a polia, empurre o cabo à frente sem deixar o tronco girar.'),
  // Condicionamento
  e('circuito_bike', 'Bike intervalada', 'cardio', 'condicionamento', ['maquinas'], 'iniciante', 'composto', 'Alterne 30 s forte e 30 s leve, sem impacto nas articulações.', { unidade: 'segundos' }),
  e('remo_ergometro', 'Remo ergômetro intervalado', 'cardio', 'condicionamento', ['maquinas'], 'intermediario', 'composto', 'Empurre com as pernas, depois puxe com os braços; 40 s forte e 20 s leve.', { unidade: 'segundos' }),
  e('burpee', 'Burpee', 'cardio', 'condicionamento', [], 'intermediario', 'composto', 'Agache, leve os pés para trás, volte e salte; ritmo constante.', { impacto: true }),
  e('mountain_climber', 'Mountain climber', 'cardio', 'condicionamento', [], 'iniciante', 'composto', 'Em prancha alta, traga os joelhos ao peito alternando, quadril baixo.', { unidade: 'segundos' }),
  e('swing_condicionamento', 'Swing contínuo', 'cardio', 'condicionamento', ['kettlebell'], 'intermediario', 'composto', 'Swings em ritmo constante por tempo, sem perder a postura.', { unidade: 'segundos' }),
]

export const EXERCICIO_POR_ID = new Map(EXERCICIOS.map((x) => [x.id, x]))

const ORDEM_NIVEL: Record<NivelForca, number> = { iniciante: 0, intermediario: 1, avancado: 2 }
export const nivelPermitido = (exercicio: NivelForca, usuario: NivelForca) => ORDEM_NIVEL[exercicio] <= ORDEM_NIVEL[usuario]

/** Na academia há de tudo; em casa só o que foi marcado (o peso do corpo sempre vale). */
export function disponivel(x: Exercicio, local: LocalForca, equipamentos: Equipamento[]) {
  if (local === 'academia') return true
  return x.equipamentos.every((eq) => equipamentos.includes(eq))
}

/** Exercícios equivalentes (mesmo padrão de movimento) que dá para fazer com o que há. */
export function alternativas(id: string, local: LocalForca, equipamentos: Equipamento[], nivel: NivelForca): Exercicio[] {
  const base = EXERCICIO_POR_ID.get(id)
  if (!base) return []
  return EXERCICIOS.filter(
    (x) => x.id !== id && x.padrao === base.padrao && disponivel(x, local, equipamentos) && nivelPermitido(x.nivel, nivel),
  )
}

export const NOMES_GRUPO: Record<GrupoMuscular, string> = {
  peito: 'Peito',
  costas: 'Costas',
  ombros: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  quadriceps: 'Quadríceps',
  posteriores: 'Posteriores da coxa',
  gluteos: 'Glúteos',
  panturrilhas: 'Panturrilhas',
  core: 'Abdômen e core',
  cardio: 'Condicionamento',
}

export const GRUPOS_INFERIORES: GrupoMuscular[] = ['quadriceps', 'posteriores', 'gluteos', 'panturrilhas']

export const NOMES_EQUIPAMENTO: Record<Equipamento, string> = {
  halteres: 'Halteres',
  barra: 'Barra e anilhas',
  kettlebell: 'Kettlebell',
  elastico: 'Elásticos',
  barra_fixa: 'Barra fixa',
  banco: 'Banco',
  maquinas: 'Máquinas',
  polia: 'Polia/cabo',
}

export const NOMES_NIVEL: Record<NivelForca, string> = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' }
