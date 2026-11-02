/**
 * Parciais (splits) de um treino: por km na corrida, por volta ou a cada 5 km no pedal,
 * por série, por piscina ou a cada 100 m na natação. Saem das amostras do arquivo
 * (tempo, distância, FC, potência, cadência, altitude) ou das voltas gravadas pelo relógio.
 */
import { ritmoDe, type Ritmo } from '@/lib/triathlon'
import type { Modalidade, ParcialInput, TipoParcial } from '@/types/triathlon'

export interface Amostra {
  /** segundos desde o início */
  t: number
  /** metros acumulados */
  d: number | null
  fc?: number | null
  pot?: number | null
  /** corrida: passos por minuto (as duas pernas) */
  cad?: number | null
  alt?: number | null
}

/** Sem amostras por mais que isso = relógio pausado: o intervalo não conta no tempo da parcial. */
const PAUSA_SEG = 30

/** Parcial calculada pela distância, por modalidade. */
export const PASSO_DISTANCIA: Partial<Record<Modalidade, { tipo: TipoParcial; metros: number }>> = {
  corrida: { tipo: 'km', metros: 1000 },
  ciclismo: { tipo: 'intervalo', metros: 5000 },
  natacao: { tipo: 'intervalo', metros: 100 },
}

/** Ordem das abas na tela de detalhes. */
const ORDEM_TIPOS: Record<Modalidade, TipoParcial[]> = {
  corrida: ['km', 'volta'],
  ciclismo: ['volta', 'intervalo'],
  natacao: ['volta', 'piscina', 'intervalo'],
  forca: ['volta'],
  outro: ['volta', 'km'],
}

export function rotuloTipo(modalidade: Modalidade, tipo: TipoParcial): string {
  if (tipo === 'km') return 'Por km'
  if (tipo === 'piscina') return 'Piscinas'
  if (tipo === 'intervalo') return modalidade === 'natacao' ? 'A cada 100 m' : modalidade === 'ciclismo' ? 'A cada 5 km' : 'Por distância'
  return modalidade === 'natacao' ? 'Séries' : 'Voltas'
}

/** Tipos presentes, na ordem em que fazem sentido para a modalidade. */
export function tiposPresentes(modalidade: Modalidade, parciais: Pick<ParcialInput, 'tipo'>[]): TipoParcial[] {
  const presentes = new Set(parciais.map((p) => p.tipo))
  return ORDEM_TIPOS[modalidade].filter((t) => presentes.has(t)).concat([...presentes].filter((t) => !ORDEM_TIPOS[modalidade].includes(t)))
}

// -----------------------------------------------------------------------------
// Limpeza: tudo o que vai para o banco passa por aqui (faixas iguais às do banco)
// -----------------------------------------------------------------------------

const finito = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const arred = (v: unknown, casas = 0) => (finito(v) ? Number(v.toFixed(casas)) : null)
const entre = (v: unknown, min: number, max: number, casas = 0) => {
  const n = arred(v, casas)
  return n !== null && n >= min && n <= max ? n : null
}

export type ParcialBruta = Partial<Omit<ParcialInput, 'tipo' | 'ordem' | 'duracao_seg'>> & { duracao_seg?: number | null }

export function limparParcial(tipo: TipoParcial, ordem: number, p: ParcialBruta): ParcialInput {
  return {
    tipo,
    ordem,
    duracao_seg: entre(p.duracao_seg, 0, 864000, 1) ?? 0,
    distancia_m: entre(p.distancia_m, 0, 9_999_999, 1),
    fc_media: entre(p.fc_media, 30, 250),
    fc_max: entre(p.fc_max, 30, 250),
    potencia_media: entre(p.potencia_media, 0, 3000),
    cadencia_media: entre(p.cadencia_media, 0, 300, 1),
    elevacao_ganho_m: entre(p.elevacao_ganho_m, 0, 99999, 1),
    elevacao_perda_m: entre(p.elevacao_perda_m, 0, 99999, 1),
    bracadas: entre(p.bracadas, 0, 10000),
    estilo: typeof p.estilo === 'string' && p.estilo.trim() ? p.estilo.trim().slice(0, 40) : null,
    descanso: p.descanso === true,
  }
}

// -----------------------------------------------------------------------------
// Parciais por distância, a partir das amostras
// -----------------------------------------------------------------------------

/** Média móvel de 5 pontos (só dos valores presentes) para tirar o ruído da altitude. */
function suavizar(valores: (number | null)[]): (number | null)[] {
  return valores.map((v, i) => {
    if (v === null) return null
    const janela = valores.slice(Math.max(0, i - 2), i + 3).filter((x): x is number => x !== null)
    return janela.reduce((s, x) => s + x, 0) / janela.length
  })
}

