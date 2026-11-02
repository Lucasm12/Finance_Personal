/**
 * Planejado × realizado: compara o treino planejado (com a estrutura da sugestão) com o treino
 * importado — totais, passo a passo pelas voltas do relógio (quando o número de voltas bate com
 * o de passos) e tempo em cada zona pelas parciais.
 */
import { distanciaTexto, duracaoDoPasso, descreverPasso, parado, sequencia, tempoPorZona, totaisEstrutura } from '@/lib/sugestoes/estrutura'
import { alvoDoPasso, faixaDoPasso, zonaDaFc, zonaDaFracao } from '@/lib/sugestoes/zonas'
import { cargaTreino, duracaoRelogio, ritmoDe } from '@/lib/triathlon'
import type { EstruturaTreino, FaseBloco, ModalidadeEndurance, Parcial, PassoTreino, PerfilAtleta, Treino, TreinoPlanejado } from '@/types/triathlon'

type Limiares = Pick<PerfilAtleta, 'ftp_w' | 'fc_limiar' | 'pace_limiar_seg_km' | 'css_seg_100m'> | null | undefined
type Medida = Pick<Parcial, 'duracao_seg' | 'distancia_m' | 'potencia_media' | 'fc_media'>

export type Tom = 'bom' | 'alerta' | 'neutro'

export interface LinhaTotal {
  rotulo: string
  planejado: string | null
  realizado: string | null
  diferenca: string | null
  tom: Tom
}

export type Situacao = 'no_alvo' | 'acima' | 'abaixo' | 'sem_dado'

export interface PassoComparado {
  fase: FaseBloco
  /** "800 m Z5" */
  plano: string
  alvo: string | null
  /** "3:12 · 4:00 /km · 168 bpm" */
  realizado: string
  situacao: Situacao
}

export interface ZonaComparada {
  zona: number
  /** segundos */
  planejado: number
  realizado: number
}

export interface ComparacaoPlano {
  totais: LinhaTotal[]
  passos: PassoComparado[] | null
  /** por que não deu para comparar passo a passo */
  semPassos: string | null
  zonas: ZonaComparada[] | null
  /** 0–100: quanto do treino saiu como planejado */
  aderencia: number | null
  /** como a aderência foi calculada */
  base: 'passos' | 'zonas' | null
  observacoes: string[]
}

// -----------------------------------------------------------------------------
// Intensidade do que foi feito
// -----------------------------------------------------------------------------

/** Fração do limiar (potência ÷ FTP, velocidade ÷ velocidade de limiar ou do CSS) e a zona. */
export function intensidadeReal(modalidade: ModalidadeEndurance, p: Medida, perfil: Limiares): { fracao: number | null; zona: number | null } {
  const v = p.distancia_m && p.duracao_seg > 0 ? p.distancia_m / p.duracao_seg : null
  let fracao: number | null = null
  if (modalidade === 'ciclismo' && p.potencia_media && perfil?.ftp_w) fracao = p.potencia_media / perfil.ftp_w
  if (modalidade === 'corrida' && v && perfil?.pace_limiar_seg_km) fracao = v / (1000 / perfil.pace_limiar_seg_km)
  if (modalidade === 'natacao' && v && perfil?.css_seg_100m) fracao = v / (100 / perfil.css_seg_100m)
  if (fracao !== null) return { fracao, zona: zonaDaFracao(modalidade, fracao) }
  if (modalidade !== 'natacao' && p.fc_media && perfil?.fc_limiar) return { fracao: null, zona: zonaDaFc(p.fc_media, perfil.fc_limiar) }
  return { fracao: null, zona: null }
}

const TOLERANCIA = 0.03

/** O passo foi feito no alvo? Alvo absoluto (AI Endurance) > faixa do passo > zona. */
export function situacaoDoPasso(modalidade: ModalidadeEndurance, passo: PassoTreino, feito: Medida, perfil: Limiares): Situacao {
  const comparar = (valor: number, [de, ate]: [number | null, number | null]): Situacao => {
    if (de !== null && valor < de * (1 - TOLERANCIA)) return passo.tipo === 'recuperacao' ? 'no_alvo' : 'abaixo'
    if (ate !== null && valor > ate * (1 + TOLERANCIA)) return 'acima'
    return 'no_alvo'
  }
  const v = feito.distancia_m && feito.duracao_seg > 0 ? feito.distancia_m / feito.duracao_seg : null
  if (passo.alvo?.potencia && feito.potencia_media) return comparar(feito.potencia_media, passo.alvo.potencia)
  if (passo.alvo?.velocidade && v) return comparar(v, passo.alvo.velocidade)

  const real = intensidadeReal(modalidade, feito, perfil)
  if (real.fracao !== null) return comparar(real.fracao, faixaDoPasso(modalidade, passo))
  if (real.zona === null) return 'sem_dado'
  if (real.zona === passo.zona || (passo.tipo === 'recuperacao' && real.zona < passo.zona)) return 'no_alvo'
  return real.zona > passo.zona ? 'acima' : 'abaixo'
}

