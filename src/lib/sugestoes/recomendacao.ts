/**
 * Sugestão de treinos de corrida, ciclismo e natação. Nada é sorteado: os treinos saem do
 * catálogo, filtrados por modalidade, objetivo e nível, encaixados no tempo disponível e
 * ordenados pelo que o histórico recomenda (fadiga, último treino intenso, último longo).
 */
import { CATALOGO, OBJETIVOS_ENDURANCE, type ModeloEndurance } from '@/lib/sugestoes/catalogo'
import { ajustarAoTempo, totaisEstrutura } from '@/lib/sugestoes/estrutura'
import { temLimiar } from '@/lib/sugestoes/zonas'
import { cargaTreino, dataLocal, diasEntre, serieForma, somarDias } from '@/lib/triathlon'
import type { EstruturaTreino, ModalidadeEndurance, NivelForca, ObjetivoEndurance, PerfilAtleta, Treino } from '@/types/triathlon'

export interface ConfigEndurance {
  modalidade: ModalidadeEndurance
  objetivo: ObjetivoEndurance | 'automatico'
  nivel: NivelForca
  /** minutos disponíveis */
  tempo_min: number
}

export const CONFIG_ENDURANCE_PADRAO: ConfigEndurance = { modalidade: 'corrida', objetivo: 'automatico', nivel: 'intermediario', tempo_min: 60 }

export interface ContextoEndurance {
  /** forma de hoje (condicionamento − fadiga); null sem treinos */
  forma: number | null
  /** dias desde o último treino intenso na modalidade (intensidade ≥ 90% do limiar) */
  diasDesdeIntenso: number | null
  /** dias desde o último treino longo na modalidade */
  diasDesdeLongo: number | null
  /** médias semanais das últimas 4 semanas na modalidade */
  semanal: { distancia_m: number; sessoes: number; horas: number }
}

/** Longo: corrida ≥ 75 min, pedal ≥ 2 h, natação ≥ 2.500 m. */
const ehLongo = (t: Treino) =>
  t.modalidade === 'corrida' ? t.duracao_seg >= 75 * 60 : t.modalidade === 'ciclismo' ? t.duracao_seg >= 2 * 3600 : (t.distancia_m ?? 0) >= 2500

export function contextoEndurance(treinos: Treino[], perfil: PerfilAtleta | null | undefined, modalidade: ModalidadeEndurance, hoje = dataLocal(new Date())): ContextoEndurance {
  const recentes = treinos.filter((t) => dataLocal(t.data_hora) <= hoje)
  const daModalidade = recentes.filter((t) => t.modalidade === modalidade).sort((a, b) => b.data_hora.localeCompare(a.data_hora))
  const dias = (t: Treino | undefined) => (t ? diasEntre(dataLocal(t.data_hora), hoje) : null)
  const forma = recentes.length ? (serieForma(recentes, perfil, hoje, hoje).at(-1)?.tsb ?? null) : null
  const ultimas4 = daModalidade.filter((t) => dataLocal(t.data_hora) >= somarDias(hoje, -27))
  return {
    forma: forma === null ? null : Math.round(forma),
    diasDesdeIntenso: dias(daModalidade.find((t) => cargaTreino(t, perfil).intensidade >= 0.9)),
    diasDesdeLongo: dias(daModalidade.find(ehLongo)),
    semanal: {
      distancia_m: ultimas4.reduce((s, t) => s + (t.distancia_m ?? 0), 0) / 4,
      sessoes: ultimas4.length / 4,
      horas: ultimas4.reduce((s, t) => s + t.duracao_seg, 0) / 3600 / 4,
    },
  }
}

export interface Sugestao {
  modelo: ModeloEndurance
  estrutura: EstruturaTreino
  duracao_seg: number
  distancia_m: number | null
  /** distância/tempo estimados pelas zonas */
  estimado: boolean
  /** foi encurtado para caber no tempo */
  ajustado: boolean
  recomendada: boolean
}

export interface ResultadoSugestao {
  sugestoes: Sugestao[]
  motivos: string[]
  avisos: string[]
}

const NOME: Record<ModalidadeEndurance, string> = { corrida: 'corrida', ciclismo: 'pedal', natacao: 'natação' }

