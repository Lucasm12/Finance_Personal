/** "Bom dia" / "Boa tarde" / "Boa noite" conforme a hora (0–23). */
export function saudacao(hora: number) {
  if (hora >= 5 && hora < 12) return 'Bom dia'
  if (hora >= 12 && hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

/** Minúsculas e sem acentos, para buscas ("Débora" encontra "debora"). */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

/** Lista única e ordenada de responsáveis (ignora maiúsculas/acentos ao deduplicar). */
export function listarResponsaveis(contas: { responsavel: string | null }[]): string[] {
  const porChave = new Map<string, string>()
  for (const c of contas) {
    const nome = c.responsavel?.trim()
    if (nome && !porChave.has(normalizar(nome))) porChave.set(normalizar(nome), nome)
  }
  return [...porChave.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}
