/**
 * Endurance no navegador: cálculo das parciais, leitura de .fit com parciais, catálogo de
 * sugestões, alvos por zona, recomendação, planejado × realizado e a conversão dos dados
 * da AI Endurance (atividades e treinos no formato "steps").
 */
import { describe, expect, it } from 'vitest'

import { lerFit } from '@/lib/importacao/arquivos'
import { acharExistente } from '@/lib/importacao/duplicidade'
import { melhorParaPlanejado, vinculoAutomatico, type PlanejadoResumo } from '@/lib/importacao/vinculo'
import { lerAtividade, lerAtividades, listaDe } from '@/lib/integracao-ai-endurance/atividades'
import { estruturaDosSteps, lerTreinosDoPlano } from '@/lib/integracao-ai-endurance/treinos'
import { destaques, montarParciais, parciaisPorDistancia, type Amostra } from '@/lib/parciais/calculo'
import { CATALOGO, MODELO_POR_ID } from '@/lib/sugestoes/catalogo'
import { compararPlano } from '@/lib/sugestoes/comparacao'
import { ajustarAoTempo, resumoEstrutura, sequencia, totaisEstrutura } from '@/lib/sugestoes/estrutura'
import { contextoEndurance, sugerirTreinos, type ContextoEndurance } from '@/lib/sugestoes/recomendacao'
import { alvoDoPasso } from '@/lib/sugestoes/zonas'
import type { EstruturaTreino, NivelForca, Parcial, PerfilAtleta, Treino } from '@/types/triathlon'

const perfil = { ftp_w: 250, fc_limiar: 170, pace_limiar_seg_km: 300, css_seg_100m: 110 } as PerfilAtleta

/** Corrida contínua: `pace` seg/km, uma amostra por segundo. */
function corridaConstante(km: number, pace: number, extra: (t: number) => Partial<Amostra> = () => ({})): Amostra[] {
  const total = Math.round(km * pace)
  return Array.from({ length: total + 1 }, (_, t) => ({ t, d: (t / pace) * 1000, fc: 150, ...extra(t) }))
}

// -----------------------------------------------------------------------------
// Parciais
// -----------------------------------------------------------------------------

