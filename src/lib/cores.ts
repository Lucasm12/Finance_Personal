/**
 * Paleta categórica validada para daltonismo e contraste (ordem fixa).
 * Cada cor tem uma versão ajustada para o tema escuro.
 */
export const PALETA = [
  { nome: 'Azul', claro: '#2a78d6', escuro: '#3987e5' },
  { nome: 'Laranja', claro: '#eb6834', escuro: '#d95926' },
  { nome: 'Verde-água', claro: '#1baf7a', escuro: '#199e70' },
  { nome: 'Amarelo', claro: '#eda100', escuro: '#c98500' },
  { nome: 'Rosa', claro: '#e87ba4', escuro: '#d55181' },
  { nome: 'Verde', claro: '#008300', escuro: '#008300' },
  { nome: 'Violeta', claro: '#6250d6', escuro: '#9085e9' },
  { nome: 'Vermelho', claro: '#e34948', escuro: '#e66767' },
  { nome: 'Cinza', claro: '#78716c', escuro: '#a8a29e' },
] as const

const PARA_ESCURO = new Map<string, string>(PALETA.map((c) => [c.claro.toLowerCase(), c.escuro]))

/** Cor salva no banco → cor exibida no tema atual. */
export function corNoTema(cor: string, escuro: boolean): string {
  return escuro ? (PARA_ESCURO.get(cor.toLowerCase()) ?? cor) : cor
}

/** Próxima cor da paleta, na ordem, para uma nova categoria. */
export function proximaCor(quantidadeAtual: number): string {
  return PALETA[quantidadeAtual % 8].claro
}
