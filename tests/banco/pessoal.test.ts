/**
 * Módulo Pessoal no banco: isolamento entre usuários, Bíblia somente leitura e os cálculos feitos no
 * servidor (sequência de leitura no fuso de São Paulo, adiantado/atrasado, hábitos e metas).
 */
import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

import { como, criarBanco, criarUsuario, erroDe } from './supabase-simulado'

let db: PGlite
let ana: string
let beto: string
const ids: Record<string, string> = {}

type Tx = { query: PGlite['query'] }
const um = async (tx: Tx, sql: string, params: unknown[] = []) => ((await tx.query<{ id: string }>(sql, params)).rows[0] ?? {}).id
const linha = async <T>(tx: Tx, sql: string, params: unknown[] = []) => (await tx.query<T>(sql, params)).rows[0]
const linhas = async <T>(tx: Tx, sql: string, params: unknown[] = []) => (await tx.query<T>(sql, params)).rows

beforeAll(async () => {
  db = await criarBanco()
  ana = await criarUsuario(db, 'ana@exemplo.com')
  beto = await criarUsuario(db, 'beto@exemplo.com')
  // trecho do texto (o seed real importa a Bíblia inteira)
  await db.exec(`insert into public.biblia_versiculos (id, livro_id, capitulo, versiculo, texto) values
    (1001001, 1, 1, 1, 'No principio creou Deus os céus e a terra.'),
    (1001002, 1, 1, 2, 'E a terra era sem fórma e vasia.'),
    (1001003, 1, 1, 3, 'E disse Deus: Haja luz: e houve luz.')`)
  await como(db, ana, async (tx) => {
    await tx.query('select public.pessoal_inicializar()')
    ids.area = await um(tx, "select id from public.areas_vida where nome = 'Saúde'")
    ids.objetivo = await um(tx, "insert into public.objetivos (area_id, titulo, ano) values ($1, 'Correr melhor', 2026) returning id", [ids.area])
    ids.meta = await um(
      tx,
      "insert into public.metas (objetivo_id, titulo, tipo, valor_alvo, unidade) values ($1, 'Ler 12 livros', 'numerica', 12, 'livros') returning id",
      [ids.objetivo],
    )
    ids.habito = await um(tx, "insert into public.habitos (titulo, inicio) values ('Orar', '2026-10-26') returning id")
    ids.tarefa = await um(tx, "insert into public.tarefas (titulo, data) values ('Pagar escola', '2026-11-02') returning id")
    ids.diario = await um(tx, "insert into public.diario (data, humor, gratidao, texto) values ('2026-11-01', 4, '[\"saúde\"]', 'Dia bom') returning id")
    ids.prova = await um(tx, "insert into public.provas (nome, data, tipo) values ('Sprint', '2026-12-06', 'sprint') returning id")
    ids.marcado = await um(tx, "insert into public.versiculos_marcados (versiculo_id, cor) values (1001001, 'verde') returning id")
  })
}, 120_000)

