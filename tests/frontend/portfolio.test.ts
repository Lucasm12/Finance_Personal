import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  DOCENCIA,
  EXPERIENCIAS_QA,
  FORMACAO,
  HABILIDADES,
  PERFIL,
  PROJETOS,
  PUBLICACOES,
  dadosEstruturados,
  linkTelefone,
  linkWhatsApp,
  todasAsFerramentas,
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

  it('publicações aparecem na Formação e continuam disponíveis para a seção de Projetos', () => {
    expect(PUBLICACOES.length).toBe(2)
    for (const p of PUBLICACOES) expect(PROJETOS.some((proj) => proj.id === p.id)).toBe(true)
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
  })

  it('o sistema aparece como projeto em destaque; ids únicos', () => {
    expect(PROJETOS.some((p) => p.id === 'plataforma')).toBe(true)
    expect(new Set(PROJETOS.map((p) => p.id)).size).toBe(PROJETOS.length)
    expect(new Set(HABILIDADES.map((h) => h.id)).size).toBe(HABILIDADES.length)
  })

  it('letreiro: ferramentas sem repetição e sem os temas de pesquisa', () => {
    const ferramentas = todasAsFerramentas()
    expect(new Set(ferramentas).size).toBe(ferramentas.length)
    expect(ferramentas).toContain('Cypress')
    expect(ferramentas).not.toContain('Machine Learning')
  })

  it('dados estruturados (schema.org) da pessoa', () => {
    const dados = dadosEstruturados()
    expect(dados['@type']).toBe('Person')
    expect(dados.name).toBe(PERFIL.nome)
    expect(dados.sameAs).toEqual([PERFIL.linkedin, PERFIL.github, PERFIL.instagram])
    expect(() => JSON.stringify(dados)).not.toThrow()
  })
})
