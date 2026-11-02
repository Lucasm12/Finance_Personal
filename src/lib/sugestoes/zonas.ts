/**
 * Zonas de intensidade dos treinos de endurance e os alvos de cada uma para o atleta:
 * pace (corrida, pelo pace de limiar), potência (pedal, pelo FTP), ritmo por 100 m
 * (natação, pelo CSS), FC (pela FC de limiar) e percepção de esforço (PSE 0–10).
 */
import { formatarPace } from '@/lib/triathlon'
import type { Faixa, ModalidadeEndurance, NivelForca, PassoTreino, PerfilAtleta } from '@/types/triathlon'

// Zonas de FC por % da FC de limiar (Joe Friel) e de potência por % do FTP (Andrew Coggan)
export const ZONAS_FC = [
  ['Z1 Recuperação', 0, 0.85],
  ['Z2 Aeróbico', 0.85, 0.9],
  ['Z3 Tempo', 0.9, 0.95],
  ['Z4 Limiar', 0.95, 1.0],
  ['Z5 VO₂máx', 1.0, 1.1],
] as const
export const ZONAS_POTENCIA = [
  ['Z1 Recuperação', 0, 0.55],
  ['Z2 Resistência', 0.56, 0.75],
  ['Z3 Tempo', 0.76, 0.9],
  ['Z4 Limiar', 0.91, 1.05],
  ['Z5 VO₂máx', 1.06, 1.2],
  ['Z6 Anaeróbico', 1.21, 1.5],
] as const

export interface InfoZona {
  sigla: string
  nome: string
  /** percepção de esforço (escala 0–10) */
  pse: [number, number]
}

export const ZONAS: Record<number, InfoZona> = {
  1: { sigla: 'Z1', nome: 'Recuperação', pse: [1, 2] },
  2: { sigla: 'Z2', nome: 'Resistência', pse: [3, 4] },
  3: { sigla: 'Z3', nome: 'Moderado', pse: [5, 6] },
  4: { sigla: 'Z4', nome: 'Limiar', pse: [7, 8] },
  5: { sigla: 'Z5', nome: 'VO₂máx', pse: [8, 9] },
  6: { sigla: 'Z6', nome: 'Anaeróbio', pse: [9, 10] },
}

export const infoZona = (z: number) => ZONAS[Math.min(6, Math.max(1, Math.round(z)))]

/**
 * Faixa de cada zona em fração do limiar: da velocidade de limiar (corrida), do FTP (pedal,
 * zonas de Coggan) e da velocidade do CSS (natação).
 */
export const FAIXAS: Record<ModalidadeEndurance, Record<number, [number, number]>> = {
  corrida: { 1: [0.65, 0.78], 2: [0.78, 0.88], 3: [0.88, 0.95], 4: [0.95, 1.02], 5: [1.02, 1.1], 6: [1.1, 1.25] },
  ciclismo: Object.fromEntries(ZONAS_POTENCIA.map(([, de, ate], i) => [i + 1, [i === 0 ? 0.4 : de, ate]])) as Record<number, [number, number]>,
  natacao: { 1: [0.8, 0.88], 2: [0.88, 0.93], 3: [0.93, 0.97], 4: [0.97, 1.01], 5: [1.01, 1.06], 6: [1.06, 1.15] },
}

/** Limiar de referência por nível, quando o perfil não tem o do atleta (só para estimar tempo e distância). */
const LIMIAR_PADRAO: Record<'corrida' | 'natacao', Record<NivelForca, number>> = {
  // pace de limiar, segundos por km
  corrida: { iniciante: 390, intermediario: 315, avancado: 260 },
  // CSS, segundos por 100 m
  natacao: { iniciante: 150, intermediario: 120, avancado: 95 },
}

type Limiares = Pick<PerfilAtleta, 'ftp_w' | 'fc_limiar' | 'pace_limiar_seg_km' | 'css_seg_100m'> | null | undefined

/** O atleta tem o limiar que dá alvo concreto para a modalidade? */
export function temLimiar(modalidade: ModalidadeEndurance, perfil: Limiares): boolean {
  if (modalidade === 'corrida') return !!perfil?.pace_limiar_seg_km
  if (modalidade === 'ciclismo') return !!perfil?.ftp_w
  return !!perfil?.css_seg_100m
}

export const faixaDoPasso = (modalidade: ModalidadeEndurance, passo: Pick<PassoTreino, 'zona' | 'pct'>): [number, number] => {
  const [de, ate] = passo.pct ?? [null, null]
  const padrao = FAIXAS[modalidade][Math.min(6, Math.max(1, passo.zona))]
  return [de ?? padrao[0], ate ?? padrao[1]]
}

/** Zona em que cai uma fração do limiar. */
export function zonaDaFracao(modalidade: ModalidadeEndurance, fracao: number): number {
  const faixas = FAIXAS[modalidade]
  for (let z = 1; z <= 6; z++) if (fracao < faixas[z][1]) return z
  return 6
}

