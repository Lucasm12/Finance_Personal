/**
 * Leitura de arquivos de treino no navegador:
 *   .fit (Garmin, Wahoo, TrainingPeaks), .tcx, .gpx,
 *   .csv (resumo de treinos exportado pelo TrainingPeaks),
 *   .zip / .gz com esses arquivos (exportações em lote do TrainingPeaks e do Strava).
 */
import type { Modalidade, TreinoInput } from '@/types/triathlon'

export type TreinoLido = Omit<TreinoInput, 'origem' | 'origem_id' | 'esforco_percebido' | 'observacao' | 'dados'> & {
  /** arquivo de onde veio (para mostrar na prévia) */
  arquivo: string
}

export interface ResultadoLeitura {
  treinos: TreinoLido[]
  avisos: string[]
}

// -----------------------------------------------------------------------------
// Utilidades
// -----------------------------------------------------------------------------

export function modalidadePorNome(texto: string | null | undefined): Modalidade | null {
  const t = (texto ?? '').toLowerCase()
  if (!t) return null
  if (/swim|nata/.test(t)) return 'natacao'
  if (/bik|cycl|ride|ciclis|pedal|mtb|spin/.test(t)) return 'ciclismo'
  if (/run|corr|trail/.test(t)) return 'corrida'
  if (/strength|weight|for[cç]a|muscula|gym/.test(t)) return 'forca'
  return 'outro'
}

