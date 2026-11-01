/**
 * Sugestão de rotina de força. Nada é sorteado: os treinos saem de modelos por padrão de
 * movimento, ajustados por objetivo, nível, foco, tempo, equipamento, carga aeróbica
 * (corrida, pedal, natação) e histórico.
 */
import {
  disponivel,
  EXERCICIO_POR_ID,
  EXERCICIOS,
  GRUPOS_INFERIORES,
  nivelPermitido,
  type Exercicio,
  type Padrao,
} from '@/lib/forca/exercicios'
import { dataLocal, diasEntre, somarDias } from '@/lib/triathlon'
import type {
  ConfigForca,
  ExercicioPrescrito,
  ObjetivoForca,
  RotinaForcaInput,
  SerieForca,
  Treino,
  TreinoForca,
} from '@/types/triathlon'

// -----------------------------------------------------------------------------
// Séries, repetições e descanso
// -----------------------------------------------------------------------------

interface Esquema {
  series: number
  reps_min: number
  reps_max: number
  descanso_seg: number
}

const BASE: Record<ObjetivoForca, Record<'composto' | 'isolado', Esquema>> = {
  hipertrofia: { composto: { series: 3, reps_min: 8, reps_max: 12, descanso_seg: 90 }, isolado: { series: 3, reps_min: 10, reps_max: 15, descanso_seg: 60 } },
  recomposicao: { composto: { series: 3, reps_min: 6, reps_max: 10, descanso_seg: 120 }, isolado: { series: 3, reps_min: 10, reps_max: 12, descanso_seg: 60 } },
  emagrecimento: { composto: { series: 3, reps_min: 10, reps_max: 12, descanso_seg: 60 }, isolado: { series: 2, reps_min: 12, reps_max: 15, descanso_seg: 45 } },
}

export function esquema(cfg: ConfigForca, x: Exercicio, principal: boolean): Esquema {
  if (x.padrao === 'condicionamento') return { series: cfg.duracao_min >= 60 ? 6 : 4, reps_min: 30, reps_max: 40, descanso_seg: 30 }
  if (x.unidade === 'segundos') return { series: cfg.nivel === 'iniciante' ? 2 : 3, reps_min: 30, reps_max: 45, descanso_seg: 45 }
  let s = { ...BASE[cfg.objetivo][x.tipo] }
  if (cfg.foco === 'forca_condicionamento' && x.tipo === 'composto') {
    s = principal ? { series: 4, reps_min: 4, reps_max: 6, descanso_seg: 150 } : { series: 3, reps_min: 6, reps_max: 8, descanso_seg: 120 }
  }
  if (cfg.nivel === 'iniciante') s.series = Math.min(s.series, x.tipo === 'composto' ? 3 : 2)
  if (cfg.nivel === 'avancado' && x.tipo === 'composto' && cfg.objetivo !== 'emagrecimento') s.series += 1
  return s
}

// -----------------------------------------------------------------------------
// Contexto: o que você já faz de aeróbico e de força
// -----------------------------------------------------------------------------

export interface ContextoAerobico {
  /** médias semanais das últimas 4 semanas */
  corridaKm: number
  pedalKm: number
  natacaoM: number
  horas: number
  /** dia da semana do treino longo (1 = segunda … 7 = domingo), se houver um */
  diaLongao: number | null
}

/** 1 = segunda … 7 = domingo */
export const diaDaSemana = (data: string) => {
  const [a, m, d] = data.split('-').map(Number)
  return new Date(a, m - 1, d).getDay() || 7
}

