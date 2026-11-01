/**
 * Módulo Pessoal no frontend: leitor do módulo da Bíblia usado pelo seed, datas no fuso de São Paulo
 * e as regras de navegação e de adiantado/atrasado.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { deflateSync } from 'node:zlib'
import { zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'

import { mensagemErro } from '@/lib/erros'
import { diaSP, hojeSP, previstoNoDia, semanaParaRevisao, situacaoLeitura, textoFrequencia, vizinho } from '@/lib/pessoal'
import type { LivroBiblia } from '@/types/pessoal'

import { arquivosDoZip, conferir, idVersiculo, lerModulo, limparTexto, VERSIFICACAO_KJV } from '../../scripts/biblia/sword.mjs'

const RAIZ = path.resolve(import.meta.dirname, '../..')

type Versos = { livro: number; capitulo: number; versiculo: number; texto: string }[]

/** Livros como a migração cadastra: (id, 'nome', 'abrev', 'AT', ordem, capítulos). */
function livrosDaMigracao(): LivroBiblia[] {
  const sql = readFileSync(path.join(RAIZ, 'supabase/migrations/20261102120000_pessoal.sql'), 'utf8')
  return [...sql.matchAll(/\((\d+), '([^']+)', '([^']+)', '(AT|NT)', (\d+), (\d+)\)/g)].map((m) => ({
    id: Number(m[1]),
    nome: m[2],
    abreviacao: m[3],
    testamento: m[4] as 'AT' | 'NT',
    ordem: Number(m[5]),
    total_capitulos: Number(m[6]),
  }))
}

/** Monta um testamento no formato zText: entradas vazias de cabeçalho, livro e capítulo, depois os versículos. */
function testamento(livros: number[][], primeiroLivro: number, vazio?: string) {
  const partes: Buffer[] = []
  const indice: Buffer[] = []
  let deslocamento = 0
  const entrada = (texto: string) => {
    const b = Buffer.from(texto, 'utf8')
    const e = Buffer.alloc(10)
    e.writeUInt32LE(0, 0)
    e.writeUInt32LE(deslocamento, 4)
    e.writeUInt16LE(b.length, 8)
    partes.push(b)
    deslocamento += b.length
    indice.push(e)
  }
  entrada('')
  entrada('')
  livros.forEach((capitulos, i) => {
    entrada('')
    capitulos.forEach((total, c) => {
      entrada(`<title type="chapter">CAPÍTULO ${c + 1}.</title>`)
      for (let v = 1; v <= total; v++) {
        const ref = `${primeiroLivro + i}:${c + 1}:${v}`
        entrada(ref === vazio ? '' : `<chapter sID="x"/>  Texto  ${ref} &amp; fim <note type="x">nota</note>`)
      }
    })
  })
  const bloco = Buffer.concat(partes)
  const bzz = deflateSync(bloco)
  const bzs = Buffer.alloc(12)
  bzs.writeUInt32LE(0, 0)
  bzs.writeUInt32LE(bzz.length, 4)
  bzs.writeUInt32LE(bloco.length, 8)
  return { bzs, bzv: Buffer.concat(indice), bzz }
}

describe('seed da Bíblia: leitor do módulo SWORD', () => {
  it('a versificação embutida tem 66 livros, 1.189 capítulos e 31.102 versículos', () => {
    expect(VERSIFICACAO_KJV).toHaveLength(66)
    expect(VERSIFICACAO_KJV.flat()).toHaveLength(1189)
    expect(VERSIFICACAO_KJV.flat().reduce((s: number, n: number) => s + n, 0)).toBe(31102)
  })

  it('os capítulos por livro batem com os livros cadastrados na migração', () => {
    const livros = livrosDaMigracao()
    expect(livros).toHaveLength(66)
    expect(livros.map((l) => l.total_capitulos)).toEqual(VERSIFICACAO_KJV.map((l: number[]) => l.length))
  })

  it('limpa marcações OSIS, notas e entidades', () => {
    expect(limparTexto('<chapter sID="a"/> No principio <note>x</note>creou &amp; <w>Deus</w>  ')).toBe('No principio creou & Deus')
  })

  it('lê um módulo completo de dentro do .zip, pula versículo vazio e confere o resultado', () => {
    const zip = zipSync({
      'modules/texts/ztext/teste/ot.bzs': testamento(VERSIFICACAO_KJV.slice(0, 39), 1).bzs,
      'modules/texts/ztext/teste/ot.bzv': testamento(VERSIFICACAO_KJV.slice(0, 39), 1).bzv,
      'modules/texts/ztext/teste/ot.bzz': testamento(VERSIFICACAO_KJV.slice(0, 39), 1).bzz,
      'modules/texts/ztext/teste/nt.bzs': testamento(VERSIFICACAO_KJV.slice(39), 40, '47:13:14').bzs,
      'modules/texts/ztext/teste/nt.bzv': testamento(VERSIFICACAO_KJV.slice(39), 40, '47:13:14').bzv,
      'modules/texts/ztext/teste/nt.bzz': testamento(VERSIFICACAO_KJV.slice(39), 40, '47:13:14').bzz,
      'mods.d/teste.conf': new TextEncoder().encode('[Teste]'),
    })
    const versos = lerModulo(arquivosDoZip(zip)) as Versos
    expect(versos).toHaveLength(31101)
    expect(versos[0]).toEqual({ livro: 1, capitulo: 1, versiculo: 1, texto: 'Texto 1:1:1 & fim' })
    expect(versos.at(-1)).toEqual({ livro: 66, capitulo: 22, versiculo: 21, texto: 'Texto 66:22:21 & fim' })
    expect(versos.some((v) => v.livro === 47 && v.capitulo === 13 && v.versiculo === 14)).toBe(false)
    expect(conferir(versos)).toEqual([])
    expect(idVersiculo(versos[0])).toBe(1001001)
  })

  it('texto incompleto é barrado antes de gravar', () => {
    const versos = [{ livro: 1, capitulo: 1, versiculo: 1, texto: 'x'.repeat(2001) }]
    const problemas = conferir(versos)
    expect(problemas.join(' ')).toMatch(/1 livros/)
    expect(problemas.join(' ')).toMatch(/2\.000 caracteres/)
  })

  it('módulo sem os arquivos do testamento é recusado', () => {
    expect(() => arquivosDoZip(zipSync({ 'leia-me.txt': new Uint8Array(1) }))).toThrow(/ot\.bzs/)
  })
})

