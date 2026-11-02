/**
 * Ponte com a AI Endurance Partner API (https://github.com/ai-endurance/Partner-API-documentation).
 * Roda na Vercel como função serverless: a chave de parceiro nunca chega ao navegador.
 *
 *   GET /api/ai-endurance?acao=status                               integração configurada? atleta vinculado?
 *   GET /api/ai-endurance?acao=atividades&modalidade=corrida&pagina=1  atividades realizadas
 *   GET /api/ai-endurance?acao=treinos                              treinos futuros do plano do atleta
 *
 * Quem chama manda o token da sessão do Supabase (Authorization: Bearer ...). O atleta na
 * AI Endurance vem do banco — public.ai_endurance_atleta(), que lê privado.ai_endurance_atletas
 * só para o dono do token — e nunca da URL: um usuário não consegue ler os dados de outro.
 *
 * Variáveis (Vercel → Settings → Environment Variables; NUNCA com prefixo VITE_):
 *   AI_ENDURANCE_PARTNER_ID, AI_ENDURANCE_API_KEY
 *   VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (as mesmas do app)
 */

const BASE = 'https://aiendurance.xyz/api/'
const ATIVIDADES = {
  corrida: 'running_activity_detail_partner/',
  ciclismo: 'cycling_activity_detail_partner/',
  natacao: 'swimming_activity_detail_partner/',
} as const
const LIMITE_RESPOSTA = 4 * 1024 * 1024
const TEMPO_LIMITE_MS = 20_000

type Ambiente = Record<string, string | undefined>

class Falha extends Error {
  status: number
  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.status = status
  }
}

const responder = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  })

const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Valida o token no Supabase e devolve o atleta da AI Endurance do usuário (ou null). */
async function atletaDoUsuario(token: string, env: Ambiente, buscar: typeof fetch): Promise<string | null> {
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
  const chave = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!/^https:\/\/|^http:\/\/(localhost|127\.0\.0\.1)/.test(url) || !chave) throw new Falha(500, 'Servidor sem as variáveis do Supabase (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).')
  let r: Response
  try {
    r = await buscar(`${url}/rest/v1/rpc/ai_endurance_atleta`, {
      method: 'POST',
      headers: { apikey: chave, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    })
  } catch {
    throw new Falha(502, 'Não foi possível validar sua sessão agora. Tente de novo.')
  }
  if (r.status === 401 || r.status === 403) throw new Falha(401, 'Sessão inválida ou expirada. Entre de novo.')
  if (r.status === 404) throw new Falha(500, 'O banco está desatualizado: rode a migração 20261102130000_endurance.sql no Supabase.')
  if (!r.ok) throw new Falha(502, 'Não foi possível validar sua sessão agora. Tente de novo.')
  const atleta: unknown = await r.json().catch(() => null)
  return typeof atleta === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(atleta) ? atleta : null
}