export function contextoAerobico(treinos: Treino[], hoje = dataLocal(new Date())): ContextoAerobico {
  const inicio = somarDias(hoje, -27)
  const recentes = treinos.filter((t) => {
    const d = dataLocal(t.data_hora)
    return d >= inicio && d <= hoje
  })
  const soma = (m: Treino['modalidade']) => recentes.filter((t) => t.modalidade === m).reduce((s, t) => s + (t.distancia_m ?? 0), 0)
  // longão: o dia da semana em que costumam cair as sessões longas de corrida (15 km+) ou pedal (60 km+)
  const longos = recentes.filter(
    (t) => (t.modalidade === 'corrida' && (t.distancia_m ?? 0) >= 15000) || (t.modalidade === 'ciclismo' && (t.distancia_m ?? 0) >= 60000),
  )
  const contagem = new Map<number, number>()
  for (const t of longos) {
    const d = diaDaSemana(dataLocal(t.data_hora))
    contagem.set(d, (contagem.get(d) ?? 0) + 1)
  }
  const diaLongao = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  return {
    corridaKm: soma('corrida') / 4000,
    pedalKm: soma('ciclismo') / 4000,
    natacaoM: soma('natacao') / 4,
    horas: recentes.filter((t) => t.modalidade !== 'forca').reduce((s, t) => s + t.duracao_seg, 0) / 3600 / 4,
    diaLongao,
  }
}

/** Corrida e pedal já cansam bastante as pernas. */
export const pernasCarregadas = (c: ContextoAerobico) => c.corridaKm >= 25 || c.pedalKm >= 100 || c.corridaKm + c.pedalKm / 4 >= 30
/** Muito nado: poupar empurrar acima da cabeça e reforçar a parte de trás do ombro. */
export const ombrosCarregados = (c: ContextoAerobico) => c.natacaoM >= 6000

// -----------------------------------------------------------------------------
// Modelos de treino (por padrão de movimento)
// -----------------------------------------------------------------------------

interface Slot {
  padrao: Padrao
  /** exercícios preferidos, em ordem; se nenhum servir, vale qualquer outro do mesmo padrão */
  preferidos: string[]
  /** 1 = essencial, 2 = importante, 3 = se der tempo */
  prioridade: 1 | 2 | 3
  principal?: boolean
}

interface Modelo {
  nome: string
  foco: string
  slots: Slot[]
}

const s = (padrao: Padrao, preferidos: string[], prioridade: Slot['prioridade'], principal = false): Slot => ({ padrao, preferidos, prioridade, principal })

// Full Body de 3 dias (a rotina de referência)
const FB_A: Modelo = {
  nome: 'Força geral',
  foco: 'Corpo inteiro',
  slots: [
    s('agachar', ['agachamento_livre', 'agachamento_goblet', 'leg_press'], 1, true),
    s('empurrar_h', ['supino_reto', 'supino_halteres', 'supino_maquina', 'flexao_bracos'], 1, true),
    s('puxar_h', ['remada_baixa', 'remada_maquina', 'remada_unilateral', 'remada_elastico'], 1),
    s('flexora', ['mesa_flexora', 'flexora_elastico'], 2),
    s('empurrar_v', ['desenvolvimento_halteres', 'desenvolvimento_maquina', 'desenvolvimento_elastico'], 2),
    s('core', ['prancha'], 3),
  ],
}
const FB_B: Modelo = {
  nome: 'Hipertrofia',
  foco: 'Corpo inteiro',
  slots: [
    s('agachar', ['leg_press', 'agachamento_goblet', 'hack'], 1, true),
    s('empurrar_h', ['supino_inclinado', 'supino_inclinado_halteres', 'supino_maquina', 'flexao_bracos'], 1),
    s('puxar_v', ['puxada_frontal', 'barra_fixa', 'puxada_elastico'], 1),
    s('quadril', ['terra_romeno', 'terra_romeno_halteres', 'stiff_unilateral'], 2),
    s('ombro_lateral', ['elevacao_lateral', 'elevacao_lateral_polia', 'elevacao_lateral_elastico'], 3),
    s('biceps', ['rosca_direta', 'rosca_alternada', 'rosca_elastico'], 3),
    s('triceps', ['triceps_pulley', 'triceps_frances', 'triceps_elastico'], 3),
  ],
}
const FB_C: Modelo = {
  nome: 'Volume e condicionamento',
  foco: 'Corpo inteiro',
  slots: [
    s('agachar', ['agachamento_goblet', 'leg_press', 'agachamento_livre_corpo'], 1),
    s('extensora', ['cadeira_extensora', 'extensora_elastico'], 3),
    s('empurrar_h', ['supino_maquina', 'supino_halteres', 'flexao_bracos'], 1),
    s('puxar_h', ['remada_unilateral', 'remada_maquina', 'remada_elastico'], 1),
    s('gluteo', ['elevacao_pelvica', 'ponte_gluteo'], 2),
    s('panturrilha', ['panturrilha_em_pe', 'panturrilha_sentado'], 3),
    s('core', ['abdominal_infra', 'dead_bug'], 3),
  ],
}

