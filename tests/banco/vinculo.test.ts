/**
 * Treino feito → treino planejado (migração 12): importar ou registrar um treino conclui o
 * planejado do dia (automático, só quando não há dúvida) ou o planejado escolhido.
 */
import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

import { como, criarBanco, criarUsuario, erroDe } from './supabase-simulado'

let db: PGlite
let ana: string
let beto: string

type Tx = { query: PGlite['query'] }
const linha = async <T>(tx: Tx, sql: string, params: unknown[] = []) => (await tx.query<T>(sql, params)).rows[0]

interface Planejado {
  status: string
  treino_id: string | null
  distancia_realizada_m: string | null
  duracao_realizada_seg: number | null
}

const planejar = (tx: Tx, data: string, modalidade: string, nome: string) =>
  linha<{ id: string }>(tx, 'insert into public.treinos_planejados (data, modalidade, nome, distancia_planejada_m) values ($1, $2, $3, 7500) returning id', [data, modalidade, nome]).then((x) => x.id)
const planejado = (tx: Tx, id: string) =>
  linha<Planejado>(tx, 'select status, treino_id, distancia_realizada_m, duracao_realizada_seg from public.treinos_planejados where id = $1', [id])

const item = (origem_id: string, data_hora: string, modalidade = 'corrida', extra: Record<string, unknown> = {}) => ({
  treino: { origem: 'arquivo', origem_id, modalidade, nome: 'Corrida', data_hora, duracao_seg: 2700, distancia_m: 8100 },
  parciais: [],
  ...extra,
})
const importar = (tx: Tx, itens: unknown[]) =>
  linha<{ r: { novos: number; ignorados: unknown[]; vinculados: { planejado_id: string; nome: string; treino_id: string }[]; ambiguos: number } }>(
    tx,
    'select public.importar_treinos($1::jsonb) as r',
    [JSON.stringify(itens)],
  ).then((x) => x.r)

beforeAll(async () => {
  db = await criarBanco()
  ana = await criarUsuario(db, 'ana@exemplo.com')
  beto = await criarUsuario(db, 'beto@exemplo.com')
}, 120_000)

describe('vínculo automático na importação', () => {
  it('o único planejado pendente da modalidade no dia é concluído com a distância e o tempo feitos', async () => {
    const id = await como(db, ana, (tx) => planejar(tx, '2026-11-02', 'corrida', 'Tempo run'))
    // 06:30 em São Paulo = 09:30 UTC
    const r = await como(db, ana, (tx) => importar(tx, [item('corrida:1', '2026-11-02T09:30:00Z')]))
    expect(r.vinculados).toEqual([expect.objectContaining({ planejado_id: id, nome: 'Tempo run' })])
    const p = await como(db, ana, (tx) => planejado(tx, id))
    expect(p).toMatchObject({ status: 'concluido', treino_id: r.vinculados[0].treino_id, duracao_realizada_seg: 2700 })
    expect(Number(p.distancia_realizada_m)).toBe(8100)
  })

  it('o dia é o de São Paulo: 23h30 do dia 3 (02:30 UTC do dia 4) conta para o dia 3', async () => {
    const id = await como(db, ana, (tx) => planejar(tx, '2026-11-03', 'natacao', 'Série aeróbica'))
    const r = await como(db, ana, (tx) => importar(tx, [item('natacao:1', '2026-11-04T02:30:00Z', 'natacao')]))
    expect(r.vinculados[0]?.planejado_id).toBe(id)
  })

  it('dois planejados da modalidade no dia: não escolhe, conta como ambíguo', async () => {
    const a = await como(db, ana, (tx) => planejar(tx, '2026-11-05', 'corrida', 'Rodagem manhã'))
    const b = await como(db, ana, (tx) => planejar(tx, '2026-11-05', 'corrida', 'Rodagem noite'))
    const r = await como(db, ana, (tx) => importar(tx, [item('corrida:2', '2026-11-05T09:00:00Z')]))
    expect(r.vinculados).toEqual([])
    expect(r.ambiguos).toBe(1)
    expect((await como(db, ana, (tx) => planejado(tx, a))).status).toBe('pendente')
    expect((await como(db, ana, (tx) => planejado(tx, b))).status).toBe('pendente')
  })

  it('outra modalidade, outro dia ou planejado marcado como perdido: não vincula', async () => {
    const perdido = await como(db, ana, (tx) => planejar(tx, '2026-11-06', 'ciclismo', 'Z2'))
    await como(db, ana, (tx) => tx.query("update public.treinos_planejados set status = 'perdido' where id = $1", [perdido]))
    const r = await como(db, ana, (tx) => importar(tx, [item('ciclismo:1', '2026-11-06T09:00:00Z', 'ciclismo'), item('corrida:3', '2026-11-07T09:00:00Z')]))
    expect(r.vinculados).toEqual([])
    expect((await como(db, ana, (tx) => planejado(tx, perdido))).status).toBe('perdido')
  })
})

