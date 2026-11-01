import { BikeIcon, WalletIcon, type LucideIcon } from 'lucide-react'

export type IdModulo = 'financeiro' | 'triathlon'

export interface Modulo {
  id: IdModulo
  nome: string
  descricao: string
  rota: string
  icone: LucideIcon
  emConstrucao?: boolean
}

export const MODULO_FINANCEIRO: Modulo = {
  id: 'financeiro',
  nome: 'Financeiro',
  descricao: 'Contas do mês, rendas e caixinhas de economia.',
  rota: '/financeiro',
  icone: WalletIcon,
}

export const MODULO_TRIATHLON: Modulo = {
  id: 'triathlon',
  nome: 'Triathlon',
  descricao: 'Treinos, evolução, nutrição e provas-alvo.',
  rota: '/triathlon',
  icone: BikeIcon,
}

/** Módulos mostrados depois do login, na ordem. */
export const MODULOS: Modulo[] = [MODULO_FINANCEIRO, MODULO_TRIATHLON]

/** Rotas do módulo Financeiro. */
export const ROTAS_FINANCEIRO = {
  mes: '/financeiro',
  economia: '/financeiro/economia',
  contas: '/financeiro/contas',
  categorias: '/financeiro/categorias',
  historico: '/financeiro/historico',
}

/** Rotas do módulo Triathlon. */
export const ROTAS_TRIATHLON = {
  painel: '/triathlon',
  treinos: '/triathlon/treinos',
  agenda: '/triathlon/agenda',
  evolucao: '/triathlon/evolucao',
  nutricao: '/triathlon/nutricao',
  provas: '/triathlon/provas',
  corpo: '/triathlon/corpo',
  perfil: '/triathlon/perfil',
}

const CHAVE_ULTIMO = 'ultimo-modulo'

export function lembrarModulo(id: IdModulo) {
  try {
    localStorage.setItem(CHAVE_ULTIMO, id)
  } catch {
    // armazenamento indisponível
  }
}

export function ultimoModulo(): IdModulo | null {
  try {
    const salvo = localStorage.getItem(CHAVE_ULTIMO)
    return MODULOS.some((m) => m.id === salvo) ? (salvo as IdModulo) : null
  } catch {
    return null
  }
}
