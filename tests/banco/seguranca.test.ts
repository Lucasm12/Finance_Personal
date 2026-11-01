/**
 * Testes de segurança do banco: aplicam todas as migrações num Postgres real (PGlite) e tentam,
 * como outro usuário ou sem login, ler, alterar e apagar dados que não são seus.
 */
import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

import { como, criarBanco, criarUsuario, erroDe } from './supabase-simulado'

let db: PGlite
let ana: string
let beto: string
const ids: Record<string, string> = {}

const um = async (tx: { query: PGlite['query'] }, sql: string, params: unknown[] = []) =>
  ((await tx.query<{ id: string }>(sql, params)).rows[0] ?? {}).id

beforeAll(async () => {
  db = await criarBanco()
  ana = await criarUsuario(db, 'ana@exemplo.com')
  beto = await criarUsuario(db, 'beto@exemplo.com')
  await como(db, ana, async (tx) => {
    ids.categoria = await um(tx, "insert into public.categorias (nome) values ('Casa') returning id")
    ids.conta = await um(tx, "insert into public.contas (categoria_id, nome) values ($1, 'Aluguel') returning id", [ids.categoria])
    ids.lancamento = await um(tx, "insert into public.lancamentos (conta_id, competencia, valor) values ($1, '2026-11-01', 1500) returning id", [ids.conta])
    ids.treino = await um(tx, "insert into public.treinos (modalidade, nome, data_hora, duracao_seg) values ('corrida', 'Longão', now(), 3600) returning id")
    ids.pesagem = await um(tx, "insert into public.pesagens (data, peso_kg, cintura_cm) values ('2026-11-01', 75.4, 82) returning id")
    ids.planejado = await um(tx, "insert into public.treinos_planejados (data, modalidade, nome) values ('2026-11-02', 'forca', 'Treino A') returning id")
    ids.serie = await um(
      tx,
      "insert into public.series_forca (planejado_id, data, exercicio_id, exercicio_nome, grupo, serie, carga_kg, repeticoes) values ($1, '2026-11-02', 'supino_reto', 'Supino reto', 'peito', 1, 40, 12) returning id",
      [ids.planejado],
    )
  })
}, 120_000)

describe('estrutura: nada fica aberto por padrão', () => {
  it('todas as tabelas do schema public têm RLS ligado', async () => {
    const r = await db.query<{ tabela: string }>(
      "select c.relname as tabela from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity",
    )
    expect(r.rows).toEqual([])
  })

  it('o papel anônimo não tem permissão em nenhuma tabela, view ou função', async () => {
    const tabelas = await db.query<{ nome: string }>(
      "select c.relname as nome from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname in ('public', 'privado') and c.relkind in ('r', 'v') and has_table_privilege('anon', c.oid, 'select,insert,update,delete')",
    )
    expect(tabelas.rows).toEqual([])
    const funcoes = await db.query<{ nome: string }>(
      "select p.proname as nome from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public', 'privado') and has_function_privilege('anon', p.oid, 'execute')",
    )
    expect(funcoes.rows).toEqual([])
  })

  it('funções security definer fixam o search_path', async () => {
    const r = await db.query<{ nome: string }>(
      "select p.proname as nome from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public', 'privado') and p.prosecdef and not coalesce(array_to_string(p.proconfig, ',') like '%search_path=%', false)",
    )
    expect(r.rows).toEqual([])
  })

  it('sem login, nenhuma tabela pode ser lida', async () => {
    expect(await erroDe(como(db, null, (tx) => tx.query('select * from public.contas')))).toMatch(/permission denied/)
    expect(await erroDe(como(db, null, (tx) => tx.query('select * from public.pesagens')))).toMatch(/permission denied/)
  })

  it('o usuário logado não lê nem executa nada do schema privado', async () => {
    expect(await erroDe(como(db, ana, (tx) => tx.query('select * from privado.auditoria')))).toMatch(/permission denied/)
    expect(await erroDe(como(db, ana, (tx) => tx.query('select privado.enviar_lembrete($1, true)', [ana])))).toMatch(/permission denied/)
    expect(await erroDe(como(db, ana, (tx) => tx.query('select * from privado.cadastro_permitido')))).toMatch(/permission denied/)
  })
})