describe('parciais por distância', () => {
  it('3,5 km a 5:00/km → 3 km cheios de 5:00 e meio km de 2:30, com a FC média', () => {
    const p = parciaisPorDistancia(corridaConstante(3.5, 300), 'km', 1000)
    expect(p.map((x) => x.ordem)).toEqual([1, 2, 3, 4])
    expect(p.slice(0, 3).map((x) => x.duracao_seg)).toEqual([300, 300, 300])
    expect(p[3].duracao_seg).toBeCloseTo(150, 0)
    expect(p[3].distancia_m).toBeCloseTo(500, 0)
    expect(p.every((x) => x.fc_media === 150)).toBe(true)
  })

  it('a marca do km é interpolada entre amostras espaçadas (relógio com gravação inteligente)', () => {
    // amostras a cada 7 s: o km 1 cai entre duas amostras
    const pts = corridaConstante(2, 300).filter((a) => a.t % 7 === 0)
    const p = parciaisPorDistancia(pts, 'km', 1000)
    expect(p[0].duracao_seg).toBeCloseTo(300, 0)
  })

  it('pausa (sem amostras por mais de 30 s) não conta no tempo', () => {
    const pts = corridaConstante(2, 300).map((a) => (a.t > 450 ? { ...a, t: a.t + 120 } : a))
    const p = parciaisPorDistancia(pts, 'km', 1000)
    expect(p[1].duracao_seg).toBeLessThan(305)
  })

  it('subida e descida de cada km, sem contar o ruído do GPS', () => {
    // km 2 sobe 20 m; o resto é plano com ruído de ±0,4 m
    const pts = corridaConstante(3, 300, (t) => ({ alt: 100 + (t >= 300 && t < 600 ? ((t - 300) / 300) * 20 : t >= 600 ? 20 : 0) + (t % 2 ? 0.4 : -0.4) }))
    const p = parciaisPorDistancia(pts, 'km', 1000)
    expect(p[0].elevacao_ganho_m).toBeLessThan(2)
    expect(p[1].elevacao_ganho_m).toBeGreaterThan(17)
    expect(p[2].elevacao_ganho_m).toBeLessThan(3)
  })

  it('montarParciais: corrida por km; voltas só quando há mais de uma', () => {
    const volta = { tipo: 'volta' as const, ordem: 1, duracao_seg: 900, distancia_m: 3000, fc_media: null, fc_max: null, potencia_media: null, cadencia_media: null, elevacao_ganho_m: null, elevacao_perda_m: null, bracadas: null, estilo: null, descanso: false }
    expect(montarParciais('corrida', corridaConstante(3, 300), [volta]).map((x) => x.tipo)).toEqual(['km', 'km', 'km'])
    expect(montarParciais('corrida', corridaConstante(3, 300), [volta, { ...volta, ordem: 2 }]).filter((x) => x.tipo === 'volta')).toHaveLength(2)
    expect(montarParciais('ciclismo', corridaConstante(12, 100)).map((x) => [x.tipo, Math.round(x.distancia_m ?? 0)])).toEqual([
      ['intervalo', 5000],
      ['intervalo', 5000],
      ['intervalo', 2000],
    ])
  })

  it('destaques: mais rápida e mais lenta (sem o último km incompleto) e média geral', () => {
    const p = [310, 290, 300, 120].map((dur, i) => ({ tipo: 'km' as const, ordem: i + 1, duracao_seg: dur, distancia_m: i === 3 ? 400 : 1000, fc_media: 150 + i, potencia_media: null, descanso: false }))
    const d = destaques(p, 'corrida')
    expect(d.rapida?.ordem).toBe(2)
    expect(d.lenta?.ordem).toBe(1)
    expect(d.comparadas).toBe(3)
    expect(d.media.distancia_m).toBe(3400)
    expect(d.media.ritmo?.texto).toBe('5:00')
  })

  it('destaques da natação ignoram as séries de descanso', () => {
    const p = [
      { tipo: 'volta' as const, ordem: 1, duracao_seg: 200, distancia_m: 200, fc_media: null, potencia_media: null, descanso: false },
      { tipo: 'volta' as const, ordem: 2, duracao_seg: 30, distancia_m: 0, fc_media: null, potencia_media: null, descanso: true },
      { tipo: 'volta' as const, ordem: 3, duracao_seg: 180, distancia_m: 200, fc_media: null, potencia_media: null, descanso: false },
    ]
    const d = destaques(p, 'natacao')
    expect([d.rapida?.ordem, d.lenta?.ordem]).toEqual([3, 1])
    expect(d.media.duracao_seg).toBe(380)
  })
})

// -----------------------------------------------------------------------------
// .fit com parciais (arquivo gerado com o encoder oficial da Garmin)
// -----------------------------------------------------------------------------

async function fitDeCorrida(): Promise<Uint8Array> {
  const { Encoder, Profile } = await import('@garmin/fitsdk')
  const e = new Encoder()
  const inicio = new Date('2026-11-01T09:00:00Z')
  const em = (s: number) => new Date(inicio.getTime() + s * 1000)
  e.onMesg(Profile.MesgNum.FILE_ID, { type: 'activity', manufacturer: 'development', product: 0, timeCreated: inicio, serialNumber: 1 })
  // 2 km a 5:00/km, uma amostra a cada 2 s; cadência do FIT = uma perna
  for (let t = 0; t <= 600; t += 2) e.onMesg(Profile.MesgNum.RECORD, { timestamp: em(t), distance: (t / 300) * 1000, heartRate: t < 300 ? 140 : 160, cadence: 85 })
  e.onMesg(Profile.MesgNum.LAP, { timestamp: em(300), startTime: em(0), totalElapsedTime: 300, totalTimerTime: 300, totalDistance: 1000, avgHeartRate: 140, avgCadence: 85, sport: 'running' })
  e.onMesg(Profile.MesgNum.LAP, { timestamp: em(600), startTime: em(300), totalElapsedTime: 300, totalTimerTime: 300, totalDistance: 1000, avgHeartRate: 160, avgCadence: 85, sport: 'running' })
  e.onMesg(Profile.MesgNum.SESSION, {
    timestamp: em(600),
    startTime: inicio,
    totalElapsedTime: 600,
    totalTimerTime: 600,
    totalDistance: 2000,
    sport: 'running',
    avgHeartRate: 150,
    avgCadence: 85,
    firstLapIndex: 0,
    numLaps: 2,
  })
  e.onMesg(Profile.MesgNum.ACTIVITY, { timestamp: em(600), numSessions: 1, type: 'manual', event: 'activity', eventType: 'stop' })
  return e.close()
}

