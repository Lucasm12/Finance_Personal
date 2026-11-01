import { useMutation } from '@tanstack/react-query'

import { mensagemErro } from '@/lib/erros'
import { supabase } from '@/lib/supabase'

/** Todas as tabelas com dados do usuário (o RLS garante que cada um só recebe os próprios). */
const TABELAS = [
  'categorias',
  'contas',
  'lancamentos',
  'rendas',
  'recebimentos',
  'caixinhas',
  'movimentos_caixinha',
  'lembretes_email',
  'perfil_atleta',
  'pesagens',
  'treinos',
  'treinos_planejados',
  'metas_semanais',
  'rotinas_forca',
  'series_forca',
  'alimentos',
  'refeicoes',
  'provas',
] as const

/** LGPD (art. 18): reúne em um JSON tudo o que o app guarda da pessoa logada. */
export async function exportarMeusDados(): Promise<Blob> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Sua sessão expirou. Entre de novo.')
  const tabelas: Record<string, unknown[] | { erro: string }> = {}
  for (const tabela of TABELAS) {
    const linhas: unknown[] = []
    for (let de = 0; ; de += 1000) {
      const r = await supabase.from(tabela).select('*').range(de, de + 999)
      if (r.error) {
        tabelas[tabela] = { erro: mensagemErro(r.error) }
        break
      }
      linhas.push(...r.data)
      if (r.data.length < 1000) {
        tabelas[tabela] = linhas
        break
      }
    }
  }
  const conteudo = {
    exportado_em: new Date().toISOString(),
    conta: { id: data.user.id, email: data.user.email, criada_em: data.user.created_at, ultimo_login: data.user.last_sign_in_at },
    tabelas,
  }
  return new Blob([JSON.stringify(conteudo, null, 2)], { type: 'application/json;charset=utf-8' })
}

/** Apaga do navegador o que o app guardou localmente (preferências e cache de demonstrações). */
function limparArmazenamentoLocal() {
  try {
    for (const chave of Object.keys(localStorage)) {
      if (chave.startsWith('exercisedb:') || chave === 'ultimo-modulo') localStorage.removeItem(chave)
    }
  } catch {
    // sem armazenamento
  }
}

/**
 * Exclui a conta e todos os dados dela. Pede a senha de novo (o Supabase confere) antes de chamar
 * a função do banco, que só apaga a conta de quem está logado.
 */
export function useExcluirConta() {
  return useMutation({
    mutationFn: async (senha: string) => {
      const { data } = await supabase.auth.getUser()
      const email = data.user?.email
      if (!email) throw new Error('Sua sessão expirou. Entre de novo.')
      const confirmacao = await supabase.auth.signInWithPassword({ email, password: senha })
      if (confirmacao.error) throw new Error('Senha incorreta.')
      const { error } = await supabase.rpc('excluir_minha_conta')
      if (error) throw new Error(mensagemErro(error))
      limparArmazenamentoLocal()
      // a conta já não existe no servidor: basta limpar a sessão deste navegador
      await supabase.auth.signOut({ scope: 'local' })
    },
  })
}