describe('Bíblia', () => {
  it('66 livros, 1.189 capítulos, e cada plano passa por todos os capítulos uma única vez', async () => {
    expect((await linha<{ n: number }>(db, 'select count(*)::int as n from public.biblia_livros')).n).toBe(66)
    expect((await linha<{ n: number }>(db, 'select sum(total_capitulos)::int as n from public.biblia_livros')).n).toBe(1189)
    const planos = await linhas<{ plano: string; n: number; distintos: number }>(
      db,
      'select plano, count(*)::int as n, count(distinct (livro_id, capitulo))::int as distintos from public.biblia_plano_ordem group by plano order by plano',
    )
    expect(planos).toEqual([
      { plano: 'cronologico', n: 1189, distintos: 1189 },
      { plano: 'paralelo', n: 1189, distintos: 1189 },
      { plano: 'sequencial', n: 1189, distintos: 1189 },
    ])
    // cronológico: Jó logo depois de Gênesis 11; paralelo: o NT entra cedo
    const cron = await linhas<{ livro_id: number; capitulo: number }>(db, "select livro_id, capitulo from public.biblia_plano_ordem where plano = 'cronologico' and posicao in (11, 12) order by posicao")
    expect(cron).toEqual([{ livro_id: 1, capitulo: 11 }, { livro_id: 18, capitulo: 1 }])
    const paralelo = await linhas<{ livro_id: number }>(db, "select livro_id from public.biblia_plano_ordem where plano = 'paralelo' and posicao <= 5 order by posicao")
    expect(paralelo.map((x) => x.livro_id)).toContain(40)
  })

  it('o texto é somente leitura para quem está logado e fechado para anônimos', async () => {
    const lido = await como(db, ana, (tx) => linhas(tx, 'select texto from public.biblia_versiculos where livro_id = 1 and capitulo = 1'))
    expect(lido).toHaveLength(3)
    expect(await erroDe(como(db, ana, (tx) => tx.query("update public.biblia_versiculos set texto = 'adulterado'")))).toMatch(/permission denied/)
    expect(await erroDe(como(db, ana, (tx) => tx.query("insert into public.biblia_versiculos values (1001004, 1, 1, 4, 'x')")))).toMatch(/permission denied/)
    expect(await erroDe(como(db, ana, (tx) => tx.query('delete from public.biblia_livros')))).toMatch(/permission denied/)
    expect(await erroDe(como(db, null, (tx) => tx.query('select * from public.biblia_versiculos')))).toMatch(/permission denied/)
  })

  it('não dá para marcar como lido um capítulo que não existe', async () => {
    expect(await erroDe(como(db, ana, (tx) => tx.query('insert into public.leitura_progresso (livro_id, capitulo) values (1, 51)')))).toMatch(/foreign key/)
    expect(await erroDe(como(db, ana, (tx) => tx.query('select public.concluir_capitulo(66, 23)')))).toMatch(/foreign key/)
  })
})

describe('inicialização do módulo', () => {
  it('cria as 7 áreas e a meta "Ler a Bíblia inteira no ano" uma única vez', async () => {
    await como(db, ana, (tx) => tx.query('select public.pessoal_inicializar()'))
    const r = await como(db, ana, async (tx) => ({
      areas: await linhas<{ nome: string }>(tx, 'select nome from public.areas_vida order by ordem'),
      biblia: await linhas<{ alvo: string; unidade: string }>(tx, "select alvo, unidade from public.metas_situacao where origem_automatica = 'biblia'"),
    }))
    expect(r.areas.map((a) => a.nome)).toEqual(['Espiritual', 'Saúde', 'Família', 'Finanças', 'Carreira', 'Estudos', 'Pessoal'])
    expect(r.biblia).toEqual([{ alvo: '1189', unidade: 'capítulos' }])
  })
})