async function fitDePiscina(): Promise<Uint8Array> {
  const { Encoder, Profile } = await import('@garmin/fitsdk')
  const e = new Encoder()
  const inicio = new Date('2026-11-02T06:00:00Z')
  const em = (s: number) => new Date(inicio.getTime() + s * 1000)
  e.onMesg(Profile.MesgNum.FILE_ID, { type: 'activity', manufacturer: 'development', product: 0, timeCreated: inicio, serialNumber: 1 })
  // série 1: 4 piscinas de 25 m (100 m); descanso 30 s; série 2: 4 piscinas
  const piscinas = [0, 25, 50, 75, 135, 157, 179, 201]
  piscinas.forEach((s, i) =>
    e.onMesg(Profile.MesgNum.LENGTH, { timestamp: em(s + 24), startTime: em(s), totalElapsedTime: i < 4 ? 25 : 22, totalTimerTime: i < 4 ? 25 : 22, totalStrokes: 14, swimStroke: 'freestyle', lengthType: 'active' }),
  )
  e.onMesg(Profile.MesgNum.LENGTH, { timestamp: em(130), startTime: em(100), totalElapsedTime: 30, totalTimerTime: 30, lengthType: 'idle' })
  e.onMesg(Profile.MesgNum.LAP, { timestamp: em(100), startTime: em(0), totalElapsedTime: 100, totalTimerTime: 100, totalDistance: 100, numActiveLengths: 4, totalCycles: 56, swimStroke: 'freestyle', sport: 'swimming' })
  e.onMesg(Profile.MesgNum.LAP, { timestamp: em(135), startTime: em(100), totalElapsedTime: 35, totalTimerTime: 35, totalDistance: 0, numActiveLengths: 0, sport: 'swimming' })
  e.onMesg(Profile.MesgNum.LAP, { timestamp: em(223), startTime: em(135), totalElapsedTime: 88, totalTimerTime: 88, totalDistance: 100, numActiveLengths: 4, totalCycles: 56, swimStroke: 'freestyle', sport: 'swimming' })
  e.onMesg(Profile.MesgNum.SESSION, {
    timestamp: em(223),
    startTime: inicio,
    totalElapsedTime: 223,
    totalTimerTime: 223,
    totalDistance: 200,
    sport: 'swimming',
    subSport: 'lapSwimming',
    poolLength: 25,
    firstLapIndex: 0,
    numLaps: 3,
  })
  return e.close()
}

describe('.fit com parciais', () => {
  it('corrida: parciais por km e as duas voltas, com a cadência das duas pernas', async () => {
    const [t] = await lerFit(await fitDeCorrida(), 'corrida.fit')
    expect(t.modalidade).toBe('corrida')
    const km = t.parciais.filter((p) => p.tipo === 'km')
    expect(km).toHaveLength(2)
    expect(km[0].duracao_seg).toBeCloseTo(300, 0)
    expect(km[1].fc_media).toBe(160)
    expect(km[0].cadencia_media).toBe(170)
    const voltas = t.parciais.filter((p) => p.tipo === 'volta')
    expect(voltas.map((v) => [v.ordem, v.distancia_m, v.fc_media, v.cadencia_media])).toEqual([
      [1, 1000, 140, 170],
      [2, 1000, 160, 170],
    ])
  })

  it('natação na piscina: cada piscina (só as nadadas) e as séries, com o descanso marcado', async () => {
    const [t] = await lerFit(await fitDePiscina(), 'piscina.fit')
    expect(t.modalidade).toBe('natacao')
    const piscinas = t.parciais.filter((p) => p.tipo === 'piscina')
    expect(piscinas).toHaveLength(8)
    expect(piscinas[0]).toMatchObject({ distancia_m: 25, bracadas: 14, estilo: 'Crawl' })
    const series = t.parciais.filter((p) => p.tipo === 'volta')
    expect(series.map((s) => s.descanso)).toEqual([false, true, false])
    expect(series[0]).toMatchObject({ bracadas: 56, estilo: 'Crawl' })
  })
})