const numero = (v: string | null | undefined) => {
  if (v === null || v === undefined || v.trim() === '') return null
  const n = Number(v.trim().replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const arred = (v: number | null | undefined, casas = 0) =>
  v === null || v === undefined || !Number.isFinite(v) ? null : Number(v.toFixed(casas))
const inteiroEntre = (v: number | null | undefined, min: number, max: number) => {
  const n = arred(v)
  return n !== null && n >= min && n <= max ? n : null
}

function distanciaHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371008.8
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** Ganho de elevação com suavização (média de 5 pontos) e limiar de 1 m para ignorar ruído. */
function ganhoElevacao(altitudes: number[]): number | null {
  if (altitudes.length < 2) return null
  const suave = altitudes.map((_, i) => {
    const janela = altitudes.slice(Math.max(0, i - 2), i + 3)
    return janela.reduce((s, x) => s + x, 0) / janela.length
  })
  let ganho = 0
  let referencia = suave[0]
  for (const alt of suave) {
    if (alt - referencia >= 1) {
      ganho += alt - referencia
      referencia = alt
    } else if (alt < referencia) {
      referencia = alt
    }
  }
  return arred(ganho, 1)
}

const media = (valores: number[]) => (valores.length ? valores.reduce((s, x) => s + x, 0) / valores.length : null)

/** Busca elementos pelo nome local, ignorando namespaces (gpxtpx:hr, ns3:Watts...). */
const porNome = (raiz: Element | Document, nome: string) =>
  Array.from(raiz.getElementsByTagNameNS('*', nome))
const textoDe = (raiz: Element | Document, nome: string) => porNome(raiz, nome)[0]?.textContent?.trim() ?? null

function lerXml(texto: string): Document {
  const doc = new DOMParser().parseFromString(texto, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('arquivo XML inválido')
  return doc
}

function treinoBase(arquivo: string, modalidade: Modalidade, nome: string, inicio: Date, duracao: number): TreinoLido {
  return {
    arquivo,
    modalidade,
    tipo_original: null,
    nome,
    data_hora: inicio.toISOString(),
    duracao_seg: Math.max(1, Math.round(duracao)),
    tempo_total_seg: null,
    distancia_m: null,
    elevacao_m: null,
    fc_media: null,
    fc_max: null,
    potencia_media: null,
    potencia_normalizada: null,
    cadencia_media: null,
    calorias: null,
  }
}

const nomePadrao = (modalidade: Modalidade, inicio: Date) =>
  `${{ natacao: 'Natação', ciclismo: 'Pedal', corrida: 'Corrida', forca: 'Academia', outro: 'Treino' }[modalidade]} ${inicio.toLocaleDateString('pt-BR')}`

// -----------------------------------------------------------------------------
// GPX
// -----------------------------------------------------------------------------

export function lerGpx(texto: string, arquivo = 'arquivo.gpx'): TreinoLido[] {
  const doc = lerXml(texto)
  const pontos = porNome(doc, 'trkpt')
    .map((p) => ({
      lat: Number(p.getAttribute('lat')),
      lon: Number(p.getAttribute('lon')),
      ele: numero(textoDe(p, 'ele')),
      tempo: textoDe(p, 'time') ? Date.parse(textoDe(p, 'time')!) : NaN,
      fc: numero(textoDe(p, 'hr')),
      cad: numero(textoDe(p, 'cad')),
      pot: numero(textoDe(p, 'power')) ?? numero(textoDe(p, 'PowerInWatts')),
    }))
    .filter((p) => Number.isFinite(p.tempo))
  if (pontos.length < 2) throw new Error('GPX sem pontos com horário')

  let distancia = 0
  let emMovimento = 0
  for (let i = 1; i < pontos.length; i++) {
    const a = pontos[i - 1]
    const b = pontos[i]
    const d = Number.isFinite(a.lat) && Number.isFinite(b.lat) ? distanciaHaversine(a.lat, a.lon, b.lat, b.lon) : 0
    const dt = (b.tempo - a.tempo) / 1000
    distancia += d
    // conta como movimento intervalos curtos com velocidade acima de 0,5 m/s
    if (dt > 0 && dt <= 60 && d / dt > 0.5) emMovimento += dt
  }
  const inicio = new Date(pontos[0].tempo)
  const total = (pontos.at(-1)!.tempo - pontos[0].tempo) / 1000
  const tipo = textoDe(doc, 'type')
  const modalidade = modalidadePorNome(tipo) ?? 'outro'
  const fcs = pontos.map((p) => p.fc).filter((x): x is number => x !== null && x > 0)
  const cads = pontos.map((p) => p.cad).filter((x): x is number => x !== null && x > 0)
  const pots = pontos.map((p) => p.pot).filter((x): x is number => x !== null)

  return [
    {
      ...treinoBase(arquivo, modalidade, textoDe(doc, 'name') ?? nomePadrao(modalidade, inicio), inicio, emMovimento || total),
      tipo_original: tipo,
      tempo_total_seg: inteiroEntre(total, 1, 864000),
      distancia_m: arred(distancia, 1),
      elevacao_m: ganhoElevacao(pontos.map((p) => p.ele).filter((x): x is number => x !== null)),
      fc_media: inteiroEntre(media(fcs), 30, 250),
      fc_max: inteiroEntre(fcs.length ? Math.max(...fcs) : null, 30, 250),
      cadencia_media: arred(media(cads), 1),
      potencia_media: inteiroEntre(media(pots), 0, 3000),
    },
  ]
}

// -----------------------------------------------------------------------------
// TCX
// -----------------------------------------------------------------------------

export function lerTcx(texto: string, arquivo = 'arquivo.tcx'): TreinoLido[] {
  const doc = lerXml(texto)
  return porNome(doc, 'Activity').map((atividade) => {
    const voltas = porNome(atividade, 'Lap')
    const inicio = new Date(textoDe(atividade, 'Id') ?? voltas[0]?.getAttribute('StartTime') ?? '')
    if (Number.isNaN(inicio.getTime())) throw new Error('TCX sem data de início')
    const esporte = atividade.getAttribute('Sport')
    const modalidade = modalidadePorNome(esporte) ?? 'outro'

    let tempo = 0
    let distancia = 0
    let calorias = 0
    let fcPonderada = 0
    let fcMax = 0
    for (const volta of voltas) {
      const t = numero(textoDe(volta, 'TotalTimeSeconds')) ?? 0
      tempo += t
      distancia += numero(textoDe(volta, 'DistanceMeters')) ?? 0
      calorias += numero(textoDe(volta, 'Calories')) ?? 0
      const fcMedia = numero(porNome(volta, 'AverageHeartRateBpm')[0]?.textContent)
      if (fcMedia) fcPonderada += fcMedia * t
      fcMax = Math.max(fcMax, numero(porNome(volta, 'MaximumHeartRateBpm')[0]?.textContent) ?? 0)
    }
    const pontos = porNome(atividade, 'Trackpoint')
    const altitudes = pontos.map((p) => numero(textoDe(p, 'AltitudeMeters'))).filter((x): x is number => x !== null)
    const potencias = pontos.map((p) => numero(textoDe(p, 'Watts'))).filter((x): x is number => x !== null)
    const cadencias = pontos
      .map((p) => numero(textoDe(p, 'Cadence')) ?? numero(textoDe(p, 'RunCadence')))
      .filter((x): x is number => x !== null && x > 0)
    const tempos = pontos.map((p) => Date.parse(textoDe(p, 'Time') ?? '')).filter(Number.isFinite)
    const total = tempos.length > 1 ? (tempos.at(-1)! - tempos[0]) / 1000 : null

    return {
      ...treinoBase(arquivo, modalidade, textoDe(atividade, 'Notes') ?? nomePadrao(modalidade, inicio), inicio, tempo || total || 1),
      tipo_original: esporte,
      tempo_total_seg: inteiroEntre(total, 1, 864000),
      distancia_m: distancia > 0 ? arred(distancia, 1) : null,
      elevacao_m: ganhoElevacao(altitudes),
      fc_media: inteiroEntre(tempo ? fcPonderada / tempo : null, 30, 250),
      fc_max: inteiroEntre(fcMax || null, 30, 250),
      potencia_media: inteiroEntre(media(potencias), 0, 3000),
      cadencia_media: arred(media(cadencias), 1),
      calorias: inteiroEntre(calorias || null, 0, 50000),
    }
  })
}

// -----------------------------------------------------------------------------
// FIT (SDK oficial da Garmin, carregado só quando necessário)
// -----------------------------------------------------------------------------

interface SessaoFit {
  sport?: string
  subSport?: string
  startTime?: Date
  totalTimerTime?: number
  totalElapsedTime?: number
  totalDistance?: number
  totalAscent?: number
  avgHeartRate?: number
  maxHeartRate?: number
  avgPower?: number
  normalizedPower?: number
  avgCadence?: number
  totalCalories?: number
}

export async function lerFit(bytes: Uint8Array, arquivo = 'arquivo.fit'): Promise<TreinoLido[]> {
  const { Decoder, Stream } = await import('@garmin/fitsdk')
  const decoder = new Decoder(Stream.fromByteArray(bytes))
  if (!decoder.isFIT()) throw new Error('não é um arquivo FIT')
  const { messages, errors } = decoder.read({ convertDateTimesToDates: true, convertTypesToStrings: true })
  const sessoes = (messages.sessionMesgs ?? []) as unknown as SessaoFit[]
  if (!sessoes.length) throw new Error(errors?.[0]?.message ?? 'FIT sem resumo de atividade')

  const multiesporte = sessoes.length > 1
  return sessoes
    .filter((s) => s.sport !== 'transition' && s.startTime)
    .map((s) => {
      const modalidade = modalidadePorNome(s.sport === 'training' ? 'strength' : s.sport) ?? 'outro'
      const inicio = new Date(s.startTime!)
      const nome = multiesporte
        ? `${nomePadrao(modalidade, inicio)} (prova/treino multiesporte)`
        : nomePadrao(modalidade, inicio)
      return {
        ...treinoBase(arquivo, modalidade, nome, inicio, s.totalTimerTime ?? s.totalElapsedTime ?? 1),
        tipo_original: [s.sport, s.subSport].filter(Boolean).join('/') || null,
        tempo_total_seg: inteiroEntre(s.totalElapsedTime, 1, 864000),
        distancia_m: s.totalDistance ? arred(s.totalDistance, 1) : null,
        elevacao_m: s.totalAscent ? arred(s.totalAscent, 1) : null,
        fc_media: inteiroEntre(s.avgHeartRate, 30, 250),
        fc_max: inteiroEntre(s.maxHeartRate, 30, 250),
        potencia_media: inteiroEntre(s.avgPower, 0, 3000),
        potencia_normalizada: inteiroEntre(s.normalizedPower, 0, 3000),
        // corrida: o FIT registra passos de uma perna; o padrão de mercado é por minuto (as duas)
        cadencia_media: s.avgCadence ? arred(modalidade === 'corrida' ? s.avgCadence * 2 : s.avgCadence, 1) : null,
        calorias: inteiroEntre(s.totalCalories, 0, 50000),
      }
    })
}

// -----------------------------------------------------------------------------
// CSV do TrainingPeaks (Configurações → Exportar dados → resumo de treinos)
// -----------------------------------------------------------------------------

export function lerCsv(texto: string): string[][] {
  const linhas: string[][] = []
  let campo = ''
  let linha: string[] = []
  let aspas = false
  const sep = (texto.split('\n')[0].match(/;/g)?.length ?? 0) > (texto.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ','
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"'
        i++
      } else if (c === '"') aspas = false
      else campo += c
    } else if (c === '"') aspas = true
    else if (c === sep) {
      linha.push(campo)
      campo = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++
      linha.push(campo)
      if (linha.some((x) => x.trim() !== '')) linhas.push(linha)
      linha = []
      campo = ''
    } else campo += c
  }
  linha.push(campo)
  if (linha.some((x) => x.trim() !== '')) linhas.push(linha)
  return linhas
}

export function lerCsvTrainingPeaks(texto: string, arquivo = 'treinos.csv'): ResultadoLeitura {
  const [cabecalho, ...linhas] = lerCsv(texto.replace(/^﻿/, ''))
  const indice = new Map(cabecalho.map((c, i) => [c.trim().toLowerCase(), i]))
  const col = (linha: string[], ...nomes: string[]) => {
    for (const n of nomes) {
      const i = indice.get(n.toLowerCase())
      if (i !== undefined && linha[i]?.trim()) return linha[i].trim()
    }
    return null
  }
  if (!indice.has('workoutday') || !indice.has('timetotalinhours')) {
    throw new Error('CSV não reconhecido: esperado o resumo de treinos do TrainingPeaks (colunas WorkoutDay e TimeTotalInHours).')
  }

  const treinos: TreinoLido[] = []
  let planejados = 0
  for (const l of linhas) {
    const horas = numero(col(l, 'TimeTotalInHours'))
    const dia = col(l, 'WorkoutDay')
    if (!horas || horas <= 0 || !dia) {
      planejados++
      continue
    }
    const [a, m, d] = dia.slice(0, 10).split('-').map(Number)
    const inicio = new Date(a, m - 1, d, 12, 0, 0) // o CSV não traz o horário: meio-dia local
    const tipo = col(l, 'WorkoutType')
    const modalidade = modalidadePorNome(tipo) ?? 'outro'
    const energiaKj = numero(col(l, 'Energy'))
    treinos.push({
      ...treinoBase(arquivo, modalidade, col(l, 'Title') ?? nomePadrao(modalidade, inicio), inicio, horas * 3600),
      tipo_original: tipo,
      distancia_m: arred(numero(col(l, 'DistanceInMeters')), 1),
      elevacao_m: arred(numero(col(l, 'ElevationGain', 'ElevationGainInMeters')), 1),
      fc_media: inteiroEntre(numero(col(l, 'HeartRateAverage')), 30, 250),
      fc_max: inteiroEntre(numero(col(l, 'HeartRateMax')), 30, 250),
      potencia_media: inteiroEntre(numero(col(l, 'PowerAverage')), 0, 3000),
      cadencia_media: arred(numero(col(l, 'CadenceAverage')), 1),
      // energia em kJ: no ciclismo, kJ ≈ kcal gastas
      calorias: inteiroEntre(energiaKj, 0, 50000),
    })
  }
  const avisos = planejados ? [`${planejados} linha(s) sem tempo realizado (treinos só planejados) foram ignoradas.`] : []
  return { treinos, avisos }
}

// -----------------------------------------------------------------------------
// Entrada principal: aceita vários arquivos, inclusive .zip e .gz
// -----------------------------------------------------------------------------

// Limites contra arquivos que explodem ao descompactar (zip bomb) e travariam o navegador
export const LIMITES = {
  arquivo: 300 * 1024 * 1024,
  gzDescompactado: 200 * 1024 * 1024,
  zipDescompactado: 600 * 1024 * 1024,
  zipArquivos: 5000,
}

/** Tamanho descompactado declarado no fim do .gz (ISIZE, módulo 4 GB). */
export function tamanhoGz(bytes: Uint8Array): number {
  if (bytes.length < 18) return 0
  const n = bytes.length
  return (bytes[n - 4] | (bytes[n - 3] << 8) | (bytes[n - 2] << 16) | (bytes[n - 1] << 24)) >>> 0
}

/** Confere o conteúdo declarado de um .zip antes de descompactar. Devolve o erro, se houver. */
export function conferirZip(entradas: { originalSize: number }[]): string | null {
  if (entradas.length > LIMITES.zipArquivos) return `tem mais de ${LIMITES.zipArquivos} arquivos; divida em partes menores`
  const total = entradas.reduce((s, e) => s + e.originalSize, 0)
  if (total > LIMITES.zipDescompactado) return 'descompactado passaria de 600 MB; divida em partes menores'
  return null
}

async function lerConteudo(nome: string, bytes: Uint8Array): Promise<ResultadoLeitura> {
  const minusculo = nome.toLowerCase()
  if (minusculo.endsWith('.gz')) {
    if (tamanhoGz(bytes) > LIMITES.gzDescompactado || bytes.length > LIMITES.gzDescompactado) throw new Error('arquivo .gz grande demais (mais de 200 MB descompactado)')
    const { gunzipSync } = await import('fflate')
    return lerConteudo(nome.slice(0, -3), gunzipSync(bytes))
  }
  if (minusculo.endsWith('.zip')) {
    const { unzipSync } = await import('fflate')
    const aceitos: { originalSize: number }[] = []
    const arquivos = unzipSync(bytes, {
      filter: (f) => {
        if (!/\.(fit|tcx|gpx|csv)(\.gz)?$/i.test(f.name) || f.name.includes('__MACOSX')) return false
        aceitos.push(f)
        // o filtro roda antes de descompactar: para tudo se o total declarado já passou do limite
        const problema = conferirZip(aceitos)
        if (problema) throw new Error(problema)
        return true
      },
    })
    const resultado: ResultadoLeitura = { treinos: [], avisos: [] }
    for (const [interno, conteudo] of Object.entries(arquivos)) {
      try {
        const r = await lerConteudo(interno.split('/').pop()!, conteudo)
        resultado.treinos.push(...r.treinos)
        resultado.avisos.push(...r.avisos)
      } catch (e) {
        resultado.avisos.push(`${interno}: ${e instanceof Error ? e.message : 'não foi possível ler'}`)
      }
    }
    if (!Object.keys(arquivos).length) resultado.avisos.push(`${nome}: nenhum arquivo .fit, .tcx, .gpx ou .csv dentro do .zip`)
    return resultado
  }
  const texto = () => new TextDecoder().decode(bytes)
  if (minusculo.endsWith('.fit')) return { treinos: await lerFit(bytes, nome), avisos: [] }
  if (minusculo.endsWith('.tcx')) return { treinos: lerTcx(texto().trim(), nome), avisos: [] }
  if (minusculo.endsWith('.gpx')) return { treinos: lerGpx(texto(), nome), avisos: [] }
  if (minusculo.endsWith('.csv')) return lerCsvTrainingPeaks(texto(), nome)
  throw new Error('formato não suportado (use .fit, .tcx, .gpx, .csv ou .zip)')
}

export async function lerArquivos(arquivos: File[]): Promise<ResultadoLeitura> {
  const resultado: ResultadoLeitura = { treinos: [], avisos: [] }
  for (const arquivo of arquivos) {
    try {
      if (arquivo.size > LIMITES.arquivo) throw new Error('arquivo maior que 300 MB')
      const r = await lerConteudo(arquivo.name, new Uint8Array(await arquivo.arrayBuffer()))
      resultado.treinos.push(...r.treinos)
      resultado.avisos.push(...r.avisos)
    } catch (e) {
      resultado.avisos.push(`${arquivo.name}: ${e instanceof Error ? e.message : 'não foi possível ler'}`)
    }
  }
  resultado.treinos.sort((a, b) => a.data_hora.localeCompare(b.data_hora))
  return resultado
}

/** Chave estável para não importar o mesmo treino duas vezes. */
export const chaveImportacao = (t: Pick<TreinoLido, 'modalidade' | 'data_hora'>) =>
  `${t.modalidade}:${Math.round(Date.parse(t.data_hora) / 60000)}`
