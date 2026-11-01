import { ActivityIcon, BikeIcon, DumbbellIcon, FootprintsIcon, WavesIcon, type LucideIcon } from 'lucide-react'

import { PALETA } from '@/lib/cores'
import type { Modalidade, PerfilAtleta, Pesagem, TipoProva, Treino } from '@/types/triathlon'

// -----------------------------------------------------------------------------
// Modalidades
// -----------------------------------------------------------------------------

export interface InfoModalidade {
  nome: string
  /** cor no tema claro (o tema escuro ajusta com useTema().cor) */
  cor: string
  icone: LucideIcon
}

export const MODALIDADES: Record<Modalidade, InfoModalidade> = {
  natacao: { nome: 'Natação', cor: PALETA[0].claro, icone: WavesIcon },
  ciclismo: { nome: 'Ciclismo', cor: PALETA[1].claro, icone: BikeIcon },
  corrida: { nome: 'Corrida', cor: PALETA[2].claro, icone: FootprintsIcon },
  forca: { nome: 'Academia', cor: PALETA[3].claro, icone: DumbbellIcon },
  outro: { nome: 'Outro', cor: PALETA[8].claro, icone: ActivityIcon },
}

export const ORDEM_MODALIDADES: Modalidade[] = ['natacao', 'ciclismo', 'corrida', 'forca', 'outro']
export const MODALIDADES_TRI: Modalidade[] = ['natacao', 'ciclismo', 'corrida']

// -----------------------------------------------------------------------------
// Formatação
// -----------------------------------------------------------------------------

const dois = (n: number) => String(n).padStart(2, '0')

/** 3725 → "1h02" · 2700 → "45min" */
export function duracaoCurta(seg: number): string {
  const total = Math.round(seg / 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m}min`
  return `${h}h${dois(m)}`
}

/** 3725 → "1:02:05" · 1505 → "25:05" */
export function duracaoRelogio(seg: number): string {
  const s = Math.round(seg)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  return h > 0 ? `${h}:${dois(m)}:${dois(r)}` : `${m}:${dois(r)}`
}

/** "1:02:05", "25:05" ou "45" (minutos) → segundos. null se inválido. */
export function lerDuracao(texto: string): number | null {
  const partes = texto.trim().split(':').map((p) => p.trim())
  if (partes.some((p) => !/^\d+$/.test(p))) return null
  const n = partes.map(Number)
  let seg: number
  if (n.length === 1) seg = n[0] * 60
  else if (n.length === 2) seg = n[0] * 60 + n[1]
  else if (n.length === 3) seg = n[0] * 3600 + n[1] * 60 + n[2]
  else return null
  if (n.length >= 2 && n.at(-1)! >= 60) return null
  return seg > 0 ? seg : null
}

const km1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const km2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const inteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const decimal1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export const formatarInteiro = (n: number) => inteiro.format(n)
export const formatarDecimal = (n: number) => decimal1.format(n)

/** Natação em metros; o resto em km. */
export function formatarDistancia(metros: number | null, modalidade: Modalidade): string {
  if (metros === null || metros <= 0) return '—'
  if (modalidade === 'natacao') return `${inteiro.format(metros)} m`
  const km = metros / 1000
  return `${km < 10 ? km2.format(km) : km1.format(km)} km`
}

/** Segundos por unidade → "5:12" */
export function formatarPace(segundos: number): string {
  const s = Math.round(segundos)
  return `${Math.floor(s / 60)}:${dois(s % 60)}`
}

export interface Ritmo {
  /** corrida: seg/km · natação: seg/100 m · ciclismo: km/h */
  valor: number
  texto: string
  unidade: string
}

/** Ritmo de um esforço contínuo: pace (corrida/natação) ou velocidade (ciclismo). */
export function ritmoDe(modalidade: Modalidade, distanciaM: number | null, duracaoSeg: number): Ritmo | null {
  if (!distanciaM || distanciaM <= 0 || duracaoSeg <= 0) return null
  if (modalidade === 'natacao') {
    const valor = duracaoSeg / (distanciaM / 100)
    return { valor, texto: formatarPace(valor), unidade: '/100 m' }
  }
  if (modalidade === 'ciclismo') {
    const valor = distanciaM / 1000 / (duracaoSeg / 3600)
    return { valor, texto: decimal1.format(valor), unidade: 'km/h' }
  }
  if (modalidade === 'corrida' || modalidade === 'outro') {
    const valor = duracaoSeg / (distanciaM / 1000)
    if (valor > 30 * 60) return null // mais lento que 30 min/km não é ritmo útil
    return { valor, texto: formatarPace(valor), unidade: '/km' }
  }
  return null
}

export const ritmoTreino = (t: Pick<Treino, 'modalidade' | 'distancia_m' | 'duracao_seg'>) =>
  ritmoDe(t.modalidade, t.distancia_m, t.duracao_seg)

// -----------------------------------------------------------------------------
// Datas (no fuso do navegador)
// -----------------------------------------------------------------------------

export function dataLocal(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`
}