describe('duplicidade na prévia', () => {
  it('mesma modalidade a até 3 minutos é o mesmo treino; pega o mais próximo', () => {
    const existentes = [
      { id: 'a', nome: 'A', origem: 'manual' as const, modalidade: 'corrida' as const, data_hora: '2026-11-01T09:02:30Z' },
      { id: 'b', nome: 'B', origem: 'arquivo' as const, modalidade: 'corrida' as const, data_hora: '2026-11-01T09:01:00Z' },
      { id: 'c', nome: 'C', origem: 'arquivo' as const, modalidade: 'ciclismo' as const, data_hora: '2026-11-01T09:00:00Z' },
    ]
    expect(acharExistente({ modalidade: 'corrida', data_hora: '2026-11-01T09:00:00Z' }, existentes)?.id).toBe('b')
    expect(acharExistente({ modalidade: 'corrida', data_hora: '2026-11-01T09:10:00Z' }, existentes)).toBeNull()
    expect(acharExistente({ modalidade: 'natacao', data_hora: '2026-11-01T09:00:00Z' }, existentes)).toBeNull()
  })
})

describe('vínculo com o treino planejado na prévia', () => {
  const p = (id: string, data: string, modalidade: PlanejadoResumo['modalidade'], extra: Partial<PlanejadoResumo> = {}): PlanejadoResumo => ({
    id,
    data,
    modalidade,
    nome: id,
    status: 'pendente',
    treino_id: null,
    ...extra,
  })
  // meio-dia local: o mesmo dia em qualquer fuso do Brasil
  const corrida = (dia: string) => ({ modalidade: 'corrida' as const, data_hora: new Date(`${dia}T12:00:00`).toISOString() })

  it('o único pendente da modalidade no dia; com dois, avisa quantos', () => {
    const lista = [p('tempo', '2026-11-02', 'corrida'), p('nado', '2026-11-02', 'natacao'), p('feito', '2026-11-02', 'corrida', { treino_id: 'x', status: 'concluido' })]
    expect(vinculoAutomatico(corrida('2026-11-02'), lista)).toEqual({ planejado: lista[0] })
    expect(vinculoAutomatico(corrida('2026-11-02'), [...lista, p('outra', '2026-11-02', 'corrida')])).toEqual({ candidatos: 2 })
    expect(vinculoAutomatico(corrida('2026-11-03'), lista)).toBeNull()
    expect(vinculoAutomatico(corrida('2026-11-02'), [p('perdido', '2026-11-02', 'corrida', { status: 'perdido' })])).toBeNull()
  })

  it('para um planejado escolhido, sugere a atividade da mesma modalidade no dia mais próximo', () => {
    const lidos = [{ modalidade: 'ciclismo' as const, data_hora: corrida('2026-11-02').data_hora }, corrida('2026-11-04'), corrida('2026-11-03')]
    expect(melhorParaPlanejado(lidos, { data: '2026-11-02', modalidade: 'corrida' })).toBe(2)
    expect(melhorParaPlanejado(lidos, { data: '2026-11-02', modalidade: 'natacao' })).toBeNull()
  })
})

// -----------------------------------------------------------------------------
// Catálogo, zonas e recomendação
// -----------------------------------------------------------------------------