const SUPERIOR_FORCA: Modelo = {
  nome: 'Superiores — força',
  foco: 'Peito, costas e ombros',
  slots: [
    s('empurrar_h', ['supino_reto', 'supino_halteres', 'supino_maquina', 'flexao_bracos'], 1, true),
    s('puxar_h', ['remada_curvada', 'remada_baixa', 'remada_unilateral', 'remada_elastico'], 1, true),
    s('empurrar_v', ['desenvolvimento_barra', 'desenvolvimento_halteres', 'desenvolvimento_maquina'], 1),
    s('puxar_v', ['barra_fixa', 'puxada_frontal', 'puxada_elastico'], 1),
    s('biceps', ['rosca_direta', 'rosca_alternada'], 3),
    s('triceps', ['triceps_pulley', 'triceps_frances'], 3),
  ],
}
const INFERIOR_FORCA: Modelo = {
  nome: 'Inferiores — força',
  foco: 'Pernas e core',
  slots: [
    s('agachar', ['agachamento_livre', 'agachamento_goblet', 'leg_press'], 1, true),
    s('quadril', ['terra_romeno', 'terra_romeno_halteres'], 1),
    s('unilateral', ['bulgaro', 'afundo_halteres', 'passada'], 2),
    s('flexora', ['mesa_flexora', 'flexora_elastico'], 2),
    s('panturrilha', ['panturrilha_sentado', 'panturrilha_em_pe'], 3),
    s('core', ['prancha', 'dead_bug'], 3),
  ],
}
const SUPERIOR_VOLUME: Modelo = {
  nome: 'Superiores — volume',
  foco: 'Peito, costas, ombros e braços',
  slots: [
    s('empurrar_h', ['supino_inclinado_halteres', 'supino_inclinado', 'supino_maquina', 'flexao_bracos'], 1),
    s('puxar_v', ['puxada_frontal', 'barra_fixa', 'puxada_elastico'], 1),
    s('puxar_h', ['remada_maquina', 'remada_unilateral', 'remada_elastico'], 1),
    s('ombro_lateral', ['elevacao_lateral', 'elevacao_lateral_polia', 'elevacao_lateral_elastico'], 2),
    s('peito_iso', ['crossover', 'peck_deck', 'crucifixo_halteres'], 3),
    s('biceps', ['rosca_martelo', 'rosca_alternada', 'rosca_elastico'], 3),
    s('triceps', ['triceps_frances', 'triceps_pulley', 'mergulho_banco'], 3),
  ],
}
const INFERIOR_VOLUME: Modelo = {
  nome: 'Inferiores — volume',
  foco: 'Pernas e glúteos',
  slots: [
    s('agachar', ['leg_press', 'hack', 'agachamento_goblet'], 1),
    s('gluteo', ['elevacao_pelvica', 'ponte_gluteo'], 1),
    s('unilateral', ['afundo_halteres', 'step_up', 'passada'], 2),
    s('extensora', ['cadeira_extensora', 'extensora_elastico'], 2),
    s('flexora', ['mesa_flexora', 'flexora_elastico'], 2),
    s('panturrilha', ['panturrilha_em_pe', 'panturrilha_sentado'], 3),
  ],
}
const EMPURRAR: Modelo = {
  nome: 'Empurrar',
  foco: 'Peito, ombros e tríceps',
  slots: [
    s('empurrar_h', ['supino_reto', 'supino_halteres', 'supino_maquina', 'flexao_bracos'], 1, true),
    s('empurrar_h', ['supino_inclinado_halteres', 'supino_inclinado', 'supino_maquina'], 2),
    s('empurrar_v', ['desenvolvimento_halteres', 'desenvolvimento_maquina', 'desenvolvimento_elastico'], 1),
    s('ombro_lateral', ['elevacao_lateral', 'elevacao_lateral_polia'], 2),
    s('peito_iso', ['crossover', 'peck_deck', 'crucifixo_halteres'], 3),
    s('triceps', ['triceps_pulley', 'triceps_frances'], 3),
  ],
}
const PUXAR: Modelo = {
  nome: 'Puxar',
  foco: 'Costas, posterior de ombro e bíceps',
  slots: [
    s('puxar_v', ['barra_fixa', 'puxada_frontal', 'puxada_elastico'], 1, true),
    s('puxar_h', ['remada_curvada', 'remada_baixa', 'remada_elastico'], 1),
    s('puxar_h', ['remada_unilateral', 'remada_maquina'], 2),
    s('ombro_posterior', ['face_pull', 'crucifixo_inverso', 'rotacao_externa_elastico'], 2),
    s('biceps', ['rosca_direta', 'rosca_alternada'], 3),
    s('biceps', ['rosca_martelo', 'rosca_elastico'], 3),
  ],
}
const PERNAS: Modelo = {
  nome: 'Pernas',
  foco: 'Quadríceps, posteriores, glúteos e core',
  slots: [
    s('agachar', ['agachamento_livre', 'agachamento_frontal', 'agachamento_goblet', 'leg_press'], 1, true),
    s('quadril', ['terra_romeno', 'terra_romeno_halteres'], 1),
    s('unilateral', ['bulgaro', 'afundo_halteres', 'passada'], 2),
    s('extensora', ['cadeira_extensora', 'extensora_elastico'], 2),
    s('flexora', ['mesa_flexora', 'flexora_elastico'], 2),
    s('panturrilha', ['panturrilha_em_pe', 'panturrilha_sentado'], 3),
    s('core', ['pallof', 'prancha_lateral', 'prancha'], 3),
  ],
}

