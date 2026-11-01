/**
 * Progressão de carga (dupla progressão) e números de acompanhamento da musculação.
 * A carga só sobe quando todas as séries chegaram ao topo da faixa, com boa técnica
 * e esforço registrado com folga (RPE até 8 ≈ 2 ou mais repetições sobrando).
 */
import { GRUPOS_INFERIORES } from '@/lib/forca/exercicios'
import { somarDias } from '@/lib/triathlon'
import type { ExercicioPrescrito, GrupoMuscular, SerieForca } from '@/types/triathlon'

export interface SessaoExercicio {
  data: string
  planejado_id: string
  series: SerieForca[]
  /** maior carga da sessão */
  carga: number | null
  /** soma de carga × repetições */
  volume: number
  /** 1RM estimada (Epley) da melhor série */
  e1rm: number | null
  rpe: number | null
  tecnica: boolean
}

/** 1RM estimada pela fórmula de Epley. */
export const e1rm = (carga: number, reps: number) => (reps <= 1 ? carga : carga * (1 + reps / 30))

/** Sessões de um exercício, da mais recente para a mais antiga. */
export function sessoesDoExercicio(series: SerieForca[], exercicioId: string): SessaoExercicio[] {
  const porSessao = new Map<string, SerieForca[]>()
  for (const x of series) {
    if (x.exercicio_id !== exercicioId) continue
    porSessao.set(x.planejado_id, [...(porSessao.get(x.planejado_id) ?? []), x])
  }
  return [...porSessao.entries()]
    .map(([planejado_id, lista]) => {
      const ordenadas = [...lista].sort((a, b) => a.serie - b.serie)
      const comCarga = ordenadas.filter((x) => x.carga_kg !== null && x.repeticoes !== null)
      const rpes = ordenadas.map((x) => x.rpe).filter((x): x is number => x !== null)
      return {
        data: ordenadas[0].data,
        planejado_id,
        series: ordenadas,
        carga: comCarga.length ? Math.max(...comCarga.map((x) => x.carga_kg!)) : null,
        volume: ordenadas.reduce((s, x) => s + (x.carga_kg ?? 0) * (x.repeticoes ?? 0), 0),
        e1rm: comCarga.length ? Math.max(...comCarga.map((x) => e1rm(x.carga_kg!, x.repeticoes!))) : null,
        rpe: rpes.length ? Math.max(...rpes) : null,
        tecnica: ordenadas.every((x) => x.tecnica_ok),
      }
    })
    .sort((a, b) => b.data.localeCompare(a.data))
}

export interface SugestaoCarga {
  tipo: 'subir' | 'manter' | 'reduzir' | 'primeira'
  /** carga sugerida para a próxima sessão (kg) */
  carga: number | null
  texto: string
}

const kg = (n: number) => `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(n)} kg`
/** arredonda para cima em passos de 0,5 kg, com pelo menos +0,5 kg */
const proximaCarga = (atual: number, pct: number) => Math.max(atual + 0.5, Math.ceil((atual * (1 + pct)) / 0.5) * 0.5)

