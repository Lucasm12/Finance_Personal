/**
 * Estrutura de um treino de endurance — aquecimento, parte principal (séries e intervalos)
 * e desaquecimento: totais de tempo e distância, os passos em sequência e os textos da tela.
 */
import { infoZona, velocidadeDoPasso } from '@/lib/sugestoes/zonas'
import { duracaoCurta } from '@/lib/triathlon'
import type { BlocoTreino, EstruturaTreino, FaseBloco, ModalidadeEndurance, NivelForca, PassoTreino, PerfilAtleta } from '@/types/triathlon'

export const FASES: Record<FaseBloco, string> = {
  aquecimento: 'Aquecimento',
  principal: 'Parte principal',
  desaquecimento: 'Desaquecimento',
}

type Limiares = Pick<PerfilAtleta, 'ftp_w' | 'fc_limiar' | 'pace_limiar_seg_km' | 'css_seg_100m'> | null | undefined
type Base = Pick<EstruturaTreino, 'modalidade' | 'nivel' | 'blocos'>

/** Natação: recuperação por tempo é descanso parado na borda (não soma distância). */
export const parado = (modalidade: ModalidadeEndurance, p: PassoTreino) => modalidade === 'natacao' && p.tipo === 'recuperacao' && !p.distancia_m

/** Tempo do passo: o prescrito ou, se ele é por distância, estimado pela velocidade da zona. */
export function duracaoDoPasso(modalidade: ModalidadeEndurance, p: PassoTreino, perfil: Limiares, nivel: NivelForca): number | null {
  if (p.duracao_seg) return p.duracao_seg
  const v = velocidadeDoPasso(modalidade, p, perfil, nivel)
  return p.distancia_m && v ? p.distancia_m / v : null
}

/** Distância do passo: a prescrita ou estimada pela velocidade da zona (null no pedal por tempo). */
export function distanciaDoPasso(modalidade: ModalidadeEndurance, p: PassoTreino, perfil: Limiares, nivel: NivelForca): number | null {
  if (p.distancia_m) return p.distancia_m
  if (parado(modalidade, p)) return 0
  const v = velocidadeDoPasso(modalidade, p, perfil, nivel)
  return p.duracao_seg && v ? p.duracao_seg * v : null
}

export interface Totais {
  duracao_seg: number
  /** null quando não dá para saber (pedal por tempo) */
  distancia_m: number | null
  /** algo foi estimado pelas zonas (tempo de passo por distância ou distância de passo por tempo) */
  estimado: boolean
}

export function totaisEstrutura(e: Base, perfil: Limiares): Totais {
  let duracao = 0
  let distancia = 0
  let distanciaConhecida = true
  let estimado = false
  for (const b of e.blocos) {
    for (const p of b.passos) {
      const dur = duracaoDoPasso(e.modalidade, p, perfil, e.nivel) ?? 0
      const dist = distanciaDoPasso(e.modalidade, p, perfil, e.nivel)
      if (!p.duracao_seg || (!p.distancia_m && !parado(e.modalidade, p))) estimado = true
      duracao += dur * b.repeticoes
      if (dist === null) distanciaConhecida = false
      else distancia += dist * b.repeticoes
    }
  }
  return { duracao_seg: Math.round(duracao), distancia_m: distanciaConhecida && distancia > 0 ? Math.round(distancia) : null, estimado }
}

/** Tempo por zona (segundos), para comparar com o realizado. */
export function tempoPorZona(e: Base, perfil: Limiares): Record<number, number> {
  const zonas: Record<number, number> = {}
  for (const b of e.blocos) {
    for (const p of b.passos) {
      if (parado(e.modalidade, p)) continue
      const dur = (duracaoDoPasso(e.modalidade, p, perfil, e.nivel) ?? 0) * b.repeticoes
      zonas[p.zona] = (zonas[p.zona] ?? 0) + dur
    }
  }
  return zonas
}

export interface PassoSequencia {
  fase: FaseBloco
  /** índice do bloco na estrutura */
  bloco: number
  /** repetição (1…n) dentro do bloco */
  repeticao: number
  repeticoes: number
  passo: PassoTreino
}

/** Os passos na ordem em que são feitos (6× tiro + recuperação vira 12 passos). */
export function sequencia(blocos: BlocoTreino[]): PassoSequencia[] {
  return blocos.flatMap((b, bloco) =>
    Array.from({ length: Math.max(1, b.repeticoes) }, (_, r) =>
      b.passos.map((passo) => ({ fase: b.fase, bloco, repeticao: r + 1, repeticoes: b.repeticoes, passo })),
    ).flat(),
  )
}

// -----------------------------------------------------------------------------
// Textos
// -----------------------------------------------------------------------------

const km = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const inteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

