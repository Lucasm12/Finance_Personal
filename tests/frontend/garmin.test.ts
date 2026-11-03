/**
 * Exportação de treino planejado para o relógio Garmin (.FIT de treino): passos, alvos e o
 * arquivo lido de volta pelo decodificador oficial da Garmin.
 */
import { Decoder, Stream } from '@garmin/fitsdk'
import { describe, expect, it } from 'vitest'

import { alvoGarmin, gerarFit, montarTreinoGarmin, nomeArquivoFit, textoRelogio, totalPassos, type TreinoParaExportar } from '@/lib/exportacao/garmin'
import { MODELO_POR_ID } from '@/lib/sugestoes/catalogo'
import type { EstruturaTreino, NivelForca, PerfilAtleta } from '@/types/triathlon'

const perfil = { ftp_w: 250, fc_limiar: 170, pace_limiar_seg_km: 300, css_seg_100m: 110 } as PerfilAtleta

function doCatalogo(id: string, nivel: NivelForca = 'intermediario'): TreinoParaExportar {
  const modelo = MODELO_POR_ID.get(id)!
  const estrutura: EstruturaTreino = { modalidade: modelo.modalidade, objetivo: modelo.objetivo, nivel, blocos: modelo.montar(nivel), fonte: 'catalogo', referencia: id }
  return { data: '2026-11-05', nome: modelo.nome, modalidade: modelo.modalidade, descricao: null, estrutura, distancia_planejada_m: null, duracao_planejada_seg: null }
}

async function ler(bytes: Uint8Array) {
  const decoder = new Decoder(Stream.fromByteArray(bytes))
  expect(decoder.isFIT()).toBe(true)
  expect(decoder.checkIntegrity()).toBe(true)
  const { messages, errors } = decoder.read()
  expect(errors).toEqual([])
  return messages
}