describe('isolamento entre usuários (IDOR/BOLA)', () => {
  const tabelas = [
    ['categorias', 'categoria'],
    ['contas', 'conta'],
    ['lancamentos', 'lancamento'],
    ['treinos', 'treino'],
    ['pesagens', 'pesagem'],
    ['treinos_planejados', 'planejado'],
    ['series_forca', 'serie'],
  ] as const

  it.each(tabelas)('%s: outro usuário não lê o registro nem pelo id', async (tabela, chave) => {
    const r = await como(db, beto, (tx) => tx.query(`select * from public.${tabela} where id = $1`, [ids[chave]]))
    expect(r.rows).toHaveLength(0)
  })

  it.each(tabelas)('%s: outro usuário não altera nem apaga pelo id', async (tabela, chave) => {
    const coluna = tabela === 'lancamentos' ? 'valor' : tabela === 'pesagens' ? 'peso_kg' : tabela === 'series_forca' ? 'carga_kg' : 'nome'
    const valor = coluna === 'nome' ? "'invadido'" : '999'
    const alterado = await como(db, beto, (tx) => tx.query(`update public.${tabela} set ${coluna} = ${valor} where id = $1`, [ids[chave]]))
    const apagado = await como(db, beto, (tx) => tx.query(`delete from public.${tabela} where id = $1`, [ids[chave]]))
    expect(alterado.affectedRows).toBe(0)
    expect(apagado.affectedRows).toBe(0)
    const continua = await db.query(`select 1 from public.${tabela} where id = $1`, [ids[chave]])
    expect(continua.rows).toHaveLength(1)
  })

  it('não dá para gravar um registro em nome de outra pessoa', async () => {
    const erro = await erroDe(como(db, beto, (tx) => tx.query("insert into public.categorias (user_id, nome) values ($1, 'falsa')", [ana])))
    expect(erro).toMatch(/row-level security/)
  })

  it('não dá para "doar" um registro próprio a outra pessoa (troca de user_id)', async () => {
    const erro = await erroDe(como(db, ana, (tx) => tx.query('update public.categorias set user_id = $1 where id = $2', [beto, ids.categoria])))
    expect(erro).toMatch(/row-level security/)
  })

  it('não dá para ligar um registro próprio a um registro de outra pessoa', async () => {
    const lancamento = await erroDe(
      como(db, beto, (tx) => tx.query("insert into public.lancamentos (conta_id, competencia, valor) values ($1, '2026-12-01', 1)", [ids.conta])),
    )
    const conta = await erroDe(como(db, beto, (tx) => tx.query("insert into public.contas (categoria_id, nome) values ($1, 'x')", [ids.categoria])))
    const serie = await erroDe(
      como(db, beto, (tx) =>
        tx.query("insert into public.series_forca (planejado_id, data, exercicio_id, exercicio_nome, grupo, serie) values ($1, '2026-11-02', 'x', 'x', 'peito', 1)", [ids.planejado]),
      ),
    )
    const vinculo = await erroDe(
      como(db, beto, (tx) => tx.query("insert into public.treinos_planejados (data, modalidade, nome, status, treino_id) values ('2026-11-01', 'corrida', 'x', 'concluido', $1)", [ids.treino])),
    )
    for (const erro of [lancamento, conta, serie, vinculo]) expect(erro).toMatch(/foreign key/)
  })

  it('regressão: o que o app chama continua funcionando para quem está logado', async () => {
    await como(db, ana, async (tx) => {
      await tx.query("select public.gerar_mes('2026-12-01')")
      await tx.query('select public.importar_dados_exemplo(false)')
      await tx.query('select * from public.v_totais_mes')
      await tx.query('select * from public.v_totais_categoria_mes')
      await tx.query('select * from public.v_saldo_caixinhas')
      await tx.query('select public.status_ultimo_lembrete()')
    })
    const gerados = await db.query<{ n: number }>("select count(*)::int as n from public.lancamentos where user_id = $1 and competencia = '2026-12-01'", [ana])
    expect(gerados.rows[0].n).toBeGreaterThan(0)
  })

  it('views de totais respeitam o RLS de quem consulta', async () => {
    const r = await como(db, beto, (tx) => tx.query('select * from public.v_totais_mes'))
    expect(r.rows).toHaveLength(0)
  })
})