/** 45 → "45 s" · 150 → "2:30" · 1200 → "20 min" · 5400 → "1h30" */
export function tempoTexto(seg: number): string {
  const s = Math.round(seg)
  if (s < 60) return `${s} s`
  if (s < 3600) return s % 60 === 0 ? `${s / 60} min` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  return duracaoCurta(s)
}

/** 800 → "800 m" · 10000 → "10 km" · natação sempre em metros */
export function distanciaTexto(metros: number, modalidade: ModalidadeEndurance): string {
  if (modalidade === 'natacao' || metros < 1000) return `${inteiro.format(Math.round(metros))} m`
  return `${km.format(metros / 1000)} km`
}

/** "800 m" ou "20 min" */
export function quantidadePasso(p: PassoTreino, modalidade: ModalidadeEndurance): string {
  if (p.distancia_m) return distanciaTexto(p.distancia_m, modalidade)
  if (p.duracao_seg) return tempoTexto(p.duracao_seg)
  return 'livre'
}

/** "800 m Z5" · "20 s descanso" */
export function descreverPasso(p: PassoTreino, modalidade: ModalidadeEndurance): string {
  if (parado(modalidade, p)) return `${quantidadePasso(p, modalidade)} descanso`
  return `${quantidadePasso(p, modalidade)} ${infoZona(p.zona).sigla}`
}

/** "6× (800 m Z5 + 2 min Z1)" · "40 min Z2" */
export function descreverBloco(b: BlocoTreino, modalidade: ModalidadeEndurance): string {
  const passos = b.passos.map((p) => descreverPasso(p, modalidade))
  if (b.repeticoes > 1) return `${b.repeticoes}× ${passos.length > 1 ? `(${passos.join(' + ')})` : passos[0]}`
  return passos.join(' + ')
}

/** Resumo em uma linha, guardado na descrição do treino planejado (aparece no calendário). */
export function resumoEstrutura(e: Pick<EstruturaTreino, 'modalidade' | 'blocos'>): string {
  const porFase = (Object.keys(FASES) as FaseBloco[])
    .map((fase) => {
      const blocos = e.blocos.filter((b) => b.fase === fase)
      return blocos.length ? `${FASES[fase]}: ${blocos.map((b) => descreverBloco(b, e.modalidade)).join(' + ')}` : null
    })
    .filter(Boolean)
  return porFase.join(' · ').slice(0, 2000)
}

// -----------------------------------------------------------------------------
// Ajuste ao tempo disponível
// -----------------------------------------------------------------------------

/**
 * Encaixa o treino no tempo disponível: primeiro tira repetições da parte principal (até 2),
 * depois encurta o que é contínuo na parte principal (até a metade). Devolve null se não couber.
 */
export function ajustarAoTempo(e: Base, perfil: Limiares, limiteSeg: number): BlocoTreino[] | null {
  let blocos = e.blocos.map((b) => ({ ...b, passos: b.passos.map((p) => ({ ...p })) }))
  const total = () => totaisEstrutura({ ...e, blocos }, perfil).duracao_seg
  const folga = limiteSeg * 1.05
  if (total() <= folga) return blocos

  // 1. menos repetições
  for (let mudou = true; mudou && total() > folga; ) {
    mudou = false
    const maior = blocos
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => b.fase === 'principal' && b.repeticoes > 2)
      .sort((x, y) => y.b.repeticoes - x.b.repeticoes)[0]
    if (maior) {
      blocos = blocos.map((b, i) => (i === maior.i ? { ...b, repeticoes: b.repeticoes - 1 } : b))
      mudou = true
    }
  }
  if (total() <= folga) return blocos

  // 2. contínuo mais curto (proporcional, até a metade do original)
  const continuos = blocos.flatMap((b, i) => (b.fase === 'principal' && b.repeticoes === 1 ? [i] : []))
  if (!continuos.length) return null
  const excesso = total() - limiteSeg
  const duracaoContinua = continuos.reduce(
    (s, i) => s + blocos[i].passos.reduce((x, p) => x + (duracaoDoPasso(e.modalidade, p, perfil, e.nivel) ?? 0), 0),
    0,
  )
  const fator = Math.max(0.5, 1 - excesso / Math.max(1, duracaoContinua))
  blocos = blocos.map((b, i) =>
    continuos.includes(i)
      ? {
          ...b,
          passos: b.passos.map((p) => ({
            ...p,
            // tempo de 5 em 5 min; distância de 50 em 50 m (natação) ou de 500 em 500 m
            duracao_seg: p.duracao_seg ? Math.max(300, Math.round((p.duracao_seg * fator) / 300) * 300) : p.duracao_seg,
            distancia_m: p.distancia_m
              ? Math.max(100, Math.round((p.distancia_m * fator) / (e.modalidade === 'natacao' ? 50 : 500)) * (e.modalidade === 'natacao' ? 50 : 500))
              : p.distancia_m,
          })),
        }
      : b,
  )
  return total() <= folga ? blocos : null
}
