/**
 * Testes de segurança do frontend e da configuração de publicação.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { gzipSync, zipSync } from 'fflate'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { mensagemErro } from '@/lib/erros'
import { celulaCsv } from '@/lib/exportar'
import {
  buscarDetalhes,
  demonstracaoDe,
  detalhesGuardados,
  exercicioValido,
  gifDe,
  idValido,
  pesquisarExercicios,
} from '@/lib/forca/exercisedb'
import { conferirZip, LIMITES, lerArquivos, tamanhoGz } from '@/lib/importacao/arquivos'

const RAIZ = path.resolve(import.meta.dirname, '../..')

// localStorage simulado (o teste roda no Node)
const armazenado = new Map<string, string>()
;(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => armazenado.get(k) ?? null,
  setItem: (k: string, v: string) => void armazenado.set(k, v),
  removeItem: (k: string) => void armazenado.delete(k),
}

afterEach(() => {
  vi.unstubAllGlobals()
  armazenado.clear()
})

const resposta = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status })

describe('exportação CSV: injeção de fórmula', () => {
  it.each([
    ['=HYPERLINK("http://golpe","clique")', `"'=HYPERLINK(""http://golpe"",""clique"")"`],
    ['+cmd|/C calc', "'+cmd|/C calc"],
    ['@SUM(A1:A9)', "'@SUM(A1:A9)"],
    ['-2+3', "'-2+3"],
  ])('%s vira texto', (entrada, saida) => {
    expect(celulaCsv(entrada)).toBe(saida)
  })

  it('números negativos e textos comuns não mudam', () => {
    expect(celulaCsv('-150,00')).toBe('-150,00')
    expect(celulaCsv('Aluguel')).toBe('Aluguel')
    expect(celulaCsv('Luz; água')).toBe('"Luz; água"')
  })
})

describe('integração ExerciseDB', () => {
  it('só aceita ids no formato da ExerciseDB', () => {
    expect(idValido('EIeI8Vf')).toBe(true)
    for (const ruim of ['../../x', 'a b', 'javascript:alert(1)', 'x'.repeat(40), '', null, 42]) expect(idValido(ruim)).toBe(false)
  })

  it('o GIF sempre aponta para o domínio oficial e recusa id malicioso', () => {
    expect(gifDe('EIeI8Vf')).toBe('https://static.exercisedb.dev/media/EIeI8Vf.gif')
    expect(() => gifDe('../../../evil')).toThrow()
  })

  it('id salvo no banco fora do formato é ignorado (cai no catálogo)', () => {
    expect(demonstracaoDe({ exercicio_id: 'supino_reto', exercisedb_id: 'https://evil.example/x' })).toBe('EIeI8Vf')
  })

  it('resposta com formato inesperado é descartada; textos são limitados; gifUrl de fora é ignorado', () => {
    expect(exercicioValido({ name: 'sem id' })).toBeNull()
    expect(exercicioValido('<script>')).toBeNull()
    const x = exercicioValido({
      exerciseId: 'EIeI8Vf',
      name: 'x'.repeat(5000),
      gifUrl: 'https://evil.example/rastreador.gif',
      instructions: Array.from({ length: 100 }, () => 'passo'),
      targetMuscles: ['pectorals', { obj: 1 }],
    })!
    expect(x.name).toHaveLength(200)
    expect(x.gifUrl).toBe('https://static.exercisedb.dev/media/EIeI8Vf.gif')
    expect(x.instructions).toHaveLength(30)
    expect(x.targetMuscles).toEqual(['pectorals'])
  })

  it('busca descarta resultados com id inválido', async () => {
    vi.stubGlobal('fetch', async () => resposta({ data: [{ exerciseId: 'EIeI8Vf', name: 'ok' }, { exerciseId: '../x', name: 'mau' }, 'lixo'] }))
    const r = await pesquisarExercicios('bench')
    expect(r.map((x) => x.exerciseId)).toEqual(['EIeI8Vf'])
  })

  it('detalhe com id diferente do pedido é recusado', async () => {
    vi.stubGlobal('fetch', async () => resposta({ data: { exerciseId: 'OUTROid', name: 'trocado' } }))
    await expect(buscarDetalhes('EIeI8Vf')).rejects.toThrow(/inválida/)
  })

  it('demora da API vira mensagem amigável (tempo limite)', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new DOMException('expirou', 'TimeoutError')
    })
    await expect(buscarDetalhes('EIeI8Vf')).rejects.toThrow(/demorou demais/)
  })

  it('limite de consultas (503) e indisponibilidade viram mensagens amigáveis', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 503 }))
    await expect(buscarDetalhes('EIeI8Vf')).rejects.toThrow(/limitando/)
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch')
    })
    await expect(buscarDetalhes('EIeI8Vf')).rejects.toThrow(/Sem conexão/)
  })

  it('cache adulterado no navegador é ignorado', () => {
    armazenado.set('exercisedb:EIeI8Vf', JSON.stringify({ exerciseId: 'OUTROid', name: 'x' }))
    expect(detalhesGuardados('EIeI8Vf')).toBeUndefined()
    armazenado.set('exercisedb:EIeI8Vf', '{não é json')
    expect(detalhesGuardados('EIeI8Vf')).toBeUndefined()
  })
})

describe('importação de arquivos: limites', () => {
  it('zip com arquivos demais ou grande demais descompactado é barrado antes de abrir', () => {
    expect(conferirZip(Array.from({ length: LIMITES.zipArquivos + 1 }, () => ({ originalSize: 1 })))).toMatch(/mais de/)
    expect(conferirZip([{ originalSize: LIMITES.zipDescompactado + 1 }])).toMatch(/600 MB/)
    expect(conferirZip([{ originalSize: 1024 }])).toBeNull()
  })

  it('lê o tamanho descompactado declarado no .gz', () => {
    expect(tamanhoGz(gzipSync(new Uint8Array(5000)))).toBe(5000)
  })

  it('zip bomb: um .zip pequeno que descompacta em muito é recusado', async () => {
    const original = LIMITES.zipDescompactado
    LIMITES.zipDescompactado = 100_000
    try {
      const bomba = zipSync({ 'treino.fit': new Uint8Array(2_000_000) }, { level: 9 })
      expect(bomba.length).toBeLessThan(20_000)
      const r = await lerArquivos([new File([bomba], 'export.zip')])
      expect(r.treinos).toHaveLength(0)
      expect(r.avisos.join(' ')).toMatch(/600 MB/)
    } finally {
      LIMITES.zipDescompactado = original
    }
  })

  it('arquivo maior que o limite nem é lido', async () => {
    const original = LIMITES.arquivo
    LIMITES.arquivo = 1000
    try {
      const r = await lerArquivos([new File([new Uint8Array(2000)], 'grande.fit')])
      expect(r.avisos.join(' ')).toMatch(/maior que/)
    } finally {
      LIMITES.arquivo = original
    }
  })
})

describe('mensagens de erro', () => {
  it('não repassam detalhes técnicos de coluna ausente; orientam a rodar a migração', () => {
    const m = mensagemErro({ code: 'PGRST204', message: "Could not find the 'meta_inicio' column of 'perfil_atleta' in the schema cache" })
    expect(m).toMatch(/banco está desatualizado/)
  })

  it('login inválido não diz se o e-mail existe', () => {
    expect(mensagemErro({ code: 'invalid_credentials' })).toBe('E-mail ou senha incorretos.')
  })
})

describe('segredos e publicação', () => {
  const arquivos = (dir: string, ext: RegExp): string[] =>
    readdirSync(dir).flatMap((nome) => {
      const caminho = path.join(dir, nome)
      if (statSync(caminho).isDirectory()) return nome === 'node_modules' ? [] : arquivos(caminho, ext)
      return ext.test(nome) ? [caminho] : []
    })

  // service_role (em base64 no JWT), chave secreta nova do Supabase, Resend, Stripe, AWS, chave privada, CLIENT_SECRET=...
  const SEGREDOS = [
    /c2VydmljZV9yb2xl/,
    /"role"\s*:\s*"service_role"/,
    /\bsb_secret_[A-Za-z0-9_-]{20,}/,
    /\bre_[A-Za-z0-9]{20,}/,
    /\bsk_(live|test)_[A-Za-z0-9]{10,}/,
    /AKIA[0-9A-Z]{16}/,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /CLIENT_SECRET\s*=\s*[0-9a-f]{20,}/i,
  ]

  it('nenhum segredo no código-fonte, nos scripts nem nas migrações', () => {
    const lista = [
      ...arquivos(path.join(RAIZ, 'src'), /\.(ts|tsx|css|js)$/),
      ...arquivos(path.join(RAIZ, 'scripts'), /\.(mjs|js|ts)$/),
      ...arquivos(path.join(RAIZ, 'supabase'), /\.sql$/),
      path.join(RAIZ, '.env.example'),
    ]
    for (const f of lista) {
      const conteudo = readFileSync(f, 'utf8')
      for (const padrao of SEGREDOS) expect(padrao.test(conteudo), `${path.relative(RAIZ, f)} contém ${padrao}`).toBe(false)
    }
  })

  it.skipIf(!existsSync(path.join(RAIZ, 'dist')))('nenhum segredo no bundle publicado; só a chave pública do Supabase', () => {
    for (const f of arquivos(path.join(RAIZ, 'dist'), /\.(js|html|css)$/)) {
      const conteudo = readFileSync(f, 'utf8')
      for (const padrao of SEGREDOS) expect(padrao.test(conteudo), `${path.relative(RAIZ, f)} contém ${padrao}`).toBe(false)
    }
  })

  it('.env não é versionado', () => {
    const gitignore = readFileSync(path.join(RAIZ, '.gitignore'), 'utf8')
    expect(gitignore).toMatch(/^\.env$/m)
    expect(gitignore).toMatch(/^\.env\.\*$/m)
  })

  it('cabeçalhos de segurança na Vercel: CSP sem scripts embutidos, anti-clickjacking, HSTS', () => {
    const vercel = JSON.parse(readFileSync(path.join(RAIZ, 'vercel.json'), 'utf8')) as { headers: { headers: { key: string; value: string }[] }[] }
    const h = Object.fromEntries(vercel.headers[0].headers.map((x) => [x.key, x.value]))
    const csp = h['Content-Security-Policy']
    expect(csp).toMatch(/script-src 'self';/)
    expect(csp).not.toMatch(/script-src[^;]*(unsafe-inline|unsafe-eval)/)
    expect(csp).toMatch(/frame-ancestors 'none'/)
    expect(csp).toMatch(/object-src 'none'/)
    expect(csp).toMatch(/connect-src[^;]*https:\/\/oss\.exercisedb\.dev/)
    expect(h['X-Frame-Options']).toBe('DENY')
    expect(h['X-Content-Type-Options']).toBe('nosniff')
    expect(h['Strict-Transport-Security']).toMatch(/max-age=\d{7,}/)
  })

  it('o HTML não tem script embutido (a CSP os bloquearia)', () => {
    const html = readFileSync(path.join(RAIZ, 'index.html'), 'utf8')
    for (const tag of html.match(/<script\b[^>]*>/g) ?? []) expect(tag).toMatch(/\bsrc=/)
  })
})