describe('treino para o relógio Garmin', () => {
  it('intervalado de corrida: aquecimento, 6× (800 m + 2 min) com repetição e desaquecimento, alvos de ritmo', async () => {
    const t = montarTreinoGarmin(doCatalogo('corrida_intervalado'), perfil)
    expect(t.nome).toBe('05/11 Intervalado')
    expect(t.grupos.map((g) => g.vezes)).toEqual([1, 6, 1])
    expect(totalPassos(t)).toBe(5)

    const msgs = await ler(await gerarFit(t, new Date('2026-11-03T12:00:00Z')))
    expect(msgs.fileIdMesgs[0].type).toBe('workout')
    expect(msgs.workoutMesgs[0]).toMatchObject({ sport: 'running', wktName: '05/11 Intervalado', numValidSteps: 5 })

    const passos = msgs.workoutStepMesgs
    expect(passos).toHaveLength(5)
    // aquecimento 15 min em Z2 (78–88% da velocidade de limiar de 5:00/km)
    expect(passos[0]).toMatchObject({ intensity: 'warmup', durationType: 'time', durationTime: 900, targetType: 'speed' })
    expect(passos[0].customTargetSpeedLow).toBeCloseTo((1000 / 300) * 0.78, 2)
    expect(passos[0].customTargetSpeedHigh).toBeCloseTo((1000 / 300) * 0.88, 2)
    // tiro de 800 m e recuperação de 2 min
    expect(passos[1]).toMatchObject({ intensity: 'active', durationType: 'distance', durationDistance: 800, targetType: 'speed' })
    expect(passos[2]).toMatchObject({ intensity: 'recovery', durationType: 'time', durationTime: 120 })
    // repetir desde o passo 1, 6 vezes no total
    expect(passos[3]).toMatchObject({ durationType: 'repeatUntilStepsCmplt', durationStep: 1, repeatSteps: 6 })
    expect(passos[4]).toMatchObject({ intensity: 'cooldown', durationType: 'time', durationTime: 600 })
    // notas com zona, ritmo, FC e PSE, sem símbolos que o relógio não mostra
    expect(passos[1].notes).toMatch(/^Z5 VO2máx - .*\/km/)
  })

  it('pedal com FTP: alvo de potência; sem FTP mas com FC de limiar: alvo de FC', async () => {
    const treino = doCatalogo('ciclismo_endurance_z2')
    const comFtp = await ler(await gerarFit(montarTreinoGarmin(treino, perfil)))
    expect(comFtp.workoutMesgs[0].sport).toBe('cycling')
    const principal = comFtp.workoutStepMesgs.find((s) => s.intensity === 'active')!
    // no FIT, potência vai como watts + 1000 e FC como bpm + 100
    expect(principal).toMatchObject({ targetType: 'power', customTargetPowerLow: 1000 + Math.round(250 * 0.56), customTargetPowerHigh: 1000 + Math.round(250 * 0.75) })

    const semFtp = montarTreinoGarmin(treino, { ...perfil, ftp_w: null })
    const passo = semFtp.grupos.flatMap((g) => g.passos).find((p) => p.intensidade === 'active')!
    expect(passo.alvo).toEqual({ tipo: 'fc', faixa: [Math.round(170 * 0.85), Math.round(170 * 0.9)] })
    const lido = await ler(await gerarFit(semFtp))
    expect(lido.workoutStepMesgs.find((s) => s.intensity === 'active')).toMatchObject({
      targetType: 'heartRate',
      customTargetHeartRateLow: 100 + Math.round(170 * 0.85),
      customTargetHeartRateHigh: 100 + Math.round(170 * 0.9),
    })
  })

  it('natação: piscina, distância por passo, descanso parado e estilo', async () => {
    const t = montarTreinoGarmin(doCatalogo('natacao_tecnica'), perfil, { piscina_m: 50 })
    const msgs = await ler(await gerarFit(t))
    expect(msgs.workoutMesgs[0]).toMatchObject({ sport: 'swimming', subSport: 'lapSwimming', poolLength: 50, poolLengthUnit: 'metric' })
    const [aquec, educativo, descanso, repetir] = msgs.workoutStepMesgs
    expect(aquec).toMatchObject({ intensity: 'warmup', durationType: 'distance', durationDistance: 300, targetType: 'swimStroke', targetStrokeType: 'freestyle' })
    expect(educativo).toMatchObject({ intensity: 'active', durationDistance: 50, targetStrokeType: 'drill' })
    expect(descanso).toMatchObject({ intensity: 'rest', durationType: 'time', durationTime: 20, targetType: 'open' })
    expect(repetir).toMatchObject({ durationType: 'repeatUntilStepsCmplt', durationStep: 1, repeatSteps: 8 })
  })

  it('alvo absoluto da AI Endurance vale mais que o do perfil; sem limiar nem FC, sem alvo', () => {
    const passo = { tipo: 'esforco' as const, duracao_seg: 600, distancia_m: null, zona: 3, alvo: { potencia: [200, 220] as [number, number] } }
    expect(alvoGarmin('ciclismo', passo, perfil)).toEqual({ tipo: 'potencia', faixa: [200, 220] })
    expect(alvoGarmin('corrida', { ...passo, alvo: null }, null)).toBeNull()
    // tiro curto: FC não serve de alvo
    expect(alvoGarmin('corrida', { ...passo, alvo: null, duracao_seg: 30 }, { ...perfil, pace_limiar_seg_km: null })).toBeNull()
  })

  it('treino sem estrutura vira um passo com a distância planejada', async () => {
    const t = montarTreinoGarmin(
      { data: '2026-11-08', nome: 'Longão', modalidade: 'corrida', descricao: 'ritmo confortável', estrutura: null, distancia_planejada_m: 18000, duracao_planejada_seg: 6000 },
      perfil,
    )
    const msgs = await ler(await gerarFit(t))
    expect(msgs.workoutStepMesgs).toHaveLength(1)
    expect(msgs.workoutStepMesgs[0]).toMatchObject({ durationType: 'distance', durationDistance: 18000, targetType: 'open', wktStepName: 'Longão' })
    expect(msgs.workoutMesgs[0].wktDescription).toBe('ritmo confortável')
  })

  it('musculação não vai para o relógio', () => {
    expect(() =>
      montarTreinoGarmin({ data: '2026-11-08', nome: 'Treino A', modalidade: 'forca', descricao: null, estrutura: null, distancia_planejada_m: null, duracao_planejada_seg: null }, perfil),
    ).toThrow()
  })

  it('textos e nome do arquivo', () => {
    expect(textoRelogio('Intervalado 6×800 m · Z5 VO₂máx – forte 🔥', 60)).toBe('Intervalado 6x800 m - Z5 VO2máx - forte')
    expect(textoRelogio('a'.repeat(50), 30)).toHaveLength(30)
    expect(nomeArquivoFit({ data: '2026-11-05', nome: 'Intervalado 6×800 m' })).toBe('2026-11-05-intervalado-6x800-m.fit')
    expect(nomeArquivoFit({ data: '2026-11-05', nome: '***' })).toBe('2026-11-05-treino.fit')
  })
})