describe('validação de entrada no banco', () => {
  it('texto com SQL é gravado como texto, sem efeito colateral', async () => {
    const malicioso = "x'); drop table public.contas; --"
    await como(db, ana, (tx) => tx.query('insert into public.categorias (nome) values ($1)', [malicioso]))
    const r = await db.query<{ nome: string }>('select nome from public.categorias where nome = $1', [malicioso])
    expect(r.rows[0].nome).toBe(malicioso)
    expect((await db.query("select to_regclass('public.contas') as t")).rows[0]).toEqual({ t: 'contas' })
  })

  it('textos e JSON gigantes são recusados', async () => {
    const texto = await erroDe(como(db, ana, (tx) => tx.query('insert into public.categorias (nome) values ($1)', ['a'.repeat(301)])))
    expect(texto).toMatch(/categorias_nome_tamanho/)
    const grande = JSON.stringify(Array.from({ length: 3000 }, (_, i) => ({ exercicio_id: `x${i}`, nome: 'exercício '.repeat(5) })))
    const json = await erroDe(
      como(db, ana, (tx) => tx.query("insert into public.treinos_planejados (data, modalidade, nome, exercicios) values ('2026-11-03', 'forca', 'x', $1::jsonb)", [grande])),
    )
    expect(json).toMatch(/exercicios_tamanho/)
  })

  it('valores fora das regras (situação, peso, modalidade) são recusados', async () => {
    const status = await erroDe(como(db, ana, (tx) => tx.query("insert into public.treinos_planejados (data, modalidade, nome, status) values ('2026-11-03', 'corrida', 'x', 'invadido')")))
    const peso = await erroDe(como(db, ana, (tx) => tx.query("insert into public.pesagens (data, peso_kg) values ('2026-11-05', 260)")))
    const modalidade = await erroDe(como(db, ana, (tx) => tx.query("insert into public.treinos (modalidade, nome, data_hora, duracao_seg) values ('hack', 'x', now(), 60)")))
    for (const erro of [status, peso, modalidade]) expect(erro).toMatch(/check constraint/)
  })
})

describe('cadastro de usuários', () => {
  it('e-mail fora da lista não consegue criar conta, nem pela API', async () => {
    const erro = await erroDe(db.query("insert into auth.users (email) values ('intruso@exemplo.com')"))
    expect(erro).toMatch(/Cadastro não autorizado/)
  })

  it('e-mail liberado consegue (sem diferenciar maiúsculas)', async () => {
    await db.query("insert into privado.cadastro_permitido (email) values ('nova@exemplo.com')")
    expect(await erroDe(db.query("insert into auth.users (email) values ('Nova@Exemplo.com')"))).toBeNull()
  })
})

