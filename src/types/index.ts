/** Competência no formato ISO "AAAA-MM-01". */
export type Competencia = string

export interface Categoria {
  id: string
  user_id: string
  nome: string
  cor: string
  ordem: number
  created_at: string
}

export interface Conta {
  id: string
  user_id: string
  categoria_id: string
  nome: string
  valor_padrao: number
  dia_vencimento: number | null
  codigo_pagamento: string | null
  responsavel: string | null
  parcela_atual: number | null
  total_parcelas: number | null
  parcela_referencia: Competencia | null
  ativa: boolean
  observacao: string | null
  created_at: string
}

export type ContaInput = Omit<Conta, 'id' | 'user_id' | 'created_at'>

export interface Lancamento {
  id: string
  user_id: string
  conta_id: string
  competencia: Competencia
  valor: number
  pago: boolean
  data_pagamento: string | null
  numero_parcela: number | null
  observacao: string | null
  created_at: string
}

export type ContaResumo = Pick<
  Conta,
  | 'id'
  | 'nome'
  | 'categoria_id'
  | 'valor_padrao'
  | 'dia_vencimento'
  | 'codigo_pagamento'
  | 'responsavel'
  | 'total_parcelas'
>

export interface LancamentoComConta extends Lancamento {
  conta: ContaResumo
}

export interface TotalMes {
  competencia: Competencia
  quantidade: number
  quantidade_paga: number
  total: number
  total_pago: number
  total_pendente: number
}

export interface Renda {
  id: string
  user_id: string
  nome: string
  valor_padrao: number
  dia_recebimento: number | null
  responsavel: string | null
  ativa: boolean
  observacao: string | null
  created_at: string
}

export type RendaInput = Omit<Renda, 'id' | 'user_id' | 'created_at'>

export interface Recebimento {
  id: string
  user_id: string
  /** null = renda avulsa */
  renda_id: string | null
  descricao: string | null
  competencia: Competencia
  valor: number
  recebido: boolean
  data_recebimento: string | null
  observacao: string | null
  created_at: string
  renda: Pick<Renda, 'id' | 'nome' | 'valor_padrao' | 'dia_recebimento' | 'responsavel'> | null
}

export interface Caixinha {
  id: string
  user_id: string
  nome: string
  cor: string
  meta: number | null
  aporte_mensal: number | null
  data_alvo: string | null
  arquivada: boolean
  created_at: string
}

export type CaixinhaInput = Pick<Caixinha, 'nome' | 'cor' | 'meta' | 'aporte_mensal' | 'data_alvo' | 'arquivada'>

export interface CaixinhaComSaldo extends Caixinha {
  saldo: number
  total_guardado: number
  total_retirado: number
  movimentos: number
  ultima_data: string | null
}

export interface MovimentoCaixinha {
  id: string
  user_id: string
  caixinha_id: string
  tipo: 'aporte' | 'retirada'
  valor: number
  data: string
  observacao: string | null
  created_at: string
}

export interface LembreteEmail {
  user_id: string
  email: string
  ativo: boolean
  link_app: string | null
  ultimo_envio: string | null
  ultimo_request_id: number | null
  created_at: string
}

/** Resposta do Resend ao último envio (gravada pelo pg_net). */
export interface StatusLembrete {
  concluido: boolean
  status: number | null
  resposta: string | null
  erro: string | null
}

export interface TotalCategoriaMes extends TotalMes {
  categoria_id: string
  categoria: string
  cor: string
  ordem: number
}