const INFERIORES = new Set<Padrao>(['agachar', 'unilateral', 'quadril', 'gluteo', 'extensora', 'flexora', 'panturrilha'])
const ISOLADOS_SUPERIORES = new Set<Padrao>(['ombro_lateral', 'peito_iso', 'biceps', 'triceps'])

interface Divisao {
  nome: string
  modelos: Modelo[]
}

function escolherDivisao(cfg: ConfigForca, frequencia: number): Divisao {
  switch (frequencia) {
    case 2:
      return { nome: 'Full Body A/B', modelos: [FB_A, FB_B] }
    case 3:
      return cfg.nivel === 'avancado' && cfg.objetivo === 'hipertrofia' && cfg.foco === 'corpo_inteiro'
        ? { nome: 'ABC (empurrar, puxar, pernas)', modelos: [EMPURRAR, PUXAR, PERNAS] }
        : { nome: 'Full Body ABC', modelos: [FB_A, FB_B, FB_C] }
    case 4:
      return { nome: 'Upper/Lower', modelos: [SUPERIOR_FORCA, INFERIOR_FORCA, SUPERIOR_VOLUME, INFERIOR_VOLUME] }
    case 5:
      return { nome: 'Upper/Lower + ABC', modelos: [SUPERIOR_FORCA, INFERIOR_FORCA, EMPURRAR, PUXAR, PERNAS] }
    default:
      return { nome: 'ABC 2× (empurrar, puxar, pernas)', modelos: [EMPURRAR, PUXAR, PERNAS, SUPERIOR_VOLUME, PUXAR, INFERIOR_VOLUME] }
  }
}

// -----------------------------------------------------------------------------
// Duração
// -----------------------------------------------------------------------------

/** Minutos estimados: 6 min de aquecimento + séries (execução + descanso) + 1 min de troca por exercício. */
export function duracaoEstimada(exercicios: ExercicioPrescrito[]): number {
  const seg = exercicios.reduce((total, x) => {
    const execucao = x.unidade === 'segundos' ? x.reps_max : x.reps_max * 3.5
    return total + x.series * (execucao + x.descanso_seg) + 60
  }, 360)
  return Math.round(seg / 60)
}

// -----------------------------------------------------------------------------
// Sugestão
// -----------------------------------------------------------------------------

export interface Sugestao {
  rotina: RotinaForcaInput
  /** por que a rotina ficou assim */
  motivos: string[]
  /** pontos de atenção */
  avisos: string[]
}