describe('catálogo de sugestões', () => {
  const casos = CATALOGO.flatMap((m) => m.niveis.map((n) => [m.id, n] as [string, NivelForca]))

  it.each(casos)('%s (%s): aquecimento, parte principal e desaquecimento válidos', (id, nivel) => {
    const m = MODELO_POR_ID.get(id)!
    const blocos = m.montar(nivel)
    expect(blocos.some((b) => b.fase === 'principal')).toBe(true)
    for (const b of blocos) {
      expect(b.repeticoes).toBeGreaterThanOrEqual(1)
      for (const p of b.passos) {
        expect(p.zona).toBeGreaterThanOrEqual(1)
        expect(p.zona).toBeLessThanOrEqual(6)
        expect((p.duracao_seg ?? 0) > 0 || (p.distancia_m ?? 0) > 0).toBe(true)
      }
    }
    const t = totaisEstrutura({ modalidade: m.modalidade, nivel, blocos }, null)
    expect(t.duracao_seg).toBeGreaterThan(10 * 60)
    expect(t.duracao_seg).toBeLessThan(3.5 * 3600)
    if (m.modalidade === 'natacao') expect(t.distancia_m).toBeGreaterThan(300)
  })

  it('tem os exemplos pedidos em cada modalidade', () => {
    const ids = new Set(CATALOGO.map((m) => m.id))
    for (const id of ['corrida_rodagem_leve', 'corrida_intervalado', 'corrida_tempo_run', 'corrida_longao', 'ciclismo_endurance_z2', 'ciclismo_limiar', 'ciclismo_subidas', 'ciclismo_recuperacao', 'natacao_tecnica', 'natacao_aerobico', 'natacao_velocidade', 'natacao_continuo'])
      expect(ids.has(id)).toBe(true)
  })

  it('a sequência expande as repetições e o resumo descreve os blocos', () => {
    const blocos = MODELO_POR_ID.get('corrida_intervalado')!.montar('intermediario')
    expect(sequencia(blocos)).toHaveLength(1 + 6 * 2 + 1)
    expect(resumoEstrutura({ modalidade: 'corrida', blocos })).toBe('Aquecimento: 15 min Z2 · Parte principal: 6× (800 m Z5 + 2 min Z1) · Desaquecimento: 10 min Z1')
  })
})

describe('alvos por zona', () => {
  const passo = (zona: number, extra = {}) => ({ tipo: 'esforco' as const, duracao_seg: 600, distancia_m: null, zona, ...extra })

  it('corrida: pace pelo pace de limiar e FC pela FC de limiar', () => {
    expect(alvoDoPasso('corrida', passo(4), perfil)).toEqual({ principal: '4:54–5:16 /km', fc: 'FC 162–170', pse: 'PSE 7–8' })
  })

  it('pedal: potência pelo FTP; faixa própria do passo (sweet spot) tem prioridade', () => {
    expect(alvoDoPasso('ciclismo', passo(2), perfil).principal).toBe('140–188 W')
    expect(alvoDoPasso('ciclismo', passo(4, { pct: [0.88, 0.94] }), perfil).principal).toBe('220–235 W')
  })

  it('natação: ritmo pelo CSS e sem FC', () => {
    const a = alvoDoPasso('natacao', passo(4), perfil)
    expect(a.principal).toBe('1:49–1:53 /100 m')
    expect(a.fc).toBeNull()
  })

  it('sem limiar no perfil, só zona e PSE; alvo absoluto (AI Endurance) é mostrado como veio', () => {
    expect(alvoDoPasso('corrida', passo(2), null)).toEqual({ principal: null, fc: null, pse: 'PSE 3–4' })
    expect(alvoDoPasso('ciclismo', passo(3, { alvo: { potencia: [232, 247] } }), null).principal).toBe('232–247 W')
    expect(alvoDoPasso('corrida', passo(1, { alvo: { velocidade: [null, 3.82] } }), null).principal).toBe('mais lento que 4:22 /km')
  })
})

