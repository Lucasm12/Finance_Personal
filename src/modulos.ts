import { BikeIcon, SunriseIcon, WalletIcon, type LucideIcon } from 'lucide-react'

export type IdModulo = 'financeiro' | 'triathlon' | 'pessoal'

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

export const MODULO_PESSOAL: Modulo = {
  id: 'pessoal',
  nome: 'Pessoal',
  descricao: 'Meu dia, metas do ano, leitura da Bíblia, hábitos e diário.',
  rota: '/pessoal',
  icone: SunriseIcon,
}

/** Página inicial pública: o portfólio (não exige login). */
export const ROTA_INICIO = '/'
/** Tela de login (a única do app). */
export const ROTA_LOGIN = '/login'
/** Escolha do módulo: primeira tela depois do login. */
export const ROTA_MODULOS = '/sistema'

/** Módulos mostrados depois do login, na ordem. */
export const MODULOS: Modulo[] = [MODULO_FINANCEIRO, MODULO_TRIATHLON, MODULO_PESSOAL]

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

/** Rotas do módulo Pessoal. */
export const ROTAS_PESSOAL = {
  dia: '/pessoal',
  biblia: '/pessoal/biblia',
  metas: '/pessoal/metas',
  habitos: '/pessoal/habitos',
  tarefas: '/pessoal/tarefas',
  diario: '/pessoal/diario',
}

/** Tela de leitura de um capítulo. */
export const rotaLeitura = (livro: number, capitulo: number) => `/pessoal/biblia/${livro}/${capitulo}`

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