/** Última carga usada em cada exercício (série mais pesada da sessão mais recente). */
export function ultimasCargas(historico: SerieForca[]): Map<string, number> {
  const ultimaData = new Map<string, string>()
  const carga = new Map<string, number>()
  for (const x of historico) {
    if (x.carga_kg === null) continue
    const d = ultimaData.get(x.exercicio_id)
    if (!d || x.data > d) {
      ultimaData.set(x.exercicio_id, x.data)
      carga.set(x.exercicio_id, x.carga_kg)
    } else if (x.data === d) carga.set(x.exercicio_id, Math.max(carga.get(x.exercicio_id) ?? 0, x.carga_kg))
  }
  return carga
}

const prescrever = (cfg: ConfigForca, x: Exercicio, principal: boolean, cargas: Map<string, number>): ExercicioPrescrito => ({
  exercicio_id: x.id,
  nome: x.nome,
  grupo: x.grupo,
  ...esquema(cfg, x, principal),
  unidade: x.unidade ?? 'reps',
  orientacao: x.orientacao,
  nivel: x.nivel,
  carga_kg: cargas.get(x.id) ?? null,
})

export function sugerirRotina(cfg: ConfigForca, ctx: ContextoAerobico, historico: SerieForca[] = [], hoje = dataLocal(new Date())): Sugestao {
  const motivos: string[] = []
  const avisos: string[] = []
  const pernas = pernasCarregadas(ctx)
  const ombros = ombrosCarregados(ctx)
  const cargas = ultimasCargas(historico)

  let frequencia = cfg.frequencia
  if (cfg.nivel === 'iniciante' && frequencia > 4) {
    frequencia = 4
    avisos.push('Para iniciantes, 3 a 4 dias de força por semana bastam: montei 4 e deixei os outros para descanso ou aeróbico leve.')
  }
  if ((pernas || ctx.horas >= 6) && frequencia >= 5) {
    avisos.push(`Você já faz cerca de ${Math.round(ctx.horas)} h de aeróbico por semana; ${frequencia} dias de força podem atrapalhar a recuperação. Fique atento ao cansaço.`)
  }
  const divisao = escolherDivisao(cfg, frequencia)
  motivos.push(`${divisao.nome}: divisão indicada para ${frequencia} dias por semana no nível ${cfg.nivel === 'intermediario' ? 'intermediário' : cfg.nivel === 'avancado' ? 'avançado' : 'iniciante'}.`)
  motivos.push(
    {
      hipertrofia: 'Hipertrofia: 8–12 repetições nos compostos e 10–15 nos isolados, descanso de 60–90 s.',
      recomposicao: 'Recomposição: cargas mais pesadas (6–10 repetições) para manter força e músculo enquanto perde gordura.',
      emagrecimento: 'Emagrecimento: 10–15 repetições com descansos curtos para gastar mais energia sem abandonar a força, que protege a massa muscular.',
    }[cfg.objetivo],
  )

  if (pernas) {
    motivos.push(
      `Você corre ~${Math.round(ctx.corridaKm)} km e pedala ~${Math.round(ctx.pedalKm)} km por semana: reduzi uma série nos exercícios pesados de pernas e tirei exercícios de impacto.`,
    )
  }
  if (ombros) motivos.push(`Você nada ~${Math.round(ctx.natacaoM).toLocaleString('pt-BR')} m por semana: menos desenvolvimento acima da cabeça e mais trabalho para a parte de trás do ombro.`)
  if (cfg.objetivo_secundario === 'endurance') motivos.push('Desempenho no triathlon: incluí exercícios unilaterais, panturrilha e core antirrotação, que ajudam a economia de corrida.')
  if (cfg.objetivo_secundario === 'saude') motivos.push('Saúde e prevenção: incluí trabalho de postura (posterior de ombro) e core.')
  if (historico.length) motivos.push('As cargas de referência vêm do seu histórico de séries registradas.')

  const usados = new Set<string>()
  const treinos: TreinoForca[] = divisao.modelos.map((modelo, i) => {
    let slots = [...modelo.slots]
    const temInferior = slots.some((x) => INFERIORES.has(x.padrao))
    // objetivos secundários e foco acrescentam blocos
    if (cfg.objetivo_secundario === 'endurance' && temInferior && !slots.some((x) => x.padrao === 'unilateral')) {
      slots.push(s('unilateral', ['stiff_unilateral', 'bulgaro', 'afundo_halteres', 'step_up', 'passada'], 2))
    }
    if (cfg.objetivo_secundario === 'endurance' && temInferior && !slots.some((x) => x.padrao === 'panturrilha')) {
      slots.push(s('panturrilha', ['panturrilha_sentado', 'panturrilha_em_pe'], 2))
    }
    if ((cfg.objetivo_secundario === 'saude' || ombros) && !temInferior && !slots.some((x) => x.padrao === 'ombro_posterior')) {
      slots.push(s('ombro_posterior', ['face_pull', 'rotacao_externa_elastico', 'crucifixo_inverso'], ombros ? 1 : 2))
    }
    if ((cfg.objetivo_secundario === 'endurance' || cfg.objetivo_secundario === 'saude') && !slots.some((x) => x.padrao === 'core')) {
      slots.push(s('core', ['pallof', 'prancha_lateral', 'dead_bug'], 2))
    }
    const finalizador = cfg.foco === 'forca_condicionamento' || cfg.objetivo === 'emagrecimento'
    if (finalizador && !pernas) slots.push(s('condicionamento', ['circuito_bike', 'remo_ergometro', 'mountain_climber', 'swing_condicionamento'], cfg.foco === 'forca_condicionamento' ? 2 : 3))
    if (cfg.foco === 'superiores') slots = slots.map((x) => (INFERIORES.has(x.padrao) && x.prioridade > 1 ? { ...x, prioridade: 3 } : x))
    if (cfg.foco === 'inferiores') slots = slots.map((x) => (ISOLADOS_SUPERIORES.has(x.padrao) ? { ...x, prioridade: 3 } : x))
    if (cfg.foco === 'superiores' && temInferior) slots.push(s('ombro_lateral', ['elevacao_lateral', 'elevacao_lateral_polia', 'elevacao_lateral_elastico'], 2))
    if (cfg.foco === 'inferiores' && !slots.some((x) => x.padrao === 'gluteo')) slots.push(s('gluteo', ['elevacao_pelvica', 'ponte_gluteo'], 2))

    // escolhe o exercício de cada bloco: preferidos primeiro, sem repetir entre os dias quando houver opção
    const escolhidos: { slot: Slot; exercicio: Exercicio }[] = []
    for (const slot of slots) {
      const candidatos = [
        ...slot.preferidos.map((id) => EXERCICIO_POR_ID.get(id)).filter((x): x is Exercicio => !!x),
        ...EXERCICIOS.filter((x) => x.padrao === slot.padrao && !slot.preferidos.includes(x.id)),
      ].filter(
        (x) =>
          x.padrao === slot.padrao &&
          disponivel(x, cfg.local, cfg.equipamentos) &&
          nivelPermitido(x.nivel, cfg.nivel) &&
          !(pernas && x.impacto) &&
          !escolhidos.some((e) => e.exercicio.id === x.id),
      )
      const exercicio = candidatos.find((x) => !usados.has(x.id)) ?? candidatos[0]
      if (!exercicio) {
        if (slot.prioridade === 1) avisos.push(`Treino ${String.fromCharCode(65 + i)}: sem equipamento para um exercício de ${nomePadrao(slot.padrao)}. Um elástico resolve.`)
        continue
      }
      usados.add(exercicio.id)
      escolhidos.push({ slot, exercicio })
    }

    let exercicios = escolhidos.map(({ slot, exercicio }) => {
      const p = prescrever(cfg, exercicio, !!slot.principal, cargas)
      const inferior = GRUPOS_INFERIORES.includes(exercicio.grupo)
      if (pernas && inferior && exercicio.tipo === 'composto') p.series = Math.max(2, p.series - 1)
      if (ombros && slot.padrao === 'empurrar_v') p.series = Math.max(2, p.series - 1)
      if (cfg.foco === 'superiores' && exercicio.tipo === 'composto') p.series = inferior ? Math.max(2, p.series - 1) : p.series + 1
      if (cfg.foco === 'inferiores' && exercicio.tipo === 'composto') p.series = inferior ? p.series + 1 : Math.max(2, p.series - 1)
      return { p, prioridade: slot.prioridade }
    })

    // cabe no tempo? tira o que é "se der tempo", depois o "importante", depois séries dos isolados
    for (const prioridade of [3, 2] as const) {
      while (duracaoEstimada(exercicios.map((x) => x.p)) > cfg.duracao_min) {
        const idx = exercicios.map((x) => x.prioridade).lastIndexOf(prioridade)
        if (idx < 0) break
        exercicios = exercicios.filter((_, j) => j !== idx)
      }
    }
    for (const x of exercicios) {
      if (duracaoEstimada(exercicios.map((y) => y.p)) <= cfg.duracao_min) break
      if (x.p.series > 2) x.p.series -= 1
    }
    return { letra: String.fromCharCode(65 + i), nome: modelo.nome, foco: modelo.foco, exercicios: exercicios.map((x) => x.p) }
  })

  const dias = distribuirDias(treinos, ctx)
  if (ctx.diaLongao) motivos.push(`Seus treinos longos costumam ser na ${NOMES_DIA[ctx.diaLongao]}: deixei pernas pesadas longe da véspera dele.`)
  avisos.push(...avisosConsecutivos(treinos, dias))
  if (historico.length) {
    const ultima = [...historico].sort((a, b) => b.data.localeCompare(a.data))[0]
    if (diasEntre(ultima.data, hoje) > 21) avisos.push('Faz mais de 3 semanas sem musculação registrada: comece as primeiras sessões com cargas mais leves.')
  }

  const objetivoTexto = { hipertrofia: 'Hipertrofia', recomposicao: 'Recomposição', emagrecimento: 'Emagrecimento' }[cfg.objetivo]
  return {
    rotina: { ...cfg, frequencia, nome: `${divisao.nome} · ${objetivoTexto}`, divisao: divisao.nome, dias_semana: dias, treinos, ativa: true },
    motivos,
    avisos,
  }
}

