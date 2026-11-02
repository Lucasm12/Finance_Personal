/**
 * Endurance no banco: importação sem duplicidade (public.importar_treinos), parciais guardadas
 * com o treino, sugestões salvas, estrutura do treino planejado e o vínculo com a AI Endurance —
 * sempre isolado por usuário.
 */
import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

import { como, criarBanco, criarUsuario, erroDe } from './supabase-simulado'

let db: PGlite
let ana: string
let beto: string

type Tx = { query: PGlite['query'] }
const linha = async <T>(tx: Tx, sql: string, params: unknown[] = []) => (await tx.query<T>(sql, params)).rows[0]
const linhas = async <T>(tx: Tx, sql: string, params: unknown[] = []) => (await tx.query<T>(sql, params)).rows

interface Resultado {
  novos: number
  completados: number
  parciais: number
  ignorados: { origem_id: string; treino_id: string; nome: string }[]
}

const corrida = (origem_id: string, data_hora = '2026-11-01T09:00:00Z', extra: Record<string, unknown> = {}) => ({
  treino: { origem: 'arquivo', origem_id, modalidade: 'corrida', nome: 'Corrida 01/11', data_hora, duracao_seg: 1500, distancia_m: 5000, fc_media: 150, dados: { arquivo: 'a.fit' }, ...extra },
  parciais: [1, 2, 3, 4, 5].map((ordem) => ({ tipo: 'km', ordem, duracao_seg: 300 - ordem, distancia_m: 1000, fc_media: 145 + ordem, elevacao_ganho_m: 3, elevacao_perda_m: 2 })),
})

const importar = (tx: Tx, itens: unknown[]) =>
  linha<{ r: Resultado }>(tx, 'select public.importar_treinos($1::jsonb) as r', [JSON.stringify(itens)]).then((x) => x.r)

beforeAll(async () => {
  db = await criarBanco()
  ana = await criarUsuario(db, 'ana@exemplo.com')
  beto = await criarUsuario(db, 'beto@exemplo.com')
}, 120_000)

