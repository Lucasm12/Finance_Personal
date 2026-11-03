/**
 * Exportação de um treino planejado (corrida, pedal ou natação) para o relógio Garmin, como
 * arquivo .FIT de treino (file type "workout"): cada passo com duração (tempo ou distância),
 * intensidade (aquecimento, esforço, recuperação, descanso, desaquecimento) e alvo
 * (ritmo, potência ou FC), e as séries como passo de repetição ("6× tiro + recuperação").
 *
 * O arquivo vai para a pasta GARMIN/NewFiles do relógio (cabo USB) e aparece em Treinos.
 * Formato: FIT SDK, mensagens file_id, workout e workout_step.
 */
import type { FileIdMesg, WorkoutMesg, WorkoutStepMesg } from '@garmin/fitsdk'

import { FASES, parado } from '@/lib/sugestoes/estrutura'
import { alvoDoPasso, faixaDoPasso, infoZona, ZONAS_FC } from '@/lib/sugestoes/zonas'
import { normalizar } from '@/lib/texto'
import type { Faixa, FaseBloco, ModalidadeEndurance, PassoTreino, PerfilAtleta, TreinoPlanejado } from '@/types/triathlon'

type Limiares = Pick<PerfilAtleta, 'ftp_w' | 'fc_limiar' | 'pace_limiar_seg_km' | 'css_seg_100m'> | null | undefined

export type TreinoParaExportar = Pick<
  TreinoPlanejado,
  'data' | 'nome' | 'modalidade' | 'descricao' | 'estrutura' | 'distancia_planejada_m' | 'duracao_planejada_seg'
>

export type DuracaoGarmin = { tipo: 'tempo'; seg: number } | { tipo: 'distancia'; m: number } | { tipo: 'livre' }

/** Alvo do passo no relógio: um só (o FIT tem um alvo principal). Faixas sempre [menor, maior]. */
export type AlvoGarmin =
  | { tipo: 'velocidade'; faixa: [number, number] } // m/s
  | { tipo: 'potencia'; faixa: [number, number] } // W
  | { tipo: 'fc'; faixa: [number, number] } // bpm
  | { tipo: 'estilo'; estilo: 'crawl' | 'educativo' }
  | null

export type IntensidadeGarmin = 'warmup' | 'active' | 'recovery' | 'rest' | 'cooldown'

export interface PassoGarmin {
  nome: string
  intensidade: IntensidadeGarmin
  duracao: DuracaoGarmin
  alvo: AlvoGarmin
  /** zona, ritmo, FC e PSE em texto (o relógio mostra junto do passo) */
  notas: string | null
}

/** Passos feitos em sequência; com vezes > 1, a sequência se repete. */
export interface GrupoGarmin {
  vezes: number
  passos: PassoGarmin[]
}

export interface TreinoGarmin {
  nome: string
  descricao: string | null
  modalidade: ModalidadeEndurance
  /** natação: tamanho da piscina */
  piscina_m: number | null
  grupos: GrupoGarmin[]
}

export const ehEndurance = (m: string): m is ModalidadeEndurance => m === 'corrida' || m === 'ciclismo' || m === 'natacao'

// -----------------------------------------------------------------------------
// Texto para o relógio
// -----------------------------------------------------------------------------

/**
 * Texto que o relógio consegue mostrar: troca símbolos fora do Latin-1 (×, –, ₂, ·) e tira o
 * resto que não tem na fonte do relógio; acentos do português ficam.
 */
