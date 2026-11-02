/**
 * Treinos sugeridos pela AI Endurance (plano de treino do atleta) convertidos para a
 * estrutura do app. Dois formatos estão documentados:
 *  - "steps" (saída dos geradores e dos treinos do plano): aquecimento, endurance extra,
 *    repetições on/off e desaquecimento, com alvos em watts (Ride) ou m/s (Run);
 *  - "zwift_zip": .zip em base64 com arquivos .zwo (Zwift), potência em fração do FTP
 *    (ou do pace de limiar, na corrida).
 */
import { ehObjeto, type Objeto } from '@/lib/integracao-ai-endurance/atividades'
import { zonaDaFracao } from '@/lib/sugestoes/zonas'
import type { BlocoTreino, EstruturaTreino, Faixa, ModalidadeEndurance, ObjetivoEndurance, PassoTreino } from '@/types/triathlon'

export interface TreinoExterno {
  referencia: string
  nome: string
  descricao: string | null
  /** dia sugerido pelo plano (AAAA-MM-DD), se houver */
  data: string | null
  estrutura: EstruturaTreino
}

const MODALIDADE: Record<string, ModalidadeEndurance> = { ride: 'ciclismo', bike: 'ciclismo', run: 'corrida', swim: 'natacao' }
export const modalidadeAie = (v: unknown): ModalidadeEndurance | null => (typeof v === 'string' ? (MODALIDADE[v.trim().toLowerCase()] ?? null) : null)

/** Tipo de intensidade da AI Endurance → zona e objetivo do app. */
const INTENSIDADE: Record<string, { zona: number; objetivo: ObjetivoEndurance; nome: string }> = {
  recovery: { zona: 1, objetivo: 'recuperacao', nome: 'Recuperação' },
  endurance: { zona: 2, objetivo: 'resistencia', nome: 'Endurance' },
  tempo: { zona: 3, objetivo: 'limiar', nome: 'Tempo' },
  threshold: { zona: 4, objetivo: 'limiar', nome: 'Limiar' },
  vo2max: { zona: 5, objetivo: 'velocidade', nome: 'VO₂máx' },
  anaerobic: { zona: 6, objetivo: 'velocidade', nome: 'Anaeróbio' },
}
const intensidade = (v: unknown) => INTENSIDADE[typeof v === 'string' ? v.toLowerCase().replace(/[^a-z0-9]/g, '') : ''] ?? INTENSIDADE.endurance

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null)
const positivo = (v: unknown) => {
  const x = n(v)
  return x !== null && x > 0 ? x : null
}

/** Zonas da AI Endurance (limite superior de cada uma, em W ou m/s) → zona do app para um alvo. */
function zonaPorLimites(valor: number, zonas: Objeto | null): number | null {
  if (!zonas) return null
  const limites = ['Endurance', 'Tempo', 'Threshold', 'VO2Max', 'Anaerobic'].map((k) => n(zonas[k]))
  for (let i = 0; i < limites.length; i++) {
    const lim = limites[i]
    if (lim !== null && valor <= lim * 1.001) return i + 2
  }
  return limites.some((x) => x !== null) ? 6 : null
}

function passo(
  tipo: PassoTreino['tipo'],
  duracao: number,
  faixa: Faixa,
  modalidade: ModalidadeEndurance,
  zonaPadrao: number,
  zonas: Objeto | null,
  descricao: string,
): PassoTreino {
  const meio = faixa[0] && faixa[1] ? (faixa[0] + faixa[1]) / 2 : null
  // com faixa completa, a zona sai dos limites do atleta; só com teto ("até X"), vale a do tipo do passo
  const zona = meio !== null ? (zonaPorLimites(meio, zonas) ?? zonaPadrao) : zonaPadrao
  const alvo = faixa[0] || faixa[1] ? (modalidade === 'ciclismo' ? { potencia: faixa } : { velocidade: faixa }) : null
  return { tipo, duracao_seg: Math.round(duracao), distancia_m: null, zona, alvo, descricao }
}