/** Zona em que cai uma FC (pela FC de limiar). */
export function zonaDaFc(fc: number, fcLimiar: number): number {
  const f = fc / fcLimiar
  const i = ZONAS_FC.findIndex(([, , ate]) => f < ate)
  return i === -1 ? 5 : i + 1
}

// -----------------------------------------------------------------------------
// Velocidade estimada (para calcular duração de passos por distância e vice-versa)
// -----------------------------------------------------------------------------

/** m/s esperados no passo. null no pedal (velocidade depende do terreno: os passos são por tempo). */
export function velocidadeDoPasso(modalidade: ModalidadeEndurance, passo: PassoTreino, perfil: Limiares, nivel: NivelForca): number | null {
  const v = passo.alvo?.velocidade
  if (v && (v[0] || v[1])) return v[0] && v[1] ? (v[0] + v[1]) / 2 : (v[0] ?? v[1])!
  if (modalidade === 'ciclismo') return null
  const [de, ate] = faixaDoPasso(modalidade, passo)
  const meio = (de + ate) / 2
  if (modalidade === 'corrida') return (1000 / (perfil?.pace_limiar_seg_km ?? LIMIAR_PADRAO.corrida[nivel])) * meio
  return (100 / (perfil?.css_seg_100m ?? LIMIAR_PADRAO.natacao[nivel])) * meio
}

// -----------------------------------------------------------------------------
// Alvos do passo para o atleta
// -----------------------------------------------------------------------------

export interface AlvoPasso {
  /** "4:50–5:10 /km", "210–250 W", "1:52–1:58 /100 m" (null sem limiar no perfil) */
  principal: string | null
  /** "FC 150–158" */
  fc: string | null
  /** "PSE 7–8" */
  pse: string
}

const faixaTexto = ([a, b]: [string, string]) => (a === b ? a : `${a}–${b}`)

/** Pace (seg por unidade) a partir de uma faixa de velocidade em m/s [mínima, máxima]: rápido–lento. */
function paceDeVelocidade(v: Faixa, metros: number, unidade: string): string | null {
  const [lento, rapido] = v
  if (!lento && !rapido) return null
  if (lento && rapido) return `${faixaTexto([formatarPace(metros / rapido), formatarPace(metros / lento)])} ${unidade}`
  // só o teto de velocidade: não passar desse pace
  if (rapido) return `mais lento que ${formatarPace(metros / rapido)} ${unidade}`
  return `mais rápido que ${formatarPace(metros / lento!)} ${unidade}`
}

function potenciaTexto([de, ate]: Faixa): string | null {
  if (!de && !ate) return null
  if (de && ate) return `${Math.round(de)}–${Math.round(ate)} W`
  return ate ? `até ${Math.round(ate)} W` : `acima de ${Math.round(de!)} W`
}

export function alvoDoPasso(modalidade: ModalidadeEndurance, passo: PassoTreino, perfil: Limiares): AlvoPasso {
  const info = infoZona(passo.zona)
  const pse = `PSE ${faixaTexto([String(info.pse[0]), String(info.pse[1])])}`
  let principal: string | null = null

  if (passo.alvo?.potencia) principal = potenciaTexto(passo.alvo.potencia)
  else if (passo.alvo?.velocidade) principal = paceDeVelocidade(passo.alvo.velocidade, modalidade === 'natacao' ? 100 : 1000, modalidade === 'natacao' ? '/100 m' : '/km')
  else {
    const [de, ate] = faixaDoPasso(modalidade, passo)
    if (modalidade === 'ciclismo' && perfil?.ftp_w) principal = potenciaTexto([perfil.ftp_w * de, perfil.ftp_w * ate])
    if (modalidade === 'corrida' && perfil?.pace_limiar_seg_km) {
      const v = 1000 / perfil.pace_limiar_seg_km
      principal = paceDeVelocidade([v * de, v * ate], 1000, '/km')
    }
    if (modalidade === 'natacao' && perfil?.css_seg_100m) {
      const v = 100 / perfil.css_seg_100m
      principal = passo.zona >= 6 ? 'máximo' : paceDeVelocidade([v * de, v * ate], 100, '/100 m')
    }
  }

  // FC: não serve de alvo na natação nem em tiros muito curtos (não dá tempo de subir)
  let fc: string | null = null
  const curto = (passo.duracao_seg ?? Infinity) < 90 && (passo.distancia_m ?? Infinity) < 400
  if (modalidade !== 'natacao' && perfil?.fc_limiar && passo.zona <= 5 && !curto) {
    const [, de, ate] = ZONAS_FC[Math.max(0, passo.zona - 1)]
    fc = passo.zona === 1 ? `FC até ${Math.round(perfil.fc_limiar * ate)}` : `FC ${Math.round(perfil.fc_limiar * de)}–${Math.round(perfil.fc_limiar * ate)}`
  }
  return { principal, fc, pse }
}