describe('migração ainda não rodada', () => {
  it('função que o banco ainda não tem vira o aviso de banco desatualizado', () => {
    const m = mensagemErro({ code: 'PGRST202', message: 'Could not find the function public.leitura_resumo without parameters in the schema cache' })
    expect(m).toMatch(/banco está desatualizado/)
  })
})

describe('datas no fuso de São Paulo', () => {
  it('01:30 UTC de 02/11 ainda é 01/11 em São Paulo', () => {
    expect(hojeSP(new Date('2026-11-02T01:30:00Z'))).toBe('2026-11-01')
    expect(diaSP('2026-11-02T03:30:00Z')).toBe('2026-11-02')
  })

  it('revisão semanal: no domingo, a semana que termina; nos outros dias, a anterior', () => {
    expect(semanaParaRevisao('2026-11-01')).toBe('2026-10-26') // domingo
    expect(semanaParaRevisao('2026-11-02')).toBe('2026-10-26') // segunda
    expect(semanaParaRevisao('2026-11-07')).toBe('2026-10-26') // sábado
  })

  it('frequência de hábito', () => {
    const segQuaSex = { tipo: 'dias' as const, dias: [1, 3, 5] }
    expect(previstoNoDia(segQuaSex, '2026-11-02')).toBe(true) // segunda
    expect(previstoNoDia(segQuaSex, '2026-11-03')).toBe(false)
    expect(textoFrequencia(segQuaSex)).toBe('seg, qua, sex')
    expect(textoFrequencia({ tipo: 'dias', dias: [5, 4, 3, 2, 1] })).toBe('Dias úteis')
    expect(textoFrequencia({ tipo: 'diaria' })).toBe('Todos os dias')
  })
})

describe('leitura: navegação e situação do plano', () => {
  const livros = livrosDaMigracao()

  it('anterior e próximo atravessam livros; começo e fim da Bíblia não têm vizinho', () => {
    expect(vizinho(livros, 1, 50, 1)).toEqual({ livro_id: 2, capitulo: 1 })
    expect(vizinho(livros, 2, 1, -1)).toEqual({ livro_id: 1, capitulo: 50 })
    expect(vizinho(livros, 1, 1, -1)).toBeNull()
    expect(vizinho(livros, 66, 22, 1)).toBeNull()
  })

  const plano = { id: 'p', tipo: 'sequencial' as const, data_inicio: '2026-10-30', data_fim: '2027-10-29', dias_total: 365, dias_passados: 4, dias_restantes: 362 }

  it('atrasado: sugere quanto ler por dia para recuperar em uma semana', () => {
    const s = situacaoLeitura({ plano, diferenca: -10, ritmo_plano: 3.26, meta_diaria: 4 })!
    expect(s.tipo).toBe('atrasado')
    expect(s.titulo).toBe('Atrasado 10 capítulos')
    expect(s.sugestao).toMatch(/6 capítulos por dia nos próximos 7 dias \(\+2 por dia\)/)
  })

  it('adiantado mostra os dias de folga; diferença pequena conta como em dia', () => {
    expect(situacaoLeitura({ plano, diferenca: 7, ritmo_plano: 3.26, meta_diaria: 3 })!.titulo).toBe('Adiantado 7 capítulos (≈ 2 dias)')
    expect(situacaoLeitura({ plano, diferenca: 2, ritmo_plano: 3.26, meta_diaria: 3 })!.tipo).toBe('em_dia')
    expect(situacaoLeitura({ plano: null, diferenca: null, ritmo_plano: null, meta_diaria: null })).toBeNull()
  })
})