describe('lembrete por e-mail', () => {
  beforeAll(async () => {
    await db.query("insert into privado.configuracao values ('app_url', 'https://meu-app.vercel.app') on conflict (chave) do update set valor = excluded.valor")
    await db.query("select vault.create_secret('re_teste', 'resend_api_key')")
  })

  it('o botão do e-mail só aponta para o endereço oficial do app', async () => {
    await como(db, ana, (tx) => tx.query("insert into public.lembretes_email (email, link_app) values ('Ana@Exemplo.com', 'https://golpe.example')"))
    let r = await db.query<{ email: string; link_app: string | null }>('select email, link_app from public.lembretes_email where user_id = $1', [ana])
    expect(r.rows[0]).toEqual({ email: 'ana@exemplo.com', link_app: null })
    await como(db, ana, (tx) => tx.query("update public.lembretes_email set link_app = 'https://meu-app.vercel.app/' where user_id = $1", [ana]))
    r = await db.query('select email, link_app from public.lembretes_email where user_id = $1', [ana])
    expect(r.rows[0].link_app).toBe('https://meu-app.vercel.app/')
    expect(await erroDe(como(db, ana, (tx) => tx.query("update public.lembretes_email set link_app = 'http://meu-app.vercel.app' where user_id = $1", [ana])))).toBeNull()
    r = await db.query('select link_app from public.lembretes_email where user_id = $1', [ana])
    expect(r.rows[0].link_app).toBeNull()
  })

  it('o usuário não altera os campos de controle do sistema', async () => {
    const erro = await erroDe(como(db, ana, (tx) => tx.query('update public.lembretes_email set ultimo_envio = now() where user_id = $1', [ana])))
    expect(erro).toMatch(/permission denied/)
  })

  it('outro usuário não vê nem dispara o lembrete de ninguém', async () => {
    const r = await como(db, beto, (tx) => tx.query('select * from public.lembretes_email'))
    expect(r.rows).toHaveLength(0)
    const erro = await erroDe(como(db, beto, (tx) => tx.query('select public.enviar_lembrete_teste()')))
    expect(erro).toMatch(/Cadastre o e-mail/)
  })

  it('envio de teste: 1 por minuto e no máximo 5 por dia', async () => {
    const enviar = () => como(db, ana, (tx) => tx.query('select public.enviar_lembrete_teste()'))
    expect(await erroDe(enviar())).toBeNull()
    expect(await erroDe(enviar())).toMatch(/Aguarde um minuto/)
    for (let i = 0; i < 4; i++) {
      await db.query("update privado.envios_lembrete set em = em - interval '2 minutes'")
      expect(await erroDe(enviar())).toBeNull()
    }
    await db.query("update privado.envios_lembrete set em = em - interval '2 minutes'")
    expect(await erroDe(enviar())).toMatch(/Limite de 5/)
    const pedidos = await db.query<{ n: number }>("select count(*)::int as n from net.pedidos where url = 'https://api.resend.com/emails'")
    expect(pedidos.rows[0].n).toBe(5)
  })

  it('falha de configuração não vaza detalhes da infraestrutura', async () => {
    await db.query('delete from privado.envios_lembrete')
    await db.query("delete from vault.segredos where name = 'resend_api_key'")
    const erro = await erroDe(como(db, ana, (tx) => tx.query('select public.enviar_lembrete_teste()')))
    expect(erro).toMatch(/Não foi possível enviar o e-mail agora/)
    expect(erro).not.toMatch(/vault|resend|secret/i)
  })
})

describe('auditoria e LGPD', () => {
  it('exclusões ficam registradas (só identificadores, sem conteúdo)', async () => {
    await como(db, ana, (tx) => tx.query('delete from public.pesagens where id = $1', [ids.pesagem]))
    const r = await db.query<Record<string, string>>("select usuario, dono, tabela, operacao, registro from privado.auditoria where tabela = 'pesagens'")
    expect(r.rows).toEqual([{ usuario: ana, dono: ana, tabela: 'pesagens', operacao: 'DELETE', registro: ids.pesagem }])
  })

  it('sem login não dá para excluir conta', async () => {
    expect(await erroDe(como(db, null, (tx) => tx.query('select public.excluir_minha_conta()')))).toMatch(/permission denied/)
  })

  it('excluir a própria conta apaga tudo dela e nada dos outros', async () => {
    const carla = await criarUsuario(db, 'carla@exemplo.com')
    await como(db, carla, async (tx) => {
      const cat = await um(tx, "insert into public.categorias (nome) values ('Mercado') returning id")
      await tx.query("insert into public.contas (categoria_id, nome) values ($1, 'Feira')", [cat])
      await tx.query("insert into public.pesagens (data, peso_kg) values ('2026-11-01', 60)")
    })
    const antesAna = (await db.query<{ n: number }>('select count(*)::int as n from public.categorias where user_id = $1', [ana])).rows[0].n
    await como(db, carla, (tx) => tx.query('select public.excluir_minha_conta()'))
    for (const tabela of ['categorias', 'contas', 'pesagens']) {
      const r = await db.query<{ n: number }>(`select count(*)::int as n from public.${tabela} where user_id = $1`, [carla])
      expect(r.rows[0].n).toBe(0)
    }
    expect((await db.query('select 1 from auth.users where id = $1', [carla])).rows).toHaveLength(0)
    expect((await db.query("select 1 from privado.cadastro_permitido where email = 'carla@exemplo.com'")).rows).toHaveLength(0)
    expect((await db.query<{ n: number }>('select count(*)::int as n from public.categorias where user_id = $1', [ana])).rows[0].n).toBe(antesAna)
    expect((await db.query("select 1 from privado.auditoria where operacao = 'CONTA_EXCLUIDA' and dono = $1", [carla])).rows).toHaveLength(1)
  })
})