/** Ordem dos objetivos no modo automático, com o porquê. */
function prioridades(cfg: ConfigEndurance, ctx: ContextoEndurance): { ordem: ObjetivoEndurance[]; motivo: string } {
  if (ctx.forma !== null && ctx.forma < -25)
    return { ordem: ['recuperacao', 'tecnica', 'resistencia'], motivo: `Sua forma está em ${ctx.forma} (fadiga alta): hoje o melhor é recuperar.` }
  if (ctx.diasDesdeIntenso !== null && ctx.diasDesdeIntenso < 2)
    return {
      ordem: ['resistencia', 'tecnica', 'recuperacao'],
      motivo: `Você fez um treino intenso de ${NOME[cfg.modalidade]} há menos de 48 h: hoje, volume leve.`,
    }
  if ((ctx.diasDesdeLongo === null || ctx.diasDesdeLongo >= 7) && cfg.tempo_min >= 75)
    return { ordem: ['resistencia', 'limiar', 'velocidade'], motivo: 'Faz uma semana ou mais sem um treino longo e hoje há tempo para ele.' }
  return {
    ordem: cfg.nivel === 'iniciante' && cfg.modalidade === 'natacao' ? ['tecnica', 'resistencia', 'limiar'] : ['limiar', 'velocidade', 'subidas', 'resistencia', 'tecnica'],
    motivo: ctx.forma !== null && ctx.forma > 5 ? 'Você está descansado: bom dia para um treino de qualidade.' : 'Sem fadiga acumulada: dá para um treino de qualidade.',
  }
}

const TEMPO_MINIMO = (m: ModeloEndurance) => (m.longo ? '; um treino longo precisa de mais tempo' : '')

export function sugerirTreinos(cfg: ConfigEndurance, ctx: ContextoEndurance, perfil: PerfilAtleta | null | undefined): ResultadoSugestao {
  const motivos: string[] = []
  const avisos: string[] = []
  const candidatos = CATALOGO.filter((m) => m.modalidade === cfg.modalidade && m.niveis.includes(cfg.nivel))

  let ordem: ObjetivoEndurance[]
  if (cfg.objetivo === 'automatico') {
    const p = prioridades(cfg, ctx)
    ordem = p.ordem
    motivos.push(p.motivo)
  } else {
    ordem = [cfg.objetivo]
    if (ctx.forma !== null && ctx.forma < -25 && cfg.objetivo !== 'recuperacao') avisos.push(`Sua forma está em ${ctx.forma} (fadiga alta). Considere um treino de recuperação.`)
    const modelo = candidatos.find((m) => m.objetivo === cfg.objetivo)
    if (modelo?.intenso && ctx.diasDesdeIntenso !== null && ctx.diasDesdeIntenso < 2) avisos.push('Treino intenso há menos de 48 h nesta modalidade: avalie se já recuperou.')
  }

  const lista: Sugestao[] = []
  const naoCouberam: string[] = []
  for (const modelo of candidatos) {
    if (!ordem.includes(modelo.objetivo)) continue
    if (cfg.objetivo === 'automatico' && modelo.intenso && ctx.diasDesdeIntenso !== null && ctx.diasDesdeIntenso < 2) continue
    if (cfg.objetivo === 'automatico' && modelo.longo && ctx.diasDesdeLongo !== null && ctx.diasDesdeLongo < 5) continue
    const base = { modalidade: cfg.modalidade, nivel: cfg.nivel, blocos: modelo.montar(cfg.nivel) }
    const original = totaisEstrutura(base, perfil).duracao_seg
    const blocos = ajustarAoTempo(base, perfil, cfg.tempo_min * 60)
    if (!blocos) {
      naoCouberam.push(`${modelo.nome} (~${Math.round(original / 60)} min${TEMPO_MINIMO(modelo)})`)
      continue
    }
    const estrutura: EstruturaTreino = { ...base, blocos, objetivo: modelo.objetivo, fonte: 'catalogo', referencia: modelo.id }
    const totais = totaisEstrutura(estrutura, perfil)
    lista.push({ modelo, estrutura, ...totais, ajustado: totais.duracao_seg < original - 60, recomendada: false })
  }

  // ordena pela prioridade do objetivo; no mesmo objetivo, o que melhor aproveita o tempo
  lista.sort(
    (a, b) =>
      ordem.indexOf(a.modelo.objetivo) - ordem.indexOf(b.modelo.objetivo) ||
      Math.abs(cfg.tempo_min * 60 - a.duracao_seg) - Math.abs(cfg.tempo_min * 60 - b.duracao_seg),
  )
  const sugestoes = lista.slice(0, 4)
  if (sugestoes[0]) sugestoes[0].recomendada = true

  if (!sugestoes.length) {
    avisos.push(
      cfg.objetivo === 'automatico'
        ? 'Nenhum treino do catálogo cabe nesse tempo. Aumente o tempo disponível.'
        : `Nenhum treino de ${OBJETIVOS_ENDURANCE[cfg.objetivo].toLowerCase()} cabe em ${cfg.tempo_min} min para o seu nível.`,
    )
  }
  if (naoCouberam.length && sugestoes.length < 4) motivos.push(`Não couberam em ${cfg.tempo_min} min: ${naoCouberam.join(', ')}.`)
  if (!temLimiar(cfg.modalidade, perfil)) {
    const falta = { corrida: 'pace de limiar', ciclismo: 'FTP', natacao: 'CSS' }[cfg.modalidade]
    avisos.push(`Sem ${falta} no Perfil do atleta: os alvos ficam por zona${cfg.modalidade === 'natacao' ? '' : ', FC'} e percepção de esforço (PSE).`)
  }
  return { sugestoes, motivos, avisos }
}