function nomePadrao(p: Padrao) {
  return (
    {
      agachar: 'agachamento',
      unilateral: 'pernas unilateral',
      quadril: 'quadril',
      gluteo: 'glúteo',
      extensora: 'quadríceps',
      flexora: 'posteriores',
      panturrilha: 'panturrilha',
      empurrar_h: 'peito',
      peito_iso: 'peito',
      empurrar_v: 'ombros',
      ombro_lateral: 'ombros',
      ombro_posterior: 'ombros',
      puxar_h: 'costas',
      puxar_v: 'costas',
      biceps: 'bíceps',
      triceps: 'tríceps',
      core: 'core',
      condicionamento: 'condicionamento',
    } as Record<Padrao, string>
  )[p]
}

// -----------------------------------------------------------------------------
// Dias da semana
// -----------------------------------------------------------------------------

export const NOMES_DIA: Record<number, string> = { 1: 'segunda', 2: 'terça', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sábado', 7: 'domingo' }
export const SIGLAS_DIA: Record<number, string> = { 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb', 7: 'Dom' }

const DIAS_PADRAO: Record<number, number[]> = { 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6] }

/** Séries de exercícios compostos de pernas no treino. */
const seriesPesadasPernas = (t: TreinoForca) =>
  t.exercicios.filter((x) => GRUPOS_INFERIORES.includes(x.grupo) && EXERCICIO_POR_ID.get(x.exercicio_id)?.tipo !== 'isolado').reduce((s, x) => s + x.series, 0)

export const pernasPesadas = (t: TreinoForca) => seriesPesadasPernas(t) >= 6

/** Dias da semana (1–7) para cada treino, longe da véspera do treino longo quando possível. */
export function distribuirDias(treinos: TreinoForca[], ctx: Pick<ContextoAerobico, 'diaLongao'>): number[] {
  const dias = [...(DIAS_PADRAO[treinos.length] ?? DIAS_PADRAO[3])]
  const longao = ctx.diaLongao
  if (!longao) return dias
  const vespera = longao === 1 ? 7 : longao - 1
  const proibidos = new Set([longao, vespera])
  for (let i = 0; i < treinos.length; i++) {
    if (!pernasPesadas(treinos[i]) || !proibidos.has(dias[i])) continue
    // troca o dia com um treino leve para as pernas que não caia na véspera
    const j = treinos.findIndex((t, k) => k !== i && !pernasPesadas(t) && !proibidos.has(dias[k]))
    if (j >= 0) {
      ;[dias[i], dias[j]] = [dias[j], dias[i]]
      continue
    }
    // senão, usa um dia livre que não seja vizinho de outro treino pesado de pernas
    const livre = [1, 2, 3, 4, 5, 6, 7].find(
      (d) =>
        !dias.includes(d) &&
        !proibidos.has(d) &&
        !treinos.some((t, k) => k !== i && pernasPesadas(t) && Math.abs(dias[k] - d) === 1),
    )
    if (livre) dias[i] = livre
  }
  return dias
}

/** Avisa quando os mesmos grupos grandes caem pesados em dias seguidos. */
export function avisosConsecutivos(treinos: TreinoForca[], dias: number[]): string[] {
  const avisos: string[] = []
  const ordem = treinos.map((t, i) => ({ t, dia: dias[i] })).sort((a, b) => a.dia - b.dia)
  for (let i = 0; i < ordem.length; i++) {
    const a = ordem[i]
    const b = ordem[(i + 1) % ordem.length]
    if (a === b || (b.dia - a.dia + 7) % 7 !== 1) continue
    if (pernasPesadas(a.t) && pernasPesadas(b.t)) {
      avisos.push(`Pernas pesadas em dias seguidos (${SIGLAS_DIA[a.dia]} e ${SIGLAS_DIA[b.dia]}): se possível, separe com um dia de descanso.`)
    }
  }
  return avisos
}

// -----------------------------------------------------------------------------
// Modelo pronto: Full Body de 3 dias
// -----------------------------------------------------------------------------

const px = (id: string, series: number, reps_min: number, reps_max: number, descanso_seg: number): ExercicioPrescrito => {
  const x = EXERCICIO_POR_ID.get(id)!
  return { exercicio_id: id, nome: x.nome, grupo: x.grupo, series, reps_min, reps_max, unidade: x.unidade ?? 'reps', descanso_seg, orientacao: x.orientacao, nivel: x.nivel }
}

/** A rotina Full Body de três dias, exatamente como referência (editável depois). */
export function modeloFullBody3(cfg: ConfigForca): RotinaForcaInput {
  const treinos: TreinoForca[] = [
    {
      letra: 'A',
      nome: 'Força geral',
      foco: 'Corpo inteiro',
      exercicios: [
        px('agachamento_livre', 3, 8, 10, 120),
        px('supino_reto', 3, 8, 12, 90),
        px('remada_baixa', 3, 10, 12, 90),
        px('mesa_flexora', 3, 10, 12, 60),
        px('desenvolvimento_halteres', 3, 10, 12, 60),
        px('prancha', 3, 30, 45, 45),
      ],
    },
    {
      letra: 'B',
      nome: 'Hipertrofia',
      foco: 'Corpo inteiro',
      exercicios: [
        px('leg_press', 3, 10, 12, 90),
        px('supino_inclinado', 3, 10, 12, 90),
        px('puxada_frontal', 3, 10, 12, 90),
        px('terra_romeno', 3, 10, 10, 90),
        px('elevacao_lateral', 3, 12, 15, 60),
        px('rosca_direta', 3, 10, 12, 60),
        px('triceps_pulley', 3, 10, 12, 60),
      ],
    },
    {
      letra: 'C',
      nome: 'Volume e condicionamento',
      foco: 'Corpo inteiro',
      exercicios: [
        px('agachamento_goblet', 3, 12, 12, 60),
        px('cadeira_extensora', 3, 12, 15, 60),
        px('supino_maquina', 3, 10, 12, 60),
        px('remada_unilateral', 3, 10, 12, 60),
        px('elevacao_pelvica', 3, 12, 12, 60),
        px('panturrilha_em_pe', 3, 15, 15, 45),
        px('abdominal_infra', 3, 12, 15, 45),
      ],
    },
  ]
  return {
    ...cfg,
    local: 'academia',
    frequencia: 3,
    foco: 'corpo_inteiro',
    nome: 'Full Body 3 dias (modelo)',
    divisao: 'Full Body ABC',
    dias_semana: [1, 3, 5],
    treinos,
    ativa: true,
  }
}
