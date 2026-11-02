/**
 * Atividades realizadas vindas da AI Endurance (running/cycling/swimming_activity_detail_partner).
 * A documentação pública não traz o formato da resposta (ele fica no ReDoc, com login de
 * parceiro), então a leitura aceita os nomes de campo mais comuns e descarta o que não
 * reconhece, avisando quais campos vieram — para ajustar aqui se for preciso.
 */
import { chaveImportacao, type TreinoLido } from '@/lib/importacao/arquivos'
import { limparParcial, montarParciais, traduzirEstilo, type Amostra } from '@/lib/parciais/calculo'
import type { ModalidadeEndurance, ParcialInput } from '@/types/triathlon'

export type Objeto = Record<string, unknown>

export interface AtividadeLida extends TreinoLido {
  origem: 'ai_endurance'
  origem_id: string
}

export const ehObjeto = (v: unknown): v is Objeto => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Primeiro campo presente (aceita "a.b" para campo dentro de objeto). */
function campo(o: Objeto, nomes: string[]): unknown {
  for (const nome of nomes) {
    const v = nome.split('.').reduce<unknown>((x, k) => (ehObjeto(x) ? x[k] : undefined), o)
    if (v !== undefined && v !== null && v !== '') return v
  }
  return undefined
}

/** Número, inclusive "12,5" e "1:02:03" (vira segundos). */
function numero(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (/^\d+(:\d{1,2}){1,2}(\.\d+)?$/.test(t)) return t.split(':').reduce((s, p) => s * 60 + Number(p), 0)
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

const num = (o: Objeto, nomes: string[]) => numero(campo(o, nomes))

/** Data em ISO, epoch em segundos ou em milissegundos. */
function data(v: unknown): Date | null {
  if (typeof v === 'number' && Number.isFinite(v)) return new Date(v < 1e11 ? v * 1000 : v)
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v)
    const d = Number.isFinite(n) && /^\d+$/.test(v.trim()) ? new Date(n < 1e11 ? n * 1000 : n) : new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

const C = {
  id: ['id', 'pk', 'act_id', 'activity_id', 'summary_id'],
  inicio: ['start_time', 'start_date', 'start_date_local', 'startTime', 'start', 'date', 'timestamp', 'start_time_in_seconds', 'created'],
  nome: ['name', 'activity_name', 'title'],
  duracao: ['moving_time', 'duration', 'total_timer_time', 'timer_time', 'duration_s', 'time', 'elapsed_time', 'total_time'],
  total: ['elapsed_time', 'total_elapsed_time', 'total_time'],
  distanciaM: ['distance', 'distance_m', 'total_distance', 'distance_meters'],
  distanciaKm: ['distance_km', 'km'],
  elevacao: ['elevation_gain', 'total_ascent', 'total_elevation_gain', 'ascent', 'elev_gain'],
  fc: ['avg_hr', 'average_heartrate', 'avg_heart_rate', 'average_hr', 'hr_avg', 'heart_rate_avg', 'mean_hr', 'hr'],
  fcMax: ['max_hr', 'max_heartrate', 'max_heart_rate', 'hr_max'],
  potencia: ['avg_power', 'average_watts', 'average_power', 'power_avg', 'mean_power', 'avg_watts', 'power'],
  np: ['normalized_power', 'np', 'weighted_average_watts', 'norm_power'],
  cadencia: ['avg_cadence', 'average_cadence', 'cadence'],
  calorias: ['calories', 'kcal', 'total_calories'],
  bracadas: ['total_strokes', 'strokes', 'stroke_count'],
  estilo: ['swim_stroke', 'stroke', 'stroke_type'],
  voltas: ['laps', 'lap_data', 'splits', 'intervals'],
  piscinas: ['lengths', 'pool_lengths'],
  piscina: ['pool_length', 'pool_length_m'],
}

const inteiroEntre = (v: number | null, a: number, b: number) => (v !== null && v >= a && v <= b ? Math.round(v) : null)

function distancia(o: Objeto): number | null {
  const km = num(o, C.distanciaKm)
  return km !== null ? km * 1000 : num(o, C.distanciaM)
}

/** Séries de amostras ("streams"): arrays de tempo, distância, FC, potência, altitude e cadência. */
function amostras(o: Objeto, corrida: boolean): Amostra[] {
  const s = ehObjeto(o.streams) ? o.streams : ehObjeto(o.stream) ? o.stream : o
  const serie = (nomes: string[]): number[] | null => {
    const v = campo(s, nomes)
    const arr = Array.isArray(v) ? v : ehObjeto(v) && Array.isArray(v.data) ? v.data : null
    return arr ? arr.map((x) => numero(x) ?? NaN) : null
  }
  const tempo = serie(['time', 'times', 'seconds', 'elapsed', 'timestamp'])
  const dist = serie(['distance', 'distances', 'dist'])
  if (!tempo || !dist || tempo.length < 2 || tempo.length !== dist.length) return []
  const fc = serie(['heartrate', 'heart_rate', 'hr'])
  const pot = serie(['watts', 'power'])
  const alt = serie(['altitude', 'elevation', 'alt'])
  const cad = serie(['cadence'])
  const t0 = tempo[0]
  return tempo.map((t, i) => ({
    t: t - t0,
    d: Number.isFinite(dist[i]) ? dist[i] : null,
    fc: fc?.[i] ?? null,
    pot: pot?.[i] ?? null,
    alt: alt?.[i] ?? null,
    cad: cad?.[i] ? (corrida && cad[i] < 120 ? cad[i] * 2 : cad[i]) : null,
  }))
}

function voltas(o: Objeto, modalidade: ModalidadeEndurance): { voltas: ParcialInput[]; piscinas: ParcialInput[] } {
  const natacao = modalidade === 'natacao'
  const lista = (nomes: string[]) => {
    const v = campo(o, nomes)
    return Array.isArray(v) ? v.filter(ehObjeto) : []
  }
  const parcial = (tipo: 'volta' | 'piscina', x: Objeto, i: number, piscina: number | null) => {
    const dist = distancia(x) ?? (tipo === 'piscina' ? piscina : null)
    return limparParcial(tipo, i + 1, {
      duracao_seg: num(x, C.duracao),
      distancia_m: dist,
      fc_media: num(x, C.fc),
      fc_max: num(x, C.fcMax),
      potencia_media: num(x, C.potencia),
      cadencia_media: num(x, C.cadencia),
      elevacao_ganho_m: natacao ? null : num(x, C.elevacao),
      bracadas: natacao ? num(x, C.bracadas) : null,
      estilo: natacao ? traduzirEstilo(campo(x, C.estilo)) : null,
      descanso: natacao && tipo === 'volta' && !dist,
    })
  }
  const piscina = num(o, C.piscina)
  return {
    voltas: lista(C.voltas).map((x, i) => parcial('volta', x, i, piscina)).filter((p) => p.duracao_seg > 0),
    piscinas: natacao ? lista(C.piscinas).map((x, i) => parcial('piscina', x, i, piscina)).filter((p) => p.duracao_seg > 0 && !!p.distancia_m) : [],
  }
}

const NOME_PADRAO: Record<ModalidadeEndurance, string> = { corrida: 'Corrida', ciclismo: 'Pedal', natacao: 'Natação' }

/** Converte uma atividade da AI Endurance. Devolve o motivo (texto) quando não dá para usar. */
export function lerAtividade(bruta: unknown, modalidade: ModalidadeEndurance): AtividadeLida | string {
  if (!ehObjeto(bruta)) return 'item que não é uma atividade'
  const campos = Object.keys(bruta).slice(0, 15).join(', ')
  const inicio = data(campo(bruta, C.inicio))
  const duracao = num(bruta, C.duracao)
  if (!inicio) return `atividade sem data de início (campos recebidos: ${campos})`
  if (!duracao || duracao <= 0) return `atividade sem duração (campos recebidos: ${campos})`

  const corrida = modalidade === 'corrida'
  const { voltas: listaVoltas, piscinas } = voltas(bruta, modalidade)
  const cadencia = num(bruta, C.cadencia)
  const nome = campo(bruta, C.nome)
  const id = campo(bruta, C.id)
  const base = {
    modalidade,
    data_hora: inicio.toISOString(),
  }
  return {
    arquivo: 'AI Endurance',
    origem: 'ai_endurance',
    // os ids podem se repetir entre corrida, pedal e natação: a modalidade entra na chave
    origem_id: typeof id === 'string' || typeof id === 'number' ? `${modalidade}:${String(id).slice(0, 80)}` : chaveImportacao(base),
    ...base,
    tipo_original: typeof bruta.act_type === 'string' ? bruta.act_type.slice(0, 60) : null,
    nome: typeof nome === 'string' && nome.trim() ? nome.trim().slice(0, 120) : `${NOME_PADRAO[modalidade]} ${inicio.toLocaleDateString('pt-BR')}`,
    duracao_seg: Math.round(duracao),
    tempo_total_seg: inteiroEntre(num(bruta, C.total), 1, 864000),
    distancia_m: (() => {
      const d = distancia(bruta)
      return d !== null && d > 0 ? Math.round(d * 10) / 10 : null
    })(),
    elevacao_m: modalidade === 'natacao' ? null : (num(bruta, C.elevacao) ?? null),
    fc_media: inteiroEntre(num(bruta, C.fc), 30, 250),
    fc_max: inteiroEntre(num(bruta, C.fcMax), 30, 250),
    potencia_media: inteiroEntre(num(bruta, C.potencia), 0, 3000),
    potencia_normalizada: inteiroEntre(num(bruta, C.np), 0, 3000),
    cadencia_media: cadencia !== null && cadencia > 0 ? Math.round((corrida && cadencia < 120 ? cadencia * 2 : cadencia) * 10) / 10 : null,
    calorias: inteiroEntre(num(bruta, C.calorias), 0, 50000),
    parciais: montarParciais(modalidade, amostras(bruta, corrida), listaVoltas, piscinas),
  }
}

/** Lista de atividades: aceita array, { results: [...] } ou um objeto só. */
export function listaDe(resposta: unknown): unknown[] {
  if (Array.isArray(resposta)) return resposta
  if (ehObjeto(resposta)) {
    if (Array.isArray(resposta.results)) return resposta.results
    if (Array.isArray(resposta.resultados)) return resposta.resultados
    return [resposta]
  }
  return []
}

export function lerAtividades(resposta: unknown, modalidade: ModalidadeEndurance): { treinos: AtividadeLida[]; avisos: string[] } {
  const treinos: AtividadeLida[] = []
  const motivos = new Map<string, number>()
  for (const item of listaDe(resposta)) {
    const r = lerAtividade(item, modalidade)
    if (typeof r === 'string') motivos.set(r, (motivos.get(r) ?? 0) + 1)
    else treinos.push(r)
  }
  const avisos = [...motivos].map(([motivo, n]) => `${NOME_PADRAO[modalidade]}: ${n} ${n === 1 ? 'atividade ignorada' : 'atividades ignoradas'} — ${motivo}.`)
  const semParciais = treinos.filter((t) => !t.parciais.length).length
  if (semParciais) avisos.push(`${NOME_PADRAO[modalidade]}: ${semParciais} atividade(s) sem parciais (a AI Endurance não enviou voltas nem amostras).`)
  return { treinos, avisos }
}