describe('isolamento entre usuários (IDOR/BOLA)', () => {
  const tabelas = [
    ['areas_vida', 'area'],
    ['objetivos', 'objetivo'],
    ['metas', 'meta'],
    ['habitos', 'habito'],
    ['tarefas', 'tarefa'],
    ['diario', 'diario'],
    ['versiculos_marcados', 'marcado'],
  ] as const

  it.each(tabelas)('%s: outro usuário não lê, não altera e não apaga', async (tabela, chave) => {
    const r = await como(db, beto, async (tx) => ({
      lidos: (await tx.query(`select * from public.${tabela} where id = $1`, [ids[chave]])).rows.length,
      alterados: (await tx.query(`update public.${tabela} set created_at = now() where id = $1`, [ids[chave]])).affectedRows,
      apagados: (await tx.query(`delete from public.${tabela} where id = $1`, [ids[chave]])).affectedRows,
    }))
    expect(r).toEqual({ lidos: 0, alterados: 0, apagados: 0 })
  })

  it('views e funções de cálculo só enxergam os dados de quem consulta', async () => {
    const r = await como(db, beto, async (tx) => ({
      metas: await linhas(tx, 'select * from public.metas_situacao'),
      habitos: await linhas(tx, 'select * from public.habitos_resumo()'),
      leitura: await linha<{ r: { total_lidos: number } }>(tx, 'select public.leitura_resumo() as r'),
    }))
    expect(r.metas).toEqual([])
    expect(r.habitos).toEqual([])
    expect(r.leitura.r.total_lidos).toBe(0)
  })

  it('não dá para ligar um registro próprio a dados de outra pessoa', async () => {
    const tentativas = [
      ['insert into public.objetivos (area_id, titulo, ano) values ($1, $2, 2026)', [ids.area, 'x']],
      ['insert into public.metas (objetivo_id, titulo, valor_alvo) values ($1, $2, 1)', [ids.objetivo, 'x']],
      ['insert into public.metas_progresso (meta_id, valor) values ($1, $2)', [ids.meta, 1]],
      ['insert into public.metas_marcos (meta_id, titulo) values ($1, $2)', [ids.meta, 'x']],
      ['insert into public.habitos_registros (habito_id, data) values ($1, $2)', [ids.habito, '2026-11-01']],
      ['insert into public.tarefas (titulo, meta_id) values ($2, $1)', [ids.meta, 'x']],
      ['insert into public.tarefas (titulo, area_id) values ($2, $1)', [ids.area, 'x']],
    ] as const
    for (const [sql, params] of tentativas) {
      expect(await erroDe(como(db, beto, (tx) => tx.query(sql, [...params]))), sql).toMatch(/foreign key|row-level security/)
    }
    // meta de treino apontando para a prova de outra pessoa
    const erro = await erroDe(
      como(db, beto, async (tx) => {
        await tx.query('select public.pessoal_inicializar()')
        const objetivo = await um(tx, "insert into public.objetivos (area_id, titulo, ano) select id, 'x', 2026 from public.areas_vida limit 1 returning id")
        await tx.query(
          "insert into public.metas (objetivo_id, titulo, origem_automatica, treino_criterio, prova_id) values ($1, 'Completar', 'treino', 'prova', $2)",
          [objetivo, ids.prova],
        )
      }),
    )
    expect(erro).toMatch(/foreign key/)
  })

  it('não dá para gravar em nome de outra pessoa', async () => {
    expect(await erroDe(como(db, beto, (tx) => tx.query("insert into public.diario (user_id, data) values ($1, '2026-11-05')", [ana])))).toMatch(
      /row-level security/,
    )
  })
})

