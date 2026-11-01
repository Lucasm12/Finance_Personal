import type { Competencia, Conta } from '@/types'

// -----------------------------------------------------------------------------
// Dinheiro
// -----------------------------------------------------------------------------

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const numero = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const percentual = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 })
const compacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

/** "R$ 1.234,56" */
export const formatarMoeda = (valor: number) => moeda.format(valor)

/** "1.234,56" */
export const formatarNumero = (valor: number) => numero.format(valor)

/** 0.153 → "15,3%" */
export const formatarPercentual = (fracao: number) => percentual.format(fracao)

/** "R$ 12,5 mil" — para eixos de gráfico */
export const formatarMoedaCompacta = (valor: number) => `R$ ${compacto.format(valor)}`

/** Soma valores em centavos para não acumular erro de ponto flutuante. */
export function somar(valores: number[]): number {
  return valores.reduce((total, v) => total + Math.round(Number(v) * 100), 0) / 100
}

// -----------------------------------------------------------------------------
// Competência (sempre "AAAA-MM-01")
// -----------------------------------------------------------------------------

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export const NOMES_MESES = MESES.map((m) => m[0].toUpperCase() + m.slice(1))

const doisDigitos = (n: number) => String(n).padStart(2, '0')

export function competenciaDe(ano: number, mes: number): Competencia {
  return `${ano}-${doisDigitos(mes)}-01`
}

/** mes: 1 a 12 */
export function partesCompetencia(c: Competencia): { ano: number; mes: number } {
  const [ano, mes] = c.split('-').map(Number)
  return { ano, mes }
}

export function competenciaAtual(): Competencia {
  const hoje = new Date()
  return competenciaDe(hoje.getFullYear(), hoje.getMonth() + 1)
}

export function somarMeses(c: Competencia, quantidade: number): Competencia {
  const { ano, mes } = partesCompetencia(c)
  const total = ano * 12 + (mes - 1) + quantidade
  return competenciaDe(Math.floor(total / 12), (total % 12) + 1)
}

export function mesesEntre(de: Competencia, ate: Competencia): number {
  const a = partesCompetencia(de)
  const b = partesCompetencia(ate)
  return (b.ano - a.ano) * 12 + (b.mes - a.mes)
}

/** "Outubro de 2026" */
export function nomeCompetencia(c: Competencia): string {
  const { ano, mes } = partesCompetencia(c)
  return `${NOMES_MESES[mes - 1]} de ${ano}`
}

/** "out/26" */
export function competenciaCurta(c: Competencia): string {
  const { ano, mes } = partesCompetencia(c)
  return `${MESES_CURTOS[mes - 1]}/${String(ano).slice(2)}`
}

/** "out/2026" */
export function competenciaMedia(c: Competencia): string {
  const { ano, mes } = partesCompetencia(c)
  return `${MESES_CURTOS[mes - 1]}/${ano}`
}

/** Aceita "2026-10" (formato da URL). */
export function competenciaDaUrl(valor: string | null): Competencia | null {
  const m = valor?.match(/^(\d{4})-(\d{2})$/)
  if (!m) return null
  const mes = Number(m[2])
  if (mes < 1 || mes > 12) return null
  return competenciaDe(Number(m[1]), mes)
}

export const competenciaParaUrl = (c: Competencia) => c.slice(0, 7)

// -----------------------------------------------------------------------------
// Datas
// -----------------------------------------------------------------------------

/** Data local de hoje como "AAAA-MM-DD". */
export function hojeISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`
}

/** "2026-10-05" → "05/10/2026" */
export function formatarData(iso: string | null): string {
  if (!iso) return ''
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate()
}

/** Data de vencimento no mês. Sem dia definido, considera o último dia do mês. */
export function dataVencimento(c: Competencia, dia: number | null): string {
  const { ano, mes } = partesCompetencia(c)
  const ultimo = ultimoDiaDoMes(ano, mes)
  return `${ano}-${doisDigitos(mes)}-${doisDigitos(Math.min(dia ?? ultimo, ultimo))}`
}

function diasEntre(de: string, ate: string): number {
  const [a1, m1, d1] = de.split('-').map(Number)
  const [a2, m2, d2] = ate.split('-').map(Number)
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000)
}

export type TipoSituacao = 'pago' | 'vencida' | 'hoje' | 'proxima' | 'aberta'

export interface Situacao {
  tipo: TipoSituacao
  /** vencida: dias de atraso; próxima/aberta: dias até vencer */
  dias: number
  vencimento: string
}

const DIAS_ALERTA = 3

export function situacaoLancamento(
  lancamento: { pago: boolean; competencia: Competencia },
  diaVencimento: number | null,
  hoje: string = hojeISO(),
): Situacao {
  const vencimento = dataVencimento(lancamento.competencia, diaVencimento)
  const dias = diasEntre(hoje, vencimento)
  if (lancamento.pago) return { tipo: 'pago', dias, vencimento }
  if (dias < 0) return { tipo: 'vencida', dias: -dias, vencimento }
  // Sem dia definido, só alerta depois que o mês acabar (evita destacar tudo no último dia).
  if (diaVencimento === null) return { tipo: 'aberta', dias, vencimento }
  if (dias === 0) return { tipo: 'hoje', dias, vencimento }
  if (dias <= DIAS_ALERTA) return { tipo: 'proxima', dias, vencimento }
  return { tipo: 'aberta', dias, vencimento }
}

// -----------------------------------------------------------------------------
// Parcelamento
// -----------------------------------------------------------------------------

type ContaParcelada = Pick<Conta, 'parcela_atual' | 'total_parcelas' | 'parcela_referencia'>

export function ehParcelada(conta: ContaParcelada): boolean {
  return conta.total_parcelas !== null && conta.parcela_atual !== null && conta.parcela_referencia !== null
}

/** Número da parcela em uma competência (pode ser < 1 ou > total). */
export function parcelaNoMes(conta: ContaParcelada, c: Competencia): number | null {
  if (!ehParcelada(conta)) return null
  return conta.parcela_atual! + mesesEntre(conta.parcela_referencia!, c)
}

/** Competência da última parcela. */
export function ultimaParcela(conta: ContaParcelada): Competencia | null {
  if (!ehParcelada(conta)) return null
  return somarMeses(conta.parcela_referencia!, conta.total_parcelas! - conta.parcela_atual!)
}

/** Parcelamento cuja última parcela ficou num mês anterior a `c`. */
export function parcelamentoConcluido(conta: ContaParcelada, c: Competencia = competenciaAtual()): boolean {
  const n = parcelaNoMes(conta, c)
  return n !== null && n > conta.total_parcelas!
}