describe('recomendação', () => {
  const ctx = (c: Partial<ContextoEndurance> = {}): ContextoEndurance => ({ forma: 0, diasDesdeIntenso: 5, diasDesdeLongo: 3, semanal: { distancia_m: 0, sessoes: 0, horas: 0 }, ...c })

  it('nunca sugere algo que não cabe no tempo disponível', () => {
    for (const modalidade of ['corrida', 'ciclismo', 'natacao'] as const)
      for (const tempo_min of [30, 45, 60])
        for (const s of sugerirTreinos({ modalidade, objetivo: 'automatico', nivel: 'avancado', tempo_min }, ctx(), perfil).sugestoes)
          expect(s.duracao_seg).toBeLessThanOrEqual(tempo_min * 60 * 1.05)
  })

  it('fadiga alta: recuperação primeiro', () => {
    const r = sugerirTreinos({ modalidade: 'corrida', objetivo: 'automatico', nivel: 'intermediario', tempo_min: 60 }, ctx({ forma: -32 }), perfil)
    expect(r.sugestoes[0].estrutura.objetivo).toBe('recuperacao')
    expect(r.motivos[0]).toMatch(/fadiga alta/)
  })

  it('treino intenso há menos de 48 h: nada intenso no modo automático', () => {
    const r = sugerirTreinos({ modalidade: 'ciclismo', objetivo: 'automatico', nivel: 'intermediario', tempo_min: 90 }, ctx({ diasDesdeIntenso: 1 }), perfil)
    expect(r.sugestoes.length).toBeGreaterThan(0)
    expect(r.sugestoes.every((s) => !s.modelo.intenso)).toBe(true)
  })

  it('uma semana sem longo e tempo sobrando: o longo vem primeiro', () => {
    const r = sugerirTreinos({ modalidade: 'corrida', objetivo: 'automatico', nivel: 'intermediario', tempo_min: 120 }, ctx({ diasDesdeLongo: 9 }), perfil)
    expect(r.sugestoes[0].modelo.id).toBe('corrida_longao')
    expect(r.sugestoes[0].recomendada).toBe(true)
  })

  it('sem limiar no perfil, avisa que os alvos ficam por zona/FC/PSE', () => {
    const r = sugerirTreinos({ modalidade: 'natacao', objetivo: 'tecnica', nivel: 'iniciante', tempo_min: 45 }, ctx(), null)
    expect(r.avisos.join(' ')).toMatch(/Sem CSS/)
  })

  it('encurta repetições para caber e recusa o que não cabe', () => {
    const intervalado = { modalidade: 'corrida' as const, nivel: 'avancado' as NivelForca, blocos: MODELO_POR_ID.get('corrida_intervalado')!.montar('avancado') }
    const ajustado = ajustarAoTempo(intervalado, perfil, 40 * 60)!
    expect(ajustado.find((b) => b.fase === 'principal')!.repeticoes).toBeLessThan(8)
    expect(totaisEstrutura({ ...intervalado, blocos: ajustado }, perfil).duracao_seg).toBeLessThanOrEqual(42 * 60)
    const longao = { modalidade: 'corrida' as const, nivel: 'avancado' as NivelForca, blocos: MODELO_POR_ID.get('corrida_longao')!.montar('avancado') }
    expect(ajustarAoTempo(longao, perfil, 30 * 60)).toBeNull()
  })

  it('contexto: dias desde o último intenso e o último longo, e média semanal', () => {
    const hoje = '2026-11-10'
    const t = (data: string, duracao: number, dist: number, fc: number): Treino =>
      ({ id: data, modalidade: 'corrida', data_hora: `${data}T09:00:00`, duracao_seg: duracao, distancia_m: dist, fc_media: fc, potencia_media: null, potencia_normalizada: null, esforco_percebido: null }) as Treino
    const c = contextoEndurance([t('2026-11-08', 1800, 6000, 168), t('2026-11-01', 6000, 18000, 140)], perfil, 'corrida', hoje)
    expect(c.diasDesdeIntenso).toBe(2)
    expect(c.diasDesdeLongo).toBe(9)
    expect(c.semanal.distancia_m).toBe(6000)
  })
})

// -----------------------------------------------------------------------------
// Planejado × realizado
// -----------------------------------------------------------------------------