describe('leitura: sequência, plano e adiantado/atrasado (fuso de São Paulo)', () => {
  beforeAll(async () => {
    await como(db, ana, async (tx) => {
      await tx.query("select public.ativar_plano_leitura('sequencial', '2026-10-30', 365)")
      // 30/out, 31/out e 01/nov; o de 02/11 01:30 UTC ainda é 01/11 22:30 em São Paulo
      await tx.query(`insert into public.leitura_progresso (livro_id, capitulo, concluido_em) values
        (1, 1, '2026-10-30T12:00:00Z'), (1, 2, '2026-10-31T12:00:00Z'), (1, 3, '2026-11-01T12:00:00Z'),
        (1, 4, '2026-11-02T01:30:00Z')`)
    })
  })

  it('conta o dia pelo horário de São Paulo e calcula sequência e recorde', async () => {
    const r = await como(db, ana, (tx) => linha<{ e: { calor: { dia: string; capitulos: number }[] } }>(tx, "select public.leitura_estatisticas('2026-11-02') as e"))
    expect(r.e.calor).toEqual([
      { dia: '2026-10-30', capitulos: 1 },
      { dia: '2026-10-31', capitulos: 1 },
      { dia: '2026-11-01', capitulos: 2 },
    ])
    const seq = await como(db, ana, (tx) => linhas(tx, "select * from public.sequencia_leitura('2026-11-02')"))
    expect(seq).toEqual([{ atual: 3, recorde: 3 }])
    // um dia inteiro sem ler zera a sequência atual, o recorde fica
    const depois = await como(db, ana, (tx) => linhas(tx, "select * from public.sequencia_leitura('2026-11-03')"))
    expect(depois).toEqual([{ atual: 0, recorde: 3 }])
  })

  it('meta do dia, capítulos de hoje, esperado e diferença', async () => {
    const { r } = await como(db, ana, (tx) => linha<{ r: Record<string, unknown> }>(tx, "select public.leitura_resumo('2026-11-02') as r"))
    // 4 dias de plano (30/10 a 02/11): esperado ceil(1189·4/365) = 14; lidos 4 → 10 atrás
    expect(r).toMatchObject({ total_lidos: 4, lidos_hoje: 0, esperado: 14, diferenca: -10, sequencia: 3, recorde: 3 })
    // falta 1.185 em 362 dias → 4 por dia; os próximos do plano a partir de Gênesis 5
    expect(r.meta_diaria).toBe(4)
    expect(r.capitulos_hoje).toEqual([5, 6, 7, 8].map((c) => ({ livro_id: 1, capitulo: c, lido: false })))
    expect(r.proximo).toEqual({ livro_id: 1, capitulo: 5 })
  })

  it('concluir abre o próximo da sequência; desmarcar volta atrás', async () => {
    const r = await como(db, ana, (tx) => linha<{ r: { proximo: unknown } }>(tx, 'select public.concluir_capitulo(1, 5) as r'))
    expect(r.r.proximo).toEqual({ livro_id: 1, capitulo: 6 })
    // concluir de novo não duplica
    await como(db, ana, (tx) => tx.query('select public.concluir_capitulo(1, 5)'))
    const porLivro = await como(db, ana, (tx) => linha<{ lidos: string }>(tx, 'select lidos from public.leitura_por_livro where livro_id = 1'))
    expect(Number(porLivro.lidos)).toBe(5)
    await como(db, ana, (tx) => tx.query('delete from public.leitura_progresso where livro_id = 1 and capitulo = 5'))
    const { r: resumo } = await como(db, ana, (tx) => linha<{ r: { total_lidos: number } }>(tx, "select public.leitura_resumo('2026-11-02') as r"))
    expect(resumo.total_lidos).toBe(4)
  })

  it('data de conclusão no futuro vira agora', async () => {
    await como(db, ana, (tx) => tx.query("insert into public.leitura_progresso (livro_id, capitulo, concluido_em) values (40, 1, now() + interval '30 days')"))
    const r = await linha<{ ok: boolean }>(db, 'select concluido_em <= now() as ok from public.leitura_progresso where livro_id = 40 and capitulo = 1')
    expect(r.ok).toBe(true)
    await db.query('delete from public.leitura_progresso where livro_id = 40')
  })

  it('a meta da Bíblia segue as datas do plano e é atualizada pela leitura', async () => {
    const m = await como(db, ana, (tx) =>
      linha<{ inicio: Date; prazo: Date; valor: string }>(tx, "select inicio, prazo, valor from public.metas_situacao where origem_automatica = 'biblia'"),
    )
    expect(m.inicio.toISOString().slice(0, 10)).toBe('2026-10-30')
    expect(m.prazo.toISOString().slice(0, 10)).toBe('2027-10-29')
    expect(m.valor).toBe('4')
  })

  it('só um plano ativo por vez; plano com duração absurda é recusado', async () => {
    await como(db, ana, (tx) => tx.query("select public.ativar_plano_leitura('cronologico', '2026-10-30', 365)"))
    const ativos = await como(db, ana, (tx) => linhas<{ tipo: string }>(tx, 'select tipo from public.planos_leitura where ativo'))
    expect(ativos).toEqual([{ tipo: 'cronologico' }])
    expect(await erroDe(como(db, ana, (tx) => tx.query("select public.ativar_plano_leitura('sequencial', null, 5)")))).toMatch(/entre 30 dias/)
    expect(await erroDe(como(db, ana, (tx) => tx.query("select public.ativar_plano_leitura('qualquer', null, 365)")))).toMatch(/check constraint/)
  })
})