/** Converte o objeto "steps" documentado (ess_workout / gpt_workout / treinos do plano). */
export function estruturaDosSteps(steps: unknown, zonas: unknown = null, referencia: string | null = null): EstruturaTreino | null {
  if (!ehObjeto(steps)) return null
  const modalidade = modalidadeAie(steps.act_type)
  if (!modalidade) return null
  const z = ehObjeto(zonas) ? zonas : null
  const tipo = intensidade(steps.type)
  const faixa = (prefixo: string): Faixa => [positivo(steps[`target_${prefixo}_low`]), positivo(steps[`target_${prefixo}_high`])]
  const blocos: BlocoTreino[] = []

  const aquecimento = positivo(steps.duration_warmup)
  if (aquecimento) blocos.push({ fase: 'aquecimento', repeticoes: 1, passos: [passo('esforco', aquecimento, faixa('warmup'), modalidade, 1, z, 'aquecimento progressivo')] })
  const extra = positivo(steps.duration_add_endurance)
  if (extra) blocos.push({ fase: 'principal', repeticoes: 1, passos: [passo('esforco', extra, faixa('add_endurance'), modalidade, 2, z, 'endurance')] })
  const on = positivo(steps.duration_on)
  if (on) {
    const off = positivo(steps.duration_off)
    const passos = [passo('esforco', on, faixa('on'), modalidade, tipo.zona, z, tipo.nome.toLowerCase())]
    if (off) passos.push(passo('recuperacao', off, faixa('off'), modalidade, 1, z, 'recuperação'))
    blocos.push({ fase: 'principal', repeticoes: Math.max(1, Math.min(50, Math.round(positivo(steps.repeats) ?? 1))), passos })
  }
  const desaquecimento = positivo(steps.duration_cooldown)
  if (desaquecimento) blocos.push({ fase: 'desaquecimento', repeticoes: 1, passos: [passo('esforco', desaquecimento, faixa('cooldown'), modalidade, 1, z, 'solto')] })
  if (!blocos.some((b) => b.fase === 'principal')) return null
  return { modalidade, objetivo: tipo.objetivo, nivel: 'intermediario', blocos, fonte: 'ai_endurance', referencia }
}

// -----------------------------------------------------------------------------
// .zwo (Zwift)
// -----------------------------------------------------------------------------

/** Lê um treino .zwo. Potência = fração do FTP (pedal) ou do pace de limiar (corrida). */
export function lerZwo(xml: string, referencia: string): TreinoExterno | null {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) return null
  const texto = (tag: string) => doc.getElementsByTagName(tag)[0]?.textContent?.trim() || null
  const modalidade: ModalidadeEndurance = texto('sportType')?.toLowerCase() === 'run' ? 'corrida' : 'ciclismo'
  const workout = doc.getElementsByTagName('workout')[0]
  if (!workout) return null
  const porDistancia = texto('durationType')?.toLowerCase() === 'distance'

  const attr = (el: Element, nome: string) => n(el.getAttribute(nome))
  const fx = (de: number | null, ate: number | null): Faixa | null => (de || ate ? [de ?? ate, ate ?? de] : null)
  const mk = (tipo: PassoTreino['tipo'], quantidade: number | null, pct: Faixa | null, descricao: string): PassoTreino | null => {
    if (!quantidade || quantidade <= 0) return null
    const meio = pct ? ((pct[0] ?? 0) + (pct[1] ?? 0)) / 2 : 0.5
    return {
      tipo,
      duracao_seg: porDistancia ? null : Math.round(quantidade),
      distancia_m: porDistancia ? Math.round(quantidade) : null,
      zona: zonaDaFracao(modalidade, meio),
      pct,
      descricao,
    }
  }

  const blocos: BlocoTreino[] = []
  const filhos = Array.from(workout.children)
  filhos.forEach((el, i) => {
    const nome = el.localName.toLowerCase()
    const d = attr(el, 'Duration')
    if (nome === 'intervalst') {
      const on = mk('esforco', attr(el, 'OnDuration'), fx(attr(el, 'OnPower') ?? attr(el, 'PowerOnLow'), attr(el, 'OnPower') ?? attr(el, 'PowerOnHigh')), 'tiro')
      const off = mk('recuperacao', attr(el, 'OffDuration'), fx(attr(el, 'OffPower') ?? attr(el, 'PowerOffLow'), attr(el, 'OffPower') ?? attr(el, 'PowerOffHigh')), 'recuperação')
      if (on) blocos.push({ fase: 'principal', repeticoes: Math.max(1, Math.round(attr(el, 'Repeat') ?? 1)), passos: off ? [on, off] : [on] })
      return
    }
    const faixa = nome === 'steadystate' || nome === 'solidstate' ? fx(attr(el, 'Power'), attr(el, 'Power')) : fx(attr(el, 'PowerLow'), attr(el, 'PowerHigh'))
    const descricao = { warmup: 'aquecimento progressivo', cooldown: 'desaquecimento', ramp: 'rampa', freeride: 'livre', maxeffort: 'esforço máximo' }[nome] ?? 'contínuo'
    const p = mk('esforco', d, nome === 'maxeffort' ? [1.5, 2] : faixa, descricao)
    if (!p) return
    const fase = nome === 'warmup' || (i === 0 && nome === 'ramp') ? 'aquecimento' : nome === 'cooldown' || (i === filhos.length - 1 && nome === 'ramp') ? 'desaquecimento' : 'principal'
    blocos.push({ fase, repeticoes: 1, passos: [p] })
  })
  if (!blocos.length) return null
  const principal = blocos.flatMap((b) => (b.fase === 'principal' ? b.passos : []))
  const zonaMax = Math.max(...principal.map((p) => p.zona), 1)
  const objetivo: ObjetivoEndurance = zonaMax >= 5 ? 'velocidade' : zonaMax >= 3 ? 'limiar' : zonaMax === 2 ? 'resistencia' : 'recuperacao'
  return {
    referencia,
    nome: (texto('name') ?? referencia).slice(0, 120),
    descricao: texto('description')?.slice(0, 2000) ?? null,
    data: null,
    estrutura: { modalidade, objetivo, nivel: 'intermediario', blocos, fonte: 'ai_endurance', referencia },
  }
}