function textoRealizado(modalidade: ModalidadeEndurance, p: Medida): string {
  const ritmo = ritmoDe(modalidade, p.distancia_m, p.duracao_seg)
  return [
    duracaoRelogio(p.duracao_seg),
    p.distancia_m ? distanciaTexto(p.distancia_m, modalidade) : null,
    ritmo ? `${ritmo.texto} ${ritmo.unidade}` : null,
    p.potencia_media ? `${p.potencia_media} W` : null,
    p.fc_media ? `${p.fc_media} bpm` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

// -----------------------------------------------------------------------------
// Carga planejada (mesma fórmula da carga dos treinos: horas × intensidade² × 100)
// -----------------------------------------------------------------------------

export function cargaPlanejada(e: Pick<EstruturaTreino, 'modalidade' | 'nivel' | 'blocos'>, perfil: Limiares): number {
  let carga = 0
  for (const b of e.blocos) {
    for (const p of b.passos) {
      if (parado(e.modalidade, p)) continue
      const horas = ((duracaoDoPasso(e.modalidade, p, perfil, e.nivel) ?? 0) * b.repeticoes) / 3600
      let fi = (faixaDoPasso(e.modalidade, p)[0] + faixaDoPasso(e.modalidade, p)[1]) / 2
      const pot = p.alvo?.potencia
      if (pot && perfil?.ftp_w && (pot[0] || pot[1])) fi = (pot[0] && pot[1] ? (pot[0] + pot[1]) / 2 : (pot[0] ?? pot[1])!) / perfil.ftp_w
      carga += horas * Math.min(Math.max(fi, 0.3), 1.5) ** (e.modalidade === 'natacao' ? 3 : 2) * 100
    }
  }
  return Math.round(carga)
}

// -----------------------------------------------------------------------------
// Comparação
// -----------------------------------------------------------------------------

const pct = (real: number, plano: number) => (real - plano) / plano

function linha(rotulo: string, plano: number | null, real: number | null, formatar: (n: number) => string, toleravel = 0.1): LinhaTotal {
  if (!plano || real === null) return { rotulo, planejado: plano ? formatar(plano) : null, realizado: real !== null ? formatar(real) : null, diferenca: null, tom: 'neutro' }
  const d = pct(real, plano)
  return {
    rotulo,
    planejado: formatar(plano),
    realizado: formatar(real),
    diferenca: `${d >= 0 ? '+' : '−'}${Math.round(Math.abs(d) * 100)}%`,
    tom: Math.abs(d) <= toleravel ? 'bom' : 'alerta',
  }
}

/** Parciais usadas para o tempo em cada zona: as mais finas que houver. */
const PREFERENCIA: Record<ModalidadeEndurance, Parcial['tipo'][]> = {
  corrida: ['km', 'volta'],
  ciclismo: ['intervalo', 'volta'],
  natacao: ['piscina', 'intervalo', 'volta'],
}

export function compararPlano(
  planejado: Pick<TreinoPlanejado, 'estrutura' | 'distancia_planejada_m' | 'duracao_planejada_seg'>,
  treino: Treino,
  parciais: Parcial[],
  perfil: Limiares,
): ComparacaoPlano | null {
  const e = planejado.estrutura
  if (!e) return null
  const m = e.modalidade
  const totais = totaisEstrutura(e, perfil)
  const observacoes: string[] = []

  const linhas: LinhaTotal[] = [
    linha('Duração', planejado.duracao_planejada_seg ?? totais.duracao_seg, treino.duracao_seg, duracaoRelogio),
    linha('Distância', planejado.distancia_planejada_m ?? totais.distancia_m, treino.distancia_m, (n) => distanciaTexto(n, m)),
    linha('Carga', cargaPlanejada(e, perfil), cargaTreino(treino, perfil).valor, (n) => String(Math.round(n)), 0.15),
  ].filter((l) => l.planejado || l.realizado)

  // passo a passo: precisa de uma volta do relógio por passo do plano
  const passos = sequencia(e.blocos)
  const voltas = parciais.filter((p) => p.tipo === 'volta').sort((a, b) => a.ordem - b.ordem)
  let comparados: PassoComparado[] | null = null
  let semPassos: string | null = null
  let alinhados: { passo: PassoTreino; fase: FaseBloco; volta: Parcial }[] | null = null
  if (voltas.length === passos.length) alinhados = passos.map((s, i) => ({ passo: s.passo, fase: s.fase, volta: voltas[i] }))
  else if (m === 'natacao') {
    // natação: o relógio às vezes não grava o descanso como volta
    const nadados = passos.filter((s) => !parado(m, s.passo))
    const ativas = voltas.filter((v) => !v.descanso)
    if (nadados.length === ativas.length && ativas.length) alinhados = nadados.map((s, i) => ({ passo: s.passo, fase: s.fase, volta: ativas[i] }))
  }
  if (alinhados) {
    comparados = alinhados.map(({ passo, fase, volta }) => ({
      fase,
      plano: descreverPasso(passo, m),
      alvo: parado(m, passo) ? null : alvoDoPasso(m, passo, perfil).principal,
      realizado: textoRealizado(m, volta),
      situacao: parado(m, passo) ? 'no_alvo' : situacaoDoPasso(m, passo, volta, perfil),
    }))
  } else {
    semPassos = voltas.length
      ? `O relógio gravou ${voltas.length} volta(s) e o plano tem ${passos.length} passo(s). Para comparar passo a passo, marque uma volta a cada passo (ou use o treino estruturado no relógio).`
      : 'O treino não tem voltas gravadas pelo relógio; a comparação usa as parciais por distância.'
  }

  // tempo em cada zona: planejado (estrutura) × realizado (parciais classificadas)
  const tipo = PREFERENCIA[m].find((t) => parciais.some((p) => p.tipo === t))
  const finas = tipo ? parciais.filter((p) => p.tipo === tipo && !p.descanso) : []
  const realPorZona: Record<number, number> = {}
  let classificadas = 0
  for (const p of finas) {
    const z = intensidadeReal(m, p, perfil).zona
    if (z === null) continue
    realPorZona[z] = (realPorZona[z] ?? 0) + p.duracao_seg
    classificadas++
  }
  let zonas: ZonaComparada[] | null = null
  if (classificadas) {
    const planoPorZona = tempoPorZona(e, perfil)
    zonas = [1, 2, 3, 4, 5, 6]
      .map((zona) => ({ zona, planejado: Math.round(planoPorZona[zona] ?? 0), realizado: Math.round(realPorZona[zona] ?? 0) }))
      .filter((z) => z.planejado || z.realizado)
  } else if (finas.length) {
    const falta = { corrida: 'pace de limiar', ciclismo: 'FTP', natacao: 'CSS' }[m]
    observacoes.push(`Para comparar a intensidade, cadastre ${falta}${m === 'natacao' ? '' : ' ou FC de limiar'} no Perfil do atleta.`)
  } else observacoes.push('O treino não tem parciais: dá para comparar só os totais.')

  // aderência: passos no alvo (pesados pelo tempo planejado) ou sobreposição das zonas
  let aderencia: number | null = null
  let base: ComparacaoPlano['base'] = null
  if (alinhados && comparados) {
    let total = 0
    let certo = 0
    alinhados.forEach(({ passo }, i) => {
      if (parado(m, passo) || comparados![i].situacao === 'sem_dado') return
      const peso = duracaoDoPasso(m, passo, perfil, e.nivel) ?? 60
      total += peso
      if (comparados![i].situacao === 'no_alvo') certo += peso
    })
    if (total) {
      aderencia = Math.round((certo / total) * 100)
      base = 'passos'
    }
  }
  if (aderencia === null && zonas) {
    const somaP = zonas.reduce((s, z) => s + z.planejado, 0)
    const somaR = zonas.reduce((s, z) => s + z.realizado, 0)
    if (somaP && somaR) {
      aderencia = Math.round(zonas.reduce((s, z) => s + Math.min(z.planejado / somaP, z.realizado / somaR), 0) * 100)
      base = 'zonas'
    }
  }
  if (totais.estimado && (!planejado.duracao_planejada_seg || !planejado.distancia_planejada_m))
    observacoes.push('Parte do planejado (tempo ou distância) foi estimada pelas zonas do seu perfil.')

  return { totais: linhas, passos: comparados, semPassos, zonas, aderencia, base, observacoes }
}