describe('hábitos', () => {
  beforeAll(async () => {
    await como(db, ana, async (tx) => {
      // diário desde 26/10 (segunda): falhou em 28/10
      for (const d of ['2026-10-26', '2026-10-27', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']) {
        await tx.query('insert into public.habitos_registros (habito_id, data) values ($1, $2)', [ids.habito, d])
      }
      await tx.query("insert into public.habitos_registros (habito_id, data, feito) values ($1, '2026-10-28', false)", [ids.habito])
      // segunda, quarta e sexta: falhou na sexta 30/10, fez hoje (segunda 02/11)
      ids.habitoDias = await um(tx, `insert into public.habitos (titulo, frequencia, inicio) values ('Academia', '{"tipo": "dias", "dias": [1, 3, 5]}', '2026-10-26') returning id`)
      for (const d of ['2026-10-26', '2026-10-28', '2026-11-02']) {
        await tx.query('insert into public.habitos_registros (habito_id, data) values ($1, $2)', [ids.habitoDias, d])
      }
    })
  })

  it('sequência, recorde e percentual consideram só os dias previstos; hoje sem marcar não quebra a sequência', async () => {
    const r = await como(db, ana, (tx) => linhas<Record<string, unknown>>(tx, "select * from public.habitos_resumo('2026-11-02') order by sequencia desc"))
    expect(r).toEqual([
      {
        habito_id: ids.habito, previsto_hoje: true, feito_hoje: false, sequencia: 4, recorde: 4,
        feitos_semana: 0, previstos_semana: 0, feitos_mes: 1, previstos_mes: 1,
      },
      {
        habito_id: ids.habitoDias, previsto_hoje: true, feito_hoje: true, sequencia: 1, recorde: 2,
        feitos_semana: 1, previstos_semana: 1, feitos_mes: 1, previstos_mes: 1,
      },
    ])
  })

  it('frequência inválida é recusada', async () => {
    for (const f of ['{"tipo": "dias", "dias": [0]}', '{"tipo": "dias", "dias": []}', '{"tipo": "semanal"}', '{"tipo": "dias", "dias": ["1"]}']) {
      expect(await erroDe(como(db, ana, (tx) => tx.query('insert into public.habitos (titulo, frequencia) values ($1, $2)', ['x', f]))), f).toMatch(/check constraint/)
    }
  })
})

describe('metas: progresso calculado no servidor', () => {
  it('numérica: o valor atual é a soma dos registros de progresso', async () => {
    await como(db, ana, async (tx) => {
      await tx.query("insert into public.metas_progresso (meta_id, valor, observacao) values ($1, 3, 'três livros'), ($1, 2, null)", [ids.meta])
    })
    const m = await como(db, ana, (tx) => linha<{ valor: string; percentual: string; status: string }>(tx, 'select valor, percentual, status from public.metas_situacao where id = $1', [ids.meta]))
    expect(m).toEqual({ valor: '5.00', percentual: '0.4167', status: 'em_andamento' })
    await como(db, ana, (tx) => tx.query('delete from public.metas_progresso where meta_id = $1 and valor = 2', [ids.meta]))
    const depois = await como(db, ana, (tx) => linha<{ valor_atual: string }>(tx, 'select valor_atual from public.metas where id = $1', [ids.meta]))
    expect(depois.valor_atual).toBe('3.00')
  })

  it('por marcos: progresso = marcos concluídos / total, com data de conclusão automática', async () => {
    const r = await como(db, ana, async (tx) => {
      const meta = await um(tx, "insert into public.metas (objetivo_id, titulo, tipo) values ($1, 'Curso', 'marcos') returning id", [ids.objetivo])
      await tx.query("insert into public.metas_marcos (meta_id, titulo, ordem) values ($1, 'Módulo 1', 1), ($1, 'Módulo 2', 2), ($1, 'Módulo 3', 3), ($1, 'Módulo 4', 4)", [meta])
      await tx.query("update public.metas_marcos set concluido = true where meta_id = $1 and titulo = 'Módulo 1'", [meta])
      return {
        situacao: await linha(tx, 'select valor, alvo, percentual from public.metas_situacao where id = $1', [meta]),
        marco: await linha<{ ok: boolean }>(tx, "select concluido_em = public.hoje_sp() as ok from public.metas_marcos where meta_id = $1 and titulo = 'Módulo 1'", [meta]),
      }
    })
    expect(r.situacao).toEqual({ valor: '1', alvo: '4', percentual: '0.2500' })
    expect(r.marco.ok).toBe(true)
  })

  it('atrasada quando o realizado fica abaixo do esperado para a data', async () => {
    const r = await como(db, ana, async (tx) => {
      const sql =
        "insert into public.metas (objetivo_id, titulo, valor_alvo, inicio, prazo) values ($1, $2, 10, public.hoje_sp() - 49, public.hoje_sp() + 50) returning id"
      const atrasada = await um(tx, sql, [ids.objetivo, 'Atrasada'])
      const emDia = await um(tx, sql, [ids.objetivo, 'Em dia'])
      await tx.query('insert into public.metas_progresso (meta_id, valor) values ($1, 6)', [emDia])
      return linhas<{ titulo: string; esperado: string; situacao: string }>(
        tx,
        'select titulo, esperado, situacao from public.metas_situacao where id in ($1, $2) order by titulo',
        [atrasada, emDia],
      )
    })
    expect(r).toEqual([
      { titulo: 'Atrasada', esperado: '0.5000', situacao: 'atrasada' },
      { titulo: 'Em dia', esperado: '0.5000', situacao: 'em_dia' },
    ])
  })

  it('metas de Saúde ligadas aos treinos: sessões, distância e prova-alvo', async () => {
    const r = await como(db, ana, async (tx) => {
      for (const km of [5, 8, 12]) {
        await tx.query("insert into public.treinos (modalidade, nome, data_hora, duracao_seg, distancia_m) values ('corrida', 'Corrida', now() - interval '1 day', 1800, $1)", [km * 1000])
      }
      await tx.query("insert into public.treinos (modalidade, nome, data_hora, duracao_seg, distancia_m) values ('ciclismo', 'Pedal', now() - interval '1 day', 3600, 30000)")
      const base = 'insert into public.metas (objetivo_id, titulo, origem_automatica, treino_criterio, treino_modalidade, valor_alvo, inicio, prova_id) values ($1, $2, $3, $4, $5, $6, public.hoje_sp() - 7, $7) returning id'
      const sessoes = await um(tx, base, [ids.objetivo, 'Correr 100x', 'treino', 'sessoes', 'corrida', 100, null])
      const distancia = await um(tx, base, [ids.objetivo, '500 km', 'treino', 'distancia', null, 500, null])
      const prova = await um(tx, base, [ids.objetivo, 'Completar a prova', 'treino', 'prova', null, null, ids.prova])
      const antes = await linhas<{ valor: string }>(tx, 'select valor from public.metas_situacao where id in ($1, $2, $3) order by titulo', [sessoes, distancia, prova])
      await tx.query('update public.provas set resultado_tempo_seg = 4500 where id = $1', [ids.prova])
      const depois = await linha<{ valor: string; situacao: string }>(tx, 'select valor, situacao from public.metas_situacao where id = $1', [prova])
      return { antes: antes.map((x) => x.valor), depois }
    })
    // ordem por título: "500 km", "Completar a prova", "Correr 100x"
    expect(r.antes).toEqual(['55.00', '0', '3'])
    expect(r.depois).toEqual({ valor: '1', situacao: 'concluida' })
  })

  it('visão anual agrega o progresso por área', async () => {
    const r = await como(db, ana, (tx) =>
      linhas<{ metas: string }>(tx, 'select v.metas from public.visao_anual(2026) v join public.areas_vida a on a.id = v.area_id where a.id = $1', [ids.area]),
    )
    expect(Number(r[0].metas)).toBeGreaterThanOrEqual(5)
  })
})

describe('tarefas, diário e revisões', () => {
  it('no máximo 3 prioridades por dia; conclusão registra a hora', async () => {
    const erro = await erroDe(
      como(db, ana, async (tx) => {
        for (const t of ['A', 'B', 'C', 'D']) await tx.query("insert into public.tarefas (titulo, data, foco) values ($1, '2026-11-03', true)", [t])
      }),
    )
    expect(erro).toMatch(/3 prioridades/)
    const r = await como(db, ana, async (tx) => {
      await tx.query('update public.tarefas set concluida = true where id = $1', [ids.tarefa])
      const feita = await linha<{ ok: boolean }>(tx, 'select concluida_em is not null as ok from public.tarefas where id = $1', [ids.tarefa])
      await tx.query('update public.tarefas set concluida = false where id = $1', [ids.tarefa])
      const desfeita = await linha<{ ok: boolean }>(tx, 'select concluida_em is null as ok from public.tarefas where id = $1', [ids.tarefa])
      return [feita.ok, desfeita.ok]
    })
    expect(r).toEqual([true, true])
  })

  it('diário: um por dia, humor de 1 a 5, até 3 gratidões', async () => {
    expect(await erroDe(como(db, ana, (tx) => tx.query("insert into public.diario (data) values ('2026-11-01')")))).toMatch(/duplicate key/)
    expect(await erroDe(como(db, ana, (tx) => tx.query("insert into public.diario (data, humor) values ('2026-11-04', 6)")))).toMatch(/check constraint/)
    expect(await erroDe(como(db, ana, (tx) => tx.query(`insert into public.diario (data, gratidao) values ('2026-11-04', '["a","b","c","d"]')`)))).toMatch(/check constraint/)
    expect(await erroDe(como(db, ana, (tx) => tx.query("insert into public.diario (data, texto) values ('2026-11-04', $1)", ['x'.repeat(10_001)])))).toMatch(/check constraint/)
  })

  it('revisão semanal começa na segunda; o resumo da semana junta hábitos, leitura, treinos e tarefas', async () => {
    expect(await erroDe(como(db, ana, (tx) => tx.query("insert into public.revisoes (tipo, periodo_inicio) values ('semanal', '2026-11-01')")))).toMatch(/check constraint/)
    const { r } = await como(db, ana, (tx) => linha<{ r: Record<string, unknown> }>(tx, "select public.resumo_semana('2026-10-26') as r"))
    expect(r).toMatchObject({
      inicio: '2026-10-26',
      fim: '2026-11-01',
      leitura: { capitulos: 4, dias: 3 },
      // Orar: 6 de 7 dias; Academia: 2 de 3 (seg, qua, sex)
      habitos: { feitos: 8, previstos: 10 },
      diario: { dias: 1, humor_medio: 4 },
    })
  })

  it('anotação vazia é recusada; versículo marcado com cor fora da lista também', async () => {
    expect(await erroDe(como(db, ana, (tx) => tx.query("insert into public.leitura_anotacoes (livro_id, capitulo, reflexao) values (1, 1, '  ')")))).toMatch(/check constraint/)
    expect(await erroDe(como(db, ana, (tx) => tx.query("insert into public.versiculos_marcados (versiculo_id, cor) values (1001002, 'preto')")))).toMatch(/check constraint/)
  })
})

describe('exclusão da conta', () => {
  it('apaga todos os dados do módulo Pessoal da pessoa', async () => {
    const carla = await criarUsuario(db, 'carla@exemplo.com')
    await como(db, carla, async (tx) => {
      await tx.query('select public.pessoal_inicializar()')
      await tx.query("select public.ativar_plano_leitura('paralelo')")
      await tx.query('select public.concluir_capitulo(1, 1)')
      await tx.query("insert into public.diario (texto) values ('segredo')")
      await tx.query('select public.excluir_minha_conta()')
    })
    const tabelas = ['areas_vida', 'objetivos', 'metas', 'planos_leitura', 'leitura_progresso', 'diario']
    for (const t of tabelas) {
      const r = await linha<{ n: number }>(db, `select count(*)::int as n from public.${t} where user_id = $1`, [carla])
      expect(r.n, t).toBe(0)
    }
  })
})