describe('importar_treinos: treino + parciais, sem duplicar', () => {
  it('grava o treino e as parciais', async () => {
    const r = await como(db, ana, (tx) => importar(tx, [corrida('corrida:29000000')]))
    expect(r).toMatchObject({ novos: 1, completados: 0, parciais: 5, ignorados: [] })
    const p = await como(db, ana, (tx) =>
      linhas<{ ordem: number; duracao_seg: string }>(tx, "select p.ordem, p.duracao_seg from public.treino_parciais p join public.treinos t on t.id = p.treino_id where t.origem_id = 'corrida:29000000' order by ordem"),
    )
    expect(p.map((x) => x.ordem)).toEqual([1, 2, 3, 4, 5])
    expect(Number(p[0].duracao_seg)).toBe(299)
  })

  it('o mesmo arquivo de novo não cria outro registro e volta em "ignorados"', async () => {
    const r = await como(db, ana, (tx) => importar(tx, [corrida('corrida:29000000')]))
    expect(r.novos).toBe(0)
    expect(r.ignorados).toHaveLength(1)
    expect(r.ignorados[0].nome).toBe('Corrida 01/11')
    const n = await como(db, ana, (tx) => linha<{ n: number }>(tx, 'select count(*)::int as n from public.treinos'))
    expect(n.n).toBe(1)
  })

  it('a mesma atividade vinda de outra fonte (2 min de diferença) também é reconhecida', async () => {
    const aie = { ...corrida('corrida:123', '2026-11-01T09:02:00Z'), treino: { ...corrida('x', '2026-11-01T09:02:00Z').treino, origem: 'ai_endurance', origem_id: 'corrida:123' } }
    const r = await como(db, ana, (tx) => importar(tx, [aie]))
    expect(r).toMatchObject({ novos: 0, completados: 0 })
    expect(r.ignorados).toHaveLength(1)
  })

  it('modalidade diferente ou horário longe não é duplicado', async () => {
    const pedal = corrida('ciclismo:1', '2026-11-01T09:00:00Z', { modalidade: 'ciclismo' })
    const outra = corrida('corrida:outra-hora', '2026-11-01T18:00:00Z')
    const r = await como(db, ana, (tx) => importar(tx, [pedal, outra]))
    expect(r.novos).toBe(2)
  })

  it('"completar" atualiza o treino registrado à mão (mantém nome e anotação) e grava as parciais', async () => {
    const manual = await como(db, ana, (tx) =>
      linha<{ id: string }>(
        tx,
        "insert into public.treinos (modalidade, nome, data_hora, duracao_seg, observacao, esforco_percebido) values ('natacao', 'Piscina com a equipe', '2026-11-03T06:30:00Z', 2700, 'água fria', 6) returning id",
      ),
    )
    const item = {
      treino: { origem: 'arquivo', origem_id: 'natacao:29001', modalidade: 'natacao', nome: 'Natação 03/11', data_hora: '2026-11-03T06:31:00Z', duracao_seg: 2650, distancia_m: 2000 },
      parciais: [
        { tipo: 'volta', ordem: 1, duracao_seg: 400, distancia_m: 400, bracadas: 120, estilo: 'Crawl' },
        { tipo: 'volta', ordem: 2, duracao_seg: 60, distancia_m: 0, descanso: true },
      ],
      completar: true,
    }
    const r = await como(db, ana, (tx) => importar(tx, [item]))
    expect(r).toMatchObject({ novos: 0, completados: 1, parciais: 2 })
    const t = await como(db, ana, (tx) =>
      linha<{ id: string; nome: string; observacao: string; esforco_percebido: number; distancia_m: string; origem: string; origem_id: string }>(
        tx,
        'select id, nome, observacao, esforco_percebido, distancia_m, origem, origem_id from public.treinos where id = $1',
        [manual.id],
      ),
    )
    expect(t).toMatchObject({ nome: 'Piscina com a equipe', observacao: 'água fria', esforco_percebido: 6, origem: 'arquivo', origem_id: 'natacao:29001' })
    expect(Number(t.distancia_m)).toBe(2000)
    const descanso = await como(db, ana, (tx) => linha<{ descanso: boolean }>(tx, 'select descanso from public.treino_parciais where treino_id = $1 and ordem = 2', [manual.id]))
    expect(descanso.descanso).toBe(true)
  })

  it('reimportar com "completar" substitui as parciais (não acumula)', async () => {
    const item = { ...corrida('corrida:29000000'), parciais: corrida('x').parciais.slice(0, 3), completar: true }
    await como(db, ana, (tx) => importar(tx, [item]))
    const n = await como(db, ana, (tx) =>
      linha<{ n: number }>(tx, "select count(*)::int as n from public.treino_parciais p join public.treinos t on t.id = p.treino_id where t.origem_id = 'corrida:29000000'"),
    )
    expect(n.n).toBe(3)
  })

  it('valida a entrada: lote vazio ou grande demais, sem origem, valores fora da faixa', async () => {
    expect(await erroDe(como(db, ana, (tx) => importar(tx, [])))).toMatch(/1 a 50/)
    expect(await erroDe(como(db, ana, (tx) => importar(tx, Array.from({ length: 51 }, (_, i) => corrida(`c:${i}`)))))).toMatch(/1 a 50/)
    expect(await erroDe(como(db, ana, (tx) => importar(tx, [{ treino: { ...corrida('x').treino, origem: 'manual' }, parciais: [] }])))).toMatch(/sem origem/)
    const ruim = { ...corrida('corrida:ruim', '2026-10-01T09:00:00Z'), parciais: [{ tipo: 'km', ordem: 1, duracao_seg: 300, fc_media: 999 }] }
    expect(await erroDe(como(db, ana, (tx) => importar(tx, [ruim])))).toMatch(/check constraint/)
    // a transação inteira volta: nem o treino ficou
    const n = await como(db, ana, (tx) => linha<{ n: number }>(tx, "select count(*)::int as n from public.treinos where origem_id = 'corrida:ruim'"))
    expect(n.n).toBe(0)
  })

  it('o usuário só enxerga (e só deduplica contra) os próprios treinos', async () => {
    // Beto importa a mesma corrida da Ana: para ele é nova
    const r = await como(db, beto, (tx) => importar(tx, [corrida('corrida:29000000')]))
    expect(r.novos).toBe(1)
    const daAna = await como(db, beto, (tx) => linhas(tx, 'select * from public.treino_parciais where user_id = $1', [ana]))
    expect(daAna).toHaveLength(0)
  })

  it('sem login, não executa', async () => {
    expect(await erroDe(como(db, null, (tx) => importar(tx, [corrida('x')])))).toMatch(/permission denied/)
  })
})