export function textoRelogio(texto: string, max: number): string {
  const limpo = texto
    .normalize('NFC')
    .replace(/×/g, 'x')
    .replace(/[–—]/g, '-')
    .replace(/₂/g, '2')
    .replace(/\s*·\s*/g, ' - ')
    .replace(/[^ -~ -ÿ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return limpo.length > max ? limpo.slice(0, max).trimEnd() : limpo
}

const maiuscula = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t)

/** "2026-11-05" → "05/11" */
const diaMes = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}`

/** "2026-11-05-intervalado-6x800-m.fit" */
export function nomeArquivoFit(t: Pick<TreinoParaExportar, 'data' | 'nome'>): string {
  const slug = normalizar(t.nome.replace(/×/g, 'x'))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '')
  return `${t.data}-${slug || 'treino'}.fit`
}

// -----------------------------------------------------------------------------
// Do planejado para os passos do relógio
// -----------------------------------------------------------------------------

const faixaCompleta = (f: Faixa | null | undefined): [number, number] | null =>
  f && f[0] && f[1] ? [Math.min(f[0], f[1]), Math.max(f[0], f[1])] : null

/**
 * Alvo numérico do passo, na ordem de preferência: o alvo absoluto do treino (AI Endurance),
 * o da zona pelo limiar do perfil (pace de limiar ou FTP), a FC pela FC de limiar e, na natação,
 * o estilo. Sem nada disso, o passo fica sem alvo (só a duração).
 */
export function alvoGarmin(modalidade: ModalidadeEndurance, p: PassoTreino, perfil: Limiares): AlvoGarmin {
  if (parado(modalidade, p)) return null
  const [de, ate] = faixaDoPasso(modalidade, p)

  if (modalidade === 'ciclismo') {
    const w = faixaCompleta(p.alvo?.potencia)
    if (w) return { tipo: 'potencia', faixa: [Math.round(w[0]), Math.round(w[1])] }
    if (perfil?.ftp_w) return { tipo: 'potencia', faixa: [Math.round(perfil.ftp_w * de), Math.round(perfil.ftp_w * ate)] }
  }
  if (modalidade === 'corrida') {
    const v = faixaCompleta(p.alvo?.velocidade)
    if (v) return { tipo: 'velocidade', faixa: v }
    if (perfil?.pace_limiar_seg_km) {
      const limiar = 1000 / perfil.pace_limiar_seg_km
      return { tipo: 'velocidade', faixa: [limiar * de, limiar * ate] }
    }
  }
  if (modalidade === 'natacao') {
    // na piscina o relógio guia pelo estilo; o ritmo vai nas notas do passo
    const d = normalizar(p.descricao ?? '')
    if (/educativ|drill/.test(d)) return { tipo: 'estilo', estilo: 'educativo' }
    if (/crawl|livre/.test(d)) return { tipo: 'estilo', estilo: 'crawl' }
    return null
  }

  // FC: não serve de alvo em tiros curtos (não dá tempo de subir) nem acima do VO₂máx
  const curto = (p.duracao_seg ?? Infinity) < 90 || (p.distancia_m ?? Infinity) < 400
  if (perfil?.fc_limiar && p.zona <= 5 && !curto) {
    const [, min, max] = ZONAS_FC[Math.max(0, Math.round(p.zona) - 1)]
    // Z1 é "até X": o piso baixo evita alarme de FC baixa no começo
    return { tipo: 'fc', faixa: [Math.round(perfil.fc_limiar * Math.max(min, 0.5)), Math.round(perfil.fc_limiar * max)] }
  }
  return null
}

const NOME_PADRAO: Record<IntensidadeGarmin, string> = {
  warmup: 'Aquecimento',
  active: 'Esforço',
  recovery: 'Recuperação',
  rest: 'Descanso',
  cooldown: 'Desaquecimento',
}

function intensidadeDe(modalidade: ModalidadeEndurance, fase: FaseBloco, p: PassoTreino): IntensidadeGarmin {
  if (parado(modalidade, p)) return 'rest'
  if (fase === 'aquecimento') return 'warmup'
  if (fase === 'desaquecimento') return 'cooldown'
  return p.tipo === 'recuperacao' ? 'recovery' : 'active'
}

function passoGarmin(modalidade: ModalidadeEndurance, fase: FaseBloco, p: PassoTreino, perfil: Limiares): PassoGarmin {
  const intensidade = intensidadeDe(modalidade, fase, p)
  const duracao: DuracaoGarmin = p.distancia_m
    ? { tipo: 'distancia', m: p.distancia_m }
    : p.duracao_seg
      ? { tipo: 'tempo', seg: p.duracao_seg }
      : { tipo: 'livre' }
  let notas: string | null = null
  if (intensidade !== 'rest') {
    const zona = infoZona(p.zona)
    const alvo = alvoDoPasso(modalidade, p, perfil)
    notas = [`${zona.sigla} ${zona.nome}`, alvo.principal, alvo.fc, alvo.pse].filter(Boolean).join(' · ')
  }
  const nome = p.descricao?.trim() ? maiuscula(p.descricao.trim()) : fase === 'principal' ? NOME_PADRAO[intensidade] : FASES[fase]
  return { nome, intensidade, duracao, alvo: alvoGarmin(modalidade, p, perfil), notas }
}

/**
 * Monta o treino do relógio. Com estrutura, cada bloco vira um grupo de passos (repetido quando
 * é série); sem estrutura, um passo só com a distância (ou o tempo) planejada.
 */
export function montarTreinoGarmin(t: TreinoParaExportar, perfil: Limiares, opcoes: { piscina_m?: number } = {}): TreinoGarmin {
  if (!ehEndurance(t.modalidade)) throw new Error('Só treinos de corrida, pedal e natação vão para o relógio.')
  const modalidade = t.modalidade
  const estrutura = t.estrutura?.modalidade === modalidade && t.estrutura.blocos.some((b) => b.passos.length) ? t.estrutura : null

  const grupos: GrupoGarmin[] = estrutura
    ? estrutura.blocos
        .filter((b) => b.passos.length)
        .map((b) => ({ vezes: Math.max(1, Math.round(b.repeticoes)), passos: b.passos.map((p) => passoGarmin(modalidade, b.fase, p, perfil)) }))
    : [
        {
          vezes: 1,
          passos: [
            {
              nome: t.nome,
              intensidade: 'active',
              duracao: t.distancia_planejada_m
                ? { tipo: 'distancia', m: t.distancia_planejada_m }
                : t.duracao_planejada_seg
                  ? { tipo: 'tempo', seg: t.duracao_planejada_seg }
                  : { tipo: 'livre' },
              alvo: null,
              notas: t.descricao,
            },
          ],
        },
      ]

  return {
    // a data na frente ajuda a achar o treino na lista do relógio
    nome: `${diaMes(t.data)} ${t.nome.trim()}`,
    descricao: t.descricao?.trim() || null,
    modalidade,
    piscina_m: modalidade === 'natacao' ? (opcoes.piscina_m ?? 25) : null,
    grupos,
  }
}

/** Passos no arquivo (repetições contam como passo). */
export const totalPassos = (t: TreinoGarmin) => t.grupos.reduce((s, g) => s + g.passos.length + (g.vezes > 1 ? 1 : 0), 0)

// -----------------------------------------------------------------------------
// Arquivo .FIT
// -----------------------------------------------------------------------------

const ESPORTE: Record<ModalidadeEndurance, Pick<WorkoutMesg, 'sport' | 'subSport'>> = {
  corrida: { sport: 'running', subSport: 'generic' },
  ciclismo: { sport: 'cycling', subSport: 'generic' },
  natacao: { sport: 'swimming', subSport: 'lapSwimming' },
}

/**
 * Valores crus do FIT (o SDK só grava os campos principais): tempo em ms, distância em cm,
 * velocidade em mm/s, potência em W + 1000 e FC em bpm + 100.
 */
function mensagemPasso(p: PassoGarmin, indice: number): WorkoutStepMesg {
  const m: WorkoutStepMesg = { messageIndex: indice, wktStepName: textoRelogio(p.nome, 30), intensity: p.intensidade }
  if (p.notas) m.notes = textoRelogio(p.notas, 100)

  if (p.duracao.tipo === 'tempo') Object.assign(m, { durationType: 'time', durationValue: Math.round(p.duracao.seg * 1000) })
  else if (p.duracao.tipo === 'distancia') Object.assign(m, { durationType: 'distance', durationValue: Math.round(p.duracao.m * 100) })
  else m.durationType = 'open'

  const a = p.alvo
  if (!a) m.targetType = 'open'
  else if (a.tipo === 'velocidade')
    Object.assign(m, { targetType: 'speed', targetValue: 0, customTargetValueLow: Math.round(a.faixa[0] * 1000), customTargetValueHigh: Math.round(a.faixa[1] * 1000) })
  else if (a.tipo === 'potencia')
    Object.assign(m, { targetType: 'power', targetValue: 0, customTargetValueLow: Math.round(a.faixa[0]) + 1000, customTargetValueHigh: Math.round(a.faixa[1]) + 1000 })
  else if (a.tipo === 'fc')
    Object.assign(m, { targetType: 'heartRate', targetValue: 0, customTargetValueLow: Math.round(a.faixa[0]) + 100, customTargetValueHigh: Math.round(a.faixa[1]) + 100 })
  else Object.assign(m, { targetType: 'swimStroke', targetValue: a.estilo === 'educativo' ? 4 : 0 })
  return m
}

/** Gera o arquivo .FIT do treino (para copiar em GARMIN/NewFiles no relógio). */
export async function gerarFit(t: TreinoGarmin, criadoEm = new Date()): Promise<Uint8Array> {
  const { Encoder, Profile } = await import('@garmin/fitsdk')
  const passos: WorkoutStepMesg[] = []
  for (const g of t.grupos) {
    const inicio = passos.length
    for (const p of g.passos) passos.push(mensagemPasso(p, passos.length))
    // repetir desde o primeiro passo do grupo, g.vezes no total
    if (g.vezes > 1) passos.push({ messageIndex: passos.length, durationType: 'repeatUntilStepsCmplt', durationValue: inicio, targetType: 'open', targetValue: g.vezes })
  }
  if (!passos.length) throw new Error('Treino sem passos.')

  const arquivo: FileIdMesg = {
    type: 'workout',
    manufacturer: 'development',
    product: 0,
    // número qualquer diferente de zero: com a data, identifica o arquivo no relógio
    serialNumber: (Math.floor(criadoEm.getTime() / 1000) % 0xfffffffe) + 1,
    timeCreated: criadoEm,
  }
  const treino: WorkoutMesg = {
    ...ESPORTE[t.modalidade],
    wktName: textoRelogio(t.nome, 40),
    numValidSteps: passos.length,
    ...(t.descricao ? { wktDescription: textoRelogio(t.descricao, 120) } : {}),
    ...(t.piscina_m ? { poolLength: t.piscina_m, poolLengthUnit: 'metric' } : {}),
  }

  const enc = new Encoder()
  enc.onMesg(Profile.MesgNum.FILE_ID, arquivo)
  enc.onMesg(Profile.MesgNum.WORKOUT, treino)
  for (const p of passos) enc.onMesg(Profile.MesgNum.WORKOUT_STEP, p)
  return enc.close()
}
