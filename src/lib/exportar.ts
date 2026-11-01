import type { CellObject, WorkSheet } from 'xlsx'

import { competenciaParaUrl, formatarData, formatarNumero, nomeCompetencia, somar } from '@/lib/format'
import type { Categoria, Competencia, LancamentoComConta } from '@/types'

export interface LinhaExportacao {
  categoria: string
  conta: string
  responsavel: string
  vencimento: string
  parcela: string
  valor: number
  situacao: 'Pago' | 'Pendente' | 'Vencida'
  dataPagamento: string
  codigo: string
  observacao: string
}

const CABECALHO = [
  'Categoria',
  'Conta',
  'Responsável',
  'Vencimento',
  'Parcela',
  'Valor',
  'Situação',
  'Data pagamento',
  'Código de pagamento',
  'Observação',
]

export function montarLinhas(
  categorias: Categoria[],
  lancamentos: (LancamentoComConta & { vencida: boolean })[],
): LinhaExportacao[] {
  const linhas: LinhaExportacao[] = []
  for (const cat of categorias) {
    const doGrupo = lancamentos
      .filter((l) => l.conta.categoria_id === cat.id)
      .sort((a, b) => a.conta.nome.localeCompare(b.conta.nome, 'pt-BR'))
    for (const l of doGrupo) {
      linhas.push({
        categoria: cat.nome,
        conta: l.conta.nome,
        responsavel: l.conta.responsavel ?? '',
        vencimento: l.conta.dia_vencimento ? `Dia ${l.conta.dia_vencimento}` : '',
        parcela: l.numero_parcela ? `${l.numero_parcela}/${l.conta.total_parcelas ?? '?'}` : '',
        valor: l.valor,
        situacao: l.pago ? 'Pago' : l.vencida ? 'Vencida' : 'Pendente',
        dataPagamento: formatarData(l.data_pagamento),
        codigo: l.conta.codigo_pagamento ?? '',
        observacao: l.observacao ?? '',
      })
    }
  }
  return linhas
}

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const nomeArquivo = (c: Competencia, ext: string) => `contas-${competenciaParaUrl(c)}.${ext}`

// -----------------------------------------------------------------------------
// CSV — separador ";" e vírgula decimal, como o Excel em português espera
// -----------------------------------------------------------------------------

/**
 * Célula de CSV segura: texto que começa com = + - @ (ou tab/CR) viraria fórmula no Excel
 * ("injeção de CSV"), então ganha um apóstrofo na frente. Números negativos ficam como estão.
 */