describe('parciais e sugestões: isolamento e integridade', () => {
  it('não dá para pendurar uma parcial no treino de outra pessoa', async () => {
    const treinoAna = await como(db, ana, (tx) => linha<{ id: string }>(tx, "select id from public.treinos where origem_id = 'corrida:29000000'"))
    const erro = await erroDe(
      como(db, beto, (tx) => tx.query("insert into public.treino_parciais (treino_id, tipo, ordem, duracao_seg) values ($1, 'km', 99, 300)", [treinoAna.id])),
    )
    expect(erro).toMatch(/foreign key/)
  })

  it('apagar o treino apaga as parciais', async () => {
    const t = await como(db, ana, (tx) => linha<{ id: string }>(tx, "select id from public.treinos where origem_id = 'corrida:outra-hora'"))
    await como(db, ana, (tx) => tx.query('delete from public.treinos where id = $1', [t.id]))
    const n = await db.query<{ n: number }>('select count(*)::int as n from public.treino_parciais where treino_id = $1', [t.id])
    expect(n.rows[0].n).toBe(0)
  })

  it('sugestão salva: a mesma (fonte, referência, nível) não entra duas vezes; outra pessoa não vê', async () => {
    const sql =
      "insert into public.sugestoes_salvas (modalidade, nome, objetivo, nivel, fonte, referencia, duracao_seg, estrutura) values ('corrida', 'Tempo run', 'limiar', 'intermediario', 'catalogo', 'corrida_tempo_run', 3000, '{\"blocos\": []}') returning id"
    const s = await como(db, ana, (tx) => linha<{ id: string }>(tx, sql))
    expect(await erroDe(como(db, ana, (tx) => tx.query(sql)))).toMatch(/duplicate key/)
    // personalizada sem referência pode repetir
    const livre = "insert into public.sugestoes_salvas (modalidade, nome, objetivo, nivel, fonte, estrutura) values ('natacao', 'Minha série', 'tecnica', 'iniciante', 'personalizada', '{}')"
    await como(db, ana, async (tx) => {
      await tx.query(livre)
      await tx.query(livre)
    })
    expect(await como(db, beto, (tx) => linhas(tx, 'select * from public.sugestoes_salvas where id = $1', [s.id]))).toHaveLength(0)
    expect(await erroDe(como(db, ana, (tx) => tx.query("insert into public.sugestoes_salvas (modalidade, nome, objetivo, nivel, estrutura) values ('corrida', 'x', 'limiar', 'intermediario', '[1,2]')")))).toMatch(
      /check constraint/,
    )
  })

  it('treino planejado guarda a estrutura e a sugestão; academia não aceita estrutura; não aponta para sugestão alheia', async () => {
    const s = await como(db, ana, (tx) => linha<{ id: string }>(tx, "select id from public.sugestoes_salvas where referencia = 'corrida_tempo_run'"))
    await como(db, ana, (tx) =>
      tx.query("insert into public.treinos_planejados (data, modalidade, nome, estrutura, sugestao_id) values ('2026-11-05', 'corrida', 'Tempo run', '{\"blocos\": []}', $1)", [s.id]),
    )
    expect(
      await erroDe(como(db, ana, (tx) => tx.query("insert into public.treinos_planejados (data, modalidade, nome, estrutura) values ('2026-11-05', 'forca', 'Treino A', '{}')"))),
    ).toMatch(/check constraint/)
    expect(
      await erroDe(
        como(db, beto, (tx) => tx.query("insert into public.treinos_planejados (data, modalidade, nome, sugestao_id) values ('2026-11-05', 'corrida', 'x', $1)", [s.id])),
      ),
    ).toMatch(/foreign key/)
    // apagar a sugestão salva não apaga o agendado (só desfaz o vínculo)
    await como(db, ana, (tx) => tx.query('delete from public.sugestoes_salvas where id = $1', [s.id]))
    const p = await como(db, ana, (tx) => linha<{ sugestao_id: string | null; estrutura: unknown }>(tx, "select sugestao_id, estrutura from public.treinos_planejados where nome = 'Tempo run'"))
    expect(p.sugestao_id).toBeNull()
    expect(p.estrutura).toEqual({ blocos: [] })
  })
})

describe('AI Endurance: vínculo do atleta', () => {
  it('o usuário lê só o próprio atleta e não consegue mudar o vínculo', async () => {
    await db.query("insert into privado.ai_endurance_atletas (user_id, aie_user_id) values ($1, '12345')", [ana])
    expect((await como(db, ana, (tx) => linha<{ a: string }>(tx, 'select public.ai_endurance_atleta() as a'))).a).toBe('12345')
    expect((await como(db, beto, (tx) => linha<{ a: string | null }>(tx, 'select public.ai_endurance_atleta() as a'))).a).toBeNull()
    expect(await erroDe(como(db, beto, (tx) => tx.query("insert into privado.ai_endurance_atletas (user_id, aie_user_id) values ($1, '999')", [beto])))).toMatch(
      /permission denied/,
    )
    expect(await erroDe(como(db, null, (tx) => tx.query('select public.ai_endurance_atleta()')))).toMatch(/permission denied/)
  })

  it('id de atleta fora do formato é recusado', async () => {
    expect(await erroDe(db.query("insert into privado.ai_endurance_atletas (user_id, aie_user_id) values ($1, '../1')", [beto]))).toMatch(/check constraint/)
  })
})