interface Acumulador {
  tempo: number
  dist: number
  fcSoma: number
  fcTempo: number
  fcMax: number
  potSoma: number
  potTempo: number
  cadSoma: number
  cadTempo: number
  ganho: number
  perda: number
  temAltitude: boolean
}

const novo = (): Acumulador => ({ tempo: 0, dist: 0, fcSoma: 0, fcTempo: 0, fcMax: 0, potSoma: 0, potTempo: 0, cadSoma: 0, cadTempo: 0, ganho: 0, perda: 0, temAltitude: false })

function somar(acc: Acumulador, tempo: number, dist: number, a: Amostra) {
  acc.tempo += tempo
  acc.dist += dist
  if (tempo <= 0) return
  if (finito(a.fc) && a.fc > 0) {
    acc.fcSoma += a.fc * tempo
    acc.fcTempo += tempo
    acc.fcMax = Math.max(acc.fcMax, a.fc)
  }
  if (finito(a.pot) && a.pot >= 0) {
    acc.potSoma += a.pot * tempo
    acc.potTempo += tempo
  }
  if (finito(a.cad) && a.cad > 0) {
    acc.cadSoma += a.cad * tempo
    acc.cadTempo += tempo
  }
}

const fechar = (acc: Acumulador, tipo: TipoParcial, ordem: number) =>
  limparParcial(tipo, ordem, {
    duracao_seg: acc.tempo,
    distancia_m: acc.dist,
    fc_media: acc.fcTempo ? acc.fcSoma / acc.fcTempo : null,
    fc_max: acc.fcMax || null,
    potencia_media: acc.potTempo ? acc.potSoma / acc.potTempo : null,
    cadencia_media: acc.cadTempo ? acc.cadSoma / acc.cadTempo : null,
    elevacao_ganho_m: acc.temAltitude ? acc.ganho : null,
    elevacao_perda_m: acc.temAltitude ? acc.perda : null,
  })

/**
 * Divide o treino em parciais de `passo` metros. O instante em que cada marca é cruzada é
 * interpolado entre as duas amostras vizinhas; a última parcial (incompleta) entra se tiver
 * pelo menos 5% do passo.
 */
export function parciaisPorDistancia(amostras: Amostra[], tipo: TipoParcial, passo: number): ParcialInput[] {
  const pts = amostras.filter((a) => finito(a.t) && finito(a.d)).sort((a, b) => a.t - b.t)
  if (pts.length < 2 || passo <= 0) return []
  // a distância nunca diminui (o GPS às vezes "volta" alguns metros)
  let maior = -Infinity
  const ds = pts.map((p) => (maior = Math.max(maior, p.d as number)))
  if (ds.at(-1)! - ds[0] < Math.min(passo * 0.05, 10)) return []
  const alt = suavizar(pts.map((p) => (finito(p.alt) ? p.alt : null)))

  const parciais: ParcialInput[] = []
  let acc = novo()
  let limite = ds[0] + passo
  let refAlt = alt.find((x) => x !== null) ?? null

  for (let i = 1; i < pts.length; i++) {
    const b = pts[i]
    const dt = b.t - pts[i - 1].t
    const tempo = dt > 0 && dt <= PAUSA_SEG ? dt : 0
    const d0 = ds[i - 1]
    const d1 = ds[i]
    const porMetro = d1 > d0 ? tempo / (d1 - d0) : 0
    let inicio = d0
    while (d1 >= limite) {
      somar(acc, (limite - inicio) * porMetro, limite - inicio, b)
      parciais.push(fechar(acc, tipo, parciais.length + 1))
      acc = novo()
      inicio = limite
      limite += passo
    }
    somar(acc, d1 > d0 ? (d1 - inicio) * porMetro : tempo, d1 - inicio, b)

    // subida e descida com histerese de 1 m, na parcial em que a amostra cai
    const a1 = alt[i]
    if (a1 !== null && refAlt !== null) {
      acc.temAltitude = true
      if (a1 - refAlt >= 1) {
        acc.ganho += a1 - refAlt
        refAlt = a1
      } else if (refAlt - a1 >= 1) {
        acc.perda += refAlt - a1
        refAlt = a1
      }
    } else if (a1 !== null) refAlt = a1
  }
  if (acc.dist >= Math.max(passo * 0.05, 1)) parciais.push(fechar(acc, tipo, parciais.length + 1))
  return parciais
}

/**
 * Junta as parciais que valem a pena guardar para a modalidade:
 * corrida por km, pedal a cada 5 km, natação por piscina (ou a cada 100 m em águas abertas),
 * e as voltas do relógio quando há mais de uma.
 */