export function celulaCsv(valor: string): string {
  const seguro = /^[=+\-@\t\r]/.test(valor) && !/^-?[\d.,]+$/.test(valor) ? `'${valor}` : valor
  return /[";\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro
}

export function exportarCsv(competencia: Competencia, linhas: LinhaExportacao[]) {
  const corpo = linhas.map((l) =>
    [
      l.categoria,
      l.conta,
      l.responsavel,
      l.vencimento,
      l.parcela,
      formatarNumero(l.valor),
      l.situacao,
      l.dataPagamento,
      l.codigo,
      l.observacao,
    ]
      .map(celulaCsv)
      .join(';'),
  )
  const total = somar(linhas.map((l) => l.valor))
  const pago = somar(linhas.filter((l) => l.situacao === 'Pago').map((l) => l.valor))
  const rodape = [
    '',
    `Total do mês;;;;;${formatarNumero(total)}`,
    `Total pago;;;;;${formatarNumero(pago)}`,
    `Total pendente;;;;;${formatarNumero(somar([total, -pago]))}`,
  ]
  const texto = [CABECALHO.join(';'), ...corpo, ...rodape].join('\r\n')
  // BOM para o Excel reconhecer os acentos (UTF-8)
  baixar(new Blob(['﻿', texto], { type: 'text/csv;charset=utf-8' }), nomeArquivo(competencia, 'csv'))
}

// -----------------------------------------------------------------------------
// Excel — com fórmulas de soma reais (totais nunca digitados)
// -----------------------------------------------------------------------------

const FORMATO_MOEDA = '"R$" #,##0.00'
const FORMATO_PCT = '0.0%'

const moeda = (v: number, f?: string): CellObject => ({ t: 'n', v, z: FORMATO_MOEDA, ...(f ? { f } : {}) })

export async function exportarExcel(competencia: Competencia, linhas: LinhaExportacao[], categorias: Categoria[]) {
  const XLSX = await import('xlsx')
  const titulo = `Contas de ${nomeCompetencia(competencia)}`

  // --- Aba "Contas": lista completa ---
  const PRIMEIRA = 4 // linha (1-based) do primeiro lançamento
  const ultima = PRIMEIRA + Math.max(linhas.length, 1) - 1
  const faixa = (col: string) => `$${col}$${PRIMEIRA}:$${col}$${ultima}`

  const total = somar(linhas.map((l) => l.valor))
  const pago = somar(linhas.filter((l) => l.situacao === 'Pago').map((l) => l.valor))

  const aoaContas: unknown[][] = [
    [titulo],
    [],
    CABECALHO,
    ...linhas.map((l) => [
      l.categoria,
      l.conta,
      l.responsavel,
      l.vencimento,
      l.parcela,
      moeda(l.valor),
      l.situacao,
      l.dataPagamento,
      l.codigo,
      l.observacao,
    ]),
    [],
    ['Total do mês', '', '', '', '', moeda(total, `SUM(${faixa('F')})`)],
    ['Total pago', '', '', '', '', moeda(pago, `SUMIF(${faixa('G')},"Pago",${faixa('F')})`)],
    ['Total pendente', '', '', '', '', moeda(somar([total, -pago]), `SUMIF(${faixa('G')},"<>Pago",${faixa('F')})`)],
  ]
  const abaContas: WorkSheet = XLSX.utils.aoa_to_sheet(aoaContas)
  abaContas['!cols'] = [18, 26, 14, 12, 9, 14, 11, 15, 40, 30].map((wch) => ({ wch }))
  abaContas['!autofilter'] = { ref: `A3:J${ultima}` }

  // --- Aba "Resumo": total por categoria via SUMIFS sobre a aba Contas ---
  const nomesCategorias = categorias.map((c) => c.nome).filter((n) => linhas.some((l) => l.categoria === n))
  const ref = (col: string) => `Contas!${faixa(col)}`
  const linhaTotal = 2 + nomesCategorias.length

  const aoaResumo: unknown[][] = [
    ['Categoria', 'Total', 'Pago', 'Pendente', '% do mês'],
    ...nomesCategorias.map((nome, i) => {
      const r = i + 2
      const doGrupo = linhas.filter((l) => l.categoria === nome)
      const t = somar(doGrupo.map((l) => l.valor))
      const p = somar(doGrupo.filter((l) => l.situacao === 'Pago').map((l) => l.valor))
      return [
        nome,
        moeda(t, `SUMIFS(${ref('F')},${ref('A')},A${r})`),
        moeda(p, `SUMIFS(${ref('F')},${ref('A')},A${r},${ref('G')},"Pago")`),
        moeda(somar([t, -p]), `B${r}-C${r}`),
        { t: 'n', v: total ? t / total : 0, z: FORMATO_PCT, f: `IF($B$${linhaTotal}=0,0,B${r}/$B$${linhaTotal})` },
      ]
    }),
    [
      'Total',
      moeda(total, `SUM(B2:B${linhaTotal - 1})`),
      moeda(pago, `SUM(C2:C${linhaTotal - 1})`),
      moeda(somar([total, -pago]), `SUM(D2:D${linhaTotal - 1})`),
      { t: 'n', v: total ? 1 : 0, z: FORMATO_PCT, f: `IF(B${linhaTotal}=0,0,1)` },
    ],
  ]
  const abaResumo: WorkSheet = XLSX.utils.aoa_to_sheet(aoaResumo)
  abaResumo['!cols'] = [22, 16, 16, 16, 10].map((wch) => ({ wch }))

  const pasta = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(pasta, abaContas, 'Contas')
  XLSX.utils.book_append_sheet(pasta, abaResumo, 'Resumo')
  XLSX.writeFile(pasta, nomeArquivo(competencia, 'xlsx'), { compression: true })
}