export function somarDias(data: string, dias: number): string {
  const [a, m, d] = data.split('-').map(Number)
  return dataLocal(new Date(a, m - 1, d + dias))
}

export function diasEntre(de: string, ate: string): number {
  const [a1, m1, d1] = de.split('-').map(Number)
  const [a2, m2, d2] = ate.split('-').map(Number)
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000)
}

/** Segunda-feira da semana da data. */
export function inicioSemana(data: string): string {
  const [a, m, d] = data.split('-').map(Number)
  const dia = new Date(a, m - 1, d).getDay() // 0 = domingo
  return somarDias(data, -((dia + 6) % 7))
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
/** "2026-10-27" → "27/out" */
export function diaMesCurto(data: string): string {
  const [, m, d] = data.split('-').map(Number)
  return `${d}/${MESES[m - 1]}`
}

// -----------------------------------------------------------------------------
// Carga de treino (estilo TSS) e condicionamento/fadiga/forma
// -----------------------------------------------------------------------------

export type MetodoCarga = 'potência' | 'pace' | 'CSS' | 'frequência cardíaca' | 'esforço percebido' | 'estimada'

export interface Carga {
  valor: number
  metodo: MetodoCarga
  /** fator de intensidade (1 = limiar) */
  intensidade: number
}

type Limiares = Pick<PerfilAtleta, 'ftp_w' | 'fc_limiar' | 'pace_limiar_seg_km' | 'css_seg_100m'> | null | undefined

const limitar = (fi: number) => Math.min(Math.max(fi, 0.3), 1.5)

/**
 * Carga ≈ horas × FI² × 100 (natação usa FI³). O FI vem, em ordem de preferência,
 * da potência (FTP), do pace (limiar), do CSS, da FC (FC de limiar) ou do esforço percebido.
 */
export function cargaTreino(
  t: Pick<Treino, 'modalidade' | 'duracao_seg' | 'distancia_m' | 'potencia_media' | 'potencia_normalizada' | 'fc_media' | 'esforco_percebido'>,
  limiares: Limiares,
): Carga {
  const horas = t.duracao_seg / 3600
  const resultado = (fi: number, metodo: MetodoCarga, expoente = 2): Carga => {
    const intensidade = limitar(fi)
    return { valor: Math.round(horas * intensidade ** expoente * 100), metodo, intensidade }
  }
  const potencia = t.potencia_normalizada ?? t.potencia_media
  if (t.modalidade === 'ciclismo' && potencia && limiares?.ftp_w) {
    return resultado(potencia / limiares.ftp_w, 'potência')
  }
  if (t.modalidade === 'corrida' && t.distancia_m && limiares?.pace_limiar_seg_km) {
    const velocidade = t.distancia_m / t.duracao_seg
    return resultado(velocidade / (1000 / limiares.pace_limiar_seg_km), 'pace')
  }
  if (t.modalidade === 'natacao' && t.distancia_m && limiares?.css_seg_100m) {
    const velocidade = t.distancia_m / t.duracao_seg
    return resultado(velocidade / (100 / limiares.css_seg_100m), 'CSS', 3)
  }
  if (t.fc_media && limiares?.fc_limiar) return resultado(t.fc_media / limiares.fc_limiar, 'frequência cardíaca')
  if (t.esforco_percebido) return resultado(0.45 + t.esforco_percebido * 0.06, 'esforço percebido')
  return resultado(t.modalidade === 'forca' ? 0.65 : 0.72, 'estimada')
}

export interface DiaForma {
  data: string
  carga: number
  /** condicionamento (média de 42 dias) */
  ctl: number
  /** fadiga (média de 7 dias) */
  atl: number
  /** forma = condicionamento − fadiga do dia anterior */
  tsb: number
}

/** Série diária de condicionamento/fadiga/forma de `inicio` até `fim` (inclusive). */
export function serieForma(treinos: Treino[], limiares: Limiares, inicio: string, fim: string): DiaForma[] {
  const cargaPorDia = new Map<string, number>()
  let primeiro = inicio
  for (const t of treinos) {
    const dia = dataLocal(t.data_hora)
    cargaPorDia.set(dia, (cargaPorDia.get(dia) ?? 0) + cargaTreino(t, limiares).valor)
    if (dia < primeiro) primeiro = dia
  }
  const serie: DiaForma[] = []
  let ctl = 0
  let atl = 0
  for (let dia = primeiro; dia <= fim; dia = somarDias(dia, 1)) {
    const carga = cargaPorDia.get(dia) ?? 0
    const tsb = ctl - atl
    ctl += (carga - ctl) / 42
    atl += (carga - atl) / 7
    if (dia >= inicio) serie.push({ data: dia, carga, ctl, atl, tsb })
  }
  return serie
}

export interface LeituraForma {
  rotulo: string
  descricao: string
  tom: 'bom' | 'neutro' | 'alerta' | 'perigo'
}

export function lerForma(tsb: number): LeituraForma {
  if (tsb > 15) return { rotulo: 'Descansado', descricao: 'Bem recuperado — bom para prova ou teste.', tom: 'bom' }
  if (tsb > 5) return { rotulo: 'Fresco', descricao: 'Pronto para treinos fortes.', tom: 'bom' }
  if (tsb >= -10) return { rotulo: 'Neutro', descricao: 'Equilíbrio entre treino e recuperação.', tom: 'neutro' }
  if (tsb >= -30) return { rotulo: 'Construindo', descricao: 'Fadiga produtiva: o condicionamento está subindo.', tom: 'alerta' }
  return { rotulo: 'Sobrecarga', descricao: 'Fadiga alta. Considere dias leves para recuperar.', tom: 'perigo' }
}

// -----------------------------------------------------------------------------
// Agregações
// -----------------------------------------------------------------------------

export interface TotaisModalidade {
  quantidade: number
  duracao: number
  distancia: number
  carga: number
}

export function totaisPorModalidade(treinos: Treino[], limiares: Limiares) {
  const totais = Object.fromEntries(
    ORDEM_MODALIDADES.map((m) => [m, { quantidade: 0, duracao: 0, distancia: 0, carga: 0 }]),
  ) as Record<Modalidade, TotaisModalidade>
  for (const t of treinos) {
    const x = totais[t.modalidade]
    x.quantidade++
    x.duracao += t.duracao_seg
    x.distancia += t.distancia_m ?? 0
    x.carga += cargaTreino(t, limiares).valor
  }
  return totais
}

export interface Semana {
  inicio: string
  horas: Record<Modalidade, number>
  distancia: Record<Modalidade, number>
  horasTotal: number
  carga: number
  /** ritmo médio ponderado pela distância (corrida/natação: seg/unidade; ciclismo: km/h) */
  ritmo: Partial<Record<Modalidade, number>>
  quantidade: number
}

/** Últimas `quantidade` semanas (segunda a domingo) terminando na semana de `ate`. */
export function semanas(treinos: Treino[], limiares: Limiares, quantidade: number, ate: string): Semana[] {
  const ultima = inicioSemana(ate)
  const lista: Semana[] = Array.from({ length: quantidade }, (_, i) => ({
    inicio: somarDias(ultima, -7 * (quantidade - 1 - i)),
    horas: { natacao: 0, ciclismo: 0, corrida: 0, forca: 0, outro: 0 },
    distancia: { natacao: 0, ciclismo: 0, corrida: 0, forca: 0, outro: 0 },
    horasTotal: 0,
    carga: 0,
    ritmo: {},
    quantidade: 0,
  }))
  const porInicio = new Map(lista.map((s) => [s.inicio, s]))
  const tempoComDistancia = new Map<string, Record<string, number>>()

  for (const t of treinos) {
    const s = porInicio.get(inicioSemana(dataLocal(t.data_hora)))
    if (!s) continue
    const horas = t.duracao_seg / 3600
    s.horas[t.modalidade] += horas
    s.horasTotal += horas
    s.distancia[t.modalidade] += t.distancia_m ?? 0
    s.carga += cargaTreino(t, limiares).valor
    s.quantidade++
    if (t.distancia_m && ritmoTreino(t)) {
      const acc = tempoComDistancia.get(s.inicio) ?? {}
      acc[`${t.modalidade}:t`] = (acc[`${t.modalidade}:t`] ?? 0) + t.duracao_seg
      acc[`${t.modalidade}:d`] = (acc[`${t.modalidade}:d`] ?? 0) + t.distancia_m
      tempoComDistancia.set(s.inicio, acc)
    }
  }

  for (const s of lista) {
    const acc = tempoComDistancia.get(s.inicio)
    if (!acc) continue
    for (const m of MODALIDADES_TRI) {
      const tempo = acc[`${m}:t`]
      const dist = acc[`${m}:d`]
      if (tempo && dist) s.ritmo[m] = ritmoDe(m, dist, tempo)?.valor
    }
  }
  return lista
}

export interface Recorde {
  rotulo: string
  valor: string
  treino: Treino
}

export function recordes(treinos: Treino[]): Recorde[] {
  const lista: Recorde[] = []
  const maior = (filtro: (t: Treino) => boolean, valor: (t: Treino) => number) =>
    treinos.filter(filtro).reduce<Treino | null>((melhor, t) => (!melhor || valor(t) > valor(melhor) ? t : melhor), null)

  const maisLongo: Record<string, string> = {
    natacao: 'Natação mais longa',
    ciclismo: 'Pedal mais longo',
    corrida: 'Corrida mais longa',
  }
  for (const m of MODALIDADES_TRI) {
    const t = maior((x) => x.modalidade === m && (x.distancia_m ?? 0) > 0, (x) => x.distancia_m ?? 0)
    if (t) lista.push({ rotulo: maisLongo[m], valor: formatarDistancia(t.distancia_m, m), treino: t })
  }
  const pace = (minimoM: number) =>
    maior(
      (x) => x.modalidade === 'corrida' && (x.distancia_m ?? 0) >= minimoM,
      (x) => -(ritmoTreino(x)?.valor ?? Infinity),
    )
  for (const [minimo, rotulo] of [
    [5000, 'Melhor pace (5 km ou mais)'],
    [21000, 'Melhor pace (meia ou mais)'],
  ] as const) {
    const t = pace(minimo)
    if (t) lista.push({ rotulo, valor: `${ritmoTreino(t)!.texto} /km`, treino: t })
  }
  const pedal = maior(
    (x) => x.modalidade === 'ciclismo' && (x.distancia_m ?? 0) >= 40000,
    (x) => ritmoTreino(x)?.valor ?? 0,
  )
  if (pedal) lista.push({ rotulo: 'Pedal mais rápido (40 km ou mais)', valor: `${ritmoTreino(pedal)!.texto} km/h`, treino: pedal })
  const nado = maior(
    (x) => x.modalidade === 'natacao' && (x.distancia_m ?? 0) >= 1000,
    (x) => -(ritmoTreino(x)?.valor ?? Infinity),
  )
  if (nado) lista.push({ rotulo: 'Melhor ritmo na natação (1 km ou mais)', valor: `${ritmoTreino(nado)!.texto} /100 m`, treino: nado })
  return lista
}

// -----------------------------------------------------------------------------
// Peso e nutrição
// -----------------------------------------------------------------------------

/** Média móvel de `janela` dias (só considera pesagens dentro da janela). */
export function mediaMovelPeso(pesagens: Pesagem[], janela = 7): { data: string; peso: number; media: number }[] {
  const ordenadas = [...pesagens].sort((a, b) => a.data.localeCompare(b.data))
  return ordenadas.map((p) => {
    const inicio = somarDias(p.data, -(janela - 1))
    const janelaPesos = ordenadas.filter((x) => x.data >= inicio && x.data <= p.data)
    const media = janelaPesos.reduce((s, x) => s + x.peso_kg, 0) / janelaPesos.length
    return { data: p.data, peso: p.peso_kg, media: Math.round(media * 100) / 100 }
  })
}

/** Peso mais recente até (e incluindo) uma data. */
export function pesoEm(pesagens: Pesagem[], data: string): number | null {
  let melhor: Pesagem | null = null
  for (const p of pesagens) if (p.data <= data && (!melhor || p.data > melhor.data)) melhor = p
  return melhor?.peso_kg ?? null
}

export function idade(dataNascimento: string | null, hoje = dataLocal(new Date())): number | null {
  if (!dataNascimento) return null
  const [a, m, d] = dataNascimento.split('-').map(Number)
  const [ah, mh, dh] = hoje.split('-').map(Number)
  return ah - a - (mh < m || (mh === m && dh < d) ? 1 : 0)
}

/** Taxa metabólica basal (Mifflin-St Jeor). */
export function taxaBasal(perfil: PerfilAtleta | null | undefined, pesoKg: number | null): number | null {
  const anos = idade(perfil?.data_nascimento ?? null)
  if (!perfil?.sexo || !perfil.altura_cm || !pesoKg || anos === null) return null
  return Math.round(10 * pesoKg + 6.25 * perfil.altura_cm - 5 * anos + (perfil.sexo === 'M' ? 5 : -161))
}

/** Correlação de Pearson (null com menos de 4 pares). */
export function correlacao(pares: [number, number][]): number | null {
  if (pares.length < 4) return null
  const n = pares.length
  const mx = pares.reduce((s, p) => s + p[0], 0) / n
  const my = pares.reduce((s, p) => s + p[1], 0) / n
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (const [x, y] of pares) {
    sxy += (x - mx) * (y - my)
    sxx += (x - mx) ** 2
    syy += (y - my) ** 2
  }
  if (sxx === 0 || syy === 0) return null
  return sxy / Math.sqrt(sxx * syy)
}

// -----------------------------------------------------------------------------
// Provas
// -----------------------------------------------------------------------------

export const TIPOS_PROVA: Record<TipoProva, { nome: string; natacao_m?: number; ciclismo_km?: number; corrida_km?: number }> = {
  sprint: { nome: 'Triathlon Sprint', natacao_m: 750, ciclismo_km: 20, corrida_km: 5 },
  olimpico: { nome: 'Triathlon Olímpico', natacao_m: 1500, ciclismo_km: 40, corrida_km: 10 },
  meio_ironman: { nome: 'Meio Ironman (70.3)', natacao_m: 1900, ciclismo_km: 90, corrida_km: 21.1 },
  ironman: { nome: 'Ironman', natacao_m: 3800, ciclismo_km: 180, corrida_km: 42.2 },
  duathlon: { nome: 'Duathlon', ciclismo_km: 40, corrida_km: 15 },
  corrida: { nome: 'Corrida', corrida_km: 10 },
  ciclismo: { nome: 'Ciclismo', ciclismo_km: 100 },
  natacao: { nome: 'Águas abertas', natacao_m: 3000 },
  outro: { nome: 'Outra' },
}

export interface Fase {
  nome: string
  descricao: string
}

/** Fase sugerida de preparação conforme os dias até a prova. */
export function fasePreparacao(dias: number): Fase {
  if (dias < 0) return { nome: 'Concluída', descricao: 'Prova realizada.' }
  if (dias <= 7) return { nome: 'Semana da prova', descricao: 'Volume baixo, alguns estímulos curtos e descanso.' }
  if (dias <= 21) return { nome: 'Polimento', descricao: 'Reduza o volume mantendo a intensidade para chegar descansado.' }
  if (dias <= 56) return { nome: 'Específico', descricao: 'Treinos no ritmo de prova e simulações (brick).' }
  if (dias <= 112) return { nome: 'Construção', descricao: 'Aumente intensidade e volume de forma progressiva.' }
  return { nome: 'Base', descricao: 'Volume aeróbico, técnica e força.' }
}