describe('planejado × realizado', () => {
  const estrutura: EstruturaTreino = {
    modalidade: 'corrida',
    objetivo: 'limiar',
    nivel: 'intermediario',
    fonte: 'catalogo',
    referencia: 'corrida_tempo_run',
    blocos: MODELO_POR_ID.get('corrida_tempo_run')!.montar('intermediario'),
  }
  const treino = { modalidade: 'corrida', duracao_seg: 2700, distancia_m: 8600, fc_media: 155, potencia_media: null, potencia_normalizada: null, esforco_percebido: null } as Treino
  const volta = (ordem: number, duracao_seg: number, distancia_m: number): Parcial =>
    ({ id: String(ordem), treino_id: 't', tipo: 'volta', ordem, duracao_seg, distancia_m, fc_media: null, fc_max: null, potencia_media: null, cadencia_media: null, elevacao_ganho_m: null, elevacao_perda_m: null, bracadas: null, estilo: null, descanso: false }) as Parcial

  it('uma volta por passo: compara cada passo com o alvo e mede a aderência', () => {
    // aquecimento Z2 (~6:00/km), 20 min no limiar (5:00/km), desaquecimento Z1 (~7:00/km)
    const voltas = [volta(1, 900, 2500), volta(2, 1200, 4000), volta(3, 600, 1430)]
    const c = compararPlano({ estrutura, distancia_planejada_m: null, duracao_planejada_seg: null }, treino, voltas, perfil)!
    expect(c.passos?.map((p) => p.situacao)).toEqual(['no_alvo', 'no_alvo', 'no_alvo'])
    expect(c.aderencia).toBe(100)
    expect(c.base).toBe('passos')
    expect(c.totais.find((l) => l.rotulo === 'Duração')).toMatchObject({ planejado: '45:00', realizado: '45:00', diferenca: '+0%', tom: 'bom' })
  })

  it('limiar feito devagar aparece como "abaixo" e derruba a aderência', () => {
    const voltas = [volta(1, 900, 2500), volta(2, 1200, 3300), volta(3, 600, 1430)]
    const c = compararPlano({ estrutura, distancia_planejada_m: null, duracao_planejada_seg: null }, treino, voltas, perfil)!
    expect(c.passos?.[1].situacao).toBe('abaixo')
    expect(c.aderencia).toBeLessThan(60)
  })

  it('sem voltas que batam com os passos: compara o tempo em cada zona pelas parciais por km', () => {
    const km = Array.from({ length: 8 }, (_, i) => ({ ...volta(i + 1, i >= 2 && i < 6 ? 300 : 360, 1000), tipo: 'km' as const }))
    const c = compararPlano({ estrutura, distancia_planejada_m: null, duracao_planejada_seg: null }, treino, km, perfil)!
    expect(c.passos).toBeNull()
    expect(c.semPassos).toMatch(/não tem voltas/)
    expect(c.zonas?.find((z) => z.zona === 4)?.realizado).toBe(1200)
    expect(c.base).toBe('zonas')
  })

  it('sem limiar nem FC no perfil: pede para cadastrar', () => {
    const km = [{ ...volta(1, 300, 1000), tipo: 'km' as const }]
    const c = compararPlano({ estrutura, distancia_planejada_m: null, duracao_planejada_seg: null }, treino, km, null)!
    expect(c.observacoes.join(' ')).toMatch(/pace de limiar/)
  })
})

// -----------------------------------------------------------------------------
// AI Endurance
// -----------------------------------------------------------------------------

describe('AI Endurance: atividades realizadas', () => {
  it('aceita os nomes de campo comuns e calcula parciais pelas amostras', () => {
    const t = lerAtividade(
      {
        id: 456,
        name: 'Rodagem',
        start_time: '2026-11-01T09:00:00Z',
        moving_time: 600,
        distance: 2000,
        average_heartrate: 150.4,
        streams: { time: Array.from({ length: 601 }, (_, i) => i), distance: Array.from({ length: 601 }, (_, i) => (i / 300) * 1000), heartrate: Array(601).fill(150) },
      },
      'corrida',
    )
    if (typeof t === 'string') throw new Error(t)
    expect(t).toMatchObject({ origem: 'ai_endurance', origem_id: 'corrida:456', nome: 'Rodagem', duracao_seg: 600, distancia_m: 2000, fc_media: 150 })
    expect(t.parciais.filter((p) => p.tipo === 'km')).toHaveLength(2)
  })

  it('voltas da natação com braçadas e descanso; data em epoch (segundos)', () => {
    const t = lerAtividade(
      {
        pk: 'abc',
        start_time_in_seconds: 1793520000,
        duration: '0:40:00',
        distance_km: 1.5,
        laps: [
          { duration: 400, distance: 400, total_strokes: 120, swim_stroke: 'freestyle' },
          { duration: 30, distance: 0 },
          { duration: 380, distance: 400, total_strokes: 118, swim_stroke: 'freestyle' },
        ],
      },
      'natacao',
    )
    if (typeof t === 'string') throw new Error(t)
    expect(t.duracao_seg).toBe(2400)
    expect(t.distancia_m).toBe(1500)
    expect(t.data_hora).toBe(new Date(1793520000 * 1000).toISOString())
    expect(t.parciais.map((p) => [p.tipo, p.descanso, p.estilo])).toEqual([
      ['volta', false, 'Crawl'],
      ['volta', true, null],
      ['volta', false, 'Crawl'],
    ])
  })

  it('o que não dá para usar vira aviso com os campos recebidos (para ajustar o mapeamento)', () => {
    expect(lerAtividade({ foo: 1, bar: 2 }, 'ciclismo')).toMatch(/sem data de início \(campos recebidos: foo, bar\)/)
    const r = lerAtividades({ count: 2, results: [{ id: 1, start_date: '2026-11-01T10:00:00Z', elapsed_time: 3600 }, { id: 2 }] }, 'ciclismo')
    expect(r.treinos).toHaveLength(1)
    expect(r.avisos.join(' ')).toMatch(/1 atividade ignorada/)
    expect(r.avisos.join(' ')).toMatch(/sem parciais/)
    expect(listaDe([1, 2])).toHaveLength(2)
    expect(listaDe('lixo')).toEqual([])
  })
})

