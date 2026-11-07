import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const RAIZ = path.resolve(import.meta.dirname, '../..')
const ler = (arquivo: string) => readFileSync(path.join(RAIZ, arquivo), 'utf8')

describe('layout dos módulos no celular e no tablet', () => {
  const layout = ler('src/components/layout/LayoutModulo.tsx')

  it('links do topo e barra inferior trocam no mesmo breakpoint (nunca as duas, nunca nenhuma)', () => {
    const topo = layout.match(/<nav className="[^"]*\bhidden\b[^"]*\b(sm|md|lg|xl):flex\b/)?.[1]
    const inferior = layout.match(/fixed inset-x-0 bottom-0[^"]*\b(sm|md|lg|xl):hidden\b/)?.[1]
    const respiro = layout.match(/pb-\[calc\(5rem[^']*\b(sm|md|lg|xl):pb-10/)?.[1]
    expect(topo).toBeDefined()
    expect(inferior).toBe(topo)
    expect(respiro).toBe(topo)
  })

  it('diálogos: conteúdo em grid-cols-1 (minmax(0, 1fr)), para texto longo não esticar a janela além da tela', () => {
    // sem isso, "Família e relacionamentos" em "Áreas da vida" empurrava os botões 60 px para fora num celular de 320 px
    expect(ler('src/components/ui/dialog.tsx')).toMatch(/z-50 grid grid-cols-1\b/)
    expect(ler('src/components/ui/alert-dialog.tsx')).toMatch(/z-50 grid grid-cols-1\b/)
  })

  it('fieldset pode encolher (o padrão do navegador é min-width: min-content)', () => {
    expect(ler('src/index.css')).toMatch(/fieldset\s*\{\s*min-width:\s*0;?\s*\}/)
  })

  it('com 7 links (Triathlon), o topo só mostra links a partir de lg: entre 768 e ~960 px a página rolava para o lado', () => {
    const links = (ler('src/components/layout/LayoutTriathlon.tsx').match(/para: ROTAS_TRIATHLON\./g) ?? []).length
    expect(links).toBe(7)
    expect(layout).toMatch(/<nav className="[^"]*\blg:flex\b/)
    // se não couberem, rolam dentro do cabeçalho em vez de empurrar a página
    expect(layout).toMatch(/<nav className="[^"]*\bmin-w-0\b[^"]*\boverflow-x-auto\b/)
  })
})