export function sugerirCarga(p: ExercicioPrescrito, sessoes: SessaoExercicio[]): SugestaoCarga {
  const ultima = sessoes[0]
  const faixa = `${p.reps_min}${p.reps_max !== p.reps_min ? `–${p.reps_max}` : ''}`
  if (!ultima) {
    return {
      tipo: 'primeira',
      carga: p.carga_kg ?? null,
      texto:
        p.unidade === 'segundos'
          ? `Primeira vez: segure ${faixa} s com boa postura.`
          : `Primeira vez: escolha uma carga que permita ${faixa} repetições sobrando 2 ou 3.`,
    }
  }
  const feitas = ultima.series.filter((x) => x.repeticoes !== null)
  const todasNoTopo = feitas.length >= p.series && feitas.slice(0, p.series).every((x) => (x.repeticoes ?? 0) >= p.reps_max)
  const abaixo = feitas.some((x) => (x.repeticoes ?? 0) < p.reps_min)
  const carga = ultima.carga

  if (p.unidade === 'segundos' || carga === null || carga === 0) {
    if (todasNoTopo) {
      return {
        tipo: 'subir',
        carga: null,
        texto: p.unidade === 'segundos' ? 'Bateu o tempo máximo em todas as séries: aumente 5–10 s ou use uma variação mais difícil.' : 'Fez o topo da faixa em todas as séries: use uma variação mais difícil ou acrescente carga.',
      }
    }
    return { tipo: 'manter', carga: null, texto: `Continue até completar ${faixa}${p.unidade === 'segundos' ? ' s' : ' repetições'} em todas as séries.` }
  }

  if (todasNoTopo) {
    if (!ultima.tecnica) return { tipo: 'manter', carga, texto: `Chegou a ${p.reps_max} repetições, mas com a técnica comprometida: repita ${kg(carga)} até sair limpo.` }
    if (ultima.rpe === null) return { tipo: 'manter', carga, texto: `Chegou a ${p.reps_max} em todas as séries. Registre o esforço (RPE) para o app saber se dá para subir com segurança.` }
    if (ultima.rpe >= 9) return { tipo: 'manter', carga, texto: `Chegou a ${p.reps_max}, mas no limite (RPE ${ultima.rpe}): repita ${kg(carga)} até sobrar 1–2 repetições.` }
    // pernas e compostos aguentam saltos maiores; isolados e superiores sobem devagar
    const pct = GRUPOS_INFERIORES.includes(p.grupo) ? 0.05 : 0.025
    const nova = proximaCarga(carga, pct)
    return { tipo: 'subir', carga: nova, texto: `Fez ${p.reps_max} repetições em todas as séries com folga: suba de ${kg(carga)} para ${kg(nova)} (~${Math.round(((nova - carga) / carga) * 100)}%).` }
  }

  if (abaixo) {
    const anterior = sessoes[1]
    const repetiu = anterior && anterior.carga === carga && anterior.series.some((x) => (x.repeticoes ?? 0) < p.reps_min)
    if (repetiu) {
      const reduzida = Math.max(0, Math.round((carga * 0.92) / 0.5) * 0.5)
      return { tipo: 'reduzir', carga: reduzida, texto: `Ficou abaixo de ${p.reps_min} repetições duas vezes seguidas: reduza para ~${kg(reduzida)} e reconstrua.` }
    }
    return { tipo: 'manter', carga, texto: `Abaixo de ${p.reps_min} repetições em alguma série: mantenha ${kg(carga)} e tente de novo.` }
  }
  return { tipo: 'manter', carga, texto: `Dentro da faixa: mantenha ${kg(carga)} e busque ${p.reps_max} repetições em todas as séries.` }
}

// -----------------------------------------------------------------------------
// Acompanhamento
// -----------------------------------------------------------------------------

/** Volume (carga × repetições) por semana, das `semanas` que terminam em `ate` (segundas-feiras). */
export function volumePorSemana(series: SerieForca[], semanas: string[]) {
  return semanas.map((semana) => {
    const fim = somarDias(semana, 6)
    const daSemana = series.filter((x) => x.data >= semana && x.data <= fim)
    return {
      semana,
      volume: daSemana.reduce((s, x) => s + (x.carga_kg ?? 0) * (x.repeticoes ?? 0), 0),
      series: daSemana.length,
      sessoes: new Set(daSemana.map((x) => x.planejado_id)).size,
    }
  })
}

/** Séries feitas por grupo muscular entre duas datas. */
export function seriesPorGrupo(series: SerieForca[], de: string, ate: string): Partial<Record<GrupoMuscular, number>> {
  const r: Partial<Record<GrupoMuscular, number>> = {}
  for (const x of series) if (x.data >= de && x.data <= ate) r[x.grupo] = (r[x.grupo] ?? 0) + 1
  return r
}

/** Grupos treinados nas últimas 48 h antes de `data` (para avisar sobre recuperação). */
export function gruposRecentes(series: SerieForca[], data: string): GrupoMuscular[] {
  const de = somarDias(data, -2)
  const contagem = seriesPorGrupo(
    series.filter((x) => x.data < data),
    de,
    somarDias(data, -1),
  )
  return (Object.entries(contagem) as [GrupoMuscular, number][]).filter(([g, n]) => n >= 3 && g !== 'core' && g !== 'cardio').map(([g]) => g)
}