describe('AI Endurance: treinos no formato "steps" (documentado)', () => {
  // exemplo de saída de /ess_workout/ da documentação v2.4
  const zonas = { Endurance: 231.8969506163821, Tempo: 247.10142691631026, Threshold: 291.0305694792098, VO2Max: 356.6273750348052, Anaerobic: 392.29011253828577 }
  const steps = {
    act_type: 'Ride',
    type: 'Tempo',
    duration_warmup: 600.0,
    target_warmup_high: 231.8969506163821,
    target_warmup_low: null,
    duration_cooldown: 180.0,
    target_cooldown_high: 231.8969506163821,
    target_cooldown_low: null,
    duration_add_endurance: 0,
    target_add_endurance_high: 231.8969506163821,
    target_add_endurance_low: null,
    target_on_high: 247.10142691631026,
    target_on_low: 231.8969506163821,
    target_off_high: 185.5175604931057,
    target_off_low: null,
    duration_off: 300,
    repeats: 2,
    duration_on: 3360.0,
  }

  it('vira aquecimento, 2× (tempo + recuperação) e desaquecimento, com os watts como alvo', () => {
    const e = estruturaDosSteps(steps, zonas, 'aie:1965565')!
    expect(e).toMatchObject({ modalidade: 'ciclismo', objetivo: 'limiar', fonte: 'ai_endurance', referencia: 'aie:1965565' })
    expect(e.blocos.map((b) => [b.fase, b.repeticoes, b.passos.length])).toEqual([
      ['aquecimento', 1, 1],
      ['principal', 2, 2],
      ['desaquecimento', 1, 1],
    ])
    const [on, off] = e.blocos[1].passos
    expect(on).toMatchObject({ duracao_seg: 3360, zona: 3 })
    expect(on.alvo?.potencia?.map(Math.round)).toEqual([232, 247])
    expect(off).toMatchObject({ tipo: 'recuperacao', duracao_seg: 300, zona: 1 })
    expect(alvoDoPasso('ciclismo', e.blocos[0].passos[0], null).principal).toBe('até 232 W')
    expect(totaisEstrutura(e, null).duracao_seg).toBe(600 + 2 * (3360 + 300) + 180)
  })

  it('treinos do plano: usa "steps"; formato desconhecido vira aviso', async () => {
    const r = await lerTreinosDoPlano({
      plano: { id: '9' },
      treinos: [
        { future_workout_static_id: 1965565, act_type: 'Ride', date: '2026-11-04T00:00:00Z', steps, zones: zonas },
        { id: 77, something_else: true },
      ],
      atleta: null,
    })
    expect(r.treinos).toHaveLength(1)
    expect(r.treinos[0]).toMatchObject({ referencia: 'aie:1965565', data: '2026-11-04' })
    expect(r.treinos[0].nome).toMatch(/Tempo/)
    expect(r.avisos.join(' ')).toMatch(/formato não reconhecido \(campos recebidos: id, something_else\)/)
  })
})