export function montarParciais(
  modalidade: Modalidade,
  amostras: Amostra[],
  voltas: ParcialInput[] = [],
  piscinas: ParcialInput[] = [],
): ParcialInput[] {
  const lista: ParcialInput[] = []
  const passo = PASSO_DISTANCIA[modalidade]
  const comDistancia = amostras.some((a) => (a.d ?? 0) > 0)
  if (modalidade === 'natacao' && piscinas.length) lista.push(...piscinas)
  else if (passo && comDistancia) lista.push(...parciaisPorDistancia(amostras, passo.tipo, passo.metros))
  if (voltas.length > 1) lista.push(...voltas)
  return lista
}

// -----------------------------------------------------------------------------
// Destaques: parcial mais rápida, mais lenta e média geral
// -----------------------------------------------------------------------------

type ParcialComum = Pick<ParcialInput, 'tipo' | 'ordem' | 'duracao_seg' | 'distancia_m' | 'fc_media' | 'potencia_media' | 'descanso'>

export interface Destaques<P extends ParcialComum> {
  rapida: P | null
  lenta: P | null
  /** quantas parciais entraram na comparação */
  comparadas: number
  media: {
    duracao_seg: number
    distancia_m: number
    ritmo: Ritmo | null
    fc_media: number | null
    potencia_media: number | null
  }
}

const velocidade = (p: ParcialComum) => (p.distancia_m && p.duracao_seg > 0 ? p.distancia_m / p.duracao_seg : 0)

/**
 * Mais rápida e mais lenta pela velocidade (pace), sem as séries de descanso e, nas parciais por
 * distância, sem a última se ela tiver menos de 90% das outras. A média geral é tempo total ÷
 * distância total; FC e potência são ponderadas pelo tempo.
 */
export function destaques<P extends ParcialComum>(parciais: P[], modalidade: Modalidade): Destaques<P> {
  const ativas = parciais.filter((p) => !p.descanso && p.duracao_seg > 0)
  const porDistancia = ativas.some((p) => p.tipo === 'km' || p.tipo === 'intervalo')
  const maiorDist = Math.max(0, ...ativas.map((p) => p.distancia_m ?? 0))
  const comparaveis = ativas.filter((p) => velocidade(p) > 0 && (!porDistancia || (p.distancia_m ?? 0) >= maiorDist * 0.9))

  let rapida: P | null = null
  let lenta: P | null = null
  if (comparaveis.length >= 2) {
    for (const p of comparaveis) {
      if (!rapida || velocidade(p) > velocidade(rapida)) rapida = p
      if (!lenta || velocidade(p) < velocidade(lenta)) lenta = p
    }
  }

  const duracao = ativas.reduce((s, p) => s + p.duracao_seg, 0)
  const distancia = ativas.reduce((s, p) => s + (p.distancia_m ?? 0), 0)
  const ponderada = (campo: 'fc_media' | 'potencia_media') => {
    const com = ativas.filter((p) => p[campo] !== null)
    const tempo = com.reduce((s, p) => s + p.duracao_seg, 0)
    return tempo ? Math.round(com.reduce((s, p) => s + (p[campo] as number) * p.duracao_seg, 0) / tempo) : null
  }
  return {
    rapida,
    lenta,
    comparadas: comparaveis.length,
    media: {
      duracao_seg: duracao,
      distancia_m: distancia,
      ritmo: ritmoDe(modalidade, distancia, duracao),
      fc_media: ponderada('fc_media'),
      potencia_media: ponderada('potencia_media'),
    },
  }
}

/** Ritmo da parcial: pace por km (corrida), por 100 m (natação) ou km/h (pedal). */
export const ritmoParcial = (modalidade: Modalidade, p: Pick<ParcialInput, 'distancia_m' | 'duracao_seg'>) =>
  ritmoDe(modalidade, p.distancia_m, p.duracao_seg)

// -----------------------------------------------------------------------------
// Natação: estilo de nado
// -----------------------------------------------------------------------------

const ESTILOS: Record<string, string> = {
  freestyle: 'Crawl',
  free: 'Crawl',
  backstroke: 'Costas',
  breaststroke: 'Peito',
  butterfly: 'Borboleta',
  drill: 'Educativo',
  mixed: 'Medley',
  im: 'Medley',
  individual_medley: 'Medley',
}

export const traduzirEstilo = (estilo: unknown) =>
  typeof estilo === 'string' && estilo.trim() ? (ESTILOS[estilo.trim().toLowerCase()] ?? estilo.trim().slice(0, 40)) : null