describe('vínculo escolhido pelo usuário (importar a partir do treino planejado)', () => {
  it('conclui o planejado escolhido mesmo com dois no dia, e mesmo em outro dia', async () => {
    const noite = await como(db, ana, (tx) => linha<{ id: string }>(tx, "select id from public.treinos_planejados where nome = 'Rodagem noite'")).then((x) => x.id)
    const r = await como(db, ana, (tx) => importar(tx, [item('corrida:4', '2026-11-06T21:00:00Z', 'corrida', { planejado: noite })]))
    expect(r.vinculados[0]?.planejado_id).toBe(noite)
    expect((await como(db, ana, (tx) => planejado(tx, noite))).status).toBe('concluido')
  })

  it('treino que já existia (ficou de fora) é vinculado ao planejado escolhido', async () => {
    const id = await como(db, ana, (tx) => planejar(tx, '2026-11-02', 'corrida', 'Educativos'))
    // o mesmo arquivo do primeiro teste: já existe e já conta para o "Tempo run"
    const r1 = await como(db, ana, (tx) => importar(tx, [item('corrida:1', '2026-11-02T09:30:00Z', 'corrida', { planejado: id })]))
    expect(r1.ignorados).toHaveLength(1)
    expect(r1.vinculados).toEqual([]) // uma atividade não conta para dois planejados
    // um treino registrado à mão e ainda sem vínculo
    await como(db, ana, (tx) => tx.query("insert into public.treinos (modalidade, nome, data_hora, duracao_seg) values ('corrida', 'à mão', '2026-11-08T09:00:00Z', 1800)"))
    const r2 = await como(db, ana, (tx) => importar(tx, [item('corrida:5', '2026-11-08T09:01:00Z', 'corrida', { planejado: id })]))
    expect(r2.ignorados).toHaveLength(1)
    expect(r2.vinculados[0]?.planejado_id).toBe(id)
  })

  it('planejado de outra pessoa ou de outra modalidade não é tocado', async () => {
    const doBeto = await como(db, beto, (tx) => planejar(tx, '2026-11-09', 'corrida', 'Do Beto'))
    const pedal = await como(db, ana, (tx) => planejar(tx, '2026-11-09', 'ciclismo', 'Pedal'))
    const r = await como(db, ana, (tx) =>
      importar(tx, [item('corrida:6', '2026-11-09T09:00:00Z', 'corrida', { planejado: doBeto }), item('corrida:7', '2026-11-09T18:00:00Z', 'corrida', { planejado: pedal })]),
    )
    expect(r.vinculados).toEqual([])
    expect((await como(db, beto, (tx) => planejado(tx, doBeto))).status).toBe('pendente')
    expect((await como(db, ana, (tx) => planejado(tx, pedal))).status).toBe('pendente')
  })
})

describe('vincular_ao_planejado (registro à mão)', () => {
  it('treino registrado à mão conclui o planejado do dia', async () => {
    const id = await como(db, ana, (tx) => planejar(tx, '2026-11-10', 'corrida', 'Longão'))
    const r = await como(db, ana, async (tx) => {
      const t = await linha<{ id: string }>(tx, "insert into public.treinos (modalidade, nome, data_hora, duracao_seg, distancia_m) values ('corrida', 'Longão', '2026-11-10T08:00:00Z', 6000, 18000) returning id")
      return linha<{ v: { planejado_id: string } | null }>(tx, 'select public.vincular_ao_planejado($1) as v', [t.id])
    })
    expect(r.v?.planejado_id).toBe(id)
    expect(Number((await como(db, ana, (tx) => planejado(tx, id))).distancia_realizada_m)).toBe(18000)
  })

  it('treino de outra pessoa: nada acontece; sem login: não executa', async () => {
    const t = await como(db, ana, (tx) => linha<{ id: string }>(tx, "select id from public.treinos where nome = 'Longão'"))
    expect((await como(db, beto, (tx) => linha<{ v: unknown }>(tx, 'select public.vincular_ao_planejado($1) as v', [t.id]))).v).toBeNull()
    expect(await erroDe(como(db, null, (tx) => tx.query('select public.vincular_ao_planejado($1)', [t.id])))).toMatch(/permission denied/)
  })
})
