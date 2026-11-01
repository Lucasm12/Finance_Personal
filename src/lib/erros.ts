interface ErroComCodigo {
  code?: string
  message?: string
}

const AUTH: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar (verifique sua caixa de entrada).',
  user_already_exists: 'Este e-mail já está cadastrado. Tente entrar.',
  email_exists: 'Este e-mail já está cadastrado. Tente entrar.',
  weak_password: 'Senha fraca. Use pelo menos 6 caracteres.',
  same_password: 'A nova senha precisa ser diferente da anterior.',
  over_email_send_rate_limit: 'Muitos e-mails enviados. Aguarde alguns minutos e tente de novo.',
  over_request_rate_limit: 'Muitas tentativas. Aguarde um pouco e tente de novo.',
  email_address_invalid: 'E-mail inválido.',
  validation_failed: 'Verifique os dados informados.',
  signup_disabled: 'O cadastro de novos usuários está desativado.',
}

const POSTGRES: Record<string, string> = {
  '23505': 'Já existe um registro com esse nome.',
  '23503': 'Este registro está em uso e não pode ser removido.',
  '23514': 'Algum valor informado é inválido.',
  '42501': 'Sem permissão. Faça login novamente.',
  PGRST301: 'Sua sessão expirou. Faça login novamente.',
}

// coluna ou tabela que o app usa e o banco ainda não tem: falta rodar uma migration
const BANCO_DESATUALIZADO =
  'O banco está desatualizado. No Supabase, abra o SQL Editor e rode o arquivo mais recente de supabase/migrations.'

/** Converte erros do Supabase/Postgres em mensagens em português. */
export function mensagemErro(erro: unknown): string {
  const e = (erro ?? {}) as ErroComCodigo
  if (e.code && AUTH[e.code]) return AUTH[e.code]
  if (e.code && POSTGRES[e.code]) return POSTGRES[e.code]
  // coluna, tabela ou função (PGRST202) que o banco ainda não tem
  if (['PGRST202', 'PGRST204', 'PGRST205', '42703', '42P01', '42883'].includes(e.code ?? '')) {
    const coluna = /'([^']+)' column/.exec(e.message ?? '')?.[1]
    return coluna ? `${BANCO_DESATUALIZADO} (falta a coluna “${coluna}”)` : BANCO_DESATUALIZADO
  }
  const msg = e.message ?? ''
  if (/failed to fetch|network/i.test(msg)) return 'Sem conexão com o servidor. Verifique sua internet.'
  if (/invalid login credentials/i.test(msg)) return AUTH.invalid_credentials
  if (/password should be at least/i.test(msg)) return AUTH.weak_password
  return msg || 'Algo deu errado. Tente novamente.'
}
