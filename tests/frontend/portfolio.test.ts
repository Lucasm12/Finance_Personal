import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  ACAO_PRINCIPAL,
  CASOS,
  CASOS_NA_PAGINA,
  CASOS_PUBLICADOS,
  DOCENCIA,
  EXPERIENCIAS_QA,
  FORMACAO,
  HABILIDADES,
  MOSTRAR_PROJETOS,
  PERFIL,
  SECOES,
  casoPublicavel,
  dadosEstruturados,
  linkTelefone,
  linkWhatsApp,
  numeroSecao,
  type Caso,
} from '@/lib/portfolio'
import { ROTA_INICIO, ROTA_LOGIN, ROTA_MODULOS } from '@/modulos'

const RAIZ = path.resolve(import.meta.dirname, '../..')
const ler = (arquivo: string) => readFileSync(path.join(RAIZ, arquivo), 'utf8')

describe('portfólio na página inicial, sistema atrás do login', () => {
  it('rotas: "/" é o portfólio, o login continua em /login e a escolha de módulo foi para /sistema', () => {
    expect(ROTA_INICIO).toBe('/')
    expect(ROTA_LOGIN).toBe('/login')
    expect(ROTA_MODULOS).not.toBe(ROTA_INICIO)
  })

  it('App: portfólio público, escolha de módulo e módulos continuam protegidos', () => {
    const app = ler('src/App.tsx')
    expect(app).toMatch(/<Route path=\{ROTA_INICIO\} element=\{<Portfolio \/>\} \/>/)
    expect(app).toMatch(/<Route path=\{ROTA_LOGIN\} element=\{<Login \/>\} \/>/)
    // cada rota do sistema continua dentro de <Protegida>
    for (const rota of ['\\{ROTA_MODULOS\\}', '"/financeiro"', '"/triathlon"', '"/pessoal"']) {
      expect(app).toMatch(new RegExp(`path=${rota}\\s*element=\\{\\s*<Protegida>`))
    }
  })

  it('depois do login, vai para a escolha de módulo (e não de volta ao portfólio)', () => {
    const login = ler('src/pages/Login.tsx')
    expect(login).toMatch(/<Navigate to=\{ROTA_MODULOS\} replace \/>/)
    expect(login).toMatch(/navigate\(ROTA_MODULOS, \{ replace: true \}\)/)
    expect(login).not.toMatch(/navigate\('\/'/)
  })

  it('"Trocar de módulo" nos layouts leva à escolha de módulo', () => {
    for (const arquivo of ['src/components/layout/LayoutModulo.tsx', 'src/components/layout/TrocarModulo.tsx']) {
      const codigo = ler(arquivo)
      expect(codigo).not.toMatch(/navigate\('\/'\)/)
      expect(codigo).toMatch(/navigate\(ROTA_MODULOS\)/)
    }
  })

  it('acesso ao sistema (uso pessoal): link discreto no rodapé, fora do cabeçalho e da abertura', () => {
    expect(ler('src/components/portfolio/Rodape.tsx')).toMatch(/<Link to=\{ROTA_LOGIN\}/)
    for (const arquivo of ['src/components/portfolio/Navegacao.tsx', 'src/components/portfolio/Hero.tsx']) {
      const codigo = ler(arquivo)
      expect(codigo).not.toMatch(/ROTA_LOGIN|['"]\/login['"]|Acessar sistema/)
    }
  })

  it('o app instalado (PWA) continua abrindo direto no sistema', () => {
    const manifesto = JSON.parse(ler('public/manifest.webmanifest')) as { start_url: string }
    expect(manifesto.start_url).toBe(ROTA_MODULOS)
  })

  it('robots.txt libera o portfólio e esconde o sistema dos buscadores', () => {
    const robots = ler('public/robots.txt')
    expect(robots).toMatch(/^Allow: \/$/m)
    for (const rota of [ROTA_LOGIN, ROTA_MODULOS, '/financeiro', '/triathlon', '/pessoal']) {
      expect(robots).toContain(`Disallow: ${rota}`)
    }
  })

  it('domínio: canonical, Open Graph, robots, sitemap e dados estruturados usam o mesmo endereço', () => {
    const raiz = `${PERFIL.site}/`
    expect(PERFIL.site).toBe('https://www.lucasmarquesdev.com.br')
    const html = ler('index.html')
    expect(html).toContain(`<link rel="canonical" href="${raiz}" />`)
    expect(html).toContain(`<meta property="og:url" content="${raiz}" />`)
    expect(html).not.toMatch(/lucasmarques\.dev\.br/)
    expect(ler('public/robots.txt')).toContain(`Sitemap: ${raiz}sitemap.xml`)
    expect(ler('public/sitemap.xml')).toContain(`<loc>${raiz}</loc>`)
    expect(dadosEstruturados().url).toBe(raiz)
  })
})

describe('conteúdo do portfólio', () => {
  it('links de telefone e WhatsApp a partir do número do currículo', () => {
    expect(linkTelefone('(86) 9 9956-0160')).toBe('tel:+5586999560160')
    expect(linkWhatsApp('(86) 9 9956-0160')).toBe('https://wa.me/5586999560160')
  })

  it('links externos usam https e o e-mail é válido', () => {
    const urls = [PERFIL.linkedin, PERFIL.github, PERFIL.instagram, PERFIL.site, linkWhatsApp(PERFIL.telefone)]
    for (const url of urls) expect(url).toMatch(/^https:\/\//)
    expect(PERFIL.email).toMatch(/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/)
  })

  it('o rótulo mostrado de LinkedIn, GitHub e Instagram corresponde ao link', () => {
    const semArroba = (rotulo: string) => rotulo.replace(/^@/, '')
    expect(PERFIL.linkedin).toContain(semArroba(PERFIL.linkedinRotulo))
    expect(PERFIL.github).toContain(semArroba(PERFIL.githubRotulo))
    expect(PERFIL.instagram).toContain(semArroba(PERFIL.instagramRotulo))
  })

  it('todo ícone citado no index.html e no manifesto existe em public/', () => {
    const manifesto = JSON.parse(ler('public/manifest.webmanifest')) as { icons: { src: string }[] }
    const doHtml = [...ler('index.html').matchAll(/<link rel="(?:icon|apple-touch-icon)" href="([^"]+)"/g)].map((m) => m[1]!)
    const caminhos = [...manifesto.icons.map((i) => i.src), ...doHtml]
    expect(caminhos.length).toBeGreaterThanOrEqual(6)
    for (const src of caminhos) expect(existsSync(path.join(RAIZ, 'public', src.split('?')[0]!))).toBe(true)
    expect(existsSync(path.join(RAIZ, 'public/favicon.ico'))).toBe(true)
  })

  it('currículo: o botão só existe com um arquivo real em public/', () => {
    if (PERFIL.curriculo === null) return
    expect(PERFIL.curriculo).toMatch(/^\/.+\.pdf$/)
    expect(existsSync(path.join(RAIZ, 'public', PERFIL.curriculo))).toBe(true)
  })

  it('experiências, docência e formação completas', () => {
    expect(EXPERIENCIAS_QA.length).toBeGreaterThan(0)
    for (const e of EXPERIENCIAS_QA) {
      expect(e.cargo && e.empresa && e.periodo && e.local).toBeTruthy()
      expect(e.atividades.length).toBeGreaterThan(0)
      expect(e.tecnologias.length).toBeGreaterThan(0)
    }
    for (const d of DOCENCIA) expect(d.disciplinas?.length || d.descricao).toBeTruthy()
    expect(FORMACAO.map((f) => f.nivel)).toEqual(['Doutorado', 'Mestrado', 'Especialização', 'Bacharelado'])
    expect(new Set(HABILIDADES.map((h) => h.id)).size).toBe(HABILIDADES.length)
  })

  it('métricas: os números do currículo continuam iguais e só aparecem dentro da frase de origem', () => {
    const atividades = EXPERIENCIAS_QA.flatMap((e) => e.atividades).join('\n')
    for (const numero of ['~60%', '~30%', 'até 40%', '~25%', '~65%', '~35%']) expect(atividades).toContain(numero)
    // todo percentual é aproximado ("~") ou um teto ("até"), como no currículo
    for (const [trecho] of atividades.matchAll(/\S*\s?\d+%/g)) expect(trecho).toMatch(/^(~\d+%|até \d+%)$/)
    // nada de números soltos em destaque na abertura
    expect(ler('src/components/portfolio/Hero.tsx')).not.toMatch(/\d+%|NUMEROS|Contador/)
  })

  it('terminal: ilustração das competências, sem tempos nem contagem que pareçam testes reais', () => {
    const terminal = ler('src/components/portfolio/TerminalTestes.tsx')
    expect(terminal).not.toMatch(/\d+ms|passing|failing/)
    // a última linha do próprio terminal avisa que é uma ilustração
    expect(terminal).toContain(' · ilustração')
  })

  it('dados estruturados (schema.org) da pessoa', () => {
    const dados = dadosEstruturados()
    expect(dados['@type']).toBe('Person')
    expect(dados.name).toBe(PERFIL.nome)
    expect(dados.sameAs).toEqual([PERFIL.linkedin, PERFIL.github, PERFIL.instagram])
    expect(() => JSON.stringify(dados)).not.toThrow()
  })
})

describe('casos práticos de QA', () => {
  it('todo caso publicado está completo, com ids únicos e evidências no repositório público', () => {
    expect(CASOS_PUBLICADOS.length).toBeGreaterThan(0)
    expect(new Set(CASOS.map((c) => c.id)).size).toBe(CASOS.length)
    for (const caso of CASOS_PUBLICADOS) {
      expect(casoPublicavel(caso)).toBe(true)
      for (const e of caso.evidencias) expect(e.href).toMatch(/^https:\/\/github\.com\/Lucasm12\/Finance_Personal/)
    }
  })

  it('as evidências citadas existem neste repositório', () => {
    for (const caso of CASOS_PUBLICADOS) {
      for (const e of caso.evidencias) {
        const arquivo = e.href.split('/blob/main/')[1]
        if (arquivo) expect(existsSync(path.join(RAIZ, arquivo)), arquivo).toBe(true)
      }
    }
  })

  it('caso incompleto não é publicado (sem cartão fictício nem seção vazia)', () => {
    const base = CASOS[0]!
    const variacoes: Partial<Caso>[] = [
      { evidencias: [] },
      { evidencias: [{ rotulo: 'Link', href: 'http://exemplo.com' }] },
      { contexto: '  ' },
      { resultados: [] },
      { riscos: [] },
    ]
    for (const v of variacoes) expect(casoPublicavel({ ...base, ...v })).toBe(false)
    expect(ler('src/components/portfolio/Casos.tsx')).toMatch(/if \(CASOS_NA_PAGINA\.length === 0\) return null/)
  })
})

describe('seção Projetos fora da página e numeração das seções', () => {
  it('com MOSTRAR_PROJETOS = false: sem seção, sem link no menu e ação principal "Ver trajetória"', () => {
    expect(MOSTRAR_PROJETOS).toBe(false)
    expect(CASOS_NA_PAGINA).toEqual([])
    expect(SECOES.map((s) => s.id)).toEqual(['sobre', 'experiencia', 'habilidades', 'formacao', 'contato'])
    expect(ACAO_PRINCIPAL).toEqual({ rotulo: 'Ver trajetória', href: '#experiencia' })
    // o caso continua guardado e completo, pronto para voltar
    expect(CASOS_PUBLICADOS.length).toBeGreaterThan(0)
  })

  it('numeração "01", "02"... segue o menu e nenhum cabeçalho tem número fixo no código', () => {
    expect(SECOES.map((s) => numeroSecao(s.id))).toEqual(['01', '02', '03', '04', '05'])
    for (const arquivo of ['Sobre', 'Experiencia', 'Casos', 'Habilidades', 'Formacao', 'Contato']) {
      expect(ler(`src/components/portfolio/${arquivo}.tsx`)).not.toMatch(/numero="\d+"/)
    }
  })
})

describe('animações do portfólio', () => {
  it('as frases que se revezam no topo começam pela mesma que leitores de tela recebem', () => {
    expect(PERFIL.chamadaRevezamento[0]).toBe(PERFIL.chamadaDestaque)
    expect(new Set(PERFIL.chamadaRevezamento).size).toBe(PERFIL.chamadaRevezamento.length)
  })

  it('"reduzir movimento" desliga toda animação do CSS do portfólio', () => {
    const css = ler('src/components/portfolio/portfolio.css')
    const [, reduzir = ''] = css.split('@media (prefers-reduced-motion: reduce)')
    // classes que declaram animation: ... (inclui ::before), exceto as presas a @supports dentro de reduce
    const animadas = [...css.matchAll(/(\.pf-[a-z-]+(?:::before)?)\s*\{[^}]*\banimation:\s*pf-/g)].map((m) => m[1]!)
    expect(animadas.length).toBeGreaterThanOrEqual(8)
    for (const classe of new Set(animadas)) expect(reduzir, `${classe} sem regra de reduzir movimento`).toContain(classe)
  })
})
