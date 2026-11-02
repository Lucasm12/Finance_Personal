/**
 * O navegador nunca fala direto com a AI Endurance: a chave de parceiro fica na função
 * serverless da Vercel (api/ai-endurance.ts). Aqui só chamamos essa função com o token
 * da sessão do Supabase e traduzimos os erros.
 */
import { supabase } from '@/lib/supabase'
import type { ModalidadeEndurance } from '@/types/triathlon'

export class ErroAiEndurance extends Error {}

export interface StatusAiEndurance {
  /** as variáveis da AI Endurance estão configuradas no servidor */
  configurado: boolean
  /** o usuário tem um atleta da AI Endurance vinculado (privado.ai_endurance_atletas) */
  vinculado: boolean
}

export interface PaginaAtividades {
  resultados: unknown[]
  proxima: boolean
}

async function chamar<T>(acao: string, params: Record<string, string> = {}): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new ErroAiEndurance('Sua sessão expirou. Entre de novo.')

  let resposta: Response
  try {
    resposta = await fetch(`/api/ai-endurance?${new URLSearchParams({ acao, ...params })}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(45_000),
    })
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError'))
      throw new ErroAiEndurance('A AI Endurance demorou demais para responder. Tente de novo.')
    throw new ErroAiEndurance('Sem conexão com o servidor. Verifique sua internet.')
  }

  const json = (resposta.headers.get('content-type') ?? '').includes('application/json')
  const corpo = json ? ((await resposta.json().catch(() => null)) as { erro?: unknown } | null) : null
  if (!resposta.ok) {
    if (!json && resposta.status === 404)
      throw new ErroAiEndurance('A integração não está publicada neste endereço. Rode com "npm run dev" (que já serve a função) ou publique na Vercel.')
    throw new ErroAiEndurance(typeof corpo?.erro === 'string' ? corpo.erro : `Falha ao falar com a AI Endurance (HTTP ${resposta.status}).`)
  }
  if (!corpo) throw new ErroAiEndurance('Resposta inesperada do servidor.')
  return corpo as T
}

export const statusAiEndurance = () => chamar<StatusAiEndurance>('status')

export const atividadesAiEndurance = (modalidade: ModalidadeEndurance, pagina = 1) =>
  chamar<PaginaAtividades>('atividades', { modalidade, pagina: String(pagina) })

/** Treinos futuros do plano do atleta + zonas e .zwo do atleta (para o formato alternativo). */
export const treinosAiEndurance = () => chamar<{ plano: unknown; treinos: unknown; atleta: unknown }>('treinos')