/** GET na AI Endurance com as credenciais de parceiro; erros viram mensagens em português. */
async function aie(caminho: string, env: Ambiente, buscar: typeof fetch): Promise<unknown> {
  let r: Response
  try {
    r = await buscar(BASE + caminho, {
      headers: { 'PARTNER-ID': env.AI_ENDURANCE_PARTNER_ID!, Authorization: `Bearer ${env.AI_ENDURANCE_API_KEY}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    })
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError')) throw new Falha(504, 'A AI Endurance demorou demais para responder. Tente de novo.')
    throw new Falha(502, 'Não foi possível falar com a AI Endurance agora. Tente mais tarde.')
  }
  if (!r.ok) {
    // só o status vai para o log: o corpo de erro de terceiros não é repassado
    console.error(`AI Endurance respondeu ${r.status} em ${caminho.split('?')[0]}`)
    if (r.status === 401 || r.status === 403) throw new Falha(502, 'A AI Endurance recusou as credenciais de parceiro. Confira AI_ENDURANCE_PARTNER_ID e AI_ENDURANCE_API_KEY na Vercel.')
    if (r.status === 404) throw new Falha(404, 'A AI Endurance não encontrou esses dados para o seu atleta.')
    if (r.status === 429) throw new Falha(429, 'Limite de consultas da AI Endurance atingido. Tente de novo em alguns minutos.')
    if (r.status >= 500) throw new Falha(502, 'A AI Endurance está fora do ar agora. Tente mais tarde.')
    throw new Falha(502, `A AI Endurance recusou o pedido (HTTP ${r.status}).`)
  }
  const texto = await r.text()
  if (texto.length > LIMITE_RESPOSTA) throw new Falha(502, 'A resposta da AI Endurance veio grande demais.')
  try {
    return JSON.parse(texto)
  } catch {
    throw new Falha(502, 'A AI Endurance mandou uma resposta que não é JSON.')
  }
}

/** Lista paginada no padrão { count, next, results } ou um array simples. */
const resultados = (v: unknown): { resultados: unknown[]; proxima: boolean } =>
  Array.isArray(v) ? { resultados: v, proxima: false } : ehObjeto(v) && Array.isArray(v.results) ? { resultados: v.results, proxima: !!v.next } : { resultados: ehObjeto(v) ? [v] : [], proxima: false }

const idDe = (v: unknown) => (ehObjeto(v) && (typeof v.id === 'number' || typeof v.id === 'string') ? String(v.id) : null)

export async function tratar(req: Request, env: Ambiente = process.env, buscar: typeof fetch = fetch): Promise<Response> {
  try {
    if (req.method !== 'GET') throw new Falha(405, 'Método não permitido.')
    const url = new URL(req.url)
    const acao = url.searchParams.get('acao')
    if (acao !== 'status' && acao !== 'atividades' && acao !== 'treinos') throw new Falha(400, 'Ação desconhecida.')

    const token = /^Bearer\s+(\S{20,4096})$/.exec(req.headers.get('authorization') ?? '')?.[1]
    if (!token) throw new Falha(401, 'Entre no app para usar a integração.')
    const configurado = !!(env.AI_ENDURANCE_PARTNER_ID && env.AI_ENDURANCE_API_KEY)
    const atleta = await atletaDoUsuario(token, env, buscar)

    if (acao === 'status') return responder({ configurado, vinculado: !!atleta })
    if (!configurado) throw new Falha(503, 'A integração com a AI Endurance não está configurada: faltam AI_ENDURANCE_PARTNER_ID e AI_ENDURANCE_API_KEY na Vercel.')
    if (!atleta) throw new Falha(403, 'Sua conta ainda não está vinculada a um atleta da AI Endurance. Veja o passo a passo no README (Integração AI Endurance).')
    const usuario = encodeURIComponent(atleta)

    if (acao === 'atividades') {
      const modalidade = url.searchParams.get('modalidade') as keyof typeof ATIVIDADES
      if (!(modalidade in ATIVIDADES)) throw new Falha(400, 'Modalidade inválida.')
      const pagina = Number(url.searchParams.get('pagina') ?? '1')
      if (!Number.isInteger(pagina) || pagina < 1 || pagina > 200) throw new Falha(400, 'Página inválida.')
      return responder(resultados(await aie(`${ATIVIDADES[modalidade]}?user=${usuario}${pagina > 1 ? `&page=${pagina}` : ''}`, env, buscar)))
    }

    // treinos: plano mais recente → treinos futuros; o atleta traz as zonas e o .zip de .zwo
    const planos = resultados(await aie(`training_plan_partner/?user=${usuario}`, env, buscar)).resultados
    const plano = planos.map(idDe).filter((x): x is string => x !== null && /^[A-Za-z0-9_-]{1,64}$/.test(x)).sort((a, b) => Number(b) - Number(a) || b.localeCompare(a))[0]
    const atletaBruto = resultados(await aie(`usercore_partner/?user=${usuario}`, env, buscar)).resultados[0]
    const dadosAtleta = ehObjeto(atletaBruto)
      ? { zones: atletaBruto.zones ?? null, critical_swim_speed: atletaBruto.critical_swim_speed ?? null, zwift_zip: atletaBruto.zwift_zip ?? null }
      : null
    if (!plano) return responder({ plano: null, treinos: [], atleta: dadosAtleta })
    const treinos = resultados(await aie(`future_workout_static_partner/?plan=${encodeURIComponent(plano)}`, env, buscar)).resultados
    return responder({ plano: { id: plano }, treinos, atleta: dadosAtleta })
  } catch (e) {
    if (e instanceof Falha) return responder({ erro: e.message }, e.status)
    console.error('Erro inesperado na integração AI Endurance', e instanceof Error ? e.message : '')
    return responder({ erro: 'Erro inesperado na integração. Tente de novo.' }, 500)
  }
}

export function GET(req: Request) {
  return tratar(req)
}