/** .zip em base64 com arquivos .zwo → treinos. */
export async function lerZwiftZip(base64: string): Promise<{ treinos: TreinoExterno[]; avisos: string[] }> {
  const { unzipSync, strFromU8 } = await import('fflate')
  const binario = atob(base64.replace(/\s/g, ''))
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  let total = 0
  const arquivos = unzipSync(bytes, {
    filter: (f) => {
      if (!/\.zwo$/i.test(f.name)) return false
      total += f.originalSize
      if (total > 20 * 1024 * 1024) throw new Error('arquivo de treinos grande demais')
      return true
    },
  })
  const treinos: TreinoExterno[] = []
  const avisos: string[] = []
  for (const [nome, conteudo] of Object.entries(arquivos).slice(0, 200)) {
    const t = lerZwo(strFromU8(conteudo), `zwo:${nome.split('/').pop()!.replace(/\.zwo$/i, '').slice(0, 100)}`)
    if (t) treinos.push(t)
    else avisos.push(`${nome}: treino .zwo não reconhecido`)
  }
  return { treinos, avisos }
}

// -----------------------------------------------------------------------------
// Resposta da função /api/ai-endurance?acao=treinos
// -----------------------------------------------------------------------------

const dia = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null)

/** Treinos do plano (future_workout_static_partner); se não vierem com "steps", usa o zwift_zip do atleta. */
export async function lerTreinosDoPlano(resposta: unknown): Promise<{ treinos: TreinoExterno[]; avisos: string[] }> {
  const r = ehObjeto(resposta) ? resposta : {}
  const atleta = ehObjeto(r.atleta) ? r.atleta : {}
  const zonasAtleta = ehObjeto(atleta.zones) ? atleta.zones : {}
  const lista = Array.isArray(r.treinos) ? r.treinos : ehObjeto(r.treinos) && Array.isArray(r.treinos.results) ? r.treinos.results : []
  const treinos: TreinoExterno[] = []
  const avisos: string[] = []
  let semFormato = 0
  let campos = ''

  for (const item of lista) {
    if (!ehObjeto(item)) continue
    const id = item.future_workout_static_id ?? item.id ?? item.pk
    const referencia = `aie:${String(id ?? treinos.length).slice(0, 80)}`
    const steps = ehObjeto(item.steps) ? item.steps : null
    const modalidade = modalidadeAie(steps?.act_type ?? item.act_type)
    const zonas = ehObjeto(item.zones) ? item.zones : modalidade === 'ciclismo' ? zonasAtleta.Ride : modalidade === 'corrida' ? zonasAtleta.Run : null
    const estrutura = estruturaDosSteps(steps ? { act_type: item.act_type, ...steps } : null, zonas, referencia)
    if (!estrutura) {
      semFormato++
      campos ||= Object.keys(item).slice(0, 12).join(', ')
      continue
    }
    const nome = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : typeof item.title === 'string' ? item.title : null
    const tipo = intensidade(steps?.type).nome
    treinos.push({
      referencia,
      nome: (nome ?? `${tipo} — ${{ corrida: 'corrida', ciclismo: 'pedal', natacao: 'natação' }[estrutura.modalidade]} (AI Endurance)`).slice(0, 120),
      descricao: typeof item.description === 'string' ? item.description.slice(0, 2000) : null,
      data: dia(item.workout_date ?? item.date ?? item.day),
      estrutura,
    })
  }

  if (semFormato && typeof atleta.zwift_zip === 'string' && atleta.zwift_zip.length > 20) {
    try {
      const zip = await lerZwiftZip(atleta.zwift_zip)
      treinos.push(...zip.treinos)
      avisos.push(...zip.avisos)
      semFormato = 0
    } catch (e) {
      avisos.push(`Não foi possível ler os treinos .zwo da AI Endurance: ${e instanceof Error ? e.message : 'arquivo inválido'}.`)
    }
  }
  if (semFormato) avisos.push(`${semFormato} treino(s) do plano em formato não reconhecido (campos recebidos: ${campos}).`)
  if (!lista.length && !treinos.length) avisos.push('A AI Endurance não devolveu treinos futuros: o plano pode ainda não ter sido gerado para o seu atleta.')
  return { treinos, avisos }
}
